# Linux 源 IP 验证机制与非对称路由

## 问题背景

Linux 主机收到 IPv4 报文后，并不是只要目标地址匹配本机或可被转发就一定继续处理。内核还会对报文的源地址做一组安全校验，用来拦截明显异常或疑似伪造的报文。

这些机制在普通单出口网络里通常不会被注意到。但在下面这些场景中，它们很容易成为排障关键：

- 请求和响应走不同链路的非对称路由。
- 主机有多块网卡，路由表指定的回程接口和实际入接口不同。
- LVS DR、隧道模式、Anycast、VIP 漂移等场景中，本机也配置了业务 VIP。
- 容器、网络命名空间、策略路由或多出口 NAT 让路径判断变复杂。
- 抓包看到报文已经到达网卡，但应用、协议栈或转发表没有后续动作。

这类问题的典型现象是：`tcpdump` 能在入口接口看到包，但本机没有回应，也没有继续转发。此时不要只盯着防火墙规则，还要检查内核的源地址验证参数。

## 一个典型非对称拓扑

可以用一个菱形拓扑理解问题：

```text
client
  | \
  |  \
  |   \
left right  [router]
  |   / 
  |  /
  | /
server
```

假设请求路径是：

```text
client -> left-router -> server
```

响应路径是：

```text
server -> right-router -> client
```

也就是说，客户端访问服务端时，请求从服务端左侧接口进入；但服务端回到客户端的路由被配置为走右侧接口。

这在工程上并不罕见。例如链路主备切换、流量工程、策略路由、四层负载均衡和多网卡服务器都可能制造类似路径。但从 Linux 内核默认安全策略看，这个报文可能很可疑：源 IP 属于客户端网段，可路由表认为回到该源 IP 的最佳路径并不是当前入接口。

## rp_filter：反向路径校验

`rp_filter` 是最常见的源 IP 验证开关，全称通常理解为 reverse path filter。它检查收到的 IPv4 报文源地址是否符合本机路由表中的反向路径预期。

常见取值如下：

| 值 | 含义 | 适用倾向 |
| --- | --- | --- |
| `0` | 关闭源地址反向路径校验 | 复杂路由、非对称路径、特殊转发场景 |
| `1` | 严格模式：源 IP 必须可达，且反向路由查到的出接口必须等于报文入接口 | 单出口、简单拓扑、安全优先场景 |
| `2` | 宽松模式：源 IP 只要能通过任意接口路由可达即可 | 多网卡但仍希望保留基础源地址校验的场景 |

严格模式下，内核的判断逻辑可以简化理解为：

1. 收到一个源 IP 为 `S` 的报文。
2. 查路由表，看本机如果要发包到 `S`，应该从哪个接口出去。
3. 如果查到的出接口不是当前报文的入接口，则认为这个源地址不可信，丢弃报文。

在非对称路由里，这个判断经常误伤合法报文。因为报文本来就被设计为“从左边进、从右边回”，而严格模式默认期望路径是对称的。

## 为什么抓到包却没有响应

假设客户端 IP 是 `192.168.1.2`，服务端被访问的地址是 `192.168.2.2`。

请求报文到达服务端时大致是：

```text
src=192.168.1.2 dst=192.168.2.2 in=server-left
```

但服务端路由表里，去往 `192.168.1.0/24` 的路由指向右侧接口：

```text
192.168.1.0/24 dev server-right
```

如果 `rp_filter=1`，内核会认为：

```text
源地址 192.168.1.2 的反向路径应该走 server-right，
但报文实际从 server-left 进来，
因此该报文不可信。
```

于是报文会在协议栈较早的位置被丢弃。应用层看不到请求，服务端也不会发出响应。这个现象很容易被误判为服务没监听、防火墙拦截或网关转发异常。

在这种拓扑下，服务端通常至少要把相关接口的 `rp_filter` 调整为 `2`，让源地址只要在任意接口可达即可通过。如果链路更特殊，甚至需要关闭为 `0`。

## all 与接口级配置的关系

`rp_filter` 有全局和接口两个层级：

```bash
/proc/sys/net/ipv4/conf/all/rp_filter
/proc/sys/net/ipv4/conf/<ifname>/rp_filter
```

实际生效值不是简单只看接口配置，而是取 `all` 和具体接口配置中的较大值。

这点很容易踩坑：

- 如果想使用宽松模式 `2`，通常把接口设为 `2` 即可，因为 `max(all, iface)` 会得到较大的值。
- 如果想完全关闭为 `0`，必须确认 `all` 和具体接口都为 `0`。
- 如果 `all=1`，即使某个接口设为 `0`，最终仍可能按严格模式处理。

检查命令：

```bash
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.default.rp_filter
sysctl net.ipv4.conf.eth0.rp_filter
```

临时调整示例：

```bash
sysctl -w net.ipv4.conf.all.rp_filter=0
sysctl -w net.ipv4.conf.eth0.rp_filter=0
```

持久化配置通常写入 `/etc/sysctl.conf` 或 `/etc/sysctl.d/*.conf`，具体以发行版约定为准。

## accept_local：允许本机地址作为源地址进入

除了反向路径校验，Linux 还会检查收到的报文源地址是否属于本机。如果一个报文从外部接口进入，但源 IP 恰好是本机配置的某个地址，内核默认会认为它异常。

这个默认行为符合大多数安全直觉：正常情况下，外部链路不应该发来一个“源地址就是我自己”的报文。

但在一些特殊网络设计中，这种报文是合理的。例如：

- LVS DR 模式中，真实服务器直接用 VIP 响应客户端。
- LVS 设备或中间转发节点本身也配置了 VIP，并且恰好位于响应路径上。
- 隧道、回环 VIP、策略路由组合后，报文源地址可能与本机地址重叠。

这时需要关注：

```bash
/proc/sys/net/ipv4/conf/all/accept_local
/proc/sys/net/ipv4/conf/<ifname>/accept_local
```

开启示例：

```bash
sysctl -w net.ipv4.conf.eth0.accept_local=1
```

如果调整后仍不生效，应同时检查 `rp_filter`。因为源地址属于本机和反向路径失败是两类不同校验，任何一个环节丢包都会让后续处理消失。

## route_localnet：127.0.0.0/8 的特殊限制

`127.0.0.0/8` 是环回地址段，按常规语义只能用于本机环回。Linux 默认会阻止这类地址出现在普通网络接口路径中，避免把本地环回语义泄漏到外部网络。

如果确实要在特殊转发、代理或测试场景中处理目标或源地址为 `127.0.0.0/8` 的报文，需要关注：

```bash
/proc/sys/net/ipv4/conf/all/route_localnet
/proc/sys/net/ipv4/conf/<ifname>/route_localnet
```

开启示例：

```bash
sysctl -w net.ipv4.conf.eth0.route_localnet=1
```

这个参数不应随意打开。它改变的是本地地址段的路由边界，最好只在明确知道流量路径和防火墙约束时使用。

## martian packet 与日志

被内核判定为不应该出现的源地址报文，常被称为 martian packet。排查这类问题时，最直接的辅助开关是 `log_martians`：

```bash
/proc/sys/net/ipv4/conf/all/log_martians
/proc/sys/net/ipv4/conf/<ifname>/log_martians
```

开启示例：

```bash
sysctl -w net.ipv4.conf.all.log_martians=1
sysctl -w net.ipv4.conf.eth0.log_martians=1
```

随后可以通过系统日志查看内核记录。不同发行版日志位置不同，常见方式包括：

```bash
journalctl -k
dmesg
tail -f /var/log/syslog
tail -f /var/log/messages
```

日志里通常会包含源地址、目标地址、入接口以及二层头信息。结合 `tcpdump` 可以快速确认：报文是否到达、是否被协议栈源地址校验丢弃、丢弃发生在哪个接口。

## 排查流程

遇到“抓包能看到入口报文，但系统不响应或不转发”的问题，可以按下面顺序检查。

第一步，确认报文确实到达了预期接口：

```bash
tcpdump -ni eth0 host <peer-ip>
```

第二步，查看反向路由会选择哪个接口：

```bash
ip route get <source-ip>
```

如果 `ip route get` 显示的出接口和报文入接口不同，而当前 `rp_filter=1`，就高度可疑。

第三步，检查源地址验证参数：

```bash
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.eth0.rp_filter
sysctl net.ipv4.conf.eth0.accept_local
sysctl net.ipv4.conf.eth0.route_localnet
sysctl net.ipv4.conf.eth0.log_martians
```

第四步，临时打开 martian 日志：

```bash
sysctl -w net.ipv4.conf.all.log_martians=1
sysctl -w net.ipv4.conf.eth0.log_martians=1
journalctl -k -f
```

第五步，在确认拓扑需要非对称路径后，再调整参数：

```bash
sysctl -w net.ipv4.conf.all.rp_filter=0
sysctl -w net.ipv4.conf.eth0.rp_filter=0
```

或者使用宽松模式：

```bash
sysctl -w net.ipv4.conf.eth0.rp_filter=2
```

调整后重新抓包验证请求、响应和转发路径是否符合预期。

## 参数选择建议

不要把关闭校验当作默认方案。更稳妥的选择是先判断拓扑需要什么，再选择最小放宽范围。

| 场景 | 建议 |
| --- | --- |
| 单网卡、单默认路由、路径对称 | 保持 `rp_filter=1` 通常没问题 |
| 多网卡但源地址从任意接口都应可达 | 可考虑 `rp_filter=2` |
| 明确存在非对称路由、策略路由或复杂转发 | 相关接口可能需要 `rp_filter=0` |
| 收到源地址属于本机地址的合法报文 | 检查并按接口开启 `accept_local=1` |
| 需要处理 `127.0.0.0/8` 经过普通接口的流量 | 谨慎开启 `route_localnet=1`，并配合防火墙限制 |
| 不确定是否被内核源地址校验丢弃 | 临时开启 `log_martians=1` 辅助定位 |

生产环境中建议优先按接口调整，不要无差别放宽所有接口。尤其是边界网卡、云主机公网网卡、容器宿主机出口网卡，关闭源地址校验可能扩大源地址伪造风险。
