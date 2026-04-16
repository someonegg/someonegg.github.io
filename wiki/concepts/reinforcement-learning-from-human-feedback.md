---
id: concept-reinforcement-learning-from-human-feedback
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-15-instructgpt-rlhf-paper
  - sources/2026-04-15-ppo-paper
  - sources/2026-04-15-dpo-paper
---

# Reinforcement Learning from Human Feedback

## Taxonomy

- Belongs to: [[concepts/post-training-policy-learning]]
- Role: 将人类偏好信号转化为可优化策略的后训练对齐流程基线。

## Definition

- `RLHF` 是一种 post-training 对齐框架，典型流程为 `SFT -> reward model -> policy optimization`，用于提升模型输出与人类偏好的一致性。

## Why it matters

- 在 LLM 训练实践中，`RLHF` 定义了从“偏好标注”到“策略优化”的标准工程路径，是 `PPO` 应用到语言模型对齐的重要落地场景。
- 该框架也是后续简化路线（如 `DPO`）与替代监督路径（如 `OPD`）的共同对照基线。

## Limits

- 管线较长，训练稳定性和成本对奖励模型质量、偏好数据分布与优化超参高度敏感。
- 在在线 rollout 成本较高场景中，端到端迭代效率可能受限。

## Related Concepts

- contrast: [[concepts/direct-preference-optimization]]
- complement: [[concepts/on-policy-distillation]]
- dependency: [[concepts/proximal-policy-optimization]]
