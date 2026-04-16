# Transformer KV Cache：2026 工程实践指南

## 注意力基础（速览）

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

1. `Q` 是“当前要找什么”，`K` 是“历史里有什么”，`V` 是“历史里可取回的内容”。
2. 自回归生成每步都要看历史 token，缓存历史 `K/V` 才能避免重复计算，这就是 KV Cache。

---

## TL;DR

在大多数在线推理场景里，`Decode` 阶段往往是显存带宽受限而不是算力受限；KV Cache 的优化优先级通常是：

1. 先从架构上减少 KV 体积（GQA/MQA、滑窗/分块注意力、MLA）
2. 再做缓存管理（PagedAttention、Prefix Reuse、Eviction）
3. 最后做精度压缩（INT8/INT4/2-bit/3-bit）

---

## 1. KV Cache 存什么

自回归生成时，第 `t` 步只新增 1 个 token，但要和历史 `1..t-1` 的 K/V 计算注意力。
如果每步都重算历史 K/V，延迟和成本都不可接受，所以要把历史 K/V 缓存在显存。

- `K`：历史 token 的检索索引
- `V`：历史 token 的内容载体
- `Q`：当前 token 的查询向量（一般不缓存历史 Q）

---

## 2. 容量公式（实战版）

### 单请求近似

对于 decoder-only 模型：

$$
\text{KV bytes} \approx 2 \times L \times T \times H_{kv} \times d_h \times b
$$

- `L`：层数
- `T`：当前有效上下文长度
- `H_kv`：KV 头数（MHA 时等于 query 头数，GQA/MQA 时更小）
- `d_h`：每个头维度
- `b`：每个元素字节数（FP16=2，INT8=1，INT4≈0.5，3-bit≈0.375）
- 前面的 `2`：K 和 V 各一份

### 服务端近似

并发时总占用更接近：

$$
\text{Total KV} \approx \sum_i 2 \times L \times T_i \times H_{kv} \times d_h \times b
$$

其中 `T_i` 是第 `i` 个请求的当前上下文长度。

---

## 3. 为什么 Decode 慢

- `Prefill`：大矩阵计算多，通常是 compute-bound
- `Decode`：每步 token 少，但要频繁读取历史 KV，通常是 memory-bandwidth-bound

所以很多优化即使不明显减少 FLOPs，也能提升吞吐，因为它们减少的是 HBM 读写与缓存管理损耗。

---

## 4. 2026 主流优化分层

### 4.1 架构层：从源头减少 KV

### MQA / GQA

- MQA：所有 query 头共享 1 组 K/V 头
- GQA：query 头分组后共享 K/V，精度和速度在 MHA 与 MQA 之间折中

相对 MHA，KV 体积缩放近似：

$$
\text{ratio} \approx \frac{H_{kv}}{H_q}
$$

### MLA（Multi-head Latent Attention）

DeepSeek-V2 通过潜空间表示 KV，论文报告在其设置下有显著 KV 降幅和吞吐提升。

---

### 4.2 系统层：把缓存当“内存系统”管理

### PagedAttention

将 KV 拆成固定页按需分配，降低碎片并提升共享/调度弹性。vLLM 论文报告了显著吞吐收益（在其对比设置下）。

### Prefix Caching

复用公共前缀的 KV，尤其适合系统提示词和多轮会话场景，通常收益稳定且不改变输出分布。

### KV Reuse / Eviction / KV-aware Routing

TensorRT-LLM 提供页级复用、优先级驱逐与 KV 事件能力，用于提高命中率和降低 TTFT。

---

### 4.3 精度层：压缩每个 KV 元素字节数

### 量化 KV Cache

- 常规：FP16 -> INT8/INT4
- KIVI（2024）：对 key/value 采用不同量化粒度策略
- TurboQuant（2025 arXiv，2026 Google Research 博客）：向量量化路线，目标是更低比特下保持质量

注意：量化不总是更快，短上下文或低并发可能被反量化和搬运开销抵消收益。

---

### 4.4 上下文策略层：控制增长方式

根据 Hugging Face 文档：

- 滑动窗口/分块注意力模型在相关层的 cache 不会无限增长
- `offloaded` / `offloaded_static` 可把大部分层 KV 移到 CPU，以吞吐换显存

---

## 5. 选型建议（按优先级）

1. 先确认瓶颈：TTFT、tokens/s、HBM 带宽利用、OOM 频率、prefix 命中率
2. 先做架构收益项：优先 GQA/MQA/滑窗模型，再谈量化
3. 再做系统复用：Paged + Prefix Cache + 合理驱逐策略
4. 最后做激进量化：INT4/2-bit/3-bit 必须做业务质量回归
5. 按目标优化：
- 低 TTFT：prefix reuse + KV-aware routing
- 高吞吐：分页 + GQA + 合理 batch
- 长上下文：滑窗/分块 + offload + 低比特 KV

---

## 6. 常见误区

- 误区 1：FlashAttention 会减少 KV Cache 体积
- 实际：它主要优化注意力计算 IO/算子效率，不直接减少缓存对象规模

- 误区 2：只要量化就一定更快
- 实际：短上下文/低并发下，额外开销可能抵消收益

- 误区 3：只看单请求 benchmark
- 实际：线上收益高度依赖并发分布、前缀复用率和路由策略

---

## 附录：注意力基础（详细）

### Attention Mechanism

核心计算：

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

可以理解为：

1. 用 `Q` 和所有 `K` 计算相似度分数
2. 经 `softmax` 归一化得到权重
3. 用权重对 `V` 做加权求和

### Query / Key / Value

- Query（Q）：“我现在想找什么信息？”
- Key（K）：“我能被怎样检索到？”
- Value（V）：“一旦被命中，应该返回什么内容？”

### Multi-Head Attention（MHA）

多个注意力头并行处理不同子空间，再拼接输出。每个头有独立的投影矩阵，提升模型表达能力。

### Softmax 与缩放项

$$
\text{softmax}(x_i) = \frac{e^{x_i}}{\sum_j e^{x_j}}
$$

`/ sqrt(d_k)` 的作用是抑制点积数值过大，避免 softmax 过度饱和导致训练/推理数值不稳定。

---

## 参考资料（按时间）

1. Fast Transformer Decoding: One Write-Head is All You Need (MQA, 2019)
   - https://arxiv.org/abs/1911.02150
2. GQA: Training Generalized Multi-Query Transformer Models (2023)
   - https://arxiv.org/abs/2305.13245
3. Efficient Memory Management for LLM Serving with PagedAttention (vLLM, 2023)
   - https://arxiv.org/abs/2309.06180
4. Efficient Streaming LMs with Attention Sinks (ICLR 2024)
   - https://arxiv.org/abs/2309.17453
5. KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache (2024)
   - https://arxiv.org/abs/2402.02750
6. FlashAttention-3 (2024)
   - https://arxiv.org/abs/2407.08608
7. DeepSeek-V2（含 MLA，2024）
   - https://arxiv.org/abs/2405.04434
8. TurboQuant (2025)
   - https://arxiv.org/abs/2504.19874
9. Google Research: TurboQuant（发布于 2026-03-24）
   - https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/
10. Hugging Face Transformers: Cache strategies（2026 文档）
   - https://huggingface.co/docs/transformers/kv_cache
11. vLLM: Automatic Prefix Caching（设计文档）
   - https://docs.vllm.ai/en/latest/design/prefix_caching/
12. TensorRT-LLM: KV cache reuse（官方文档）
   - https://nvidia.github.io/TensorRT-LLM/advanced/kv-cache-reuse.html
13. NVIDIA Technical Blog: KV cache reuse optimizations（2025-01-16）
   - https://developer.nvidia.com/blog/introducing-new-kv-cache-reuse-optimizations-in-nvidia-tensorrt-llm/
