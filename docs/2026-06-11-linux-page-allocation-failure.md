# page allocation failure

它表示某次内核页分配请求没有被满足。失败原因可能是总可用内存不足，也可能是水位线保护、zone 限制、NUMA/cpuset 限制、GFP flag 限制，或者最常见的高阶连续页碎片问题。

这类日志要先按“这次请求要什么”来读，而不是直接跳到 OOM。

## 日志怎么读

示例：

```text
ipmitool: page allocation failure: order:4, mode:0x6040c0(GFP_KERNEL|__GFP_COMP), nodemask=(null)
Node 0 Normal free:263332kB min:65984kB low:129948kB high:193912kB ...
Node 0 Normal: 33174*4kB (UME) 2907*8kB (U) 6152*16kB (UE) 283*32kB (UE) 0*64kB 0*128kB ... = 263440kB
Free swap = 0kB
Total swap = 0kB
```

关键信息：

- `order:4`：请求 `2^4 = 16` 个连续 page。x86 常见 `PAGE_SIZE=4KB`，因此这次需要连续 `64KB`。
- `GFP_KERNEL`：普通内核上下文分配，可以睡眠，允许进入回收路径。
- `__GFP_COMP`：请求 compound page，常见于需要把多个连续页作为一个复合页管理的场景。
- `Node 0 Normal free:263332kB`：总 free 看起来不少。
- `Node 0 Normal ... 0*64kB`：Normal zone 里没有可直接满足 `order:4` 的连续空闲块。

所以这条日志的核心不是“还剩多少 KB”，而是“目标 zone 是否有满足 order 的连续 buddy block”。总 free 很多但都散在低阶块里，高阶分配仍然会失败。

## Buddy Order

Linux buddy allocator 按 order 管理连续页块：

```text
order 0 = 1 page   = 4KB
order 1 = 2 pages  = 8KB
order 2 = 4 pages  = 16KB
order 3 = 8 pages  = 32KB
order 4 = 16 pages = 64KB
```

日志里的：

```text
33174*4kB 2907*8kB 6152*16kB 283*32kB 0*64kB
```

表示该 zone 有大量低阶空闲块，但没有 `64KB` 连续空闲块。除非 compaction 能把可迁移页挪开并合并出连续空间，否则 `order:4` 会失败。

括号里的迁移类型通常包括：

- `U`：Unmovable，不可迁移，容易造成长期碎片。
- `M`：Movable，可迁移，compaction 的主要对象。
- `E`：Reclaimable，可回收对象，例如部分 slab。
- `H`：HighAtomic，为高优先级原子分配保留的 pageblock。
- `C`：CMA，连续内存分配区。

## Watermark 水位线

每个 zone 都有 `min/low/high` 水位线：

- `high`：空闲页高于这个水位时，内存压力通常较低，`kswapd` 可以休眠。
- `low`：低于这个水位时，`kswapd` 会被唤醒，后台回收开始更积极。
- `min`：保留水位，普通分配通常不能随意突破；特殊上下文或带特权的分配才可能使用更多保留页。

`vm.min_free_kbytes` 用来影响各 zone 的 `WMARK_MIN`。它不是单独给某个 zone 设置固定值，而是由内核按 zone managed pages 等因素分配到各 zone。

`vm.watermark_scale_factor` 控制 `min/low/high` 之间的间距，单位是万分之一。默认 `10` 代表水位间距约为可用内存的 `0.1%`；设置为 `100` 则约为 `1%`。这个参数影响 `kswapd` 提前回收的积极程度。直接回收频繁、`kswapd_low_wmark_hit_quickly` 增长时，可以考虑评估它，但不要脱离业务延迟和缓存命中率单独调大。

`vm.min_free_kbytes` 设置过低会增加高压场景死锁和分配失败风险；设置过高会把大量内存变成保留水位，可能让应用更早触发 OOM 或 reclaim。

## Lowmem Reserve

`vm.lowmem_reserve_ratio` 用于保护较低 zone，避免本可使用高 zone 的分配把 DMA/DMA32/Normal 等低 zone 消耗光。它的值不是直接作为保留页数使用，而是参与计算 `/proc/zoneinfo` 中的 `protection` 数组。

计算方向可以这样理解：

```text
zone[i]->protection[j] =
  sum(managed_pages of zone i+1 ... zone j) / lowmem_reserve_ratio[i]
```

值越小，保护越强；值越大，保护越弱。这个参数通常只在确实遇到低端 zone 被挤压、设备 DMA 受限、无 swap 且存在 mlock/pinned memory 风险时才需要调整。

## 失败流程

不同内核版本细节会变，以下描述适合用来理解 4.x 到 6.x 常见 page allocator slowpath，不应理解为每次失败都固定执行全部步骤。

### 1. Fast Path：先按 Watermark 尝试分配

`__alloc_pages()` 先走 fast path。内核按 zonelist、NUMA policy、cpuset、GFP 限制和目标 order 找可用 zone，然后调用类似 `get_page_from_freelist()` 的逻辑检查：

- zone 是否允许本次分配使用。
- 空闲页是否满足当前 watermark。
- 对 high-order 分配，低阶碎片页不能完整计入可满足请求的可用空间。
- buddy freelist 里是否能找到目标 order 或更高 order 的块。

如果找到更高 order 的块，buddy allocator 会拆分出所需块。否则进入 slowpath。

### 2. Slow Path 入口：约束调整与唤醒后台回收

进入 `__alloc_pages_slowpath()` 后，内核通常会先做准备动作：

- 重新计算 allocation context。
- 根据 GFP flag 判断是否允许 sleep、I/O、filesystem reclaim、compaction、OOM 等。
- 唤醒 `kswapd`，让后台回收异步尝试恢复水位。
- 如果启用 `zone_reclaim_mode` 且本地 node 需要优先回收，可能先做 node reclaim。

此时会再次尝试分配。因为 `kswapd` 或并发释放可能已经改变了内存状态，slowpath 并不一定会继续走到 direct reclaim。

### 3. 高阶分配：先尝试 Compaction

对 high-order allocation，单纯回收出一批零散 4KB 页不一定有用，关键是能否得到连续块。因此内核会根据 order、GFP、碎片指数、水位线和 compaction 条件，尝试 memory compaction。

compaction 的目标是迁移 movable page，把分散空闲页合并成更高 order 的连续块。它可能以异步方式开始，也可能在后续重试中进入更同步、更昂贵的 direct compaction。

如果 compaction 成功，内核会重试分配。成功则返回，不再继续 reclaim/OOM。

### 4. Direct Reclaim：由分配线程自己回收

如果允许直接回收，且前面的尝试没有成功，分配线程会进入 direct reclaim。它会扫描 LRU，尝试回收：

- clean page cache：可以直接释放。
- dirty file page：需要写回后才能释放，是否允许取决于 GFP 中的 I/O/FS 能力。
- anonymous page：通常需要 swap 才能回收；无 swap 时很难通过 reclaim 释放。
- reclaimable slab：例如部分 inode/dentry/slab cache。

direct reclaim 会造成业务线程在分配路径上阻塞。排障时要看 `/proc/vmstat` 里的 `allocstall`、`pgscan_direct_*`、`pgsteal_direct_*`，以及 PSI memory pressure。

### 5. Reclaim 与 Compaction 重试

slowpath 不是“回收一次失败就立刻 OOM”。内核会根据结果判断是否值得重试：

- reclaim 是否释放了足够页。
- compaction 是否取得进展，是否有希望形成目标 order。
- allocation 是否属于 costly high-order。
- 是否已经多次重试，继续重试是否只是浪费 CPU 或造成长时间 stall。
- GFP 是否允许更激进动作，例如 `__GFP_RETRY_MAYFAIL`、`__GFP_NORETRY`、`__GFP_NOFAIL` 等语义。

高阶分配失败时，内核可能在 reclaim 和 compaction 之间多次重试；也可能判断没有希望后直接失败并打印 `page allocation failure`。

### 6. OOM：只在符合条件时进入

OOM killer 不是所有 page allocation failure 的最终步骤。通常只有当内核认为系统或 memcg 处于真正的内存耗尽状态，并且本次分配允许 OOM，才会进入 OOM 处理。

高阶分配尤其要小心判断：

- `order:4` 这种分配可能因为连续页不足失败，而不是因为总内存耗尽。
- 高于 `PAGE_ALLOC_COSTLY_ORDER` 的分配通常不应该为了满足一次连续页请求而杀进程。
- 某些 GFP flag 明确禁止 OOM 或要求尽快失败。
- memcg OOM、cpuset/mempolicy 限制下的局部 OOM，与全局 OOM 是不同问题。

因此看到 `page allocation failure` 但没有 OOM，是合理现象。对示例日志来说，Normal zone 没有 `64KB` 连续块，更像碎片或高阶连续页不足，而不是全局 OOM。

## 诊断命令

先采集，不急着改参数：

```bash
uname -a
cat /proc/meminfo
cat /proc/vmstat
cat /proc/buddyinfo
cat /proc/pagetypeinfo
cat /proc/zoneinfo
cat /proc/sys/vm/min_free_kbytes
cat /proc/sys/vm/watermark_scale_factor
cat /proc/sys/vm/extfrag_threshold
cat /sys/kernel/mm/transparent_hugepage/enabled 2>/dev/null
cat /sys/kernel/mm/transparent_hugepage/defrag 2>/dev/null
grep -E 'compact|allocstall|pgscan|pgsteal|kswapd|oom|thp' /proc/vmstat
```

如果挂载了 debugfs，可以看碎片指标：

```bash
cat /sys/kernel/debug/extfrag/unusable_index
cat /sys/kernel/debug/extfrag/extfrag_index
```

`unusable_index` 范围是 `0-1`，表示某个 zone 中空闲内存对指定 order 有多少不可用：

- `0`：空闲内存基本都能满足该 order。
- `1`：空闲内存基本都不能满足该 order。

`extfrag_index` 常见范围是 `0-1000`，另有特殊值 `-1`：

- 趋近 `0`：失败更像总空闲内存不足。
- 趋近 `1000`：失败更像外部碎片。
- `-1`：只要 watermarks 满足，分配预计不会失败。

`vm.extfrag_threshold` 默认通常是 `500`。当某 zone 某 order 的 fragmentation index `<= extfrag_threshold` 时，内核倾向认为 compaction 不值得做；大于阈值时，才更可能尝试 compaction。

## THP 与高阶分配

THP 会增加高阶连续页需求。匿名 THP 通常需要 PMD-sized huge page，x86 上常见是 `2MB`，也就是 `order:9`。即使本例是 `order:4`，THP 的分配、回收和拆分也可能影响碎片形态。

查看 THP 占用：

```bash
grep -E 'AnonHugePages|ShmemHugePages|FileHugePages|HugePages_' /proc/meminfo
```

定位使用匿名 THP 的进程：

```bash
grep -H 'AnonHugePages' /proc/*/smaps 2>/dev/null | awk '$2 > 0 { print }'
```

临时降低 THP 干扰：

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
echo 0 > /sys/kernel/mm/transparent_hugepage/khugepaged/defrag
```

这只能作为灰度止血动作。禁用 THP 可能降低依赖大页的 workload 性能，尤其是大内存数据库、虚拟机、JVM、内存分析型服务等。正确做法是按业务分组灰度，观察延迟、CPU、TLB miss、page fault 和 THP 指标。

## 调参建议

### `vm.min_free_kbytes`

调大 `min_free_kbytes` 可以让内核保留更多空闲页，降低突发分配进入 direct reclaim 的概率，也可能改善部分高阶分配成功率。线上可采用原笔记中验证过的经验值作为起点：

```conf
# 4.6 之前
vm.min_free_kbytes=1048576  # 每 64GB 内存预留 1GB

# 4.6 之后
vm.min_free_kbytes=524288   # 每 64GB 内存预留 512MB
vm.watermark_scale_factor=100
```

这里的版本分界来自线上经验：4.6 之前缺少 `watermark_scale_factor` 这类更细的水位间距控制时，主要依赖更高的 `min_free_kbytes`；4.6 之后可以用较低的 `min_free_kbytes` 配合更积极的 watermark 间距，让 `kswapd` 提前工作。

这个值仍然要按机器内存规格等比例换算，并灰度发布。它不是免费午餐：

- 太小：高压时更容易分配失败、direct reclaim 或死锁风险上升。
- 太大：可被应用使用的内存减少，OOM 或回收可能提前出现。
- 需要结合 `allocstall`、`kswapd_low_wmark_hit_quickly`、业务延迟、page cache 命中率和 OOM 记录评估。

### `vm.watermark_scale_factor`

如果系统经常出现突发分配导致 direct reclaim，可以适度调大，让 `kswapd` 更早、更积极地维持水位。默认 `10` 是约 `0.1%` 间距；`100` 是约 `1%`。调大后要观察是否造成过度回收和 cache 命中率下降。

### `vm.extfrag_threshold`

该参数影响 high-order allocation 失败时 compaction 与 direct reclaim 的选择。默认 `500` 通常合理。除非确认高阶分配失败主要来自碎片，并且 compaction 成本可接受，否则不建议盲目调低或调高。

### 手动 Compaction

```bash
echo 1 > /proc/sys/vm/compact_memory
```

手动 compaction 适合临时验证或维护窗口操作，不适合作为频繁定时任务。它会迁移页面，可能带来明显 CPU 消耗和延迟抖动。

## 处置顺序

推荐按这个顺序处理：

1. 确认失败 order、GFP flag、zone、NUMA node、cpuset/mempolicy。
2. 看 `/proc/buddyinfo` 和日志里的 buddy 分布，判断是否缺目标 order 连续块。
3. 看 `/proc/vmstat` 的 direct reclaim、compaction、THP、OOM、kswapd 指标。
4. 看 `/proc/meminfo` 中匿名页、page cache、slab、dirty/writeback、AnonHugePages、swap。
5. 如果是短期风险，灰度降低 THP defrag 或禁用 THP，并在低峰期重启高 THP 占用进程释放碎片。
6. 如果是长期问题，按 workload 调整内存容量、实例密度、THP 策略、`min_free_kbytes`、`watermark_scale_factor`，必要时减少不可迁移内存和 pinned memory。

## 参考

- Linux kernel docs: `/proc/sys/vm`：https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel docs: Transparent Hugepage Support：https://docs.kernel.org/admin-guide/mm/transhuge.html
- Linux v4.18 `mm/page_alloc.c`：https://raw.githubusercontent.com/torvalds/linux/v4.18/mm/page_alloc.c
