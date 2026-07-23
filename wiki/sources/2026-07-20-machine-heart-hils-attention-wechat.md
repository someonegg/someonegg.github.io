---
id: source-2026-07-20-machine-heart-hils-attention-wechat
type: source
updated_at: 2026-07-23
source_refs: []
---

# 在数学上把稀疏注意力做对！腾讯混元开源 HiLS-Attention（2026-07-20）

## Source Metadata

- Title: `在数学上把稀疏注意力做对！腾讯Hy开源HiLS-Attention: 计算更少效果更好, 外推512倍`
- Author / Publisher: `机器之心（微信公众号）`
- Published date: 2026-07-20
- Ingest date: 2026-07-23
- Original URL: `https://mp.weixin.qq.com/s/5DvG15ZZMMm522x8G4Gr1g?scene=334`
- Referenced paper: `Hierarchical Sparse Attention Done Right: Toward Infinite Context Modeling`, arXiv:2607.02980（v1 submitted 2026-07-03）
- Referenced code: `https://github.com/Tencent-Hunyuan/HiLS-Attention`

## Facts (from source)

- 文章介绍 `HiLS-Attention`（Hierarchical Landmark Sparse Attention），将其定义为一种面向长上下文的 chunk-wise sparse attention。
- 文章把既有分块稀疏注意力的主要误差归因于 chunk 选择：精确 chunk mass 需要遍历 chunk 内所有 token，等价于重新承担 full attention 的高成本；mean/max logit 代理则只分别适配“分布均匀”与“单 token 高度集中”的极端情形。
- `HiLS-Attention` 为每个 chunk 引入 landmark token，并以参数化 chunk summary 近似 chunk mass；文章将代理质量概括为相关项与 entropy bias 的组合。
- 该方法把 attention 分解为 intra-chunk softmax 与 inter-chunk softmax，并让 chunk retrieval score 直接参与前向 attention 权重计算，使 LM loss 的梯度能够到达 summary key 与 landmark token。
- 文章转述的实验覆盖 `345M`、`1.4B` 与 `7B` 参数规模；其中 `OLMo3-7B` 转换实验使用 `50B` continued-pretraining tokens。
- 文章报告：在其测试设置下，短上下文 PPL 接近 full attention；8K 训练的模型在特定 needle retrieval 设置中可测试到 4M context；512K context 下 prefill 与单步 decode 分别报告 `13.5×` 与 `15.7×` 加速。
- 截至 2026-07-23，arXiv 摘要确认了分层 attention、retrieval score 进入前向计算、LM loss 下端到端 retrieval learning，以及“超过训练长度 64× 时保持 90% retrieval accuracy”的论文主张；官方 GitHub 仓库公开了训练与评测代码入口。

## Viewpoints (author position)

- 文章主张，分块稀疏注意力长期落后于 full attention 的根本问题不是“稀疏”本身，而是 chunk importance estimator 表达力不足，以及 hard top-k 带来的端到端梯度断点。
- 文章认为，HiLS 以“一阶 Taylor 近似 + entropy bias”改善 chunk mass 估计，再以 hierarchical softmax 打通 LM loss 到 retrieval score 的训练路径。
- 文章进一步推断，HiLS 在部分检索任务上超过 full attention，可能来自 chunk compression 的去噪效应：不对齐噪声相互抵消，共享语义信号得到保留。

## Evidence Mentioned

- 机制证据来自 LogSumExp chunk mass 与 mean/max logit 代理的数学对比，以及 hierarchical factorization 的前向计算图。
- 经验性证据包括 PPL、RULER/needle retrieval、LongBench、短上下文 benchmark 与推理速度测试。
- 官方 arXiv 摘要与 GitHub README 对核心机制及轻量 continued pretraining 的描述，与文章主线一致。

## Uncertainty / Limits

- 该来源是论文解读而非同行评审论文；性能数字是作者实验栈中的报告值，尚不能视为独立复现结果。
- `4M / 512×` 对应特定 retrieval 测试，不等价于在 4M context 上的通用生成、推理或 Agent 任务质量均稳定；arXiv 摘要采用更保守的“超过 64×、90% retrieval accuracy”表述。
- “首次”“彻底打破效率—性能二选一”等措辞具有宣传性，缺少跨实现、同硬件、同训练预算的全面独立比较。
- “压缩带来去噪，因此超过 full attention”是解释性假设。文章提供了任务结果与直觉，但尚未给出足以排除训练差异、top-k regularization 或 benchmark 特性的因果消融。
- 网页正文中的公式以图片呈现，当前来源页只记录其语义结构；精确公式与复杂度边界应以 arXiv:2607.02980 正文为准。

## Extracted Conclusions (dated)

- 截至 2026-07-20，`HiLS-Attention` 提供了一条“参数化 chunk summary + inter/intra-chunk hierarchical softmax”的学习式稀疏注意力路线，其关键差异是 retrieval score 不只用于 hard top-k，而是继续参与前向 attention，从而接受 LM loss 的直接训练信号。
- 截至 2026-07-20，现有证据支持“HiLS 在作者实验中兼顾长上下文效率与域内质量”的表述；尚不支持把 `512×` 外推泛化成通用长上下文能力保证。
- 截至 2026-07-23，论文与代码均已公开，但性能、复杂度和 serving 收益仍需独立复现，尤其应区分 needle retrieval、LongBench、通用生成与真实 Agent workload。

## Derived Concepts

- [[concepts/hierarchical-landmark-sparse-attention]]
- [[concepts/attention-compute-pattern-optimization]]
