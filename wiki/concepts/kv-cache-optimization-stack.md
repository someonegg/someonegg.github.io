---
id: concept-kv-cache-optimization-stack
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-kv-cache-engineering-guide
---

# KV Cache Optimization Stack

## Taxonomy

- Belongs to: [[concepts/kv-cache-serving-optimization]]
- Role: `KV cache` 相关优化的分层实施方法。

## Definition

- 一种分层的 KV 优化路线：先做架构层降体积，再做缓存系统管理，最后做精度压缩。

## Components

- Architecture layer: 使用 GQA、MQA、MLA、滑窗/分块注意力，限制或降低 KV 体积增长。
- System layer: 使用分页分配、前缀复用、驱逐策略与 KV-aware 路由。
- Precision layer: 通过 `INT8/INT4/2-bit/3-bit` 压缩 KV 元素字节数，并处理质量/性能权衡。

## Why it matters

- 在引入低比特复杂度之前，先优先拿到更高 ROI 的内存流量下降收益。
- 与该来源对 decode 瓶颈的判断一致（结论日期：2026-04-14）。

## Related Concepts

- dependency: [[concepts/decode-memory-bandwidth-bottleneck]]
- complement: [[concepts/attention-compute-pattern-optimization]]
