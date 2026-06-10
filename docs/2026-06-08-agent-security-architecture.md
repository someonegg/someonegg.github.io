# Anthropic Agent 安全架构

## 文档信息

- 主来源 1：Anthropic Engineering Blog，`How we contain Claude across products`
- 链接：<https://www.anthropic.com/engineering/how-we-contain-claude>
- 发布时间：2026-05-25
- 主来源 2：Anthropic Engineering Blog，`How we built Claude Code auto mode: a safer way to skip permissions`
- 链接：<https://www.anthropic.com/engineering/claude-code-auto-mode>
- 发布时间：2026-03-25

---

## TL;DR

Anthropic 这两篇文章共同回答一个问题：当 Agent 变得更强、更自主、持有更多真实权限时，怎样把风险控制在可接受范围内。

核心结论是：

1. **优先做环境层 containment**：沙箱、VM、文件系统边界、网络出口控制，比模型 prompt 或审批弹窗更接近确定性安全边界。
2. **人工审批会疲劳**：Claude Code 用户批准约 93% 的权限提示，逐次弹窗不能长期作为主要控制面。
3. **Auto mode 是折中，不是最终安全边界**：它用 classifier 替代部分审批，比 `--dangerously-skip-permissions` 安全，但不能替代沙箱、网络限制和高风险场景的人审。

---

## 1. Anthropic 的问题定义：blast radius 正在变大

`How we contain Claude across products` 的起点是一个工程现实：随着模型能力和产品权限增强，Agent 的失败概率可能被模型训练和安全机制降低，但单次失败能造成的损害范围会持续扩大。

文章把风险拆成两个维度：

1. **失败发生的可能性**：模型是否误解、是否被注入、是否越权行动。
2. **失败造成的损害范围**：Agent 能访问哪些文件、凭证、网络、内部服务、生产系统。

Anthropic 的判断是：第一项可以被模型训练、安全评估、classifier 改善，但无法归零；第二项必须靠工程边界硬性限制。也就是说，Agent 安全不应只问“模型会不会做坏事”，还要问“即便它做了坏事，最多能碰到什么”。

这就是文章反复强调的 `blast radius`。

---

## 2. 三类风险

Anthropic 把 Agent 风险分成三类。

### 2.1 User misuse

用户可能恶意使用，也可能粗心地让 Agent 执行危险动作。比如绕过检查、运行不理解的 destructive command、把不该暴露的数据交给外部服务。

这类风险不能简单归因于“模型不安全”。如果用户明确要求危险动作，模型层的 user-intent classifier 反而可能认为这是合法意图。

### 2.2 Model misbehavior

模型没有被要求做危险动作，却因为误解或过度主动而做了危险动作。Anthropic 称这类行为为 `overeager behavior`。

典型例子包括：

1. 用户说“清理旧分支”，Agent 推断为删除远程分支。
2. 遇到认证失败后，Agent 主动搜索环境变量和配置文件找 token。
3. 部署 pre-check 失败后，Agent 加 skip flag 绕过安全检查。

更强模型不一定更安全。它可能更少犯低级错误，但也更擅长找到绕过限制的路径。

### 2.3 External attackers

外部攻击包括 prompt injection、恶意文件、恶意网页、恶意 MCP/tool output，以及传统运行时或代理层攻击。

关键点是：Agent 会把外部内容读进上下文，并把其中内容转化为行动。传统安全审计只检查代码是否恶意是不够的，还要检查工具返回内容是否试图改变 Agent 行为。

---

## 3. 三层防线

Anthropic 对应提出三类防线。

### 3.1 Environment layer：限制 Agent 实际可触达范围

这一层包括：

1. process sandbox
2. VM
3. filesystem boundary
4. egress control
5. credential isolation

这是 Anthropic 最重视的一层，因为它不依赖模型是否判断正确。只要凭证没有进入沙箱，就无法被 Agent 外传；只要网络出口被拦，恶意 POST 就发不出去。

### 3.2 Model layer：引导 Agent 倾向于正确行为

这一层包括：

1. system prompt
2. classifier
3. probe
4. training modifications

这些机制有效，但都是概率性防线。文章明确指出，即便 best-in-class 模型层防护也不会 100% 生效，所以不能单独承担安全职责。

### 3.3 External content layer：限制外部内容进入上下文的方式

MCP servers、third-party plugins、web search tools、GitHub connector 等，都会把不受控制的数据送进 Agent 上下文。

Anthropic 的一个重要提醒是：**审计 connector 不等于审计 connector 读到的数据**。一个 GitHub connector 本身可以是安全的，但它读到的 README 仍可能包含 prompt injection。

---

## 4. 三种 containment 模式

### 4.1 claude.ai：ephemeral container

claude.ai 的代码执行运行在服务端的 gVisor 容器中，文件系统按 session 临时存在，不访问用户本机。

优点：

1. blast radius 小。
2. 用户机器不暴露。
3. 更接近传统多租户服务隔离问题。

代价：

1. 没有持久 workspace。
2. 不能访问用户本地文件。
3. 能力上限较低。

这里的安全重点不是“保护用户机器免受 Agent 影响”，而是保护 Anthropic 基础设施和租户之间的隔离。

### 4.2 Claude Code：human-in-the-loop sandbox

Claude Code 运行在用户机器上，必须访问文件系统、shell 和网络，否则编码 Agent 的实用性会大幅下降。

最初的策略是：

1. 读操作默认允许。
2. 写操作、bash、网络访问需要用户批准。

这个设计成立的前提是 Claude Code 用户多为开发者，能看懂 bash、理解 `rm -rf`、知道运行外部代码的风险。

但实际问题是审批疲劳。Anthropic 观察到用户批准约 93% 的权限提示。批准次数越多，注意力越弱，弹窗从安全机制变成形式流程。

后续 Anthropic 引入 OS 级沙箱：

1. macOS 使用 Seatbelt。
2. Linux 使用 bubblewrap。
3. 工作区内写入允许。
4. 网络默认拒绝。

结果是权限提示减少 84%。这说明更好的方向不是无限增加弹窗，而是把低风险操作放进稳定边界内自动执行。

### 4.3 Claude Cowork：local VM

Claude Cowork 面向普通知识工作者，不能假设用户会判断 bash 命令或系统调用风险。因此，Claude Code 的 human-in-the-loop 模式不能直接迁移。

Cowork 使用本地 VM：

1. VM 有独立 Linux kernel、filesystem、process table。
2. 只挂载用户选择的 workspace 和 `.claude` 文件夹。
3. 用户凭据留在 host keychain。
4. VM 只拿 scoped-down token。
5. host 上其他文件默认不可见。

这个设计的核心不是阻止 Claude 损坏 workspace 内文件，而是保证它最多只能影响用户明确挂载的范围。

Anthropic 后来把 agent loop 移到 VM 外，但代码执行仍在 VM 内。原因是 full-VM mode 下 VM 启动失败会导致 Cowork 完全不可用；移出 agent loop 后，Claude 仍可帮助用户诊断问题。这里体现了生产系统常见权衡：安全边界不只看纯理论隔离，也要看故障时系统是否可用、可解释、可恢复。

---

## 5. Anthropic 复盘的关键失败

### 5.1 Trust dialog 之前的输入也不能信

Claude Code 曾收到漏洞报告：项目目录中的 `.claude/settings.json` 可定义 hook，而 Claude Code 在显示“是否信任此目录”之前就读取项目配置，导致 hook 可能提前执行。

修复原则是：

1. project-open 不等于 trusted。
2. config-load 不等于 trusted。
3. localhost listener 不等于 trusted。
4. 项目本地文件应按来自互联网的输入处理，直到用户明确建立信任边界。

这个教训很重要：很多系统把“本地”误认为“可信”，但 Agent 场景下，本地 repo 很可能是刚 clone 的外部输入。

### 5.2 用户也可能是 prompt injection 载体

Anthropic 内部红队曾通过钓鱼邮件诱导员工复制一段看似正常的 prompt。该 prompt 让 Claude Code 读取 `~/.aws/credentials`，编码后 POST 到外部 endpoint。

25 次重试中，Claude 完成外泄 24 次。

这不是常规 tool-output prompt injection，而是 direct prompt injection：攻击指令由用户亲自输入。模型层很难判断异常，因为 classifier 会看到“用户确实要求这样做”。

真正有效的防线是：

1. 文件系统边界：让 `~/.aws/credentials` 不在可读范围内。
2. egress control：阻止外部 POST。
3. credential isolation：长期凭证不进入 Agent runtime。

### 5.3 Allowlist 不是域名过滤，而是能力授权

Claude Cowork 曾允许访问 `api.anthropic.com`，因为产品自身需要调用 Anthropic API。攻击者在恶意文件中嵌入自己的 API key，引导 Claude 读取 workspace 文件，然后用攻击者 key 调 Anthropic Files API 上传。

egress proxy 只检查目标域名，看到是 `api.anthropic.com` 就放行。结果 sandbox 工作正常，但数据仍然被外泄。

Anthropic 的修复是在 VM 内加入 defensive MITM proxy：

1. 只放行携带 VM 自己 session token 的请求。
2. 拒绝攻击者嵌入的 API key。
3. 阻止可能触发 server-side fetch 的 header。

这给出一个更准确的原则：

**allowlist 应理解为 capability grant，而不是 destination filter。**

允许访问一个域名，等于允许使用该域名背后所有可达功能。域名只是入口，真正的风险面是 API capability。

### 5.4 隔离会降低可观测性

企业安全团队问 Claude Cowork：为什么 EDR 看不到 VM 内部？

答案是：同一个隔离机制既保护 host 不被 Claude 影响，也让 host-based EDR 无法检查 guest 内部。

Anthropic 当前缓解方式是 pull-based OTLP event log，但这不是实时监控。

这个教训说明：强隔离不是免费午餐。做 VM 或 sandbox 时，要提前设计 audit log、event log、admin visibility，否则安全团队会在合规和取证层面遇到盲区。

---

## 6. Claude Code Auto Mode：为什么需要它

`How we built Claude Code auto mode` 解决的是 Claude Code 的实际用户体验问题。

Claude Code 有三种旧选择：

1. 手动逐次审批：相对安全，但频繁打断。
2. sandbox：更安全，但配置和能力适配成本高。
3. `--dangerously-skip-permissions`：最顺滑，但大多数情况不安全。

Auto mode 的目标是在第二和第三之间找到折中：减少审批疲劳，同时用模型分类器拦截明显危险或超出用户意图的动作。

注意它的定位：**替代裸跳权限，不是替代认真审批。**

---

## 7. Auto Mode 的两层机制

### 7.1 输入层：prompt-injection probe

工具输出进入主 Agent 上下文之前，会由服务端 probe 检查。工具输出包括：

1. 文件读取结果。
2. web fetch 内容。
3. shell output。
4. external tool responses。

如果内容像是 prompt injection，probe 不直接丢弃结果，而是在上下文中加入警告，让 Agent 将其视为可疑内容，并重新锚定用户真实请求。

这层防护的目标是降低主 Agent 被外部内容劫持的概率。

### 7.2 输出层：transcript classifier

工具调用执行前，transcript classifier 会判断是否允许。它运行在 Sonnet 4.6 上，两阶段处理：

1. Stage 1：快速 single-token yes/no filter，倾向于宁可阻断。
2. Stage 2：如果 Stage 1 标记风险，再用 chain-of-thought reasoning 复判，降低误报。

分类器只看：

1. user messages
2. agent tool calls

它刻意不看：

1. Claude 自己的解释文本。
2. tool outputs。

这样设计是为了防止 Agent 用自己的解释说服 classifier，也防止 tool output 中的 prompt injection 影响 classifier。

---

## 8. Auto Mode 的三层权限决策

### 8.1 Tier 1：内置安全工具与用户规则

低风险工具直接允许，例如：

1. file reads
2. text search
3. file-pattern search
4. code navigation
5. todo
6. plan-mode transitions

但进入 auto mode 时，会丢弃一些过宽的用户 allow rules，例如：

1. blanket shell access
2. wildcarded script interpreters
3. 宽泛的 `python`、`node`、`ruby`
4. package manager run commands

原因是这些规则会让最危险的命令绕过 classifier。

### 8.2 Tier 2：项目内文件操作

项目目录内写入和编辑默认允许。理由是：

1. 常规编码不应承担 classifier latency。
2. repo 内改动可由 version control 审查。
3. 如果每次改文件都审批，Auto mode 的体验价值会消失。

### 8.3 Tier 3：高风险动作进入 classifier

进入 classifier 的包括：

1. shell commands
2. web fetches
3. external tool integrations
4. subagent spawns
5. 项目目录外文件操作

这些动作具有真实 downside potential，才值得付出分类器延迟。

---

## 9. Classifier 的判断标准

Auto mode 的 classifier prompt 由固定模板和三个可配置槽组成。

固定模板负责解释：

1. 如何判断动作真实影响，而不是只看命令表面。
2. 如何理解用户授权。
3. 如何按 block rules、exceptions、user intent 做决策。

可配置槽定义环境策略：

1. 哪些 domain、bucket、source-control org、internal service 属于可信边界。
2. 哪些动作类别必须阻断。
3. 哪些例外可以放行。

默认 block rules 大致覆盖四类：

1. **Destroy or exfiltrate**：force-push、批量删除云存储、外发内部数据。
2. **Degrade security posture**：关闭日志、安装持久化 SSH key 或 cronjob、改 Agent 自己的 permission config。
3. **Cross trust boundaries**：运行外部 repo 代码、扫描 credential store、向用户未指定服务发送数据。
4. **Bypass review or affect others**：跳过共享基础设施 safeguard、直接推 main、修改共享任务或资源。

这里最关键的是 user intent 规则：classifier 判断的不是“这个动作是否有助于任务”，而是“用户是否授权了这个 blast radius”。

例如：

1. “clean up my branches” 不自动授权删除远程分支。
2. “fix this?” 是问题，不是执行生产变更的明确授权。
3. 早先批准过类似动作，不代表当前动作也被授权。

---

## 10. Auto Mode 的效果与边界

Anthropic 报告了三个数据集：

1. 真实内部流量：`n = 10,000`
2. 真实 overeager actions：`n = 52`
3. 合成数据外泄任务：`n = 1,000`

部署后的两阶段 pipeline 结果：

1. 真实流量误报率：0.4% FPR
2. 真实 overeager 行为漏报率：17% FNR
3. 合成外泄漏报率：5.7% FNR

17% 漏报率是最需要记住的数字。它说明 Auto mode 明显优于 `--dangerously-skip-permissions`，但不是安全证明。

Anthropic 也明确说：如果用户原本会认真审查每一个高风险操作，Auto mode 可能是安全性回退；如果用户原本会裸跳权限，Auto mode 是大幅改进。

因此合理使用边界是：

1. 适合普通开发任务、低风险 repo、可通过版本控制回滚的修改。
2. 适合替代长期使用 `--dangerously-skip-permissions` 的工作流。
3. 不适合直接托管生产数据库、生产 deploy、长期凭证、共享基础设施变更。
4. 高风险动作仍应保留明确人审、环境隔离和出口控制。

---

## 11. Multi-agent 与 deny-and-continue

Auto mode 还覆盖 subagent handoff：

1. outbound delegation 时检查：防止主 Agent 把用户未授权任务委派给 subagent。
2. return 时检查：防止 subagent 运行中被 prompt injection 污染，再把结果污染主 Agent。

当 classifier 拒绝动作时，Claude 不会立即停止，而是收到拒绝原因，并尝试寻找更安全路径。这叫 `deny-and-continue`。

但系统有 backstop：

1. 连续 3 次拒绝，升级给人类。
2. 总计 20 次拒绝，升级给人类。
3. headless mode 下没有 UI，则终止进程。

这个设计很实际。误报率即便只有 0.4%，长任务里也可能遇到；如果每次误报都杀死 session，可用性会很差。更好的方式是让 Agent 在边界内重规划。

---

## 12. 从两篇 Anthropic 文章抽出的工程原则

### 12.1 先做 hard boundary，再做 soft steering

环境边界是 hard boundary；模型 prompt、classifier、probe 是 soft steering。

正确顺序是：

1. 先限制文件、网络、凭证、进程边界。
2. 再用 classifier 降低审批疲劳。
3. 最后用 prompt/probe 改善默认行为。

反过来会有结构性风险：如果长期凭证已经暴露给 Agent，模型层判断错一次就可能外泄。

### 12.2 用户能力决定隔离强度

Claude Code 可以保留部分 human-in-the-loop，是因为用户通常是开发者。Claude Cowork 面向非技术知识工作者，因此必须使用更强、默认开启的 VM boundary。

设计 Agent 产品时，应先问：

1. 用户是否能理解 Agent 即将做什么？
2. 用户是否能判断命令或工具调用风险？
3. 用户是否会长期保持注意力？
4. 用户误批一次的损失范围有多大？

答案不同，隔离策略就不应相同。

### 12.3 本地内容不等于可信内容

repo、配置文件、README、hook、localhost、MCP output 都可能是攻击面。

Agent 场景下，“本地”常常只是“攻击内容已经落盘”。信任边界必须由明确用户确认、管理员策略或基础设施策略建立，而不是由路径位置暗示。

### 12.4 Allowlist 要按 capability 审查

检查域名不够。应问：

1. 这个域名上有哪些 API？
2. 能否上传文件？
3. 能否触发 server-side fetch？
4. 能否写入第三方账户？
5. token 是否绑定当前 session 与当前用户？

`api.anthropic.com` 外泄事故说明，一个“正确放行”的域名仍可能成为 exfiltration path。

### 12.5 自研边界最容易出错

Anthropic 多次强调，gVisor、seccomp、hypervisor 等成熟 primitive 表现可靠，真正出问题的往往是自研 proxy、allowlist、orchestration、pre-trust config loading。

这不是说不能自研，而是自研边界必须被视作高风险组件，接受更严格 review、logging、fuzzing、red-team 和故障演练。

---

## 附录：用 Agent Infra Production Primitives 补上“副作用与恢复”

Anthropic 两篇的主线是安全 containment：

1. Agent 能碰什么。
2. 哪些动作执行前要拦。
3. 怎样减少审批疲劳。
4. prompt injection 如何进入与被削弱。

但生产级 Agent 还有另一个同样关键的问题：**如果动作已经发生，系统中断或 Agent 失控后，如何知道发生了什么，并语义正确恢复？**

这正是 [Agent Infra Production Primitives](https://mp.weixin.qq.com/s/_h3DJRFoC7k61T1KO83dng?scene=334) 的核心。

### Effect Log：补上副作用事实层

Anthropic 的 classifier 能在执行前拦动作，但只要存在 17% 漏报率，就必须假设有危险动作会发生。

因此需要 `Effect Log`：

1. 执行前写 intent：动作、范围、幂等键、审批级别。
2. 执行后写 completion：响应、版本指纹、是否可逆。
3. 恢复时优先复用封存结果，而不是重新触碰外部系统。

这把“Agent 做过什么”从隐式过程变成可审计事实层。

### Capability Gateway：与 Anthropic 的 credential isolation 对齐

`Capability Gateway` 要求不向 Agent 直接暴露长期凭证，而是通过网关签发短期、可撤销、范围受限 token。

这与 Claude Cowork 的设计高度一致：

1. 用户凭据留在 host keychain。
2. VM 拿 per-session scoped-down token。
3. proxy 验证 token provenance。
4. 异常时可单独撤销 Agent token。

它也能修正 allowlist 的问题：不要只问能不能访问某域名，而要让每个 capability 经过网关授权。

### Forkable Checkpoint：补上长程任务恢复能力

Anthropic 的文章提到隔离和 deny-and-continue，但没有展开长程 Agent 崩溃后的语义恢复。

`Forkable Checkpoint` 把 Agent 状态封装为可分叉节点，至少包含：

1. 模型输出。
2. tool 输出。
3. effect log 游标。

故障后可以从精确节点 fork 继续，而不是从任务起点全量重跑。

这对 Agent 很重要，因为重跑不是无害的：

1. 模型输出不可严格复现。
2. 外部世界状态已变化。
3. 重复 tool call 可能重复发邮件、删资源、提交任务、上传文件。

### Resumability over Uptime

传统服务常以 uptime 衡量可靠性；长程 Agent 更应看 resumability。

可用指标包括：

1. 恢复耗时。
2. 恢复成功率。
3. 重复副作用率。
4. 未封存副作用数量。
5. checkpoint 可恢复覆盖率。

这能补上 Anthropic 两篇之外的生产化维度：安全边界只能降低出错概率和损害范围，恢复原语决定出错后系统能否继续可信运行。

### 五层架构

1. Environment Boundary：先限制能碰到什么。
   用 sandbox、VM、filesystem boundary、egress control 限制 Agent 的实际触达范围。Anthropic 的结论很强：模型层永远不可能 100%，所以必须有确定性边界。Claude Cowork 的 VM、Claude Code 的 Seatbelt/bubblewrap、claude.ai 的 gVisor container 都是在做这层。

2. Capability Gateway：不要把长期凭证直接给 Agent。
   凭据留在 host keychain，Agent/VM 只拿 scoped-down token，可撤销、短时、绑定范围。更进一步，allowlist 不能只理解成“允许访问域名”，而应理解成“授予这个域名背后所有 API 能力”。Anthropic 的 api.anthropic.com 外泄事故正好证明这一点。

3. Effect Log：副作用必须先有事实账本。
   Anthropic 两篇主要讲“阻止危险动作”，但对“动作已经发生后如何恢复”说得少。这里 Production Primitives 更关键：每个 tool call 要按纯读、幂等写、不可逆写、读写混合分类；副作用前写 intent，完成后写 completion，恢复时复用封存结果，避免重复写入或重复外发。

4. Policy Classifier：降低审批疲劳，但只作为概率防线。
   Claude Code auto mode 的 classifier 适合挡 overeager behavior、honest mistakes、部分 prompt injection 后果。它的真实 overeager action 漏报率是 17%，所以定位应是：替代 --dangerously-skip-permissions，而不是替代高风险场景的人审、沙箱或网关。

5. Resumability：长程任务要能精确续跑。
   对长程 Agent，只追求 uptime 是错目标。更应该追求 resumability：崩了之后能从精确节点恢复，且不重复副作用。checkpoint 至少要包含模型输出、tool 输出、effect log 游标。

---
