---
id: concept-cross-layer-transcoder
type: concept
updated_at: 2026-06-18
source_refs:
  - "[[sources/2025-03-27-anthropic-circuit-tracing]]"
  - "[[sources/2026-05-17-machine-heart-llm-language-thinking]]"
---

# Cross-Layer Transcoder

## Taxonomy

- Belongs to: [[concepts/llm-mechanistic-interpretability]]
- Role: 用于跨层 circuit tracing 的稀疏替代模型组件。

## Definition

- `Cross-Layer Transcoder`（CLT）是一类用于可解释性分析的模型组件：从某层 residual stream 读入稀疏特征，并写入原模型后续多个 MLP 层的重构输出。

## Mechanism

- CLT 特征在其所属层读入 residual stream。
- 每个特征可以贡献到当前层及后续层 MLP 输出的重构。
- 训练目标通常结合重构误差和稀疏性惩罚，使 CLT 既能近似原模型组件行为，又保留可解释 feature 单元。

## Evidence

- Anthropic `Circuit Tracing` 将 CLT 用作 replacement model 的关键组件，并据此构造 attribution graph。[[sources/2025-03-27-anthropic-circuit-tracing]]
- 机器之心综合文将 CLT 定位为跨层回路分析工具，补足单层 `SAE` 难以追踪特征传播的局限。[[sources/2026-05-17-machine-heart-llm-language-thinking]]

## Limits

- CLT 是对原模型部分计算的近似替代，不保证自然使用与原模型完全一致的机制。
- 需要通过扰动实验、输出一致性和 graph validation 来评估机制忠实度。

## Related Concepts

- complement: [[concepts/sparse-autoencoder-interpretability]]
- application: [[concepts/attribution-graph]]

