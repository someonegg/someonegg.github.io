---
id: concept-reasoning-phase-control
type: concept
updated_at: 2026-07-23
source_refs:
  - "[[sources/2026-04-14-parallel-probe-paper]]"
  - "[[sources/2026-04-14-parallel-probe-wechat-report]]"
  - "[[sources/2026-04-14-harness-reasoning-shift-wechat]]"
  - "[[sources/2026-05-15-reasoning-shift-paper]]"
---

# Reasoning Phase Control

## Definition

- 面向推理阶段（test-time）的行为、退化机制与控制方法集合，关注模型在实际上下文条件下如何分配推理努力、何处发生收缩，以及可用哪些手段进行诊断与干预。

## Scope

- 关注对象是 test-time 的推理过程控制与资源分配（如预算控制、分支管理、停止策略、缓存与调度协同），以及这些条件下出现的系统性行为变化。
- 允许纳入三类子概念：优化方法、退化现象、诊断/控制信号。
- 不包含模型参数训练本身的优化（如预训练配方或权重结构改造）。

## Sub-concepts

- [[concepts/parallel-reasoning-budget-control]]：预算控制方法，用共识早停与偏差剪枝联合调度并行推理的深度与宽度。
- [[concepts/reasoning-shift]]：退化机制，描述上下文拥挤条件下“答案后验证”收缩与推理投入下降。
- [[concepts/kv-cache-serving-optimization]]：系统层优化分类，组织 `KV cache` 与 serving 路径上的推理成本控制。
- [[concepts/memory-aware-test-time-scaling]]：扩展与控制方法，将 agent 记忆与测试时扩展关联，并把探索轨迹反馈为后续行为改进信号。

## Notes

- 这是分类层概念页，不只收纳“怎么优化”，也收纳“会出现什么退化”以及“如何观测/控制”。
- 若后续 failure / mechanism 类型页面显著增多，再考虑从本分类中拆出更细的故障机理轴。

## Related Concepts

- application: [[concepts/prompt-optimization]]
- complement: [[concepts/attention-compute-pattern-optimization]]（模型架构给出能力与成本边界，本页组织 test-time 行为、预算与调度）。
