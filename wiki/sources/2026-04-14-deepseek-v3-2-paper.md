---
id: source-2026-04-14-deepseek-v3-2-paper
type: source
updated_at: 2026-04-14
source_refs: []
---

# DeepSeek-V3.2: Pushing the Frontier of Open Large Language Models (2026-04-14)

## Source Metadata

- Title: `DeepSeek-V3.2: Pushing the Frontier of Open Large Language Models`
- Author: `DeepSeek-AI et al.`
- Publisher: `arXiv`
- Published date: 2025-12-02
- Ingest date: 2026-04-14
- Original path:
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2.pdf`
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2.json`
- Original URL: `https://arxiv.org/abs/2512.02556`

## Facts (from source)

- 论文明确写到：相较 DeepSeek-V3.1-Terminus，DeepSeek-V3.2 的唯一架构改动是引入 `DeepSeek Sparse Attention (DSA)`。
- `DSA` 原型由两部分组成：`lightning indexer` + `fine-grained token selection (top-k)`。
- 文中给出复杂度表述：主注意力由 `O(L^2)` 降为 `O(Lk)`；indexer 仍为 `O(L^2)`，但计算量显著低于原主注意力路径。
- 文中披露了持续预训练两阶段：
  - dense warm-up：仅训练 indexer（1000 steps）。
  - sparse training：引入 top-k 稀疏选择并联合优化（15000 steps，文中示例 `k=2048`）。

## Method / Evidence Details

- DSA under MLA：文中说明 DSA 在 `MLA` 框架下实例化，并采用 `MQA mode` 共享 latent key-value 以提升 kernel 计算效率。
- 对齐训练目标：indexer 使用与主注意力分布对齐的 `KL-divergence` 目标进行优化。
- 评估主张（论文内）
  - 与前代模型相比，作者报告短上下文与长上下文性能“基本不退化”。
  - 论文主张长上下文场景下端到端成本/速度有显著收益（基于其服务环境测量）。

## Viewpoints (author position)

- 立场 1：`DSA` 是 DeepSeek-V3.2 在长上下文效率上的核心机制，不是附属优化。
- 立场 2：注意力降本（DSA）与后训练扩展（RL、agent 数据合成）应协同推进。

## Uncertainty / Limits

- 本页结论来自论文文本提取，尚未在本仓库复现实验环境中独立验证。
- 论文中关于前沿模型对比与竞品对齐的结论依赖其自有评测设定，需谨慎外推。
- 对 DSA 与其他稀疏机制在统一配方下的优势边界，仍需更多公开 A/B。

## Extracted Conclusions (dated)

- 截至 2025-12-02，`DeepSeek Sparse Attention` 已在论文中给出可执行的机制定义（indexer + top-k selector）与训练流程。
- 截至 2025-12-02，`DSA` 的复杂度收益主张是“主注意力 `O(Lk)` + 辅助 indexer `O(L^2)` 的组合”，其端到端收益依赖具体实现与部署环境。
