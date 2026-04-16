---
id: concept-sliding-window-attention
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-visual-attention-variants
---

# Sliding Window Attention (SWA)

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 通过局部可见性降低长上下文计算成本的机制路径。

## Definition

- 通过固定窗口限制每个 token 可见历史范围的局部注意力机制，用局部可见性替代全前缀全连接。

## Core Design Knobs

- 局部与全局层比例（local:global ratio）。
- 窗口大小（window size）。
- 是否与 `GQA` 等 `KV cache` 优化机制联合使用。

## Core Tradeoff

- 优势：长上下文下显著降低计算与缓存访问成本。
- 代价：更激进的窗口/比例可能带来一定建模能力损失，需要通过混合全局层平衡。

## Current Position (dated)

- 根据来源（发布日期 2026-03-22），`SWA` 常与 `GQA` 联合出现，被作为长上下文推理的高实用性工程选项。

## Related Concepts

- complement: [[concepts/grouped-query-attention]]
- contrast: [[concepts/deepseek-sparse-attention]]
