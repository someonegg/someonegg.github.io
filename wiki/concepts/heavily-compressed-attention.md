---
id: concept-heavily-compressed-attention
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-24-deepseek-v4-paper
---

# Heavily Compressed Attention

## Taxonomy

- Belongs to: [[concepts/attention-compute-pattern-optimization]]
- Role: 长上下文注意力中的极致压缩主通道。

## Definition

- `HCA` 以更高压缩率 `m'`（`m' >> m`）对 KV 进行压缩，并在压缩空间内做稠密注意力，优先保障超长上下文可计算性。

## Mechanism Notes (dated)

- 截至 2026-04-24，论文将 `HCA` 与 `CSA` 交错编排；在公开配置中 `m'=128`。
- 论文同时为 `HCA` 配置 query/KV 归一化、部分 RoPE、滑窗补偿分支与 attention sink。

## Core Tradeoff

- 优势：在百万级上下文下将计算与缓存开销压到可部署范围。
- 代价：压缩极高时会削弱 token 级精细交互，对细粒度引用类任务更敏感。

## Related Concepts

- complement: [[concepts/compressed-sparse-attention]]
- contrast: [[concepts/sliding-window-attention]]
- dependency: [[concepts/on-disk-kv-prefix-reuse]]

