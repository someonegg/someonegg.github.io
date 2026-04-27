# Anthropic Managed Agents 笔记

文章链接：<https://www.anthropic.com/engineering/managed-agents>  
发布日期：**2026 年 4 月 8 日**  
来源：Anthropic Engineering Blog

## 一句话总结

这篇文章的核心不是“怎样把 agent 跑起来”，而是：**怎样为会持续进化的 agent 设计一套不过时的基础设施接口**。Anthropic 的答案是把 `brain`、`hands`、`session` 解耦，让 harness、sandbox、上下文管理和安全边界都可以独立替换。

---

## 一、核心观点

### 1. harness 会过时，接口比实现更重要

文章一开始就指出，agent harness 本质上编码了大量“模型目前做不到什么”的假设。  
这些假设不是稳定前提，而是暂时补丁。模型能力提升后，很多补丁会变成累赘。

文中的例子是：

- 早期模型会因为接近上下文上限而提前收尾，出现所谓 `context anxiety`
- 他们通过 harness 增加 `context reset` 来缓解
- 但换到更强模型后，这个行为消失了，原来的 reset 反而成了“死负担”

这里的关键判断是：

**agent 系统最不稳定的部分，往往不是模型 API，而是围绕模型写死的一层调度和约束逻辑。**

所以他们不想围绕某一代模型行为去固定系统，而是想定义一组更耐久的抽象接口。

### 2. Managed Agents 的目标是做“meta-harness”

文章把 Managed Agents 定位为一个 hosted service，但更准确地说，它是一个 **meta-harness**：

- 不强绑定某一种具体 harness
- 不强绑定某一种 sandbox 实现
- 不强绑定某一种上下文工程方法
- 重点是定义一套通用接口，让未来不同 agent 形态都能挂进去

作者借用了操作系统的类比：

- 操作系统之所以寿命长，不是因为底层硬件不变
- 而是因为它把硬件虚拟化成稳定抽象，比如 process、file、`read()`
- 上层程序可以不断变化，底层实现也可以不断变化，但抽象接口尽量稳定

Anthropic 想做的是同类事情：  
**不是把当前最优 agent 写死，而是为“未来还没想到的 agent 程序”提前定义运行边界。**

### 3. 结构解耦：brain、hands、session 分离

他们最后把 agent 系统拆成三块：

- `brain`
  - Claude + harness
  - 负责思考、调度、决定下一步行动

- `hands`
  - sandbox、MCP、custom tools、外部执行环境
  - 负责实际动作

- `session`
  - append-only 事件日志
  - 负责持久化保存任务过程与状态

这个拆分的意义很大，因为它改变了原来的耦合关系。

早期他们把这些东西都放在一个 container 里。这样做虽然简单，但带来了典型的“pet server”问题：

- container 死了，session 也丢
- container 卡住了，要人工进去抢救
- 调试困难，因为只能看到 WebSocket 事件流，分不清是 harness bug、事件流异常还是容器离线
- 如果容器里还有用户数据，工程师甚至没法放心进入调试

文章这里的判断很直接：

**把 agent 的核心运行状态和执行环境绑进一个容器，短期方便，长期不可维护。**

### 4. decouple the brain from the hands

这是全文标题对应的中心设计。

拆开以后：

- harness 不再住在 container 里
- harness 通过统一工具接口调用 sandbox
- sandbox 只是某种 hand，不是系统中心
- hand 坏了，brain 捕获为工具调用错误，再决定是否重试
- 要重试的话，可以重新 provision 一个新 hand

这意味着：

- sandbox 不再是“必须养活的宠物”
- 它变成可替换的、按需重建的执行单元
- brain 与 hand 之间只通过接口通信，不共享脆弱内部状态

这其实是在把“执行环境”降级为普通基础设施组件，而不是 agent identity 的一部分。

### 5. harness 也变成可替换的 cattle

文章不仅把 sandbox 做成 cattle，也把 harness 自己做成 cattle。

原因是：

- session log 放在 harness 之外
- harness 不需要持有唯一真相
- 一旦 harness 崩溃，可以新起一个实例
- 新实例通过 `wake(sessionId)` 和 `getSession(id)` 恢复执行

这和很多传统 agent 系统非常不同。很多系统表面上做了“持久化”，但真正可恢复的只是部分最终状态，不是完整事件轨迹。Anthropic 这里强调的是：

- 运行中的事件要持续写回 session
- 恢复不是猜状态，而是读日志继续跑

所以这里真正稳定的不是“某个进程”，而是 **外部 durable session log**。

## 二、安全设计上的关键判断

### 1. prompt injection 的根本风险不是“模型会犯错”，而是“凭据在模型可触达范围内”

文章非常明确地指出：

- 在耦合设计里，Claude 生成的代码运行在和凭据同一个 container 中
- 一旦 prompt injection 诱导模型读取环境变量，就可能拿到 token
- 一旦 token 泄露，攻击者可以开启新的 unrestricted session，进一步扩散

这段很值得注意，因为它没有把安全希望寄托在“更谨慎的 prompt”或“更窄的权限控制”上。

作者承认：

- 缩小 token scope 是缓解手段
- 但这仍然建立在“模型拿到有限 token 也做不了太多事”的假设上
- 而这个假设会随着模型变强而不断失效

所以他们选择的是 **结构性修复**：

**不要让 token 进入 Claude 生成代码所在的 sandbox。**

### 2. 凭据处理方式：资源内嵌或外部 vault

文中给了两类做法：

- Git 场景
  - 用 repo token 在 sandbox 初始化时完成 clone
  - 再把认证接到本地 git remote
  - sandbox 里的 `push/pull` 能正常工作
  - 但 agent 本身从未直接拿到 token

- 自定义工具 / MCP 场景
  - OAuth token 存在安全 vault
  - Claude 调用工具时走 MCP proxy
  - proxy 用 session 级 token 去 vault 取真正凭据，再代为调用外部服务
  - harness 本身也不持有这些凭据

这套设计的重点不是“藏起来”，而是：

- 把权限使用做成受控代理过程
- 把凭据从模型可执行环境中彻底剥离

## 三、上下文工程上的核心设计

### 1. session 不是 Claude 的 context window

这部分是文章非常重要的一段。

长任务一定会超过上下文窗口，因此任何 agent 都必须做上下文管理。常见方法包括：

- compaction
- trimming
- memory files
- 摘要与重写

问题在于，这些方法大多带来 **不可逆选择**：

- 哪些内容保留
- 哪些内容丢弃
- 哪些内容被摘要改写

而长任务真正困难的地方就在于：

- 很难提前知道未来哪一段信息会重新变得关键

所以文章把 session 设计成：

- 一个存在于上下文窗口之外的持久状态对象
- Claude 当前窗口只是它的一个投影或切片
- harness 可以按需从 session log 提取事件再喂给模型

这个思路的价值在于把两件事分开了：

- `session` 负责：
  - 完整保存
  - 可回放
  - 可切片
  - 可恢复

- `harness` 负责：
  - 如何组织上下文
  - 如何压缩
  - 如何裁剪
  - 如何利用 prompt cache
  - 如何做未来可能变化的 context engineering

也就是说：

**“状态存储”是基础设施问题，  
“上下文编排”是策略问题。**

Anthropic 明确把前者稳定化，把后者保持为可变层。

### 2. `getEvents()` 的含义不是简单拉日志

文中强调，`getEvents()` 支持的是可灵活读取的事件流，而不是一次性全量回放。  
brain 可以：

- 从上次读到的位置继续
- 回退几条看前因后果
- 在某次关键动作之前重读上下文
- 取局部切片，而不是每次重建完整历史

这意味着 session 在逻辑上更像一个可查询的外部上下文对象，而不只是审计日志。

## 四、扩展性与性能

### 1. many brains

解耦后，brain 不需要每次都先绑定一个 container 才能开始工作。  
如果当前任务暂时不需要 sandbox，那么：

- 不必提前 provision container
- 不必 clone repo
- 不必启动多余进程
- 不必等待环境冷启动

文章用 `TTFT` 来衡量这种体验改进，并给出结果：

- `p50` 下降约 **60%**
- `p95` 下降超过 **90%**

这说明他们不仅是在做架构洁癖，而是在解决非常具体的用户感知延迟问题。

### 2. many hands

更进一步，brain 不一定只操作一个 shell 或一个 container。  
解耦后：

- 每个 hand 都是一个工具接口
- Claude 可以决定把不同工作派给不同 hand
- hand 可以是多容器、多系统、多服务、多设备
- 一个 hand 失败，不应拖垮整个 agent 状态

文章承认，早期模型不一定足够强，无法稳定管理多个执行环境，所以他们最初才把 brain 放在单容器里。  
但随着模型变强，单容器反而成了限制：

- 所有 hand 状态都绑死在一个执行环境中
- 单点失败影响面太大
- 认知能力提升后，系统边界却没放开

这段的潜台词是：

**模型变强后，基础设施不该继续假设它只能在单一执行环境里工作。**

## 五、文章的底层方法论

如果抽掉具体实现，文章真正想表达的方法论有四条。

### 1. 对模型能力的负面假设要短期化

- “模型现在不擅长什么”可以作为当前 harness 的局部策略
- 但不能上升为系统永久结构

### 2. 用接口隔离易变层

- sandbox 会变
- harness 会变
- context engineering 会变
- 工具类型会变
- 所以稳定的应该是接口，而不是这些内部实现

### 3. 把状态从执行体中剥离

- 可恢复系统的关键不是进程重启
- 而是状态真相不依赖单个活着的进程

### 4. 安全依赖结构边界，不依赖模型自律

- 不把敏感凭据放进模型能碰到的环境
- 这比“要求模型不要读”更可靠

## 六、可批判处

文章整体论证是成立的，但有几处需要保留判断。

### 1. “统一工具接口”会隐藏复杂性，不会消灭复杂性

`execute(name, input) -> string` 很优雅，但真实系统里，不同 hand 的差异可能非常大：

- 返回值结构
- 延迟模型
- 幂等性
- 失败语义
- 权限范围
- 状态同步方式

统一接口能降低耦合，但也可能把复杂性转移到：

- tool schema
- error handling
- orchestration policy
- Claude 自己的推理负担

也就是说，它是必要抽象，但不是免费抽象。

### 2. “many hands” 对模型能力要求很高

文章提到现在模型更能处理多执行环境，这是合理的。  
但从工程角度说，模型是否真正稳定具备：

- 环境区分能力
- 多 hand 状态跟踪能力
- 跨 hand 推理能力
- 错误恢复策略选择能力

这仍然需要长期验证。  
所以“many hands” 更像一种战略方向，而不是所有任务都应默认启用的结构。

### 3. session log 的增长与检索策略会成为后续挑战

既然 session 被设计为 durable external context object，那么长期来看一定会遇到：

- 日志体积膨胀
- 检索代价上升
- 切片策略复杂化
- 索引结构与缓存策略演进

文章承认了 harness 会持续变化，但没有展开 session 检索层未来会如何演进。这不是漏洞，但确实是后续重点。

## 七、结论

这篇文章最值得记住的不是某个具体 API，而是这句隐含原则：

**Agent 基础设施不应围绕“当前模型的缺陷”定型，而应围绕“未来实现会持续变化”来设计。**

Anthropic 的解法是：

- 用 `session` 固化可恢复状态
- 用 `harness` 承担易变策略
- 用 `hands` 承担执行能力
- 用清晰接口把三者隔开

这让他们同时处理了：

- 长任务恢复
- 上下文窗口限制
- sandbox 失效恢复
- 凭据隔离
- 多执行环境扩展
- 首 token 延迟优化

从工程设计角度看，这篇文章讨论的是**怎么给 agent 做操作系统式的运行时边界**。

---

## 系统设计图 + 接口清单

```text
                    +----------------------+
                    |      Orchestrator    |
                    |  启动/拉起 harness   |
                    +----------+-----------+
                               |
                               | wake(sessionId)
                               v
+-------------------+   getSession/getEvents    +-------------------+
|      Session      | <-----------------------> |      Harness      |
|  持久事件日志     | --- emitEvent(event) ---> | Claude + 调度逻辑 |
|  可切片、可恢复   |                           | “brain”           |
+-------------------+                           +----+---------+----+
                                                     |         |
                           execute(name, input) ---- |         | ---- execute(name, input)
                                                     |         |
                                                     v         v
                                           +-------------+   +----------------+
                                           |   Sandbox   |   | MCP / Custom   |
                                           | 执行环境    |   | Tools / APIs   |
                                           | “hands”     |   | 其他“hands”    |
                                           +-------------+   +----------------+
```

### 接口清单

1. `execute(name, input) -> string`
   - 统一的 hand 调用接口
   - sandbox、MCP、custom tools 都可抽象到这一层

2. `provision({resources})`
   - 按需创建 sandbox 或其他执行环境
   - 避免每个 session 启动时预热完整环境

3. `wake(sessionId)`
   - harness 失效后重新拉起
   - 通过 sessionId 恢复运行

4. `getSession(id)`
   - 获取某个 session 的整体状态与事件记录

5. `getEvents()`
   - 按位置或范围读取事件流
   - 支持续读、回退、局部重读

6. `emitEvent(id, event)`
   - 运行过程中持续把事件写回 durable session log
   - 用于恢复、审计与上下文重建
