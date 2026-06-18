---
id: source-2025-10-09-function-token-hypothesis-paper
type: source
updated_at: 2026-06-18
source_refs: []
---

# Memory Retrieval and Consolidation in LLMs through Function Tokens

## Source

- Title: Memory Retrieval and Consolidation in Large Language Models through Function Tokens
- Authors: Shaohua Zhang, Yuan Lin, Hang Li
- Published: 2025-10-09
- URL: https://arxiv.org/abs/2510.08203

## Summary

- 论文提出 `Function Token Hypothesis`，用功能词元解释 LLM 中记忆检索与记忆巩固的机制。
- 在推理阶段，功能词元会从上下文中激活最有预测力的特征，并支配下一词元预测。
- 在预训练阶段，预测功能词元之后的内容词元较难，因此这类损失推动模型学习更多特征并更新参数。

## Key Claims

- 功能词元大致对应语言学中的功能词，包括标点、冠词、介词、连词等，与内容词元相对。
- 论文用二部图分析显示，少量功能词元可以激活大部分特征。
- case studies 显示功能词元会根据上下文激活最有预测力的特征，从而引导下一个 token 的生成。
- 训练损失主要受“功能词元之后预测内容词元”的任务主导，这迫使功能词元学会从上下文选择预测性特征。

## Evidence Type

- 一手 arXiv 论文。
- 证据包括训练损失分解、功能词元与特征的二部图分析、上下文检索案例。

## Limits

- 该假说解释的是 LLM 内部记忆巩固/检索的一条机制线索，不应直接等同于完整的语言理解或推理机制。
- 需要与 `SAE`、`CLT`、attribution graph 等工具结合，才能把“特征被激活”进一步连接到跨层回路与具体输出路径。

## Derived Concepts

- [[concepts/function-token-hypothesis]]
- [[concepts/llm-mechanistic-interpretability]]

