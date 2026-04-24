---
id: concept-training-stability-and-optimization
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-24-deepseek-v4-paper
---

# Training Stability and Optimization

## Definition

- 面向预训练与后训练阶段的稳定性与优化方法分类，关注“在大规模训练中如何提升收敛速度并抑制数值不稳定”。

## Scope

- 包含优化器设计、残差/激活稳定化、异常检测与动态干预等训练内机制。
- 不覆盖纯推理阶段的缓存调度与服务层优化。

## Sub-concepts

- [[concepts/manifold-constrained-hyper-connections]]：通过约束残差映射稳定深层信号传播。
- [[concepts/muon-optimizer]]：以正交化更新与参数分治提升大模型训练收敛效率与稳定性。

## Related Concepts

- complement: [[concepts/post-training-policy-learning]]
- contrast: [[concepts/reasoning-phase-optimization]]

