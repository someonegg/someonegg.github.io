---
id: concept-hierarchical-landmark-sparse-attention
type: concept
updated_at: 2026-07-23
source_refs:
  - "[[sources/2026-07-20-machine-heart-hils-attention-wechat]]"
---

# Hierarchical Landmark Sparse Attention (HiLS-Attention)

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 通过可学习 chunk summary 与分层 attention，实现端到端 chunk retrieval 的稀疏注意力机制。

## Definition

- `HiLS-Attention` 是 chunk-wise sparse attention：用 landmark token 为 chunk 形成压缩 summary，估计 chunk mass，并将 attention 分解为 chunk 内与 chunk 间两个层级。
- 与“打分后只做 hard top-k”的路线不同，HiLS 的 retrieval score 继续进入前向 attention 权重，因此能够由 LM loss 直接优化。

## Mechanism

- Chunk mass estimation：以参数化 summary 近似精确但昂贵的 token-level chunk mass；来源将代理质量描述为 query-summary 相关项与 entropy bias 的组合。
- Intra-chunk softmax：在已检索 chunk 内分配 token 的相对注意力。
- Inter-chunk softmax：依据 chunk retrieval score 融合各 chunk 输出。
- End-to-end learning：retrieval score 位于前向计算图中，梯度可回传到 summary key 与 landmark token；训练与推理保持 native sparsity。

## Evidence and Limits

- 作者实验报告域内 PPL 接近 full attention，并在特定长上下文检索与推理速度测试中获得优势。
- `4M / 512×` 是特定 needle retrieval 设置的结果，不应外推为所有 4M-context 工作负载的能力保证。
- 压缩去噪是解释性假设；需要因果消融与独立复现，才能区分 compression、sparsity regularization、训练配方和 benchmark 结构的影响。

## Related Concepts

- contrast: [[concepts/deepseek-sparse-attention]]
- contrast: [[concepts/sliding-window-attention]]
- complement: [[concepts/kv-cache-serving-optimization]]
