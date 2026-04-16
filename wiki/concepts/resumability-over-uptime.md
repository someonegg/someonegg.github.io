---
id: concept-resumability-over-uptime
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-agent-infra-production-primitives
---

# Resumability over Uptime

## Taxonomy

- Belongs to: [[concepts/agent-runtime-reliability-primitives]]
- Role: Agent 运行时可靠性评价目标的定义原则。

## Definition

- 在长程 Agent 场景中，把“中断后语义正确恢复能力”作为核心可靠性目标，而非仅追求不中断运行时间。

## Reliability Shift

- 旧目标：尽量不崩（`Uptime` 叙事）。
- 新目标：允许崩溃但可正确恢复（`Resumability` 叙事）。

## Candidate Metrics

- 恢复耗时。
- 恢复成功率。
- 重复副作用率。

## Why it matters

- 对高权限、长链路且概率决策的 Agent，单次成功率无法覆盖失败后的语义风险面（结论日期：2026-03-05）。

## Related Concepts

- dependency: [[concepts/effect-log]]
- dependency: [[concepts/forkable-checkpoint]]
