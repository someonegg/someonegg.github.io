---
id: concept-hybrid-attention-architecture
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-14-visual-attention-variants
  - sources/2026-04-24-deepseek-v4-paper
---

# Hybrid Attention Architecture

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 注意力优化中的架构层级编排模式。

## Definition

- `Hybrid Attention` 在当前来源里存在两种主流用法：
  - 用法 A（2026-03-22 综述口径）：用线性注意力或状态空间模块替换多数 full attention，仅保留少量重注意力层。
  - 用法 B（2026-04-24 DeepSeek-V4 口径）：在 attention 家族内部交错编排 `CSA/HCA/SWA`，通过多分支协同降低长上下文成本。

## What it is not

- 不应默认把所有“多机制并存”都归为同一种 `Hybrid`；应明确所指来源口径与架构层级。

## Core Tradeoff

- 优势：长上下文场景下显著降低内存与计算增长斜率。
- 代价：可能有建模性能折中，且推理栈优化成熟度尚在演进期。

## Current Position (dated, conflict-aware)

- 截至 2026-03-22，来源将 `Hybrid` 主要定义为“attention 与非-attention 模块的层级混排”。
- 截至 2026-04-24，来源将 `Hybrid` 扩展为“attention 内部多机制交错编排（`CSA/HCA/SWA`）”。
- 两种定义并存，不覆盖关系；后续新增来源时应继续保留并标注口径冲突。

## Related Concepts

- contrast: [[concepts/grouped-query-attention]]
- contrast: [[concepts/multi-head-latent-attention]]
- contrast: [[concepts/gated-attention]]
- complement: [[concepts/compressed-sparse-attention]]
- complement: [[concepts/heavily-compressed-attention]]
