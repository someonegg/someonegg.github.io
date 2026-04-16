---
id: concept-proximal-policy-optimization
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-15-ppo-paper
  - sources/2026-04-15-instructgpt-rlhf-paper
---

# Proximal Policy Optimization

## Taxonomy

- Belongs to: [[concepts/post-training-policy-learning]]
- Role: 作为 on-policy 强化学习的稳健更新基线，在约束策略漂移与训练简洁性之间取得折中。

## Definition

- `PPO` 是 policy gradient 家族方法，使用 clipped surrogate objective 限制单步更新幅度，减少策略更新过激导致的训练不稳定。

## Why it matters

- 在 LLM 对齐路径中，`PPO` 曾作为 `RLHF` 的主流优化器，为后续 `DPO/GRPO` 提供对照基线。
- 相比更复杂的 trust-region 方法，`PPO` 实现门槛更低，易于在工程栈中复用。

## Limits

- 训练稳定性仍依赖超参（clip range、KL 系数、batch 组织等）与奖励噪声控制。
- 在高成本在线采样场景，`PPO` 往往面临较高算力与 rollout 开销。

## Related Concepts

- application: [[concepts/reinforcement-learning-from-human-feedback]]
- alternative: [[concepts/direct-preference-optimization]]
- alternative: [[concepts/group-relative-policy-optimization]]
- complement: [[concepts/on-policy-distillation]]
