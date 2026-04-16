---
id: concept-closed-loop-prompt-optimization
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-sipdo-prompt-optimization-wechat
---

# Closed-Loop Prompt Optimization

## Taxonomy

- Belongs to: [[concepts/prompt-optimization]]
- Role: 通过“生成挑战样本 -> 失败分析 -> prompt 修复 -> 回归验证”循环，持续提升 prompt 的稳健性与适应性。

## Definition

- 一种 failure-driven 的 prompt 优化范式：不把 prompt 视为静态文本，而把它放入可持续评估、修复与验证的循环系统。

## Core Mechanisms

- Synthetic difficulty progression：主动生成并逐级加难的样本，持续暴露当前 prompt 的能力边界。
- Failure slice -> textual patch：把失败模式结构化为可执行修复建议，再写回 prompt。
- Local + global confirmation：先修复当前失败，再在历史样本上做回归检查，抑制性能回退。

## Why it matters

- 相比固定数据集的一次性优化，闭环机制更能应对输入分布变化、边界样本增长与 prompt 脆弱性。
- 该模式把“优化收益”与“回退风险”同时纳入流程，提升可复用性与工程可控性（结论日期：2026-02-27）。

## Limits

- 依赖合成数据质量与难度调度策略；若生成分布偏斜，可能引入偏置或误导修复方向。
- 回归验证会增加迭代开销，需在优化速度与验证覆盖之间做权衡。

## Related Concepts

- application: [[concepts/reasoning-phase-optimization]]
- application: [[concepts/thinking-and-learning-methods]]
