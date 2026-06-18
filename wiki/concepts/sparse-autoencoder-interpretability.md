---
id: concept-sparse-autoencoder-interpretability
type: concept
updated_at: 2026-06-18
source_refs:
  - "[[sources/2024-05-21-anthropic-mapping-mind-language-model]]"
  - "[[sources/2026-05-17-machine-heart-llm-language-thinking]]"
---

# Sparse Autoencoder Interpretability

## Taxonomy

- Belongs to: [[concepts/llm-mechanistic-interpretability]]
- Role: 从 LLM 激活中抽取可解释稀疏特征的工具路线。

## Definition

- `Sparse Autoencoder`（SAE）在 LLM 可解释性中通常用于把某层激活向量编码到更高维、稀疏的特征空间，再从这些特征重构原激活。

## Mechanism

- 编码器把 residual stream 或 MLP 激活映射为稀疏 feature activations。
- 解码器从稀疏特征重构原始激活。
- 训练目标在重构 fidelity 与特征稀疏性之间权衡，使每次输入只激活少量可解释特征。

## Evidence

- Anthropic 2024 报告称在 Claude 3.0 Sonnet 中抽取出数百万个可解释特征，覆盖实体、抽象概念、安全相关行为，并可通过特征干预影响模型输出。[[sources/2024-05-21-anthropic-mapping-mind-language-model]]
- 机器之心综合文将 `SAE` 描述为对 `Superposition` 的“解压”工具，用于把稠密激活还原为高维稀疏特征。[[sources/2026-05-17-machine-heart-llm-language-thinking]]

## Limits

- `SAE` 主要回答“有哪些特征”，不完整回答“这些特征如何连接成计算回路”。
- Anthropic 来源明确指出已发现特征只是模型所学概念的一部分，完整覆盖成本很高。
- 特征自然语言标签可能有解释偏差，仍需行为干预、替代模型和 graph 级证据交叉验证。

## Related Concepts

- dependency: [[concepts/neural-network-superposition]]
- complement: [[concepts/cross-layer-transcoder]]
- application: [[concepts/attribution-graph]]

