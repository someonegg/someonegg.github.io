---
id: concept-multi-head-attention
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-visual-attention-variants
---

# Multi-Head Attention (MHA)

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 注意力优化族谱中的基线机制。

## Definition

- 标准 Transformer 注意力机制：并行运行多个 self-attention heads，再将输出合并为更丰富的上下文表示。

## Role in the 2026 Attention Landscape

- 在该来源中，`MHA` 被作为后续变体（`GQA`、`MLA`、`SWA`、`Sparse`、`Gated`、`Hybrid`）的基线对照机制。
- 相比后续效率优化路线，`MHA` 在推理阶段的 `KV cache` 成本通常更高，尤其在长上下文下更明显。

## Core Tradeoff

- 优势：机制标准化程度高、语义清晰，是多数注意力改造路线的参考起点。
- 代价：全局注意力 + 每头独立 K/V 在长序列推理中带来更高内存与带宽压力。

## Current Position (dated)

- 根据来源（发布日期 2026-03-22），`MHA` 仍是重要基线，但在长上下文部署中常被 `GQA`、`MLA` 或混合结构替代为更高效变体。

## Related Concepts

- contrast: [[concepts/grouped-query-attention]]
- contrast: [[concepts/multi-head-latent-attention]]
