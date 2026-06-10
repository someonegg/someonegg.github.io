# Linux 内存管理与 VM 调优

这是一份面向日常排障和生产调优的 Linux 内存管理笔记，重点放在 VM 行为、缓存回收、writeback、THP、cgroup v2 和可观测指标之间的关系。现代系统里，内存问题通常不是“用了多少内存”这么简单，而是要看这些内存是否可回收、回收代价有多高、是否已经影响到业务线程。

内存调优的基本立场是：先确认压力来自哪里，再改参数。很多“调优参数”只是在不同代价之间移动压力：吞吐、尾延迟、cache 命中、直接回收、swap、OOM 风险和数据写回延迟之间没有免费的选择。

## VM 在解决什么问题

Linux VM（Virtual Memory Manager）负责几类事情：

- 给内核和用户态程序分配物理内存。
- 为进程提供虚拟地址空间。
- 在内存紧张时回收可回收内存，或把匿名页换出到 swap。
- 用 page cache、buffer cache、VFS cache 等缓存减少 I/O 成本。

理解 VM 调优时，最重要的不是“空闲内存越多越好”，而是理解 Linux 会把暂时不用的内存用于缓存。`free` 里看到的 `buff/cache` 并不是浪费，它通常是在帮你降低后续 I/O 延迟。真正需要关心的是：当业务需要内存时，这些缓存能否及时、低成本地被回收。

## 内存类型

### Anonymous memory

匿名内存主要来自进程 heap、stack、匿名 `mmap` 等，不直接对应某个文件。匿名页如果没有被 `mlock()` 等方式固定住，理论上可以回收；但回收前通常需要先写入 swap，否则内核没有地方保存其内容。

这也是匿名内存和 clean page cache 的核心差异：

- clean page cache 可以直接丢弃，因为数据仍在文件系统或块设备中。
- anonymous memory 不能直接丢弃，除非进程释放它，或者先换出到 swap。

通用 Linux 语义上，swap 可以给匿名页回收提供退路；但在线服务和数据库这类延迟敏感 workload 中，默认要求关闭 swap。原因不是 swap 在机制上没有价值，而是这些服务更怕业务热页被换出后造成不可控的长尾延迟。内存不够时，应优先通过容量规划、cgroup 限制、降低并发、拆分实例或扩容处理，而不是依赖 swap 承接压力。

### Page cache

Page cache 是文件内容缓存。读文件时，数据会被缓存到内存；再次读取相同内容时，如果缓存仍有效，就不需要访问磁盘或网络文件系统。

写文件时，数据通常先进入 page cache 并标记为 dirty，然后由内核后台写回。dirty page 不能像 clean page 一样直接释放，必须先写回底层存储或文件系统。

需要注意两个常见误区：

- `buff/cache` 高不是问题本身，cache 不能被及时回收才是问题。
- 手动 `drop_caches` 不应作为常规运维动作。官方文档明确提醒，`drop_caches` 主要用于测试和调试；频繁丢缓存会增加后续 I/O 和 CPU 成本。

### Buffer cache 与 VFS cache

Buffer cache 可视为块设备相关的缓存，常用于文件系统元数据访问。VFS cache 主要包括：

- inode cache：缓存文件元数据，例如大小、权限、所有者、数据位置等。
- dentry cache：缓存路径名到 inode 的映射，目录遍历和按路径打开文件时很关键。

大量小文件、频繁目录遍历、包管理器、构建系统、日志采集、容器镜像层扫描等 workload 往往依赖 dentry/inode cache。过度回收这些缓存，可能导致 CPU 和 I/O 都上升。

## 内存回收的基本路径

当可用内存下降到水位线附近，内核会尝试回收内存。粗略分为两类：

- 后台回收：`kswapd` 被唤醒，提前回收内存，让业务线程尽量不被阻塞。
- 直接回收：业务线程自己在分配内存路径上被迫回收，通常意味着更明显的延迟抖动。

排障时要特别关注 direct reclaim。`/proc/vmstat` 中的 `allocstall`、`pgscan_direct_*`、`pgsteal_direct_*` 持续增长，通常比单纯看到 `kswapd` 活跃更值得警惕。

一个实用判断：

- 轻微 `kswapd` 活动：通常只是内核在维护水位。
- direct reclaim 明显增长：业务线程已经在内存分配路径上付出代价。
- direct reclaim、swap in/out、PSI memory pressure 同时升高：系统可能已经进入内存抖动或 thrashing。

## 关键参数

### `vm.swappiness`

当前内核文档中，`vm.swappiness` 的取值范围是 `0-200`。它表达的是 swap I/O 与 filesystem paging I/O 的粗略相对成本：

- `100`：认为 swap I/O 与文件系统分页 I/O 成本相当。
- 小于 `100`：认为 swap 更贵，更倾向保留匿名页、回收 page cache。
- 大于 `100`：认为 swap 更便宜，更可能换出匿名页，适合 zram、zswap 或 swap 介质明显快于文件系统 I/O 的场景。
- 默认值通常是 `60`。

在线上基线中，在线服务和数据库默认关闭 swap；如果某些环境无法完全关闭，也应把 `swappiness` 调低，并通过监控确保没有业务热页被换出。这里的核心目标是控制长尾延迟，而不是追求内存利用率最大化。

查看与临时调整：

```bash
cat /proc/sys/vm/swappiness
sysctl -w vm.swappiness=1
swapon --show
```

关闭 swap 前要先确认当前内存余量，避免把已经换出的匿名页一次性拉回内存后触发 OOM：

```bash
free -h
swapon --show
swapoff -a
```

持久化关闭 swap 还需要检查 `/etc/fstab`、云厂商初始化脚本和基础镜像配置，避免重启后 swap 被重新启用。

### `vm.vfs_cache_pressure`

`vm.vfs_cache_pressure` 控制内核回收 dentry/inode cache 的倾向。当前文档还引入了配套的 `vm.vfs_cache_pressure_denom`，默认分母通常是 `100`。

经验含义：

- 低于默认值：更倾向保留 dentry/inode cache。
- 高于默认值：更积极回收 dentry/inode cache。
- `0` 风险很高，可能导致内存压力下也不回收 dentry/inode，进而触发 OOM。
- 过高也可能有负面影响，因为扫描和回收这些对象需要锁和 CPU。

适合观察的命令：

```bash
slabtop
grep -E 'SReclaimable|SUnreclaim|KReclaimable|Slab' /proc/meminfo
cat /proc/sys/vm/vfs_cache_pressure
```

如果 `dentry`、`*_inode_cache` 占用异常高，并且 page cache 或匿名内存受到明显挤压，可以实验性提高该值；但小文件密集型业务提高后可能变慢，需要压测验证。

### `vm.min_free_kbytes`

`vm.min_free_kbytes` 控制系统保留多少空闲内存给特殊分配路径使用，例如不能等待回收的原子分配。一般不建议降低它。

如果日志里频繁出现 `page allocation failure`，并且确认不是驱动或内核 bug，可以考虑小幅提高。但这不是常规“优化吞吐”的旋钮，调大后等于减少了可用于业务和缓存的内存。

```bash
cat /proc/sys/vm/min_free_kbytes
dmesg -T | grep -i 'page allocation failure'
```

### `vm.watermark_scale_factor`

Linux 内存管理有 high、low、min 等水位。`kswapd` 通常在低水位附近被唤醒，在恢复到高水位后休眠。`vm.watermark_scale_factor` 控制水位之间的距离，也就是 `kswapd` 维护空闲页余量的积极程度。

当前官方文档说明该值单位是万分比，默认 `10` 表示水位间距约为可用内存的 `0.1%`，最大值为 `3000`，即 `30%`。

适用场景：

- 业务有突发分配，频繁进入 direct reclaim。
- `/proc/vmstat` 中 `allocstall` 增长明显。
- `kswapd_low_wmark_hit_quickly` 增长，说明 `kswapd` 可能过早睡眠。

这类参数影响全局内存行为，不建议没有指标就调。

### Dirty page writeback

文件写入通常先进入 page cache，变成 dirty page，再由后台 flusher 线程写回。相关参数有两组：

- `vm.dirty_background_ratio` / `vm.dirty_background_bytes`：达到后启动后台写回。
- `vm.dirty_ratio` / `vm.dirty_bytes`：达到后写入进程会被迫参与写回或被节流。
- `vm.dirty_expire_centisecs`：dirty 数据多久后有资格被写回。
- `vm.dirty_writeback_centisecs`：后台写回线程周期。

`ratio` 和 `bytes` 是互斥的：设置其中一个，另一个读出来会是 `0`。在大内存机器上，百分比可能对应非常大的脏页量，导致同步点、fsync、回收或故障恢复时出现长尾延迟。因此生产环境更常见的做法是用 `dirty_bytes` 和 `dirty_background_bytes` 设定绝对上限。

典型取舍：

- 提高 dirty 阈值：可能提升顺序写吞吐，允许内核合并更多写入。
- 降低 dirty 阈值：通常降低写回尖峰和同步点延迟，但可能牺牲吞吐。

查看：

```bash
sysctl vm.dirty_background_ratio vm.dirty_ratio
sysctl vm.dirty_background_bytes vm.dirty_bytes
sysctl vm.dirty_expire_centisecs vm.dirty_writeback_centisecs
grep -E 'Dirty|Writeback' /proc/meminfo
```

### Readahead

块设备预读参数位于：

```bash
cat /sys/block/<device>/queue/read_ahead_kb
```

顺序读 workload 可能受益于更大的 readahead；随机读、并发读、内存紧张场景下，过大的 readahead 可能制造无用 I/O，并占用 page cache。调这个参数时，要结合 `iostat -x`、业务延迟和 cache 命中效果一起看。

## Transparent Huge Pages

Transparent Huge Pages（THP）通过更大的页减少页表层级和 TLB miss。官方 memory concepts 文档指出，大页可以降低 TLB 压力，提升大工作集程序的性能。

但 THP 不是无条件收益：

- 连续、大块、长期驻留的内存访问更可能受益。
- 稀疏访问可能浪费内存，例如只触碰很少字节却分配了大页。
- 内存碎片严重时，THP 分配和 compaction 可能带来延迟尖峰。
- 延迟敏感服务需要特别关注 THP fault、collapse、compact stall。

当前 THP 文档已经不只是旧式的 `always/madvise/never`。现代内核支持按 hugepage size 配置，例如：

```bash
cat /sys/kernel/mm/transparent_hugepage/enabled
find /sys/kernel/mm/transparent_hugepage -maxdepth 2 -name enabled -print -exec cat {} \;
```

线上基线：

- 在线服务：默认关闭 THP。多数在线业务更关注尾延迟稳定性，通常不能稳定利用透明大页收益，反而要承担 THP fault、collapse、compaction 带来的抖动风险。
- 数据库：默认关闭 THP。数据库的缓存、页管理和访问模式通常由自身或存储引擎主导，透明大页更容易把收益换成内存浪费或延迟抖动。
- 明确受益的大内存计算、虚拟化或专门调优过的 workload：可以单独评估保留 THP，但需要用压测和线上指标证明收益。

关闭示例：

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

持久化通常放在启动脚本、systemd unit、内核启动参数或基础镜像初始化逻辑中，具体方式取决于发行版和机器初始化体系。

进程级也可以通过 `madvise(MADV_HUGEPAGE)`、`madvise(MADV_NOHUGEPAGE)` 或 `prctl(PR_SET_THP_DISABLE, ...)` 控制。现代应用如果清楚自己的内存访问模式，最好在应用侧表达意图，而不是只靠全局 sysfs。

相关观察：

```bash
grep -E 'thp|compact|allocstall' /proc/vmstat
grep -i huge /proc/meminfo
cat /sys/kernel/mm/transparent_hugepage/defrag
```

## cgroup v2 下的内存控制

现代生产系统通常不建议为了减少少量 accounting 开销而关闭 memory controller。容器、systemd slice、Kubernetes、批处理隔离、资源保护和 PSI 监控都依赖 cgroup 体系；关闭 memory controller 往往会让后续隔离、限流和定位问题更困难。

cgroup v2 的 memory controller 跟踪的不只是用户态匿名内存，也包括 page cache、dentry/inode 等内核数据结构和 TCP socket buffer。核心接口包括：

| 文件 | 含义 |
| --- | --- |
| `memory.current` | 当前 cgroup 及子树使用的内存 |
| `memory.min` | 硬保护，保护范围内通常不被回收，过度配置可能导致 OOM |
| `memory.low` | best-effort 保护，适合表达“尽量保留” |
| `memory.high` | 节流阈值，超过后进程承受强回收压力，但不会直接 OOM |
| `memory.max` | 硬上限，无法回收时触发 cgroup 内 OOM |
| `memory.reclaim` | 主动触发目标 cgroup 回收 |
| `memory.pressure` | cgroup 级 PSI |

更实用的生产建议：

- 用 `memory.low` 保护关键服务的工作集。
- 用 `memory.high` 给可降级 workload 施加回收压力，避免直接走到 OOM。
- 用 `memory.max` 做最后边界，而不是作为日常节流手段。
- 结合 `memory.events`、`memory.pressure`、应用延迟一起判断是否过度限制。

## 监控与排障路径

### 一次性快照

```bash
free -h
cat /proc/meminfo
vmstat 1
sar -B 1
slabtop
```

重点看：

- `MemAvailable` 是否持续下降。
- `Dirty`、`Writeback` 是否堆积。
- `SwapCached`、`pswpin`、`pswpout` 是否增长。
- `SReclaimable` 与 `SUnreclaim` 是否异常。
- `vmstat` 的 `si/so`、`r/b`、`wa` 是否异常。

### `/proc/vmstat`

建议按增量看，而不是只看累计值：

```bash
watch -n 1 'grep -E "allocstall|pgscan|pgsteal|pswp|pgpg|compact|thp" /proc/vmstat'
```

常用解释：

- `pgscan_kswapd_*` / `pgsteal_kswapd_*`：后台回收扫描和成功回收。
- `pgscan_direct_*` / `pgsteal_direct_*`：业务线程直接回收，延迟风险更高。
- `allocstall`：分配路径上发生 stall。
- `pswpin` / `pswpout`：swap in/out。
- `compact_stall`、`compact_fail`、`compact_success`：内存整理相关。
- `thp_fault_alloc`、`thp_fault_fallback`、`thp_collapse_alloc*`：THP 分配和 fallback。

如果扫描很多但 `steal` 很少，说明回收效率低，系统可能在扫描不可回收或价值很低的页。

### PSI

PSI（Pressure Stall Information）比“内存使用率”更接近用户实际体验。它衡量 CPU、memory、I/O 资源竞争造成的 stall 时间。

```bash
cat /proc/pressure/memory
cat /proc/pressure/io
cat /proc/pressure/cpu
```

`some` 表示至少有部分任务被某类资源阻塞；`full` 表示所有非 idle 任务都同时被阻塞。内存问题中，如果 `memory full` 明显升高，通常说明 workload 已经出现整体性停顿。

cgroup v2 下还可以看单个服务：

```bash
cat /sys/fs/cgroup/<path>/memory.pressure
cat /sys/fs/cgroup/<path>/memory.events
```

## 调优原则

### 先分清压力类型

不要只看“内存用了多少”。先回答：

1. 是匿名内存增长，还是 page cache / slab 增长？
2. 是 clean cache 可回收，还是 dirty/writeback 堆积？
3. 是全局内存压力，还是某个 cgroup 被限制？
4. 是后台回收可控，还是业务线程进入 direct reclaim？
5. swap 是否已经关闭；如果已关闭，当前内存容量、cgroup 限制和 OOM 策略是否足以承接峰值？

### 小步实验

每次只改一个参数，并记录：

- 修改前后的 sysctl 值。
- workload 峰值、平均值和尾延迟。
- `/proc/vmstat` 增量。
- PSI。
- OOM、direct reclaim、swap、writeback 指标。

如果某些环境无法完全关闭 swap，建议先临时降低换出倾向：

```bash
sysctl -w vm.swappiness=1
```

确认收益后再写入 `/etc/sysctl.d/*.conf`。

### 基线和例外要分开

调优文档容易把所有场景写成“视情况而定”，这在生产环境里反而不可执行。更合理的方式是：先定义线上基线，再为少数例外保留验证路径。

- 对在线服务和数据库，基线是关闭 swap、关闭 THP。
- 如果某类 workload 明确依赖大页收益，必须用压测和线上指标证明 THP 带来的吞吐收益大于尾延迟风险。
- 如果某类环境需要 zram/zswap 作为缓冲，也要把它作为单独方案评估，不能混入在线服务和数据库基线。
- 如果写入吞吐不足且延迟预算充足，可以提高 dirty 阈值。
- 如果 fsync、回收或故障恢复长尾不可接受，应降低 dirty 绝对上限。

## 常见场景

### `buff/cache` 很高

先看 `MemAvailable`。如果 `MemAvailable` 健康，通常不是问题。如果业务同时出现延迟抖动，再看：

```bash
grep -E 'MemAvailable|Cached|Dirty|Writeback|SReclaimable|SUnreclaim' /proc/meminfo
cat /proc/pressure/memory
```

不要第一反应就是 `echo 3 > /proc/sys/vm/drop_caches`。它可能让下一轮访问更慢。

### swap 有增长

在线服务和数据库的基线是关闭 swap，所以看到 swap 仍在使用，首先要判断这是基线漂移，还是某个例外环境有意保留了 swap。先看：

```bash
vmstat 1
grep -E 'pswpin|pswpout' /proc/vmstat
cat /proc/pressure/memory
```

如果不是例外环境，处理方向应是关闭 swap 并修正持久化配置。如果是例外环境，少量冷页换出不一定有害；持续 `pswpin/pswpout` 增长并伴随 PSI memory 升高，才更像会影响业务的内存抖动。

### direct reclaim 明显

```bash
grep -E 'allocstall|pgscan_direct|pgsteal_direct|kswapd_low_wmark_hit_quickly' /proc/vmstat
```

可能方向：

- 降低业务内存峰值或并发。
- 检查 cgroup 限制是否过紧。
- 增加内存、降低并发或拆分实例；在线服务和数据库基线不以开启 swap 作为常规缓冲。
- 谨慎评估 `watermark_scale_factor`。
- 检查 dirty/writeback 是否拖慢回收。

### slab 占用异常

```bash
slabtop
grep -E 'Slab|SReclaimable|SUnreclaim|KReclaimable' /proc/meminfo
```

如果主要是 `SReclaimable`，常见是 dentry/inode 等缓存；如果是 `SUnreclaim` 异常增长，要考虑内核对象泄漏、驱动问题、网络 buffer 或特定内核子系统占用。

## 参考资料

- Linux kernel documentation: Documentation for `/proc/sys/vm/`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel documentation: Concepts overview: https://docs.kernel.org/admin-guide/mm/concepts.html
- Linux kernel documentation: Transparent Hugepage Support: https://docs.kernel.org/admin-guide/mm/transhuge.html
- Linux kernel documentation: Control Group v2: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux kernel documentation: PSI - Pressure Stall Information: https://docs.kernel.org/accounting/psi.html
