---
id: query-2026-04-15-dpo-principle-and-how-it-works
type: query
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-15-dpo-paper
  - sources/2026-04-15-instructgpt-rlhf-paper
  - concepts/direct-preference-optimization
  - concepts/reinforcement-learning-from-human-feedback
  - concepts/proximal-policy-optimization
---

# DPO 的原理与工作机制

## Problem Definition

- 问题：`DPO`（Direct Preference Optimization）到底在优化什么？与经典 `RLHF`（`SFT -> reward model -> policy optimization`）相比，训练时具体怎么跑？

## Conclusion Summary

- `DPO` 的核心原理是：把“偏好学习 + 策略优化”写成一个直接可训练的目标，不再显式训练 reward model，也不需要像 `PPO` 那样在线 rollout 强化学习。它直接用偏好对 `(chosen, rejected)` 更新策略，使模型更偏向被偏好答案。[[sources/2026-04-15-dpo-paper]]
- 从工程视角，`DPO` 是对经典 `RLHF` 流程的简化重写：把两阶段（reward model + RL）压缩为单阶段优化，目标是降低训练复杂度与调参负担。[[concepts/direct-preference-optimization]] [[concepts/reinforcement-learning-from-human-feedback]]

## Evidence and Citations

- 一手来源声明：`DPO` 通过目标函数重参数化，用“简单分类式损失”解决原本 `RLHF` 问题，并报告在部分任务上可匹配或超过 `PPO`-based RLHF。[[sources/2026-04-15-dpo-paper]]
- `RLHF` 基线流程由 InstructGPT 路线定义为 `SFT -> reward model -> RLHF`，这正是 `DPO` 想要简化的对象。[[sources/2026-04-15-instructgpt-rlhf-paper]] [[concepts/reinforcement-learning-from-human-feedback]]
- 在方法关系上，wiki 目前把 `DPO` 与 `PPO` 设为 `contrast`，与 `OPD` 设为 `complement`，反映“并非同一监督机制”。[[concepts/direct-preference-optimization]] [[concepts/proximal-policy-optimization]]

## How It Works (Operational View)

1. 准备数据：收集偏好对样本（同一 prompt 下 `chosen` 与 `rejected`）。
2. 固定参考策略：保留一个 reference policy 作为约束参照（防止策略漂移过大）。
3. 直接优化：用偏好对目标让模型提高 `chosen` 相对 `rejected` 的概率优势，同时受 reference 约束。
4. 迭代训练：按常规监督训练范式做 batch 迭代，无需在线采样环境交互。

### Step 3 详细展开（含公式）

- 对单个偏好对样本 `(x, y_w, y_l)`（`y_w` 为 `chosen`，`y_l` 为 `rejected`），常用的 `DPO` 目标可写为：

$$
\mathcal{L}_{DPO}
=
-\log \sigma\left(
\beta \left[
\log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)}
-
\log \frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}
\right]
\right)
$$

- 变量含义：
  - $\pi_\theta$：当前待训练策略；
  - $\pi_{ref}$：冻结 reference 策略；
  - $\beta$：温度/缩放系数；
  - $\sigma$：sigmoid。

- 等价地，定义：

$$
\Delta = \beta \left[
(\log \pi_\theta(y_w|x) - \log \pi_\theta(y_l|x))
-
(\log \pi_{ref}(y_w|x) - \log \pi_{ref}(y_l|x))
\right]
$$

则损失是 $-\log \sigma(\Delta)$，训练目标就是让 $\Delta$ 变大。

- batch 级计算流程（工程实现视角）：
  1. 对每个样本对计算 $\log \pi_\theta(y_w|x)$ 与 $\log \pi_\theta(y_l|x)$（通常为 token logprob 按 mask 求和）。
  2. 用冻结的 $\pi_{ref}$ 计算对应两项 logprob。
  3. 代入上式得到每个样本对损失并做 batch 平均。
  4. 反向传播，仅更新 $\pi_\theta$ 参数，$\pi_{ref}$ 不更新。

- 直觉解释：
  - 提高 `chosen` 相对 `rejected` 的偏好强度；
  - 同时用 reference 差分项约束策略漂移；
  - 无需显式 reward model 拟合与在线 RL rollout。

- $\beta$ 的常见影响：
  - 较大：偏好分离更激进，可能更快但更不稳；
  - 较小：更新更保守，更贴近 reference。

说明：此处公式与步骤是基于当前 wiki 中 `DPO` 一手来源与概念页整理出的标准工程表达；完整推导与超参细节仍应回看论文正文。[[sources/2026-04-15-dpo-paper]] [[concepts/direct-preference-optimization]]

## Conflicts and Limitations

- 当前 wiki 对 `DPO` 的关键结论主要来自论文摘要级提取，公式推导与超参敏感性（如 beta/temperature）细节尚未做 full-text 深提取。[[sources/2026-04-15-dpo-paper]]
- `DPO` 不是“任何场景都优于 RL”的断言；在需要显式在线探索或长期回报建模时，on-policy RL 路线仍可能更合适。[[concepts/direct-preference-optimization]] [[concepts/proximal-policy-optimization]]

## Follow-up Questions

- 是否需要在同任务同预算下补一张 `DPO vs PPO vs OPD` 的决策表（数据条件/算力条件/稳定性条件）？
