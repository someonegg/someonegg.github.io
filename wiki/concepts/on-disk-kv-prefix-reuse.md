---
id: concept-on-disk-kv-prefix-reuse
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-24-deepseek-v4-paper
---

# On-Disk KV Prefix Reuse

## Taxonomy

- Belongs to: [[concepts/kv-cache-serving-optimization]]
- Role: 长上下文 serving 中通过磁盘 KV 复用减少重复 prefill 的系统策略。

## Definition

- 将可复用前缀的 `KV cache` 持久化到磁盘，在命中共享前缀时直接读取压缩 KV，避免重复 prefill。

## Mechanism Notes (dated)

- 截至 2026-04-24，论文区分两类缓存对象：
  - `CSA/HCA` 压缩 KV：直接落盘并复用。
  - `SWA` KV：提供 `full`、`periodic checkpoint`、`zero` 三类策略，按存储与重计算权衡切换。

## Core Tradeoff

- 优势：共享前缀场景可明显降低 TTFT 与重复计算。
- 代价：引入磁盘 I/O 与一致性管理复杂度；`SWA` 策略选择受 SSD 模式与命中分布影响明显。

## Related Concepts

- complement: [[concepts/kv-cache-optimization-stack]]
- dependency: [[concepts/compressed-sparse-attention]]
- dependency: [[concepts/heavily-compressed-attention]]

