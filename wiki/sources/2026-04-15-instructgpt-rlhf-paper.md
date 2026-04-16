---
id: source-2026-04-15-instructgpt-rlhf-paper
type: source
updated_at: 2026-04-15
source_refs: []
---

# InstructGPT（RLHF 实践基线，2022）

## Source Metadata

- Title: `Training language models to follow instructions with human feedback`
- Authors: `Long Ouyang et al.`
- Publisher: `arXiv`
- Published date: 2022-03-04
- Ingest date: 2026-04-15
- Original path:
  - `llm-wiki/raw/2026-04-15-arxiv-2203-02155-instructgpt-rlhf.md`
- Canonical URL: `https://arxiv.org/abs/2203.02155`

## Facts (from source)

- 论文给出 LLM 对齐经典 pipeline：`SFT -> reward model -> RLHF`，并在实践中采用强化学习优化策略。
- 论文报告在人类偏好评测上，较小参数量 InstructGPT 模型可优于更大 GPT-3 基线输出。
- 论文指出该流程在有害输出与真实性方面有改进，同时在部分公开任务上保持较小性能回退。

## Viewpoints (author position)

- 作者立场是：模型规模增长不能自动解决“遵循人类意图”问题，post-training policy learning 是必要阶段。
- 论文把人类偏好监督视为对齐核心驱动，`RLHF` 是把偏好转化为可优化策略的工程路径。

## Evidence Mentioned

- 来源包含人类偏好评估与公开任务表现比较，支撑“对齐收益与能力保持可兼得”的主张。
- 该来源是后续 `PPO`/`DPO` 在 LLM 对齐中讨论的重要基线背景。

## Uncertainty / Limits

- 论文数据与评测分布来自特定时期任务集；在 2026 年任务分布下外推需要更新验证。
- 摘要未覆盖完整训练成本细目，难以直接用于现网成本估算。

## Extracted Conclusions (dated)

- 截至 2026-04-15，InstructGPT 仍是 LLM post-training policy learning 的历史基线证据，定义了主流 `RLHF` 工作流。
- 截至 2026-04-15，后续 `DPO/OPD/GRPO` 可理解为沿“稳定性、效率、监督密度”三个方向对该基线进行改写。
