---
id: concept-multi-head-latent-attention
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-visual-attention-variants
---

# Multi-Head Latent Attention (MLA)

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 通过潜在表示压缩 `KV cache` 的机制路径。

## Definition

- 一种以“缓存潜在表示并按需重构”为核心的注意力设计，目标是降低 `KV cache` 成本。

## Core Tradeoff

- 相比 `GQA`：不是通过减少 K/V 头数量，而是通过缓存压缩来降成本。
- 优势：在大模型与长上下文条件下，可能在相同效率目标下更保留建模性能。
- 代价：实现与服务链路更复杂，对工程栈与调参能力要求更高。

## Current Position (dated)

- 根据来源（发布日期 2026-03-22），`MLA` 更接近“规模化升级路径”，而非所有模型的默认替代方案。

## Related Concepts

- contrast: [[concepts/grouped-query-attention]]
- complement: [[concepts/deepseek-sparse-attention]]
