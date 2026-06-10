# `lsof` 中 `can't identify protocol` 排查

## 现象

用 `lsof -p <pid>` 查看进程文件描述符时，看到类似输出：

```text
process  17555  user  23u  sock  0,8  0t0  542368266  can't identify protocol
```

这类行说明 `lsof` 能看到进程还持有一个 socket fd，但已经无法从当前内核对象上识别出常规协议和端口信息。对排障更有价值的解释是：**用户态 fd 还在，底层 socket 已经进入关闭或异常清理路径，协议层信息不再完整。**

少量、短暂出现通常不一定是问题；大量持续存在，并伴随 fd 数上涨、goroutine 堆积、请求超时或连接数异常，才更像资源泄漏或处理逻辑卡住。

## 基本判断

优先区分三类情况：

1. **短暂过渡态**：连接刚出错或刚关闭，Go runtime、`net/http` 或业务 goroutine 还没运行到最终 `Close`。
2. **应用逻辑卡住**：连接已经不可用，但某个 goroutine 还卡在读、写、handler、回调或业务锁上，导致 fd 迟迟不释放。
3. **真实 fd 泄漏**：代码路径遗漏 `Close`，或把连接交给了其他对象后没有明确生命周期。

不能只凭 `can't identify protocol` 单行就断定泄漏。判断重点是趋势：数量是否持续增长、是否长期不消失、是否和请求量或错误量同步变化。

## client 侧排查

最常见问题是响应体没有关闭：

```go
resp, err := client.Do(req)
if err != nil {
    return err
}
defer resp.Body.Close()

// 如果需要连接复用，通常应读完 body。
_, err = io.Copy(io.Discard, resp.Body)
return err
```

注意两点：

1. `Close` 是必须的；是否读完 body 影响连接能否复用。
2. 如果只读一部分就 `Close`，连接可能无法复用，但 fd 应该会被释放；如果完全不 `Close`，更容易造成连接和 goroutine 长时间挂住。

用 `pprof` 看 goroutine：

```bash
curl -s http://127.0.0.1:6060/debug/pprof/goroutine?debug=2 > goroutine.txt
rg "net/http.\\(\\*persistConn\\)\\.readLoop|net/http.\\(\\*persistConn\\)\\.writeLoop" goroutine.txt
```

在 Go `go1.26` 源码中，HTTP/1 client 连接会启动 `persistConn.readLoop()` 和 `persistConn.writeLoop()`。如果这些 goroutine 数量异常多，要继续结合业务栈查是谁没有释放响应体、谁卡在读取响应体、谁创建了大量独立 `Transport`。

## server 侧排查

server 侧重点看 handler 是否不返回、读写是否无超时、是否有长连接或升级连接没有明确生命周期。

Go `net/http` 的 `Server.Serve` 会为每个连接创建服务 goroutine，读取请求并调用 handler。Go `go1.26` 源码中 `(*conn).serve` 在退出时关闭连接、设置 `StateClosed`。

排查命令：

```bash
curl -s http://127.0.0.1:6060/debug/pprof/goroutine?debug=2 > goroutine.txt
rg "net/http.\\(\\*conn\\)\\.serve" goroutine.txt
```

如果大量 `(*conn).serve` 堆积，继续看每个栈上层：

1. 是否卡在业务 handler；
2. 是否卡在读 request body；
3. 是否卡在写响应；
4. 是否被下游 RPC、数据库、锁或 channel 阻塞；
5. 是否存在 WebSocket、SSE、hijack 连接，这些连接不会按普通 HTTP 请求自动结束。

## 操作系统侧辅助观察

先看 fd 数趋势：

```bash
ls /proc/<pid>/fd | wc -l
lsof -p <pid> | rg "can't identify protocol" | wc -l
```

再看 TCP 状态：

```bash
ss -tanp | rg "<pid>|process-name"
ss -tan state close-wait
ss -tan state established
```

如果 `can't identify protocol` 已经出现，端口信息往往已经丢失。更实用的方法是在问题增长期连续采样，尝试在连接还处于 `CLOSE_WAIT`、`ESTABLISHED` 或其他可识别状态时抓到四元组：

```bash
while true; do
    date
    lsof -nP -p <pid> | rg "TCP|can't identify protocol"
    sleep 1
done
```

如果看到大量 `CLOSE_WAIT`，通常说明对端已经关闭，而本进程没有关闭本地 fd。此时重点回到业务代码和 goroutine 栈，而不是继续调 TCP 参数。

## 推荐排查顺序

1. 统计 `can't identify protocol` 和总 fd 数是否持续增长。
2. 用 `ss` 看是否有大量 `CLOSE_WAIT`、异常 `ESTABLISHED` 或连接状态偏斜。
3. 抓 `pprof goroutine`，先按 HTTP/1 的 `conn.serve`、`persistConn.readLoop/writeLoop` 搜索。
4. 确认是否走 HTTP/2；如果是，按 HTTP/2 stream/connection 复用模型继续查。
5. client 侧审计所有 `client.Do`、`http.Get/Post` 调用路径，确认 `resp.Body.Close()` 一定执行。
6. server 侧审计 handler 是否有超时、上下文取消、request body 读取/关闭、下游调用超时。
7. 如果端口信息已经丢失，用持续采样在更早状态抓四元组。
