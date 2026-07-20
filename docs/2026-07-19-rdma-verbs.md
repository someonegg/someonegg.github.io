# 深入理解 RDMA：从 Verbs 对象模型到 RC WRITE 生命周期

理解 RDMA 最有效的方式，不是背 API，而是换一个视角：**Socket 编程主要是在调用内核协议栈，Verbs 编程则是在创建设备对象，并向网卡的命令队列提交工作。**

本文先用一个可运行的 RXE RC Ping-Pong 建立直觉，再把主线切换到一条 `IBV_WR_RDMA_WRITE`：从 `ibv_post_send()` 开始，追踪 WR 如何变成 WQE，如何经过 SQ、Doorbell、地址翻译、PCIe DMA、RC transport、远端内存写入和 ACK，最终以 CQE 回到应用。

- [学习版 RC Ping-Pong 源码](./assets/rxe-rc-pingpong/learning_rc_pingpong.c)

## 1. 先建立正确的心智模型

### 1.1 传统 Socket 隐藏了什么

一次常见的发送可以写成：

```c
send(sock, buf, len, 0);
```

这个调用背后通常还有 Socket 状态、内核发送缓冲区、TCP 序号与窗口、重传、ACK、协议栈调度和驱动队列。应用主要关心“把一段消息交给连接”，大量状态由内核维护。

Verbs 暴露的是另一种模型：

```text
Application
    │ build a Work Request
    ▼
Send Queue
    │ device consumes work asynchronously
    ▼
RNIC: DMA + packetization + transport
    │ write completion status
    ▼
Completion Queue
```

应用预先创建 QP、CQ、MR 等对象，把操作描述符提交到队列，再从完成队列取回结果。稳态数据路径通常不需要为每次操作执行系统调用；但设备打开、资源创建、内存注册和安全映射仍需内核与驱动参与。

### 1.2 Zero-copy 不等于数据没有移动

一次跨机 WRITE 中，数据仍然会移动：

```text
Requester memory
    │ PCIe DMA Read
    ▼
Requester RNIC
    │ network
    ▼
Responder RNIC
    │ PCIe DMA Write
    ▼
Responder memory
```

所谓 zero-copy，更准确地说是设备可以直接访问已注册的应用内存，避免 CPU 在用户缓冲区、内核 Socket 缓冲区和驱动缓冲区之间执行额外的软件复制。它不表示没有 PCIe 传输、没有链路传输，也不保证每一种 provider 或上层协议都绝对零复制。

### 1.3 RDMA、Verbs、RoCE 与 RXE 的位置

```text
Application
    │ libibverbs
    ▼
RDMA Verbs programming model
    │
    ├── InfiniBand: native InfiniBand link/transport
    ├── RoCE: InfiniBand transport over Ethernet
    │   ├── RoCE v1: Ethernet Layer 2
    │   └── RoCE v2: UDP/IP routable encapsulation
    └── iWARP: RDMA over TCP/IP

RXE  = Linux software RoCE implementation
RNIC = a network adapter implementing RDMA data path functions in hardware
```

`libibverbs` 是用户态库和编程接口，不是线上协议。通用 Verbs 描述“做什么”，具体 provider 把它翻译成设备或软件实现认识的形式。本文配套程序只调用标准 `libibverbs` API；换到真实 RNIC 时，主体对象模型仍然成立。

RXE 则在 CPU、Linux RDMA 子系统和网络栈中实现 RoCE 语义。它非常适合学习 QP 状态机、MR 权限、WR/CQE 和 RC 重试，但测得的吞吐和延迟不能代表硬件 RNIC。

## 2. Verbs 是一个网卡对象模型

看懂对象之间的依赖后，几十个 API 就不再是零散函数。

```text
RDMA device
    │ ibv_open_device()
    ▼
ibv_context
    ├── Completion Queue
    └── Protection Domain
          ├── Memory Region
          └── Queue Pair
                ├── Send Queue ──┐
                └── Recv Queue ──┴── Completion Queue
```

### 2.1 `ibv_context`：打开设备后的入口

`ibv_get_device_list()` 枚举设备，例如 `mlx5_0`、`mlx5_1` 或 `rxe0`；`ibv_open_device()` 返回 `ibv_context`。后续查询端口、分配 PD、创建 CQ 等操作都从这个上下文出发。

它可以类比文件描述符或设备句柄，但不要把它理解为网络连接：连接相关状态主要在 QP 中。

### 2.2 PD：本机资源隔离边界

PD（Protection Domain）把 QP、MR 或 Memory Window 组织到同一个本地保护域。设备处理访问时，不只看一个整数 key，还会结合 QP 所属 PD、内存对象所属 PD、地址边界和权限进行验证。

```text
PD A                    PD B
├── QP A                ├── QP B
└── MR A                └── MR B

QP A cannot use MR B merely by presenting MR B's key
```

PD 是本地实现中的隔离结构，不会作为身份字段在线上传输。它也不是用户名、租户证书或密码学认证；控制面仍需负责认证对端和安全分发访问能力。

### 2.3 MR：把内存变成设备可访问的对象

普通 C 指针只对当前进程的 CPU 地址空间有意义。调用 `ibv_reg_mr()` 后，RDMA 子系统会把一段虚拟地址范围、访问权限、PD 和设备所需的地址映射关联起来，并返回：

- `lkey`：本地 WQE 中的 SGE 用它授权本地设备访问。
- `rkey`：对端执行 Read/Write/Atomic 时，用它授权远端访问。

设备做 DMA 时使用的是设备可见的 DMA/bus address，不是直接拿 CPU 虚拟地址访问内存。驱动、页转换结构与可选 IOMMU 在中间建立映射。`addr + length` 也必须完整落入 MR 边界。

key 更像有范围、权限和生命周期的 capability，而不是加密密钥。泄露仍有效的 `rkey + address` 可能带来真实的远端访问能力，因此必须最小授权并及时失效。

### 2.4 QP：连接上下文与执行入口

Queue Pair 由两条工作队列组成：

```text
Queue Pair
├── SQ: Send Queue
└── RQ: Receive Queue
```

对 RC QP，设备还需要维护 QPN、状态、远端 QPN、本地和远端 PSN、路径 MTU、ACK/重试状态、SQ/RQ 位置、关联 CQ 和 PD 等上下文。

可以把 RC QP 类比为“驻留在设备侧的连接上下文”，但它不等同于完整 TCP Socket：QP 没有替应用提供任意长度字节流、内核接收缓冲区或业务级连接管理。

### 2.5 CQ：设备完成结果的汇合点

QP 的发送和接收方向都可以关联 CQ，多个 QP 也可以共享 CQ。设备或 provider 把完成结果写成 CQE，应用通过 `ibv_poll_cq()` 轮询，或结合 completion channel 等待通知。

CQE 表示某个 Verbs 操作的完成状态，不只是笼统的“DMA 完成”。对不同 opcode，它可能代表发送 transport 完成、接收完成或错误；它也不包含应用 payload，数据已经在对应 MR buffer 中。

### 2.6 WR、SGE、WQE、CQE

```text
WR: what operation should be performed
└── SGE: local address + length + lkey
       │ ibv_post_send() / ibv_post_recv()
       ▼
WQE: provider/device-specific queue element
       │ execute asynchronously
       ▼
CQE: status + opcode + wr_id + other metadata
```

- WR（Work Request）是应用构造的通用操作描述。
- SGE（Scatter/Gather Element）描述数据地址、长度和 `lkey`；多个 SGE 可以免去把分散数据先拼到连续缓冲区的步骤。
- WQE（Work Queue Element）是提交到工作队列后的底层表示；其布局取决于 provider 和设备。
- CQE（Completion Queue Entry）是完成记录。
- `wr_id` 完全由应用定义，设备在 completion 中原样带回，便于关联请求上下文。

SQ 里放的是命令，不是 Socket 式数据缓冲区。真正的非 Inline payload 仍留在 MR：

```text
SQ/WQE says: read address X, length N, using lkey K
MR contains: actual payload bytes
```

这与 NVMe Submission Queue、GPU Command Queue 和其他现代 PCIe 设备的“提交队列 → 设备 → 完成队列”模型很相似。

## 3. RC QP 为什么需要状态机

RC 是 connected transport。QP 刚创建时既不知道使用哪个端口，也不知道对端是谁，因此必须逐步配置：

```text
RESET
  │ local port, P_Key index, access flags
  ▼
INIT
  │ remote QPN/PSN, path, MTU, receive-side parameters
  ▼
RTR (Ready To Receive)
  │ local send PSN, ACK timeout, retries
  ▼
RTS (Ready To Send)
```

### 3.1 RESET → INIT：声明本地属性

配套程序的 `qp_to_init()` 设置 `port_num`、`pkey_index` 和 `qp_access_flags`。因为它只做 Send/Receive，权限为 0：

```c
attr.qp_access_flags = 0;
```

一个允许对端向本机 MR 执行 RDMA WRITE 的 QP，需要在目标端配置相应 remote access 能力；目标 MR 通常要同时注册 `IBV_ACCESS_LOCAL_WRITE | IBV_ACCESS_REMOTE_WRITE`，因为 libibverbs 要求开启 remote write 时也开启 local write。只改 WR opcode 不足以获得 WRITE 能力。

### 3.2 INIT → RTR：告诉 QP 从哪里接收

这一步配置远端 QPN、期望的远端起始 PSN、路径 MTU、地址向量、GID/LID 和 RNR 参数。此时本地 QP 已知道哪些包属于这条连接，以及如何校验 RC 顺序。

### 3.3 RTR → RTS：允许本地发送

这一步设置本地起始 PSN、ACK timeout、普通 retry、RNR retry 等参数。进入 RTS 后，应用才能正常向 SQ 发布发送类 WR。

QPN 用于定位目标 QP；PSN 用于 RC 的有序交付、丢包发现、ACK/NAK 和重试。它们是 transport 状态，不是密码学身份或防重放令牌。

### 3.4 控制面负责让双方“互相认识”

配套程序通过 TCP 交换 QPN、PSN、LID 和 GID，再把 QP 推到 RTS。真正的 RDMA WRITE 还需要目标端通过受保护的控制面提供：

```text
remote_addr
rkey
length/protocol metadata
```

生产系统可以使用 RDMA CM 或自己的连接服务。Verbs 不规定必须用 TCP；示例选择 TCP，是为了让建链字段可见。

## 4. 先用 RXE Ping-Pong 跑通基线

### 4.1 创建 RXE loopback 设备

以下命令以 Debian/Ubuntu 为例：

```bash
sudo apt update
sudo apt install build-essential rdma-core ibverbs-utils libibverbs-dev
sudo modprobe rdma_rxe
sudo rdma link add rocev2_lo type rxe netdev lo
```

同名设备存在时不要重复创建。先确认当前环境：

```bash
rdma link show
ibv_devices
ibv_devinfo -d rocev2_lo -i 1 -v
ls -l /dev/infiniband/uverbs*
ulimit -l
```

不要猜 GID index。下面示例使用 `-g 1`，是因为预期该位置对应 loopback 路径；不同内核、IP 配置和 provider 的 GID 表可能不同，必须以 `ibv_devinfo` 为准。

### 4.2 编译与运行

```bash
cd docs/assets/rxe-rc-pingpong
make
```

终端 1：

```bash
./learning_rc_pingpong \
  -d rocev2_lo -i 1 -g 1 -s 256 -n 10
```

终端 2：

```bash
./learning_rc_pingpong \
  -d rocev2_lo -i 1 -g 1 -s 256 -n 10 \
  127.0.0.1
```

程序先创建 PD、MR、CQ 和 RC QP，通过 TCP 交换 endpoint 并做 barrier，然后主动关闭 TCP，再进入 Ping-Pong 数据循环。因此应用消息由 RC QP 承载，不会偷偷继续走控制连接。

RXE、进程调度、busy polling 和消息格式化都会进入测量结果；这里的平均往返时间只能用于功能观察，不能解释为硬件 RDMA latency。

### 4.3 每轮 Send/Receive 发生了什么

客户端先 Post Receive，为未来的 pong 预留空间，再 Post Send 发送 ping；服务端先 Post Receive，收到 ping 后再发送 pong。

```text
Client                                      Server
Post Receive                               Post Receive
Post Send: ping ──────────────────────────> Receive CQE
Send CQE                                   Read rx_buffer
Receive CQE <───────────────────────────── Post Send: pong
Read rx_buffer                             Send CQE
```

若 SEND 到达时远端 RQ 为空，目标设备没有内核 Socket buffer 可以临时接住数据，只能返回 RNR。RC 可以按配置重试，却不能替应用创建 Receive WR。

配套程序注册 MR 时只有 `IBV_ACCESS_LOCAL_WRITE`，QP access flags 为 0，发送 opcode 是 `IBV_WR_SEND`。因此它是理解对象生命周期和异步 completion 的基线，不是一个隐藏的 WRITE 示例。

## 5. Send/Receive 与 RDMA WRITE 不是同一种操作

| 操作 | 远端是否预发 Receive WR | 是否携带远端地址与 `rkey` | 远端普通 CQE | 数据落点由谁指定 |
|---|---:|---:|---:|---|
| Send/Receive | 是 | 否 | Receive CQE | 远端 Receive WQE |
| RDMA Write | 否 | 是 | 默认没有 | 发起方的 `remote_addr + rkey` |
| Write With Immediate | 是，用于通知资源 | 是 | `RECV_RDMA_WITH_IMM` | payload 仍由远端地址指定 |
| RDMA Read | 否 | 是 | 默认没有 | 发起方读取到本地 SGE |

Send/Receive 是双边消息操作：远端软件必须提前提供 Receive WR，收到 CQE 后知道一条消息到达。

普通 RDMA WRITE 是单边内存操作：远端 CPU 不必同步调用 `recv()`，远端 RNIC 验证权限后直接修改目标内存。它默认不消费 RQ、不生成远端 CQE，也不唤醒远端线程。

“单边”只描述稳态数据移动，不表示完全没有双方协作。发起 WRITE 前，两端仍需建立 QP，目标端仍需注册并授权 MR，还要通过控制面安全交换 `remote_addr/rkey`。

## 6. 一条 RDMA WRITE 从什么条件开始

设 Host A 是 Requester，Host B 是 Responder：

```text
A.local_buf ─────── RC RDMA WRITE ───────> B.remote_buf
```

开始前必须满足：

- 两端 RC QP 已建立连接并进入可工作的状态。
- A 的本地 buffer 已注册为 MR，拥有有效 `lkey`。
- B 的目标 buffer 已注册为允许 `IBV_ACCESS_LOCAL_WRITE | IBV_ACCESS_REMOTE_WRITE` 的 MR。
- B 的 QP 允许对应 remote access。
- B 已通过控制面把有效的 `{remote_addr, rkey, length}` 告诉 A。

发起方的典型代码是：

```c
struct ibv_sge sge = {
    .addr   = (uintptr_t)local_buf,
    .length = len,
    .lkey   = local_mr->lkey,
};

struct ibv_send_wr wr = {
    .wr_id      = request_id,
    .sg_list    = &sge,
    .num_sge    = 1,
    .opcode     = IBV_WR_RDMA_WRITE,
    .send_flags = IBV_SEND_SIGNALED,
};

wr.wr.rdma.remote_addr = remote_addr;
wr.wr.rdma.rkey = remote_rkey;

struct ibv_send_wr *bad_wr = NULL;
int rc = ibv_post_send(qp, &wr, &bad_wr);
```

这条 WR 的含义是：

```text
RDMA_WRITE(
    source      = local_buf + lkey,
    length      = len,
    destination = remote_addr + rkey
)
```

WR 不是网络报文，也不包含非 Inline payload。它是一条高级的 DMA/网络复合命令。

## 7. 完整路径总览

```text
Requester CPU
    │ 1. provider converts WR to WQE
    ▼
SQ ring in host memory
    │ 2. ordering barrier, then Doorbell
    ▼
Requester RNIC
    ├── fetch/parse WQE and QP context
    ├── validate lkey, PD, bounds
    ├── translate address and DMA-read local payload
    ├── segment, add QPN/PSN/headers
    └── transmit RC RDMA WRITE packets
              │
              ▼
        Network / switches
              │
              ▼
Responder RNIC
    ├── locate QP by destination QPN
    ├── validate QP state and PSN
    ├── validate rkey, PD, permission, bounds
    ├── translate remote address
    ├── DMA-write remote memory
    └── return RC ACK/NAK
              │
              ▼
Requester RNIC
    ├── update PSN/retry/SQ state
    └── DMA-write CQE if signaled
              │
              ▼
Requester CPU calls ibv_poll_cq()
```

下面逐段展开这条路径。

## 8. Requester：从 WR 到线上报文

### 8.1 `ibv_post_send()` 通常不进入内核

创建 QP、映射队列和注册内存时，内核负责分配资源、检查权限并建立设备映射。稳态提交时，`ibv_post_send()` 通常进入对应用户态 provider：provider 检查软件队列空间、构造设备专用 WQE、更新 SQ，然后写受控的 Doorbell。

这里的“通常”很重要：Verbs 规定操作语义，不规定所有 provider 必须使用相同实现。RXE、mlx5 和其他设备的具体路径不同。

### 8.2 Provider 把 WR 翻译成 WQE

以典型硬件格式作概念化表示，一条 WRITE WQE 至少要描述：

```text
┌──────────────────────────────────┐
│ Control segment                  │
│ opcode, WQE index, flags         │
├──────────────────────────────────┤
│ Remote address segment           │
│ remote_addr, rkey                │
├──────────────────────────────────┤
│ Data segment                     │
│ local_addr, length, lkey         │
└──────────────────────────────────┘
```

WQE 同时连接两个地址空间：本地 SGE 决定“从哪里读取”，远端地址段决定“写到哪里”。具体字段、对齐和 segment 布局属于 provider/设备 ABI，不是通用 Verbs API 的固定线格式。

### 8.3 SQ 是命令 Ring

SQ 通常表现为环形队列：

```text
Producer                                      Consumer
    │                                             │
    ▼                                             ▼
┌──────┬──────┬──────┬──────┬──────┬──────┐
│ WQE7 │ WQE8 │ WQE9 │ free │ free │ free │
└──────┴──────┴──────┴──────┴──────┴──────┘
                     ▲
                  next WQE
```

CPU 写入 WQE 并推进 producer index。payload 仍然在 `local_buf`；SQ 只保存设备执行工作所需的描述。

### 8.4 为什么 Doorbell 前需要顺序保证

构造 WQE 是普通内存写，通知设备可能涉及 Doorbell record 和 MMIO。设备必须先看到完整 WQE，再看到“有新工作”的通知：

```text
write WQE
    ↓
provider's required memory ordering/barrier
    ↓
ring Doorbell
```

否则设备可能在字段完全可见前就开始取 WQE。应用调用常规 `ibv_post_send()` 时，不应自己猜硬件 barrier；正确顺序由 provider 实现。只有编写 direct verbs、设备专用 fast path 或驱动时，才需要直接处理这些细节。

### 8.5 Doorbell 与 BlueFlame

Doorbell 可以理解为 CPU 对 RNIC 说：“SQ 已推进到新的位置。”驱动在创建资源时只把受控的 UAR/MMIO 区域映射给进程，应用并不能任意访问整张网卡。

普通硬件路径可能是：

```text
CPU writes WQE to host SQ
CPU rings MMIO Doorbell
RNIC DMA-reads WQE
```

mlx5 等实现还可能用 BlueFlame，把 WQE 或其关键部分通过 MMIO posted write 推向设备，减少 RNIC 发起 PCIe Read 的延迟。BlueFlame 是具体硬件/provider 的优化，不是 RDMA WRITE 的通用语义；在 RXE 上也不存在同样的物理硬件路径。

### 8.6 本地 `lkey` 校验与地址翻译

RNIC 读取 WQE 后，概念上检查：

```text
lkey exists
    ↓
MR and QP belong to a compatible PD
    ↓
[local_addr, local_addr + length) is inside MR
    ↓
operation is permitted
```

失败通常形成 local protection 或 local length error。成功后，设备通过 MR/MKey 上下文、页转换缓存和可选 IOMMU 映射，把应用地址转换为可用于 DMA 的地址。

### 8.7 DMA 读取 payload 与 Inline

非 Inline WRITE 需要 RNIC 从本地内存 DMA-read payload。应用必须保持源 buffer 有效且不修改，直到相应 completion 证明可以复用。

小消息可使用 `IBV_SEND_INLINE`，把 payload 复制进 WQE。提交成功后原始应用 buffer 通常即可复用，因为设备不再需要从它 DMA-read；代价是 WQE 更大、SQ 空间消耗增加，且 inline 长度受设备与 QP capability 限制。

Inline 减少的是本地 payload DMA Read，不是让远端 DMA 或网络传输消失。

### 8.8 分片与 RC transport

若 `len` 大于 Path MTU，RNIC 会拆分为多个 RDMA transport packet，并分配连续 PSN。以 RoCE v2 为例，逻辑封装是：

```text
Ethernet
└── IP
    └── UDP
        └── InfiniBand transport headers
            └── RDMA payload
```

UDP/IP 提供可路由封装；可靠性不是由 UDP 提供，而是由 RC transport 的 PSN、ACK/NAK、timeout、retry、ordering 和重复包处理实现。

## 9. Responder：从 QPN 到远端内存

### 9.1 用 QPN 找到目标 QP

Responder RNIC 从包头取得 Destination QPN，查询 QP context，并验证：

- QP 是否存在并处于允许接收该操作的状态。
- 数据包是否符合配置的路径和 transport。
- PSN 是否与当前 RC 状态一致。
- opcode 是否对该 QP 合法。

旧 PSN 可能是重复或重传；跳过期望 PSN 通常表示中间包丢失，Responder 可返回 NAK 触发恢复。

### 9.2 用 `rkey` 验证远端能力

这是 WRITE 与 SEND 的分水岭。SEND 从 RQ 取 Receive WQE 决定落点；WRITE 使用包中携带的远端地址和 `rkey`。

概念检查顺序是：

```text
rkey refers to a live MR/MW
    ↓
memory object is compatible with QP's PD
    ↓
REMOTE_WRITE permission is enabled
    ↓
[remote_addr, remote_addr + length) is within bounds
```

任何一步失败，都不能执行目标 DMA。Requester 最终可能收到 remote access error 等失败 CQE。

`rkey` 不只是一个裸数组下标；它将对象定位、权限与生命周期关联起来。MR 注销、Memory Window 重新绑定或 key 失效后，旧 capability 不应继续有效。

### 9.3 DMA 写入远端内存

验证通过后，Responder RNIC 按 packet offset 把 payload DMA-write 到目标页：

```text
remote_addr + 0       ← packet 0 payload
remote_addr + MTU     ← packet 1 payload
remote_addr + 2*MTU   ← packet 2 payload
```

普通 WRITE 的远端 CPU 不需要执行 `recv()`、处理中断、选择接收 buffer 或做一次 payload `memcpy()`。它甚至可能不知道这次写入刚刚发生。

### 9.4 ACK 关闭 transport 循环

Responder 正确处理 packet 后返回 RC ACK。ACK 可按协议累积，不要求每个 packet 都单独确认。丢包、NAK 或 timeout 触发的重传由 QP/RNIC transport 状态机处理。

Requester 收到成功确认后推进 SQ 和 PSN 状态；若 WR 被配置为 signaled，RNIC 再把 CQE DMA-write 到主机内存，供 CPU 轮询。

## 10. 三种“完成”绝不能混淆

### 10.1 Post 完成

```c
ibv_post_send(qp, &wr, &bad_wr) == 0
```

这只表示 WR 被成功接受并提交到发送队列。设备可能还没有读取源 buffer，更没有完成网络操作。

### 10.2 Transport Completion

Requester 轮询到：

```c
wc.status == IBV_WC_SUCCESS
wc.opcode == IBV_WC_RDMA_WRITE
```

对 RC WRITE，这表示该 Verbs 工作请求已成功完成，没有报告本地保护、远端访问或重试耗尽等错误；非 Inline 源 buffer 可以安全复用。

它不表示远端 CPU 已运行任何代码，也不自动表示数据已持久化到 SSD、NVDIMM，或分布式副本已形成 quorum。

### 10.3 Application Completion

业务完成需要远端软件观察通知、验证数据、更新状态，并按协议返回确认。例如：

```text
WRITE log bytes
    ↓ transport completion
remote log service validates and persists
    ↓ application ACK
transaction layer considers the operation complete
```

把 transport completion 当成业务提交成功，是 RDMA 系统设计中非常危险的错误。

## 11. 普通 WRITE 如何通知远端软件

### 11.1 轮询内存协议

Requester 写数据和状态字段，Responder CPU 轮询状态。实现必须明确处理消息边界、所有权、编译器优化、CPU 内存模型、DMA/CPU 可见性和平台一致性，不能把它简化成一个无约束的普通 C 变量。

### 11.2 WRITE WITH IMMEDIATE

`IBV_WR_RDMA_WRITE_WITH_IMM` 把两件事组合起来：

- payload 仍直接写入 `remote_addr + rkey`。
- 32-bit immediate data 通过远端 receive completion 通知软件。

Responder 必须提前发布 Receive WR。这个 Receive 资源主要用于承载通知语义，不是普通 WRITE payload 的落点；完成项通常表现为 `IBV_WC_RECV_RDMA_WITH_IMM`，应用再读取 immediate data。

若 RQ 没有可用 Receive WR，RC Write With Immediate 可能遭遇 RNR，就像 SEND 一样需要接收资源。

### 11.3 WRITE 后 SEND

同一 RC QP 上先提交 WRITE data，再提交 SEND notification：

```text
WR1: RDMA WRITE data
WR2: SEND notification
```

Responder 为 SEND 准备 Receive WR，在收到 Receive CQE 后处理已经写入的区域。这种方式多一个操作，但通知内容和接收协议更灵活。

无论使用哪种方法，都要把 RC 操作顺序、设备写入顺序、远端 CPU 可见性和持久化顺序区分开。复杂无锁协议通常还需要 slot ownership、generation/version、sequence lock、原子操作或平台规定的屏障。

## 12. 性能优化建立在哪些成本之上

一次 WRITE 延迟可以概念性拆成：

```text
T_total = T_post + T_doorbell + T_wqe_fetch + T_local_dma
        + T_packet + T_network + T_remote_validate
        + T_remote_dma + T_ack + T_cqe + T_poll
```

常见优化分别针对不同部分：

| 优化 | 主要减少 | 代价或限制 |
|---|---|---|
| Inline | 本地 payload DMA Read | CPU 复制进 WQE、WQE 变大、长度受限 |
| BlueFlame | 设备获取小 WQE 的 PCIe Read | 硬件/provider 专用，不是通用语义 |
| 批量 Posting | 每个 WQE 摊销的 Doorbell、barrier 和调用成本 | 批量过大会增加等待与尾延迟 |
| Unsignaled WR | CQE 写回与 CPU poll 压力 | 应用必须正确回收 SQ、跟踪 outstanding 和处理错误 |
| Busy polling | 中断、唤醒和调度延迟 | 持续消耗 CPU |

### 12.1 批量 Posting

`ibv_post_send()` 可以提交 WR 链。Provider 构造多个 WQE 后只推进一次 Doorbell，从而减少 MMIO transaction 与固定开销。

### 12.2 Unsignaled Completion

若每个 WR 都产生 CQE，高吞吐场景会增加 PCIe 写回、CQ 容量和 polling 压力。常见做法是大部分 WR unsignaled，每隔 N 个 WR 提交一个 signaled WR，并利用同一 SQ 的顺序语义回收此前工作。

这不是简单删掉 `IBV_SEND_SIGNALED`：QP 的 `sq_sig_all` 配置、SQ 空间、错误传播和 outstanding 生命周期都必须一起设计。配套 Ping-Pong 为了教学清晰，设置 `sq_sig_all = 1` 且每次 Send 都 signaled。

## 13. 错误如何沿 CQ 返回

`ibv_poll_cq()` 返回一个 entry 不代表成功，必须检查 `wc.status`。典型错误可分为：

| 层次 | 示例 | 常见根因 |
|---|---|---|
| 本地 WQE/内存 | Local Protection、Local Length | `lkey`、SGE、边界、格式或权限错误 |
| 远端访问 | Remote Access、Remote Operation | `rkey`、远端地址、REMOTE_WRITE、QP 状态或 opcode 错误 |
| RC transport | Retry Exceeded、RNR Retry Exceeded | 路径不通、对端未响应、接收资源不足 |
| QP 连锁错误 | `IBV_WC_WR_FLUSH_ERR` | QP 已进入错误状态，后续未完成 WR 被 flush |

严重错误往往不只影响一个请求。生产系统需要设计 QP 重建、outstanding 清理、上层重试、幂等语义和远端状态确认，不能只写：

```c
assert(wc.status == IBV_WC_SUCCESS);
```

## 14. RXE 与真实 RNIC：语义相同，执行位置不同

本文的 RXE loopback 路径大致是：

```text
libibverbs application
    ▼
RXE userspace/kernel components
    ▼
Linux RDMA core + rdma_rxe
    ▼
RoCE v2 packets through Linux IP routing and lo
```

RXE 用 CPU 和 Linux 网络栈执行 QP、MR、PSN、ACK、RNR、retry 等逻辑；真实 RNIC 把主要稳态工作放进硬件队列、地址转换单元、包处理管线和 DMA 引擎。

因此两者共享：

- Verbs 对象与 API 语义。
- RC QP 状态机和可靠传输规则。
- MR、key、权限、WR/CQE 生命周期。
- Send/Receive 与 Read/Write 的操作差异。

但 RXE 不能用来验证：

- 硬件 Doorbell、BlueFlame 或片上缓存的真实延迟。
- PCIe DMA bandwidth 和 NUMA 拓扑影响。
- RNIC firmware、硬件队列容量和厂商特定优化。
- 真实 RoCE 网络中的 PFC/ECN、交换机拥塞与链路行为。

## 15. 安全边界：可靠不等于安全

一次 WRITE 至少涉及四类检查：

1. **本地内存授权**：`lkey + PD + bounds + operation`。
2. **远端内存授权**：`QPN + rkey + remote address + access flags`。
3. **传输完整性与可靠性**：链路 FCS、RDMA ICRC、PSN、ACK/NAK、retry。
4. **身份、机密性与租户隔离**：需要经过认证的控制面，以及按威胁模型选择 VLAN/VRF/ACL、IPsec、MACsec 或应用层保护。

ICRC 用于发现传输损坏，不是 MAC 或数字签名；PSN 用于 transport sequencing，不是密码学 nonce；RC 的 reliable 也不提供用户身份认证。

控制面应避免泄露 `rkey/address`，只暴露最小内存范围和最小权限，并在操作结束后注销 MR、重新绑定 Memory Window 或采取其他失效策略。配套 Ping-Pong 不开放 remote access，正是当前演示所需的最小权限。

## 16. 常见故障与定位顺序

| 现象 | 常见原因 | 优先检查 |
|---|---|---|
| 没有 RDMA 设备 | RXE 未创建、驱动未加载、容器未暴露设备 | `rdma link show`、`ibv_devices`、`/dev/infiniband` |
| `ibv_query_gid` 失败 | GID index 越界或端口错误 | `ibv_devinfo -d DEVICE -i PORT -v` |
| INIT → RTR 报不可达 | GID、IP 路由、MTU 或地址向量错误 | GID 表、`ip addr`、`ip route get` |
| `ibv_reg_mr` 失败 | 设备权限、memlock、地址或长度问题 | `ulimit -l`、设备节点权限、errno |
| Send 遇到 RNR | 对端没有预发 Receive WR | RQ 容量与发布时序 |
| WRITE remote access error | `rkey`、地址范围、PD 或 REMOTE_WRITE 不匹配 | 目标 MR/QP 权限与控制面元数据 |
| local protection error | SGE、`lkey`、长度或源 buffer 生命周期错误 | WQE 与 MR 边界 |
| retry exceeded | 对端 QP/路径不可达、参数或网络错误 | QPN/PSN/GID、MTU、防火墙、抓包 |
| CQ polling 超时 | WR 未完成、CQ 关联错误或 completion 未请求 | 两端日志、QP 状态、send flags |
| CPU 占用高 | busy polling | 教学示例的预期行为；生产环境评估 event/hybrid polling |

建议按以下顺序定位：

```text
device → port → GID/IP route → QP state/parameters
       → MR/key/permissions → WR submission → CQE status
```

RXE 场景还可配合：

```bash
rdma resource show
ip addr show lo
ip route get 127.0.0.1
sudo tcpdump -ni lo udp port 4791
```

抓包能证明 RoCE v2 packet 是否出现，却不能替代 CQE 状态、QP context 和 MR 权限检查。

## 17. 用一句硬件语言总结

一次 RC RDMA WRITE，本质上是：

> CPU 在主机内存中生成一条 DMA/网络复合命令，通过受控队列和 Doorbell 提交给 RNIC；Requester RNIC 验证本地能力并读取 payload，把数据封装为可靠 RC 报文；Responder RNIC 验证 QP 与远端内存 capability，将数据 DMA 到目标页并返回 ACK；Requester RNIC 最终把完成状态写入 CQ。

压缩成一条路径：

```text
WR → WQE → SQ → ordering → Doorbell
   → local lkey/PD/bounds → DMA Read
   → packetization → QPN/PSN/RC transport
   → remote rkey/PD/bounds → DMA Write
   → ACK → CQE → ibv_poll_cq()
```

普通网络的核心抽象是“把消息交给远端软件”；RDMA WRITE 的核心抽象是“让本地 RNIC 修改远端预先授权的内存”。高性能来自这次抽象转移，编程复杂度也来自同一个地方：Socket 隐藏的 buffer 管理、通知、同步、完成语义和错误恢复，需要由 RDMA 应用重新组合成自己的协议。

## 参考资料

- [rdma-core：RDMA Core Userspace Libraries and Daemons](https://github.com/linux-rdma/rdma-core)
- [rdma-core：Introduction to Libibverbs](https://github.com/linux-rdma/rdma-core/blob/master/Documentation/libibverbs.md)
- [rdma-core：Configure Soft-RoCE (RXE)](https://github.com/linux-rdma/rdma-core/blob/master/Documentation/rxe.md)
- [rdma-core：`ibv_post_send(3)`](https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_post_send.3)
- [rdma-core：mlx5 provider](https://github.com/linux-rdma/rdma-core/tree/master/providers/mlx5)
- [Linux Kernel：Dynamic DMA Mapping Guide](https://www.kernel.org/doc/html/latest/core-api/dma-api-howto.html)
- [NVIDIA：RDMA Aware Networks Programming User Manual](https://docs.nvidia.com/rdma-aware-networks-programming-user-manual-1-7.pdf)
- [NVIDIA：InfiniBand Security Overview and Guidelines](https://networking-docs.nvidia.com/nvidiainfinibandsecurityoverviewandguidelines/security-in-infiniband)
- [RFC 5042：DDP/RDMAP Security](https://www.rfc-editor.org/rfc/rfc5042.html)
- [`rdma-link(8)`：管理 RDMA links](https://man7.org/linux/man-pages/man8/rdma-link.8.html)
