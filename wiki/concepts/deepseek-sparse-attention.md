---
id: concept-deepseek-sparse-attention
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-14-visual-attention-variants
  - sources/2026-04-14-deepseek-v3-2-paper
  - sources/2026-04-24-deepseek-v4-paper
---

# DeepSeek Sparse Attention

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 学习式稀疏选择的注意力机制路径。

## Definition

- 一种学习式稀疏注意力：先由 `indexer` 对历史 token 打分，再通过 `top-k selector` 形成稀疏注意力子集。

## Mechanism Notes (dated)

- 根据一手论文（2025-12-02），`DSA` 在 DeepSeek-V3.2 中作为核心架构改动引入。
- 文中实现采用 `MLA` 下的 `MQA mode`，以满足 kernel 共享与效率要求。
- 训练上采用“indexer warm-up + sparse joint training”的两阶段流程，并用 `KL` 对齐 indexer 与主注意力分布。
- 截至 2026-04-24，`DSA` 被作为 `CSA` 的稀疏选择器继续使用，但选择对象从原 token 粒度转向“压缩 KV 块”粒度。

## Complexity Interpretation

- 主注意力路径复杂度主张：`O(L^2) -> O(Lk)`。
- 但 indexer 路径仍为 `O(L^2)`，因此端到端收益取决于 indexer 计算占比与工程实现质量。

## Core Tradeoff

- 优势：在长上下文下通过学习式选择减少无效回看。
- 代价：机制与训练流程都更复杂，对实现细节敏感。

## Related Concepts

- complement: [[concepts/multi-head-latent-attention]]
- contrast: [[concepts/sliding-window-attention]]
