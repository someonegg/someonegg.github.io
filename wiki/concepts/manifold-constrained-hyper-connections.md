---
id: concept-manifold-constrained-hyper-connections
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-24-deepseek-v4-paper
---

# Manifold-Constrained Hyper-Connections

## Taxonomy

- Belongs to: [[concepts/training-stability-and-optimization]]
- Role: 深层 Transformer 中残差连接稳定化机制。

## Definition

- `mHC` 在 `Hyper-Connections` 基础上对残差映射施加 manifold 约束：将映射矩阵 `B` 约束到 doubly stochastic manifold，并将 `A/C` 约束到有界区间。

## Mechanism Notes (dated)

- 截至 2026-04-24，论文声称该约束使残差映射非扩张（谱范数有界），并在深层堆叠场景降低数值不稳定风险。
- 参数由动态分量与静态分量共同生成；`B` 通过 Sinkhorn-Knopp 投影到双随机集合。

## Core Tradeoff

- 优势：缓解深层训练中的信号放大与 loss spike 风险。
- 代价：引入额外计算、通信与实现复杂度；论文披露需配套融合 kernel 与重计算策略控开销。

## Related Concepts

- dependency: [[concepts/muon-optimizer]]
- complement: [[concepts/attention-compute-pattern-optimization]]

