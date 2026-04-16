---
id: entity-vllm
type: entity
updated_at: 2026-04-14
source_refs:
  - sources/2026-04-14-kv-cache-engineering-guide
---

# vLLM

## What this entity is

- 在本次来源中被引用的开源 LLM Serving 系统，重点关联 PagedAttention 与 Prefix Caching 实践。

## Claims in current wiki

- 来源 `sources/2026-04-14-kv-cache-engineering-guide` 认为在 vLLM 论文设定下，PagedAttention 可带来显著吞吐收益。
- 来源同时引用 vLLM 的 prefix caching 设计文档，作为生产场景前缀复用机制。

## Notes

- 当前仅记录“来源可追溯”的结论，仓库内尚无本地复现实验结果。
