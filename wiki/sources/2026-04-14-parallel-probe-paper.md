---
id: source-2026-04-14-parallel-probe-paper
type: source
updated_at: 2026-04-14
source_refs: []
---

# Parallel-Probe: Towards Efficient Parallel Thinking via 2D Probing (2026-04-14)

## Source Metadata

- Title: `Parallel-Probe: Towards Efficient Parallel Thinking via 2D Probing`
- Author: `Tong Zheng et al.`
- Publisher: `arXiv`
- Published date: 2026-02-03
- Ingest date: 2026-04-14
- Original path:
  - `llm-wiki/raw/2026-04-14-arxiv-2602-03845-parallel-probe.pdf`
  - `llm-wiki/raw/2026-04-14-arxiv-2602-03845-parallel-probe.json`
- Original URL: `https://arxiv.org/abs/2602.03845`

## Facts (from source)

- 论文提出 `2D probing` 接口，用于在在线并行推理中周期性读取各分支中间答案，观察“宽度-深度”动态。
- 论文给出三类关键现象：`width-depth` 非单调缩放、分支长度异质性显著、全局共识常早于全部分支结束。
- 方法 `Parallel-Probe` 为 training-free 控制器，包含两项机制：
  - `consensus-based early stopping`
  - `deviation-based branch pruning`
- 论文报告相对标准多数投票，在其实验设定下 sequential tokens 最高降低 `35.8%`，总 token 成本降低 `25.8%`，并保持有竞争力的准确率。

## Method / Evidence Details

- 深度控制：通过连续轮次共识稳定性判定是否提前停止整组推理。
- 宽度控制：通过监控分支与当前全局趋势偏差，裁剪疑似低价值分支。
- 结果定位：强调“质量-成本-延迟”三者 Pareto 前沿改进，而非只优化单指标。

## Viewpoints (author position)

- 立场 1：并行推理优化不应只看局部轨迹信号，应利用全局分支动态。
- 立场 2：在线 test-time scaling 的核心不是“更多并行分支”，而是“可控分配宽度与深度预算”。

## Uncertainty / Limits

- 当前结论依赖论文中的数据集、模型与控制阈值设定，外推到其他任务需二次验证。
- 该方法本质是控制策略层改造，效果会受基础采样策略与推理栈实现影响。

## Extracted Conclusions (dated)

- 截至 2026-02-03，`Parallel-Probe` 提供了不改模型参数的在线并行推理预算控制范式（宽度剪枝 + 深度早停）。
- 截至 2026-02-03，在论文实验设定下该范式可显著降本降时延，但准确率保持情况需结合具体业务任务复核。
