# Wiki Log

> Chronological log. Append-only.

## [2026-04-10] init | workspace-bootstrap

- Initialized `llm-wiki` workspace
- Created `index.md` / `log.md` / `overview.md`
- Added ingest/query skills

## [2026-04-10] lint | structural-check

- dead_links: 0
- orphan_pages: 0
- missing_index_entries: 0
- missing_frontmatter: 0
- invalid_frontmatter: 0
- follow_up_todos: none (all structural checks passed)

## [2026-04-14] ingest | Transformer KV Cache：2026 工程实践指南

- Processed sources
  - `docs/2026-04-14-kv-cache-engineering-guide.md`
- New pages
  - `sources/2026-04-14-kv-cache-engineering-guide.md`
  - `entities/vllm.md`
  - `entities/tensorrt-llm.md`
  - `entities/hugging-face-transformers.md`
  - `concepts/kv-cache-optimization-stack.md`
  - `concepts/decode-memory-bandwidth-bottleneck.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 需要在本仓库补充直接 benchmark 证据，验证该优化顺序在本地工作负载下是否成立。
  - 需要按来源逐条复核 2025-2026 文档/博客相关的时效性结论。

## [2026-04-14] ingest | 费米估算 x 费曼技巧：超级思考者的两大思维工具

- Processed sources
  - `llm-wiki/raw/2026-04-14-wechat-MbBQlpuidtKht1hyht4PiQ.txt`
  - `llm-wiki/raw/2026-04-14-wechat-MbBQlpuidtKht1hyht4PiQ.json`
- New pages
  - `sources/2026-04-14-fermi-feynman-thinking-tools.md`
  - `entities/enrico-fermi.md`
  - `entities/richard-feynman.md`
  - `concepts/fermi-estimation.md`
  - `concepts/feynman-technique.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 费米估算与费曼技巧在该来源中的定义是否与主流教材/课程定义存在系统性差异，需多源比对。
  - 当前来源不含效果量化证据，后续是否要补充实验性学习日志来验证“闭环训练”收益。

## [2026-04-14] ingest | A Visual Guide to Attention Variants in Modern LLMs

- Processed sources
  - `llm-wiki/raw/2026-04-14-sebastianraschka-visual-attention-variants.txt`
  - `https://magazine.sebastianraschka.com/p/visual-attention-variants`
- New pages
  - `sources/2026-04-14-visual-attention-variants.md`
  - `entities/sebastian-raschka.md`
  - `concepts/grouped-query-attention.md`
  - `concepts/multi-head-latent-attention.md`
  - `concepts/hybrid-attention-architecture.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 当前结论大量来自跨模型对比而非同配方对照；是否需要补充统一训练/推理设置下的 A/B 基准？
  - `Hybrid` 路线的推理栈成熟度在不同引擎差异较大；是否需要补充本地栈（如 vLLM/TensorRT-LLM）实测验证？

## [2026-04-14] ingest | A Visual Guide to Attention Variants in Modern LLMs (concept backfill)

- Processed sources
  - `llm-wiki/raw/2026-04-14-sebastianraschka-visual-attention-variants.txt`
- New pages
  - `concepts/multi-head-attention.md`
  - `concepts/sliding-window-attention.md`
  - `concepts/deepseek-sparse-attention.md`
  - `concepts/gated-attention.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 本次补提取主要来自单篇综述；是否需要为 `Gated Attention` 与 `DeepSeek Sparse Attention` 增补一手论文页以减少二手解释偏差？

## [2026-04-14] ingest | Primary-source backfill for Gated Attention and DeepSeek Sparse Attention

- Processed sources
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms.txt`
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms.json`
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2.txt`
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2.json`
- New pages
  - `sources/2026-04-14-gated-attention-llms-paper.md`
  - `sources/2026-04-14-deepseek-v3-2-paper.md`
- Updated pages
  - `concepts/gated-attention.md`
  - `concepts/deepseek-sparse-attention.md`
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 当前 `DeepSeek-V3.2` 结论主要来自摘要层提取；是否需要进一步 ingest 论文全文关键章节（方法/消融/复杂度）以增强细节可信度？

## [2026-04-14] ingest | Full-text deep extraction for Gated Attention and DSA

- Processed sources
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms-fulltext.txt`
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms-fulltext.json`
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2-fulltext.txt`
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2-fulltext.json`
- New pages
  - none
- Updated pages
  - `sources/2026-04-14-gated-attention-llms-paper.md`
  - `sources/2026-04-14-deepseek-v3-2-paper.md`
  - `concepts/gated-attention.md`
  - `concepts/deepseek-sparse-attention.md`
  - `log.md`
- Open validation questions
  - 是否需要继续补充 `Gated Attention` 论文中表格级别的量化指标（逐任务 absolute delta）以支持后续决策排序？

## [2026-04-14] ingest | Raw format correction (PDF-only for arXiv snapshots)

- Processed sources
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms.pdf`
  - `llm-wiki/raw/2026-04-14-arxiv-2505-06708-gated-attention-llms.json`
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2.pdf`
  - `llm-wiki/raw/2026-04-14-arxiv-2512-02556-deepseek-v3-2.json`
- New pages
  - none
- Updated pages
  - `sources/2026-04-14-gated-attention-llms-paper.md`
  - `sources/2026-04-14-deepseek-v3-2-paper.md`
  - `log.md`
- Open validation questions
  - 是否需要补充统一规范说明：论文类 raw 默认以 `pdf + json` 入库，避免后续重复产出 `.txt` 快照？

## [2026-04-14] ingest | 为什么现有的 Agent Infra 无法支撑生产级应用？

- Processed sources
  - `docs/2026-04-14-agent-infra-production-primitives.md`
- New pages
  - `sources/2026-04-14-agent-infra-production-primitives.md`
  - `concepts/effect-log.md`
  - `concepts/capability-gateway.md`
  - `concepts/forkable-checkpoint.md`
  - `concepts/resumability-over-uptime.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 该来源以架构观点为主，后续是否需要补充至少 1 组真实故障演练数据来验证 `Resumability` 指标有效性？
  - `Effect Log` 的“读写混合不可重读”策略在复杂外部系统中如何落地，需要哪些最小实现约束？

## [2026-04-14] ingest | Parallel-Probe 并行推理预算控制（方法学概念化）

- Processed sources
  - `llm-wiki/raw/2026-04-14-arxiv-2602-03845-parallel-probe.pdf`
  - `llm-wiki/raw/2026-04-14-arxiv-2602-03845-parallel-probe.json`
  - `llm-wiki/raw/2026-04-14-wechat-hBb4jEk2b8pfxifijK9AZQ.txt`
  - `llm-wiki/raw/2026-04-14-wechat-hBb4jEk2b8pfxifijK9AZQ.json`
- New pages
  - `sources/2026-04-14-parallel-probe-paper.md`
  - `sources/2026-04-14-parallel-probe-wechat-report.md`
  - `concepts/parallel-reasoning-budget-control.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 在业务任务分布下，`consensus` 稳定窗口与 `deviation` 阈值如何联合调参，才能稳定获得“低时延 + 低成本 + 无精度退化”？
  - 当问题天然多解或答案分布分散时，`early stopping` 是否会系统性偏向主流但不完整的解法路径？

## [2026-04-14] ingest | Concept taxonomy example for parallel reasoning optimization

- Processed sources
  - `sources/2026-04-14-parallel-probe-paper.md`
  - `sources/2026-04-14-parallel-probe-wechat-report.md`
- New pages
  - `concepts/parallel-reasoning-optimization.md`
- Updated pages
  - `concepts/parallel-reasoning-budget-control.md`
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 是否需要为 taxonomy 关系增加统一模板字段（例如固定 `Taxonomy` 和 `Sub-concepts` 小节），避免后续概念页风格漂移？

## [2026-04-14] ingest | Taxonomy uplift: reasoning-phase-optimization

- Processed sources
  - `sources/2026-04-14-parallel-probe-paper.md`
  - `sources/2026-04-14-parallel-probe-wechat-report.md`
- New pages
  - `concepts/reasoning-phase-optimization.md` (renamed from `concepts/parallel-reasoning-optimization.md`)
- Updated pages
  - `concepts/parallel-reasoning-budget-control.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 是否要将 `reasoning-phase-optimization` 进一步拆成“序列推理优化 / 并行推理优化 / 系统协同优化”三个二级分类，避免后续概念堆叠？

## [2026-04-14] ingest | Concept relation pattern rollout (taxonomy + related)

- Processed sources
  - `sources/2026-04-14-visual-attention-variants.md`
  - `sources/2026-04-14-gated-attention-llms-paper.md`
  - `sources/2026-04-14-deepseek-v3-2-paper.md`
  - `sources/2026-04-14-kv-cache-engineering-guide.md`
  - `sources/2026-04-14-parallel-probe-paper.md`
- New pages
  - `concepts/attention-compute-pattern-optimization.md`
  - `concepts/kv-cache-serving-optimization.md`
- Updated pages
  - `concepts/reasoning-phase-optimization.md`
  - `concepts/decode-memory-bandwidth-bottleneck.md`
  - `concepts/kv-cache-optimization-stack.md`
  - `concepts/multi-head-attention.md`
  - `concepts/grouped-query-attention.md`
  - `concepts/multi-head-latent-attention.md`
  - `concepts/sliding-window-attention.md`
  - `concepts/deepseek-sparse-attention.md`
  - `concepts/gated-attention.md`
  - `concepts/hybrid-attention-architecture.md`
  - `index.md`
  - `overview.md`
  - `log.md`
- Open validation questions
  - 是否应为所有 concept 强制要求 `Taxonomy` 与 `Related Concepts` 小节，以实现结构一致性检查？
  - 对“Related Concepts”是否要引入受控关系词表（如 `前提/互补/对照/依赖`）以便后续自动化解析？

## [2026-04-14] ingest | Concept taxonomy completion for reliability and methods clusters

- Processed sources
  - `sources/2026-04-14-agent-infra-production-primitives.md`
  - `sources/2026-04-14-fermi-feynman-thinking-tools.md`
- New pages
  - `concepts/agent-runtime-reliability-primitives.md`
  - `concepts/thinking-and-learning-methods.md`
- Updated pages
  - `concepts/effect-log.md`
  - `concepts/capability-gateway.md`
  - `concepts/forkable-checkpoint.md`
  - `concepts/resumability-over-uptime.md`
  - `concepts/fermi-estimation.md`
  - `concepts/feynman-technique.md`
  - `concepts/reasoning-phase-optimization.md`
  - `concepts/parallel-reasoning-budget-control.md`
  - `index.md`
  - `overview.md`
  - `log.md`
- Open validation questions
  - 是否要在 `lint:llm-wiki` 中新增“concept 未声明 Taxonomy”检查，防止新增页面重新变为孤岛？

## [2026-04-14] ingest | Prompt Learning 到 SIPDO 闭环自进化

- Processed sources
  - `llm-wiki/raw/2026-04-14-wechat-6OFYbFZKfURXyda4aFEtfQ.txt`
  - `llm-wiki/raw/2026-04-14-wechat-6OFYbFZKfURXyda4aFEtfQ.json`
- New pages
  - `sources/2026-04-14-sipdo-prompt-optimization-wechat.md`
  - `entities/haohan-wang.md`
  - `concepts/prompt-optimization.md`
  - `concepts/closed-loop-prompt-optimization.md`
- Updated pages
  - `concepts/reasoning-phase-optimization.md`
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 资讯稿中的量化结果来自二次转述；是否要补 ingest `arXiv:2505.19514` 一手全文并校正指标口径？
  - `Prompt Optimization` 与 `Reasoning Phase Optimization` 的边界在工程落地上是否需要更细的子分类（离线提示词优化 vs 在线推理控制）？

## [2026-04-14] ingest | Harness 刚火，可能就要成为过去时了｜Hao好聊论文

- Processed sources
  - `llm-wiki/raw/2026-04-14-wechat-av2P8UL-VoAwXiD3myXb7g.txt`
  - `llm-wiki/raw/2026-04-14-wechat-av2P8UL-VoAwXiD3myXb7g.json`
- New pages
  - `sources/2026-04-14-harness-reasoning-shift-wechat.md`
  - `concepts/reasoning-shift.md`
  - `entities/gleb-rodionov.md`
  - `entities/anthropic.md`
- Updated pages
  - `concepts/reasoning-phase-optimization.md`
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 需补充 `Reasoning Shift` 一手论文页，并核验文中转述的统计口径、任务覆盖与显著性检验设置。
  - 需在代码 Agent 任务上做复现实验，验证“答案后验证收缩”是否同样成立及其触发阈值。
  - “Harness 可能被替代”目前仅是趋势推断，是否应继续保守采用“触发式脚手架 + 内部状态干预”的并行路线？

## [2026-04-14] ingest | LLM OPD（On-Policy Distillation）

- Processed sources
  - `llm-wiki/raw/2026-04-14-note-llm-opd-on-policy-distillation.md`
  - `llm-wiki/raw/2026-04-14-note-llm-opd-on-policy-distillation.json`
  - `llm-wiki/raw/2026-04-14-thinking-machines-on-policy-distillation.html`
  - `llm-wiki/raw/2026-04-14-thinking-machines-on-policy-distillation.json`
  - `llm-wiki/raw/2026-04-14-thinking-machines-lora-without-regret.html`
  - `llm-wiki/raw/2026-04-14-thinking-machines-lora-without-regret.json`
- New pages
  - `sources/2026-04-14-note-llm-opd-on-policy-distillation.md`
  - `sources/2026-04-14-thinking-machines-on-policy-distillation.md`
  - `sources/2026-04-14-thinking-machines-lora-without-regret.md`
  - `entities/thinking-machines-lab.md`
  - `concepts/post-training-policy-learning.md`
  - `concepts/on-policy-distillation.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - `OPD` 在非数学推理任务（代码 Agent、工具调用、多轮对话）上的收益曲线是否仍能复现官方博客量级？
  - 官方实验使用的模型初始化与训练栈对结果影响较大，是否需要补充第三方复现来源以降低单源偏差？
  - “总成本优于 SFT”的结论是否会在更大教师模型或更长上下文下发生反转，需要补充成本分解实验。

## [2026-04-15] ingest | Post-Training Policy Learning sub-concept expansion (PPO/DPO/GRPO)

- Processed sources
  - `llm-wiki/raw/2026-04-15-arxiv-1707-06347-ppo.md`
  - `llm-wiki/raw/2026-04-15-arxiv-2305-18290-dpo.md`
  - `llm-wiki/raw/2026-04-15-arxiv-2402-03300-deepseekmath-grpo.md`
  - `llm-wiki/raw/2026-04-15-arxiv-2203-02155-instructgpt-rlhf.md`
- New pages
  - `sources/2026-04-15-ppo-paper.md`
  - `sources/2026-04-15-dpo-paper.md`
  - `sources/2026-04-15-deepseekmath-grpo-paper.md`
  - `sources/2026-04-15-instructgpt-rlhf-paper.md`
  - `concepts/proximal-policy-optimization.md`
  - `concepts/direct-preference-optimization.md`
  - `concepts/group-relative-policy-optimization.md`
  - `entities/openai.md`
  - `entities/deepseek-ai.md`
- Updated pages
  - `concepts/post-training-policy-learning.md`
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - `GRPO` 在公开来源中目前主要绑定数学推理任务，是否需要再补充跨任务一手论文来验证普适性？
  - `DPO` 与 `PPO` 的效果边界依赖偏好数据质量，是否应在本地任务集建立统一对比基准（同模型同数据同预算）？

## [2026-04-15] ingest | OPD related-concepts refinement

- Processed sources
  - `sources/2026-04-14-thinking-machines-on-policy-distillation.md`
  - `sources/2026-04-15-ppo-paper.md`
  - `sources/2026-04-15-dpo-paper.md`
  - `sources/2026-04-15-deepseekmath-grpo-paper.md`
- New pages
  - none
- Updated pages
  - `concepts/on-policy-distillation.md`
  - `log.md`
- Open validation questions
  - 是否需要在 concept 层引入受控关系词表（如 `对照/互补/替代/依赖`）并做 lint，以保持 Related Concepts 风格一致？

## [2026-04-15] ingest | Controlled relation vocabulary for concept related-links

- Processed sources
  - `llm-wiki/wiki/concepts/*.md` (Related Concepts normalization)
  - `scripts/lint-llm-wiki.mjs`
  - `llm-wiki/README.md`
- New pages
  - none
- Updated pages
  - `llm-wiki/wiki/concepts/*.md`
  - `llm-wiki/README.md`
  - `scripts/lint-llm-wiki.mjs`
  - `llm-wiki/wiki/log.md`
- Open validation questions
  - 是否要进一步限制 `Related Concepts` 不再使用 `上位`（仅保留在 `Taxonomy`），把 `Related Concepts` 严格收敛为横向关系？

## [2026-04-15] ingest | Remove redundant `上位` relation from Related Concepts

- Processed sources
  - `llm-wiki/wiki/concepts/*.md` (remove `- 上位：[[concepts/...]]` entries)
  - `scripts/lint-llm-wiki.mjs`
  - `llm-wiki/README.md`
- New pages
  - none
- Updated pages
  - `llm-wiki/wiki/concepts/*.md`
  - `scripts/lint-llm-wiki.mjs`
  - `llm-wiki/README.md`
  - `llm-wiki/wiki/log.md`
- Open validation questions
  - 是否要在 lint 中继续增加“Related Concepts 至少 1 条横向关系（非 Taxonomy）”检查，避免页面仅保留单一关系或空段落？

## [2026-04-15] ingest | Migrate concept relation labels to English controlled vocabulary

- Processed sources
  - `llm-wiki/wiki/concepts/*.md` (Related Concepts relation-label migration)
  - `scripts/lint-llm-wiki.mjs`
  - `llm-wiki/README.md`
- New pages
  - none
- Updated pages
  - `llm-wiki/wiki/concepts/*.md`
  - `scripts/lint-llm-wiki.mjs`
  - `llm-wiki/README.md`
  - `llm-wiki/wiki/log.md`
- Open validation questions
  - 是否要在后续引入 relation 别名兼容（例如中文输入自动归一化到英文标签），降低手工编辑摩擦？

## [2026-04-15] lint | semantic-check

- semantic_findings:
  - id: semantic-001
    severity: medium
    page: concepts/post-training-policy-learning.md
    issue: Core term `RLHF` is repeatedly used across wiki pages but has no dedicated concept page.
    why_it_matters: Readers cannot trace the canonical definition, scope boundaries, and relations to PPO/DPO/OPD from a single normalized entry.
    fix_action: Create `concepts/reinforcement-learning-from-human-feedback.md` with Taxonomy under `post-training-policy-learning`, then link it from `post-training-policy-learning`, `proximal-policy-optimization`, `direct-preference-optimization`, `overview`, and `index`.
    evidence: overview.md; index.md; sources/2026-04-15-instructgpt-rlhf-paper.md; concepts/proximal-policy-optimization.md; concepts/direct-preference-optimization.md
  - id: semantic-002
    severity: medium
    page: concepts/on-policy-distillation.md
    issue: Related relation `alternative: [[concepts/direct-preference-optimization]]` overstates substitutability between OPD and DPO.
    why_it_matters: OPD and DPO optimize with different supervision channels and data assumptions; treating them as direct alternatives can mislead method selection.
    fix_action: Change relation from `alternative` to `contrast` (or `complement`), and add one sentence in `Notes` clarifying selection criteria: online dense teacher supervision (OPD) vs offline preference-pair optimization (DPO).
    evidence: concepts/on-policy-distillation.md; concepts/direct-preference-optimization.md; sources/2026-04-15-dpo-paper.md; sources/2026-04-14-thinking-machines-on-policy-distillation.md
  - id: semantic-003
    severity: low
    page: concepts/group-relative-policy-optimization.md
    issue: GRPO concept-level claims are mostly supported by abstract-level extraction from one primary paper.
    why_it_matters: Without method/ablation-level evidence, readers may overgeneralize GRPO benefits to non-math tasks.
    fix_action: Backfill one deeper source page from full-text GRPO sections (objective, variance behavior, memory tradeoff) and add dated caveats in concept `Limits` referencing task-bound scope.
    evidence: sources/2026-04-15-deepseekmath-grpo-paper.md; concepts/group-relative-policy-optimization.md
- follow_up_todos:
  - [x] (medium) concepts/post-training-policy-learning.md: Create `concepts/reinforcement-learning-from-human-feedback.md` with Taxonomy under `post-training-policy-learning`, then link it from `post-training-policy-learning`, `proximal-policy-optimization`, `direct-preference-optimization`, `overview`, and `index`.
  - [x] (medium) concepts/on-policy-distillation.md: Change relation from `alternative` to `contrast` (or `complement`), and add one sentence in `Notes` clarifying selection criteria: online dense teacher supervision (OPD) vs offline preference-pair optimization (DPO).
  - [ ] (low) concepts/group-relative-policy-optimization.md: Backfill one deeper source page from full-text GRPO sections (objective, variance behavior, memory tradeoff) and add dated caveats in concept `Limits` referencing task-bound scope.

## [2026-04-15] ingest | Semantic fix follow-up (RLHF concept + OPD relation refinement)

- Processed sources
  - `sources/2026-04-15-instructgpt-rlhf-paper.md`
  - `sources/2026-04-15-ppo-paper.md`
  - `sources/2026-04-15-dpo-paper.md`
  - `sources/2026-04-14-thinking-machines-on-policy-distillation.md`
- New pages
  - `concepts/reinforcement-learning-from-human-feedback.md`
- Updated pages
  - `concepts/post-training-policy-learning.md`
  - `concepts/proximal-policy-optimization.md`
  - `concepts/direct-preference-optimization.md`
  - `concepts/on-policy-distillation.md`
  - `index.md`
  - `overview.md`
  - `log.md`
- Open validation questions
  - `RLHF` 概念页是否还需拆分 `reward model` 为独立子概念，以支持更细粒度对齐方法对比？

## [2026-04-15] query | DPO principle and workflow

- Processed sources
  - `sources/2026-04-15-dpo-paper.md`
  - `sources/2026-04-15-instructgpt-rlhf-paper.md`
  - `concepts/direct-preference-optimization.md`
  - `concepts/reinforcement-learning-from-human-feedback.md`
  - `concepts/proximal-policy-optimization.md`
- New pages
  - `queries/2026-04-15-dpo-principle-and-how-it-works.md`
- Updated pages
  - `index.md`
  - `log.md`
- Open validation questions
  - 需补充 `DPO` 论文正文级提取（公式与超参敏感性），当前查询主要依赖摘要与概念页归纳。

## [2026-04-15] query | DPO step-3 formula expansion

- Processed sources
  - `queries/2026-04-15-dpo-principle-and-how-it-works.md`
  - `sources/2026-04-15-dpo-paper.md`
  - `concepts/direct-preference-optimization.md`
- New pages
  - none
- Updated pages
  - `queries/2026-04-15-dpo-principle-and-how-it-works.md`
  - `log.md`
- Open validation questions
  - 是否要再补一个最小可运行的实现片段（token mask、padding、length-normalization）到该 query 页，便于直接落代码？

## [2026-04-15] query | GRPO principle and workflow

- Processed sources
  - `sources/2026-04-15-deepseekmath-grpo-paper.md`
  - `sources/2026-04-15-ppo-paper.md`
  - `concepts/group-relative-policy-optimization.md`
  - `concepts/proximal-policy-optimization.md`
- New pages
  - `queries/2026-04-15-grpo-principle-and-how-it-works.md`
- Updated pages
  - `index.md`
  - `log.md`
- Open validation questions
  - 是否要在该 query 页补一个可直接映射到训练代码的张量维度约定（batch/group/token）与数值稳定性检查清单？

## [2026-04-17] ingest | 用麦克卢汉的手术刀解剖AI

- Processed sources
  - `llm-wiki/raw/2026-04-17-wechat-OuMddSNqMUH-TB9xGTmP9Q.txt`
  - `llm-wiki/raw/2026-04-17-wechat-OuMddSNqMUH-TB9xGTmP9Q.json`
  - `https://mp.weixin.qq.com/s/OuMddSNqMUH-TB9xGTmP9Q`
- New pages
  - `sources/2026-04-17-mcluhan-dissects-ai-wechat.md`
  - `entities/marshall-mcluhan.md`
  - `entities/ivan-zhao.md`
  - `entities/daniel-kahneman.md`
  - `concepts/media-theory-and-ai.md`
  - `concepts/media-is-the-message.md`
  - `concepts/media-extension-and-amputation.md`
  - `concepts/hot-and-cold-media.md`
  - `concepts/rearview-mirror-effect.md`
  - `concepts/media-tetrad.md`
  - `concepts/cognitive-stratification.md`
- Updated pages
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 该来源为理论阐释文，是否需要补充 1-2 篇实证研究来源（教育/开发者行为数据）来验证“认知分化”与“慢思考压缩”的可观测性？
  - `Media Tetrad` 在 AI 场景下的四维结论，是否需要补充跨来源对照页以区分“作者推断”与“多源共识”？

## [2026-04-17] lint | semantic-check

- semantic_findings:
  - id: semantic-2026-04-17-001
    severity: medium
    page: concepts/cognitive-stratification.md
    issue: 核心结论目前仅由单一理论评论来源支撑，缺少跨来源或实证证据锚点。
    why_it_matters: 用户可能将“认知分化”为已验证结论，而非截至 2026-02-18 的理论推断，影响后续决策可信度分层。
    fix_action: 在该概念页新增 `Limits` 段，明确“当前为单来源理论推断”；并补充至少 1 个实证来源后再将结论上调为多源共识。
    evidence: sources/2026-04-17-mcluhan-dissects-ai-wechat; concepts/cognitive-stratification.md
- follow_up_todos:
  - [ ] (medium) concepts/cognitive-stratification.md: 在该概念页新增 `Limits` 段，明确“当前为单来源理论推断”；并补充至少 1 个实证来源后再将结论上调为多源共识。

## [2026-04-24] ingest | DeepSeek-V4: Parallelism Meets Efficiency in Ultra-Long Context Training

- Processed sources
  - `llm-wiki/raw/2026-04-24-hf-deepseek-v4-paper.pdf`
  - `llm-wiki/raw/2026-04-24-hf-deepseek-v4-paper.txt`
  - `https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/DeepSeek_V4.pdf`
- New pages
  - `sources/2026-04-24-deepseek-v4-paper.md`
  - `concepts/training-stability-and-optimization.md`
  - `concepts/manifold-constrained-hyper-connections.md`
  - `concepts/muon-optimizer.md`
  - `concepts/compressed-sparse-attention.md`
  - `concepts/heavily-compressed-attention.md`
  - `concepts/on-disk-kv-prefix-reuse.md`
- Updated pages
  - `entities/deepseek-ai.md`
  - `concepts/attention-compute-pattern-optimization.md`
  - `concepts/hybrid-attention-architecture.md`
  - `concepts/deepseek-sparse-attention.md`
  - `concepts/kv-cache-serving-optimization.md`
  - `concepts/on-policy-distillation.md`
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - 论文给出的 1M context 成本与质量优势主要来自内部评测框架；是否需要在本地统一评测栈复刻 `CSA/HCA` 与 `DSA` 组合的关键对照？
  - `Hybrid Attention` 在不同来源中的定义口径已出现分化；是否要新增术语规范页，明确“跨模块 hybrid”与“attention 内部 hybrid”的命名边界？

## [2026-04-24] lint | semantic-check

- semantic_findings:
- follow_up_todos:

## [2026-04-24] ingest | OPD objective refinement (full-vocabulary reverse KL)

- Processed sources
  - `sources/2026-04-24-deepseek-v4-paper.md`
- New pages
  - `concepts/full-vocabulary-reverse-kl-distillation.md`
- Updated pages
  - `concepts/on-policy-distillation.md`
  - `concepts/post-training-policy-learning.md`
  - `overview.md`
  - `index.md`
  - `log.md`
- Open validation questions
  - `full-vocabulary reverse KL` 相比 token-level 近似在当前任务分布上的稳定性收益是否可量化复现（如 loss 波动、收敛步数、最终质量）？
