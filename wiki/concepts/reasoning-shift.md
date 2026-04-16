---
id: concept-reasoning-shift
type: concept
updated_at: 2026-04-15
source_refs:
  - sources/2026-04-14-harness-reasoning-shift-wechat
---

# Reasoning Shift

## Taxonomy

- Belongs to: [[concepts/reasoning-phase-optimization]]
- Role: 长上下文场景下推理过程质量退化的机制假设。

## Definition

- 指模型在上下文拥挤条件下，保持“找到候选答案”速度近似不变，但减少答案后的自我验证与反思，导致推理深度收缩与准确率下滑。

## Observable Signals

- 在非基线（多子任务、长前缀、多轮上下文）条件下，推理 token 相对干净单任务基线系统性缩短。
- 候选答案首次出现位置近似不变，但“答案后继续检查”概率下降。
- 代表犹豫与复查的语言信号（如 `wait`、`but`、`maybe`）频率下降。

## Why it matters

- 该机制把“长上下文失败”从纯检索问题转向“认知投入预算问题”，直接影响 Agent 的长程稳定性设计。
- 对工程侧意味着仅压缩上下文长度可能不足，还需要显式设计“答案后验证”触发器。

## Limits

- 当前在本 wiki 的证据主要来自资讯解读页（截至 2026-04-14），仍需补充 `Reasoning Shift` 一手论文页与复现实验。
- 从数学推理任务到工具密集型代码 Agent 的外推尚未验证。

## Related Concepts

- application: [[concepts/agent-runtime-reliability-primitives]]
- complement: [[concepts/prompt-optimization]]
