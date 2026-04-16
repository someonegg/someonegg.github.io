---
id: source-2026-04-14-gated-attention-llms-paper
type: source
updated_at: 2026-04-14
source_refs: []
---

# Gated Attention for Large Language Models: Non-linearity, Sparsity, and Attention-Sink-Free (2026-04-14)

## Source Metadata

- Title: `Gated Attention for Large Language Models: Non-linearity, Sparsity, and Attention-Sink-Free`
- Author: `Zihan Qiu et al.`
- Publisher: `arXiv`
- Published date: 2025-05-10
- Ingest date: 2026-04-14
- Original path:
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms.pdf`
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms.json`
- Original URL: `https://arxiv.org/abs/2505.06708`

## Facts (from source)

- 论文对 `gating-augmented softmax attention` 做了系统对比：`30` 个变体，覆盖 `15B MoE` 与 `1.7B dense`。
- 训练语料规模报告为最高 `3.5T tokens`；主实验上下文长度为 `4096`。
- 论文报告最有效配置之一是：在 `SDPA` 输出后使用 `head-specific sigmoid gate`（文中位置 `G1`）。
- 文中给出工程代价：gating 新增参数与 FLOPs 较小，报告 wall-time 延迟增幅 `< 2%`。

## Method / Evidence Details

- 方法拆解：作者将效果归因到两点
  - 在 `Wv -> Wo` 低秩映射之间引入非线性。
  - 用 query-dependent 稀疏 gating 分数调制 `SDPA` 输出。
- 消融结论（论文内）
  - `G1`（SDPA 后 gating）整体优于多数替代位置。
  - head-specific 优于跨头共享 gating。
  - 降低 gating 稀疏性（如去稀疏版本）会削弱收益。
- 长上下文外推实验（论文内）
  - 在 `YaRN` 延长上下文设置下，gated 模型在更长窗口（如 64k/128k）相对 baseline 更稳健。
  - 作者将其与 `attention sink` 缓解相关联，但同时承认缺少严格理论解释。

## Viewpoints (author position)

- 立场 1：`Gated Attention` 的收益不仅是经验 trick，而是“非线性 + 稀疏调制”带来的机制性收益。
- 立场 2：块级 gating 是低侵入、可扩展到大模型训练流程的增强路径。

## Uncertainty / Limits

- 论文聚焦 gating 机制本体，不等价于任意产品模型端到端收益。
- 论文已明确限制：对“attention sink 与长上下文泛化”关系缺少严格理论解释。
- 与 `MLA/DSA/SWA/Hybrid` 的统一训练配方对照仍需额外实验。

## Extracted Conclusions (dated)

- 截至 2025-05-10，`SDPA` 后置 `head-specific sigmoid gate` 是 `Gated Attention` 的高证据强度实现之一。
- 截至 2025-05-10，gating 的实证收益可被分解为非线性增强与输入相关稀疏化，两者共同影响稳定性与外推表现。
