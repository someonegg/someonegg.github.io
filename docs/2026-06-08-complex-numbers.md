# 复数笔记：从运算规则到旋转矩阵

这份笔记整理复数的三种视角：

- 代数视角：复数是形如 $a+bi$ 的数，满足 $i^2=-1$；
- 几何视角：复数是平面上的点或向量，乘法表示旋转与缩放；
- 线性代数视角：复数可以看成一类特殊的 $2\times2$ 矩阵。

核心线索是：

> 复数不是一个神秘的新数字，而是二维平面中“旋转 + 缩放”线性变换的代数化表示。

若继续学习 Fourier 变换，可以把本文与[[2026-05-22-fourier-transform-ft-dft.md|傅立叶变换基础：从连续 FT 到 DFT]]的附录对照阅读。Fourier 里的复指数基底，本质上就是一组不同转速的复数旋转波。

---

## 1. 复数的基本形式

复数写成：

$$
z=a+bi
$$

其中：

- $a$ 是实部，记作 $\operatorname{Re}(z)$；
- $b$ 是虚部，记作 $\operatorname{Im}(z)$；
- $i$ 是单位虚数，满足

$$
i^2=-1
$$

几何上，$z=a+bi$ 可以看成复平面上的点：

$$
(a,b)
$$

所以复数首先是一种二维坐标。但它不只是二维向量，因为它还定义了一套非常有结构的乘法。

---

## 2. 加减法：按坐标相加

设：

$$
z_1=a+bi,\qquad z_2=c+di
$$

则：

$$
z_1+z_2=(a+c)+(b+d)i
$$

$$
z_1-z_2=(a-c)+(b-d)i
$$

也就是说，加减法就是二维向量的坐标加减：

$$
(a,b)+(c,d)=(a+c,b+d)
$$

---

## 3. 乘法：按 $i^2=-1$ 展开

复数乘法的代数规则来自普通展开和 $i^2=-1$：

$$
(a+bi)(c+di)
=
ac+adi+bci+bdi^2
$$

因为 $i^2=-1$，所以：

$$
(a+bi)(c+di)
=
(ac-bd)+(ad+bc)i
$$

这是最常用的复数乘法公式：

$$
\boxed{(a+bi)(c+di)=(ac-bd)+(ad+bc)i}
$$

它看起来比向量加法复杂，是因为乘法同时混合了两个坐标方向。

---

## 4. 为什么乘以 $i$ 是旋转 $90^\circ$

先看几个简单结果：

$$
1\cdot i=i
$$

$$
i\cdot i=i^2=-1
$$

$$
(-1)\cdot i=-i
$$

$$
(-i)\cdot i=1
$$

这条链可以写成：

$$
1
\xrightarrow{\times i}
i
\xrightarrow{\times i}
-1
\xrightarrow{\times i}
-i
\xrightarrow{\times i}
1
$$

在复平面上，这正好是在单位圆上每次逆时针转 $90^\circ$。

因此：

$$
i=\text{逆时针 }90^\circ\text{ 旋转}
$$

连续乘两次 $i$，就是旋转 $180^\circ$：

$$
i^2=-1
$$

这时 $i^2=-1$ 不再只是形式规定，而是几何事实：

> 两次 $90^\circ$ 旋转 = 一次 $180^\circ$ 旋转 = 乘以 $-1$。

---

## 5. 复数乘法的几何意义

复数可以写成极坐标形式：

$$
z=re^{i\theta}
$$

其中：

- $r=|z|$ 是模长；
- $\theta=\arg z$ 是角度，也叫相位。

欧拉公式说明：

$$
e^{i\theta}
=
\cos\theta+i\sin\theta
$$

因此：

$$
re^{i\theta}
=
r\cos\theta+ir\sin\theta
$$

如果：

$$
z_1=r_1e^{i\theta_1},\qquad z_2=r_2e^{i\theta_2}
$$

那么：

$$
z_1z_2
=
r_1r_2e^{i(\theta_1+\theta_2)}
$$

所以复数乘法的几何意义是：

- 模长相乘；
- 角度相加。

也就是：

> 乘以一个复数，就是对平面向量做一次缩放和旋转。

---

## 6. 矩阵表示：复数是一类特殊线性变换

把复数

$$
z=a+bi
$$

看成作用在二维向量上的线性变换。采用列向量约定：

$$
\begin{pmatrix}
x\\
y
\end{pmatrix}
\leftrightarrow
x+yi
$$

那么乘法：

$$
(a+bi)(x+yi)
$$

展开得到：

$$
(a+bi)(x+yi)
=
(ax-by)+(ay+bx)i
$$

新的二维坐标是：

$$
\begin{pmatrix}
ax-by\\
ay+bx
\end{pmatrix}
$$

这正好等于矩阵乘法：

$$
\begin{pmatrix}
a & -b\\
b & a
\end{pmatrix}
\begin{pmatrix}
x\\
y
\end{pmatrix}
=
\begin{pmatrix}
ax-by\\
bx+ay
\end{pmatrix}
$$

因此，复数 $a+bi$ 可以对应矩阵：

$$
\boxed{
a+bi
\leftrightarrow
\begin{pmatrix}
a & -b\\
b & a
\end{pmatrix}
}
$$

这个矩阵的含义就是：对平面做一次由 $a+bi$ 决定的旋转与缩放。

---

## 7. $i$ 的矩阵形式

因为：

$$
i=0+1i
$$

所以它对应矩阵：

$$
J=
\begin{pmatrix}
0 & -1\\
1 & 0
\end{pmatrix}
$$

作用到向量：

$$
J
\begin{pmatrix}
x\\
y
\end{pmatrix}
=
\begin{pmatrix}
-y\\
x
\end{pmatrix}
$$

也就是：

$$
(x,y)\mapsto(-y,x)
$$

验证几个点：

$$
(1,0)\mapsto(0,1)
$$

$$
(0,1)\mapsto(-1,0)
$$

$$
(-1,0)\mapsto(0,-1)
$$

这正是逆时针 $90^\circ$ 旋转。

再看平方：

$$
J^2
=
\begin{pmatrix}
0 & -1\\
1 & 0
\end{pmatrix}^2
=
\begin{pmatrix}
-1 & 0\\
0 & -1
\end{pmatrix}
=
-I
$$

这就是矩阵版的：

$$
i^2=-1
$$

---

## 8. 复数乘复数：矩阵乘向量

设：

$$
z=a+bi,\qquad w=x+yi
$$

把 $z$ 看成变换矩阵：

$$
M_z=
\begin{pmatrix}
a & -b\\
b & a
\end{pmatrix}
$$

把 $w$ 看成二维向量：

$$
v_w=
\begin{pmatrix}
x\\
y
\end{pmatrix}
$$

那么：

$$
zw
\leftrightarrow
M_zv_w
$$

也就是：

$$
\begin{pmatrix}
a & -b\\
b & a
\end{pmatrix}
\begin{pmatrix}
x\\
y
\end{pmatrix}
=
\begin{pmatrix}
ax-by\\
bx+ay
\end{pmatrix}
$$

对应复数：

$$
(ax-by)+(bx+ay)i
$$

这就是把 $z$ 表示的“旋转 + 缩放”作用到点 $w$ 上。

---

## 9. 复数乘复数：矩阵乘矩阵

同一个复数也可以不看成点，而看成变换。

设：

$$
z=a+bi,\qquad w=c+di
$$

对应矩阵：

$$
M_z=
\begin{pmatrix}
a & -b\\
b & a
\end{pmatrix},
\qquad
M_w=
\begin{pmatrix}
c & -d\\
d & c
\end{pmatrix}
$$

那么复数乘法对应矩阵复合：

$$
zw
\leftrightarrow
M_zM_w
$$

直接计算：

$$
M_zM_w
=
\begin{pmatrix}
a & -b\\
b & a
\end{pmatrix}
\begin{pmatrix}
c & -d\\
d & c
\end{pmatrix}
$$

$$
=
\begin{pmatrix}
ac-bd & -(ad+bc)\\
ad+bc & ac-bd
\end{pmatrix}
$$

这个矩阵正好对应复数：

$$
(ac-bd)+(ad+bc)i
$$

也就是：

$$
(a+bi)(c+di)
$$

所以：

> 复数乘法既可以解释为“变换作用到点”，也可以解释为“变换与变换的复合”。

前者得到一个新的点；后者得到一个新的变换。两者对应同一个复数结果。

---

## 10. 复数对应矩阵为什么满足交换律

复数乘法满足交换律：

$$
zw=wz
$$

普通矩阵乘法一般不满足交换律，但复数对应的这类矩阵满足。

设：

$$
M_z=
\begin{pmatrix}
a & -b\\
b & a
\end{pmatrix},
\qquad
M_w=
\begin{pmatrix}
c & -d\\
d & c
\end{pmatrix}
$$

先算：

$$
M_zM_w
=
\begin{pmatrix}
ac-bd & -(ad+bc)\\
ad+bc & ac-bd
\end{pmatrix}
$$

反过来：

$$
M_wM_z
=
\begin{pmatrix}
ca-db & -(cb+da)\\
cb+da & ca-db
\end{pmatrix}
$$

因为 $a,b,c,d$ 都是实数，而实数乘法满足交换律：

$$
ac=ca,\qquad bd=db,\qquad ad=da,\qquad bc=cb
$$

所以：

$$
M_zM_w=M_wM_z
$$

更本质地看，这类矩阵都可以写成：

$$
M_z=aI+bJ
$$

其中：

$$
I=
\begin{pmatrix}
1 & 0\\
0 & 1
\end{pmatrix},
\qquad
J=
\begin{pmatrix}
0 & -1\\
1 & 0
\end{pmatrix}
$$

并且：

$$
J^2=-I
$$

于是：

$$
M_zM_w
=(aI+bJ)(cI+dJ)
$$

$$
=acI+adJ+bcJ+bdJ^2
$$

$$
=(ac-bd)I+(ad+bc)J
$$

反过来：

$$
M_wM_z
=(cI+dJ)(aI+bJ)
$$

$$
=caI+cbJ+daJ+dbJ^2
$$

$$
=(ac-bd)I+(ad+bc)J
$$

所以：

$$
M_zM_w=M_wM_z
$$

关键原因是：

> 复数对应的矩阵都由同一个单位矩阵 $I$ 和同一个 $90^\circ$ 旋转矩阵 $J$ 线性组合而成，因此形成了一个特殊的可交换矩阵族。

这不代表任意 $2\times2$ 矩阵都可交换。普通矩阵通常没有这种限制结构。

---

## 11. 一个完整例子

设：

$$
z=2+3i,\qquad w=1+4i
$$

直接用复数乘法：

$$
(2+3i)(1+4i)
=2+8i+3i+12i^2
$$

$$
=2+11i-12
=-10+11i
$$

看成矩阵乘向量：

$$
M_z=
\begin{pmatrix}
2 & -3\\
3 & 2
\end{pmatrix},
\qquad
v_w=
\begin{pmatrix}
1\\
4
\end{pmatrix}
$$

$$
M_zv_w
=
\begin{pmatrix}
2 & -3\\
3 & 2
\end{pmatrix}
\begin{pmatrix}
1\\
4
\end{pmatrix}
=
\begin{pmatrix}
-10\\
11
\end{pmatrix}
$$

对应：

$$
-10+11i
$$

看成矩阵乘矩阵：

$$
M_w=
\begin{pmatrix}
1 & -4\\
4 & 1
\end{pmatrix}
$$

$$
M_zM_w
=
\begin{pmatrix}
2 & -3\\
3 & 2
\end{pmatrix}
\begin{pmatrix}
1 & -4\\
4 & 1
\end{pmatrix}
=
\begin{pmatrix}
-10 & -11\\
11 & -10
\end{pmatrix}
$$

这个矩阵对应：

$$
-10+11i
$$

---

## 12. 与 Fourier 基底的关系

Fourier 分析里反复出现复指数：

$$
e^{i\omega x}
$$

欧拉公式说明：

$$
e^{i\omega x}
=
\cos(\omega x)+i\sin(\omega x)
$$

当 $x$ 变化时，$e^{i\omega x}$ 会在复平面的单位圆上旋转：

- $\omega$ 越大，旋转越快；
- $\omega$ 越小，旋转越慢；
- 正负频率对应相反方向的旋转。

因此 Fourier 基底可以理解为：

> 一组转速不同的复数旋转波。

连续 Fourier 变换使用：

$$
\hat f(\omega)
=
\int f(x)e^{-i\omega x}\,dx
$$

这里的 $e^{-i\omega x}$ 可以理解为一个反向旋转的测试波：

- 如果信号中含有同频率分量，反向旋转会把它“解旋”，使累加结果趋向对齐；
- 如果频率不匹配，向量方向会不断变化，累加时趋向互相抵消。

这也解释了为什么 Fourier 系数通常是复数。某个频率的系数可写成：

$$
\hat f(\omega)=A(\omega)e^{i\phi(\omega)}
$$

其中：

- $A(\omega)=|\hat f(\omega)|$ 表示该频率响应强度；
- $\phi(\omega)=\arg \hat f(\omega)$ 表示该频率相位。

所以 Fourier 系数不只是记录“这个频率有多强”，还记录“这个频率的相位在哪里”。

---

## 13. 小结

复数可以按四层理解：

1. 代数上，复数是 $a+bi$，并满足 $i^2=-1$；
2. 几何上，复数是平面上的点或向量；
3. 运算上，乘以复数表示旋转与缩放；
4. 线性代数上，复数是矩阵 $\begin{pmatrix}a&-b\\b&a\end{pmatrix}$ 的简写。

最重要的一句话是：

> 复数把二维平面上的旋转与缩放压缩成了像普通数字一样的代数运算。

Fourier 变换使用复数基底，正是因为复指数能把“振幅 + 相位 + 频率方向”统一写进一个简洁表达式中。
