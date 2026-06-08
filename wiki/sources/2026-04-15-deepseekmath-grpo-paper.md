---
id: source-2026-04-15-deepseekmath-grpo-paper
type: source
updated_at: 2026-06-08
source_refs: []
---

# DeepSeekMath 与 GRPO（2024）

## Source Metadata

- Title: `DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models`
- Authors: `Zhihong Shao et al.`
- Publisher: `arXiv`
- Published date: 2024-02-05
- Ingest date: 2026-04-15
- Original path:
  - `llm-wiki/raw/2026-04-15-arxiv-2402-03300-deepseekmath-grpo.md`
- Canonical URL: `https://arxiv.org/abs/2402.03300`

## Facts (from source)

- 论文在 DeepSeekMath 训练中提出 `GRPO (Group Relative Policy Optimization)`，并明确称其为 `PPO` 变体。
- 摘要声明 `GRPO` 的目标之一是提升数学推理能力，同时优化 `PPO` 的内存使用。
- 论文报告 DeepSeekMath 7B 在 MATH 上达到较强结果，并将能力增益归因于数据构建与 `GRPO` 共同作用。
- 正文 4.1 将 `PPO` 的 critic/value function 视为主要内存与计算负担，并指出 LLM 场景中通常只有末 token 由 reward model 给分，这会使逐 token value function 训练更复杂。
- `GRPO` 不再训练额外 value model，而是对同一问题采样一组输出，用组内 reward 平均值作为 baseline，并用组内相对 reward 计算 advantage。
- 论文把 `GRPO` 的 group-relative advantage 与 reward model 的比较式训练数据形态联系起来：reward model 往往比较同一问题的不同输出。
- `GRPO` 不把 KL penalty 加入 reward，而是把训练策略与 reference policy 的 `KL` 直接加入 loss，以减少 advantage 计算的额外复杂度。
- 正文区分三种训练形态：outcome supervision、process supervision、iterative RL with GRPO。
- 在 outcome supervision 中，同一问题的一组输出由 reward model 打分后做组内标准化（减均值、除标准差），并把标准化后的序列级 reward 作为该输出所有 token 的 advantage。
- 在 process supervision 中，process reward model 对每个推理步骤给分，步骤 reward 同样做标准化；token advantage 来自后续步骤标准化 reward 的累积。
- 在 iterative GRPO 中，训练过程会基于当前 policy 采样结果生成新的 reward model 训练集，并用包含 10% 历史数据的 replay 机制持续训练 reward model，再继续训练 policy。
- 论文实验设置中，RL 训练数据来自 GSM8K 与 MATH 的 chain-of-thought 格式 SFT 问题，约 144K 条；policy learning rate 为 `1e-6`，`KL` 系数为 `0.04`，最大长度为 `1024`，训练 batch size 为 `1024`。

## Viewpoints (author position)

- 作者立场是：在推理任务中，奖励建模与优化策略需要与内存成本协同设计，`GRPO` 是这种折中的实现路径。
- 论文把 `GRPO` 定位为“性能与资源约束并重”的 RL 后训练手段，而非仅追求单点精度。

## Evidence Mentioned

- 来源给出模型分数与对比基线，并在摘要中明确 `GRPO` 的方法定位和收益方向。
- 论文将 `GRPO` 与 `PPO` 的关系直接写明，有助于在 taxonomy 中定义继承关系。
- 正文报告仅使用 GSM8K/MATH 相关 CoT 指令数据进行 RL 后，DeepSeekMath-RL 7B 在 GSM8K 与 MATH CoT 上分别达到 `88.2%` 与 `51.7%`，相对 DeepSeekMath-Instruct 7B 的 `82.9%` 与 `46.8%` 有提升。
- 同一实验说明训练数据范围较窄，但评估覆盖 in-domain 与 out-of-domain 数学任务；这支持“数学推理任务内有效”，但不能单独证明跨业务域普适。

## Uncertainty / Limits

- 本页已补入论文正文 4.1 的方法机制，但尚未逐表结构化所有 RL 消融结果。
- 组大小、输出多样性、reward model 校准、KL 系数与过程监督质量都会影响 advantage 估计质量；论文并未给出可直接迁移到所有任务的稳健默认配置。
- 该证据主要来自数学任务分布，对通用指令/代码任务的外推需要额外来源验证。

## Extracted Conclusions (dated)

- 截至 2026-04-15，`GRPO` 可作为 post-training policy learning 中“面向推理任务、兼顾显存效率”的 `PPO` 分支。
- 截至 2026-04-15，`GRPO` 的核心价值主张是组内相对比较带来的稳健更新信号与更可控资源开销。
- 截至 2026-06-08，基于正文 4.1，`GRPO` 更准确的机制表述是：用同题多输出的组内标准化 reward 替代 learned value function 来估计 advantage，同时保留 `PPO` 风格的 clipped update 与 reference-policy `KL` 约束。

## Derived Concepts

- [[concepts/group-relative-policy-optimization]]
- [[concepts/post-training-policy-learning]]
