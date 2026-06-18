---
id: source-2022-09-21-toy-models-of-superposition-paper
type: source
updated_at: 2026-06-18
source_refs: []
---

# Toy Models of Superposition

## Source

- Title: Toy Models of Superposition
- Authors: Nelson Elhage, Tristan Hume, Catherine Olsson, Nicholas Schiefer, Tom Henighan, Shauna Kravec, Zac Hatfield-Dodds, Robert Lasenby, Dawn Drain, Carol Chen, Roger Grosse, Sam McCandlish, Jared Kaplan, Dario Amodei, Martin Wattenberg, Christopher Olah
- Published: 2022-09-21
- URL: https://arxiv.org/abs/2209.10652
- Official long-form version: https://transformer-circuits.pub/2022/toy_model/index.html

## Summary

- 论文用可控 toy model 解释 `polysemanticity`：单个神经元会同时响应多个不相关概念，从而增加可解释性难度。
- 作者提出并实验证明一种解释：模型在维度不足但特征稀疏时，会把额外稀疏特征以 `superposition` 方式压缩进同一表示空间。
- 论文还观察到 phase change、与高维几何/多面体结构的联系，以及与 adversarial examples 的潜在关系。

## Key Claims

- `Superposition` 可以解释为何“一个神经元一个概念”的朴素解释经常失败。
- 当特征稀疏、模型表示维度受限时，把多个特征叠加在共享神经元/方向上可能是 loss-minimizing 的表示策略。
- `Superposition` 是后续 `SAE`、dictionary learning 与 monosemantic feature 研究的重要问题背景。

## Evidence Type

- 一手论文。
- 证据来自 toy model 机制实验，优势是可控和可解析；限制是不能自动等同于生产级 LLM 的完整内部机制。

## Derived Concepts

- [[concepts/neural-network-superposition]]
- [[concepts/llm-mechanistic-interpretability]]

