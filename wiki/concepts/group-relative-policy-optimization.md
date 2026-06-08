---
id: concept-group-relative-policy-optimization
type: concept
updated_at: 2026-06-08
source_refs:
  - "[[sources/2026-04-15-deepseekmath-grpo-paper]]"
  - "[[sources/2026-04-15-ppo-paper]]"
---

# Group Relative Policy Optimization

## Taxonomy

- Belongs to: [[concepts/post-training-policy-learning]]
- Role: 面向推理类任务的 `PPO` 变体，通过组内相对优势信号提升更新稳定性并优化资源开销。

## Definition

- `GRPO` 是 `PPO` 变体：对同一 prompt 从旧策略采样多条输出，用组内 reward 统计量估计 baseline 与 advantage，从而省去单独训练 value/critic model，并保留 clipped policy update 与 reference-policy `KL` 约束。

## Mechanism

- 采样：对每个问题采样一组候选输出，而不是只看单条 rollout。
- 评分：用 reward model 或 process reward model 对候选输出/推理步骤给分。
- 优势估计：在同一问题的候选组内做 reward 标准化（减去组均值、除以组标准差），用相对表现作为 advantage 信号。
- 更新：按 `PPO` 风格目标更新 policy，并把训练策略与 reference policy 的 `KL` 直接加入 loss，而不是把 `KL` penalty 混入 reward。
- 变体：outcome supervision 把序列级标准化 reward 分配给该输出所有 token；process supervision 则用后续推理步骤的标准化 reward 累积形成 token advantage；iterative GRPO 会持续更新 reward model。

## Why it matters

- 在数学/推理任务中，组内相对比较可提供更稳定的训练梯度方向，缓解单样本奖励噪声。
- 相比标准 `PPO`，`GRPO` 的目标设计强调“性能提升 + 内存效率”双目标。
- 相比 `PPO` actor-critic 路线，去掉 value/critic model 可降低大模型 RL post-training 的显存与计算负担。

## Limits

- 组大小、组内样本多样性与奖励标定策略对效果高度敏感，迁移到非数学任务需重新标定。
- 组内 reward 标准化依赖同题候选之间存在可分辨差异；若候选质量过于接近或 reward model 噪声较大，advantage 信号会变弱或变形。
- 省去 critic 降低了系统成本，但也把 baseline 质量绑定到采样组设计与 reward 质量；这不是无条件优于 `PPO` 的结论。
- DeepSeekMath 论文中的主要 RL 训练数据来自 GSM8K/MATH 的 CoT 问题，跨代码 Agent、通用指令、多轮工具调用任务仍需独立验证。
- 当前公开证据集中于特定模型与任务分布，跨组织复现仍有限。

## Related Concepts

- contrast: [[concepts/proximal-policy-optimization]]
- application: [[concepts/reasoning-phase-control]]
- complement: [[concepts/on-policy-distillation]]
