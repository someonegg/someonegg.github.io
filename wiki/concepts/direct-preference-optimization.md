---
id: concept-direct-preference-optimization
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-15-dpo-paper
  - sources/2026-04-15-instructgpt-rlhf-paper
---

# Direct Preference Optimization

## Taxonomy

- Belongs to: [[concepts/post-training-policy-learning]]
- Role: 以偏好对分类目标直接优化策略，减少经典 `RLHF` 的两阶段复杂度。

## Definition

- `DPO` 通过对偏好样本对进行直接优化，把“奖励建模 + 强化学习”重写为单阶段目标函数，从而简化对齐训练流程。

## Why it matters

- `DPO` 常用于替代 `PPO`-based RLHF 的复杂 pipeline，降低采样与调参成本。
- 在偏好数据质量可控时，`DPO` 可以在实现更简洁的同时保持或接近传统对齐效果。

## Limits

- 对偏好对分布、reference policy 与温度系数设置敏感，离线偏差会直接影响策略更新方向。
- 在需要在线探索或复杂长期回报建模的任务中，未必优于 on-policy RL。

## Related Concepts

- contrast: [[concepts/reinforcement-learning-from-human-feedback]]
- contrast: [[concepts/proximal-policy-optimization]]
- complement: [[concepts/on-policy-distillation]]
- alternative: [[concepts/group-relative-policy-optimization]]
