---
id: concept-compressed-sparse-attention
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-24-deepseek-v4-paper
  - sources/2026-04-14-deepseek-v3-2-paper
---

# Compressed Sparse Attention

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 长上下文注意力中的“压缩 + 稀疏选择”机制。

## Definition

- `CSA` 先将每 `m` 个 token 压缩为 1 个 KV 条目，再通过 `DSA top-k` 选择少量压缩 KV 参与主注意力，并配合滑窗分支保留局部细粒度依赖。

## Mechanism Notes (dated)

- 截至 2026-04-24，论文给出 `CSA` 的压缩、indexer、top-k 选择与共享 KV MQA 路径定义。
- 论文训练配置示例中（`DeepSeek-V4-Pro`）`m=4`，top-k 为 `1024`；该值明显依赖模型规模与任务分布。

## Core Tradeoff

- 优势：显著降低超长上下文注意力计算与 KV 体积。
- 代价：压缩率、top-k、滑窗参数高度敏感；跨段精确检索任务可能因过压缩出现细节召回回退。

## Related Concepts

- complement: [[concepts/deepseek-sparse-attention]]
- complement: [[concepts/heavily-compressed-attention]]
- dependency: [[concepts/kv-cache-serving-optimization]]

