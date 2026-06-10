# Cloudflare TCP 与 HTTP/2 优先级调优

来源：

- Cloudflare Blog: [HTTP/2 prioritization with NGINX](https://blog.cloudflare.com/http-2-prioritization-with-nginx/)
- Cloudflare Blog: [Optimizing TCP for high WAN throughput while preserving low latency](https://blog.cloudflare.com/optimizing-tcp-for-high-throughput-and-low-latency/)

## 核心结论

这两篇文章本质是同一个大问题的两个侧面：**如何在 TCP 缓冲、应用层调度、吞吐和延迟之间取得可控平衡**。

第一篇关注发送端：HTTP/2 已经有资源优先级，但如果 NGINX 提前把大量低优先级数据写进 Linux TCP send buffer，后续高优先级 CSS、JS、字体就会被内核队列里的旧数据挡住。解决方向是用 `tcp_notsent_lowat` 限制“应用已经写入 socket、但 TCP 还没实际发送”的数据量，把调度权更多留在 NGINX 手里。

第二篇关注接收端和长距离大流量：跨洲、高 RTT、高带宽链路需要很大的 TCP receive window 才能跑出吞吐。但放大 receive buffer 后，Linux 在接收队列满时可能触发 TCP collapse，带来内核路径上的延迟尖刺。Cloudflare 的方向是允许大窗口，同时通过 `tcp_adv_win_scale` 给内核元数据预留空间，并用内核补丁限制 TCP collapse 的最坏代价。

## 第一篇：HTTP/2 优先级为什么会失效

HTTP/2 在一个 TCP 连接上复用多个 stream。浏览器会给资源分配优先级，例如：

- CSS、阻塞 JS、字体：通常影响首屏渲染，应尽早完成。
- 图片、非关键脚本、大文件：可以并行发送，但不应阻塞关键路径。

理论上，服务端可以根据这些优先级安排发送顺序。但在 Linux + NGINX 场景里有一个关键边界：**NGINX 只能调度还没有交给内核的内容**。

如果 NGINX 已经把大量低优先级图片数据写入 TCP send buffer，那么这些数据就进入内核发送队列。之后浏览器再请求高优先级 CSS，NGINX 即使知道 CSS 更重要，也很难把 CSS 插到内核队列前面。

问题可以简化成：

```text
NGINX 可调度区:
[后续资源选择权]

Linux TCP 未发送队列:
[图片][图片][图片][图片][CSS]
```

此时 HTTP/2 priority 在应用层是正确的，但效果被 TCP 发送缓冲抵消了。

## `tcp_notsent_lowat` 的作用

`tcp_notsent_lowat` 控制的是 TCP socket 中 **已经由应用写入、但还没有被 TCP 实际发送出去** 的数据积压量。它不是整个 send buffer 大小，也不是 congestion window，更不是直接限速。

当未发送数据量超过阈值时，后续 `write()` / `sendfile()` 会被阻塞；在非阻塞 socket 上，通常表现为返回 `EAGAIN`，让应用稍后再写。

对 HTTP/2 优先级来说，这个参数的价值是：

```text
没有限制:
[大量低优先级图片数据][关键 CSS]

设置较小 notsent 阈值:
[少量图片片段][关键 CSS]
```

Cloudflare 在第一篇文章中推荐过：

```conf
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_notsent_lowat = 16384
```

其中 `16384` 是 16 KiB，目标是让关键资源最多只被少量低优先级数据挡住。BBR 和 `fq` 的作用是减少网络侧排队和缓冲膨胀，让发送节奏更接近链路实际能力。

需要注意：这组参数主要针对自管 Linux + NGINX + HTTP/2 的发送路径。HTTP/3/QUIC 不走 TCP，不能按同一套 TCP send buffer 机制理解。

## 第二篇：高 RTT 链路为什么需要大 receive window

跨洲链路里，单条 TCP 流的吞吐常被 BDP 限制：

```text
BDP = bandwidth * RTT
```

如果目标是高 RTT 下仍保持高吞吐，TCP receive window 必须足够大。Cloudflare 文中以 300 ms RTT 和 3500 Mbps 目标吞吐估算，BDP 约为 131 MB，于是把目标最大 TCP window 定为 128 MiB。

旧配置为了避免接收队列 collapse 的延迟尖刺，把 `tcp_rmem` 限得较低。这对普通低 RTT Web 请求影响不明显，但对 Magic WAN、WARP、Spectrum、Gateway、SMB 文件传输等长距离大流量场景，会让单条流吞吐上不去。

因此第二篇文章的核心判断是：**高 BDP 链路物理上需要大窗口，不能靠缩小 receive buffer 来规避延迟问题；应该让窗口变大，同时控制大窗口带来的内核处理代价。**

## receive buffer、window 与 `tcp_adv_win_scale`

`tcp_rmem` 有三个值：

```text
net.ipv4.tcp_rmem = min default max
```

文章讨论的重点是第三个值，也就是 Linux autotuning 能把单个 TCP receive buffer 增长到的最大值。

但 receive buffer 里不只有用户 payload。Linux 还需要为 skb、包元数据、驱动和协议栈处理开销分配内存。Cloudflare 在部分硬件上观察到，实际内存分配可能达到用户 payload 的数倍。

`tcp_adv_win_scale` 用来决定“可用接收缓冲中有多少比例可以作为 TCP receive window 通告给发送方”。Cloudflare 选择：

```conf
net.ipv4.tcp_rmem = 8192 262144 536870912
net.ipv4.tcp_adv_win_scale = -2
```

`536870912` 是 512 MiB。`tcp_adv_win_scale = -2` 时，最大 advertised receive window 约为可用接收缓冲的 1/4，于是得到：

```text
512 MiB * 1/4 = 128 MiB
```

这背后的取舍是：宁愿把大部分 receive buffer 空间留给内核元数据和处理余量，也不要把窗口通告得过满，导致接收队列更容易打满并触发 TCP collapse。

## TCP collapse 的问题

当 TCP receive queue 满了，Linux 不一定立即丢包，而是可能尝试整理接收队列中的内存布局，腾出空间接收新包。这个动作就是 TCP collapse。

它的好处是尽量避免丢包；坏处是这个整理动作可能很慢，尤其在大 receive queue 上，会造成内核路径里的延迟尖刺。对 Cloudflare 这类边缘网络，HTTP 请求延迟尖刺被视为需要修复的问题。

Cloudflare 的做法不是完全禁止所有 collapse，而是引入内核补丁和新参数：

```conf
net.ipv4.tcp_collapse_max_bytes = 6291456
```

也就是只允许在较小队列上 collapse，队列过大时直接走丢包等 TCP 正常反馈路径。文中认为 6 MiB 对应的 collapse 延迟可控制在他们能接受的范围内。

这个参数是 Cloudflare 自己的内核补丁能力，不是普通 Linux 发行版一定具备的标准 sysctl。生产上看到这项配置时，必须先确认内核是否支持。

## 第二篇的新配置

Cloudflare 文中给出的新测试配置：

```conf
net.ipv4.tcp_rmem = 8192 262144 536870912
net.ipv4.tcp_wmem = 4096 16384 536870912
net.ipv4.tcp_adv_win_scale = -2
net.ipv4.tcp_collapse_max_bytes = 6291456
net.ipv4.tcp_notsent_lowat = 131072
```

这里有两个容易误读的点。

第一，`tcp_wmem max` 也被放大到 512 MiB，但这不意味着希望每个连接都积压 512 MiB 待发送数据。Linux autotuning 不会预分配这些内存，实际占用取决于连接行为。

第二，正因为发送缓冲上限变大，他们同时把：

```conf
net.ipv4.tcp_notsent_lowat = 131072
```

设为 128 KiB，避免应用把过多尚未发送的数据塞进内核，造成发送端 bufferbloat 和内存浪费。

这和第一篇的 `16 KiB` 不是矛盾，而是目标不同：

- `16 KiB`：面向 HTTP/2 资源优先级，追求关键资源快速插队。
- `128 KiB`：面向高吞吐 TCP workload，在不伤害吞吐的前提下限制发送端未发送队列。

## 可观测指标

排查 HTTP/2 优先级问题时，重点看浏览器侧 waterfall，而不是只看服务端平均响应时间：

- CSS、阻塞 JS、字体是否被图片或大文件挡住。
- 首屏关键资源是否早于低优先级资源完成。
- First Paint、LCP、DOM Content Loaded 是否受影响。

排查 TCP receive window 和缓冲问题时，可以看：

```bash
ss -tmi
```

重点字段包括：

- `Recv-Q`：本地应用还没读取的用户 payload 字节数。
- `rcv_ssthresh`：接收窗口 clamp，可理解为接收窗口上限相关指标。
- `skmem_r`：receive buffer 实际分配内存，包含 payload 和元数据。
- `skmem_rb`：socket receive buffer 最大可分配值，即 `sk_rcvbuf`。
- `rcv_space`：应用读取速率的高水位，autotuning 会参考它调整缓冲。

还应结合：

```bash
nstat
cat /proc/net/netstat
cat /proc/sys/net/ipv4/tcp_rmem
cat /proc/sys/net/ipv4/tcp_wmem
cat /proc/sys/net/ipv4/tcp_adv_win_scale
cat /proc/sys/net/ipv4/tcp_notsent_lowat
```

如果内核支持相关统计，可关注 TCP collapse、接收队列丢包、乱序队列丢包等计数是否增长。

## 调参方法

拆分几个清晰问题：

1. 应用层调度是否被内核发送队列吞掉？
2. receive window 是否足够覆盖 BDP？
3. receive buffer 是否给内核元数据留了空间？
4. 大队列满时 collapse 的最坏延迟是否可控？
5. 发送端是否因为过大的 not-sent queue 制造了新的 bufferbloat？

更可靠的步骤：

1. 明确目标场景：首屏延迟、HTTP/2 优先级、跨洲单流吞吐、还是大量并发连接。
2. 如果目标是高 BDP 吞吐，先用目标带宽和最大 RTT 计算所需 window。
3. 根据 window 反推 `tcp_rmem max`，同时用 `tcp_adv_win_scale` 给内核元数据留足空间。
4. 如果放大发送缓冲，同步设置合理的 `tcp_notsent_lowat`，避免发送端积压过多 not-sent bytes。
5. 用真实业务模型压测，不要只依赖 `iperf3`。文章明确指出，`iperf3` 过于规整，未必触发 receive queue 被填满后的问题。
6. 观察吞吐、尾延迟、TCP 内存、collapse/丢包计数和应用层指标，再逐步调整。
