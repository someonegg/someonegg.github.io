---
id: concept-entropy-ratio-clipping
type: concept
updated_at: 2026-05-15
source_refs:
  - "[[sources/2026-05-15-erc-paper]]"
---

# Entropy Ratio Clipping

## Taxonomy

- Belongs to: [[concepts/training-stability-and-optimization]]
- Role: 面向 LLM post-training `RL` 的全局分布级稳定化约束，用 entropy ratio 限制策略更新中的探索强度漂移。

## Definition

- `ERC` 通过比较当前策略与旧策略在同一 decoding step 上的熵比值，对每个 token 的更新施加双向 clipping 约束；当 entropy ratio 超出预设区间时，丢弃对应梯度。

## Why it matters

- 相比只约束 sampled actions 的 `PPO-clip`，`ERC` 用全词表熵度量覆盖未采样动作的分布漂移，试图更直接地控制 trust-region deviation。
- 相比 pointwise `KL` 正则，`ERC` 更强调“分布级软约束 + 保留探索弹性”的折中。
- 在已有论文口径中，`ERC` 可同时接入 `DAPO` 与 `GPPO` 一类策略优化算法，显示出比单一实现更广的可迁移性主张。

## Evidence Snapshot (dated)

- 截至 2026-05-15，arXiv `2512.05591 v2` 将 `ERC` 明确定义为基于 entropy ratio 的双向 clipping 机制，并强调其用于弥补 `PPO-clip` 对未采样动作无约束的缺口。
- 同一来源报告 `ERC-DAPO` 与 `ERC-GPPO` 在多类 benchmark 上均有收益，并在分析章节中把 `ERC` 定位为既可作补充约束，也可作更中心的稳定化约束。

## Limits

- 公开证据目前集中于单篇论文及其作者实验栈，跨组织复现仍不足。
- 论文虽包含代码推理与 instruction-following 评测，但作者仍将更广泛 domain（尤其 agent-based RL）泛化视作 open question。
- 方法需要访问新旧策略的全词表熵，系统开销低于 full-vocabulary 蒸馏并不自动成立，具体成本仍取决于训练实现。

## Related Concepts

- complement: [[concepts/proximal-policy-optimization]]
- contrast: [[concepts/full-vocabulary-reverse-kl-distillation]]
- dependency: [[concepts/reinforcement-learning-from-human-feedback]]
- complement: [[concepts/group-relative-policy-optimization]]
- complement: [[concepts/on-policy-distillation]]
