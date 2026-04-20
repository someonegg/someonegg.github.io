# Hermes Agent vs EvoMap Evolver 抄袭争议分析

## 事件背景

2026 年 4 月中旬，中国 AI 团队 EvoMap 公开发文指控 Nous Research（硅谷 AI 实验室，融资过亿）旗下 Hermes Agent（GitHub 8.5 万 Star）抄袭了其自进化引擎 Evolver。事件经新智元等媒体传播后以"实锤"定性刷屏，随后出现了逐行审查代码的反驳文章（@LobsterKill，X 平台）。

**原始来源**

- 新智元报道：[Hermes Agent抄袭中国团队代码实锤！被锤后回应：你删号](https://mp.weixin.qq.com/s/BjsQJTtzhp1WvDoYsuFpFg)
- 反驳分析：[Hermes 抄袭？我逐行审查了三个代码库，结论相反](https://x.com/LobsterKill/status/2044396619110756738)
- EvoMap 官方技术博客：https://evomap.ai/zh/blog/hermes-agent-evolver-similarity-analysis

---

## 各方核心主张

### EvoMap 的指控

| 锤点 | 内容 |
|------|------|
| 10步主循环 | Node.js 与 Python 语言不同，但进化循环步骤一一对应 |
| 12组术语替换 | Gene→SKILL.md、Capsule→execution record 等系统性改写 |
| 7份材料零归属 | Hermes 引用了 Stanford/Berkeley 项目但对 Evolver 只字不提 |
| 时间线 | Evolver 2026年2月1日公开，Hermes self-evolution 仓库 2026年3月9日创建，窗口期 36 天 |

Nous Research 回应："Our repo was created in July 2025. We are pioneers... Delete your account."

### @LobsterKill 反驳（逐行审查三个代码库）

**1. 举证逻辑有根本性缺陷**

Evolver 的核心文件（evolve.js，728KB）是混淆代码，EvoMap 描述的"10步循环"无法从公开代码中独立验证——指控建立在"信任文字描述"的前提上。

**2. 10步并非"一模一样"**

Hermes 每一步的实际功能与 EvoMap 描述的步骤不同。"加载→优化→验证→保存"是任何优化 pipeline 的通用模式。

**3. 术语映射多处失实**

- SKILL.md 是 Anthropic 于 2025 年 12 月发布的 Agent Skills 行业标准（agentskills.io，32+ 工具采用），Hermes 采用的是行业规范，不是"抄了 Evolver 的 Gene"
- Hermes 代码库中根本不存在"execution record"这个概念
- 多个映射跨仓库、跨系统强行对应

**4. Hermes Self-Evolution 的本质**

整个"自进化引擎"约 600 行 Python，核心是调用 Stanford DSPy 框架的 GEPA 优化器（ICLR 2026 Oral），Phase 2–5 全部是空目录。EvoMap 是从零构建的完整 GEP 协议，仅 signals.js 一个可读文件就有 660 行。两者在技术栈和工程深度上完全不是一个量级。

**5. 零归属无可指摘**

Hermes 引用了其实际依赖的每一个项目（DSPy、GEPA、MIPROv2、Darwinian Evolver），没有引用 Evolver 是因为根本没有用到 Evolver 的任何东西。连 EvoMap 官方博客都承认 GEPA 与 GEP 是完全不同的技术栈。

**6. EvoMap 官方博客 vs 传播版本**

EvoMap 官方技术博客明确声明"本文不做法律层面的抄袭定性"，承认 GEPA 是 Stanford/Berkeley 的独立学术成果，承认独立收敛可能性存在。传播链把这些变成了"实锤""教科书级洗代码"。

---

## 判断

**"抄袭/洗代码"的指控，证据不充分。**

最关键的问题：EvoMap 把核心代码混淆后发布，却要求公众基于其文字描述接受技术对比结论——你不能一边说"我的代码被抄了"，一边把代码混淆成 728KB 的乱码让别人无法验证。这个缺陷本身就足以否定"实锤"的定性。

SKILL.md 是行业标准而非 EvoMap 发明，"12组术语替换"中最有力的一条因此失效。连 EvoMap 官方博客都承认两个技术栈无关，"零归属铁证"也就无从谈起。

**传播链问题：** 新智元把 EvoMap 官方博客里"不做法律定性""独立收敛可能性存在"的措辞，包装成"实锤""教科书级洗代码"。这种渲染放大了 EvoMap 的声势，但同时消耗了其公信力——当反驳文章出现，"被骗了"的观感会直接反噬到 EvoMap 自身。

AI 洗代码作为行业问题是真实存在的（美团 Tabbit 的"read-frog"字符串残留才是真正的实锤），但用一个证据不充分的案例推广这个叙事，反而会稀释真正受害者的可信度。
