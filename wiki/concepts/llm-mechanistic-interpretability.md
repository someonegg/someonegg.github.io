---
id: concept-llm-mechanistic-interpretability
type: concept
updated_at: 2026-06-18
source_refs:
  - "[[sources/2026-05-17-machine-heart-llm-language-thinking]]"
  - "[[sources/2022-09-21-toy-models-of-superposition-paper]]"
  - "[[sources/2024-05-21-anthropic-mapping-mind-language-model]]"
  - "[[sources/2025-03-27-anthropic-circuit-tracing]]"
  - "[[sources/2025-10-09-function-token-hypothesis-paper]]"
---

# LLM Mechanistic Interpretability

## Definition

- 面向 LLM 内部计算机制的可解释性研究集合，目标是把模型行为拆解为可验证的人类可理解组件，例如特征、表示、回路、记忆检索路径和输出贡献路径。

## Scope

- 关注模型内部表示和计算路径：特征如何被表示、如何被激活、如何跨层传播、如何影响输出。
- 不等同于外部 black-box probing，也不等同于 prompt 工程或 serving 工程优化。
- 当前 wiki 中该页作为“内部机制可解释性”上位分类，承接 `Superposition -> SAE -> CLT/Attribution Graph -> Function Token Hypothesis` 这条主线。

## Sub-concepts

- [[concepts/neural-network-superposition]]：解释 polysemanticity 的表示压缩假说。
- [[concepts/sparse-autoencoder-interpretability]]：用稀疏字典学习从激活中抽取可解释特征。
- [[concepts/cross-layer-transcoder]]：用跨层特征重构 MLP 输出，支持跨层 circuit tracing。
- [[concepts/attribution-graph]]：把特定 prompt 上的活跃特征、输入 token、输出 logits 组织为贡献路径图。
- [[concepts/function-token-hypothesis]]：用功能词元解释训练中的记忆巩固与推理中的记忆检索。

## Current Synthesis

- `Superposition` 给出问题背景：神经元与人类概念往往不是一一对应，模型可能在有限维度中叠加表示大量稀疏特征。
- `SAE` 和 dictionary learning 是“找特征”的主要工具，Anthropic 2024 研究显示该方法可扩展到 Claude 3.0 Sonnet 级别，但特征集合仍不完整。
- `CLT` 和 attribution graph 进一步从“有什么特征”推进到“特征如何形成计算路径”，但当前仍受 replacement model 忠实度、人工解释成本和覆盖率限制。
- 功能词元假说补充了训练与推理视角：高频功能词元可能是上下文特征检索和记忆巩固的关键触发点。

## Open Questions

- `SAE/CLT` 抽取到的特征在多模型、多规模、多语言条件下是否稳定可复用？
- attribution graph 的机制忠实度如何系统评估，尤其是在长链推理、工具调用和多轮 agent 任务中？
- 功能词元假说与 `SAE/CLT` 特征空间之间能否建立直接映射，而不仅是概念层互补？
- 机制可解释性结果能否转化为可靠的安全监控、模型 steering 或训练反馈，而不是停留在事后解释？

## Related Concepts

- complement: [[concepts/reasoning-phase-control]]（前者看模型内部机制，后者看 test-time 行为、退化与控制）。
- complement: [[concepts/training-stability-and-optimization]]（前者解释内部表征与回路，后者组织训练过程中的稳定化技术）。
- application: [[concepts/prompt-optimization]]（可解释性可能解释 prompt 为什么触发某些行为，但不是 prompt 优化方法本身）。

