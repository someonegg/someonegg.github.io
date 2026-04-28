---
id: concept-memory-aware-test-time-scaling
type: concept
updated_at: 2026-04-28
source_refs:
  - "[[sources/2026-04-28-google-reasoningbank]]"
---

# Memory-Aware Test-Time Scaling (MaTTS)

## Definition

- 将 agent 记忆（ReasoningBank）与测试时扩展（TTS）显式关联的框架：扩展探索产生更丰富的学习信号，高质量记忆则引导扩展走向更有前景的策略，形成正向飞轮。

## Taxonomy

Belongs to: [[concepts/reasoning-phase-optimization]]

## Two Scaling Forms

### 并行扩展（Parallel Scaling）
- Agent 在记忆引导下对同一查询生成 $k$ 条不同轨迹。
- 通过自对比（self-contrast），比较成功与虚假推理轨迹，提炼鲁棒策略并合成更高质量记忆。

### 序列扩展（Sequential Scaling）
- Agent 在单条轨迹内迭代精炼推理，产生强中间依据（intermediate reasoning evidence）。
- ReasoningBank 捕获 agent 试错与逐步改进过程中的洞见作为高质量记忆项。

## Synergy Mechanism

高质量记忆 → 引导扩展探索 → 更丰富学习信号 → 更智能记忆 → 进一步提升。

现有 TTS 方法通常丢弃探索轨迹；MaTTS 将这些轨迹视为核心学习数据来源。

## Evidence

- 在 WebArena 上，ReasoningBank + MaTTS（并行 k=5）相比仅 ReasoningBank：成功率再 +3%，步骤减少 0.4 步（截至 2026-04-21）。
- 见：[[sources/2026-04-28-google-reasoningbank]]

## Uncertainty

- 最优并行因子 $k$ 与任务类型的依赖关系尚未量化（截至 2026-04-21）。

## Related Concepts

- dependency: [[concepts/reasoning-bank]]（MaTTS 以 ReasoningBank 为核心记忆组件）
- complement: [[concepts/parallel-reasoning-budget-control]]（同为并行推理扩展，前者目标是积累记忆，后者目标是控制预算与停止策略）
- application: [[concepts/agent-memory]]（MaTTS 是 agent 记忆的扩展应用路径）
