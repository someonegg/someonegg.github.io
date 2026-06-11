# Linux 路由机制与排障方法

## 第一部分：策略路由是怎么工作的

Linux 发出或转发一个 IP 包时，不是只查一张 `main` 路由表。更准确的理解是：内核先根据策略规则决定查哪张表，再在表里选择具体路由，最后为本机发出的包选择源地址。

一个简化流程如下：

1. 本地进程或转发路径产生一次路由查询。
2. 内核按优先级遍历 RPDB，也就是 `ip rule`。
3. 命中的 rule 指向某张 routing table。
4. 内核在该表中按目的地址做最长前缀匹配，并结合 `tos`、`scope`、`oif` 等条件选择路由。
5. 如果是本机发出的包，内核再根据应用绑定地址、路由 `src` 提示和出接口地址选择源地址。

因此，调试路由时要分清三个问题：

- 哪条 `ip rule` 命中了。
- 命中的表里哪条 route 被选中。
- 最终使用哪个出接口和源地址。

### 默认路由表与 RPDB

Linux 默认有三类内建路由表：

| 表 | 常见编号 | 作用 |
| --- | ---: | --- |
| `local` | `255` | 本机地址、广播地址等特殊路由；通常不要手工改 |
| `main` | `254` | 默认使用的主路由表 |
| `default` | `253` | 预留表；普通 `ip route add` 不会自动写入这里 |

默认规则通常类似：

```bash
ip rule show
```

```text
0:      from all lookup local
32766:  from all lookup main
32767:  from all lookup default
```

规则按 priority 从小到大匹配。命中一条规则后，内核去该规则指定的 table 查路由；如果该表没有合适路由，才继续看后续规则。

这也是策略路由最容易误解的地方：`default` 表不是普通默认路由所在的表。没有显式指定 table 时，`ip route add` 默认写入 `main`。

自定义策略路由一般需要三步：

```bash
echo "200 wan1" >> /etc/iproute2/rt_tables
ip rule add from 192.0.2.10/32 lookup wan1 priority 1001
ip route add default via 192.0.2.1 dev eth0 src 192.0.2.10 table wan1
```

实际配置时应避免重复追加 `rt_tables`，并给 `ip rule` 明确 priority，便于审计和删除。

### 路由查找键

传统目的地址路由主要按 `dst` 做最长前缀匹配。策略路由扩展了入口条件，可以按源地址、目标地址、TOS、fwmark、入接口等信息决定查询哪张表。

可以粗略拆成三层：

| 层级 | 主要匹配条件 |
| --- | --- |
| RPDB / `ip rule` | `from`、`to`、`tos`、`fwmark`、`iif`、`uidrange` 等 |
| route table | `dst` 最长前缀匹配，另可受 `tos`、`scope`、`oif` 等约束 |
| 源地址选择 | 应用绑定地址、路由 `src` 提示、出接口地址 |

这能解释几个常见现象：

- 只在 `ip route get` 中加 `from A`，如果没有 `from A lookup tableX` 之类规则，未必改变出接口。
- 加 `oif ethX` 后，出接口被纳入查找约束，返回的 `src` 也会倾向于该接口上的可用地址。
- 想让某个源地址固定走某张表，应配置 `ip rule add from A lookup tableX`，而不是只依赖应用 bind 源地址。
- `fwmark` 常用于 netfilter 给包打标，再配合 `ip rule fwmark ... lookup ...` 选择路由表。
- `iif` 适合处理转发流量或入口相关策略，例如“从某接口进来的包查某张表”。

示例：

```bash
ip rule add from 192.0.2.10/32 lookup wan1 priority 1001
ip route add default via 192.0.2.1 dev eth0 src 192.0.2.10 table wan1
ip route get 1.1.1.1 from 192.0.2.10
```

这里 `src 192.0.2.10` 是路由对源地址选择的提示，`ip rule from 192.0.2.10` 才是把该源地址导入特定路由表的关键。

### 源地址选择

本机发包时，源地址选择大致按下面顺序理解：

1. 应用已经通过 `bind()` 指定了源地址，则优先使用该地址。
2. 路由条目里有 `src <addr>` 提示，则内核倾向使用该地址。
3. 否则内核从出接口的可用地址中选择一个合适地址。

因此，源地址和出接口不是同一个概念：

- 绑定源地址不一定强制出接口。
- 约束出接口通常会改变可选源地址集合。
- 多出口机器上，应同时设计 `ip rule`、table route 和 route `src`。

常用验证命令：

```bash
ip route get 8.8.8.8
ip route get 8.8.8.8 from 192.0.2.10
ip route get 8.8.8.8 oif eth0
ip route get 8.8.8.8 from 192.0.2.10 oif eth0
```

### 现代内核里的 routing cache 注意事项

一些旧资料会把 route cache 放在路由选择路径的第一层。这个说法有历史背景，但对现代 Linux 要谨慎使用。

`ip-route(8)` 手册说明，Linux 3.6 起 IPv4 不再使用旧式 routing cache。因此：

- 不要把 `ip route show cache` 当作现代 IPv4 排障主手段。
- `ip route get` 仍然有用，因为它触发的是一次路由解析。
- `ip route flush cache` 在部分场景仍能触发路由缓存/异常项刷新，但不能按旧内核的 per-destination route cache 模型理解。

## 第二部分：路由与连接排障方法

排障时先判断问题发生在哪一层：包是否到达、是否被 netfilter 处理、路由是否选对、源地址是否合理、socket 是否已经建立但卡住。

### 用 `ip route get` 做路由探针

`ip route get` 不会真的发包，但会让内核按给定条件计算一次路由结果。

常用形式：

```bash
ip route get 8.8.8.8
ip route get 8.8.8.8 from 192.0.2.10
ip route get 8.8.8.8 oif eth0
ip route get 8.8.8.8 from 192.0.2.10 oif eth0
ip -6 route get 2001:4860:4860::8888
```

读结果时重点看：

- `dev`：最终出接口。
- `via`：下一跳。
- `src`：内核建议或选择的源地址。
- `uid`、`cache` 等额外信息：用于判断是否与本地进程、缓存或策略有关。

### 检查 RPDB 和路由表

先看规则，再看表：

```bash
ip rule show
ip route show table local
ip route show table main
ip route show table default
ip route show table all
```

如果知道自定义表名或编号，应单独查看：

```bash
ip route show table <custom-table>
```

排查多出口或策略路由时，重点确认：

- rule priority 是否符合预期。
- 是否有更高优先级 rule 抢先命中。
- 目标表里是否真的有 default route 或更具体路由。
- 返回路径是否也被纳入策略路由设计。

### 用抓包确认包是否到达

先确认内核是否真的收到了包：

```bash
tcpdump -ni any host <peer-ip>
tcpdump -ni eth0 host <peer-ip>
```

如果 `any` 能看到但具体接口看不到，说明还需要确认命名空间、虚拟网卡、bridge、tunnel 或抓包位置。  
如果入口接口能看到请求，但没有响应，再继续检查路由、源地址验证、防火墙和应用状态。

### 用 netfilter trace 追踪规则路径

如果怀疑包被 iptables/nftables 改写或丢弃，可以临时开启 trace。

IPv4 ICMP 示例：

```bash
iptables -t raw -A OUTPUT -p icmp -j TRACE
iptables -t raw -A PREROUTING -p icmp -j TRACE
```

IPv6 ICMP 示例：

```bash
ip6tables -t raw -A OUTPUT -p icmpv6 --icmpv6-type echo-request -j TRACE
ip6tables -t raw -A OUTPUT -p icmpv6 --icmpv6-type echo-reply -j TRACE
ip6tables -t raw -A PREROUTING -p icmpv6 --icmpv6-type echo-request -j TRACE
ip6tables -t raw -A PREROUTING -p icmpv6 --icmpv6-type echo-reply -j TRACE
```

旧式 iptables TRACE 日志通常看：

```bash
dmesg
journalctl -k
tail -f /var/log/kern.log
```

如果系统使用 iptables-nft 后端，也可以优先看：

```bash
xtables-monitor --trace
```

trace 规则要尽量限定协议、地址和接口，排障结束后立即删除。生产环境里对大流量规则直接 TRACE 很容易制造大量内核日志。

### loopback 特例：`127/8`、martian 与 `route_localnet`

`127.0.0.0/8` 默认只属于 loopback 语义。Linux 通常不允许把 loopback 源地址从普通网卡发出，也不希望外部接口收到目的地址或源地址为 `127/8` 的包。否则这类包会被视为异常地址，也就是 martian。

一个典型现象是：

```bash
ip route get 8.8.8.8 from 127.0.0.1
```

如果路由计算出的出接口不是 `lo`，内核可能直接返回：

```text
RTNETLINK answers: Invalid argument
```

这不是普通路由表缺失，而是内核拒绝构造“从非 loopback 接口发出 loopback 源地址”的路由。

有些代理、容器、透明转发或 NAT 场景会故意把外部流量转到本机 loopback 服务。例如把进入某个端口的包 DNAT 到 `127.0.0.1:<port>`。这时需要检查对应接口的 `route_localnet`：

```bash
sysctl net.ipv4.conf.all.route_localnet
sysctl net.ipv4.conf.<dev>.route_localnet
```

按接口开启示例：

```bash
sysctl -w net.ipv4.conf.eth0.route_localnet=1
```

开启后，内核不再在该接口路由路径上把 `127/8` 自动视为 martian。这个开关要谨慎使用，最好只对必要接口开启，并用防火墙限制来源、目的端口和协议。全局开启 `net.ipv4.conf.all.route_localnet=1` 会放宽 loopback 地址的安全边界，不应作为默认排障动作。

### 用 `ss -i` 看 socket 状态

当路由看起来正确但连接行为异常时，用：

```bash
ss -nti
ss -ntpi
ss -uapn
```

`ss -i` 可以显示拥塞控制、RTT、重传、MSS、窗口等连接内部状态。它适合回答这类问题：

- 连接是否已经建立但应用没有读写。
- 是否存在持续重传。
- MSS/PMTU 是否异常。
- 连接卡在 TCP 哪个阶段。

## 常见结论

- `ip rule` 决定先查哪张表，`ip route` 决定表里有哪些路径。
- 普通路由默认进入 `main` 表，不会进入 `default` 表。
- 指定源地址不等于指定出接口；要让源地址影响路径，应显式配置 `ip rule from`。
- 指定出接口会影响源地址选择，因为内核只能从该出接口相关地址中挑选合适源地址。
- `fwmark` 适合把 netfilter 分类结果传给策略路由。
- 旧资料中的 routing cache 概念对现代 IPv4 内核不可照搬。

## 参考资料

- [A Quick Introduction to Linux Policy Routing](https://blog.scottlowe.org/2013/05/29/a-quick-introduction-to-linux-policy-routing/)
- [Guide to IP Layer Network Administration with Linux: Route Selection](http://linux-ip.net/html/routing-selection.html)
- [Guide to IP Layer Network Administration with Linux: Source Address Selection](http://linux-ip.net/html/routing-saddr-selection.html)
- [Guide to IP Layer Network Administration with Linux: Routing Cache](http://linux-ip.net/html/routing-cache.html)
- [ip-route(8) manual page](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [ip-rule(8) manual page](https://man7.org/linux/man-pages/man8/ip-rule.8.html)
- [netdev patch: ipv4 route_localnet](https://lists.openwall.net/netdev/2012/06/08/53)
- [Kubernetes issue #6910: route_localnet and kube-proxy](https://github.com/kubernetes/kubernetes/issues/6910)
