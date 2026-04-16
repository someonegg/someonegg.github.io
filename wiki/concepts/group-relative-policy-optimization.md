---
id: concept-group-relative-policy-optimization
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-15-deepseekmath-grpo-paper
  - sources/2026-04-15-ppo-paper
---

# Group Relative Policy Optimization

## Taxonomy

- Belongs to: [[concepts/post-training-policy-learning]]
- Role: 面向推理类任务的 `PPO` 变体，通过组内相对优势信号提升更新稳定性并优化资源开销。

## Definition

- `GRPO` 是 `PPO` 变体，使用同组候选输出的相对比较信号进行策略优化，常用于降低对绝对标量奖励与高显存训练配置的依赖。

## Why it matters

- 在数学/推理任务中，组内相对比较可提供更稳定的训练梯度方向，缓解单样本奖励噪声。
- 相比标准 `PPO`，`GRPO` 的目标设计强调“性能提升 + 内存效率”双目标。

## Limits

- 组大小、组内样本多样性与奖励标定策略对效果高度敏感，迁移到非数学任务需重新标定。
- 当前公开证据集中于特定模型与任务分布，跨组织复现仍有限。

## Related Concepts

- contrast: [[concepts/proximal-policy-optimization]]
- application: [[concepts/reasoning-phase-optimization]]
- complement: [[concepts/on-policy-distillation]]
