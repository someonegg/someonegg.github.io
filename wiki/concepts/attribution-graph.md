---
id: concept-attribution-graph
type: concept
updated_at: 2026-06-18
source_refs:
  - "[[sources/2025-03-27-anthropic-circuit-tracing]]"
  - "[[sources/2026-05-17-machine-heart-llm-language-thinking]]"
---

# Attribution Graph

## Taxonomy

- Belongs to: [[concepts/llm-mechanistic-interpretability]]
- Role: 描述特定 prompt 上模型内部计算路径的图结构。

## Definition

- `Attribution Graph` 是一种有向计算图，用于表示输入 token、活跃特征、重构误差和输出 logits 之间的贡献关系。

## Mechanism

- 节点可代表活跃特征、输入 token embedding、误差项和目标输出。
- 边代表节点间线性影响或贡献路径。
- 图通常需要剪枝，只保留对目标 token 输出贡献较大的节点和边，以便人工解释和机制验证。

## Evidence

- Anthropic `Circuit Tracing` 把 attribution graph 作为研究特定 prompt 计算路径的主要对象，并用扰动实验验证部分 graph 机制。[[sources/2025-03-27-anthropic-circuit-tracing]]
- 机器之心综合文将 attribution graph 作为 `CLT` 后的回路分析方法，用于解释 LLM 内部知识表示和计算机制。[[sources/2026-05-17-machine-heart-llm-language-thinking]]

## Limits

- attribution graph 依赖底层 replacement model 和剪枝策略，图的可解释性不等于完整机制忠实。
- 对长上下文和复杂链式推理，当前 graph 解释仍面临规模和人工理解成本问题。

## Related Concepts

- dependency: [[concepts/cross-layer-transcoder]]
- complement: [[concepts/function-token-hypothesis]]
- application: [[concepts/reasoning-shift]]

