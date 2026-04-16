---
id: concept-reasoning-phase-optimization
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-parallel-probe-paper
  - sources/2026-04-14-parallel-probe-wechat-report
  - sources/2026-04-14-harness-reasoning-shift-wechat
---

# Reasoning Phase Optimization

## Definition

- 面向推理阶段（test-time）的优化方法集合，目标是在准确率可接受前提下，同时改进时延与 token 成本。

## Scope

- 关注对象是 test-time 的推理过程控制与资源分配（如预算控制、分支管理、停止策略、缓存与调度协同）。
- 不包含模型参数训练本身的优化（如预训练配方或权重结构改造）。

## Sub-concepts

- [[concepts/parallel-reasoning-budget-control]]：通过共识早停与偏差剪枝联合控制并行推理的深度与宽度预算。
- [[concepts/reasoning-shift]]：上下文拥挤导致“答案后验证”收缩的机制假设。
- [[concepts/attention-compute-pattern-optimization]]：注意力机制与架构层的推理优化分类。
- [[concepts/kv-cache-serving-optimization]]：`KV cache` 与 serving 系统层的推理优化分类。

## Notes

- 这是分类层概念页，后续可继续纳入推理阶段的其它优化技术（并行与非并行）。

## Related Concepts

- contrast: [[concepts/agent-runtime-reliability-primitives]]
- application: [[concepts/prompt-optimization]]
