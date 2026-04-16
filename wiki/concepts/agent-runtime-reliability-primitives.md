---
id: concept-agent-runtime-reliability-primitives
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-agent-infra-production-primitives
---

# Agent Runtime Reliability Primitives

## Definition

- 面向生产级 Agent 运行时可靠性的基础原语集合，关注权限边界、副作用可恢复与中断续跑。

## Sub-concepts

- [[concepts/effect-log]]：副作用事实层与恢复重放语义。
- [[concepts/capability-gateway]]：能力调用网关与最小权限约束。
- [[concepts/forkable-checkpoint]]：可分叉执行快照与精确续跑。
- [[concepts/resumability-over-uptime]]：可靠性目标从 uptime 向 resumability 转移。

## Related Concepts

- contrast: [[concepts/reasoning-phase-optimization]]（前者偏执行可靠性，后者偏推理效率）。
