---
id: source-2026-04-14-kv-cache-engineering-guide
type: source
updated_at: 2026-04-14
source_refs: []
---

# KV Cache Engineering Guide (2026-04-14)

## Source Metadata

- Title: `Transformer KV Cache：2026 工程实践指南`
- Format: 工程实践综述笔记
- Date in document context: 2026
- Ingest date: 2026-04-14
- Original path: `docs/2026-04-14-kv-cache-engineering-guide.md`

## Facts (from source)

- KV cache 通过缓存历史 `K/V` 张量，避免在自回归 decode 过程中重复计算。
- 单请求 KV 内存近似为 `2 * L * T * H_kv * d_h * b` 字节。
- 文档指出 decode 常见瓶颈是显存带宽，而 prefill 更常见是算力瓶颈。
- 文档给出的优化顺序是：先做架构降体积 -> 再做缓存管理 -> 最后做精度压缩。
- 文档将 MQA/GQA/MLA 归类为架构层 KV 降体积手段。
- 文档将 PagedAttention/Prefix Caching/Eviction-Routing 归类为系统层手段。
- 文档列出 KV 量化路径（`INT8/INT4/2-bit/3-bit`），并强调质量与速度权衡。
- 文档引用 Transformers 的滑窗/分块注意力与 cache offload 策略。

## Viewpoints (author position)

- 主要观点：在线推理的 decode 优化应优先关注内存流量与缓存生命周期，而不只看 FLOPs。
- 评估观点：仅看单请求 benchmark 不够，线上收益取决于并发分布、前缀命中率与路由策略。
- 风险观点：激进 KV 量化必须结合业务负载做质量回归验证。

## Evidence Mentioned

- 该文引用了公开论文/文档/博客：MQA（2019）、GQA（2023）、PagedAttention/vLLM（2023）、KIVI（2024）、DeepSeek-V2 MLA（2024）、TurboQuant（2025 arXiv；2026-03-24 Google Research 博客）、HF Transformers KV cache 文档（2026）、TensorRT-LLM KV reuse 文档。
- 该来源是综述性整理，仓库内并未提供独立复现实验结果。

## Uncertainty / Limits

- 吞吐与时延结论依赖具体场景；文中未给出统一 benchmark 配置。
- “Decode 通常带宽受限”应视为常见模式，而非普适定律。
- TurboQuant 的工程成熟度具有时间敏感性（文中明确涉及 2025/2026 时间线）。

## Extracted Conclusions (dated)

- 截至 2026-04-14，稳健的 KV 优化路线应先做结构性降体积（如 GQA/MQA/MLA 或有界上下文注意力），再考虑低比特压缩。
- 截至 2026-04-14，缓存系统手段（分页分配、前缀复用、基于信息的驱逐/路由）是提升服务稳定性与 TTFT 的高 ROI 选项。
