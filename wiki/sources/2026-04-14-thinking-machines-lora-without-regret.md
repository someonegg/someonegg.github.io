---
id: source-2026-04-14-thinking-machines-lora-without-regret
type: source
updated_at: 2026-04-14
source_refs: []
---

# LoRA Without Regret（Thinking Machines, 2025-09-29）

## Source Metadata

- Title: `LoRA Without Regret`
- Author: `John Schulman and Thinking Machines Lab`
- Publisher: `Thinking Machines Lab`
- Published date: 2025-09-29
- Ingest date: 2026-04-14
- Original path:
  - `llm-wiki/raw/2026-04-14-thinking-machines-lora-without-regret.html`
  - `llm-wiki/raw/2026-04-14-thinking-machines-lora-without-regret.json`
- Original URL: `https://thinkingmachines.ai/blog/lora/`

## Facts (from source)

- 文章在 `RL` 与监督学习效率讨论中提出信息论视角：policy-gradient episode 获得的有效反馈比特量通常受限于 `O(1)`，而监督学习可近似提供随 token 数扩展的信息量。
- 文中给出该上界推导与直观解释：稀疏优势信号在长序列场景会显著限制单位 token 学习效率。
- 文章主线是 `LoRA` 与 full fine-tuning 在特定设置下的效果与计算权衡，但其“监督密度”讨论被后续 `OPD` 文章显式复用。

## Viewpoints (author position)

- 立场 1：`LoRA` 并不天然低效，关键在于训练配置与目标匹配。
- 立场 2：在 RL 场景中，反馈密度是效率瓶颈之一，理解反馈信息量有助于设计更高效后训练流程。

## Uncertainty / Limits

- 本文核心实验对象是 `LoRA` 配置与 RL 对比，并非直接评估 `OPD`；用于 `OPD` 结论时应作为理论邻接证据。
- 信息量分析提供上界与趋势解释，不等价于对所有任务的精确计算成本预测。

## Extracted Conclusions (dated)

- 截至 2025-09-29，该来源可为 `OPD` 中“dense supervision 提升效率”主张提供理论背景，但不能替代 `OPD` 自身实验证据。
