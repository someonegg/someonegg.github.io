# 矩阵特征值、特征向量与对角化

## 核心直觉

矩阵不只是数字表格，更本质地说，矩阵表示一个线性变换。

特征值和特征向量要回答的问题是：

> 一个线性变换中，有没有某些方向在变换后方向不变，只是被拉伸、压缩，或反向？

若存在非零向量 $v$ 和标量 $\lambda$，使得

$$
Av = \lambda v
$$

则：

- $v$ 是矩阵 $A$ 的特征向量。
- $\lambda$ 是对应的特征值。

直观地说：

- 特征向量：矩阵作用后仍保持原方向的特殊方向。
- 特征值：该方向上的缩放倍数。

## 一个简单例子

设

$$
A =
\begin{pmatrix}
2 & 0 \\
0 & 1
\end{pmatrix}
$$

它表示：

- $x$ 方向放大 $2$ 倍。
- $y$ 方向保持不变。

因此

$$
A
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
2x \\
y
\end{pmatrix}
$$

对向量

$$
v_1 =
\begin{pmatrix}
1 \\
0
\end{pmatrix}
$$

有

$$
Av_1 =
\begin{pmatrix}
2 \\
0
\end{pmatrix}
= 2v_1
$$

所以 $v_1$ 是特征向量，对应特征值为 $2$。

对向量

$$
v_2 =
\begin{pmatrix}
0 \\
1
\end{pmatrix}
$$

有

$$
Av_2 = v_2 = 1v_2
$$

所以 $v_2$ 也是特征向量，对应特征值为 $1$。

## 为什么要求 $Av = \lambda v$

$Av$ 表示矩阵作用后的向量。

$\lambda v$ 表示原向量方向不变，只发生缩放。

所以 $Av = \lambda v$ 的含义就是：寻找矩阵不会扭转的方向。

一般矩阵可能会同时产生拉伸、压缩、旋转和剪切。大多数向量经过变换后，长度和方向都会改变。特征向量特殊在于：方向不变，只改变尺度。

## 如何求特征值

从定义出发：

$$
Av = \lambda v
$$

移项：

$$
Av - \lambda v = 0
$$

写成矩阵形式：

$$
(A - \lambda I)v = 0
$$

这里 $I$ 是单位矩阵。

因为特征向量必须是非零向量，所以方程 $(A - \lambda I)v = 0$ 必须存在非零解。若 $A - \lambda I$ 可逆，则只能得到零解。因此必须有：

$$
\det(A - \lambda I) = 0
$$

这就是特征方程。

## 完整计算例子

设

$$
A =
\begin{pmatrix}
2 & 1 \\
1 & 2
\end{pmatrix}
$$

求特征值：

$$
A - \lambda I =
\begin{pmatrix}
2-\lambda & 1 \\
1 & 2-\lambda
\end{pmatrix}
$$

行列式为：

$$
\det(A - \lambda I) = (2-\lambda)^2 - 1
$$

令其为零：

$$
(2-\lambda)^2 - 1 = 0
$$

展开：

$$
\lambda^2 - 4\lambda + 3 = 0
$$

解得：

$$
\lambda = 1, 3
$$

### 求特征向量

当 $\lambda = 3$ 时：

$$
(A - 3I)v = 0
$$

即

$$
\begin{pmatrix}
-1 & 1 \\
1 & -1
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
= 0
$$

得到：

$$
x = y
$$

所以可以取特征向量：

$$
v_1 =
\begin{pmatrix}
1 \\
1
\end{pmatrix}
$$

这表示矩阵在 $(1,1)$ 方向上不改变方向，只放大 $3$ 倍。

当 $\lambda = 1$ 时，对应特征向量可取：

$$
v_2 =
\begin{pmatrix}
1 \\
-1
\end{pmatrix}
$$

## 对角化的核心

矩阵对角化的核心是：

> 找到一组特征向量坐标系，让矩阵在这个坐标系里只做各方向独立缩放。

如果矩阵有足够多线性无关的特征向量，就可以写成：

$$
A = PDP^{-1}
$$

其中：

- $P$：由特征向量作为列组成。
- $D$：对角线上是对应特征值。
- $P^{-1}$：把普通坐标转换到特征向量坐标。
- $D$：在特征坐标中做独立缩放。
- $P$：再从特征坐标换回普通坐标。

对于上面的矩阵：

$$
A =
\begin{pmatrix}
2 & 1 \\
1 & 2
\end{pmatrix}
$$

特征值为 $3$ 和 $1$，对应特征向量可取：

$$
v_1 =
\begin{pmatrix}
1 \\
1
\end{pmatrix},
\quad
v_2 =
\begin{pmatrix}
1 \\
-1
\end{pmatrix}
$$

所以

$$
P =
\begin{pmatrix}
1 & 1 \\
1 & -1
\end{pmatrix},
\quad
D =
\begin{pmatrix}
3 & 0 \\
0 & 1
\end{pmatrix}
$$

于是：

$$
A = PDP^{-1}
$$

## 为什么 $A = PDP^{-1}$ 成立

因为：

$$
Av_1 = 3v_1
$$

$$
Av_2 = 1v_2
$$

把两条式子合并成矩阵形式：

$$
A
\begin{pmatrix}
v_1 & v_2
\end{pmatrix}
=
\begin{pmatrix}
3v_1 & 1v_2
\end{pmatrix}
$$

左边是 $AP$，右边是 $PD$，所以：

$$
AP = PD
$$

如果 $P$ 可逆，则：

$$
A = PDP^{-1}
$$

## 对角化为什么有用

对角化可以把复杂变换拆成若干独立方向上的缩放。

它特别适合计算矩阵高次幂。若：

$$
A = PDP^{-1}
$$

则：

$$
A^2 = (PDP^{-1})(PDP^{-1}) = PD^2P^{-1}
$$

一般地：

$$
A^n = PD^nP^{-1}
$$

而对角矩阵的幂很容易计算：

$$
D^n =
\begin{pmatrix}
3^n & 0 \\
0 & 1^n
\end{pmatrix}
$$

这也是对角化在递推关系、马尔可夫链、微分方程、动力系统、图算法和 PCA 中都很重要的原因。

## 什么时候可以对角化

一个 $n \times n$ 矩阵能对角化，需要有 $n$ 个线性无关的特征向量。

关键不是“有 $n$ 个特征值”，而是“有 $n$ 个线性无关的特征向量”。

## 不能对角化的例子

设

$$
A =
\begin{pmatrix}
1 & 1 \\
0 & 1
\end{pmatrix}
$$

这是一个剪切变换：

$$
\begin{pmatrix}
x \\
y
\end{pmatrix}
\mapsto
\begin{pmatrix}
x + y \\
y
\end{pmatrix}
$$

求特征值：

$$
A - \lambda I =
\begin{pmatrix}
1-\lambda & 1 \\
0 & 1-\lambda
\end{pmatrix}
$$

行列式：

$$
(1-\lambda)^2 = 0
$$

所以唯一特征值是：

$$
\lambda = 1
$$

再求特征向量：

$$
(A-I)v = 0
$$

即

$$
\begin{pmatrix}
0 & 1 \\
0 & 0
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
= 0
$$

得到：

$$
y = 0
$$

所以特征向量只有 $x$ 轴方向，例如：

$$
\begin{pmatrix}
1 \\
0
\end{pmatrix}
$$

二维空间需要两个线性无关方向才能对角化，但这里只有一个特征向量方向，因此不能对角化。

几何上看，剪切变换会把大多数方向推斜，只有 $x$ 轴方向保持不变。它没有足够的“不变方向”，所以不能拆成一组独立坐标轴上的缩放。

## 与傅立叶变换的关系

傅立叶展开可以理解为无限维空间里的对角化。

例如微分算子：

$$
T = \frac{d}{dx}
$$

对指数函数：

$$
e^{ikx}
$$

有：

$$
T e^{ikx} = ik e^{ikx}
$$

这正是特征值方程：

$$
Tf = \lambda f
$$

因此：

- 特征函数：$e^{ikx}$
- 特征值：$ik$

傅立叶变换就是把函数分解到这些特征函数上。于是微分运算在傅立叶空间中变成乘法：

$$
\frac{d}{dx} \Longleftrightarrow ik
$$

这与有限维矩阵对角化

$$
A = PDP^{-1}
$$

是同一个思想：

- 有限维：矩阵特征向量。
- 无限维：算子特征函数。

## 最终总结

特征值问题的本质是：

> 哪些方向在变换下保持自身？

进一步说：

- 特征向量是系统的天然坐标轴。
- 特征值是这些方向上的缩放率。
- 特征分解是在寻找系统真正的内部结构。
- 对角化是在换一套坐标系，把耦合系统拆成独立模式。

