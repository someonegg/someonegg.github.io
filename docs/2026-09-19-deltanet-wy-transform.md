# DeltaNet 中的 WY 变换：从 Delta Rule 到分块并行

> 面向读者：学过本科线性代数、矩阵乘法和基础程序设计，但不要求了解数值线性代数或线性注意力。  
> 核心目标：理解 DeltaNet 为什么会出现 WY 表示、三角方程，以及 $W=TK$、$U=TV$ 这些公式究竟在表达什么。

## 1. 先说结论

DeltaNet 的核心状态更新是：

$$
S_t
=
S_{t-1}
+
\beta_t
\left(v_t-S_{t-1}k_t\right)k_t^\top.
$$

它先用当前 key $k_t$ 从记忆矩阵 $S_{t-1}$ 中读出旧值，再把“目标值 $v_t$ 与旧值的误差”写回去。这比简单累加 $v_tk_t^\top$ 更像一次覆写。

展开后：

$$
S_t
=
S_{t-1}\left(I-\beta_tk_tk_t^\top\right)
+
\beta_tv_tk_t^\top.
$$

一个 chunk 内连续出现很多个形如

$$
A_t=I-\beta_tk_tk_t^\top
$$

的矩阵。逐 token 计算会形成串行链。WY 表示把这些 rank-1 变换的乘积精确地压缩为

$$
A_1A_2\cdots A_C=I-W^\top K,
$$

并把 $W$ 的递推写成一个下三角方程：

$$
(I+L)W=DK.
$$

其中：

$$
D=\operatorname{diag}(\beta),
\qquad
L=\operatorname{tril}(DKK^\top,-1).
$$

定义

$$
T=(I+L)^{-1}D,
$$

就得到

$$
W=TK.
$$

value 侧受到完全相同的历史耦合，因此同一个 $T$ 还能给出

$$
U=TV.
$$

最值得记住的是：

> $T$ 不是“处理 key 的特殊矩阵”，而是一个 chunk 内各次 Delta 更新之间的因果耦合矩阵。$K$ 和 $V$ 只是两组不同的右端输入。

WY 的工程意义也不是让依赖凭空消失，而是把逐 token 的控制流依赖改写成矩阵乘法和小型三角方程，使 GPU 更容易高效执行。

---

## 2. 统一记号与维度

不同论文和代码可能把向量写成行或列，也可能把状态矩阵转置。公式外观会随之改变，但代数内容相同。本文固定使用如下约定：

| 符号 | 维度 | 含义 |
|---|---:|---|
| $k_t$ | $d_k$ | 第 $t$ 个 key，视为列向量 |
| $v_t$ | $d_v$ | 第 $t$ 个 value，视为列向量 |
| $q_t$ | $d_k$ | 第 $t$ 个 query，视为列向量 |
| $S_t$ | $d_v\times d_k$ | 时间 $t$ 的记忆矩阵 |
| $\beta_t$ | 标量 | 第 $t$ 步的写入强度 |
| $K$ | $C\times d_k$ | 一个 chunk 的 key，逐行堆叠 |
| $V$ | $C\times d_v$ | 一个 chunk 的 value，逐行堆叠 |
| $W$ | $C\times d_k$ | key 侧经历史修正后的向量 |
| $U$ | $C\times d_v$ | value 侧经历史修正后的伪 value |
| $T,L$ | $C\times C$ | chunk 内 token 之间的耦合矩阵 |

“逐行堆叠”表示：

$$
K=
\begin{pmatrix}
k_1^\top\\
k_2^\top\\
\vdots\\
k_C^\top
\end{pmatrix},
\qquad
V=
\begin{pmatrix}
v_1^\top\\
v_2^\top\\
\vdots\\
v_C^\top
\end{pmatrix}.
$$

在这个约定下，读取操作为

$$
\widehat v_t=S_{t-1}k_t\in\mathbb{R}^{d_v}.
$$

---

## 3. Delta Rule：不是继续叠加，而是纠正旧答案

普通线性注意力可以把状态理解为外积的累加：

$$
S_t=S_{t-1}+v_tk_t^\top.
$$

如果多个相似 key 指向不同 value，简单累加可能产生干扰。Delta Rule 改为：

$$
S_t
=
S_{t-1}
+
\beta_t(v_t-S_{t-1}k_t)k_t^\top.
$$

可以把它分为三步：

1. 读取旧答案：$\widehat v_t=S_{t-1}k_t$；
2. 计算误差：$e_t=v_t-\widehat v_t$；
3. 沿 $k_t$ 的方向写入修正：$S_t=S_{t-1}+\beta_te_tk_t^\top$。

例如，记忆中已有“apple → red”，新信息希望写成“apple → green”。简单累加更像把 `red` 和 `green` 放在一起；Delta Rule 写入的是 `green - red`，因而更接近覆写。

将更新式展开：

$$
\begin{aligned}
S_t
&=S_{t-1}+\beta_tv_tk_t^\top
-\beta_tS_{t-1}k_tk_t^\top\\
&=S_{t-1}(I-\beta_tk_tk_t^\top)
+\beta_tv_tk_t^\top.
\end{aligned}
$$

定义

$$
A_t=I-\beta_tk_tk_t^\top,
$$

则

$$
S_t=S_{t-1}A_t+\beta_tv_tk_t^\top.
$$

这里第一次出现了 WY 表示要处理的对象：很多个 $A_t$ 的连乘。

---

## 4. $I-\beta kk^\top$ 与 Householder 反射

### 4.1 外积为何是 rank-1

若

$$
k=
\begin{pmatrix}
1\\2
\end{pmatrix},
$$

则

$$
kk^\top=
\begin{pmatrix}
1&2\\
2&4
\end{pmatrix}.
$$

它看起来是一个 $d_k\times d_k$ 矩阵，但每一列都是 $k$ 的倍数，只有一个独立方向，所以秩至多为 1。$I-\beta kk^\top$ 因此是“单位矩阵加一个 rank-1 修改”。

### 4.2 经典 Householder 反射

若 $n$ 是单位向量，则

$$
H=I-2nn^\top
$$

是以法向量 $n$ 所定义的超平面为镜面的反射。对任意向量 $x$：

$$
Hx=x-2n(n^\top x).
$$

$n(n^\top x)$ 是 $x$ 在法向量方向上的投影；减去两倍投影，恰好把法向分量翻转。它满足：

$$
H^\top=H,
\qquad
H^\top H=I,
\qquad
H^{-1}=H.
$$

DeltaNet 的

$$
I-\beta_tk_tk_t^\top
$$

具有相同的“单位矩阵减 rank-1 外积”结构，但 $\beta_t$ 是模型生成的门控，通常不满足经典反射所要求的系数。因此它常被称为 generalized Householder transformation，而不一定是保持长度的几何反射。

### 4.3 Householder 如何用于 QR 分解

给定矩阵 $A$，QR 分解希望得到

$$
A=QR,
$$

其中 $Q$ 正交、$R$ 上三角。Householder QR 的做法是逐列消元：

1. 构造 $H_1$，把第一列主对角线下方的元素全部变为 0；
2. 在右下角子矩阵上构造 $H_2$，消去第二列主对角线下方的元素；
3. 继续进行，最终得到

$$
H_m\cdots H_2H_1A=R.
$$

因为每个 $H_i$ 都是正交矩阵，令

$$
Q=H_1H_2\cdots H_m,
$$

便有 $A=QR$。

经典 WY 表示正是为高效聚合一组 Householder 变换而提出的。DeltaNet 借用的不是 QR 分解本身，而是同一种代数结构：把一串 $I-$rank-1 变换压缩成一个低秩表示。

---

## 5. 为什么连乘是问题

只看旧状态的传递，忽略新 value 的写入：

$$
S_C=S_0A_1A_2\cdots A_C.
$$

直接实现大致是：

```python
P = eye(d_k)

for t in range(C):
    A = eye(d_k) - beta[t] * outer(K[t], K[t])
    P = P @ A
```

问题有两个：

- 每个 $A_t$ 都是 $d_k\times d_k$，显式构造和相乘代价高；
- $A_1A_2\cdots A_C$ 有顺序依赖，朴素循环难以发挥 GPU 的矩阵吞吐能力。

WY 表示的目标不是近似这个乘积，而是在不丢失交叉项的前提下精确重排它。

---

## 6. 从两个 token 看懂 WY

设

$$
A_1=I-\beta_1k_1k_1^\top,
\qquad
A_2=I-\beta_2k_2k_2^\top.
$$

直接展开：

$$
\begin{aligned}
A_1A_2
&=I-\beta_1k_1k_1^\top-\beta_2k_2k_2^\top\\
&\quad+\beta_1\beta_2k_1k_1^\top k_2k_2^\top.
\end{aligned}
$$

注意 $k_1^\top k_2$ 是标量，所以交叉项可以改写为

$$
\beta_1\beta_2k_1(k_1^\top k_2)k_2^\top.
$$

定义

$$
w_1=\beta_1k_1,
$$

以及

$$
w_2
=
\beta_2\left[k_2-w_1(k_1^\top k_2)\right].
$$

则

$$
A_1A_2=I-w_1k_1^\top-w_2k_2^\top.
$$

将向量逐行堆叠：

$$
W=
\begin{pmatrix}
w_1^\top\\w_2^\top
\end{pmatrix},
\qquad
K=
\begin{pmatrix}
k_1^\top\\k_2^\top
\end{pmatrix},
$$

就得到

$$
A_1A_2=I-W^\top K.
$$

交叉项没有被删除，而是被吸收进了 $w_2$。这是理解 WY 最关键的一步。

---

## 7. 推广到任意长度：$w_t$ 的递推

假设前 $t-1$ 个变换已经写成

$$
P_{t-1}
=A_1A_2\cdots A_{t-1}
=I-\sum_{i<t}w_ik_i^\top.
$$

加入第 $t$ 个变换：

$$
P_t=P_{t-1}A_t.
$$

代入 $A_t=I-\beta_tk_tk_t^\top$：

$$
P_t
=P_{t-1}-\beta_tP_{t-1}k_tk_t^\top.
$$

因此定义

$$
w_t=\beta_tP_{t-1}k_t,
$$

便有

$$
P_t=I-\sum_{i\le t}w_ik_i^\top.
$$

再将 $P_{t-1}$ 展开：

$$
\boxed{
w_t
=
\beta_t\left[
k_t-
\sum_{i<t}w_i(k_i^\top k_t)
\right].
}
$$

这个递推只涉及：

- key 之间的点积 $k_i^\top k_t$；
- 用这些标量对历史 $w_i$ 加权；
- 从当前 $k_t$ 中扣除历史影响。

因此，一个 chunk 内真正重要的不是逐个显式构造 $d_k\times d_k$ 的 $A_t$，而是计算所有 key 的两两点积。

---

## 8. 从递推到矩阵方程

把递推式展开并移项：

$$
w_t
+
\beta_t\sum_{i<t}(k_i^\top k_t)w_i
=
\beta_tk_t.
$$

### 8.1 三个 token 的具体形式

当 $C=3$ 时：

$$
\begin{aligned}
w_1 &= \beta_1k_1,\\
\beta_2(k_1^\top k_2)w_1+w_2 &= \beta_2k_2,\\
\beta_3(k_1^\top k_3)w_1
+\beta_3(k_2^\top k_3)w_2+w_3
&=\beta_3k_3.
\end{aligned}
$$

把系数写成矩阵：

$$
\begin{pmatrix}
1&0&0\\
\beta_2k_1^\top k_2&1&0\\
\beta_3k_1^\top k_3&\beta_3k_2^\top k_3&1
\end{pmatrix}
\begin{pmatrix}
w_1^\top\\w_2^\top\\w_3^\top
\end{pmatrix}
=
\begin{pmatrix}
\beta_1k_1^\top\\
\beta_2k_2^\top\\
\beta_3k_3^\top
\end{pmatrix}.
$$

左侧系数矩阵的对角线全为 1，对角线上方全为 0，因此它是单位下三角矩阵。

### 8.2 用 $KK^\top$ 收集所有点积

令

$$
G=KK^\top,
$$

则

$$
G_{ti}=k_t^\top k_i=k_i^\top k_t.
$$

再令

$$
D=\operatorname{diag}(\beta_1,\ldots,\beta_C).
$$

左乘 $D$ 会把 $G$ 的第 $t$ 行乘以 $\beta_t$。只保留严格下三角部分：

$$
L=\operatorname{tril}(DKK^\top,-1).
$$

于是

$$
L_{ti}=
\begin{cases}
\beta_t(k_i^\top k_t),&i<t,\\
0,&i\ge t.
\end{cases}
$$

$LW$ 的第 $t$ 行正是

$$
\beta_t\sum_{i<t}(k_i^\top k_t)w_i.
$$

因此所有递推可以一次写成

$$
\boxed{W+LW=DK,}
$$

也就是

$$
\boxed{(I+L)W=DK.}
$$

形式上可写为

$$
W=(I+L)^{-1}DK.
$$

不过实现时一般不显式计算 $(I+L)^{-1}$，而是直接解三角方程。

---

## 9. Triangular solve 到底是什么

### 9.1 前向代入

设 $A$ 是下三角矩阵，要解

$$
AX=B.
$$

由于第 $t$ 行只包含 $X_1,\ldots,X_t$，可以从上到下求解：

$$
X_t
=
\frac{B_t-\sum_{i<t}A_{ti}X_i}{A_{tt}}.
$$

若 $A$ 是单位下三角矩阵，即 $A_{tt}=1$，则

$$
X_t=B_t-\sum_{i<t}A_{ti}X_i.
$$

这称为 forward substitution。上三角矩阵则从下向上求解，称为 back substitution。

### 9.2 最直白的伪代码

```python
def solve_unit_lower(A, B):
    # A: [C, C]，单位下三角
    # B: [C, d]，允许同时有 d 个右端项
    X = zeros_like(B)

    for t in range(C):
        X[t] = B[t]
        for i in range(t):
            X[t] -= A[t, i] * X[i]

    return X
```

代入 DeltaNet：

```python
G = K @ K.T
L = tril(beta[:, None] * G, diagonal=-1)
A = eye(C) + L
B = beta[:, None] * K

W = solve_triangular(
    A,
    B,
    lower=True,
    unit_diagonal=True,
)
```

逐行展开就是：

```python
for t in range(C):
    W[t] = beta[t] * K[t]

    for i in range(t):
        similarity = dot(K[i], K[t])
        W[t] -= beta[t] * similarity * W[i]
```

它与原递推完全等价，没有引入新的数学。

### 9.3 为什么不用 `inverse(A) @ B`

显式求逆通常会：

- 做不必要的额外计算；
- 占用更多中间内存；
- 放大数值误差；
- 丢失“$A$ 是三角矩阵”这一可利用的结构。

因此，想计算 $A^{-1}B$ 时，应优先直接求解 $AX=B$。

对于 $C\times C$ 的三角矩阵和 $d$ 个右端项，朴素工作量约为 $O(C^2d)$。这与一般稠密矩阵求逆的 $O(C^3)$ 不是同一个操作。

### 9.4 必须澄清：三角求解仍有依赖

第 $t$ 行依赖前面的解，所以 triangular solve 并没有在数学上消灭串行性。更准确的说法是：

> 它把散落在 token 循环里的依赖，编码成一个尺寸较小、结构固定的线性代数问题。

成熟数值库和专用 GPU kernel 可以对多个右端项、多个 batch、多个 head 和多个 chunk 并行，并利用分块算法与矩阵乘法提高吞吐。不能简单理解为“一个三角求解让 chunk 内所有 token 完全互不依赖”。

---

## 10. $T$ 是什么：把共同的左侧系统单独命名

定义

$$
\boxed{
T=(I+L)^{-1}D.
}
$$

于是

$$
\boxed{W=TK.}
$$

这里的逆仍然主要是数学记号。实现可以直接求解

$$
(I+L)W=DK,
$$

不必先显式形成 $T$。

$T$ 的第 $t$ 行只受位置 $1,\ldots,t$ 影响，因此它是下三角的。它编码了：

- 第 $t$ 次更新的门控 $\beta_t$；
- 第 $t$ 个 key 与所有历史 key 的相似度；
- 这些历史作用如何沿因果顺序继续传播。

若 $C=64$、$d_k=1024$，则：

```text
K:       64 × 1024
KKᵀ:     64 × 64
T:       64 × 64
W = TK:  64 × 1024
```

原本涉及 $d_k\times d_k$ 状态转移的问题，被压缩成了 $C\times C$ 的 token-token 耦合问题；当 $C\ll d_k$ 时，这一点尤其有价值。

---

## 11. 为什么 value 侧也有相同的三角结构

这一点不能只靠类比，需要从状态更新推出来。

先看两个 token。令

$$
A_t=I-\beta_tk_tk_t^\top.
$$

第一步：

$$
S_1=S_0A_1+\beta_1v_1k_1^\top.
$$

第二步：

$$
S_2=S_1A_2+\beta_2v_2k_2^\top.
$$

代入 $S_1$：

$$
S_2
=
S_0A_1A_2
+\beta_1v_1k_1^\top A_2
+\beta_2v_2k_2^\top.
$$

展开中间项：

$$
\begin{aligned}
\beta_1v_1k_1^\top A_2
&=\beta_1v_1k_1^\top
-\beta_1\beta_2v_1(k_1^\top k_2)k_2^\top.
\end{aligned}
$$

定义

$$
u_1=\beta_1v_1,
$$

以及

$$
u_2
=
\beta_2\left[v_2-u_1(k_1^\top k_2)\right],
$$

则

$$
S_2=S_0A_1A_2+u_1k_1^\top+u_2k_2^\top.
$$

推广到任意 $t$：

$$
\boxed{
u_t
=
\beta_t\left[
v_t-
\sum_{i<t}u_i(k_i^\top k_t)
\right].
}
$$

与 $w_t$ 并排比较：

$$
w_t
=
\beta_t\left[
k_t-
\sum_{i<t}w_i(k_i^\top k_t)
\right],
$$

$$
u_t
=
\beta_t\left[
v_t-
\sum_{i<t}u_i(k_i^\top k_t)
\right].
$$

两者的历史耦合系数完全相同：

$$
\beta_t(k_i^\top k_t).
$$

区别仅在于右端的原始输入一个是 $k_t$，另一个是 $v_t$。因此：

$$
(I+L)W=DK,
$$

$$
(I+L)U=DV.
$$

使用相同的

$$
T=(I+L)^{-1}D,
$$

自然得到

$$
\boxed{W=TK,\qquad U=TV.}
$$

$U=TV$ 不是照着 $W=TK$ 猜出来的，而是两组未知量满足同一个下三角系统。

---

## 12. 整个 chunk 的状态更新

前面已经得到两部分：

$$
A_1A_2\cdots A_C=I-W^\top K,
$$

以及经过后续更新修正后的写入项：

$$
\sum_{t=1}^C u_tk_t^\top=U^\top K.
$$

所以 chunk 结束时：

$$
\boxed{
S_C=S_0(I-W^\top K)+U^\top K.
}
$$

整理为更适合矩阵乘法的形式：

$$
\boxed{
S_C
=
S_0+\left(U-WS_0^\top\right)^\top K.
}
$$

检查维度：

| 表达式 | 维度 |
|---|---:|
| $WS_0^\top$ | $(C\times d_k)(d_k\times d_v)=C\times d_v$ |
| $U-WS_0^\top$ | $C\times d_v$ |
| $(U-WS_0^\top)^\top K$ | $(d_v\times C)(C\times d_k)=d_v\times d_k$ |
| $S_C$ | $d_v\times d_k$ |

这揭示了 $U$ 的含义：它不是原始 value 的简单缩放，而是考虑 chunk 内更早写入后得到的 pseudo-value。

### 12.1 chunk 内输出

若把 query 逐行堆成 $Q\in\mathbb{R}^{C\times d_k}$，用严格因果或含当前位的下三角 mask $M$ 限制读取范围，则 chunk 内所有输出可以写成类似：

$$
O
=
QS_0^\top
+
\left(QK^\top\odot M\right)
\left(U-WS_0^\top\right).
$$

第一项从 chunk 进入前的状态读取，第二项读取当前 chunk 内已经发生的修正。其主要计算都是矩阵乘法。

---

## 13. 从代码完整走一遍

下面的伪代码只展示 WY 准备阶段与 chunk 末状态，不包含 batch、head、数值精度和反向传播等工程细节。

```python
# K:    [C, d_k]
# V:    [C, d_v]
# beta: [C]
# S0:   [d_v, d_k]

# 1. chunk 内所有 key 的两两点积
G = K @ K.T                         # [C, C]

# 2. 第 t 行乘 beta[t]，只保留历史位置 i < t
L = tril(beta[:, None] * G, diagonal=-1)

# 3. 单位下三角系统
A = eye(C) + L                      # [C, C]

# 4. 解同一个 A，右端分别换成 K 和 V
W = solve_triangular(
    A,
    beta[:, None] * K,
    lower=True,
    unit_diagonal=True,
)                                      # [C, d_k]

U = solve_triangular(
    A,
    beta[:, None] * V,
    lower=True,
    unit_diagonal=True,
)                                      # [C, d_v]

# 5. 整个 chunk 的状态转移
delta = U - W @ S0.T                # [C, d_v]
S1 = S0 + delta.T @ K               # [d_v, d_k]
```

若确实需要显式构造 $T$，概念上可以写：

```python
D = diag(beta)
T = solve_triangular(
    A,
    D,
    lower=True,
    unit_diagonal=True,
)

W = T @ K
U = T @ V
```

但只为得到 $W,U$ 时，直接解两个多右端项系统通常更自然，也避免显式保存 $T$。

---

## 14. 为什么要分 chunk

若把长度为 $N$ 的整段序列一次性处理，则

$$
KK^\top\in\mathbb{R}^{N\times N},
$$

时间和空间又会出现关于序列长度的二次项。这会失去线性注意力处理长序列的主要优势。

因此实际算法将序列切成长度为 $C$ 的 chunk：

```text
token 1 ─────── C        chunk 1
token C+1 ───── 2C       chunk 2
token 2C+1 ──── 3C       chunk 3
...
```

- chunk 内：使用 $KK^\top$、三角系统和 GEMM 组织计算；
- chunk 间：传递固定大小的状态矩阵 $S$。

这种设计在两种极端之间折中：

| 形式 | 优点 | 代价 |
|---|---|---|
| 逐 token recurrence | 推理自然，额外状态固定 | 训练时序列方向并行度低 |
| 整段 fully parallel | 并行度高 | 形成 $N\times N$ 中间量 |
| chunkwise | 控制二次项大小，同时利用矩阵乘法 | chunk 之间仍需传递状态 |

WY 并没有把算法变成“无依赖的普通 attention”。更准确地说，它把 chunk 内依赖浓缩进 $C\times C$ 的下三角结构，再把 chunk 间依赖保留在 recurrent state 中。

---

## 15. 性能上的真正收益

### 15.1 避免显式构造大量 $d_k\times d_k$ 变换

原始形式似乎需要保存或处理每个

$$
A_t=I-\beta_tk_tk_t^\top.
$$

WY 只需保存 $K,W$，并在 chunk 内处理 $C\times C$ 的 $L$ 或 $T$。

### 15.2 把标量/向量递推组织成矩阵运算

主要计算转化为：

```text
K @ K.T
W @ S0.T
delta.T @ K
Q @ K.T
```

这些都是 GPU 擅长的 GEMM 或结构化矩阵运算。

### 15.3 顺序深度减少，但不是归零

朴素 recurrence 跨整个长度 $N$ 串行。chunkwise 算法可以让不同 chunk 的 $W,U$ 准备工作并行进行，而状态传播只跨 $N/C$ 个 chunk；chunk 内的因果依赖由小型三角系统处理。

因此更严谨的描述是：减少全序列的顺序瓶颈，并改善硬件利用率，而不是把所有时间依赖彻底消除。

---

## 16. 常见误解

### 误解一：WY 丢弃了高阶交叉项

没有。两个 token 的推导已经表明，交叉项被吸收进 $w_2$；更多 token 时也同理。WY 在这里是精确代数重排。

### 误解二：$T$ 是注意力矩阵

$T$ 的确由 $KK^\top$ 构造，也描述 token-token 关系，但它不是普通 softmax attention 权重。普通 attention 的 $q_t^\top k_i$ 描述“当前位置如何读过去”；这里的 $k_t^\top k_i$ 更像描述“当前写入与历史写入相互影响多少”。

可以把二者作非正式类比：

- attention 主要描述 read interaction；
- DeltaNet 的 WY 结构主要描述 write interaction。

### 误解三：$W=TK$ 意味着 $W$ 没有递归依赖

依赖仍在，只是从程序循环搬进了下三角矩阵 $T$。这是“控制流依赖变成数据结构中的依赖”。

### 误解四：triangular solve 等价于显式求逆

数学上 $X=A^{-1}B$，算法上通常直接解 $AX=B$。两者不应在代码层面混为一谈。

### 误解五：经典 Householder 与 DeltaNet 的 $A_t$ 完全相同

经典反射要求特定系数，使变换正交并保持长度。DeltaNet 的 $\beta_t$ 是可学习门控，所以只能说结构相似，是 generalized Householder transformation。

### 误解六：使用 WY 后整段序列都可一次处理

若把整段序列作为一个 chunk，$KK^\top$ 会变成 $N\times N$。实际实现需要 chunkwise 折中。

### 误解七：Householder 变换“完全不会有数值误差”

浮点计算永远存在舍入误差。Householder QR 通常比经典 Gram-Schmidt 更稳定，但不能说它在计算机上保持数学意义上的绝对精确正交。

---

## 17. 一条完整的推导链

从 Delta Rule 开始：

$$
S_t=S_{t-1}+\beta_t(v_t-S_{t-1}k_t)k_t^\top
$$

展开：

$$
S_t=S_{t-1}(I-\beta_tk_tk_t^\top)+\beta_tv_tk_t^\top
$$

发现状态转移是单位矩阵的 rank-1 修改：

$$
A_t=I-\beta_tk_tk_t^\top
$$

WY 将一个 chunk 的连乘写成：

$$
A_1A_2\cdots A_C=I-W^\top K
$$

其中：

$$
w_t
=
\beta_t\left[k_t-\sum_{i<t}w_i(k_i^\top k_t)\right]
$$

把所有递推堆叠：

$$
(I+L)W=DK,
\qquad
L=\operatorname{tril}(DKK^\top,-1)
$$

定义：

$$
T=(I+L)^{-1}D
$$

得到：

$$
W=TK
$$

value 侧满足同一耦合关系：

$$
U=TV
$$

最后，整个 chunk 的状态更新为：

$$
S_C
=
S_0+\left(U-WS_0^\top\right)^\top K.
$$

这条链就是 DeltaNet 中 WY 变换的核心。

---

## 18. 最终直觉

可以把一个 chunk 想成一批按时间排序的 memory edits：

- 每个 token 都想让某个 key 指向新的 value；
- 相似 key 的写入会互相影响；
- $KK^\top$ 一次收集所有 key 的相似度；
- 下三角结构表达“只能受过去影响”；
- $T$ 统一编码这些有顺序的写入耦合；
- $W=TK$ 得到修正后的状态转移方向；
- $U=TV$ 得到修正后的实际写入量。

因此可以把 WY 在 DeltaNet 中的作用概括为：

> 将一串有因果依赖的 rank-1 memory edits，精确重排为一个小型三角系统和若干大块矩阵乘法。

它没有改变 Delta Rule 的语义，也没有删除时间依赖；它改变的是依赖的表达方式，使相同数学更适合现代硬件。

---

## 参考资料

1. Songlin Yang, Bailin Wang, Yu Zhang, Yikang Shen, Yoon Kim. [Parallelizing Linear Transformers with the Delta Rule over Sequence Length](https://arxiv.org/abs/2406.06484), 2024/2025 revision.
2. Christian Bischof, Charles Van Loan. [The WY Representation for Products of Householder Matrices](https://doi.org/10.1137/0908009), 1987.
3. Flash Linear Attention. [Delta rule implementation](https://github.com/fla-org/flash-linear-attention/tree/main/fla/ops/delta_rule) and [DeltaNet layer](https://github.com/fla-org/flash-linear-attention/blob/main/fla/layers/delta_net.py).
