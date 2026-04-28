---
id: source-2026-04-28-google-reasoningbank
type: source
updated_at: 2026-04-28
source_refs: []
---

# ReasoningBank: Enabling Agents to Learn from Experience

## Metadata

- **来源**：Google Research Blog
- **发布时间**：2026-04-21
- **作者**：Jun Yan、Chen-Yu Lee（Google Cloud Research Scientists）及其他贡献者（Siru Ouyang, I-Hung Hsu, Yanfei Chen, Ke Jiang, Zifeng Wang, Rujun Han, Long T. Le, Samira Daruki, Xiangru Tang, Vishy Tirumalashetty, George Lee, Mahsan Rofouei, Hangfei Lin, Jiawei Han, Tomas Pfister）
- **论文**：ICLR《ReasoningBank: Scaling Agent Self-Evolving with Reasoning Memory》（https://arxiv.org/abs/2509.25140）
- **代码**：https://github.com/google-research/reasoning-bank

## Facts

- 现有 agent 记忆方法主要分两类：轨迹记忆（Synapse）保存详细动作序列；工作流记忆（AWM）仅从成功经验归纳流程。
- ReasoningBank 将全局推理模式提炼为结构化记忆，每条记忆项含 Title（简洁概括）+ Description（简短说明）+ Content（可迁移推理步骤）。
- 记忆工作流：检索（retrieve）→ 行动（interact）→ 自评估（LLM-as-a-judge）→ 提取（extract） 形成闭环。
- 失败经验被显式分析以获取反事实信号：agent 不只学"怎么做"，还学"哪些陷阱要避开"。
- LLM-as-a-judge 的自判断对噪声有较强鲁棒性，无需完全准确即可发挥效果。
- 评估基准：WebArena（动态网页导航）和 SWE-Bench-Verified（软件工程），基础模型为 Gemini-2.5-Flash，提示策略为 ReAct。

## Evidence

| 配置 | WebArena 成功率提升（vs Vanilla ReAct） | SWE-Bench-Verified 提升 | 步骤节省 |
|------|--------------------------------------|------------------------|---------|
| ReasoningBank（无扩展） | +8.3% | +4.6% | ~3 步/任务 |
| ReasoningBank + MaTTS（并行 k=5） | 在 ReasoningBank 基础上再 +3% | — | 再减 0.4 步 |

- 随 agent 处理问题增多，记忆从简单程序清单演化为含预防性逻辑的复合策略（策略成熟度涌现）。

## Viewpoints

- 记忆驱动的测试时扩展（MaTTS）代表了"agent 扩展"的新前沿；过去 TTS 方法丢弃探索轨迹，而这些恰是学习信号。
- 并行扩展（多轨迹自对比）与序列扩展（单轨迹迭代精炼）构成两种正交的扩展形式，可与 ReasoningBank 协同形成正向飞轮。
- 失败经验是"最主要的学习来源"，当前主流工作流记忆方法系统性低估了失败的信息价值。

## Uncertainty

- 目前仅在 Gemini-2.5-Flash 上评估，泛化至其它模型或更大规模模型的效果未知（截至 2026-04-21）。
- 提取阶段记忆整合策略目前仅为"追加"（append-only），更复杂的记忆合并与冲突消解留待未来工作。
- 并行扩展因子 k 的最优值与任务类型的依赖关系尚未量化。
- 在工具调用型 agent（而非导航型）上的泛化性尚无直接数据。
