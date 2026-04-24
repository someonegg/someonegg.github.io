---
id: source-2026-04-24-deepseek-v4-paper
type: source
updated_at: 2026-04-24
source_refs: []
---

# DeepSeek-V4: Parallelism Meets Efficiency in Ultra-Long Context Training (2026-04-24)

## Source Metadata

- Title: `DeepSeek-V4: Parallelism Meets Efficiency in Ultra-Long Context Training`
- Author: `DeepSeek-AI et al.`
- Publisher: `Hugging Face`
- Published date: 2026-04-24（按 PDF 元数据 `CreationDate`）
- Ingest date: 2026-04-24
- Original path:
  - `llm-wiki/raw/2026-04-24-hf-deepseek-v4-paper.pdf`
  - `llm-wiki/raw/2026-04-24-hf-deepseek-v4-paper.txt`
- Original URL: `https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/DeepSeek_V4.pdf`

## Facts (from source)

- 论文将 `DeepSeek-V4` 的核心升级归纳为三项：`CSA/HCA` 混合注意力、`mHC`、`Muon`，并将其与 1M context 支撑能力绑定陈述。
- 论文给出 1M context 下与 `DeepSeek-V3.2` 的效率对比主张：
  - `DeepSeek-V4-Pro` 单 token 推理 FLOPs 约为前代的 `27%`，`KV cache` 约为 `10%`。
  - `DeepSeek-V4-Flash` 单 token 推理 FLOPs 约为前代的 `10%`，`KV cache` 约为 `7%`。
- `CSA` 的定义是“按 `m` 压缩 KV + `DSA top-k` 稀疏选择”，`HCA` 的定义是“更高压缩率 `m'`（`m' >> m`）+ 稠密注意力”。
- `mHC` 通过把残差映射矩阵约束到 doubly stochastic manifold（Birkhoff polytope），并对 `A/C` 做有界约束以增强深层训练稳定性。
- 优化器采用参数分治：部分参数保留 `AdamW`，其余使用 `Muon`，并引入 Nesterov 与 hybrid Newton-Schulz 正交化。
- 训练语料规模主张为 `32T+ tokens`，并报告序列长度逐步扩展到 `1M`。
- 论文披露训练不稳定处置：`Anticipatory Routing`（仅在 spike 时触发）与 `SwiGLU Clamping`。
- 推理框架层面，提出异构 `KV cache` 布局与 `on-disk KV` 前缀复用（含 `SWA` 的三种磁盘缓存策略）。
- 后训练阶段采用多教师 `OPD`，并强调 full-vocabulary reverse KL（而非 token-level 近似）以降低梯度方差与不稳定。

## Method / Evidence Details

- 架构证据：
  - `mHC` 段落指出对 `B` 施加双随机约束可使映射非扩张，并在深层堆叠下保持稳定闭包性质。
  - `CSA/HCA` 段落给出结构细节：`CSA` 同时包含压缩与稀疏选择，`HCA` 用更激进压缩率换可计算性。
- 精度与系统证据：
  - 报告 `KV` 混合存储（RoPE 维度 `BF16`，其余 `FP8`）与 indexer `FP4` 路径。
  - 报告 index score 从 `FP32 -> BF16` 后 top-k selector 约 `2x` 提速且 `KV` 召回率 `99.7%`。
- 推理缓存证据：
  - `on-disk KV` 对 `CSA/HCA` 与 `SWA` 分别管理，并提供 `Full SWA Caching` / `Periodic Checkpointing` / `Zero SWA Caching` 三种策略。
- 后训练证据：
  - `OPD` 目标写为多教师加权 reverse KL，并声称 full-vocabulary logits distillation 在稳定性上优于常见 token-level 近似。

## Viewpoints (author position)

- 立场 1：1M context 应成为常态化工程能力，而非一次性 benchmark 能力。
- 立场 2：长上下文效率突破依赖“架构 + 训练优化 + 系统 + 后训练”协同，而非单点改动。
- 立场 3：面向长链路任务，`RL/OPD` 基建与 agent 基建应与模型架构联合设计。

## Uncertainty / Limits

- 本页结论来自论文原文提取，未在本仓库进行独立复现实验。
- 论文中的效率与质量对比大多基于作者内部框架与评测流程，跨栈外推需谨慎。
- Published date 依据 PDF 元数据（2026-04-24）推断；若后续出现 arXiv 正式版本，应以其公开版本信息为准并保留冲突记录。

## Extracted Conclusions (dated)

- 截至 2026-04-24，`DeepSeek-V4` 的核心贡献可归纳为：`CSA/HCA` 长上下文注意力路线、`mHC` 稳定化残差连接、`Muon` 大规模训练优化、以及与其配套的 `KV/FP4/OPD` 系统实现。
- 截至 2026-04-24，1M context 的可用性主张在该论文中已给出较完整的端到端叙事，但其真实性能边界仍依赖部署栈与任务分布验证。
