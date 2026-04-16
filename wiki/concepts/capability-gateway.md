---
id: concept-capability-gateway
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-agent-infra-production-primitives
---

# Capability Gateway

## Taxonomy

- Belongs to: [[concepts/agent-runtime-reliability-primitives]]
- Role: Agent 执行权限边界与能力暴露控制原语。

## Definition

- 将 Agent 能力调用统一收口到基础设施网关层，在网关内实施最小权限、短时凭证与即时撤销策略。

## Core Controls

- 不向 Agent 直接暴露长期密钥或高权限固定凭证。
- 通过网关按动作范围签发短期 token，并绑定资源边界与生存时间。
- 异常或中断时可在控制面快速失效 token，降低横向扩散风险。

## Threat-model Mapping

- 该机制对应“输入不可信但持有真实权限”的执行场景，把权限约束从模型行为层下沉到基础设施强制层。

## Why it matters

- 在来源观点中，这是 Agent 从“默认可信执行”迁移到“能力受控执行”的关键切面（结论日期：2026-03-05）。

## Related Concepts

- dependency: [[concepts/effect-log]]
- dependency: [[concepts/forkable-checkpoint]]
