# TCP 临时端口选择和重用

## 前提

- TCP 在 `bind` 和 `connect` 时，如果没有显式指定端口，就会从临时端口范围里选择一个可用端口。
- 内核会维护端口信息列表，记录端口的使用情况。
- 每个端口信息又关联一组 socket，记录与该端口相关的连接或绑定。
- socket 信息包括：interface、IP、类型（是否 bind）、四元组、状态等。

## `bind` 端口选择逻辑

1. 从临时端口范围内按内核算法选择一个扫描起点。
2. 如果端口空闲，返回该端口。
3. 如果该端口所有 socket 的 interface 都和本次不同，返回该端口。
4. 如果该端口所有 socket 的 IP 都和本次不同，返回该端口。
5. 如果该端口存在非 bind 类型的 socket，尝试下一个端口。
6. 如果该端口存在非 `TIME_WAIT` 状态的 socket，尝试下一个端口。
7. 如果该端口存在未设置 `SO_REUSEADDR` 的 socket，尝试下一个端口。
8. 如果新 socket 未设置 `SO_REUSEADDR`，尝试下一个端口。
9. 否则重用该端口。
10. 如果遍历完成仍未找到可用端口，返回 `EADDRNOTAVAIL`。

说明：历史实现里有过端口扫描起点和奇偶端口分配相关的调整，例如 Linux commit [`a9d8f9110d7e`](https://github.com/torvalds/linux/commit/a9d8f9110d7e953c2f2b521087a4179677843c2a)。但这类细节依赖内核版本和具体路径，不适合作为稳定结论。更稳妥的表述是：内核在临时端口范围内选择起点并扫描候选端口。

## `connect` 端口选择逻辑

1. 从临时端口范围内按内核算法选择一个扫描起点。
2. 如果端口空闲，返回该端口。
3. 如果该端口存在 bind 类型的 socket，尝试下一个端口。
4. 如果该端口所有 socket 的四元组都和新 socket 不同，返回该端口。
5. 如果系统未启用 `tcp_tw_reuse`，尝试下一个端口。
6. 如果四元组相同的 socket 处于 `TIME_WAIT` 状态，并且时间条件满足，则重用该端口。
7. 否则尝试下一个端口。
8. 如果遍历完成仍未找到可用端口，返回 `EADDRNOTAVAIL`。

## 要点

1. 端口被用来 `bind` 后，要在所有相关 socket 销毁之后，才能作为普通 `connect` 的临时端口使用。
2. 端口被用来 `bind` 后，如果 IP 不同，可以继续用于 `bind`。
3. 端口被用来 `connect` 后，如果 IP 不同，可以用于 `bind`。
4. 端口被用来 `connect` 后，如果四元组不同，可以继续用于 `connect`。
5. `bind` 的重用由 socket 选项 `SO_REUSEADDR` 控制。
6. `connect` 的 `TIME_WAIT` 重用由系统参数 `tcp_tw_reuse` 控制。

## Connect With Bind

这种用法常见于 `connect` 需要从特定本地 IP 发起的场景，也可以是指定本地 IP 和端口。

实现上通常是先 `bind` 再 `connect`。如果 `bind` 时没有特殊处理，端口已经在 `bind` 阶段选好，因此会走 `bind` 端口选择逻辑，而不是 `connect` 端口选择逻辑。

典型例子：

- Go 的 `DialTCP(local_addr)`；
- nginx `ngx_http_proxy_module` 的 `proxy_bind`。

如果这些路径没有设置 `SO_REUSEADDR`，会阻碍本地端口重用。

## `IP_BIND_ADDRESS_NO_PORT`

Linux 4.2 开始加入 `IP_BIND_ADDRESS_NO_PORT`。它的效果是：`bind` 时只绑定本地地址，不立即选择端口，把端口选择推迟到 `connect` 阶段。

设置这个选项后，`connect with bind` 场景可以回到更适合出站连接的 `connect` 端口选择逻辑。

nginx 从 1.11.2 开始使用该选项。

## `TIME_WAIT` 在服务端

如果客户端侧没有 `TIME_WAIT`，客户端临时端口就不会受到 `TIME_WAIT` 重用限制。

在可控协议里，让服务端主动关闭 socket，把 `TIME_WAIT` 留在服务端，通常更有利于降低客户端临时端口耗尽风险。

## 测试程序

下面的程序可以测试几种组合：

- `-b` / `-bind_dial`：客户端是否先 `bind 127.0.0.1:0` 再 `dial`；
- `-s` / `-server_tw`：是否让服务端先关闭，从而把 `TIME_WAIT` 留在服务端。

```go
package main

import (
	"flag"
	"log"
	"net"
	"time"
)

const TheAddr = "127.0.0.1:7000"

var BindDial = false
var ServerTW = false

func init() {
	flag.BoolVar(&BindDial, "bind_dial", false, "bind before dial")
	flag.BoolVar(&BindDial, "b", false, "bind before dial (shorthand)")
	flag.BoolVar(&ServerTW, "server_tw", false, "TIME_WAIT on server")
	flag.BoolVar(&ServerTW, "s", false, "TW_WAIT on server (shorthand)")
}

func client() {
	laddr, _ := net.ResolveTCPAddr("tcp", "127.0.0.1:0")
	if !BindDial {
		laddr = nil
	}
	raddr, _ := net.ResolveTCPAddr("tcp", TheAddr)
	for {
		conn, err := net.DialTCP("tcp", laddr, raddr)
		if err != nil {
			log.Print(err)
			time.Sleep(time.Second)
			continue
		}

		log.Print("dial success", conn.LocalAddr())

		if ServerTW {
			time.Sleep(time.Second)
			conn.Close()
		} else {
			conn.Close()
			time.Sleep(time.Second)
		}
	}
}

func server() {
	l, err := net.Listen("tcp", TheAddr)
	if err != nil {
		log.Fatal(err)
	}
	defer l.Close()
	for {
		conn, err := l.Accept()
		if err != nil {
			log.Fatal(err)
		}

		if ServerTW {
			conn.Close()
		} else {
			time.Sleep(time.Second)
			conn.Close()
		}
	}
}

func main() {
	flag.Parse()
	go server()
	time.Sleep(time.Second)
	go client()
	time.Sleep(time.Hour)
}
```
