# Wiki Index

> Content-oriented index. Update after each ingest or persisted query.

## Overview

- [[overview]] Global synthesis and current conclusions

## Sources

- [[sources/2026-04-28-google-reasoningbank]] Google ReasoningBank 博客（发布时间 2026-04-21），提出从成功与失败经验蒸馏结构化推理记忆的 agent 框架，并引入 MaTTS。
- [[sources/2026-05-15-reasoning-shift-paper]] `Reasoning Shift` 一手论文（发布时间 2026-04-01），提出长上下文会压缩 reasoning trace，并削弱自我验证与不确定性管理。
- [[sources/2026-05-15-erc-paper]] ERC 一手论文（首发 2025-12-05，当前版本 2026-04-23），提出用 entropy ratio 对 post-training `RL` 的全局分布漂移做双向 clipping 约束。
- [[sources/2026-04-24-deepseek-v4-paper]] DeepSeek-V4 一手论文（发布时间 2026-04-24），系统提出 `CSA/HCA + mHC + Muon` 协同路线并给出 1M context 工程叙事。
- [[sources/2026-04-17-mcluhan-dissects-ai-wechat]] 微信理论分析文（发布时间 2026-02-18），用麦克卢汉媒介理论框架解构 AI 的认知与社会效应。
- [[sources/2026-04-15-ppo-paper]] PPO 一手论文（发布时间 2017-07-20），提供 clipped on-policy 更新的经典基线。
- [[sources/2026-04-15-dpo-paper]] DPO 一手论文（发布时间 2023-05-29），用偏好对目标直接优化策略，简化 `RLHF`。
- [[sources/2026-04-15-deepseekmath-grpo-paper]] DeepSeekMath 一手论文（发布时间 2024-02-05），提出 `GRPO` 作为 `PPO` 变体并强调内存效率。
- [[sources/2026-04-15-instructgpt-rlhf-paper]] InstructGPT 一手论文（发布时间 2022-03-04），定义 LLM `RLHF` 经典 pipeline。
- [[sources/2026-04-14-note-llm-opd-on-policy-distillation]] 个人技术笔记，汇总 `OPD` 与 `SFT/RL` 对比、成本叙事与持续学习观点。
- [[sources/2026-04-14-thinking-machines-on-policy-distillation]] Thinking Machines 官方技术博客（发布时间 2025-10-27），系统定义 `OPD` 为 `on-policy + dense supervision`。
- [[sources/2026-04-14-thinking-machines-lora-without-regret]] Thinking Machines 官方技术博客（发布时间 2025-09-29），补充“监督密度与信息量”理论背景。
- [[sources/2026-04-14-harness-reasoning-shift-wechat]] 微信资讯解读（发布时间 2026-04-13），提出“长上下文下推理后验验证收缩”的机制假设。
- [[sources/2026-04-14-sipdo-prompt-optimization-wechat]] 微信资讯解读（发布时间 2026-02-27），梳理 Prompt Optimization 演进并聚焦 SIPDO 闭环机制。
- [[sources/2026-04-14-parallel-probe-paper]] Parallel-Probe 一手论文（发布时间 2026-02-03），提出在线并行推理的 `2D probing + 预算控制` 范式。
- [[sources/2026-04-14-parallel-probe-wechat-report]] 微信资讯解读（发布时间 2026-03-07），可作方法入口索引与资源导航，不作最终效果证据。
- [[sources/2026-04-14-kv-cache-engineering-guide]] 2026 年 KV cache 工程综述，覆盖瓶颈判断、优化分层与实施权衡。
- [[sources/2026-04-14-fermi-feynman-thinking-tools]] 微信方法论文：费米估算与费曼技巧的互补框架（发布时间 2025-11-10）。
- [[sources/2026-04-14-visual-attention-variants]] 现代 LLM 注意力变体全景综述（发布时间 2026-03-22），聚焦 GQA/MLA/SWA/Sparse/Hybrid 的工程权衡。
- [[sources/2026-04-14-gated-attention-llms-paper]] Gated Attention 一手论文（发布时间 2025-05-10），补充门控机制的实验性证据。
- [[sources/2026-04-14-deepseek-v3-2-paper]] DeepSeek-V3.2 一手技术报告（发布时间 2025-12-02），补充 DSA 的原始定义来源。

## Entities

- [[entities/google-research]] Google 旗下研究机构，涵盖 AI/ML 等方向。
- [[entities/marshall-mcluhan]] 媒介理论学者，”媒介即讯息”提出者。
- [[entities/ivan-zhao]] Notion 联合创始人 CEO。
- [[entities/daniel-kahneman]] 行为经济学家，”系统一/系统二”双过程理论提出者。
- [[entities/openai]] AI 研究机构，GPT 系列与 RLHF 工程化实践主导方。
- [[entities/deepseek-ai]] 中国 AI 研究机构，DeepSeek 系列模型提出方。
- [[entities/thinking-machines-lab]] AI 研究机构，On-Policy Distillation（OPD）定义方。
- [[entities/gleb-rodionov]] AI 研究者，Reasoning Shift 机制假设提出者。
- [[entities/anthropic]] AI 安全研究机构，Claude 系列模型开发方。
- [[entities/haohan-wang]] AI 研究者，SIPDO 闭环 prompt 优化论文作者。
- [[entities/vllm]] 高吞吐 LLM 推理框架，PagedAttention 设计方。
- [[entities/tensorrt-llm]] NVIDIA LLM 推理优化库，支持 KV 复用与量化加速。
- [[entities/hugging-face-transformers]] Hugging Face 开源 Transformers 库，广泛用于模型加载与推理。
- [[entities/enrico-fermi]] 物理学家，费米估算方法命名来源。
- [[entities/richard-feynman]] 物理学家，费曼技巧命名来源。
- [[entities/sebastian-raschka]] ML 研究者与教育者，以系统性注意力机制可视化综述著称。

## Concepts

- [[concepts/agent-memory]] agent 记忆机制的上位分类，组织轨迹记忆、工作流记忆与推理记忆的定义与区别。
- [[concepts/reasoning-bank]] 从成功与失败蒸馏结构化推理模式的 agent 记忆框架（Google，2026）。
- [[concepts/memory-aware-test-time-scaling]] 将 agent 记忆与测试时扩展关联的 MaTTS 框架，形成记忆↔扩展正向飞轮。
- [[concepts/media-theory-and-ai]] 媒介理论视角下的 AI 分析上位分类。
- [[concepts/media-is-the-message]] 从媒介结构变化而非内容优劣理解 AI 影响。
- [[concepts/media-extension-and-amputation]] AI 能力延伸与能力退化的联动机制。
- [[concepts/hot-and-cold-media]] AI 的双温属性：高完整输出与高参与门槛并存。
- [[concepts/rearview-mirror-effect]] 用旧媒介框架解释新媒介的认知惯性。
- [[concepts/media-tetrad]] 用增强/淘汰/复活/逆转四联体分析 AI。
- [[concepts/cognitive-stratification]] 提问与元认知差异驱动的人群能力分层。
- [[concepts/post-training-policy-learning]] post-training 策略学习上位分类，组织 `SFT/RL/OPD` 等方法。
- [[concepts/reinforcement-learning-from-human-feedback]] `RLHF`：`SFT -> reward model -> policy optimization` 的经典对齐流程基线。
- [[concepts/proximal-policy-optimization]] `PPO`：on-policy 强化学习稳健更新基线。
- [[concepts/entropy-ratio-clipping]] `ERC`：用新旧策略熵比约束全局分布漂移的后训练 `RL` 稳定化机制。
- [[concepts/direct-preference-optimization]] `DPO`：偏好对齐的单阶段直接优化路径。
- [[concepts/group-relative-policy-optimization]] `GRPO`：面向推理任务的 `PPO` 组相对优势变体。
- [[concepts/on-policy-distillation]] 基于学生在线轨迹与教师 token 级监督的后训练蒸馏方法。
- [[concepts/full-vocabulary-reverse-kl-distillation]] `OPD` 中的全词表 reverse KL 目标，用于降低梯度方差并增强蒸馏稳定性。
- [[concepts/prompt-optimization]] Prompt 级方法学分类，从离散搜索到文本梯度再到闭环反馈优化。
- [[concepts/closed-loop-prompt-optimization]] 通过“难例生成 + 失败修复 + 全局回归”持续演化 prompt 的闭环范式。
- [[concepts/reasoning-phase-control]] 推理阶段控制的上位分类概念，覆盖 test-time 的行为、预算与调度问题。
- [[concepts/training-stability-and-optimization]] 训练稳定性与优化的上位分类，组织优化器与稳定化连接机制。
- [[concepts/reasoning-shift]] 长上下文拥挤下“答案后验证收缩”机制假设。
- [[concepts/attention-compute-pattern-optimization]] 注意力机制/架构路径的推理优化分类（机制层与架构层）。
- [[concepts/kv-cache-serving-optimization]] `KV cache` 与 serving 系统路径的推理优化分类（瓶颈判断与分层落地）。
- [[concepts/manifold-constrained-hyper-connections]] 通过双随机流形约束残差映射，提升深层训练稳定性的连接机制。
- [[concepts/muon-optimizer]] 大规模训练下基于正交化更新的优化器路线，并与 `AdamW` 参数分治搭配。
- [[concepts/thinking-and-learning-methods]] 学习与分析方法分类（问题建模与理解校验）。
- [[concepts/parallel-reasoning-budget-control]] 通过“共识早停 + 偏差剪枝”联合控制并行推理的深度与宽度预算。
- [[concepts/kv-cache-optimization-stack]] 分层优化顺序：architecture -> system -> precision。
- [[concepts/decode-memory-bandwidth-bottleneck]] decode 带宽瓶颈判断及其工程含义。
- [[concepts/fermi-estimation]] 大问题拆解 + 数量级估算 + 假设外显的行动建模方法。
- [[concepts/feynman-technique]] 去术语化解释与因果链还原的理解校验方法。
- [[concepts/multi-head-attention]] 标准 Transformer 并行多头注意力机制，作为后续变体基线。
- [[concepts/grouped-query-attention]] 通过共享 K/V 头降低 KV cache 成本的稳健默认方案。
- [[concepts/multi-head-latent-attention]] 通过潜在表示压缩缓存的升级路线，复杂度高于 GQA。
- [[concepts/sliding-window-attention]] 以局部窗口替代全局可见性的长上下文降本机制。
- [[concepts/deepseek-sparse-attention]] 通过学习式索引与筛选构造稀疏注意力子集的 DeepSeek 路线。
- [[concepts/compressed-sparse-attention]] DeepSeek-V4 的“压缩 KV + 稀疏 top-k 选择”机制。
- [[concepts/heavily-compressed-attention]] DeepSeek-V4 的高压缩率长距离注意力主通道。
- [[concepts/gated-attention]] 对 full-attention 块做门控与归一化改造的稳定性增强组件。
- [[concepts/hybrid-attention-architecture]] `Hybrid Attention` 的多口径概念页，区分“跨模块混排”与“attention 内部交错编排”两种用法。
- [[concepts/on-disk-kv-prefix-reuse]] 将共享前缀 KV 持久化到磁盘以减少重复 prefill 的 serving 策略。

## Queries

- [[queries/2026-04-15-dpo-principle-and-how-it-works]] DPO 原理与工作机制：从 `RLHF` 两阶段到单阶段偏好直接优化的流程化解释。
- [[queries/2026-04-15-grpo-principle-and-how-it-works]] GRPO 原理与工作机制：从 `PPO` 到组相对优势优化的详细步骤与公式拆解。
- [[queries/2026-05-15-erc-vs-full-vocabulary-reverse-kl-distillation]] `ERC` 与 `Full-Vocabulary Reverse KL Distillation` 的层级对比：一个是 `RL` 更新约束，一个是 `OPD` 蒸馏目标。
