---
id: source-2024-05-21-anthropic-mapping-mind-language-model
type: source
updated_at: 2026-06-18
source_refs: []
---

# Anthropic: Mapping the Mind of a Large Language Model

## Source

- Title: Mapping the Mind of a Large Language Model
- Organization: Anthropic
- Published: 2024-05-21
- URL: https://www.anthropic.com/research/mapping-mind-language-model
- Linked paper: Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet

## Summary

- Anthropic 报告称使用 dictionary learning / sparse autoencoder 方法，从 Claude 3.0 Sonnet 中抽取出数百万个可解释特征。
- 这些特征覆盖实体、编程、抽象概念、安全相关行为等，并可跨语言、跨模态响应。
- 研究通过放大或抑制特征来观察输出变化，以此说明部分特征不只是相关信号，也能因果影响模型行为。

## Key Claims

- Claude 3.0 Sonnet 的内部状态可以被部分表示为少量激活特征的组合，而不是只能直接读取大量 neuron activations。
- 可解释特征包括 Golden Gate Bridge、bugs in code、gender bias、secrecy、sycophancy 等，说明 `SAE` 方法可以扩展到生产级 LLM 的中间层表示。
- 当前方法仍不完整：已发现的特征只覆盖模型所学概念的一小部分，而且“表示是什么”不等于“模型如何使用这些表示”；还需要 circuit 级分析。

## Evidence Type

- Anthropic 官方研究说明，链接到一手论文。
- 证据包括大规模 dictionary learning、特征示例、特征干预实验和安全相关案例。

## Limits

- 来源明确指出当前特征集合不完整，完整覆盖的计算成本可能极高。
- 特征层可解释性不能直接替代回路层解释；需要与 `Circuit Tracing`、`CLT`、attribution graph 结合。

## Derived Concepts

- [[concepts/sparse-autoencoder-interpretability]]
- [[concepts/llm-mechanistic-interpretability]]

