---
id: concept-grouped-query-attention
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-visual-attention-variants
---

# Grouped-Query Attention (GQA)

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 共享 K/V 头的稳健降本路线。

## Definition

- 一种通过“多个 Query 头共享较少 K/V 头”来降低 `KV cache` 开销的注意力变体。

## Core Tradeoff

- 优势：相对 `MHA`，内存与缓存带宽成本更低，工程实现与训练调参复杂度较可控。
- 代价：在部分配置下可能有建模质量损失，但通常可通过分组比例在质量与效率间折中。

## Current Position (dated)

- 根据来源（发布日期 2026-03-22），`GQA` 仍是 2026 年广泛采用的默认工程方案，尤其适合追求稳健落地的场景。

## Related Concepts

- contrast: [[concepts/multi-head-attention]]
- complement: [[concepts/multi-head-latent-attention]]
- complement: [[concepts/sliding-window-attention]]
