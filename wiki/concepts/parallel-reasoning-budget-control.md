---
id: concept-parallel-reasoning-budget-control
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-parallel-probe-paper
  - sources/2026-04-14-parallel-probe-wechat-report
---

# Parallel Reasoning Budget Control

## Taxonomy

- Belongs to: [[concepts/reasoning-phase-optimization]]
- Role: 并行推理阶段的在线预算控制技术。

## Definition

- 一种面向在线并行推理的预算分配方法：在推理进行中，基于全局分支信号动态调整“深度（何时停止）”与“宽度（保留哪些分支）”。

## Core Mechanisms

- Consensus-based Early Stopping：当多数答案在连续探测周期内稳定时，提前终止整组并行推理，减少长尾深度开销。
- Deviation-based Branch Pruning：当某分支与当前全局趋势偏差过大时提前裁剪，减少低价值宽度开销。

## Why it matters

- 对并行推理而言，“并行越多越好”并不稳定成立；预算控制可把算力从长尾和异常分支转移到高价值路径。
- 该范式属于 test-time 控制层，不要求重新训练底层模型（结论日期：2026-02-03）。

## Implementation Notes

- 关键调参面包括：探测周期、共识稳定窗口、偏差阈值、最小保留分支数。
- 评估时需同时看三项指标：准确率、P95/P99 延迟、总 token 成本，避免单指标误导。

## Limits

- 不同任务的“共识稳定速度”差异较大，统一阈值可能导致过早停止或误剪枝。
- 与采样温度、分支初始化策略、推理引擎实现存在交互，需要在目标业务负载上做 A/B 验证。

## Related Concepts

- complement: [[concepts/kv-cache-serving-optimization]]
