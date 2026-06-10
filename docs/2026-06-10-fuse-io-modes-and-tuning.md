# FUSE I/O 模式与调优笔记

FUSE 的性能不只取决于 userspace 文件系统自身，也受内核页缓存、脏页回写、readahead、background queue 和 direct I/O 分发策略影响。排查 FUSE I/O 问题时，需要先明确当前文件打开方式、缓存模式、请求类型，以及是否触发了内核侧限流。

参考资料：

- <https://www.kernel.org/doc/html/latest/filesystems/fuse.html#control-filesystem>

## I/O 模式

FUSE 主要支持三类 I/O 行为：

- `direct-io`
- `cached` + `write-through`
- `cached` + `writeback-cache`

### direct-io

`direct-io` 可通过 `FOPEN_DIRECT_IO` 在 `FUSE_OPEN` 回复中启用。

该模式下：

- 读写绕过 page cache。
- 不进行 readahead。
- 禁用 shared mmap。

它的好处是路径直接、语义清晰，适合不希望依赖内核页缓存的场景。代价是小 I/O 容易放大请求数量，每次写入通常都会被推送到 userspace 后端，后端延迟会直接体现在调用方延迟上。

### cached

`cached` 模式下：

- 读请求可以由 page cache 满足。
- 内核可以通过 readahead 预取数据并填充缓存。
- 文件写入后，内核会维护缓存一致性。
- 支持所有 mmap 模式。

`cached` 又分为 `write-through` 和 `writeback-cache` 两种写入子模式。

## 写入模式

### write-through

`write-through` 是默认模式，所有内核版本都支持。

行为特征：

- 每次 write 都会立即转成一个或多个 `WRITE` 请求发送到 userspace。
- 写入同时会更新已有缓存页。
- 对此前未缓存、但被完整覆盖写入的页面，内核也可能将其缓存。
- 写路径不会为了补齐页面而发送 `READ` 请求。
- 如果对未缓存页面做部分写入，该页面会被丢弃，避免缓存中保留不完整数据。

这个模式语义直接，但对小写入不友好。大量小写会形成大量 userspace 往返和后端写请求。

### writeback-cache

`writeback-cache` 可通过 `FUSE_WRITEBACK_CACHE` 在 `FUSE_INIT` 回复中启用。

行为特征：

- 写入先进入 page cache，`write(2)` 往往可以较快返回。
- 脏页由内核在后台回写，或在内存压力、`close(2)`、`fsync(2)`、`munmap(2)` 释放最后引用时显式触发回写。
- 该模式假设所有文件系统变更都经过 FUSE kernel module，内核会维护 size、atime、ctime、mtime 等属性。
- 因此它通常不适合网络文件系统，除非能确保外部变更不会绕过 FUSE 或有额外一致性机制。
- 部分页写入前可能需要先从 userspace 读出原页面内容。因此即使文件以 `O_WRONLY` 打开，内核也可能生成 `READ` 请求。

理论上，`writeback-cache` 可以把顺序小写聚合成更大的 `WRITE` 请求，降低 userspace 往返和后端写放大。

实际使用时要注意：它并不保证所有小写都能获得明显收益。写入可能触发内核 `balance_dirty_pages` 流程，导致本应快速返回的 `write(2)` 被脏页限流阻塞。这个问题在小写入场景中尤其明显。

经验判断：

- FUSE 的 writeback cache 主要擅长合并顺序写。
- 非顺序小写、随机写、回写压力较高时，收益可能有限。
- 回写请求由内核 flusher 算法约束，不直接受 `max_background` 控制。

## 最大写入大小

FUSE 的单个写请求大小存在内核侧限制。

常见约束：

- `big_write` 默认使用 `128K`。
- 这个大小受 FUSE driver 中的硬限制影响。
- 普通文件系统实现无法仅通过 userspace 配置绕过该限制。
- 如果要突破，需要修改内核驱动或使用支持更大限制的内核实现。

因此，调优时不能只看应用层 buffer 大小。即使上层提交了更大的 I/O，FUSE 层也可能拆成多个较小请求。

## background 请求

`max_background` 表示 pending background requests 的最大数量。

截至 Linux 4.8，主要有两类请求属于 background request：

1. Read-ahead 请求。
2. Asynchronous direct I/O 请求。

### Read-ahead

当 `max_readahead` 非零时，内核可能提前读取后续数据以填充缓存。

典型条件：

- `max_readahead` 大于一个 page。
- `FUSE_CAP_ASYNC_READ` 已启用，通常默认启用。
- 顺序读、大块读等非单页读场景。

### Asynchronous direct I/O

当启用 `FUSE_CAP_ASYNC_DIO`，且 userspace 提交较大的 direct I/O 请求时，内核可能把它拆成多个较小请求并并发提交到文件系统。

典型条件：

- 应用提交大 direct I/O。
- `FUSE_CAP_ASYNC_DIO` 已启用，通常默认启用。

### 不属于 background 的请求

以下请求不属于 `max_background` 控制范围：

- writeback requests，由内核 flusher 算法限制。
- 普通同步 buffered read/write，通常每个线程最多一个。
- 异步 read 请求，因为 Linux `io_submit(2)` 实际上可能阻塞，也通常表现为每个线程最多一个。

## 前台请求与后台请求

可以用下面的方式粗略区分：

后台请求：

- read-ahead
- asynchronous direct I/O
- release

前台请求：

- 单页读
- 普通同步写
- 其他非 background 类型请求

前台请求通常由调用线程驱动，FUSE 层不会像 background queue 一样统一做并发数量控制，因此并发度更多取决于应用线程模型和调用路径。

## background 流量控制

FUSE background queue 有两个关键阈值：

- `congestion_threshold`
- `max_background`

### congestion_threshold

当正在处理的 background 请求数达到 `congestion_threshold` 后，FUSE 会通知 Linux VFS 当前后端拥塞。随后 VFS 可能 throttle 用户进程。

默认值通常约为：

```text
congestion_threshold = 0.75 * max_background
```

影响：

- read-ahead 等 background 请求可能被延迟。
- 调用方可能间接受到 VFS 限流影响。
- 调高 `max_background` 时，也应关注 `congestion_threshold` 是否需要同步调整。

### max_background

当 pending background 请求达到 `max_background` 后，新的异步 background 请求会被暂停，直到队列恢复。

常见建议：

- 默认值通常为 `12`。
- 对高并发或大量文件访问场景，可尝试调到 `36`。
- 调大后需要观察 userspace 文件系统处理能力、后端存储延迟和内存压力，避免只是把排队位置从内核前移到后端。

## readahead 调优

`max_readahead` 决定 FUSE readahead 的最大规模。

常见限制：

- FUSE 默认最大约 `128K`，受 `VM_READAHEAD_PAGES` 约束。
- 代码层面通常无法直接越过该限制。
- 可以通过 `/sys/class/bdi/<st_dev>/read_ahead_kb` 提高块设备回读限制，但通常最高不超过 `1M`。

`<st_dev>` 可通过 `/proc/self/mountinfo` 或相关挂载信息定位。

调优建议：

- 顺序读、大块读：保留或适当增大 readahead。
- 随机小块 I/O：可以考虑禁用或降低 readahead，减少无效预读。
- 大量文件并发访问：如果 read-ahead 占用 background queue 导致有效并发下降，可以考虑禁用 `FUSE_CAP_ASYNC_READ`，让读请求转为前台请求，以提高并发利用率。

这个取舍需要结合访问模式判断。禁用 async read 或 readahead 可能改善随机访问和高并发元数据附近的表现，但会损害顺序读吞吐。

## 排查清单

排查 FUSE I/O 性能时，建议按下面顺序确认：

1. 文件是否以 `direct-io` 打开。
2. 是否启用了 `writeback-cache`。
3. 小写入是否真的被合并，还是仍然形成大量小 `WRITE`。
4. `write(2)` 延迟是否来自 userspace 后端，还是来自内核 `balance_dirty_pages`。
5. 当前瓶颈请求是否属于 background request。
6. `max_background` 和 `congestion_threshold` 是否过低。
7. read-ahead 是否占用了 background queue。
8. 访问模式是顺序大块 I/O，还是随机小块 I/O。
9. 后端存储是否能承受调高并发后的写入压力。

## 配置倾向

| 场景 | 倾向配置 | 风险 |
| --- | --- | --- |
| 顺序读 | 保留 readahead，适当提高 `read_ahead_kb` | 随机访问下可能浪费 I/O |
| 顺序小写 | 尝试 `writeback-cache` | 可能被 dirty page 限流影响 |
| 随机小块 I/O | 降低或禁用 readahead | 顺序读吞吐下降 |
| 大量文件并发读 | 评估禁用 `FUSE_CAP_ASYNC_READ` | 单线程顺序读可能变慢 |
| background queue 饱和 | 调高 `max_background` 和相关阈值 | 后端排队、内存压力上升 |

核心原则：先按请求类型定位瓶颈，再调对应的内核队列、缓存或 readahead 参数。不要把所有 FUSE 性能问题都归因于 userspace 后端。
