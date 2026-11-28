# 模型记忆的统一视角：有限状态下的读写、遗忘与纠错

> 面向读者：熟悉 Transformer 与基本线性代数，希望跳出零散的论文与型号列表，用一套统一的数学心智模型理解现代序列架构。  
> 核心主线：将 Full Attention、Linear Attention、GLA、DeltaNet、Gated DeltaNet / KDA、SSM / Mamba 与 Hybrid 统一为**“可学习的状态机与记忆管理系统”**。  
> 范围说明：关于 DeltaNet 如何借助 WY 表示将串行 rank-1 更新改写为分块并行（Chunkwise Parallel）矩阵计算，已另行成文，详见 [DeltaNet 中的 WY 变换：从 Delta Rule 到分块并行](2026-09-19-deltanet-wy-transform.md)。

---

## 一、总纲：把序列层看成可学习的状态机

回顾 LLM 架构的演进，底层计算引擎虽然仍以 Transformer 为骨架，但围绕长上下文与推理成本的竞争，已经把核心问题从“如何把 $O(N^2)$ 的 Attention 近似成 $O(N)$”，推进到一个更本质的问题：

> **一个有限资源的智能系统，应该如何管理内部记忆？**

抛开历史发展顺序，现代序列模型（Full Attention、Linear Attention、GLA、DeltaNet、KDA、SSM/Mamba、Hybrid）都可以放入同一个广义状态机框架。记第 $t$ 个 token 的输入表示为 $x_t \in \mathbb{R}^d$，任意序列层均可抽象为：

$$
S_t = F_\theta(S_{t-1}, x_t), \qquad y_t = G_\theta(S_t, x_t)
$$

其中 $\theta$ 是预训练得到的**慢参数（Slow Weights）**，$S_t$ 是读完第 $t$ 个 token 后的**内部记忆状态（State）**，$F_\theta$ 负责状态更新，$G_\theta$ 负责记忆读取。

对于绝大多数现代循环 / 线性记忆架构，状态更新可以进一步精炼为三个基本算子——**状态转移（遗忘/变换）**、**记忆写入**与**记忆读取**：

$$
S_t = \underbrace{A_t(S_{t-1})}_{\text{Forget / Transform}} + \underbrace{B_t(x_t)}_{\text{Write}}, \qquad y_t = \underbrace{C_t(S_t, x_t)}_{\text{Read}}
$$

```text
                       x_t
                        │
               ┌────────┴─────────┐
               │    Controller    │  (由慢参数 θ 驱动)
               └────────┬─────────┘
                        │
        ┌───────────────┼────────────────┐
        ↓               ↓                ↓
     Address          Value            Gates
     k_t / q_t         v_t          α_t / β_t
        │               │                │
        └────────┬──────┴────────────────┘
                 ↓
      ┌─────────────────────┐
      │    MEMORY UPDATE    │
      │ S_t = F(S_{t-1},x_t)│
      └──────────┬──────────┘
                 │
           ┌─────┴─────┐
           ↓           ↓
          S_t         q_t
           │           │
           └─────┬─────┘
                 ↓
           MEMORY READ → y_t
```

### 拆解任意新序列架构的五个问题

以后遇到新的序列层设计，只需问五个问题即可完成定位：

1. **State 是什么？**（原始 KV 集合、关联矩阵、还是动力学隐向量）
2. **怎么 Write？**（直接追加、外积累加、门控写入、还是误差纠正）
3. **怎么 Forget？**（不遗忘/窗口淘汰、固定衰减、数据依赖门控、还是定向覆写）
4. **怎么 Read？**（Softmax 内容寻址、线性矩阵查询、还是状态投影）
5. **State 容量随序列长度 $N$ 如何增长？**（随 $N$ 线性增长，还是保持 $O(1)$ 常数大小）

### 主流路线全景对照

| 架构路线 | State 形态 | Write | Forget | Read | 推理 State vs $N$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Full Attention** | 全部 $(k_i, v_i)$ 列表 | Append 追加 | 通常不忘 / 驱逐 | $\operatorname{softmax}(qK^\top/\sqrt{d})V$ | $O(N)$ |
| **GQA / MLA** | 共享或低秩压缩后的 KV | Append 追加 | 同上 | Softmax 内容检索 | $O(N)$（常数因子更小） |
| **Linear Attention** | 矩阵 $S_t \in \mathbb{R}^{d_v \times d_k}$ | $v_t k_t^\top$ 累加 | 无 / 极弱 | $S_t q_t$ | $O(1)$ |
| **RetNet** | 矩阵 $S_t$ | $v_t k_t^\top$ | 固定多尺度衰减 $\gamma$ | $S_t q_t$ | $O(1)$ |
| **GLA** | 矩阵 $S_t$ | 门控外积写入 | 数据依赖门控 $G_t(x_t)$ | $S_t q_t$ | $O(1)$ |
| **DeltaNet** | 矩阵 $S_t$ | 预测误差更新 | 定向覆写 / 纠错 | $S_t q_t$ | $O(1)$ |
| **Gated DeltaNet / KDA** | 矩阵 $S_t$ | Delta 纠错更新 | 细粒度遗忘门控 + 定向覆写 | $S_t q_t$ | $O(1)$ |
| **SSM / Mamba** | 动力学状态 $h_t$ | 选择性输入 $B(x_t)x_t$ | 选择性衰减 $A(x_t)$ | 选择性投影 $C(x_t)h_t$ | $O(1)$ |
| **Hybrid** | KV Cache + 循环状态 | 混合 | 混合 | 全局精确检索 + 廉价工作记忆 | $O(N) + O(1)$ |

> **注意区分 MLA 与 Linear Attention**：DeepSeek 的 MLA（Multi-head Latent Attention）本质仍是 Softmax Attention，它通过低秩潜空间压缩 KV 表示来大幅降低显存常数因子，但每个 token 依然需要追加存储，状态随 $N$ 线性增长；而 Linear Attention / SSM 将历史压缩进固定大小的状态，实现推理状态相对于序列长度的 $O(1)$。

整个领域最根本的权衡就在这里：**显式记忆（Explicit Memory，少压缩、多存储、检索精确）** 与 **压缩状态（Compressed State，强压缩、定长存储、存在串扰与遗忘）** 之间的张力。下文按数学机制逐层递进展开：

```text
Associative Memory → Capacity & Interference → Forgetting / Gating → Delta Rule → Gated Delta / SSM / Hybrid
```

---

## 二、第一层：联想记忆（Associative Memory）与外积写入

传统计算机内存是**地址寻址**（`0x0001 → Alice`），必须给出精确下标；神经网络中的记忆则是**内容寻址（Content-Addressable Memory）**，键（Key）本身就是地址。

### 1. 为什么外积 $v k^\top$ 能“写入一条记忆”？

给定一组键值对 $(k_i, v_i)$，其中 $k_i \in \mathbb{R}^{d_k}$、$v_i \in \mathbb{R}^{d_v}$，构造记忆矩阵：

$$
S = \sum_{i=1}^{N} v_i k_i^\top \in \mathbb{R}^{d_v \times d_k}
$$

读取时直接用查询向量 $q \in \mathbb{R}^{d_k}$ 右乘：

$$
\hat{v} = S q = \left(\sum_{i=1}^{N} v_i k_i^\top\right) q = \sum_{i=1}^{N} v_i (k_i^\top q)
$$

展开单条外积 $(v k^\top) q = v(k^\top q)$ 可以看到它天然完成了两步操作：
1. **匹配度量**：内积 $k^\top q$ 计算“查询与该键有多相似”；
2. **按权重取回**：将标量相似度乘到对应值向量 $v$ 上。

若 $k$ 已归一化（$k^\top k = 1$），则 $q = k$ 时完美返回 $v$，$q \perp k$ 时返回 $0$，介于其间则按连续相似度返回部分值——这是一种**连续软地址**。对比标准 Attention：

$$
y_{\text{Attn}} = \sum_i \operatorname{softmax}(q^\top k_i)\, v_i, \qquad y_{\text{Linear}} = \sum_i (k_i^\top q)\, v_i = \left(\sum_i v_i k_i^\top\right) q
$$

两者在结构上都是“Query-Key 相似度加权 Value”，本质差别在于 **Softmax 把 $Q$ 与 $K$ 绑定，迫使每次读取都重新扫描全部历史 $(k_i, v_i)$**；而去掉 Softmax（或经由核特征映射 $\phi$ 解耦）后，利用矩阵乘法结合律即可将历史预先压缩进矩阵 $S$。

### 2. 重新理解 $Q / K / V$ 与 Multi-Head

从记忆系统视角看，$W_q, W_k, W_v$ 并非简单的线性投影，而是承担了明确的内存寻址分工：

- **$K = W_k x$（Write Address）**：地址编码器——决定这条信息应当存到哪个方向；
- **$V = W_v x$（Memory Content）**：内容编码器——决定命中后应当向下游返回什么信号；
- **$Q = W_q x$（Read Address）**：检索编码器——决定当前时刻应当去查哪个地址区域。

写语句（“John 的办公室在 307”）与问语句（“John 在哪个房间办公？”）的隐状态 $x_{\text{write}} \neq x_{\text{query}}$，但训练后的 $W_k, W_q$ 会把它们映射到高内积的同一地址区域。**Multi-Head** 则相当于并行维护 $H$ 个独立的低维联想记忆子空间 $S^{(1)}, \dots, S^{(H)}$，减少不同语义关系对同一地址空间的直接竞争。

### 3. Hebbian 写入的局限与 Gram 矩阵视角

最简单的累加规则 $S_t = S_{t-1} + v_t k_t^\top$ 在形式上与神经科学中的 **Hebbian Learning**（$\Delta W \propto y x^\top$）完全一致。但它有一个致命缺陷：**只会盲目累加（ADD），不会删除（DELETE）、覆写（OVERWRITE）或纠错（CORRECT）**。若先写入 `CEO → Alice`，后续写入 `CEO → Bob`，记忆会变成 `CEO → Alice + Bob`。

将所有键与值按列排成矩阵 $K = [k_1, \dots, k_N]$、$V = [v_1, \dots, v_N]$，Hebbian 记忆可写为 $S = V K^\top$。用全部键一次性读取，得到：

$$
S K = V K^\top K = V G, \qquad G = K^\top K
$$

其中 $G$ 是键的 **Gram 矩阵**，对角元 $G_{jj} = \|k_j\|^2 = 1$ 代表目标信号，非对角元 $G_{ij} = k_i^\top k_j$ 代表记忆之间的串扰。因此检索误差可以精确写为：

$$
E = S K - V = V(G - I)
$$

只有当所有键严格正交（$G = I$）时误差才为零。如果跳出简单外积，直接把联想记忆重新定义为**上下文内的线性回归问题**：

$$
S^* = \arg\min_S \|S K - V\|_F^2 \quad \Longrightarrow \quad S^* = V K^+
$$

这里 $K^+$ 是 Moore–Penrose 伪逆。这个重新定义非常关键——它直接把“如何构造更好的联想记忆”转化成了“如何在线求解最小二乘”，为后文的 Delta Rule 埋下了伏笔。

---

## 三、第二层：记忆容量与串扰（Memory Capacity & Interference）

固定尺寸的矩阵 $S \in \mathbb{R}^{d_v \times d_k}$ 到底能可靠存多少条记忆？为什么线性模型可以流式处理百万 token，却经常在长距离精确召回上失效？

### 1. 信号与串扰的定量尺度

假设键向量 $k_i \in \mathbb{R}^d$ 已归一化（$\|k_i\| = 1$），查询第 $j$ 条记忆时：

$$
\hat{v}_j = S k_j = \underbrace{v_j}_{\text{Signal}} + \underbrace{\sum_{i \neq j} v_i (k_i^\top k_j)}_{\text{Interference } n_j}
$$

高维空间存在一个经典几何性质：**两个独立随机单位向量近似正交**。其内积满足 $\mathbb{E}[k_i^\top k_j] = 0$、$\operatorname{Var}(k_i^\top k_j) \approx \frac{1}{d}$，因此单对键之间的串扰量级为：

$$
|k_i^\top k_j| \sim \frac{1}{\sqrt{d}}
$$

单个泄漏虽然很小，但记忆中存在 $N - 1$ 条其他关联。在键与值大致独立且 $\|v_i\| \approx 1$ 的基准假设下，累积噪声能量为：

$$
\mathbb{E}\|n_j\|^2 \approx \sum_{i \neq j} \mathbb{E}\big[(k_i^\top k_j)^2\big] \|v_i\|^2 \approx \frac{N - 1}{d}
$$

由此直接得到噪声幅值与信噪比（SNR）的标度律：

$$
\|n_j\|_{\mathrm{RMS}} \sim \sqrt{\frac{N}{d}}, \qquad \mathrm{SNR} \sim \sqrt{\frac{d}{N}}
$$

- 当 $N \ll d$ 时，噪声远小于信号，检索干净；
- 当 $N \sim d$ 时，噪声与信号同量级，串扰显著；
- 当 $N \gg d$ 时，简单 Hebbian 累加会被噪声淹没。

从自由度计数也能看到一致的直觉：若 $d_k = d_v = d$，矩阵 $S$ 共有 $d^2$ 个标量自由度，而每条任意值向量 $v_i \in \mathbb{R}^d$ 携带 $O(d)$ 自由度，因此无损存储任意 $N$ 条关联满足 $N d \lesssim d^2 \Rightarrow N \lesssim d$。

### 2. 三个必须区分的概念

评估所有 Linear Attention / SSM 的长上下文能力时，必须严格区分三件事：

$$
\text{Sequence Length} \;\neq\; \text{State Size} \;\neq\; \text{Memory Capacity}
$$

1. **能跑多长（Sequence Length）**：定长循环状态天然支持 $10^6$ 甚至无限流式输入，但这不等于能准确记住百万条独立事实。
2. **精确容量 vs. 近似容量**：
   - **精确任意关联**受硬性秩约束 $\operatorname{rank}(K) \le d$ 限制——一旦 $N > d$，键必然线性相关，任意线性映射 $S$ 都不可能对任意独立值同时满足 $S k_i = v_i$。
   - **近似分布式记忆（Superposition）** 允许 $N > d$：借助训练学到的 Key 几何结构、值的低维结构与下游非线性去噪，模型可以在同一组参数里叠加超过维度的信息，但代价是持续上升的串扰误差。
3. **暴力扩维的工程死胡同**：想要按 $\mathrm{SNR} \sim \sqrt{d/N}$ 提升 8 倍容量，需要将 $d$ 扩大 8 倍，但矩阵状态 $S \in \mathbb{R}^{d \times d}$ 的显存与计算代价会暴涨 **$64\times$（$O(d^2)$）**。

既然无法靠无限增大状态尺寸解决问题，唯一可持续的出路就是：**主动回收过时或低价值的容量**。

---

## 四、第三层：遗忘与门控（Forgetting / Gating）——有限容量的预算分配

在固定容量的记忆系统里，**遗忘不是缺陷，而是容量管理（Garbage Collection）的必要能力**。如果第 1 个 token 和第 1,000,000 个 token 永远享有同等权重，串扰必然随 $t$ 单调发散。

### 1. 遗忘机制的五个演化层级

| 层级 | 状态更新形式 | 核心能力与局限 |
| :--- | :--- | :--- |
| **1. 无遗忘** | $S_t = S_{t-1} + v_t k_t^\top$ | 所有历史永久叠加，噪声随 $t \to \infty$ 发散 |
| **2. 固定标量衰减** | $S_t = \gamma S_{t-1} + v_t k_t^\top \;(0<\gamma<1)$ | 引入记忆时间尺度 $\tau \sim \frac{1}{1-\gamma}$，噪声收敛到有界窗口；但默认“越近越重要” |
| **3. 多尺度衰减** | 不同 Head 配置 $\gamma_1, \dots, \gamma_H$（如 RetNet） | 同时覆盖短、中、长程时间尺度；但仍无法按内容选择保留 |
| **4. 数据依赖向量门控** | $S_t = g_t \odot S_{t-1} + v_t k_t^\top,\; g_t = f_\theta(x_t)$ | 打破“重要性 $\approx$ 近因性”，不同通道拥有动态自适应时间常数 |
| **5. 遗忘门 + 写入门** | $S_t = \alpha_t \odot S_{t-1} + \beta_t \odot (v_t k_t^\top)$（如 GLA） | 独立控制“旧记忆留多少”与“新关联写多少”，实现可学习的内存预算分配 |

在固定衰减下，历史 $\tau$ 步前的关联权重为 $\gamma^\tau$，累积噪声能量收敛为几何级数：

$$
\text{Noise}^2 \propto \frac{1}{d} \sum_{\tau=0}^{\infty} \gamma^{2\tau} = \frac{1}{d(1 - \gamma^2)}
$$

有效记忆条数不再随序列长度无限增长，而是被锁定在：

$$
N_{\text{eff}} \sim \frac{1}{1 - \gamma^2} \approx \frac{1}{2(1 - \gamma)} \quad (\gamma \to 1)
$$

当进一步把固定衰减升级为数据依赖的通道门控 $\alpha_t \in [0, 1]^d$ 与写入门 $\beta_t$ 后，结构上已经非常接近 LSTM 的 $c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t$，但状态从向量 $c_t \in \mathbb{R}^d$ 升级为了带有显式 $K \to V$ 寻址结构的矩阵 $S_t \in \mathbb{R}^{d_v \times d_k}$。

### 2. 乘积保留权重、对偶并行形式与连续时间桥梁

将标量（或逐通道）门控递推 $S_t = g_t S_{t-1} + v_t k_t^\top$ 展开并代入读取 $y_t = S_t q_t$：

$$
y_t = \sum_{i \le t} \underbrace{(k_i^\top q_t)}_{\text{Content Similarity}} \underbrace{\left(\prod_{j=i+1}^{t} g_j\right)}_{\text{Retention Weight } D_{ti}} v_i
$$

这条展开式揭示了两个极其重要的性质：

1. **训练并行 + 推理循环的对偶性（Dual Form）**：构造下三角保留矩阵 $D_{ti} = \prod_{j=i+1}^t g_j$，训练阶段即可写成并行矩阵形式 $(Q K^\top \odot D) V$（或按块切分的 Chunkwise 形式）吃满 GPU 算力；自回归推理阶段则切回递推形式 $S_t = g_t S_{t-1} + v_t k_t^\top$，实现 $O(1)$ 状态更新。
2. **与连续时间动力学 / SSM 的汇合**：衰减率 $\gamma$ 对应常微分方程 $\frac{dS}{dt} = -\lambda S$ 的离散化 $\gamma = e^{-\lambda \Delta t}$。当允许衰减率依赖输入 $\gamma_t = e^{-\lambda_t \Delta_t}$ 时，GLA 的 $S_t = G_t(x_t) \odot S_{t-1} + B_t(x_t)$ 与 Mamba 的选择性状态空间 $h_t = A_t(x_t) h_{t-1} + B_t(x_t) x_t$ 在数学结构上完全同构——共同核心都是 **Input-Dependent State Transition（选择性）**。

### 3. 门控的边界：粗粒度衰减无法“精准改写”

尽管 Gating 解决了容量回收，但它依然是**全局或通道级的粗粒度操作**。面对同键更新：

- 先存入 `CEO → Alice`；
- 后出现 `CEO → Bob`。

门控只能将旧状态整体缩放（如 $0.9 S + v_{\text{Bob}} k_{\text{CEO}}^\top$），得到 `0.9 Alice + Bob`——旧值并未被精准擦除，只是缓慢衰减；而为了衰减 `Alice` 调低门控，还会误伤同通道里的其他有效记忆。这引出了第四个核心操作：**定向纠错（Correct）**。

---

## 五、第四层：Delta Rule——从“存储”跃迁到“在线学习”

Delta Rule 的核心更新方程只有一行：

$$
S_t = S_{t-1} + \beta_t \left(v_t - S_{t-1} k_t\right) k_t^\top
$$

记号上与 Hebbian 写入极其接近，但理念发生了质变：**它不再盲目写入目标值 $v_t$，而是“先读后写（Read Before Write）”——只写入预测误差 $e_t = v_t - S_{t-1} k_t$。**

若键已归一化（$\|k_t\| = 1$），更新后立即用 $k_t$ 读取新记忆，会得到一个非常清晰的凸组合：

$$
\hat{v}_t^{\text{new}} = S_t k_t = (1 - \beta_t) \hat{v}_t^{\text{old}} + \beta_t v_t
$$

当 $\beta_t = 1$ 时，`CEO → Alice` 会被一步精确改写为 `CEO → Bob`；当 $0 < \beta_t < 1$ 时，则是按强度 $\beta_t$ 做部分修正；而如果旧记忆已经记对了（$S_{t-1} k_t = v_t$），误差为零，$\Delta S = 0$，彻底避免了重复信息导致的幅值膨胀。

理解 Delta Rule 最有价值的方式，是同时用**三个完全等价的视角**看同一条公式：

### 视角 1：联想记忆的定向编辑（Associative Memory Editing）

Hebbian Rule 是盲写 `WRITE(k, v)`；Delta Rule 则是完整的记忆控制器流程：

```text
old   = READ(k_t)         # 查出当前记忆对 k_t 的预测 v̂_t = S_{t-1} k_t
error = v_t - old         # 计算与新目标的差异 e_t
WRITE(k_t, β_t * error)   # 仅沿 k_t 方向写回修正量
```

这赋予了记忆系统**新奇度敏感（Prediction-Error-Driven Writing）**的能力：已知的忽略，冲突的纠正。

### 视角 2：在线梯度下降（Online Gradient Descent）

把状态矩阵 $S$ 视为一个线性预测模型 $f_S(k) = S k$，在当前样本 $(k_t, v_t)$ 上定义均方误差损失：

$$
\mathcal{L}_t(S) = \frac{1}{2} \|S k_t - v_t\|^2
$$

对 $S$ 求梯度得 $\nabla_S \mathcal{L}_t = (S k_t - v_t) k_t^\top$，执行一步学习率为 $\beta_t$ 的梯度下降：

$$
S_t = S_{t-1} - \beta_t \nabla_S \mathcal{L}_t(S_{t-1}) = S_{t-1} + \beta_t (v_t - S_{t-1} k_t) k_t^\top
$$

这不是类比，而是**严格的数学等价**。由于流式推理无法在每一步都重新求解全局伪逆 $S^* = V K^+$，Delta Rule 恰好提供了求解上下文回归问题的廉价在线近似。更进一步，这一视角还打开了泛化空间：如果记忆更新本身就是在做在线优化，那么内层优化器也不必局限于一阶 SGD，理论上可以引入动量、预条件或递推最小二乘（RLS）等思路。

### 视角 3：Fast Weights 与元学习（Meta-Learning）

在这个视角下，模型存在两套不同时间尺度的参数：

- **Slow Weights（$\theta = \{W_q, W_k, W_v, W_\beta, \dots\}$）**：在预训练外循环（Outer Loop）中学习**“如何学习”**——决定什么信息作为训练输入 $k_t$、什么作为目标 $v_t$、这一步的上下文学习率 $\beta_t = \sigma(W_\beta x_t)$ 取多大、以及如何构造查询 $q_t$；
- **Fast Weights（$S_t$）**：在推理内循环（Inner Loop）中，把当前上下文视作在线训练集，实时训练出一个临时的小型关联模型 $S_t$。

> **保持克制**：Fast Weights / Online Learning 视角对理解线性记忆模型极有解释力，但不能据此简单断言“完整 Transformer 的全部 In-Context Learning 都等价于 Delta Rule”——多层非线性注意力叠加出的 ICL 机制远比单层线性快权重丰富。

### Delta Rule 的边界：串扰未消灭，且仍需全局回收

Delta Rule 同样面临经典持续学习中的 **Stability–Plasticity 权衡**：
1. **非正交键仍会耦合**：更新 $k_2$ 会导致对 $k_1$ 的预测偏移 $\Delta \hat{v}_1 = \beta e_2 (k_2^\top k_1)$，因此它依然受制于 Key 几何结构，不是完美的随机存取内存（RAM）。
2. **缺乏全局容量回收**：如果某条旧记忆 $k_{\text{old}} \to v_{\text{old}}$ 此后再未出现相似键，Delta Rule 不会主动清除它，它仍会长期占据有限的矩阵容量。

> **关于训练并行化**：将 Delta Rule 改写为 $S_t = S_{t-1}(I - \beta_t k_t k_t^\top) + \beta_t v_t k_t^\top$ 后，串行相乘的 rank-1 变换链会破坏简单累加的并行性。DeltaNet 通过 **WY 表示**将块内所有 rank-1 变换精确压缩为低秩矩阵乘积与小型三角方程，从而恢复 GPU 友好的分块并行计算——完整推导见 [DeltaNet 中的 WY 变换：从 Delta Rule 到分块并行](2026-09-19-deltanet-wy-transform.md)。

---

## 六、合流：Gated Delta、SSM/Mamba 与 LLM 记忆层级

走到这里，前面拆解出的各个模块自然合流为现代序列架构的完整图景。

### 1. Gating + Delta：两个正交能力的结合

Gating 回答**“全局 / 通道级该忘多少（Capacity Recycling）”**，Delta 回答**“针对当前键该改哪里（Key-Specific Correction）”**。两者正交互补，合并后形成现代线性记忆的核心范式（如 **Gated DeltaNet**、Moonshot AI 的 **Kimi Delta Attention / KDA**）：

$$
S_t = \alpha_t \odot S_{t-1} + \beta_t \left(v_t - \tilde{S}_{t-1} k_t\right) k_t^\top
$$

（具体模型中衰减作用于旧状态的精确参数化形式略有差异，但逻辑流水线高度一致）：

```text
Old Memory S_{t-1}
      │
      ▼
1. RETAIN / FORGET  (α_t：按通道动态回收容量)
      │
      ▼
2. READ             (用 k_t 查出当前预测 v̂_t)
      │
      ▼
3. ERROR            (与新目标 v_t 对比得到残差 e_t)
      │
      ▼
4. WRITE            (以强度 β_t 沿 k_t 写回纠错)
      │
      ▼
New Memory S_t
```

至此，一个完整的神经记忆层同时具备了五个原语：**Retain / Forget + Read + Compare + Correct + Write**。

### 2. Associative Memory 与 Dynamical System 的统一

将线性注意力家族与 SSM / Mamba 并列观察：

- **Linear Attention / GLA / DeltaNet / KDA**：采用**联想记忆参数化**，状态是显式表达 $K \to V$ 映射的二维矩阵 $S_t \in \mathbb{R}^{d_v \times d_k}$；
- **SSM / Mamba**：采用**动力系统参数化**，状态是按连续时间离散化演化的结构化隐状态 $h_t$。

两者在抽象层面高度统一：都是**依赖输入的选择性线性递推（Selective State Transition）**，都在做“有限状态下的有损历史压缩”，也都受限于同一个信息容量瓶颈。

### 3. 为什么是 Hybrid？——走向计算机式的 LLM Memory Hierarchy

既然线性记忆与 SSM 做到了 $O(N)$ 计算复杂度与 $O(1)$ 推理状态，为什么前沿大模型没有全面放弃 Softmax Attention？原因有三：

1. **精确检索难以替代**：面对“十万 token 前的一串随机密码”，显式保存 KV 的 Full Attention 是一步精确查表；而任何定长压缩状态都必须对抗容量上限与串扰。
2. **Big-O 不等于实际墙钟时间（Wall-Clock Time）**：GPU 极度偏好高算术强度的稠密矩阵乘法，高度优化的 FlashAttention 在中短上下文下往往比串行依赖更强或访存欠佳的 $O(N)$ 算子更快。
3. **混合架构取长补短**：以 Kimi Linear 等为代表的 Hybrid 路线，在大部分层使用廉价的 Gated Delta / Linear Memory 维护工作记忆，每隔若干层插入少量 Full Attention 层负责全局精确检索，使整体代价从 $L \cdot O(N^2)$ 降至 $L_{\text{linear}} O(N) + L_{\text{attn}} O(N^2)$（$L_{\text{attn}} \ll L$）。

拉远到整个 AI 系统，LLM 的架构演进正呈现出与计算机存储体系惊人相似的**记忆层级（Memory Hierarchy）**：

| LLM 记忆层级 | 典型载体 | 对应计算机层级 | 核心特性 |
| :--- | :--- | :--- | :--- |
| **参数记忆（Parametric Memory）** | 模型慢权重 $\theta$ | 固件 / 只读知识库 | 容量巨大、更新极慢（训练期固化） |
| **线性 / 循环工作记忆** | Linear Attention / SSM State $S_t$ | CPU Register / L1 Cache | $O(1)$ 定长、读写极快、有损压缩、擅长在线跟踪 |
| **精确上下文记忆** | Full Attention / MLA KV Cache | RAM | $O(N)$ 增长、精确内容寻址、成本随长度上升 |
| **外部长期记忆** | RAG、文件系统、数据库、工具环境 | SSD / 网络存储 | 几乎无限容量、延迟较高、依赖检索质量 |

未来序列架构的核心命题，不再是“谁消灭 Transformer”，而是**如何协同编排这套多层记忆体系**——让不同生命周期、不同精度要求的信息，自然落入最合适的记忆层级。

---

## 七、延伸阅读

- [DeltaNet 中的 WY 变换：从 Delta Rule 到分块并行](2026-09-19-deltanet-wy-transform.md) —— 衔接本文第五节，完整推导 Delta Rule 的分块并行化与三角耦合矩阵 $T$。
- [2026 KV Cache 工程实践指南](2026-04-14-kv-cache-engineering-guide.md) —— 聚焦显式记忆层（KV Cache）在推理系统中的显存与吞吐优化。
- [Agent 记忆：从原始证据到可复用知识](2026-11-10-agent-engineering-environment-memory.md) —— 聚焦外部长期记忆层在 Agent 工程中的组织与复用。
