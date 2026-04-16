---
id: concept-hybrid-attention-architecture
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-visual-attention-variants
---

# Hybrid Attention Architecture

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 注意力优化中的架构层级编排模式。

## Definition

- 一种“架构层级混合”模式：用线性注意力或状态空间模块替换多数全注意力层，仅保留少量重注意力层做精确检索。

## What it is not

- 不等同于“任意注意力机制的组合命名”。
- 根据来源，`MLA+Sparse` 或 `SWA+GQA` 这类组合更应视为机制组合，而非本文定义的 `Hybrid` 架构范式。

## Core Tradeoff

- 优势：长上下文场景下显著降低内存与计算增长斜率。
- 代价：可能有建模性能折中，且推理栈优化成熟度尚在演进期。

## Current Position (dated)

- 根据来源（发布日期 2026-03-22），`Hybrid` 的主要价值在长上下文效率，适合 agent 等超长上下文任务。

## Related Concepts

- contrast: [[concepts/grouped-query-attention]]
- contrast: [[concepts/multi-head-latent-attention]]
- contrast: [[concepts/gated-attention]]
