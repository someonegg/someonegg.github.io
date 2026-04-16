---
id: concept-decode-memory-bandwidth-bottleneck
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-kv-cache-engineering-guide
---

# Decode Memory-Bandwidth Bottleneck

## Taxonomy

- Belongs to: [[concepts/kv-cache-serving-optimization]]
- Role: `KV cache` 优化策略选择的瓶颈判断前提。

## Definition

- 在自回归服务中，decode 阶段常因每步反复读取累计历史 KV 而受制于内存带宽。

## Contrast with prefill

- 来源 `sources/2026-04-14-kv-cache-engineering-guide` 将 prefill 定位为更偏 compute-bound，而 decode 更偏 bandwidth-bound。

## Operational implications

- 优先降低 KV 字节规模，并改进缓存局部性与分配效率。
- 该判断应视为高频模式而非绝对规律；不同硬件与负载会改变主瓶颈。

## Related Concepts

- dependency: [[concepts/kv-cache-optimization-stack]]
