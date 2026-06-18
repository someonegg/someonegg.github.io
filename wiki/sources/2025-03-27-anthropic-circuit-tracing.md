---
id: source-2025-03-27-anthropic-circuit-tracing
type: source
updated_at: 2026-06-18
source_refs: []
---

# Anthropic: Circuit Tracing

## Source

- Title: Circuit Tracing: Revealing Computational Graphs in Language Models
- Organization: Anthropic / Transformer Circuits Thread
- Published: 2025-03-27
- URL: https://transformer-circuits.pub/2025/attribution-graphs/methods.html
- Companion overview: https://www.anthropic.com/research/tracing-thoughts-language-model

## Summary

- 该研究提出一种 tracing 方法，用更可解释的 replacement model 替代原模型中的部分组件，并生成 attribution graph 来描述特定 prompt 上的计算路径。
- 方法核心包括：用 cross-layer transcoder 抽取跨层特征、构造局部 replacement model、冻结部分非线性因素、在线性化图中追踪特征到输出 token 的贡献路径。
- 论文将 attribution graph 作为主要研究对象，并通过扰动实验检查 graph 机制与原模型响应变化是否一致。

## Key Claims

- `CLT` 让特征从某层 residual stream 读入，并写入后续多个 MLP 层的重构输出，从而减少跨层追踪中的重复特征问题。
- attribution graph 的节点可以代表活跃特征、输入 token embedding、重构误差和输出 logits；边代表节点之间的线性影响。
- 该方法可用于分析事实召回、加法、跨语言共享概念、规划、幻觉、越狱等行为，但仍只能捕捉总计算的一部分。

## Evidence Type

- Anthropic 一手方法论文。
- 证据包括方法定义、替代模型评估、归因图案例和扰动验证。

## Limits

- replacement model 可能使用与原模型不同的机制，因此 attribution graph 需要通过扰动实验验证。
- 方法当前仍依赖人工解释，且短 prompt 场景下也只解释部分计算；复杂长链推理仍需要更强自动化和更完整机制覆盖。

## Derived Concepts

- [[concepts/cross-layer-transcoder]]
- [[concepts/attribution-graph]]
- [[concepts/llm-mechanistic-interpretability]]

