---
id: concept-post-training-policy-learning
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-14-thinking-machines-on-policy-distillation
  - sources/2026-04-14-thinking-machines-lora-without-regret
  - sources/2026-04-14-note-llm-opd-on-policy-distillation
  - sources/2026-04-15-ppo-paper
  - sources/2026-04-15-dpo-paper
  - sources/2026-04-15-deepseekmath-grpo-paper
  - sources/2026-04-15-instructgpt-rlhf-paper
  - sources/2026-04-24-deepseek-v4-paper
---

# Post-Training Policy Learning

## Definition

- 面向 post-training 阶段的策略学习方法集合，关注“如何让模型在目标任务分布下形成稳定行为”，而非新增基础知识本体。

## Scope

- 涵盖 `SFT`、`RL`、`on-policy distillation` 等用于行为塑形与能力对齐的方法。
- 重点维度包括：采样策略（on/off-policy）、监督密度（sparse/dense）、优化稳定性、训练效率、持续学习稳定性。

## Sub-concepts

- [[concepts/reinforcement-learning-from-human-feedback]]：`SFT -> reward model -> policy optimization` 的经典对齐流程基线。
- [[concepts/on-policy-distillation]]：在学生自身轨迹上以教师 token 级信号进行策略蒸馏。
- [[concepts/full-vocabulary-reverse-kl-distillation]]：`OPD` 中以全词表分布约束学生策略的目标函数实现路线。
- [[concepts/proximal-policy-optimization]]：后训练强化学习常用基线，以 clipped objective 稳定 on-policy 更新。
- [[concepts/direct-preference-optimization]]：用偏好对目标直接优化策略，简化传统 `RLHF` 两阶段流程。
- [[concepts/group-relative-policy-optimization]]：以组内相对优势进行更新的 `PPO` 变体，强调推理任务与资源效率。

## Notes

- 该概念页用于组织后训练方法谱系；不直接替代具体算法页的实验结论。

## Related Concepts

- application: [[concepts/reasoning-phase-optimization]]
- application: [[concepts/prompt-optimization]]
