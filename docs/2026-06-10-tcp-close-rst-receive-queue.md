# TCP close 遇到未读接收数据时的 RST 行为

## 问题概述

TCP 连接关闭并不只是“调用 `close()` 就结束”。应用进程关闭 socket 时，内核需要同时处理两个方向上的状态：

- 本端还有没有待发送的数据；
- 本端接收队列里有没有已经到达、但应用还没有读取的数据；
- 应用是否已经对读方向或写方向做过 `shutdown()`。

在 Linux 上，一个容易踩坑的场景是：**应用调用 `close()` 时，socket 的接收队列里仍有未读数据，内核可能向对端发送 TCP RST，而不是完成常规的 FIN 关闭流程。**

这会让对端看到连接被重置，例如 `recv()` 返回错误并报告 `Connection reset by peer`。更麻烦的是，如果本端刚刚写出了一条应用层错误响应，RST 可能使对端没有机会正常读到这条响应。

## 典型场景

假设客户端连续发送多段请求数据，服务端读到一部分后发现协议错误，于是写回错误消息并立刻关闭连接。

如果此时客户端后续发送的数据已经进入服务端内核的接收队列，但服务端应用没有继续读取，服务端执行 `close()` 时就可能触发 RST。客户端原本在等待服务端响应，最后却读到连接重置错误，而不是服务端写出的应用层错误消息。

这个现象经常出现在以下协议设计中：

- 客户端可能 pipeline 多个请求；
- 服务端读到第一个错误后立即退出处理；
- 服务端希望把错误原因发回客户端；
- 客户端还在继续发送，或者已经发送的数据尚未被服务端应用消费。

## Linux 上的关键机制

Linux 的行为可以粗略理解为：

- `close()` 处理 TCP socket 时，会检查接收队列中是否仍有应用未读取的数据；
- 如果存在未读数据，内核会丢弃这些数据，并把连接转为异常终止；
- 这种异常终止通常表现为向对端发送 RST；
- 内核统计中也会把这类情况归入 close 时 abort 的路径。

这不是 `SO_LINGER` 能直接解决的问题。`SO_LINGER` 主要影响关闭时本端发送队列中的数据如何处理，例如尽量发送、等待一段时间，或以 abortive close 的方式中止。它不负责把接收队列中的未读数据变成“已经被应用理解过”的协议输入。

## 相关内核代码

以下基于 `git.kernel.org` 上 Linux 主线源码整理；核对时的 `torvalds/linux.git` HEAD 为 `acb7500801e98639f6d8c2d796ed9f64cba83d3a`。这里重点看控制流，不逐字搬运完整源码。

### `close()` 时检查 receive queue

入口在 `net/ipv4/tcp.c` 的 `__tcp_close()`：

- 函数开始会把 `sk_shutdown` 置为 `SHUTDOWN_MASK`；
- 然后遍历 `sk_receive_queue`；
- 如果某个 skb 的 `end_seq` 仍在应用已复制位置 `copied_seq` 之后，就认为存在未读数据；
- 只要发现未读数据，后续会进入 abort close 分支。

结构化摘录：

```c
void __tcp_close(struct sock *sk, long timeout)
{
    bool data_was_unread = false;

    WRITE_ONCE(sk->sk_shutdown, SHUTDOWN_MASK);

    while ((skb = skb_peek(&sk->sk_receive_queue)) != NULL) {
        end_seq = TCP_SKB_CB(skb)->end_seq;
        if (TCP_SKB_CB(skb)->tcp_flags & TCPHDR_FIN)
            end_seq--;
        if (after(end_seq, tcp_sk(sk)->copied_seq))
            data_was_unread = true;
        tcp_eat_recv_skb(sk, skb);
    }

    if (data_was_unread) {
        NET_INC_STATS(sock_net(sk), LINUX_MIB_TCPABORTONCLOSE);
        tcp_set_state(sk, TCP_CLOSE);
        tcp_send_active_reset(sk, ..., SK_RST_REASON_TCP_ABORT_ON_CLOSE);
    }
}
```

源码位置：[Linux `tcp.c`, `__tcp_close()`](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/net/ipv4/tcp.c#n3138)。其中未读数据触发主动 reset 的分支在同文件约 `3182-3187` 行附近。

### `SO_LINGER` 的判断顺序

同一个 `__tcp_close()` 里，`SO_LINGER` 的零等待 abort 分支在未读数据分支之后。也就是说，Linux 会先判断 receive queue 是否有未读数据，再看是否设置了 `SO_LINGER` 且 `sk_lingertime == 0`。

结构上是：

```c
if (data_was_unread) {
    /* abort on close */
} else if (sock_flag(sk, SOCK_LINGER) && !sk->sk_lingertime) {
    sk->sk_prot->disconnect(sk, 0);
}
```

这能解释为什么 `SO_LINGER` 不应被理解为“处理接收队列”的机制。源码位置：[Linux `tcp.c`, close 分支](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/net/ipv4/tcp.c#n3182)。

### `shutdown(SHUT_WR)` 只处理发送方向

`shutdown()` 的通用 IPv4 入口在 `net/ipv4/af_inet.c` 的 `inet_shutdown()`。它会把用户传入的 `SHUT_RD` / `SHUT_WR` 映射到内部 bit，然后 OR 到 `sk_shutdown`，再调用协议自己的 `shutdown` 回调：

```c
how++;
WRITE_ONCE(sk->sk_shutdown, sk->sk_shutdown | how);
if (sk->sk_prot->shutdown)
    sk->sk_prot->shutdown(sk, how);
```

源码位置：[Linux `af_inet.c`, `inet_shutdown()`](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/net/ipv4/af_inet.c#n901)。

TCP 的协议回调在 `net/ipv4/tcp.c` 的 `tcp_shutdown()`。它只在 `how` 包含 `SEND_SHUTDOWN` 时继续，否则直接返回；如果需要发送 FIN，则调用 `tcp_send_fin()`：

```c
void tcp_shutdown(struct sock *sk, int how)
{
    if (!(how & SEND_SHUTDOWN))
        return;

    if (state_allows_fin)
        tcp_send_fin(sk);
}
```

源码位置：[Linux `tcp.c`, `tcp_shutdown()`](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/net/ipv4/tcp.c#n3071)。

这就是 `SHUT_WR` 和 `SHUT_RD` 差异的代码根源：`SHUT_WR` 会进入 TCP 的 FIN 发送路径；单独 `SHUT_RD` 不会。

### `RCV_SHUTDOWN` 后又收到数据

另一个相关路径在 `net/ipv4/tcp_input.c`。在 `TCP_FIN_WAIT1` / `TCP_FIN_WAIT2` 等状态下，如果 socket 已经带有 `RCV_SHUTDOWN` 标志，但又收到携带新数据的段，Linux 会统计 abort-on-data 并 reset：

```c
if (sk->sk_shutdown & RCV_SHUTDOWN) {
    if (segment_has_new_data_after_rcv_nxt) {
        NET_INC_STATS(sock_net(sk), LINUX_MIB_TCPABORTONDATA);
        tcp_reset(sk, skb);
        return SKB_DROP_REASON_TCP_ABORT_ON_DATA;
    }
}
```

源码位置：[Linux `tcp_input.c`, FIN_WAIT 数据处理](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/net/ipv4/tcp_input.c#n7358)。

## `SHUT_WR` 的作用

`shutdown(fd, SHUT_WR)` 只关闭本端写方向。对 TCP 来说，它会让本端发送 FIN，表示“不再发送数据”。

它的意义在于：

- 对端可以读到 EOF，从而知道本端写方向结束；
- 本端仍然可以继续读取对端已经发送或后续发送的数据；
- 应用有机会在最终 `close()` 前把输入侧处理干净。

因此，一个更稳妥的优雅关闭流程通常是：

1. 写出最后的应用层响应；
2. 调用 `shutdown(fd, SHUT_WR)` 关闭写方向；
3. 继续读取对端数据，直到 EOF、超时、协议边界完成或达到安全上限；
4. 最后调用 `close()` 释放 fd。

注意：`SHUT_WR` 不是魔法。它本身不能替你消费接收队列。它只是让协议进入半关闭状态，使应用仍有机会处理读方向。

还有一个容易被忽略的间接效果：`SHUT_WR` 会让对端在读完已到达数据后从 `recv()` 得到 EOF。很多客户端协议实现一旦读到 EOF，就认为响应结束，不会继续调用 `recv()`。这样一来，即使本端后续 `close()` 因未读接收队列触发了 RST，对端也可能已经停止读，因而看不到 `Connection reset by peer`。

换句话说，`SHUT_WR` 并不一定消除了 reset 的根因；它可能只是通过“先让对端读到 EOF 并退出读取循环”隐藏了 reset 的可见效果。若对端在 EOF 后继续写，或协议栈/应用继续观察连接错误，RST 仍可能以其他形式暴露出来。

## `SHUT_RD` 的差异

`shutdown(fd, SHUT_RD)` 表示本端不再读取。这个调用在不同系统上的语义细节并不完全一致。

在 Linux 上，它主要设置读方向关闭标志。后续应用层读取会受到这个状态影响，但它并不会自动清空 TCP 接收队列。结果是：

- `SHUT_RD` 后如果接收队列里还有未读数据；
- 随后再调用 `close()`；
- 仍可能因为这些未读数据触发 RST。

所以在 Linux 上，不能把 `SHUT_RD` 当成“丢弃所有未读输入并优雅关闭”的手段。

从上面的代码也能看到这一点：`inet_shutdown()` 会设置 `RCV_SHUTDOWN`，但 TCP 的 `tcp_shutdown()` 对不包含 `SEND_SHUTDOWN` 的调用直接返回，并没有清空 `sk_receive_queue`。

## BSD 上的表现

笔记中记录了一个重要差异：BSD 系统对 `SHUT_RD` 的处理可能会清空接收队列。

这意味着在 BSD 上，如果应用先执行 `SHUT_RD`，再关闭 socket，接收队列残留数据不一定会以 Linux 的方式触发 RST；对端可能看到的是正常 EOF。

但这个差异不应被过度泛化：

- 如果不调用 `SHUT_RD`，直接在接收队列仍有未读数据时 `close()`，BSD 仍可能表现为 reset；
- 不同 BSD 派生系统和版本可能存在实现差别；
- 跨平台程序不应依赖“关闭时忽略未读接收数据”这个行为。

更可移植的做法还是让应用协议自己定义关闭流程，并由应用显式消费、丢弃或中止输入。

## 工程建议

### 需要优雅关闭时

不要在发现协议错误后立刻 `close()`。应先把错误响应写出，然后进入有限的 lingering read：

- 继续读掉对端已经发送的数据；
- 设置最大读取字节数，避免被无限输入拖住；
- 设置超时，避免连接长期占用资源；
- 到达 EOF、协议边界或安全阈值后再关闭。

nginx 的 `lingering_close` 属于这一类思路：服务端不立即关闭，而是给对端和网络栈一个收尾窗口，减少 RST 打断响应的概率。

如果只是先 `SHUT_WR` 再 `close()`，对端可能因为先读到 EOF 而不再暴露 reset 错误；但这更像是改变了对端观察到的关闭顺序。真正稳妥的优雅关闭仍然需要本端有限读取并处理接收队列中的残留数据。

### 需要快速拒绝时

如果协议语义就是“发现异常后立即中止”，那么 RST 是可以接受的，甚至是想要的结果。此时应把它当成 abortive close 来设计，而不是误以为对端一定能收到应用层错误消息。

适合这种方式的场景包括：

- 明显恶意或超限输入；
- 不希望继续消耗服务端资源；
- 应用层错误信息不是必须可靠送达；
- 上层协议允许用连接重置表达失败。

### 设计协议时

协议最好避免让一方在另一方仍可能持续发送时立即关闭连接。可以考虑：

- 明确请求长度或消息边界；
- 服务端响应错误后仍读取到当前消息结束；
- 客户端收到错误后停止发送并关闭写方向；
- 对 pipeline、多路复用、批量请求定义清晰的失败语义。

## 结论

`close()` 不是协议收尾机制，只是释放本进程对 fd 的引用，并触发内核按当前 TCP 状态处理连接。

发送队列、接收队列、读关闭、写关闭是不同问题：

- 发送队列关注本端已写但尚未完全发出的数据；
- 接收队列关注对端已发但本应用尚未读取的数据；
- `SHUT_WR` 用于结束本端写方向；
- `SHUT_RD` 在 Linux 上不会替应用清空未读输入；
- `SO_LINGER` 主要影响发送侧和 abortive close 行为。

如果目标是让对端可靠读到最后的应用层响应，应用需要主动设计关闭流程：写出响应、半关闭写方向、有限读取对端剩余输入，然后再真正关闭连接。
