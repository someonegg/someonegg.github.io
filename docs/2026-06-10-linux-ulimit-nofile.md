# Linux ulimit 与打开文件数限制笔记

`ulimit -n` 对应 Linux 的 `RLIMIT_NOFILE`，控制单个进程可使用的 file descriptor 数量。这里的 file descriptor 不只包括普通文件，也包括 socket、pipe、eventfd、epoll fd、目录等内核对象。

这类问题常见现象是程序报 `Too many open files`、`EMFILE`，或系统日志中出现 file handle 耗尽相关提示。排查时要先区分“单进程限制不够”和“系统级 file handle 接近上限”。

## 快速查看

查看当前 shell 的限制：

```bash
ulimit -Sn
ulimit -Hn
```

`-S` 是 soft limit，进程实际使用的是 soft limit；`-H` 是 hard limit，普通进程不能把 soft limit 提高到 hard limit 之上。

查看指定进程限制：

```bash
cat /proc/<pid>/limits
```

重点看这一行：

```text
Max open files            <soft>               <hard>               files
```

查看进程当前打开了多少 fd：

```bash
ls /proc/<pid>/fd | wc -l
```

查看系统级 file handle 使用情况：

```bash
cat /proc/sys/fs/file-nr
cat /proc/sys/fs/file-max
cat /proc/sys/fs/nr_open
```

## 三层限制

### 1. 进程级：RLIMIT_NOFILE

`RLIMIT_NOFILE` 是单个进程的 fd 数量限制，也就是 `ulimit -n` 看到的值。程序打开普通文件、创建 socket、创建 pipe、使用 epoll 等都会消耗 fd。

如果某个服务报 `Too many open files`，首先看：

```bash
cat /proc/<pid>/limits
ls /proc/<pid>/fd | wc -l
```

如果当前 fd 数接近 `Max open files` 的 soft limit，说明瓶颈在进程级限制或程序 fd 泄漏。

### 2. 系统级：file-max

`/proc/sys/fs/file-max` 是系统范围内 open file descriptions 的上限。所有进程合计接近这个值时，系统调用可能失败并返回 `ENFILE`。

查看当前状态：

```bash
cat /proc/sys/fs/file-nr
```

`file-nr` 有三列：

```text
<allocated> <free> <max>
```

在 Linux 2.6 之后，第二列通常是 `0`，不是异常。排查时主要看第一列是否接近第三列。

如果系统日志中有类似下面的内容，说明系统级上限可能不足：

```text
VFS: file-max limit <number> reached
```

临时调整：

```bash
sysctl -w fs.file-max=1000000
```

持久化可写入 `/etc/sysctl.conf` 或 `/etc/sysctl.d/*.conf`：

```text
fs.file-max = 1000000
```

### 3. RLIMIT_NOFILE 天花板：nr_open

`/proc/sys/fs/nr_open` 是 `RLIMIT_NOFILE` 可以被提升到的系统天花板。默认值常见为 `1048576`。

它不是某个进程当前可打开 fd 数量；实际限制仍由该进程的 soft/hard `RLIMIT_NOFILE` 决定。

如果要把某个服务的 `LimitNOFILE` 设置到超过 `nr_open` 的值，需要先调高：

```bash
sysctl -w fs.nr_open=2097152
```

持久化配置：

```text
fs.nr_open = 2097152
```

## 服务配置

### systemd 服务

现代 Linux 服务通常由 `systemd` 管理。服务级 fd 限制优先在 unit 里配置：

```ini
[Service]
LimitNOFILE=16384
```

推荐使用 drop-in，避免直接改发行版自带 unit：

```bash
systemctl edit <service>
```

写入：

```ini
[Service]
LimitNOFILE=16384
```

然后重载并重启服务：

```bash
systemctl daemon-reload
systemctl restart <service>
```

验证：

```bash
systemctl show <service> -p LimitNOFILE
cat /proc/<pid>/limits
```

注意：`LimitNOFILE=16384` 会同时设置 soft 和 hard limit。也可以使用 `soft:hard` 形式：

```ini
[Service]
LimitNOFILE=16384:65535
```

### 登录会话

交互式登录用户通常通过 PAM 应用 `/etc/security/limits.conf` 或 `/etc/security/limits.d/*.conf`：

```text
* soft nofile 16384
* hard nofile 65535
```

但这只对经过 PAM session 的登录路径可靠。服务进程是否受它影响，取决于服务的启动路径。

### 旧 init.d 服务

`init.d` 脚本通过 `start-stop-daemon` 启动时，通常不会经过 PAM session，因此 `/etc/security/limits.conf` 里的设置不一定生效。

旧服务可在启动脚本中显式设置：

```bash
ulimit -n 16384
```

如果脚本区分 soft/hard，也可以使用：

```bash
ulimit -SHn 16384
```

这种方式适合维护老系统，但新服务应优先用 `systemd` 的 `LimitNOFILE=`。

## 常见误区

`ulimit -n` 限制的不是 TCP established 连接数，而是进程 fd 数。监听 socket、已连接 socket、普通文件、pipe 等都会占用 fd；已经脱离进程 fd 生命周期的 TCP 状态不受它直接限制。

`cat /proc/<pid>/limits | wc -c` 只能统计输出字节数，不能表示 `Max open files`。应直接读取 `/proc/<pid>/limits` 中的 `Max open files` 行。

盲目调高 `nofile` 不能解决 fd 泄漏。如果 fd 数持续增长，应继续用 `ls -l /proc/<pid>/fd`、`lsof -p <pid>` 或应用内指标定位 fd 类型和来源。

## 排查流程

1. 看错误是 `EMFILE` 还是 `ENFILE`。`EMFILE` 通常是单进程 fd 限制；`ENFILE` 通常是系统级 file handle 限制。
2. 用 `/proc/<pid>/limits` 查看服务的 `Max open files`。
3. 用 `/proc/<pid>/fd` 统计当前 fd 数，并抽样看 fd 类型。
4. 用 `/proc/sys/fs/file-nr` 判断系统级 file handle 是否接近上限。
5. 对 `systemd` 服务通过 `LimitNOFILE=` 调整；对旧 `init.d` 服务在启动脚本中显式 `ulimit`。
6. 如果 fd 数异常增长，优先排查泄漏，而不是只提高限制。
