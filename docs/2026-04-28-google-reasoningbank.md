# Google ReasoningBank

文章链接：<https://research.google/blog/reasoningbank-enabling-agents-to-learn-from-experience/>  
发布日期：**2026 年 4 月 21 日**  
来源：Google Research Blog

## 一句话总结

`ReasoningBank` 的核心贡献，不是又给 agent 加了一个“记忆库”，而是把记忆的重点从“保存发生过什么”改成了“提炼以后该怎么想”。它试图让 agent 从成功和失败中沉淀出可迁移的推理策略，并在任务执行前检索、执行后写回，形成一个持续闭环。

---

## 一、它在解决什么问题

Google 对现有 agent memory 的批评很集中，主要有两点。

第一，很多方法保存的是**原始轨迹**。  
比如每一步点击了什么、看了什么、调用了什么工具。这类数据当然完整，但通常过于冗长，也不容易直接转成跨任务可复用的策略。

第二，很多方法只总结**成功经验**。  
这会让 agent 更像是在积累“套路模板”，而不是在真正学习。现实里很多高价值经验恰恰来自失败，例如：

- 为什么某种页面结构会诱发错误操作
- 为什么某条修复路径看起来合理但会浪费步骤
- 哪些局部信号意味着当前策略已经走偏

Google 的判断是：如果 agent 不系统吸收失败，它就会重复犯同一种错。

---

## 二、ReasoningBank 到底是什么

`ReasoningBank` 是一个面向 agent 的**结构化推理记忆库**。博客中给出的每条 memory item 包含三部分：

- `Title`：策略标题
- `Description`：简短摘要
- `Content`：真正的策略内容，包括推理步骤、决策理由、操作洞见

这里最关键的是 `Content` 的定位。它不是保存原始动作日志，而是保存更高层的“工作原则”。Google 的原话是：ReasoningBank 要蒸馏的是 `global reasoning patterns`，不是详尽动作记录。

如果把普通 trajectory memory 看作“流水账”，那 `ReasoningBank` 更像“复盘卡片”。

---

## 三、它的运行闭环

博客把 `ReasoningBank` 描述成一个持续闭环，主要分成三段。

### 1. 任务前：检索

在 agent 采取动作之前，它先从 `ReasoningBank` 里检索与当前任务相关的 memory，并将这些内容放进上下文中，作为先验策略。

这一步的目标不是让模型背答案，而是让它在一开始就具备某些“做事前应该先检查什么”的判断框架。

### 2. 任务中：执行

agent 带着这些 memory 与环境交互。这个阶段本身没有什么神秘之处，仍然是普通 agent 执行，但差别在于它不再是完全从零起步。

### 3. 任务后：自评、提炼、写回

执行结束后，系统使用 `LLM-as-a-judge` 对轨迹做自评，从中抽取：

- 成功经验
- 失败反思
- 可泛化的操作洞见

然后把它们提炼为新的结构化 memory，追加回 `ReasoningBank` 中。Google 还特别提到，这里的自评不需要完全准确，因为实验中系统对评判噪声具有一定鲁棒性。

这个闭环可以压缩成一句话：

**任务前读经验，任务后写经验。**

---

## 四、为什么“失败学习”是这篇文章最重要的点

我认为这篇文章最值得记住的，不是 memory 结构，而是它对失败经验的处理方式。

Google 明确指出，现有 workflow memory 往往只看成功任务；而 `ReasoningBank` 会主动分析失败，从反事实信号和陷阱里提炼出预防性规则。

博客举的例子很典型：

- 低级规则：点击 `Load More`
- 更成熟的规则：先验证当前页面标识，避免在无限滚动陷阱里误触发加载

两者的差异非常大。

前者是动作模板。  
后者是带条件判断的策略护栏。

这意味着 `ReasoningBank` 真正想保存的不是“上次怎么做”，而是“以后遇到类似结构时，先检查什么、避免什么、为什么”。

---

## 五、MaTTS：把额外算力也变成经验

在 `ReasoningBank` 之上，Google 又提出了 `MaTTS`，即 `memory-aware test-time scaling`。

它的出发点是：传统 `test-time scaling` 通常只关心最终答案，却把探索过程丢掉了；而在 agent 场景里，探索过程本身就是非常有价值的学习信号。

`MaTTS` 的核心思路是：

- 给单个任务投入更多推理算力
- 产生更多轨迹和更多试错
- 把这些探索过程拿来反哺 `ReasoningBank`

Google 介绍了两种方式。

### 1. 并行扩展

同一个任务生成多条不同轨迹，再通过对比成功轨迹、伪正确轨迹、失败轨迹，提炼出更稳健的策略。

### 2. 串行扩展

在单条轨迹内部持续修正，保留“中间是如何意识到自己错了，并逐步改正”的过程，再将这些试错中的改进提炼成记忆。

`MaTTS` 的真正价值不在于“多采样”本身，而在于它把这些额外采样转成了长期能力积累。  
也就是说，额外算力不只提高这一次任务成功率，还会提升未来任务的先验策略质量。

---

## 六、实验结果说明了什么

Google 在博客中报告，基于 `Gemini 2.5 Flash`，他们在 `WebArena` 和 `SWE-Bench-Verified` 上对比了三类基线：

- `Vanilla ReAct`
- `Synapse`，即 trajectory memory
- `AWM`，即 workflow memory

主要结果如下：

- 不启用 scaling 时，`ReasoningBank` 相比无记忆基线，在 `WebArena` 上成功率提升 **8.3%**
- 不启用 scaling 时，`ReasoningBank` 在 `SWE-Bench-Verified` 上成功率提升 **4.6%**
- 在 `SWE-Bench-Verified` 上，它平均每个任务少了接近 **3** 个执行步骤
- 加上 `MaTTS` 后，`WebArena` 上又进一步提升 **3%** 成功率，并减少 **0.4** 步

这些数字说明两件事。

第一，它提升的不只是“最终对错”，也包括**执行效率**。  
少走弯路本身就是 agent 能力成熟的重要标志。

第二，`ReasoningBank` 和 `MaTTS` 不是两个孤立技巧，而是明显存在互相增强关系：

- 更好的 memory 让探索更有方向
- 更丰富的探索又让 memory 更快变好

---

## 七、这篇文章真正提出了什么新尺度

这篇文章隐含提出了一个很有价值的视角：agent 的 scaling 不应该只看参数量、上下文长度或 test-time compute，还要看**经验吸收效率**。

换句话说，`ReasoningBank` 试图定义一种新的能力增长维度：

- 模型更大会更强
- 推理更久会更强
- 但如果 agent 能持续从经验中提炼策略，它也会更强

这个方向可以叫作：

**experience scaling**

这也是为什么我会把 `ReasoningBank` 看成一种“策略层基础设施”，而不仅是一种 memory trick。

---

## 八、局限与风险

这套思路方向是对的，但离“成熟可部署”还有几个明显问题。

### 1. 自评质量仍然是上限

博客说系统对 `judge` 噪声有鲁棒性，但鲁棒不等于没有系统偏差。  
如果长期把似是而非的总结写进 memory，agent 可能会形成“自信但错误”的经验法则。

### 2. 检索后是否适配，是另一个难点

一条过去有效的策略，未必适用于当前任务。  
如果 retrieval 做得粗糙，agent 很可能机械套用旧经验，反而把上下文污染得更严重。

### 3. 目前结果主要还是 benchmark 结果

`WebArena` 和 `SWE-Bench-Verified` 已经比很多 toy task 强，但仍不等于开放世界。  
真实环境里，权限、工具差异、网页噪声、组织流程、长周期依赖都更复杂。

所以我的判断是：  
`ReasoningBank` 值得重视，因为它抓住了 agent 部署后的核心短板；但它更像一条正确方向，而不是已经被完全验证的终局方案。

---

## 九、我的理解：它最像什么

如果用人类工作经验作比喻，`ReasoningBank` 最像一个不断更新的**个人复盘库**：

- 做完任务不只记录结果
- 还记录判断依据
- 记录为什么会失败
- 记录下次先检查什么

它和普通笔记的差别在于：  
这些卡片不是供人回头查阅，而是直接在下一次任务开始前被检索并注入 agent 的工作上下文。

所以它不是知识库的静态沉淀，而是 agent 决策过程的一部分。

---

## 附录：与 Hermes Agent 运行时学习环的对比

这里特意只对比 `Hermes Agent` 主系统的运行时学习环，不讨论其单独仓库 `hermes-agent-self-evolution` 的离线优化 pipeline。

### A. 相似之处

两者都不是“做完任务就忘掉”的设计。

`Hermes Agent` 官方 README 把它描述为一个 `built-in learning loop`，会：

- `creates skills from experience`
- `improves them during use`
- `nudges itself to persist knowledge`
- `searches its own past conversations`

这说明 Hermes 和 `ReasoningBank` 一样，也在做“经验写回”。[Hermes Agent README](https://github.com/NousResearch/hermes-agent)

### B. 关键差别：写回内容不同

Hermes 的运行时记忆是三层结构：

- Layer 1：`MEMORY.md` + `USER.md`
- Layer 2：`Skills`
- Layer 3：`Session Search`

Hermes 官方文档和博客都写得很清楚：`MEMORY.md` 更偏环境事实、约定和项目知识，`USER.md` 更偏用户偏好与沟通风格；它们在 session 开始时以 `frozen snapshot` 注入系统提示，不在中途动态改写。[Hermes Memory Docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) [Hermes Memory Blog](https://hermes-agent.ai/blog/hermes-agent-memory-system)

相比之下，`ReasoningBank` 的 memory item 明确面向：

- reasoning steps
- decision rationales
- operational insights

也就是更偏**策略记忆**，而不是**事实记忆**。

可以把两者理解成：

- Hermes Layer 1 更像“长期上下文卡”
- ReasoningBank 更像“任务复盘卡”

### C. Hermes 的 Skills 更接近哪一层

Hermes 博客把 Layer 2 定义为 `Episodic Memory (Skills)`，并说明 skills 是 agent 从经验中创建、按需加载的 markdown 文档，内容包含：

- 如何做这件事
- 该避开什么
- 如何验证成功

博客还给出了 skill 触发条件，例如：

- 完成复杂任务
- 走过错误路径后找到可行办法
- 用户纠正了它的做法
- 发现了值得重复的非平凡 workflow

并且 Hermes 每 **15** 次工具调用会做一次自评 checkpoint，必要时创建或更新 skill。[Hermes Memory Blog](https://hermes-agent.ai/blog/hermes-agent-memory-system)

从这个角度看，Hermes 的 `Skills` 和 `ReasoningBank` 已经很接近了。  
两者都在保存“怎么做更好、要避开什么坑”。

但它们还有一个重要差别：

- `ReasoningBank` 把这类策略记忆作为 agent 主决策循环的核心部件
- Hermes 把这类经验更多落成按需加载的 `SKILL.md` 文档，与 Layer 1 持久记忆和 Layer 3 会话搜索共同组成三层系统

### D. 一个更清楚的分层理解

如果把 agent 的运行时学习分成三类记忆，二者的位置就很清楚了：

- **事实型记忆**
  - 用户偏好
  - 环境事实
  - 项目约定
  - 更接近 Hermes 的 `MEMORY.md` / `USER.md`

- **策略型记忆**
  - 失败教训
  - 决策护栏
  - 高层操作原则
  - 更接近 `ReasoningBank`

- **技能型记忆**
  - 可重复 workflow
  - 分步 procedure
  - 验证方法
  - 更接近 Hermes 的 `Skills`

所以我会这样下结论：

`Hermes Agent` 的运行时学习环，比 `ReasoningBank` 更分层、更产品化；而 `ReasoningBank` 更聚焦“策略记忆”这一个核心问题，并把它做成 agent test-time self-evolution 的主轴。

---

## 参考链接

- Google Research Blog: <https://research.google/blog/reasoningbank-enabling-agents-to-learn-from-experience/>
- Hermes Agent README: <https://github.com/NousResearch/hermes-agent>
- Hermes Memory Docs: <https://hermes-agent.nousresearch.com/docs/user-guide/features/memory>
- Hermes Memory Blog: <https://hermes-agent.ai/blog/hermes-agent-memory-system>
