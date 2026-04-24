---
id: concept-muon-optimizer
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-24-deepseek-v4-paper
---

# Muon Optimizer

## Taxonomy

- Belongs to: [[concepts/training-stability-and-optimization]]
- Role: 大规模模型训练中的矩阵更新稳定化与收敛加速优化器路线。

## Definition

- `Muon` 是用于大部分参数模块的优化器路径；在 `DeepSeek-V4` 中与 `AdamW` 参数分治使用，并结合 Nesterov 与 hybrid Newton-Schulz 正交化。

## Mechanism Notes (dated)

- 截至 2026-04-24，论文描述保留 `AdamW` 于 embedding、预测头、`mHC` 静态偏置/门控、RMSNorm 等模块，其余参数由 `Muon` 更新。
- 论文给出两阶段 Newton-Schulz 迭代系数配置（前 8 步快速收敛，后 2 步稳定奇异值）。

## Core Tradeoff

- 优势：在论文设定中主张更快收敛与更高稳定性。
- 代价：与 ZeRO 等并行策略耦合复杂，需额外工程设计（bucket 分配、通信精度与规约路径）。

## Related Concepts

- complement: [[concepts/manifold-constrained-hyper-connections]]
- application: [[concepts/post-training-policy-learning]]
