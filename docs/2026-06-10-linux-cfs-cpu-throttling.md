# Linux CFS CPU throttling：低 CPU 使用率 & 高限流

在容器环境里，出现了一种看似矛盾的现象：

> 应用整体 CPU usage 没有打满，但 `cpu.stat` 里 `nr_throttled` 很高，服务延迟也明显变差。

这不是单纯的监控口径问题，而是 Linux CFS bandwidth control、CPU quota、per-CPU runtime slice 和高线程数负载共同作用的结果。它尤其容易出现在 Kubernetes、Mesos、Docker 等通过 cgroup CPU quota 限制容器 CPU 的场景中。

## 先看现象

CPU limit 通常通过 CFS bandwidth control 实现。典型配置由两个参数决定：

```text
cpu.cfs_period_us
cpu.cfs_quota_us
```

例如：

```text
cpu.cfs_period_us = 100000
cpu.cfs_quota_us  = 40000
```

含义是：每 `100ms` 的 period 内，这个 cgroup 最多可以使用 `40ms` CPU 时间，等价于 `0.4 CPU` 的 hard limit。

当 cgroup 在当前 period 内耗尽 quota 后，调度器会把它 throttle 到下一个 period。统计信息可以从 cgroup 的 `cpu.stat` 读取：

```bash
cat /sys/fs/cgroup/cpu/<cgroup>/cpu.stat
```

常见字段包括：

```text
nr_periods
nr_throttled
throttled_time
```

更实用的观察指标通常是：

```text
nr_throttled / nr_periods
```

它表示有多少比例的 period 发生过 throttling。`throttled_time` 也有价值，但它会受线程数影响：多个线程同时被 throttle 时，累计时间可能很大，不适合直接跨服务比较。

## 为什么 CPU 没用满也会被 throttle

直觉上，一个 cgroup 如果没有用满总 quota，就不该被 throttle。但 CFS bandwidth control 的实现不是每次都从一个全局 quota 池里精确扣减。

为了减少全局锁竞争，内核会把全局 quota 分成小片 runtime slice，按需分发到各个 CPU 的本地 runqueue。默认 slice 大小通常是：

```text
kernel.sched_cfs_bandwidth_slice_us = 5000
```

也就是 `5ms`。

这会带来一个重要细节：quota 可能已经从全局池转移到了某个 CPU-local bucket，但对应线程很快阻塞、睡眠或等待 I/O，没有把这部分 runtime 用完。

当这个 CPU 上属于该 cgroup 的线程都不可运行时，内核可以把大部分剩余 runtime 还回全局池，但通常会保留一小部分本地 runtime，历史上约为 `1ms`，用来减少后续唤醒时的锁竞争。

在低核心数机器上，这点保留量通常不明显。但在高核心数机器上，如果很多 CPU 上都残留一点本地 runtime，总量就可能变得很大。

例如一台 88 核机器上，某个高线程服务在很多 CPU 上短暂运行后阻塞，每个 CPU-local bucket 都残留约 `1ms`。这些残留 quota 对其他 CPU 上正在运行的线程不可用。结果是：

- 全局 quota 池看起来已经不够；
- 正在运行的线程被 throttle；
- 但从整体 CPU 使用率看，服务并没有真正用满它申请的 quota；
- 延迟变差，尤其是尾延迟变差。

这就是“低 CPU usage + 高 throttling”的核心机制。

## 哪类负载最容易触发

这个问题对 CPU-bound 负载通常不明显。CPU-bound 线程会持续运行，倾向于把拿到的 runtime slice 用完，每个 period 也更接近用满 quota。

更容易受影响的是高线程数、非 CPU-bound、频繁阻塞的服务，例如：

- Java / JVM Web 服务；
- 大量 worker thread 的异步服务；
- 请求处理里夹杂网络、磁盘、RPC、锁等待的服务；
- 线程短暂运行后很快 sleep 或等待 I/O 的服务；
- 在高核心数机器上配置了较低 fractional CPU limit 的容器。

这类服务的特点不是持续消耗 CPU，而是很多线程在很多 CPU 上短暂获得调度机会。它们很容易把 quota 分散到不同 CPU-local bucket，又没有及时用完。

## kernel 修复的要点

Linux 社区后来采用的关键修复思路是：不要让 CPU-local runtime slice 在 period 边界简单过期。

这意味着 per-CPU slice 可以跨 period 保留。严格地说，这会让限制从“每个 period 内绝对不能超过 quota”变成“较长时间窗口内维持 quota 平均约束”。某些短窗口内可能出现轻微 burst，但 burst 上限受到 CPU-local bucket 中剩余 runtime 的限制。

这个取舍是合理的：

- 对 CPU-bound 任务影响很小，因为它们通常会在 period 内用完 runtime；
- 对高线程、非 CPU-bound 任务帮助很大，因为未用完的本地 slice 不会在 period 边界白白作废；
- 长期 CPU quota 约束仍然成立，只是不再把 period 边界做成过于僵硬的硬切线。

当前 Linux kernel 文档也明确描述了这一点：slice 一旦被分配给 CPU-local runqueue，通常不会因为 period 结束而过期；当线程不可运行时，大部分 runtime 可以返回全局池，但会保留少量本地 runtime。

## cgroup v1 与 v2 的接口

cgroup v1 常见接口：

```text
cpu.cfs_period_us
cpu.cfs_quota_us
cpu.stat
```

cgroup v2 对应接口：

```text
cpu.max
cpu.max.burst
cpu.stat
```

`cpu.max` 表达 quota 和 period。`cpu.max.burst` 是后续加入的 burst 机制，用于允许更显式的 CPU burst 配置。新版本 `cpu.stat` 中也可能包含：

```text
nr_periods
nr_throttled
throttled_usec
nr_bursts
burst_usec
```

实际字段取决于 kernel、cgroup 版本和发行版 backport。

## 排查建议

遇到容器服务延迟异常时，不要只看平均 CPU 使用率。建议同时看：

```bash
cat /sys/fs/cgroup/cpu/<cgroup>/cpu.stat
```

重点计算：

```text
nr_throttled / nr_periods
```

如果 CPU usage 低，但 throttled period 比例高，要继续确认：

- 服务是否配置了较低 CPU limit，尤其是小于 `1 CPU` 的 fractional limit；
- 服务线程数是否远高于 CPU limit；
- 节点是否是高核心数机器；
- workload 是否频繁阻塞、sleep、等待 I/O 或 RPC；
- kernel 是否包含 CFS bandwidth slice 不再过期的修复；
- 发行版是否对相关 patch 做了 backport；
- 当前使用的是 cgroup v1 还是 v2；
- 是否可以使用或调整 `cpu.max.burst`。

## 应对建议

优先级从稳妥到激进大致如下：

1. 确认 kernel 版本和发行版 backport，优先使用包含修复的内核。
2. 避免给高线程服务配置过低的 CPU limit，尤其是在高核心数节点上。
3. 对 latency-sensitive 服务，考虑只设置 CPU request，不设置 CPU limit。
4. 如果必须设置 limit，尽量避免过小的 fractional CPU limit。
5. 控制线程池规模，让线程数和 CPU limit 更匹配。
6. 在 cgroup v2 和平台支持的前提下，评估 `cpu.max.burst`。

这里要注意：移除 CPU limit 并不是普适答案。它会改善 CFS throttling 带来的尾延迟问题，但也可能让服务在突发时抢占同机其他 workload 的 CPU。是否移除 limit，应该结合服务优先级、节点隔离策略、SLO 和集群超卖策略决定。

## 补充：min_granularity 调度过载调优

过载情况下，每个进程能分到的时间片很短，例如 1ms，导致大部分 CPU 开销都花在了上下文切换上。如果一个时间片是 6ms，切换占 1ms，那我们还有5ms 可以执行； 如果 1.5ms，那只有 0.5ms 可以执行。为了避免这个问题，引入 min_granularity；反过来，这也会影响 sched_latency 的选取。

```text
# 较老内核或保留 sysctl 的发行版
/proc/sys/kernel/sched_min_granularity_ns

# 一些 5.x 内核的 debugfs 入口
/sys/kernel/debug/sched/min_granularity_ns

# 新版 kernel 文档中的 CFS/EEVDF 调度粒度入口
/sys/kernel/debug/sched/base_slice_ns
```

它是节点级调度行为，更适合作为“确认存在大量上下文切换开销之后”的专项调优项。

## 附录：Indeed 的定位路径

Indeed 的排查过程本身也很有参考价值，因为它不是从内核实现直接推导问题，而是从线上延迟异常一步步收敛到调度器行为。

他们最初观察到的是：升级到包含某些 stable kernel patch 的内核后，一批 Web 服务尾延迟明显变差。但常规 CPU 使用率并没有同步升高，所以问题一开始不像是简单的 CPU 饱和。

关键转折是把服务延迟和 cgroup CPU throttling 指标放在一起看。相比 `throttled_time`，他们更重视：

```text
nr_throttled / nr_periods
```

原因是 `throttled_time` 会随线程数膨胀，很多线程同时被 throttle 时，累计时间可能看起来非常夸张；而 `nr_throttled / nr_periods` 更接近“有多少调度周期发生了限流”，适合作为跨服务、跨版本的比较指标。

随后他们发现，很多受影响服务都有类似形态：线程数很多，但单个线程不是持续计算，而是短暂运行后等待 I/O、RPC、锁或定时器。这促使他们没有继续用纯 CPU 压测工具复现，而是构造了更接近 Web 服务线程模型的测试程序。

这个复现程序是 `fibtest`。它混合两类线程：

- fast threads：持续做 Fibonacci 计算，用来消耗 CPU quota；
- slow threads：只做少量计算，然后 sleep 一小段时间，模拟大量短运行、频繁阻塞的 worker。

通过把不同线程 pin 到不同 CPU，他们稳定复现了“没有用满 quota，但 throttling 很高”的现象。这一步很重要：如果只用 CPU-bound 压测，很可能完全看不到问题，因为 CPU-bound 负载会自然把 runtime slice 用完。

有了稳定复现后，他们对 kernel 做 `git bisect`，定位到：

```text
512ac999d275 "sched/fair: Fix bandwidth timer clock drift condition"
```

这个结论一开始容易误读成“这个 commit 引入了错误”。更准确的理解是：它修复了另一个真实 bug，让原本失效的 runtime expiration 逻辑重新生效；但这个“有效修复”暴露出 CPU-local slice 过期机制对高线程、非 CPU-bound 负载的不良影响。

后续他们继续分析 CFS bandwidth control 的实现，才把现象解释为：quota 被拆成 per-CPU runtime slice 后，可能滞留在多个 CPU-local bucket 中；period 边界再把未用完的 slice 过期掉，于是应用明明没有消耗完总 quota，却仍然被 throttle。

## 参考资料

- Indeed Engineering Blog: [Unthrottled: Fixing CPU Limits in the Cloud](https://engineering.indeedblog.com/blog/2019/12/unthrottled-fixing-cpu-limits-in-the-cloud/)
- Indeed Engineering Blog: [Unthrottled: How a Valid Fix Becomes a Regression](https://engineering.indeedblog.com/blog/2019/12/cpu-throttling-regression-fix/)
- Linux kernel documentation: [CFS Bandwidth Control](https://www.kernel.org/doc/html/latest/scheduler/sched-bwc.html)
- Linux kernel documentation: [CFS Scheduler](https://www.kernel.org/doc/html/latest/scheduler/sched-design-CFS.html)
- Linux kernel documentation: [Control Group v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- LKML patch discussion: [sched/fair: Remove expiration of cpu-local slices](https://lore.kernel.org/lkml/1558121424-2914-1-git-send-email-chiluk+linux@indeed.com/)
- Reproducer: [indeedeng/fibtest](https://github.com/indeedeng/fibtest)
