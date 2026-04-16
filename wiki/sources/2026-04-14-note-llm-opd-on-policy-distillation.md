---
id: source-2026-04-14-note-llm-opd-on-policy-distillation
type: source
updated_at: 2026-04-14
source_refs: []
---

# LLM OPD（On-Policy Distillation）笔记（2026-04-14）

## Source Metadata

- Title: `LLM OPD（On-Policy Distillation）`
- Author: `kngin`
- Publisher: `Obsidian personal notes`
- Published date: unknown
- Ingest date: 2026-04-14
- Original path:
  - `llm-wiki/raw/2026-04-14-note-llm-opd-on-policy-distillation.md`
  - `llm-wiki/raw/2026-04-14-note-llm-opd-on-policy-distillation.json`

## Facts (from source)

- 笔记将 `SFT`/传统蒸馏与 `OPD` 的差异归纳为 `off-policy` 与 `on-policy` 的状态分布差异，强调前者更容易出现长链路复合错误。
- 笔记认为 `OPD` 的核心收益是“学生在自己真实会访问到的状态上，得到逐 token 的密集教师信号”。
- 笔记将 `OPD` 与 `RL` 对比为“同属 on-policy，但监督密度不同”：`RL` 常见稀疏奖励与 credit assignment 难题，`OPD` 以 `KL` 直接约束到教师分布。
- 笔记记录了成本主张：尽管在线教师打分增加单步成本，但总成本可能因样本效率提升而低于传统离线 `SFT`。
- 笔记提出持续学习用法：先做新知识微调，再通过以旧模型为教师的 `OPD` 恢复行为能力。

## Viewpoints (author position)

- 观点 1：`OPD` 是“把 RL 的 on-policy 优势与蒸馏的密集监督优势拼接起来”的统一视角。
- 观点 2：相比“训练奖励模型再优化标量回报”，直接用教师分布做监督在工程上更简洁。
- 观点 3：`OPD` 对持续学习场景有现实价值，因为可用于“能力回填”而非仅增量学习新知识。

## Evidence Mentioned

- 证据主要来自 `Thinking Machines` 博客《On-Policy Distillation》中的实验图表与论述。
- 笔记提及 `LoRA Without Regret` 对“监督密度与信息量”的解释（`O(1)` vs `O(N)` bits）。
- 笔记引用 `PRM`、`DAGGER`、`Qwen3` 等作为背景关联，但未在笔记内展开原始实验细节。

## Uncertainty / Limits

- 该来源为个人二次总结，关键定量结论需回到一手来源核验（实验配置、模型规模、训练步数与成本口径）。
- “9-30x 成本优势”等数值依赖特定实验设置，不宜直接外推到所有任务和模型组合。
- 来源未提供可复现实验脚本与完整超参，仅可作为研究线索与概念框架入口。

## Extracted Conclusions (dated)

- 截至 2026-04-14（笔记读取日期），该笔记可作为 `OPD` 核心机制的高质量中文归纳，但定量主张需依赖一手英文来源复核。
- 截至 2026-04-14，该笔记对“持续学习中的行为恢复”给出了明确工程方向，适合后续与一手实验数据联动验证。
