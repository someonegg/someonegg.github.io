---
id: concept-forkable-checkpoint
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-agent-infra-production-primitives
---

# Forkable Checkpoint

## Taxonomy

- Belongs to: [[concepts/agent-runtime-reliability-primitives]]
- Role: 中断后精确续跑与分叉执行的状态封装原语。

## Definition

- 把 Agent 执行状态建模为可分叉搜索图中的节点快照，而非只能线性回放的单链状态。

## Checkpoint Closure

- checkpoint 至少包含模型输出、tool 输出与 effect log 游标。
- 每个分支维护独立快照，故障后可在精确节点 fork 继续，而不必从任务起点全量重跑。

## Operational Implication

- 该机制将“故障恢复”从粗粒度重试改为细粒度续跑，降低重复副作用和恢复时延风险。

## Why it matters

- 在来源提出的三条原语中，它承担“语义正确恢复”的执行承载层（结论日期：2026-03-05）。

## Related Concepts

- dependency: [[concepts/effect-log]]
- dependency: [[concepts/resumability-over-uptime]]
