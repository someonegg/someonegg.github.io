---
id: source-2026-04-15-deepseekmath-grpo-paper
type: source
updated_at: 2026-04-15
source_refs: []
---

# DeepSeekMath 与 GRPO（2024）

## Source Metadata

- Title: `DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models`
- Authors: `Zhihong Shao et al.`
- Publisher: `arXiv`
- Published date: 2024-02-05
- Ingest date: 2026-04-15
- Original path:
  - `llm-wiki/raw/2026-04-15-arxiv-2402-03300-deepseekmath-grpo.md`
- Canonical URL: `https://arxiv.org/abs/2402.03300`

## Facts (from source)

- 论文在 DeepSeekMath 训练中提出 `GRPO (Group Relative Policy Optimization)`，并明确称其为 `PPO` 变体。
- 摘要声明 `GRPO` 的目标之一是提升数学推理能力，同时优化 `PPO` 的内存使用。
- 论文报告 DeepSeekMath 7B 在 MATH 上达到较强结果，并将能力增益归因于数据构建与 `GRPO` 共同作用。

## Viewpoints (author position)

- 作者立场是：在推理任务中，奖励建模与优化策略需要与内存成本协同设计，`GRPO` 是这种折中的实现路径。
- 论文把 `GRPO` 定位为“性能与资源约束并重”的 RL 后训练手段，而非仅追求单点精度。

## Evidence Mentioned

- 来源给出模型分数与对比基线，并在摘要中明确 `GRPO` 的方法定位和收益方向。
- 论文将 `GRPO` 与 `PPO` 的关系直接写明，有助于在 taxonomy 中定义继承关系。

## Uncertainty / Limits

- 摘要层面缺少 `GRPO` 对优势估计方差、组大小与奖励标定敏感性的细节。
- 该证据主要来自数学任务分布，对通用指令/代码任务的外推需要额外来源验证。

## Extracted Conclusions (dated)

- 截至 2026-04-15，`GRPO` 可作为 post-training policy learning 中“面向推理任务、兼顾显存效率”的 `PPO` 分支。
- 截至 2026-04-15，`GRPO` 的核心价值主张是组内相对比较带来的稳健更新信号与更可控资源开销。
