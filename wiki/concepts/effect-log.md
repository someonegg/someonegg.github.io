---
id: concept-effect-log
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-agent-infra-production-primitives
---

# Effect Log

## Taxonomy

- Belongs to: [[concepts/agent-runtime-reliability-primitives]]
- Role: 运行时副作用可追溯与可恢复的事实记录原语。

## Definition

- 面向 Agent 外部副作用的可恢复日志原语，采用“执行前 intent + 执行后 completion”的双记录语义。

## Execution Semantics

- 在副作用发生前记录幂等键、影响范围、审批级别等 intent 元信息。
- 在副作用完成后记录响应、版本指纹、可逆性等 completion 元信息。
- 恢复阶段优先复用已封存结果，避免重复触碰外部系统。

## Replay Policy Surface

- 纯读：可重放。
- 幂等写：可重放，但需由幂等键或网关去重。
- 不可逆写：禁止重放，仅可返回封存结果。
- 读写混合：恢复时禁止重新读取，需基于封存读快照继续。

## Why it matters

- 该原语把“发生了什么”从隐式运行态变成可审计、可恢复的显式事实层（结论日期：2026-03-05）。

## Related Concepts

- dependency: [[concepts/capability-gateway]]
- dependency: [[concepts/forkable-checkpoint]]
