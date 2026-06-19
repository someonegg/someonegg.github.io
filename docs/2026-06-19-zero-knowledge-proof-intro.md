# 零知识证明入门：从直觉到 zk-SNARK 工程路径

零知识证明（Zero-Knowledge Proof, ZKP）解决的问题可以一句话概括：

> 我能让你相信某个陈述为真，但不把证明它所依赖的秘密告诉你。

这句话容易误解。零知识证明不是“什么信息都不泄露”，而是只泄露公共陈述本身的真假，不泄露额外的见证信息（witness）。例如：

- 证明“我知道某个哈希值的原像”，但不公开原像；
- 证明“我的账户余额大于 1000”，但不公开具体余额；
- 证明“某段计算按规则执行并得到结果 y”，但不重新执行计算，也不公开私有输入。

这份笔记基于 SECBIT 的 zk-SNARK 系列、Vitalik Buterin 的 QAP 文章、Pinocchio 协议讲解，以及椭圆曲线密码学入门材料整理。目标不是一次性讲完所有密码学细节，而是建立一张学习地图：从“为什么可行”走到“如何写出一个可证明的计算”。

---

## 1. 先分清三件事：证明、见证、陈述

零知识证明系统里通常有两个角色：

- Prover：证明者，知道秘密；
- Verifier：验证者，不知道秘密，但想确认某个陈述是真的。

更准确地说，Prover 要证明的是一个关系：

$$
R(x, w) = 1
$$

其中：

- $x$ 是公开输入，也叫 statement；
- $w$ 是私有输入，也叫 witness；
- $R$ 是验证规则。

例子：

$$
x = h,\quad w = s,\quad R(h,s)= [Hash(s)=h]
$$

Prover 想证明：“我知道一个 $s$，使得 $Hash(s)=h$。”Verifier 只需要知道这个陈述成立，不应知道 $s$。

一个零知识证明协议至少要满足三条性质：

- 完整性（Completeness）：如果陈述是真的，诚实 Prover 能让诚实 Verifier 接受。
- 可靠性（Soundness）：如果陈述是假的，作弊 Prover 很难让 Verifier 接受。
- 零知识性（Zero-knowledge）：Verifier 除了“陈述是真的”之外，学不到关于 witness 的额外信息。

这里有一个重要边界：零知识性不等于隐藏公开输入。你选择公开什么，Verifier 就会知道什么。例如公开“余额大于 1000”，它就会知道这个判断结果；只是不知道余额到底是多少。

---

## 2. 为什么多项式会出现在证明里

很多 zk-SNARK 入门材料都会很快进入多项式。原因是：多项式有一种非常适合做“压缩验证”的性质。

如果两个次数不超过 $d$ 的多项式不同，那么它们最多只会在 $d$ 个点上取值相同。因此，如果在一个足够大的域中随机选点 $r$，并检查：

$$
f(r) = g(r)
$$

那么一个错误等式侥幸通过的概率很小。

这就是很多证明协议背后的直觉：

> 不直接检查一大堆约束，而是把约束编码成多项式，再在随机点上检查一个多项式关系。

在传统计算中，我们会逐条执行指令、逐条检查约束；在 SNARK 中，我们希望把“很多局部约束都成立”压成“一个全局多项式关系成立”。这不是魔法，靠的是有限域、多项式插值和随机抽样的可靠性。

---

## 3. 从程序到算术电路

zk-SNARK 不能直接理解任意程序语义。它通常要把待证明的计算转成算术约束。

以经典例子为例，证明者知道一个秘密 $x$，使得：

$$
x^3 + x + 5 = out
$$

其中 $out$ 可以是公开输出，$x$ 是 witness。为了把它变成电路，需要先引入中间变量，把高次表达式拆成只含乘法和加法的小步骤：

$$
x \cdot x = sym_1
$$

$$
sym_1 \cdot x = y
$$

$$
y + x = sym_2
$$

$$
sym_2 + 5 = out
$$

如果 $x=3$，那么：

$$
sym_1=9,\quad y=27,\quad sym_2=30,\quad out=35
$$

所以完整 witness 不是只有 $x$，还包括所有中间变量。很多初学者会卡在这里：证明者证明的不是“我知道输入”，而是“我知道一组变量赋值，使得整套约束都成立”。

---

## 4. R1CS：把每个门写成一个统一格式

R1CS（Rank-1 Constraint System）是 zk-SNARK 中常见的约束表示。它把每条约束写成：

$$
\langle A_i, z\rangle \cdot \langle B_i, z\rangle = \langle C_i, z\rangle
$$

其中：

- $z$ 是所有变量组成的向量，通常包含常数 $1$、公开输入、私有输入和中间变量；
- $A_i,B_i,C_i$ 是选择和组合变量的系数向量；
- $\langle \cdot,\cdot\rangle$ 是点积。

上面的例子可以用变量顺序表示为：

$$
z = [1, x, out, sym_1, y, sym_2]
$$

第一条约束 $x \cdot x = sym_1$ 可以写成：

$$
[0,1,0,0,0,0]\cdot z
\times
[0,1,0,0,0,0]\cdot z
=
[0,0,0,1,0,0]\cdot z
$$

当 $z=[1,3,35,9,27,30]$ 时，它就是：

$$
3 \times 3 = 9
$$

加法也能放进这个格式。例如 $sym_2 + 5 = out$ 可以写成：

$$
(sym_2 + 5) \times 1 = out
$$

因此 R1CS 的关键作用是统一表达：无论原程序里是乘法、加法还是常数偏移，最终都被放进同一种二次约束模板中。

---

## 5. QAP：把一组约束变成多项式关系

R1CS 仍然是一条条约束。如果约束很多，Verifier 逐条检查仍然昂贵。QAP（Quadratic Arithmetic Program）的目标是把这些约束整体编码成多项式。

粗略地说，QAP 会把 R1CS 中每个变量在每条约束里的系数，通过插值变成多项式。然后根据 witness 组合出三个多项式：

$$
A(t),\quad B(t),\quad C(t)
$$

如果所有约束都满足，则存在某个多项式 $H(t)$，使得：

$$
A(t)B(t)-C(t)=H(t)Z(t)
$$

这里 $Z(t)$ 是目标多项式，通常在代表每条约束的位置上为零。直觉是：

- 每条 R1CS 约束对应一个点；
- 如果某点上的约束成立，那么 $A(t)B(t)-C(t)$ 在该点为零；
- 如果所有约束点都为零，那么它能被 $Z(t)$ 整除。

于是“所有约束都成立”被转换为“一个多项式能被另一个多项式整除”。

这是 zk-SNARK 的核心抽象之一：把计算正确性转化为代数可检查性。

---

## 6. 有限域：所有计算都在模意义下进行

实际 SNARK 不是在实数上做这些运算，而是在有限域 $\mathbb F_p$ 或扩展域中做。

有限域的好处：

- 元素个数有限，便于密码学安全参数分析；
- 加减乘除都封闭，除以非零元素有定义；
- 与椭圆曲线群、配对等密码学结构可以衔接；
- 实现上可以用大整数模运算完成。

因此，代码里的 `3 * 3 = 9` 更准确地说是：

$$
3 \cdot 3 \equiv 9 \pmod p
$$

当数值超过 $p$ 时会自动回绕。初学时可以先把它当作普通算术理解，但真正实现电路时必须牢记：所有约束都在有限域里成立。

这也会带来工程坑。例如你想证明“$a < b$”，在有限域里不能直接靠普通整数大小关系，需要额外构造范围约束或位分解约束。因为域元素本身没有天然的“小于”顺序。

---

## 7. 椭圆曲线和配对：隐藏值，同时保留可验证结构

到 QAP 为止，我们还没有真正做到零知识。我们只是把计算变成了多项式关系。如果 Prover 直接把 witness 或多项式系数发给 Verifier，秘密仍然会泄露。

这时需要密码学承诺或隐藏技术。Pinocchio/Groth16 这类 SNARK 会使用椭圆曲线群和双线性配对。

先看椭圆曲线群的直觉：

- 曲线上的点可以组成一个加法群；
- 点加法有单位元、逆元、结合律等群结构；
- 给定标量 $k$ 和点 $G$，计算 $kG$ 容易；
- 但给定 $G$ 和 $kG$，反推出 $k$ 很难，这就是离散对数难题的直觉基础。

这允许我们把数值“编码”成曲线点。例如不公开 $a$，而公开 $aG$。别人不能轻易恢复 $a$，但仍可利用群运算检查线性关系：

$$
aG + bG = (a+b)G
$$

配对（pairing）进一步提供一种双线性映射：

$$
e(aG, bH)=e(G,H)^{ab}
$$

它让验证者可以在不知道 $a,b$ 的情况下检查乘法结构。SNARK 中的很多“短证明、快验证”能力都依赖这种结构。

这里不需要一开始就掌握配对公式。入门阶段只要记住：

> 椭圆曲线隐藏具体数值；配对让隐藏后的乘法关系仍可被验证。

---

## 8. Trusted Setup 与 CRS

许多早期高效 zk-SNARK，尤其 Groth16，需要 Trusted Setup。它会为某个电路生成公共参数：

- Proving Key：Prover 用来生成证明；
- Verification Key：Verifier 用来验证证明；
- CRS（Common Reference String）：公共参考串，通常泛指这些公共参数。

设置过程中会用到秘密随机值，常被称为 toxic waste。如果这些随机值泄露，攻击者可能伪造证明。因此它必须在生成后销毁，或者通过多方仪式降低单点信任。

这也是为什么很多后续证明系统强调：

- transparent：不需要可信设置；
- universal：一次设置可用于多个电路；
- updatable：后续参与者可以继续贡献随机性。

但不能简单说“有 trusted setup 就不能用”。Groth16 的优势是证明很短、验证很快，在特定电路固定、性能要求强的场景仍然常见。选择证明系统时要看电路是否固定、证明成本、验证成本、证明大小、信任假设和生态工具。

---

## 9. zk-SNARK 的完整工程流程

以 libsnark/Groth16 风格为例，开发一个 zk-SNARK 应用通常是四步：

1. 把要证明的命题写成 R1CS。
2. 对该命题执行 setup，生成 proving key 和 verification key。
3. Prover 使用 proving key、公开输入和 witness 生成 proof。
4. Verifier 使用 verification key、公开输入和 proof 验证。

可以写成抽象流程：

```text
Program / Statement
  -> Arithmetic Circuit
  -> R1CS
  -> QAP / Polynomial relation
  -> Setup(pk, vk)
  -> Prove(pk, public_input, witness) = proof
  -> Verify(vk, public_input, proof) = true / false
```

如果用 libsnark，开发者最核心的工作通常不是调用 `prove` 或 `verify`，而是正确构造约束。也就是：

- 哪些变量是公开输入；
- 哪些变量是 witness；
- 每个中间变量如何约束；
- 是否有遗漏约束；
- 范围、布尔值、哈希、签名等组件是否以电路友好的方式实现。

一个常见错误是“只计算了变量值，没有约束它”。在普通程序里，中间变量由执行过程自然产生；在电路里，如果没有约束，Prover 可以随便填 witness。

---

## 10. 一个小例子：证明知道三次方程的秘密输入

目标：

> 公开 $out=35$，证明我知道某个秘密 $x$，使得 $x^3+x+5=35$，但不公开 $x$。

### 10.1 公开输入和 witness

公开输入：

$$
out = 35
$$

witness：

$$
x=3,\quad sym_1=9,\quad y=27,\quad sym_2=30
$$

### 10.2 约束

$$
x \cdot x = sym_1
$$

$$
sym_1 \cdot x = y
$$

$$
y + x = sym_2
$$

$$
sym_2 + 5 = out
$$

Verifier 不需要知道 $x,sym_1,y,sym_2$。它只看到：

- 公共输出 $out=35$；
- proof；
- verification key。

如果证明通过，Verifier 相信 Prover 知道一组 witness 让约束成立。

注意这个例子很小，不体现 SNARK 的优势。SNARK 的价值出现在约束很多时：证明大小仍然很短，验证成本远小于重新执行完整计算。

---

## 11. 学习路线建议

如果从零开始，建议按下面顺序读。

### 第一阶段：建立直觉

先理解：

- Prover / Verifier / witness / statement；
- 完整性、可靠性、零知识性；
- 为什么随机抽样可以让作弊概率变小；
- 多项式“低次数身份检验”的直觉。

可以读 SECBIT 翻译的《从零开始学习 zk-SNARK（一）》前半部分。它从多项式性质讲起，适合建立全局脚手架。

### 第二阶段：计算如何变成约束

重点理解：

- 算术电路；
- flattening：把复杂表达式拆成简单门；
- R1CS 的 $(A,B,C)$ 三组向量；
- witness 包含中间变量；
- public input 与 private witness 的边界。

Vitalik 的 QAP 文章适合这一阶段，尤其是 $x^3+x+5=out$ 的例子。

### 第三阶段：从 R1CS 到 QAP

重点理解：

- 每条约束对应一个点；
- 通过插值构造多项式；
- 为什么“所有约束成立”等价于某个多项式可整除；
- 目标多项式 $Z(t)$ 的作用。

这一阶段不必急着掌握每个插值细节，但要知道 QAP 解决的是“如何把很多约束整体压缩成一个代数关系”。

### 第四阶段：密码学封装

重点理解：

- 椭圆曲线群；
- 离散对数困难；
- 承诺或 hiding；
- 双线性配对；
- CRS / trusted setup；
- Groth16 为什么证明短、验证快，但需要 setup。

Andrea Corbellini 的椭圆曲线入门适合补群和点加法直觉；Zero Knowledge Blog 的 Pinocchio 系列适合理解 hiding 为什么必要。

### 第五阶段：工程实践

最后再看 libsnark 或现代工具链：

- libsnark：适合理解底层 R1CS/Groth16 工程接口；
- Circom/snarkjs：适合写电路和快速实验；
- Halo2：适合理解 PLONKish arithmetization；
- Noir、Leo、zkVM：适合从更高级语言进入。

不要一开始就陷进工具细节。先知道自己写的每行电路最终在约束什么，否则很容易得到“能跑但不可信”的证明系统。

---

## 12. 术语速查

| 术语 | 含义 |
|---|---|
| Statement | 公开要证明的陈述 |
| Witness | 证明者掌握但不公开的秘密数据或中间赋值 |
| Constraint | 对 witness 和公开输入的代数约束 |
| Arithmetic Circuit | 用加法门、乘法门表示的计算 |
| R1CS | 把约束统一成 $\langle A,z\rangle\langle B,z\rangle=\langle C,z\rangle$ |
| QAP | 用多项式关系表达 R1CS 可满足性 |
| CRS | 公共参考串，setup 生成的公共参数 |
| Proving Key | 生成证明用的参数 |
| Verification Key | 验证证明用的参数 |
| Trusted Setup | 生成公共参数的过程，可能包含必须销毁的秘密随机数 |
| Toxic Waste | setup 中不能泄露的秘密随机性 |
| Commitment | 对值进行绑定且隐藏的密码学承诺 |
| Pairing | 支持双线性关系检查的映射 |
| SNARK | 简洁、非交互的知识论证 |
| STARK | 透明、可扩展的知识论证，通常不依赖 trusted setup |

要避免几个误解。

第一，ZKP 证明的是某个形式化陈述，不是自然语言里的模糊事实。你必须把陈述变成电路或约束。

第二，ZKP 不自动保证业务逻辑正确。如果电路漏了约束，证明仍然可以通过，只是通过的是错误命题。

第三，ZKP 不自动隐藏所有信息。公开输入、证明是否通过、时间、链上交互模式等都可能泄露信息。

第四，ZKP 不等于加密。加密关注“只有授权者能解密”；零知识证明关注“无需揭示秘密也能验证某个陈述”。

第五，zk-SNARK 中的 “argument” 通常表示计算上可靠，而非信息论可靠。也就是说，安全性依赖计算困难假设。

---

## 参考资料

- SECBIT Blog: [零知识证明 Learn by Coding：libsnark 入门篇](https://secbit.io/blog/2020/01/03/zkp-learn-by-coding-libsnark-101/)
- SECBIT Blog: [从零开始学习 zk-SNARK（一）——多项式的性质与证明](https://secbit.io/blog/2019/12/25/learn-zk-snark-from-zero-part-one/)
- Zero Knowledge Blog: [The Pinocchio Protocol - Hiding](https://www.zeroknowledgeblog.com/index.php/the-pinocchio-protocol/hiding)
- Vitalik Buterin: [Quadratic Arithmetic Programs: from Zero to Hero](https://medium.com/@VitalikButerin/quadratic-arithmetic-programs-from-zero-to-hero-f6d558cea649)
- Andrea Corbellini: [Elliptic Curve Cryptography: a gentle introduction](https://andrea.corbellini.name/2015/05/17/elliptic-curve-cryptography-a-gentle-introduction/)
- Jens Groth: [On the Size of Pairing-based Non-interactive Arguments](https://eprint.iacr.org/2016/260)
- Electric Coin Company: [Zcash Protocol Specification](https://zips.z.cash/protocol/protocol.pdf)
