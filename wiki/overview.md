# Overview

## Current Status

- Source pages: 21
- Entity pages: 16
- Concept pages: 43
- Persisted query pages: 3

## Taxonomy

当前 `overview` 采用“两层口径”组织全局结构：先用顶层分类轴稳定页面挂载，再用跨轴主题线索承载阶段性综合判断。`Concept` 关系应继续按“上位分类（Taxonomy）+ 横向关系（Related Concepts）”双轨维护，降低后续扩展时的结构漂移。

### Top-Level Axes

- 推理阶段控制：覆盖 test-time 行为、退化机制与预算控制。`Reasoning Shift` 表明长上下文/多轮/子任务打包会压缩 reasoning traces，并减少答案后复查；`Parallel-Probe` 一类方法则把在线并行推理视为深度（早停）与宽度（剪枝）的联合预算控制问题。
- Agent 记忆机制：区分轨迹记忆（细节但难迁移）、工作流记忆（成功经验但忽略失败）与推理记忆（高层可迁移模式，覆盖成功与失败）。ReasoningBank 代表推理记忆路线，并强调失败经验、反事实信号与陷阱蒸馏的价值。
- 学习与思维方法：`Fermi Estimation` 偏外部问题建模，`Feynman Technique` 偏内部理解校验；二者可组合成“估算假设 -> 去术语解释 -> 回补缺口”的迭代闭环。
- 媒介理论与 AI：用“媒介即讯息/延伸与截肢/冷热媒介/后视镜/四联体”解释 AI 对认知结构、社会分层与旧媒介惯性的影响路径。
- 训练稳定性与优化：组织 `mHC`、`Muon`、`ERC` 等训练内稳定化机制，并与推理阶段控制分层。`ERC` 针对 `PPO-clip` 可能漏管未采样动作全局分布漂移的问题，用 entropy ratio 对探索强度变化施加双向约束。
- 后训练策略学习：以 `InstructGPT (2022)` 的 `SFT -> reward model -> RLHF` 作为历史基线；`PPO` 仍是关键 on-policy 基线，`DPO` 与 `GRPO` 分别沿“偏好对齐流程简化”和“推理任务资源效率”改写该基线，`OPD` 则用 `on-policy` 采样结合 `dense` 教师监督。
- Prompt Optimization：覆盖从离散搜索到文本梯度，再到合成反馈驱动的闭环优化；`SIPDO` 当前作为闭环 prompt 优化代表线索。

### Cross-Axis Themes

- 长上下文注意力工程可拆为两条主线：`KV cache` 体积优化（如 `GQA/MLA`）与注意力计算模式优化（如 `SWA/Sparse/Hybrid`）。注意力变体需区分机制层与架构层：`MHA/GQA/MLA/SWA/DeepSeek Sparse/Gated` 属于机制或模块改造，`Hybrid` 属于层级编排模式。
- `KV cache` serving 优化应分阶段推进：先做架构降体积，再做缓存系统管理，最后做低比特压缩。在线 serving 中 decode 阶段常见瓶颈是内存带宽，因此内存流量与缓存生命周期应作为一线指标；前缀复用与分页分配是并发场景下降低 TTFT、提升吞吐的高 ROI 手段。
- `DeepSeek-V4 (2026-04-24)` 主线可归纳为“`CSA/HCA` + `mHC` + `Muon` + `KV/FP4/OPD` 基建协同”，其工程目标是把 `1M context` 从展示能力推向常态化能力。
- `Hybrid Attention` 在现有来源中存在口径分化：既可指 attention 与非-attention 的层级混排，也可指 attention 家族内部的多机制交错编排；后续引用时应显式说明语境。
- `ERC` 与 `full-vocabulary reverse KL` 不能混为一类：前者是 `RL` 更新约束，后者是 `OPD` 分布级蒸馏目标。`full-vocabulary reverse KL` 可视为 `OPD` 稳定性增强的目标函数细化，但代价是系统实现复杂度上升。
- 测试时扩展（TTS）与 agent 记忆可形成正向飞轮（MaTTS）：记忆引导扩展探索，扩展轨迹反馈更高质量记忆。

## Open Questions

- 在上线前，是否需要用业务域质量指标验证 TurboQuant 风格超低比特 KV（2-bit/3-bit）？
- 针对个人知识学习流程，费米-费曼闭环相较纯阅读流程的效率提升幅度是否可被量化验证？
- 在同一训练配方与数据下，`GQA`、`MLA`、`Hybrid` 的质量/吞吐/显存对比是否会改变当前跨模型综述结论？
- `Parallel-Probe` 一类预算控制策略在业务数据上的阈值敏感性如何，是否存在准确率回退点与任务类型依赖？
- `SIPDO` 的难度递进策略在不同任务上的最优调度是否稳定，还是需要按任务族重新标定？
- `Reasoning Shift` 在代码 Agent 与工具调用任务上是否同样显著，触发阈值（上下文长度/并发子任务数）如何量化？
- `OPD` 在当前业务任务上的真实成本/收益拐点在哪里（教师模型规模、batch 结构、上下文长度）？
- 在当前任务分布下，`PPO`、`DPO`、`GRPO` 的最优切换条件是什么（数据质量、在线采样成本、显存预算）？
- `ERC` 在当前业务任务上对 entropy 漂移、loss 波动与最终质量的真实收益是否独立于作者实验栈成立？
- `CSA/HCA` 的压缩率与 `top-k` 在不同任务族（精确引用、跨文档检索、agent 工具链）上的质量回退阈值分别是多少？
- `on-disk KV` 的三种 `SWA` 缓存策略在当前 SSD 与请求分布下，最佳的“存储开销 vs 重计算”折中点在哪里？
- “认知分化”相关判断在教育、编程、医疗咨询等场景是否可被量化观测（提问质量、复查行为、误判率）？
- ReasoningBank 的 append-only 记忆整合策略在长时间积累后是否会产生记忆冲突或质量退化？
- MaTTS 并行扩展因子 $k$ 的最优值是否随任务类型（导航型 vs 工具调用型）显著变化？
- 在工具调用密集型 agent（而非 WebArena 导航型）上，ReasoningBank 的失败反事实信号是否同样有效？
