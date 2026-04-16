---
id: concept-gated-attention
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-visual-attention-variants
  - sources/2026-04-14-gated-attention-llms-paper
---

# Gated Attention

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 注意力块内稳定性增强与稀疏调制机制。

## Definition

- 对标准 full-attention block 的稳定性增强版本，而非独立注意力家族。

## High-Confidence Mechanism Pattern

- 根据一手论文（2025-05-10），高收益实现之一是在 `SDPA` 输出后加入 `head-specific sigmoid gate`。
- 该模式核心不是替换注意力主干，而是在块内引入输入相关稀疏调制与额外非线性。

## Evidence-backed Effects (dated)

- 截至 2025-05-10，论文报告此改造在多规模模型上可同时改善性能与训练稳定性。
- 截至 2025-05-10，论文将其与 `attention sink` 缓解和长上下文外推稳健性关联，但理论解释仍不完整。

## Core Tradeoff

- 优势：改造成本低、可直接叠加于现有 full-attention 块。
- 代价：主要是块级增强，不直接像 `SWA/DSA` 那样改变整体注意力访存规模上限。

## Related Concepts

- contrast: [[concepts/multi-head-attention]]
- complement: [[concepts/hybrid-attention-architecture]]
