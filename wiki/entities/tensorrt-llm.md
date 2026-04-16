---
id: entity-tensorrt-llm
type: entity
updated_at: 2026-04-14
source_refs:
  - sources/2026-04-14-kv-cache-engineering-guide
---

# TensorRT-LLM

## What this entity is

- 来源中提到的 NVIDIA 推理框架，涉及 KV cache 复用、优先级驱逐与 KV-aware 服务能力。

## Claims in current wiki

- 来源 `sources/2026-04-14-kv-cache-engineering-guide` 将 TensorRT-LLM 的 KV 复用/驱逐能力视为提升命中率、降低 TTFT 的关键机制。
- 来源同时引用官方文档与 NVIDIA 技术博客（来源中标注日期为 2025-01-16）。

## Notes

- 实际收益强依赖业务流量与部署配置，当前仓库尚无对应基准数据。
