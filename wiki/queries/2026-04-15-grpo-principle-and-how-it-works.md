---
id: query-2026-04-15-grpo-principle-and-how-it-works
type: query
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-15-deepseekmath-grpo-paper
  - sources/2026-04-15-ppo-paper
  - concepts/group-relative-policy-optimization
  - concepts/proximal-policy-optimization
---

# GRPO 的原理与工作机制（含公式与步骤）

## Problem Definition

- 问题：`GRPO`（Group Relative Policy Optimization）相对 `PPO` 到底改了什么？训练时每一步如何执行？核心公式如何落到可实现流程？

## Conclusion Summary

- `GRPO` 本质是 `PPO` 的组相对优势变体：保留 `PPO` 的 clipped policy update，但用“同题多采样组内相对奖励”构造优势，且去掉 value/critic 模型，降低内存与训练复杂度。[[sources/2026-04-15-deepseekmath-grpo-paper]] [[concepts/group-relative-policy-optimization]]
- 与常见 `PPO`-style `RLHF` 相比，`GRPO` 的关键变更是：$A_t$ 不再依赖学习到的 $V_\psi$（GAE 路线），而由组内归一化奖励直接给出；KL 正则也改为直接加在目标中。[[sources/2026-04-15-deepseekmath-grpo-paper]] [[sources/2026-04-15-ppo-paper]]

## Evidence and Citations

- DeepSeekMath 论文在 GRPO 小节明确给出从 `PPO` 到 `GRPO` 的动机、目标函数、KL 估计器、Outcome/Process 两类优势计算与迭代算法。[[sources/2026-04-15-deepseekmath-grpo-paper]]
- `PPO` 基线页给出 clipped surrogate + GAE + value function 的标准设定，可作为对比参照。[[sources/2026-04-15-ppo-paper]] [[concepts/proximal-policy-optimization]]

## How It Works (Step-by-step)

1. 初始化策略模型 $\pi_\theta$（通常来自 `SFT` 模型），并设参考策略 $\pi_{ref}$。
2. 从任务数据集中采样一批问题 $q$。
3. 对每个 $q$，用旧策略 $\pi_{\theta_{old}}$ 一次采样 $G$ 个候选输出 $\{o_i\}_{i=1}^G$（同题成组）。
4. 用 reward model 对每个输出（或每个推理步骤）打分，得到组内奖励。
5. 在组内做相对化（均值-方差归一化），构造 token 级优势 $\hat{A}_{i,t}$。
6. 用 `GRPO` 目标做 $\mu$ 轮优化更新策略（每轮都用 clipped ratio + KL 正则项）。
7. 进入下一批数据；若是 iterative GRPO，则周期性增量更新 reward model，并把当前策略同步为新的参考策略。[[sources/2026-04-15-deepseekmath-grpo-paper]]

## Core Equations

### 1) PPO 基线目标（对照）

$$
\mathcal{J}_{PPO}(\theta)=
\mathbb{E}_{q,o}\left[
\frac{1}{|o|}
\sum_{t=1}^{|o|}
\min\left(
\frac{\pi_\theta(o_t|q,o_{<t})}{\pi_{\theta_{old}}(o_t|q,o_{<t})}A_t,\;
\mathrm{clip}\!\left(\frac{\pi_\theta}{\pi_{\theta_{old}}},1-\epsilon,1+\epsilon\right)A_t
\right)
\right].
$$

- 在 `PPO` 中，$A_t$ 常由 `GAE` 基于 reward 与 value function $V_\psi$ 估计。[[sources/2026-04-15-ppo-paper]] [[sources/2026-04-15-deepseekmath-grpo-paper]]

### 2) GRPO 目标函数

$$
\mathcal{J}_{GRPO}(\theta)=
\mathbb{E}_{q,\{o_i\}_{i=1}^G}\!\left[
\frac{1}{G}\sum_{i=1}^G\frac{1}{|o_i|}\sum_{t=1}^{|o_i|}
\left(
\min\!\left(
r_{i,t}(\theta)\hat{A}_{i,t},
\mathrm{clip}(r_{i,t}(\theta),1-\epsilon,1+\epsilon)\hat{A}_{i,t}
\right)
-
\beta\,\mathbb{D}_{KL}[\pi_\theta\|\pi_{ref}]
\right)\right],
$$

其中

$$
r_{i,t}(\theta)=\frac{\pi_\theta(o_{i,t}|q,o_{i,<t})}{\pi_{\theta_{old}}(o_{i,t}|q,o_{i,<t})}.
$$

[[sources/2026-04-15-deepseekmath-grpo-paper]]

### 3) KL 项估计器（论文给出的无偏估计形式）

$$
\mathbb{D}_{KL}[\pi_\theta\|\pi_{ref}]
=
\frac{\pi_{ref}(o_{i,t}|q,o_{i,<t})}{\pi_\theta(o_{i,t}|q,o_{i,<t})}
-\log\frac{\pi_{ref}(o_{i,t}|q,o_{i,<t})}{\pi_\theta(o_{i,t}|q,o_{i,<t})}
-1.
$$

[[sources/2026-04-15-deepseekmath-grpo-paper]]

### 4) Outcome Supervision 的优势（组相对）

对同题组奖励 $\mathbf r=\{r_1,\dots,r_G\}$：

$$
\tilde r_i=\frac{r_i-\mathrm{mean}(\mathbf r)}{\mathrm{std}(\mathbf r)},
\qquad
\hat A_{i,t}=\tilde r_i.
$$

- 含义：该输出所有 token 共享同一个“组内相对结果分数”。[[sources/2026-04-15-deepseekmath-grpo-paper]]

### 5) Process Supervision 的优势（步骤级）

若每个输出在多个步骤终点 $index(j)$ 获得过程奖励：

$$
\tilde r_i^{index(j)}=
\frac{r_i^{index(j)}-\mathrm{mean}(\mathbf R)}{\mathrm{std}(\mathbf R)},
\qquad
\hat A_{i,t}=\sum_{index(j)\ge t}\tilde r_i^{index(j)}.
$$

- 含义：越靠前 token 会累积更多“后续步骤反馈”，更细粒度地塑造推理路径。[[sources/2026-04-15-deepseekmath-grpo-paper]]

## Implementation Mapping (Pseudo-code)

```text
for each batch of prompts q:
  sample G responses per prompt from pi_old
  score responses via reward model
  normalize rewards within each prompt-group
  build A_hat (outcome-level or process-level)
  repeat mu updates:
    compute ratio r = pi_theta / pi_old
    compute clipped policy term
    compute KL(pi_theta || pi_ref) term
    maximize J_GRPO (equiv. minimize -J_GRPO)
  optionally refresh reward model and set pi_ref <- pi_theta (iterative GRPO)
```

[[sources/2026-04-15-deepseekmath-grpo-paper]]

## Conflicts and Limitations

- 现有公开强证据主要集中在数学推理任务；跨任务泛化不能直接外推。[[concepts/group-relative-policy-optimization]] [[sources/2026-04-15-deepseekmath-grpo-paper]]
- 组大小 $G$、KL 系数 $\beta$、以及 process reward 质量会显著影响稳定性与收益。[[sources/2026-04-15-deepseekmath-grpo-paper]]
- 论文报告里存在特定训练设定（如每题采样 64 条、KL 系数等），迁移时需要重新标定。[[sources/2026-04-15-deepseekmath-grpo-paper]]

## Follow-up Questions

- 是否要补一版“`PPO vs GRPO` 的工程决策表”（显存、吞吐、稳定性、适用任务）并给出默认超参起点？
