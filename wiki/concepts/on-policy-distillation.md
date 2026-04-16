---
id: concept-on-policy-distillation
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-thinking-machines-on-policy-distillation
  - sources/2026-04-14-thinking-machines-lora-without-regret
  - sources/2026-04-14-note-llm-opd-on-policy-distillation
---

# On-Policy Distillation

## Taxonomy

- Belongs to: [[concepts/post-training-policy-learning]]
- Role: 在后训练阶段连接 on-policy 采样与 dense 监督的策略学习方法。

## Definition

- 一种后训练方法：从学生策略在线采样轨迹，再用高质量教师对这些轨迹进行 token 级监督（通常以 logprob / `KL` 形式），使学生在“自己会实际访问到的状态”上学习。

## Why it matters

- 相比传统 off-policy 蒸馏，`OPD` 可直接覆盖学生误差状态分布，缓解长链路复合错误。
- 相比稀疏奖励 `RL`，`OPD` 具有更密集的学习信号，通常带来更高样本效率与更低梯度噪声。
- 在持续学习中，可用旧版本模型作教师进行行为恢复，降低“学新知识后行为退化”的风险。

## Evidence Snapshot

- 截至 2025-10-27，`Thinking Machines` 在公开实验中报告 `OPD` 可在部分设置下达到优于纯 `SFT` 的计算效率，并显著快于对齐同策略的 `RL` 训练步数。
- 截至 2026-04-14，个人笔记来源与官方博客结论一致，均强调“on-policy 状态相关性 + dense 监督”是关键增益来源。

## Limits

- 训练成本与收益对教师质量、学生初始化、采样温度、上下文长度和 batch 构成敏感，跨任务迁移前需重新评估。
- 公开数据多来自单组织实验栈，仍需第三方复现与统一口径 benchmark 补强外部可信度。

## Notes

- 方法选型上，`OPD` 更依赖在线轨迹与教师 token 级稠密监督；`DPO` 更依赖离线偏好对数据与分类式目标优化。

## Related Concepts

- contrast: [[concepts/proximal-policy-optimization]]
- contrast: [[concepts/direct-preference-optimization]]
- contrast: [[concepts/group-relative-policy-optimization]]
- application: [[concepts/reasoning-phase-optimization]]
