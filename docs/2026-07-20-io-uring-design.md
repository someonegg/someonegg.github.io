# 深入理解 io_uring：从系统调用到共享队列

理解 io_uring 的关键，不是把它记成一组“异步版 `read` / `write` API”，而是看清它改变了应用与内核交换 I/O 工作的方式：应用不再为每个操作单独发起一次调用，而是把操作描述符批量写入共享提交队列，再从共享完成队列批量取回结果。

它优化的是 **I/O 的控制面**。文件系统、Page Cache、Block Layer、网络协议栈和设备驱动通常仍然存在；数据是否复制、是否 DMA、是否经过 Page Cache，则取决于具体 opcode、文件打开方式、文件系统和设备能力，不能由“使用 io_uring”四个字直接推出。

## 1. io_uring 解决的真正问题

传统同步 I/O 的交互粒度是一条系统调用：

```text
Application
    │ read(fd, buf, len)
    ▼
syscall boundary
    │ validate arguments / resolve fd / execute or wait
    ▼
Kernel I/O stack
    │
    ▼
return value
```

当单次 I/O 很慢时，系统调用开销并不显眼；当设备越来越快、请求越来越小、并发越来越高时，固定成本会逐渐暴露：

- 每个请求都要跨越用户态与内核态边界；
- 每次都要复制、解析请求参数并解析 fd；
- 提交、等待和收割完成事件之间存在频繁切换；
- 小请求难以批处理，CPU 容易浪费在调度、锁和 Cache Miss 上；
- readiness 模型还要求应用在“已就绪”之后再次发起真正的 I/O。

io_uring 没有承诺消灭所有这些成本。它提供了一组可以组合的机制，把其中许多固定工作从“每次 I/O”移到“批次”或“初始化阶段”。

## 2. 核心对象：SQ、SQE、CQ、CQE

一个 io_uring 实例的核心是两条由用户态与内核共享的环形队列：

```text
                         shared memory

Application ──produce──▶ Submission Queue ──consume──▶ Kernel
Application ◀─consume── Completion Queue ◀──produce── Kernel
```

- SQ（Submission Queue）记录哪些 SQE 可以被内核消费。
- SQE（Submission Queue Entry）描述一个操作，例如 read、write、accept、recv、timeout 或 cancel。
- CQ（Completion Queue）保存内核已经发布的完成记录。
- CQE（Completion Queue Entry）携带结果、标志和应用自定义的 `user_data`。

SQE 是命令描述符，不是 payload 本身。以一次 read 为例，它大致表达：

```text
opcode = READ
fd     = target file
addr   = destination buffer
len    = requested bytes
off    = file offset
user_data = application request token
```

完成时，CQE 通过 `user_data` 与请求关联；`res >= 0` 通常表示结果值，例如实际读到的字节数，`res < 0` 则是负的 errno。错误通常属于某个请求，因此出现在 CQE 中，而不是统一由提交系统调用返回。

共享队列的价值不是“从此没有 syscall”。普通模式下，应用通常仍需通过 `io_uring_enter(2)` 通知内核有新 SQE，或等待足够的 CQE；真正的收益是一次调用可以提交多个请求，也可以把提交与等待合并。只有启用 SQPOLL 且轮询线程未休眠等条件满足时，提交路径才可能不需要 syscall。[io_uring(7)](https://man7.org/linux/man-pages/man7/io_uring.7.html) [io_uring_enter(2)](https://man7.org/linux/man-pages/man2/io_uring_enter.2.html)

## 3. 一次 READ 的生命周期

应用层看到的是一条 SQE，内核内部却仍要走对应的 Linux I/O 路径：

```text
Application fills SQE
    │ publish SQ tail
    ▼
Kernel consumes and validates SQE
    │ resolve file / buffer / credentials
    ▼
VFS + filesystem
    │
    ├── buffered read
    │     ├── Page Cache hit ──▶ copy to user buffer
    │     └── Page Cache miss ─▶ filesystem / block layer / driver
    │
    └── direct I/O
          └── filesystem / block layer / driver, subject to alignment
    │
    ▼
Kernel publishes CQE
    │
    ▼
Application consumes completion
```

这张图要特别注意三个边界。

第一，io_uring 通常没有绕过 VFS、文件系统、Page Cache、Block Layer 或驱动。它只是为这些子系统提供了另一种请求入口和完成出口。

第二，异步接口不代表每个请求都由设备原生异步完成。内核会先尝试在非阻塞路径中执行；某些无法立即推进的操作可以等待 readiness，另一些可能转交 io-wq 工作线程。实际路径依赖操作类型和内核支持。

第三，io_uring 不天然等于 zero-copy。普通 buffered read 仍可能把 Page Cache 中的数据复制到用户缓冲区；direct I/O 可以避开 Page Cache，但仍有地址映射、对齐、设备 DMA 和文件系统语义等约束。

## 4. 性能来自一组可组合机制

### 4.1 批量提交与批量收割

最基础的收益来自改变交互粒度：

```text
传统方式：read ─ syscall ─ return
          read ─ syscall ─ return
          read ─ syscall ─ return

io_uring：SQE + SQE + SQE ─ one submit ─ CQE + CQE + CQE
```

即使不启用任何高级特性，把多个 SQE 一次发布，也能摊薄系统调用、参数处理和队列同步成本。应用还可以用一次 `io_uring_submit_and_wait()` 同时提交一批工作并等待完成，减少事件循环中的往返。

但批处理存在吞吐与尾延迟的经典取舍：等待更大的 batch 可以提高效率，也可能让最早到达的请求多等一段时间。最佳批量不是常数，需要结合到达率、队列深度与延迟目标测量。

### 4.2 SQPOLL：让内核线程主动消费 SQ

启用 `IORING_SETUP_SQPOLL` 后，内核轮询线程会观察 SQ，并代表应用提交新请求：

```text
Application publishes SQE
    │
    ▼
SQ polling kernel thread
    │ consume without a submit syscall while active
    ▼
I/O path
```

这可以进一步降低提交延迟，但不是免费加速：

- 轮询会消耗 CPU；
- 线程空闲后会睡眠，应用仍需 syscall 唤醒；
- 等待完成、注册资源等操作仍可能需要 syscall；
- 多个 ring 各自创建轮询线程会增加资源占用；
- CPU affinity、NUMA 拓扑与 idle timeout 会影响效果。

因此 SQPOLL 更适合稳定、高频、对延迟敏感的负载，不适合低频 I/O 为了“异步”而默认开启。[io_uring_sqpoll(7)](https://man7.org/linux/man-pages/man7/io_uring_sqpoll.7.html)

### 4.3 Registered Files：把 fd 解析移出热路径

普通请求携带进程 fd，内核需要从 fd table 解析并取得 `struct file` 引用。注册文件后，应用使用 ring 内固定文件表的索引，并在 SQE 上设置 `IOSQE_FIXED_FILE`：

```text
ordinary fd                         fixed file

fd ─▶ process fd table              index ─▶ ring file table
      └─▶ struct file                       └─▶ struct file
```

它的意义不是让文件脱离 VFS，而是让 ring 长期持有内部对象引用，降低稳态请求的 fd lookup 和引用管理成本。长期复用一组 socket 或文件的服务器更容易受益；文件集合频繁变化时，注册和更新表本身也有成本。

### 4.4 Registered Buffers：预付映射成本

固定缓冲区通过 `IORING_REGISTER_BUFFERS` 注册，随后配合 `READ_FIXED`、`WRITE_FIXED` 等操作使用。内核可以长期持有并映射这些内存页，把原本可能出现在每次 I/O 上的映射成本移到注册阶段。[io_uring_register(2)](https://man7.org/linux/man-pages/man2/io_uring_register.2.html) [io_uring_registered_buffers(7)](https://man7.org/linux/man-pages/man7/io_uring_registered_buffers.7.html)

```text
startup
    │ register address ranges
    ▼
ring buffer table ──▶ stable memory mappings

steady state
    │ buffer index + subrange
    ▼
READ_FIXED / WRITE_FIXED
```

这里不能写成“普通 `read` 总是先 `pin_user_pages()`，然后设备直接 DMA 到用户地址”。buffered I/O、direct I/O 和网络 I/O 的数据路径不同；注册缓冲区只说明内核可以复用已建立的长期映射，不保证绕过 Page Cache，也不保证硬件直接访问该缓冲区。

注册还会带来约束：

- 内存会被长期锁定，并计入 `RLIMIT_MEMLOCK` 等资源限制；
- 过度注册会占用物理内存和内核记账资源；
- buffer 必须在所有相关请求完成后才能安全复用或注销；
- 只有高复用、细粒度 I/O 才容易摊薄初始化成本。

### 4.5 Registered Buffer 与 Provided Buffer Ring 不是一回事

这两个概念常被混在一起，但它们解决不同问题：

| 机制 | 应用在 SQE 中指定什么 | 主要解决的问题 |
|---|---|---|
| Registered Buffer | 固定 buffer index 与地址范围 | 重用内存映射，降低每次 I/O 的映射成本 |
| Provided Buffer | buffer group ID | I/O 真正发生时，由内核从池中选择空闲 buffer |
| Provided Buffer Ring | 通过共享 ring 补充 Provided Buffer | 降低补充 buffer 池时的管理开销 |

Provided Buffer 特别适合接收场景。应用提前把多个 buffer 放进一个 group，提交 recv 时只指定 group；内核在 socket 真正有数据时选一个 buffer，并把 buffer ID 写入 CQE：

```text
Application provides
    Buffer Group 7: [bid 0] [bid 1] [bid 2] ...
                         │
recv SQE: select group 7│
                         ▼
Kernel chooses bid 1 when data arrives
                         │
                         ▼
CQE: bytes=N, flags=BUFFER, bid=1
                         │
Application processes and returns bid 1 to the ring
```

Buffer Ring 是“缓冲区所有权周转协议”，不是自动的网络 zero-copy。常规 socket recv 仍经过 Linux 网络栈；真正的 io_uring zero-copy RX 是另一套需要特定 NIC 与队列配置的能力，不应与 Provided Buffer 混为一谈。[io_uring_provided_buffers(7)](https://man7.org/linux/man-pages/man7/io_uring_provided_buffers.7.html) [Linux io_uring zero-copy Rx](https://docs.kernel.org/networking/iou-zcrx.html)

## 5. Linked Requests：把依赖关系随请求一起提交

应用可以用 `IOSQE_IO_LINK` 把多个 SQE 组成链：

```text
SQE 1: read    + LINK
    │ success
    ▼
SQE 2: write   + LINK
    │ success
    ▼
SQE 3: fsync
```

普通 soft link 中，前一项失败会取消链中后续请求；hard link 的失败传播规则不同。链描述的是“何时允许下一项执行”，不是数据库事务：它不提供回滚、隔离或 all-or-nothing 语义，也不保证链中业务动作天然幂等。[io_uring_linked_requests(7)](https://man7.org/linux/man-pages/man7/io_uring_linked_requests.7.html)

Linked Request 的典型价值包括：

- 让内核看到操作之间的先后依赖，减少完成后再回用户态提交下一步的往返；
- 把 timeout 与某个请求绑定；
- 让一批已知工作一次进入队列，同时保留局部顺序。

它更像一个小型 command chain，而不是任意工作流引擎。存在条件分支、动态 fan-out 或复杂补偿时，控制逻辑仍然属于应用。

## 6. Multishot：一个请求产生多次完成

传统 accept 每完成一次就需要重新提交：

```text
submit accept ─▶ CQE ─▶ submit accept ─▶ CQE ─▶ ...
```

Multishot accept 则允许一条 SQE 持续产生多个 CQE：

```text
one multishot accept SQE
    ├──▶ CQE for connection A, MORE=1
    ├──▶ CQE for connection B, MORE=1
    └──▶ final CQE, MORE=0
```

`IORING_CQE_F_MORE` 表示该请求预计还会产生后续完成；一旦该标志消失，应用就必须视其为终止并重新 arm。Multishot 请求也可能因错误或显式取消而结束，不能假设“一次提交永久有效”。

Multishot recv 通常与 Provided Buffer Ring 配合：同一条 recv SQE 会多次接收，而每次完成由内核选择一个可用 buffer。若 buffer group 耗尽，请求可能以 `-ENOBUFS` 结束；应用必须设计补充、背压和重新提交策略。[liburing: io_uring and networking](https://github.com/axboe/liburing/wiki/io_uring-and-networking-in-2023)

## 7. io_uring 与 epoll 的根本差异

epoll 与 io_uring 都能构建事件循环，但通知内容不同。

```text
epoll:    "这个 fd 现在可能可读"
             │
             ▼
          application calls recv/read

io_uring: "请执行这次 recv/read"
             │
             ▼
          completion reports result
```

epoll 是 readiness 模型，应用在收到就绪通知后执行 I/O，并处理边沿触发、反复 drain、`EAGAIN` 等状态。io_uring 是 completion-oriented 接口，应用先提交操作，之后收到操作结果；内核可在 readiness 到来时继续先前的请求。

这不意味着 io_uring 在所有场景都优于 epoll：

- 简单、低并发、生态成熟的 socket 服务可能从 epoll 获得更低的工程复杂度；
- io_uring 对 buffer 生命周期、CQ 容量、取消与关闭时序提出了新的要求；
- 具体 opcode 和特性受内核版本、文件系统、设备及发行版配置影响；
- 已有运行时或语言生态可能已经很好地封装了 epoll，却未完整暴露 io_uring 语义。

## 8. 为什么它看起来像 NVMe、RDMA 和 GPU

这些系统都采用“描述符 + 队列 + 异步完成”的形状：

| 系统 | Producer | Queue Consumer | 描述符表达什么 |
|---|---|---|---|
| io_uring | Application | Linux Kernel | 文件、网络及其他内核操作 |
| NVMe | Host Driver | SSD Controller | 块设备命令 |
| RDMA | Application / Provider | RNIC | Send、Receive、Read、Write 等工作请求 |
| GPU | CPU Program / Runtime | GPU | Kernel launch、copy 等命令 |

共同模式包括：

- 用队列解耦生产者和消费者；
- 用 descriptor 引用数据或资源，而不是把 payload 塞进控制路径；
- 用 batch 摊薄 doorbell、syscall 或调度成本；
- 用 completion queue 异步回报状态；
- 通过预注册和稳定资源减少热路径工作。

但相似的拓扑不等于相同的边界。io_uring 的 consumer 是 Linux 内核，它通常继续调用 VFS、协议栈和驱动；RDMA 或 NVMe 的 consumer 主要是设备。把它们类比有助于理解队列化设计，不能据此推断 io_uring 具有 RDMA 的内核旁路或远端内存语义。

## 9. 与 DPDK、AF_XDP 的边界

```text
ordinary socket / io_uring socket I/O
NIC ─▶ driver ─▶ Linux network stack ─▶ socket ─▶ application

DPDK data plane
NIC queue ─▶ userspace PMD + mbuf ─▶ application packet pipeline
```

io_uring 和 DPDK 都重视 ring、batch、预分配和数据局部性，但优化层次不同：

- io_uring 保留 Linux socket 与网络栈，优化应用和内核之间的提交、等待与 buffer 管理；
- DPDK 让用户态轮询驱动直接管理 NIC queue，目标是 raw packet data plane；
- AF_XDP 位于两者之间，提供面向高性能包处理的 XDP socket 与共享 UMEM 模型。

DPDK 能降低中断、调度、skb 和协议栈开销，但代价是专用 CPU、Hugepage、NUMA 与 NIC queue 配置，以及由应用承担更多网络功能。普通 TCP 服务不应仅因追求性能就默认绕过内核网络栈。

## 10. 正确使用时要守住的四条边界

### 10.1 请求完成不等于业务完成

send 的 CQE 可能只说明内核已经接收或处理了本地发送请求，不代表对端应用已经消费数据。文件 write 完成也不等于数据已经持久化；需要持久性时仍要理解 `fsync`、设备缓存和文件系统语义。

### 10.2 必须显式管理对象生命周期

SQE 可能在提交后异步使用文件、buffer 和用户上下文。关闭 fd、释放 buffer、销毁 ring 或复用 `user_data` 之前，必须确认相关请求已完成或已可靠取消。取消请求本身也是异步操作，不能把“提交 cancel”当作“目标已经消失”。

### 10.3 CQ 也是有容量的队列

生产完成事件的速度可能超过应用消费速度，multishot 又会让一条 SQE 产生多条 CQE。设计时需要估算 CQ 容量、及时推进 CQ head，并监控 overflow、dropped、`ENOBUFS` 和队列深度。

### 10.4 运行时探测优于只看版本号

io_uring 演进很快，发行版还可能 backport 或禁用某些功能。生产代码应使用 probe / feature flags 检查所需 opcode 和能力，并为不支持路径准备降级方案；不要仅用 `uname` 版本字符串作判断。

## 11. 什么时候值得使用

io_uring 更可能适合：

- 大量并发文件或网络 I/O，需要统一 completion 模型；
- 请求细小、频繁，系统调用和事件循环往返已成为可测量瓶颈；
- 文件、socket 或 buffer 可以长期复用，适合资源注册；
- 能投入工程成本处理 backpressure、取消、buffer ownership 和内核兼容性；
- 有真实 benchmark 证明 batch、multishot、provided buffer 或 polling 对目标负载有效。

它不一定适合：

- I/O 频率很低，性能主要受后端长延迟支配；
- 程序模型简单，同步 I/O 或成熟 runtime 已满足目标；
- 无法控制部署内核或需要广泛跨平台；
- 团队尚未建立异步资源生命周期和故障注入测试；
- 只是因为“io_uring 更新”就假定它必然更快。

采用时应先建立基线，再逐项加入能力：

```text
plain io_uring batching
    │ measure
    ├── fixed files / fixed buffers
    ├── linked operations
    ├── multishot + provided buffer ring
    └── SQPOLL / IOPOLL only when CPU-latency tradeoff is justified
```

至少观测吞吐、P50/P99/P999 延迟、CPU cycles、context switch、syscall rate、队列深度、CQ overflow、buffer starvation 和取消失败。优化的对象应是整个系统，而不是单独追求“更少 syscall”。

## 12. 总结

io_uring 最重要的设计转变可以概括为：

- 从逐次 **Call** 转向共享 **Queue**；
- 从一次提交一次完成，转向批量与 **Multishot**；
- 从每次解析 fd 和内存，转向预注册的稳定资源；
- 从应用收到 readiness 后再行动，转向内核直接推进已提交操作；
- 从每一步回到用户态编排，转向随 SQE 一起提交局部依赖。

但它仍然是 Linux I/O 栈的入口，不是默认绕过内核、默认 zero-copy 或默认更快的魔法开关。最准确的心智模型是：**io_uring 用共享队列和资源生命周期管理，把 I/O 控制面的固定成本从“每次请求”摊薄到“每批请求”乃至“整个 ring 生命周期”。**

## 参考资料

- [io_uring(7)](https://man7.org/linux/man-pages/man7/io_uring.7.html)
- [io_uring_setup(2)](https://man7.org/linux/man-pages/man2/io_uring_setup.2.html)
- [io_uring_enter(2)](https://man7.org/linux/man-pages/man2/io_uring_enter.2.html)
- [io_uring_register(2)](https://man7.org/linux/man-pages/man2/io_uring_register.2.html)
- [io_uring registered buffers](https://man7.org/linux/man-pages/man7/io_uring_registered_buffers.7.html)
- [io_uring provided buffers](https://man7.org/linux/man-pages/man7/io_uring_provided_buffers.7.html)
- [io_uring linked requests](https://man7.org/linux/man-pages/man7/io_uring_linked_requests.7.html)
- [liburing: io_uring and networking](https://github.com/axboe/liburing/wiki/io_uring-and-networking-in-2023)
- [Linux kernel: io_uring zero-copy Rx](https://docs.kernel.org/networking/iou-zcrx.html)
