# Wiki Index

> Content-oriented index. Update after each ingest or persisted query.

## Overview

- [[overview]] Global synthesis and current conclusions

## Sources

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
- [[sources/2026-04-14-agent-infra-production-primitives]] Agent 生产化基建提案（发布时间 2026-03-05），提出 `Effect Log`/`Capability Gateway`/`Forkable Checkpoint` 三条底层原语。
- [[sources/2026-04-14-kv-cache-engineering-guide]] 2026 年 KV cache 工程综述，覆盖瓶颈判断、优化分层与实施权衡。
- [[sources/2026-04-14-fermi-feynman-thinking-tools]] 微信方法论文：费米估算与费曼技巧的互补框架（发布时间 2025-11-10）。
- [[sources/2026-04-14-visual-attention-variants]] 现代 LLM 注意力变体全景综述（发布时间 2026-03-22），聚焦 GQA/MLA/SWA/Sparse/Hybrid 的工程权衡。
- [[sources/2026-04-14-gated-attention-llms-paper]] Gated Attention 一手论文（发布时间 2025-05-10），补充门控机制的实验性证据。
- [[sources/2026-04-14-deepseek-v3-2-paper]] DeepSeek-V3.2 一手技术报告（发布时间 2025-12-02），补充 DSA 的原始定义来源。

## Entities

- [[entities/openai]] 在来源中与 InstructGPT 的 `RLHF` 基线流程和 `PPO` 方法落地相关。
- [[entities/deepseek-ai]] 在来源中与 `GRPO` 提出及数学推理任务强化学习实践相关。
- [[entities/thinking-machines-lab]] 在来源中与 `OPD` 定义、后训练效率叙事及理论解释关联的机构实体。
- [[entities/gleb-rodionov]] 在来源中与 `Reasoning Shift` 机制假设关联的研究者实体。
- [[entities/anthropic]] 在来源中与“模型内部状态驱动行为”研究线索关联的机构实体。
- [[entities/haohan-wang]] 在来源中与 SIPDO 论文及闭环 prompt 优化叙事关联的研究者实体。
- [[entities/vllm]] 引用其 PagedAttention 与 prefix caching 设计实践。
- [[entities/tensorrt-llm]] 引用其 KV 复用、优先级驱逐与 KV-aware 路由能力。
- [[entities/hugging-face-transformers]] 引用其 bounded growth 与 offload 等缓存策略。
- [[entities/enrico-fermi]] 在来源中作为费米估算命名关联人物与经典案例框架引用。
- [[entities/richard-feynman]] 在来源中作为费曼技巧命名关联人物引用。
- [[entities/sebastian-raschka]] 以可视化模型卡片归纳注意力演进路线，并强调跨模型比较的证据边界。

## Concepts

- [[concepts/post-training-policy-learning]] post-training 策略学习上位分类，组织 `SFT/RL/OPD` 等方法。
- [[concepts/reinforcement-learning-from-human-feedback]] `RLHF`：`SFT -> reward model -> policy optimization` 的经典对齐流程基线。
- [[concepts/proximal-policy-optimization]] `PPO`：on-policy 强化学习稳健更新基线。
- [[concepts/direct-preference-optimization]] `DPO`：偏好对齐的单阶段直接优化路径。
- [[concepts/group-relative-policy-optimization]] `GRPO`：面向推理任务的 `PPO` 组相对优势变体。
- [[concepts/on-policy-distillation]] 基于学生在线轨迹与教师 token 级监督的后训练蒸馏方法。
- [[concepts/prompt-optimization]] Prompt 级方法学分类，从离散搜索到文本梯度再到闭环反馈优化。
- [[concepts/closed-loop-prompt-optimization]] 通过“难例生成 + 失败修复 + 全局回归”持续演化 prompt 的闭环范式。
- [[concepts/reasoning-phase-optimization]] 推理阶段优化的上位分类概念，覆盖 test-time 的预算与调度策略。
- [[concepts/reasoning-shift]] 长上下文拥挤下“答案后验证收缩”机制假设。
- [[concepts/attention-compute-pattern-optimization]] 注意力机制/架构路径的推理优化分类（机制层与架构层）。
- [[concepts/kv-cache-serving-optimization]] `KV cache` 与 serving 系统路径的推理优化分类（瓶颈判断与分层落地）。
- [[concepts/agent-runtime-reliability-primitives]] 生产级 Agent 运行时可靠性原语分类（权限、副作用、续跑、指标）。
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
- [[concepts/gated-attention]] 对 full-attention 块做门控与归一化改造的稳定性增强组件。
- [[concepts/hybrid-attention-architecture]] 以线性/状态空间模块替代多数全注意力层的长上下文架构模式。
- [[concepts/effect-log]] 副作用级 WAL 语义：intent/completion 双记录与恢复重放策略。
- [[concepts/capability-gateway]] 通过网关签发短时最小权限 token，隔离 Agent 可调用能力边界。
- [[concepts/forkable-checkpoint]] 将执行状态封装为可分叉 checkpoint，支持精确节点续跑。
- [[concepts/resumability-over-uptime]] 长程 Agent 可靠性目标从 uptime 转向 resumability。

## Queries

- [[queries/2026-04-15-dpo-principle-and-how-it-works]] DPO 原理与工作机制：从 `RLHF` 两阶段到单阶段偏好直接优化的流程化解释。
- [[queries/2026-04-15-grpo-principle-and-how-it-works]] GRPO 原理与工作机制：从 `PPO` 到组相对优势优化的详细步骤与公式拆解。
