---
id: concept-full-vocabulary-reverse-kl-distillation
type: concept
updated_at: 2026-04-24
source_refs:
  - sources/2026-04-24-deepseek-v4-paper
---

# Full-Vocabulary Reverse KL Distillation

## Taxonomy

- Belongs to: [[concepts/post-training-policy-learning]]
- Role: `OPD` 场景下的全词表分布级蒸馏目标。

## Definition

- 在 `OPD` 中，使用 full-vocabulary logits 计算学生策略到教师策略的 reverse KL，而不是仅在采样 token 上做近似估计。

## Why it matters

- 相比 token-level 近似，该目标保留完整词表分布信息，通常可降低梯度估计方差并提升训练稳定性。
- 在多教师融合时，分布级约束更有利于保留教师行为边界，减少能力合并时的退化风险。

## Evidence Snapshot (dated)

- 截至 2026-04-24，`DeepSeek-V4` 论文明确指出其 `OPD` 采用 full-vocabulary reverse KL，并将此作为稳定性增强手段。
- 同一来源同时给出可扩展工程路径：teacher 权重按需加载、隐藏状态缓存后重建 logits，避免直接物化全部教师 logits 的内存负担。

## Limits

- 该方法对系统实现要求较高（teacher 调度、缓存、I/O 与显存协同）；在工程能力不足时，吞吐与时延可能成为首要约束。
- 当前证据主要来自单组织论文披露，跨组织复现实证仍需补充。

## Related Concepts

- dependency: [[concepts/on-policy-distillation]]
- complement: [[concepts/muon-optimizer]]
- complement: [[concepts/training-stability-and-optimization]]

