---
id: concept-model-architecture-and-efficiency
type: concept
updated_at: 2026-07-23
source_refs:
  - "[[sources/2026-04-14-visual-attention-variants]]"
  - "[[sources/2026-04-14-gated-attention-llms-paper]]"
  - "[[sources/2026-04-14-deepseek-v3-2-paper]]"
  - "[[sources/2026-04-24-deepseek-v4-paper]]"
  - "[[sources/2026-07-20-machine-heart-hils-attention-wechat]]"
---

# Model Architecture and Efficiency

## Definition

- 面向模型结构内生效率的上位分类，关注通过 attention、表示压缩、连接结构或其它架构机制改变计算量、内存占用、可扩展长度与质量边界。

## Scope

- 包含需要在模型结构或权重中实现的机制，以及与这些机制配套的训练路径。
- 不包含纯训练优化器与数值稳定化方法；这些内容归入 [[concepts/training-stability-and-optimization]]。
- 不包含不改变模型语义计算图的纯 serving、缓存调度与存储策略；这些内容归入 [[concepts/kv-cache-serving-optimization]]。
- 架构机制在 test-time 的效果与使用方式，通过横向关系连接 [[concepts/reasoning-phase-control]]，不将架构本体归入推理期控制。

## Sub-concepts

- [[concepts/attention-compute-pattern-optimization]]：通过注意力机制与层级编排改变长上下文计算、缓存访问和质量权衡。

## Related Concepts

- complement: [[concepts/training-stability-and-optimization]]
- complement: [[concepts/kv-cache-serving-optimization]]
- application: [[concepts/reasoning-phase-control]]
