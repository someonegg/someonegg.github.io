# Overview

## Current Status

- Source pages: 19
- Entity pages: 15
- Concept pages: 43
- Persisted query pages: 2

## Active Themes

- KV cache 优化应分阶段推进：先做架构降体积，再做缓存系统管理，最后做低比特压缩。
- 在线 serving 中 decode 阶段常见瓶颈是内存带宽，因此内存流量与缓存生命周期应作为一线指标。
- 前缀复用与分页分配是并发场景下降低 TTFT、提升吞吐的高 ROI 手段。
- 在学习与决策场景中，可把 `Fermi Estimation`（外部问题建模）与 `Feynman Technique`（内部理解校验）组合成迭代闭环。
- 长上下文注意力路线可拆为两条主轴：`KV cache` 体积优化（如 `GQA/MLA`）与注意力计算模式优化（如 `SWA/Sparse/Hybrid`）。
- 注意力变体应区分“机制层”和“架构层”：`MHA/GQA/MLA/SWA/DeepSeek Sparse/Gated` 属于机制或模块改造，`Hybrid` 属于层级编排模式。
- 在线并行推理可作为独立预算控制问题处理：用全局信号同时调度深度（早停）与宽度（剪枝），优先减少长尾无效计算。
- `Concept` 关系可按“上位分类（Taxonomy）+ 横向关系（Related Concepts）”双轨组织，降低后续扩展时的结构漂移。
- 当前已形成四条主分类轴：推理阶段优化、Agent 运行时可靠性原语、学习与思维方法、媒介理论与 AI。
- 新增“训练稳定性与优化”分类轴，用于组织 `mHC`、`Muon` 等训练内稳定化机制，并与推理阶段优化分层。
- `Prompt Optimization` 可独立为一条方法学主线：从离散搜索到文本梯度，再到合成反馈驱动的闭环优化。
- 新增后训练策略学习主线：`OPD` 可理解为 `on-policy` 采样与 `dense` 教师监督的结合，目标是同时降低复合错误风险与训练成本。
- `PPO` 仍是 post-training policy learning 的关键基线；`DPO` 与 `GRPO` 分别沿“偏好对齐流程简化”和“推理任务资源效率”两个方向改写该基线。
- 在 `OPD` 路线里，`full-vocabulary reverse KL` 可视为稳定性增强的目标函数细化：代价是系统实现复杂度上升。
- `InstructGPT (2022)` 仍可作为 LLM 对齐历史基准线：定义了 `SFT -> reward model -> RLHF` 的主流工程流程。
- 现已补齐 `RLHF` 独立概念页，用于统一承载“偏好监督 -> 奖励建模 -> 策略优化”的定义与与 `PPO/DPO/OPD` 的关系边界。
- `DeepSeek-V4 (2026-04-24)` 主线可归纳为“`CSA/HCA` + `mHC` + `Muon` + `KV/FP4/OPD` 基建协同”，其工程目标是把 `1M context` 从展示能力推向常态化能力。
- `Hybrid Attention` 在现有来源中出现口径分化：既可指 attention 与非-attention 的层级混排，也可指 attention 家族内部的多机制交错编排。
- 面向生产级 Agent，应把“语义正确恢复”视作基础可靠性能力，并以 `Effect Log -> Capability Gateway -> Forkable Checkpoint` 作为建设顺序。
- 对长程高权限 Agent，单看 `Uptime` 或一次成功率不足以覆盖风险，需单独跟踪 `Resumability` 指标。
- 新增机制线索：长上下文退化可能包含“答案后验证收缩（Reasoning Shift）”，工程上需补充复查触发与拥挤度监控。
- 新增媒介理论分析主线：可用“媒介即讯息/延伸与截肢/冷热媒介/后视镜/四联体”解释 AI 对认知结构与社会分层的影响路径。

## Open Questions

- 在上线前，是否需要用业务域质量指标验证 TurboQuant 风格超低比特 KV（2-bit/3-bit）？
- 针对个人知识学习流程，费米-费曼闭环相较纯阅读流程的效率提升幅度是否可被量化验证？
- 在同一训练配方与数据下，`GQA`、`MLA`、`Hybrid` 的质量/吞吐/显存对比是否会改变当前跨模型综述结论？
- `Parallel-Probe` 一类预算控制策略在业务数据上的阈值敏感性如何，是否存在准确率回退点与任务类型依赖？
- `SIPDO` 的难度递进策略在不同任务上的最优调度是否稳定，还是需要按任务族重新标定？
- 在当前业务栈中，`Effect Log` 四类 tool 语义（纯读/幂等写/不可逆写/读写混合）应如何映射到现有接口目录？
- `Capability Gateway` 的 token 生命周期与撤销策略是否会对跨系统调用链引入显著延迟或运维复杂度？
- `Reasoning Shift` 在代码 Agent 与工具调用任务上是否同样显著，触发阈值（上下文长度/并发子任务数）如何量化？
- `OPD` 在当前业务任务上的真实成本/收益拐点在哪里（教师模型规模、batch 结构、上下文长度）？
- 在当前任务分布下，`PPO`、`DPO`、`GRPO` 的最优切换条件是什么（数据质量、在线采样成本、显存预算）？
- `CSA/HCA` 的压缩率与 `top-k` 在不同任务族（精确引用、跨文档检索、agent 工具链）上的质量回退阈值分别是多少？
- `on-disk KV` 的三种 `SWA` 缓存策略在当前 SSD 与请求分布下，最佳的“存储开销 vs 重计算”折中点在哪里？
- “认知分化”相关判断在教育、编程、医疗咨询等场景是否可被量化观测（提问质量、复查行为、误判率）？
