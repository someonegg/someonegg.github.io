---
id: concept-neural-network-superposition
type: concept
updated_at: 2026-06-18
source_refs:
  - "[[sources/2022-09-21-toy-models-of-superposition-paper]]"
  - "[[sources/2026-05-17-machine-heart-llm-language-thinking]]"
---

# Neural Network Superposition

## Taxonomy

- Belongs to: [[concepts/llm-mechanistic-interpretability]]
- Role: 解释神经网络 polysemanticity 与特征压缩的基础机制假说。

## Definition

- `Superposition` 指模型在表示维度有限、特征稀疏的条件下，把多于神经元/维度数量的特征叠加编码在共享表示空间中。

## Mechanism

- 若每个输入只激活少量特征，模型可以用近似正交或低干扰方向把大量特征压缩到较少维度中。
- 代价是单个神经元可能参与多个概念，形成 polysemanticity，使直接“读神经元”难以得到稳定语义。
- 这解释了为什么后续需要 `SAE` 等稀疏分解方法把叠加表示“解压”为更可解释的特征。

## Evidence

- `Toy Models of Superposition` 在 toy model 中展示 polysemanticity 可以由稀疏特征的 superposition 产生，并观察到 phase change 与高维几何联系。[[sources/2022-09-21-toy-models-of-superposition-paper]]
- 机器之心综合文将 superposition 作为 LLM 内部机制解释的第一环，用于连接神经元表征与特征可解释性。[[sources/2026-05-17-machine-heart-llm-language-thinking]]

## Limits

- toy model 证明的是可控环境中的机制可行性，不等于生产级 LLM 的所有 polysemanticity 都由同一机制解释。
- `Superposition` 主要解释“表示如何压缩”，不直接解释“特征如何跨层计算并生成输出”。

## Related Concepts

- dependency: [[concepts/sparse-autoencoder-interpretability]]
- complement: [[concepts/cross-layer-transcoder]]

