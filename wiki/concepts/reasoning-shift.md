---
id: concept-reasoning-shift
type: concept
updated_at: 2026-05-15
source_refs:
  - "[[sources/2026-05-15-reasoning-shift-paper]]"
  - "[[sources/2026-04-14-harness-reasoning-shift-wechat]]"
---

# Reasoning Shift

## Taxonomy

- Belongs to: [[concepts/reasoning-phase-control]]
- Role: 长上下文场景下推理过程质量退化的机制假设。

## Definition

- 指 reasoning model 在非隔离上下文条件下，对同一问题产生显著更短的 reasoning traces，并伴随自我验证、复查与不确定性管理行为下降的现象；在困难任务上，这种收缩可能带来性能回退。

## Observable Signals

- 在非基线（多子任务、长前缀、多轮上下文）条件下，推理 token 相对干净单任务基线系统性缩短。
- 候选答案首次出现位置近似不变，但“答案后继续检查”概率下降。
- 代表犹豫与复查的语言信号（如 `wait`、`but`、`maybe`）频率下降。

## Evidence Snapshot (dated)

- 截至 2026-04-01，`Reasoning Shift` 一手论文在 `Long input`、`Subtask`、`Multi-turn` 三类场景下报告同题 reasoning trace 最多可压缩约 `50%`，并将其与 `double-checking` 等行为下降关联。
- 截至 2026-04-13，资讯解读来源进一步把这一现象上升为 Agent / `Harness Engineering` 的工程线索，但该外推强于原论文直接证据。

## Why it matters

- 该机制把“长上下文失败”从纯检索问题转向“认知投入预算问题”，直接影响 Agent 的长程稳定性设计。
- 对工程侧意味着仅压缩上下文长度可能不足，还需要显式设计“答案后验证”触发器。

## Limits

- 当前本 wiki 已补入一手论文页，但仍缺少第三方复现实验与更丰富任务覆盖。
- 从数学推理任务到工具密集型代码 Agent 的外推尚未验证。

## Related Concepts

- application: [[concepts/agent-runtime-reliability-primitives]]
- complement: [[concepts/prompt-optimization]]
