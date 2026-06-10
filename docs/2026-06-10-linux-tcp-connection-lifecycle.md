# Linux TCP 连接生命周期与队列参数笔记

## 核心视角

TCP 连接问题通常不要只从“最大连接数”一个指标理解。一个连接从建立到释放，会经过几个不同的资源约束面：

1. 建立阶段：`SYN queue`、`accept queue`、SYN flood 防护、应用 `accept()` 速度。
2. 保持阶段：文件描述符、内存、conntrack、keepalive、应用处理能力。
3. 关闭阶段：`TIME_WAIT`、orphan socket、重传、端口复用、连接清理策略。

因此，调参时要先定位瓶颈属于哪一段，再看对应指标。把所有 sysctl 都调大或调小，通常只会把问题转移到另一个队列或资源池。

## 建立阶段：SYN queue 与 accept queue

Linux 监听 socket 使用双队列模型：

- `SYN queue`：保存三次握手尚未完成的半连接，典型状态是 `SYN_RECV`。
- `accept queue`：保存三次握手已经完成、等待应用调用 `accept()` 取走的连接。

应用程序只从 `accept queue` 取连接。`listen(fd, backlog)` 在现代 Linux 上控制的是 `accept queue` 的长度，而不是半连接队列长度。

### 关键参数

```text
net.ipv4.tcp_max_syn_backlog
net.core.somaxconn
net.ipv4.tcp_syncookies
net.ipv4.tcp_synack_retries
net.ipv4.tcp_abort_on_overflow
```

含义：

- `tcp_max_syn_backlog`：控制半连接队列规模。
- `somaxconn`：限制应用传给 `listen()` 的 backlog 上限；如果应用设置的 backlog 大于 `somaxconn`，会被静默截断。
- `tcp_syncookies`：当 SYN queue 压力过大时，用 SYN cookie 减少服务端保存半连接状态的需求。
- `tcp_synack_retries`：服务端发送 `SYN/ACK` 后的重试次数。
- `tcp_abort_on_overflow`：当 accept queue 溢出时，是否更积极地 reset 连接。

### accept queue 满时会发生什么

当客户端最后一个 ACK 到达时，内核需要把连接从 `SYN queue` 转移到 `accept queue`。如果此时 `accept queue` 已满，默认行为通常不是立刻返回 RST，而是忽略这个 ACK。

之后服务端会重发 `SYN/ACK`，客户端会认为自己的 ACK 丢失，于是再次发送 ACK。如果应用及时 `accept()` 释放出队列空间，连接仍可能最终建立成功；如果队列持续满，客户端最终会连接失败。

这类问题的本质通常不是 SYN flood，而是应用消费 accept queue 的速度跟不上连接建立速度。只调大 `somaxconn` 可以延缓溢出，但不能替代应用层扩容、减少阻塞、增加 worker 或优化 accept 循环。

### SYN queue 满时会发生什么

如果 SYN queue 满，并且启用了：

```text
net.ipv4.tcp_syncookies = 1
```

内核可以不为每个新 SYN 保存完整半连接状态，而是在 `SYN/ACK` 的序列号中编码 cookie。客户端回 ACK 后，服务端校验 cookie，再决定是否创建连接状态。

SYN cookie 是防御机制，不是常规容量规划手段。它可以降低 SYN flood 对内存和半连接队列的冲击，但也意味着系统已经处于异常压力或攻击路径上。

## 保持阶段：连接数不是只有 TCP 参数决定

大量连接稳定存在时，瓶颈可能来自多个层次。

### 文件描述符

每个 TCP 连接通常对应进程里的一个文件描述符。需要同时检查：

```text
ulimit -n
fs.file-max
systemd LimitNOFILE
应用自身的 max connections / worker_connections
```

如果进程文件描述符上限太低，内核 TCP 队列调得再大也无法承接更多连接。

### 内核内存

TCP socket 会消耗内核内存，包括收发缓冲、控制结构、重传队列等。连接越多，越要关注：

```text
net.ipv4.tcp_mem
net.core.rmem_max
net.core.wmem_max
net.ipv4.tcp_rmem
net.ipv4.tcp_wmem
```

这些参数不应脱离业务流量模型单独调大。大量空闲长连接、大量慢连接、大量待发送数据，消耗模式都不同。

### conntrack

如果机器启用了 NAT、防火墙、Kubernetes Service、iptables/nftables 路径，连接还可能占用 conntrack 表。

相关参数：

```text
net.netfilter.nf_conntrack_count
net.netfilter.nf_conntrack_max
nf_conntrack hashsize
```

conntrack 满时，表现可能像 TCP 栈异常，但实际是包过滤/连接跟踪层丢包。排查时要看 `nf_conntrack_count` 是否接近 `nf_conntrack_max`，同时对比 `ss` 看到的 TCP socket 状态和 `conntrack -L` 里的 flow 状态。

一个常见误判是：系统里真实 TCP socket 数量并不高，但 conntrack 表里有大量 `ESTABLISHED`、`TIME_WAIT` 或其他残留 flow。此时继续调大 `somaxconn`、`tcp_max_syn_backlog` 未必有效，问题可能在连接跟踪超时、NAT/防火墙路径、或不必要的流量被纳入 conntrack。

如果只是普通 Web 入口流量且不需要 NAT/连接跟踪，可以考虑在防火墙 raw 表对特定端口使用 `NOTRACK`，让这些包跳过 conntrack。这个做法会改变防火墙语义，必须同步放行 `UNTRACKED` 状态，否则可能直接把业务流量拦掉。

在 SYN/ACK/ACK flood 等异常流量下，也可以使用更严格的 conntrack 判断：

```text
net.netfilter.nf_conntrack_tcp_loose = 0
```

配合丢弃 `INVALID` 状态包，可以在部分场景下提前过滤不属于合法连接状态机的包。但它仍不能完全解决 SYN flood，因为新建 conntrack 条目本身也会成为压力点。

更强的前置防护是 `SYNPROXY`：在防火墙层先代替后端完成握手验证，避免伪造 SYN 直接打到后端 listen socket，也避免在初始 SYN 阶段创建完整 conntrack 状态。代价是连接建立路径更复杂、首包延迟增加，并且 `SYNPROXY` 规则里的 MSS、window scale、SACK、timestamp 等 TCP 选项需要和后端能力匹配。

如果确实需要调大 `nf_conntrack_max`，不要只调 max。conntrack hash 表大小也要配套规划，否则 hash 链过长会影响查找性能。粗略估算内存时，可以按“单条 conntrack 记录数百字节”量级预留，再结合 hash bucket 的固定内存和 CPU cache 影响做容量规划。

### keepalive

TCP keepalive 用来发现长期空闲但实际已经失效的连接。

常见参数：

```text
net.ipv4.tcp_keepalive_time
net.ipv4.tcp_keepalive_intvl
net.ipv4.tcp_keepalive_probes
```

keepalive 不是心跳协议的完整替代品。它通常适合清理死连接，但检测周期较长；如果业务需要快速发现断线，应用层心跳更可控。

## 关闭阶段：TIME_WAIT、orphan socket 与端口复用

TCP 关闭不是释放文件描述符就结束。用户态关闭 fd 后，内核可能还要继续完成挥手、等待 ACK、处理重传或保留状态。

### orphan socket

orphan socket 是指内核中仍存在 TCP 状态，但已经没有用户态文件描述符引用的 socket。

常见来源：

- 应用调用 `close()` 后，内核仍在完成关闭流程；
- 进程退出或崩溃，内核代为关闭连接；
- 本端已经发起关闭，但对端迟迟不 ACK，需要重传；
- linger 或异常关闭路径导致内核仍需保留临时状态。

相关参数：

```text
net.ipv4.tcp_max_orphans
net.ipv4.tcp_orphan_retries
```

`tcp_max_orphans` 限制系统允许存在的 orphan socket 数量。超过后，内核会更激进地 reset orphan 连接，以保护不可交换内核内存。这个参数主要是防护阈值，不应被当成常规限流手段，也不建议人为调低。

`tcp_orphan_retries` 控制本端关闭后，对 orphan 连接继续重试的次数。重载服务器可以根据业务容忍度适当降低，但要理解这会更快放弃异常或慢速关闭的连接。

### TIME_WAIT

`TIME_WAIT` 通常出现在主动关闭连接的一方。它的作用不是“拖慢关闭”，而是保护四元组复用的正确性：

1. 防止旧连接的延迟报文污染新连接。
2. 确保对端能收到最后一个 ACK，避免对端停留在 `LAST_ACK`。

如果大量短连接都由客户端主动关闭，客户端会积累大量 `TIME_WAIT`，并消耗临时端口可用性。如果协议可控，让服务端承担主动关闭有时可以降低客户端端口压力。

### 临时端口范围

主动外连时，如果没有显式绑定本地端口，内核会从临时端口范围中选择源端口：

```text
net.ipv4.ip_local_port_range
```

连接唯一性由四元组决定：

```text
源 IP、源端口、目的 IP、目的端口
```

因此，临时端口耗尽最容易发生在“同一源 IP 大量短连接打向同一目的 IP 和目的端口”的场景。扩大 `ip_local_port_range` 可以增加可用端口数量，但更根本的办法通常是减少短连接、使用连接池、增加源 IP，或调整连接关闭方向。

### 关于 `tcp_fin_timeout`

`tcp_fin_timeout` 常被误解为控制 `TIME_WAIT` 时长。更准确地说，它主要影响本端处于 `FIN_WAIT2` 等关闭等待状态的保留时间，不是通用的 `TIME_WAIT` 缩短开关。

如果问题是临时端口被 `TIME_WAIT` 占用，优先分析关闭方向、短连接频率、端口范围和 `tcp_tw_reuse`，不要简单依赖 `tcp_fin_timeout`。

### 关于 `tcp_tw_reuse` 与 `tcp_tw_recycle`

`tcp_tw_reuse` 用于在满足条件时复用处于 `TIME_WAIT` 的连接资源，主要影响出站连接场景。它依赖内核版本、timestamp 等条件，不是服务端通用的“清理 TIME_WAIT”开关。

`tcp_tw_recycle` 不应再作为优化建议。它依赖按对端 IP 记录 timestamp，在 NAT 场景下会错误拒绝合法连接，现代 Linux 内核已经移除该参数。

## 网卡 backlog 与 listen backlog 不同

容易混淆的两个参数：

```text
net.core.netdev_max_backlog
net.core.somaxconn
```

`netdev_max_backlog` 是网络设备收包进入协议栈前的队列。它影响包处理压力下的排队能力。

`somaxconn` 是 TCP listen 的 accept queue 上限。它影响已经完成握手、等待应用 `accept()` 的连接数量。

两者处在不同层次。连接建立失败时，要通过指标判断是网卡收包层、SYN queue、accept queue，还是应用层处理速度出了问题。

## 常见调参方向

### 服务端入口连接压力

关注：

```text
net.core.somaxconn
net.ipv4.tcp_max_syn_backlog
net.ipv4.tcp_syncookies
net.ipv4.tcp_synack_retries
应用 listen backlog
应用 accept 速度
```

判断思路：

- `ListenOverflows`、`ListenDrops` 增长，通常指向 accept queue 压力；
- 大量 `SYN_RECV`，可能是半连接压力、丢包、攻击或服务端返回路径异常；
- syncookies 触发，说明 SYN queue 已经进入保护路径；
- 应用 CPU、线程池、事件循环阻塞，也会间接导致 accept queue 堆积。

### 客户端主动外连压力

关注：

```text
net.ipv4.ip_local_port_range
TIME_WAIT 数量
tcp_tw_reuse
连接池 / 长连接
源 IP 数量
是否 connect with bind
```

判断思路：

- 如果错误是 `EADDRNOTAVAIL`，优先怀疑本地临时端口耗尽；
- 如果大量连接打向同一个目的四元组，端口压力会更明显；
- 如果应用先 `bind` 再 `connect`，可能绕过普通 connect 的端口复用逻辑；
- Linux 上 `IP_BIND_ADDRESS_NO_PORT` 可以把只绑定本地地址的端口选择推迟到 `connect()` 阶段，改善部分出站连接场景。

### 大量关闭中连接

关注：

```text
TIME_WAIT
FIN_WAIT1
FIN_WAIT2
LAST_ACK
CLOSING
tcp_max_orphans
tcp_orphan_retries
tcp_max_tw_buckets
```

判断思路：

- `TIME_WAIT` 多，不一定是问题，先看是否导致端口耗尽或内存压力；
- `LAST_ACK` 多，可能是本端被动关闭后最后 ACK 没回来，或对端行为异常；
- `FIN_WAIT2` 多，可能是对端没有继续完成关闭；
- orphan 多，说明用户态已经释放 fd，但内核仍在为关闭、重传或异常状态付出成本。

## 不建议直接照抄的模板项

一些历史高并发 sysctl 模板包含以下设置，需要谨慎处理：

```text
net.ipv4.tcp_tw_recycle=1
net.ipv4.tcp_timestamps=0
net.ipv4.tcp_max_tw_buckets=6000
net.core.somaxconn=65535
net.netfilter.nf_conntrack_max=6553600
```

风险：

- `tcp_tw_recycle` 已被移除，且曾经会破坏 NAT 场景。
- 关闭 `tcp_timestamps` 会影响 PAWS、RTT 估算以及部分复用判断。
- `tcp_max_tw_buckets` 调得过低会过早丢弃 `TIME_WAIT` 保护。
- `somaxconn` 极大并不等于吞吐更高；应用 `accept()` 和处理能力才是关键。
- `nf_conntrack_max` 需要结合内存、防火墙路径和实际 conntrack 使用量规划。

## 排查命令

查看关键 sysctl：

```bash
sysctl net.core.somaxconn
sysctl net.core.netdev_max_backlog
sysctl net.ipv4.tcp_max_syn_backlog
sysctl net.ipv4.tcp_syncookies
sysctl net.ipv4.ip_local_port_range
sysctl net.ipv4.tcp_max_orphans
sysctl net.ipv4.tcp_orphan_retries
sysctl net.netfilter.nf_conntrack_count
sysctl net.netfilter.nf_conntrack_max
sysctl net.netfilter.nf_conntrack_tcp_loose
```

查看 TCP 状态分布：

```bash
ss -ant | awk 'NR > 1 { count[$1]++ } END { for (state in count) print state, count[state] }'
```

查看监听队列：

```bash
ss -lnt
```

查看 TCP 扩展统计：

```bash
nstat -az | egrep 'Listen|Syncookies|TCPAbort|TCPSynRetrans'
```

查看 conntrack 状态分布：

```bash
conntrack -L | awk '{ count[$4]++ } END { for (state in count) print state, count[state] }'
```

查看文件描述符限制：

```bash
ulimit -n
cat /proc/sys/fs/file-max
```

## 记忆模型

可以把 TCP 连接生命周期理解成三组问题：

1. 能不能进来：SYN queue、accept queue、syncookies、应用 accept 速度。
2. 能不能撑住：fd、内存、conntrack、keepalive、应用处理能力。
3. 能不能干净退出：TIME_WAIT、orphan socket、关闭方向、重传和端口复用。

调参顺序也应按这个模型推进：先看失败发生在哪个阶段，再针对对应资源池处理。否则很容易把 `TIME_WAIT` 问题误判成连接数问题，把 accept queue 问题误判成 SYN flood，或者把 conntrack 问题误判成 TCP 栈问题。
