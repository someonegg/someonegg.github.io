---
id: concept-reasoning-bank
type: concept
updated_at: 2026-04-28
source_refs:
  - sources/2026-04-28-google-reasoningbank
---

# ReasoningBank

## Definition

- 一种结构化 agent 记忆框架，从成功与失败经验中蒸馏可迁移的高层推理模式，用于测试时自我进化（test-time self-evolving）。

## Taxonomy

Belongs to: [[concepts/agent-memory]]

## Structure

每条记忆项（Memory Entry）包含：
- **Title**：核心策略的简洁概括
- **Description**：该记忆项的简短说明
- **Content**：从过去经验中提取的推理步骤、决策依据或操作洞见

## Workflow

记忆工作流在"检索 → 行动 → 自评估 → 提取"闭环中持续运行：
1. **检索（Retrieve）**：采取行动前从 ReasoningBank 召回相关记忆
2. **行动（Interact）**：与环境交互，生成轨迹
3. **自评估（Self-Judge）**：LLM-as-a-judge 评估轨迹质量；对判断噪声有较强鲁棒性
4. **提取（Extract）**：将轨迹中的工作流与可泛化洞见蒸馏为新记忆追加入库

## Key Property: Learning from Failure

- 主动分析失败经验以获取反事实信号与陷阱，构建预防性策略护栏。
- 示例：从失败中学到"在尝试加载更多结果前，先验证当前页面标识符，以避免无限滚动陷阱"（而非仅记录"点击加载更多"这类程序性规则）。

## Emergent Behavior

- 随 agent 积累更多经验，简单程序清单逐渐演化为含组合性、预防性逻辑结构的高级记忆（策略成熟度涌现现象，截至 2026-04-21 在 WebArena 上观察到）。

## Evidence

- Gemini-2.5-Flash + ReAct，WebArena：+8.3% vs Vanilla ReAct；SWE-Bench-Verified：+4.6%，节省约 3 步/任务。
- 见：[[sources/2026-04-28-google-reasoningbank]]

## Related Concepts

- complement: [[concepts/memory-aware-test-time-scaling]]（MaTTS 利用 ReasoningBank 放大扩展信号，反向提升记忆质量）
- contrast: [[concepts/on-policy-distillation]]（前者在推理阶段记忆积累，后者在训练阶段用在线轨迹蒸馏参数）
- dependency: [[concepts/agent-memory]]（ReasoningBank 是 agent-memory 的具体实例）
