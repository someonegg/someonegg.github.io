---
id: concept-function-token-hypothesis
type: concept
updated_at: 2026-06-18
source_refs:
  - "[[sources/2025-10-09-function-token-hypothesis-paper]]"
  - "[[sources/2026-05-17-machine-heart-llm-language-thinking]]"
---

# Function Token Hypothesis

## Taxonomy

- Belongs to: [[concepts/llm-mechanistic-interpretability]]
- Role: 解释 LLM 记忆检索与记忆巩固的功能词元机制假说。

## Definition

- `Function Token Hypothesis` 认为：LLM 中特征的记忆巩固和检索围绕功能词元展开；功能词元在推理中从上下文激活最有预测力的特征，在预训练中通过困难预测任务推动参数更新和特征学习。

## Mechanism

- 功能词元大致对应标点、冠词、介词、连词等高频连接性 token。
- 推理阶段：功能词元根据上下文选择预测性特征，支配下一词元生成。
- 预训练阶段：预测功能词元之后的内容词元通常更难，损失下降更慢，因此成为推动模型学习上下文特征的重要训练压力。

## Evidence

- 论文使用训练损失分解、功能词元与特征的二部图分析和 case studies 支持该假说。[[sources/2025-10-09-function-token-hypothesis-paper]]
- 机器之心综合文将该假说纳入 LLM 工作机制解释，强调训练数据格式和功能词元激活模式对后训练能力的潜在影响。[[sources/2026-05-17-machine-heart-llm-language-thinking]]

## Limits

- 该假说解释的是“功能词元如何触发特征检索与巩固”的机制线索，不覆盖全部语言理解、规划或多模态推理机制。
- 若要解释具体输出路径，需要与 `SAE/CLT/Attribution Graph` 等特征与回路工具结合。

## Related Concepts

- complement: [[concepts/sparse-autoencoder-interpretability]]
- complement: [[concepts/attribution-graph]]
- application: [[concepts/post-training-policy-learning]]

