---
id: concept-attention-compute-pattern-optimization
type: concept
updated_at: 2026-07-23
source_refs:
  - "[[sources/2026-04-14-visual-attention-variants]]"
  - "[[sources/2026-04-14-gated-attention-llms-paper]]"
  - "[[sources/2026-04-14-deepseek-v3-2-paper]]"
  - "[[sources/2026-04-24-deepseek-v4-paper]]"
  - "[[sources/2026-07-20-machine-heart-hils-attention-wechat]]"
---

# Attention Compute Pattern Optimization

## Taxonomy

- Belongs to: [[concepts/model-architecture-and-efficiency]]
- Role: 通过注意力机制与架构编排改变训练、推理及长上下文扩展成本的结构优化分类。

## Definition

- 面向注意力模块本身的结构优化集合，核心是通过机制或架构改造降低训练与推理中的长上下文成本，并尽量维持质量。

## Sub-concepts

- [[concepts/multi-head-attention]]：标准基线机制。
- [[concepts/grouped-query-attention]]：共享 K/V 头的降本机制。
- [[concepts/multi-head-latent-attention]]：潜在表示压缩缓存路径。
- [[concepts/sliding-window-attention]]：局部窗口可见性机制。
- [[concepts/deepseek-sparse-attention]]：学习式稀疏选择机制。
- [[concepts/compressed-sparse-attention]]：压缩 KV + top-k 稀疏选择的 DeepSeek-V4 路线。
- [[concepts/heavily-compressed-attention]]：高压缩率的长距离语义主通道。
- [[concepts/gated-attention]]：块内门控稳定性增强机制。
- [[concepts/hybrid-attention-architecture]]：层级混合架构模式。
- [[concepts/hierarchical-landmark-sparse-attention]]：以 landmark chunk summary 与分层 softmax 实现端到端检索学习的稀疏注意力机制。

## Related Concepts

- complement: [[concepts/kv-cache-serving-optimization]]（前者改“算什么/怎么算”，后者改“怎么存/怎么调度”）。
- application: [[concepts/reasoning-phase-control]]（架构机制提供 test-time 能力与成本边界，推理期控制决定如何使用这些能力）。
