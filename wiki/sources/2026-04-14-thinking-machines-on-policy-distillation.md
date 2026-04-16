---
id: source-2026-04-14-thinking-machines-on-policy-distillation
type: source
updated_at: 2026-04-14
source_refs: []
---

# On-Policy Distillation（Thinking Machines, 2025-10-27）

## Source Metadata

- Title: `On-Policy Distillation`
- Author: `Kevin Lu and Thinking Machines Lab`
- Publisher: `Thinking Machines Lab`
- Published date: 2025-10-27
- Ingest date: 2026-04-14
- Original path:
  - `llm-wiki/raw/2026-04-14-thinking-machines-on-policy-distillation.html`
  - `llm-wiki/raw/2026-04-14-thinking-machines-on-policy-distillation.json`
- Original URL: `https://thinkingmachines.ai/blog/on-policy-distillation/`

## Facts (from source)

- 文章将三类后训练方法归纳为：`SFT`（off-policy + dense）、`RL`（on-policy + sparse）、`OPD`（on-policy + dense）。
- `OPD` 采用学生采样轨迹，再用教师对该轨迹做 token 级 logprob 评估，以 `reverse KL` 方式训练学生对齐教师策略。
- 在文中数学推理实验里，`OPD` 相对 `SFT` 与 `RL` 展示出更高样本效率，并报告了若干设定下显著计算效率优势（包含 `9-30x`、`50-100x` 等口径）。
- 文中指出在持续学习场景中，可在“新知识微调”后使用旧版本模型作教师，通过 `OPD` 恢复 instruction-following 等行为能力。
- 文中将 `OPD` 与既有工作关联到 `DAGGER`、`PRM`、早期 on-policy distillation 研究与 `Qwen3` 技术报告。

## Method / Evidence Details

- 训练循环基于 on-policy rollout：先采样学生轨迹，再计算教师在相同轨迹上的 token 级 logprobs。
- 对比口径强调“同起点下达到目标性能所需步数/算力”，而不仅是最终分数。
- 作者提供的效率解释是监督密度差异：每条 episode 中可利用的信息量随 token 数增长，而非仅依赖终局奖励。

## Viewpoints (author position)

- 立场 1：`OPD` 结合 on-policy 采样与 dense supervision，是后训练阶段的高性价比方法。
- 立场 2：在许多实际设置中，不必先训练复杂奖励模型，直接对齐高质量教师分布即可获得稳定收益。
- 立场 3：`OPD` 可作为持续学习中的“行为恢复层”，与知识微调交替进行。

## Uncertainty / Limits

- 来源为实验性技术博客，缺少审稿论文常见的完整 ablation 与跨任务统一对照。
- 效率数字依赖具体模型族、初始 checkpoint、上下文长度与 batch 设置，跨组织复现前需重新标定。
- 文章中“可复用同一 prompt 多样本训练”的收益，仍需在目标业务数据分布下验证是否稳定。

## Extracted Conclusions (dated)

- 截至 2025-10-27，`OPD` 被系统化呈现为“on-policy + dense”后训练范式，并给出较强的效率主张。
- 截至 2025-10-27，`OPD` 在持续学习里具备“恢复行为而非只学新知识”的潜在优势，但工程外推仍需任务级实证。
