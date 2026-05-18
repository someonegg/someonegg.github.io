# 随机抽样算法笔记

> 整理自知乎文章《平衡树的随机抽样算法笔记》，本文重排了结构、公式和代码示例。

## 问题地图

| 场景 | 典型算法 | 单次/总复杂度 | 适用条件 |
| --- | --- | --- | --- |
| 有放回、等权重 | 直接选择 | $O(1)$ | 每个样本概率相同 |
| 有放回、带权重 | 轮盘选择 | 预处理 $O(n)$，采样 $O(\log n)$ | 权重表固定，可多次采样 |
| 有放回、带权重 | Alias Method | 预处理 $O(n)$，采样 $O(1)$ | 权重表固定，采样次数多 |
| 有放回、多次计数 | Multinomial sampling | 依赖二项分布采样实现 | 只关心每类出现次数，不关心顺序 |
| 不放回、等权重 | Reservoir Sampling Algorithm R | $O(n)$ | 流式数据，不预知总量也可用 |
| 不放回、等权重 | Algorithm L | 期望 $O(k(1+\log(n/k)))$ | 等权重，想减少无效扫描 |
| 不放回、带权重 | 朴素逐轮抽样 | $O(k(n-k/2))$ | 简单但慢，适合小数据 |
| 不放回、带权重 | A-Res | 约 $O(n + k\log(n/k)\log k)$ | 在线带权抽样 |
| 不放回、带权重 | A-ExpJ | 比 A-Res 更少随机数 | 权重非均等，想跳过无效样本 |

下文假设随机源足够理想，可以在 $O(1)$ 时间内生成 $[0,1)$ 上的均匀随机数。真实工程中仍需注意浮点误差、随机数质量和边界值处理。

## 有放回抽样

有放回抽样可以看作从离散分布中反复采样。设共有 $n$ 个样本，编号为 $0,1,\dots,n-1$，权重为：

$$
w_0,w_1,\dots,w_{n-1}
$$

若权重已经归一化，则满足：

$$
\sum_{i=0}^{n-1} w_i = 1,\quad w_i \ge 0
$$

抽中第 $i$ 个样本的概率为：

$$
P(X=i)=w_i
$$

如果原始权重和不为 $1$，先除以总权重即可。

## 等权重直接选择

等权重时，每个样本概率都是 $1/n$。生成一个随机数 $x\in[0,1)$，返回：

$$
\lfloor nx \rfloor
$$

即可得到一次 $O(1)$ 采样。

例如 $n=4$：

| 区间 | 样本 |
| --- | --- |
| $[0, 1/4)$ | 0 |
| $[1/4, 1/2)$ | 1 |
| $[1/2, 3/4)$ | 2 |
| $[3/4, 1)$ | 3 |

若 $x=0.61$，则 $\lfloor 4x \rfloor = 2$。

## 轮盘选择法

带权重时，可以构造前缀和数组：

$$
Q(i)=\sum_{k=0}^{i} w_k
$$

生成 $x\in[0,1)$ 后，找到满足：

$$
Q(i) > x
$$

的最小 $i$，该 $i$ 就是采样结果。

初始化前缀和需要 $O(n)$，每次采样用二分查找需要 $O(\log n)$。

```python
from bisect import bisect_right
from itertools import accumulate
import random


class RouletteWheelSampler:
    def __init__(self, weights):
        total = sum(weights)
        if total <= 0:
            raise ValueError("sum(weights) must be positive")
        self.prefix = list(accumulate(w / total for w in weights))
        self.prefix[-1] = 1.0  # 避免浮点累积误差导致末尾略小于 1

    def sample(self):
        x = random.random()
        return bisect_right(self.prefix, x)
```

注意：若权重表固定并且要大量采样，轮盘选择不是最快方案，Alias Method 更合适。

## Alias Method

Alias Method 的目标是用 $O(n)$ 预处理换取 $O(1)$ 单次采样。

它构造两个表：

1. `prob[i]`：第 $i$ 个桶中直接返回 $i$ 的概率阈值
2. `alias[i]`：未命中 `prob[i]` 时返回的备用样本

采样流程：

1. 随机选择一个桶 $i$
2. 再生成 $x\in[0,1)$
3. 若 $x < \text{prob}[i]$，返回 $i$
4. 否则返回 $\text{alias}[i]$

直观理解：把每个样本的权重切分并重新装进 $n$ 个容量为 $1$ 的桶，每个桶最多放两种样本。这样每次只需要一次随机整数和一次随机小数。

```python
from collections import deque
import random


class AliasSampler:
    def __init__(self, weights):
        n = len(weights)
        total = sum(weights)
        if n == 0 or total <= 0:
            raise ValueError("weights must be non-empty and sum to positive")

        scaled = [w * n / total for w in weights]
        self.prob = [0.0] * n
        self.alias = [0] * n

        small = deque(i for i, p in enumerate(scaled) if p < 1.0)
        large = deque(i for i, p in enumerate(scaled) if p >= 1.0)

        while small and large:
            low = small.popleft()
            high = large.popleft()

            self.prob[low] = scaled[low]
            self.alias[low] = high

            scaled[high] = scaled[high] + scaled[low] - 1.0
            if scaled[high] < 1.0:
                small.append(high)
            else:
                large.append(high)

        # 浮点误差可能导致某一侧队列残留；剩余桶视为完整命中自身。
        for i in list(small) + list(large):
            self.prob[i] = 1.0
            self.alias[i] = i

    def sample(self):
        i = random.randrange(len(self.prob))
        return i if random.random() < self.prob[i] else self.alias[i]
```

工程判断：

1. 权重经常变化：Alias 表重建成本高，未必划算。
2. 权重固定且采样很多次：Alias Method 通常优于轮盘选择。
3. 对浮点边界敏感：构造完成后最好做分布回归测试。

## 多项分布采样

如果要做 $N$ 次有放回抽样，并且只关心每类出现次数，而不关心抽样顺序，那么结果服从多项分布：

$$
(X_0,X_1,\dots,X_{k-1}) \sim \operatorname{Multinomial}(N; p_0,p_1,\dots,p_{k-1})
$$

其中：

$$
\sum_{i=0}^{k-1} X_i = N,\quad \sum_{i=0}^{k-1} p_i = 1
$$

一个直接思路是模拟 $N$ 次单次采样，但这通常不是最优。多项分布可以拆成一串条件二项分布：

$$
X_0 \sim \operatorname{Binomial}(N, p_0)
$$

给定 $X_0=x_0$ 后，剩余次数是 $N-x_0$，剩余概率质量是 $1-p_0$，于是：

$$
X_1 \mid X_0=x_0 \sim \operatorname{Binomial}\left(N-x_0,\frac{p_1}{1-p_0}\right)
$$

继续递推，直到倒数第二类。最后一类不需要随机，直接吃掉剩余次数。

```python
import numpy as np


def multinomial_sampling(n_trials, probabilities):
    counts = [0] * len(probabilities)
    remaining_trials = n_trials
    remaining_prob = 1.0

    for i in range(len(probabilities) - 1):
        if remaining_trials <= 0:
            break

        if remaining_prob <= 0:
            counts[i] = 0
        else:
            conditional_p = probabilities[i] / remaining_prob
            conditional_p = min(max(conditional_p, 0.0), 1.0)
            counts[i] = np.random.binomial(remaining_trials, conditional_p)

        remaining_trials -= counts[i]
        remaining_prob -= probabilities[i]

    counts[-1] = remaining_trials
    return counts
```

实践中应优先使用：

```python
np.random.multinomial(n_trials, probabilities)
```

上面的函数更适合用来理解多项分布和条件二项分布之间的关系。

## 不放回抽样

不放回抽样要求同一个样本最多出现一次。设总共有 $n$ 个样本，需要抽取 $k$ 个。

朴素带权实现是重复 $k$ 轮：

1. 计算当前剩余样本的总权重
2. 按剩余权重归一化后采样一个样本
3. 移除该样本

这种做法简单，但复杂度通常是 $O(kn)$ 级别，不适合大规模数据。

## 等权重不放回：Algorithm R

Algorithm R 是经典蓄水池抽样。它适合流式数据：可以边读边抽，不需要提前知道所有数据。

流程：

1. 先把前 $k$ 个样本放入蓄水池
2. 当读到第 $i$ 个样本时，以 $k/i$ 的概率接受它
3. 若接受，则随机替换蓄水池中的一个旧样本

这里的 $i$ 使用从 $1$ 开始的计数。算法结束后，每个样本被选中的概率都是：

$$
\frac{k}{n}
$$

```python
import random


def reservoir_sample(items, k):
    if k < 0:
        raise ValueError("k must be non-negative")
    if k >= len(items):
        return list(items)

    result = list(items[:k])
    for i in range(k, len(items)):
        j = random.randint(0, i)
        if j < k:
            result[j] = items[i]
    return result
```

## 等权重不放回：Algorithm L

另一种视角是：给每个样本生成一个 $[0,1)$ 上的随机键值，取键值最小的 $k$ 个样本。Algorithm L 在这个思路上进一步优化：它不为每个样本都生成键值，而是根据当前阈值直接跳过一批不可能进入蓄水池的样本。

跳跃长度来自几何分布。若当前蓄水池中最大键值为 $g$，下一个被接受样本距离当前位置的步数可以写为：

$$
\left\lfloor \frac{\ln U}{\ln(1-g)} \right\rfloor + 1,\quad U\sim \operatorname{Uniform}(0,1)
$$

接受新样本后，新的阈值可以通过最大值分布直接更新：

$$
g' = g \cdot U^{1/k}
$$

这样可以减少大量无意义随机数生成，复杂度可到：

$$
O(k(1+\log(n/k)))
$$

## 带权不放回：A-Res

A-Res 把等权重“随机键值取前 $k$ 个”的思想推广到带权重情况。

对第 $i$ 个样本，权重为 $w_i$，生成：

$$
K_i = U_i^{1/w_i},\quad U_i\sim\operatorname{Uniform}(0,1)
$$

然后取键值最大的 $k$ 个样本。

为什么这合理？对于两个样本 $i,j$，可以证明：

$$
P(K_i \le K_j)=\frac{w_j}{w_i+w_j}
$$

也就是说，权重越大的样本越容易拿到更大的键值。

```python
import heapq
import random


def weighted_reservoir_sample(samples, k):
    heap = []

    for item, weight in samples:
        if weight <= 0:
            continue

        key = random.random() ** (1.0 / weight)
        entry = (key, item)

        if len(heap) < k:
            heapq.heappush(heap, entry)
        elif key > heap[0][0]:
            heapq.heapreplace(heap, entry)

    return [item for _, item in heap]
```

这个算法是在线的，不需要预先知道所有样本。但它仍会为每个样本生成随机键值。

## 带权不放回：A-ExpJ

A-ExpJ 进一步减少 A-Res 中的无效随机数。它的核心观察是：在当前蓄水池最小键值为 $T_w$ 时，一段样本是否会进入蓄水池，主要取决于这段样本的权重和。

因此，算法不再逐个样本尝试，而是抽一个要跳过的权重长度：

$$
X_w = \frac{\ln U}{\ln T_w}
$$

然后沿着输入流累减权重，直到跳过的权重用完，当前样本才进入候选。

新样本进入蓄水池时，其键值不是重新从完整分布中采，而是从条件分布中采：

$$
K_i = \operatorname{Uniform}(T_w^{w_i}, 1)^{1/w_i}
$$

直观理解：既然这个样本已经被判定能超过旧阈值，那么它的键值应该在“超过阈值”的条件下生成。

A-ExpJ 比 A-Res 更复杂，但在大量样本不会进入蓄水池时，可以显著减少随机数生成和堆操作。

## 工程实践建议

1. 小数据或一次性脚本：优先用库函数，简单可靠。
2. 有放回、权重固定、采样很多次：考虑 Alias Method。
3. 只需要多次采样后的类别计数：用多项分布采样，不要逐次模拟。
4. 流式等权重不放回：用 Algorithm R；追求更高性能再考虑 Algorithm L。
5. 流式带权不放回：从 A-Res 开始，只有性能压力明确时再实现 A-ExpJ。
