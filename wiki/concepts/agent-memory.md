---
id: concept-agent-memory
type: concept
updated_at: 2026-04-28
source_refs:
  - "[[sources/2026-04-28-google-reasoningbank]]"
---

# Agent Memory

## Definition

- 面向长期运行 Agent 的记忆机制集合：将过去交互经验（成功与失败）以结构化形式持久化，用于指导未来任务中的决策与行动。

## Scope

- 关注对象是 Agent 在部署后如何持续积累、检索与更新经验性知识。
- 不包含模型参数层面的持久化（如 fine-tuning），专注 inference-time 的知识复用机制。

## Key Distinctions

- **轨迹记忆（Trajectory Memory）**（如 Synapse）：保存完整动作序列，细节丰富但难以提炼高层推理模式。
- **工作流记忆（Workflow Memory）**（如 AWM）：从成功经验归纳操作流程，忽略失败经验的反事实信号。
- **推理记忆（Reasoning Memory）**（如 ReasoningBank）：从成功与失败中蒸馏可迁移的高层推理模式，以结构化记忆项（Title + Description + Content）存储。

## Sub-concepts

- [[concepts/reasoning-bank]]：从成功与失败经验中蒸馏结构化推理模式的 agent 记忆框架。

## Related Concepts

- complement: [[concepts/agent-runtime-reliability-primitives]]（前者关注经验积累，后者关注执行可靠性）
- complement: [[concepts/memory-aware-test-time-scaling]]（记忆驱动的测试时扩展，与记忆质量形成正向飞轮）
- contrast: [[concepts/reasoning-phase-optimization]]（前者跨任务持久化经验，后者优化单次推理内的资源分配）
