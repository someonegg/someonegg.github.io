# FRP 内网穿透部署文档

## 环境信息

- **外网服务器**: frq.jtwsm.net (8.138.226.105) - 阿里云
- **本地机器**: macOS
- **域名配置**:
  - tty1.jtwsm.net -> 本地 7681 端口
  - tty2.jtwsm.net -> 本地 7682 端口
  - SSH 通过外网服务器 6000 端口

---

## 一、阿里云安全组配置

### 1.1 登录阿里云控制台
访问: https://ecs.console.aliyun.com/#/securityGroup/region/cn-hangzhou

### 1.2 配置安全组规则
点击对应的安全组 -> **配置规则** -> **手动添加**，添加以下入方向规则：

| 协议类型 | 端口范围 | 授权对象 | 描述 |
|---------|---------|---------|------|
| TCP | 7000/7000 | 0.0.0.0/0 | FRP 通信端口 |
| TCP | 80/80 | 0.0.0.0/0 | HTTP 服务 |
| TCP | 443/443 | 0.0.0.0/0 | HTTPS 服务 |
| TCP | 6000/6000 | 0.0.0.0/0 | SSH 转发端口 |
| TCP | 7500/7500 | 你的IP/32 | FRP Dashboard（建议限制IP） |

> **注意**: 7500 端口建议只允许你的管理 IP 访问，填写 `你的IP/32` 格式，例如 `1.2.3.4/32`

---

## 二、外网服务器配置（frps）

### 2.1 下载并安装 frp

```bash
# SSH 连接到外网服务器
ssh root@8.138.226.105

# 下载 frp（根据服务器架构选择，常见的有 amd64、arm64）
# 先查看系统架构
uname -m

# x86_64 架构使用这个
wget https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_linux_amd64.tar.gz
# 如果是 ARM64 架构使用这个
# wget https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_linux_arm64.tar.gz

# 解压
tar -xzf frp_0.53.2_linux_amd64.tar.gz
cd frp_0.53.2_linux_amd64

# 创建目录
sudo mkdir -p /opt/frp
sudo cp frps /opt/frp/
sudo chmod +x /opt/frp/frps
```

### 2.2 创建服务端配置文件

```bash
# 创建配置目录
sudo mkdir -p /etc/frp

# 生成随机 token（请记录下来，客户端需要使用）
echo "FRP_TOKEN=$(openssl rand -hex 16)" | sudo tee /etc/frp/.env

# 读取生成的 token
source /etc/frp/.env
echo "你的 FRP Token 是: $FRP_TOKEN"

# 创建配置文件
sudo tee /etc/frp/frps.toml > /dev/null << EOF
[server]
bindAddr = "0.0.0.0"
bindPort = 7000

# 虚拟主机HTTP端口
vhostHTTPPort = 80
vhostHTTPSPort = 443

# 身份验证token（使用上面生成的token）
auth.token = "$FRP_TOKEN"

# Dashboard 配置
[server.webServer]
addr = "0.0.0.0"
port = 7500
user = "admin"
password = "$(openssl rand -base64 12)"

# 日志配置
[log]
level = "info"
to = "/var/log/frp.log"
maxDays = 3
EOF

# 查看配置文件，确认密码
cat /etc/frp/frps.toml
```

### 2.3 配置 systemd 服务（开机自启）

```bash
# 创建 systemd 服务文件
sudo tee /etc/systemd/system/frps.service > /dev/null << 'EOF'
[Unit]
Description=frp server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/frp/frps -c /etc/frp/frps.toml
Restart=on-failure
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# 重载 systemd 并启动服务
sudo systemctl daemon-reload
sudo systemctl enable frps
sudo systemctl start frps

# 检查服务状态
sudo systemctl status frps

# 查看日志
sudo journalctl -u frps -f
```

### 2.4 验证服务端运行

```bash
# 检查端口监听
netstat -tuln | grep -E '7000|80|7500'

# 或使用 ss 命令
ss -tuln | grep -E '7000|80|7500'

# 应该看到以下端口在监听:
# 0.0.0.0:7000  (frp通信)
# 0.0.0.0:80    (http)
# 0.0.0.0:7500  (dashboard)
```

---

## 三、本地 macOS 配置（frpc）

### 3.1 下载并安装 frp 客户端

```bash
# 打开本地终端

# 查看本地架构
uname -m

# 下载 frp 客户端（Intel Mac 使用 amd64，Apple Silicon 使用 arm64）
# Intel Mac
curl -L https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_darwin_amd64.tar.gz -o frp.tar.gz

# Apple Silicon Mac (M1/M2/M3)
# curl -L https://github.com/fatedier/frp/releases/download/v0.53.2/frp_0.53.2_darwin_arm64.tar.gz -o frp.tar.gz

# 解压
tar -xzf frp.tar.gz
cd frp_0.53.2_darwin_amd64

# 安装到系统目录
sudo mkdir -p /usr/local/etc/frp
sudo cp frpc /usr/local/bin/
sudo chmod +x /usr/local/bin/frpc
```

### 3.2 创建客户端配置文件

```bash
# 请替换以下内容：
# 1. YOUR_FRP_TOKEN: 使用服务端生成的 token
# 2. 如果本地服务不是监听在 127.0.0.1，修改 localIP

sudo tee /usr/local/etc/frp/frpc.toml > /dev/null << 'EOF'
[server]
addr = "8.138.226.105"
port = 7000
auth.token = "YOUR_FRP_TOKEN"

# 日志配置
[log]
level = "info"
to = "/var/log/frpc.log"
maxDays = 3

# HTTP 服务 - 7681端口 -> tty1.jtwsm.net
[[proxies]]
name = "web-tty1"
type = "http"
localIP = "127.0.0.1"
localPort = 7681
customDomains = ["tty1.jtwsm.net"]

# HTTP 服务 - 7682端口 -> tty2.jtwsm.net
[[proxies]]
name = "web-tty2"
type = "http"
localIP = "127.0.0.1"
localPort = 7682
customDomains = ["tty2.jtwsm.net"]

# SSH 服务 - 22端口 -> 外网6000端口
[[proxies]]
name = "ssh-service"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 6000
EOF

# 编辑配置文件，替换 token
sudo nano /usr/local/etc/frp/frpc.toml
# 将 YOUR_FRP_TOKEN 替换为服务端生成的真实 token
```

### 3.3 配置 launchd 服务（开机自启）

```bash
# 创建 launchd 配置文件
sudo tee /Library/LaunchDaemons/com.frp.frpc.plist > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.frp.frpc</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/frpc</string>
        <string>-c</string>
        <string>/usr/local/etc/frp/frpc.toml</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/frpc.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/frpc.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
EOF

# 设置日志文件权限
sudo touch /var/log/frpc.log
sudo chmod 644 /var/log/frpc.log

# 加载服务
sudo launchctl load -w /Library/LaunchDaemons/com.frp.frpc.plist

# 检查服务状态
sudo launchctl list | grep frp

# 查看日志
tail -f /var/log/frpc.log
```

### 3.4 手动测试客户端（可选）

```bash
# 先停止自动启动的服务
sudo launchctl unload -w /Library/LaunchDaemons/com.frp.frpc.plist

# 手动运行前台模式，方便调试
/usr/local/bin/frpc -c /usr/local/etc/frp/frpc.toml

# 如果看到 "start proxy success" 等信息，说明连接成功
# 按 Ctrl+C 停止，然后重新加载服务
sudo launchctl load -w /Library/LaunchDaemons/com.frp.frpc.plist
```

---

## 四、使用方式

### 4.1 访问 HTTP 服务

```
http://tty1.jtwsm.net  -> 本地 127.0.0.1:7681
http://tty2.jtwsm.net  -> 本地 127.0.0.1:7682
```

### 4.2 访问 SSH 服务

```bash
# 从外网连接到本地 SSH
ssh -p 6000 your_local_username@8.138.226.105
```

### 4.3 FRP Dashboard 管理界面

```
访问地址: http://8.138.226.105:7500
用户名: admin
密码: 查看 /etc/frp/frps.toml 中的 password 字段
```

---

## 五、故障排查

### 5.1 客户端无法连接

```bash
# 本地检查
# 1. 检查配置文件 token 是否正确
cat /usr/local/etc/frp/frpc.toml | grep token

# 2. 查看客户端日志
tail -f /var/log/frpc.log

# 3. 测试与服务器的连接
telnet 8.138.226.105 7000
# 或
nc -zv 8.138.226.105 7000
```

### 5.2 服务端问题

```bash
# 在外网服务器上执行
# 1. 检查服务状态
sudo systemctl status frps

# 2. 查看日志
sudo journalctl -u frps -f

# 3. 检查端口监听
ss -tuln | grep -E '7000|80|7500'

# 4. 检查防火墙和安全组
sudo iptables -L -n
```

### 5.3 域名访问不生效

```bash
# 1. 检查域名解析
ping tty1.jtwsm.net
nslookup tty1.jtwsm.net

# 2. 检查本地服务是否正常
curl http://127.0.0.1:7681

# 3. 检查代理状态
# 访问 Dashboard 查看 proxy 状态
```

### 5.4 常见错误信息

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| login to server failed: authorization failed | token 不匹配 | 检查服务端和客户端的 auth.token 是否一致 |
| dial tcp 127.0.0.1:7681: connect: connection refused | 本地服务未启动 | 确保本地 7681 端口有服务在监听 |
| port 6000 already used | 端口冲突 | 检查 remotePort 是否已被其他代理占用 |

---

## 六、服务管理命令

### 6.1 服务端命令

```bash
# 启动服务
sudo systemctl start frps

# 停止服务
sudo systemctl stop frps

# 重启服务
sudo systemctl restart frps

# 查看状态
sudo systemctl status frps

# 查看日志
sudo journalctl -u frps -f

# 开机自启
sudo systemctl enable frps

# 禁用自启
sudo systemctl disable frps
```

### 6.2 客户端命令

```bash
# 启动服务
sudo launchctl start com.frp.frpc

# 停止服务
sudo launchctl stop com.frp.frpc

# 重启服务
sudo launchctl stop com.frp.frpc
sudo launchctl start com.frp.frpc

# 查看状态
sudo launchctl list | grep frp

# 查看日志
tail -f /var/log/frpc.log

# 卸载服务
sudo launchctl unload -w /Library/LaunchDaemons/com.frp.frpc.plist
```

---

## 七、安全建议

1. **定期更新 frp 版本**
   ```bash
   # 检查最新版本
   curl -s https://api.github.com/repos/fatedier/frp/releases/latest | grep tag_name
   ```

2. **修改默认密码**
   - 定期修改 Dashboard 密码
   - 使用强随机 token

3. **限制管理端口访问**
   - 在阿里云安全组中，将 7500 端口的授权对象改为你的固定 IP

4. **日志监控**
   - 定期检查 `/var/log/frp.log` 和 `/var/log/frpc.log`
   - 关注异常连接尝试

5. **备份配置文件**
   ```bash
   # 服务端
   sudo cp /etc/frp/frps.toml ~/frps.toml.backup

   # 客户端
   sudo cp /usr/local/etc/frp/frpc.toml ~/frpc.toml.backup
   ```

---

## 八、附录

### 8.1 配置文件路径

| 位置 | 服务端路径 | 客户端路径 |
|-----|-----------|-----------|
| 可执行文件 | /opt/frp/frps | /usr/local/bin/frpc |
| 配置文件 | /etc/frp/frps.toml | /usr/local/etc/frp/frpc.toml |
| 日志文件 | /var/log/frp.log | /var/log/frpc.log |
| Token 存储 | /etc/frp/.env | - |

### 8.2 端口映射表

| 外网 | 类型 | 本地 | 域名 |
|-----|------|------|------|
| 80 | HTTP | 7681 | tty1.jtwsm.net |
| 80 | HTTP | 7682 | tty2.jtwsm.net |
| 6000 | TCP | 22 | - |

### 8.3 有用的链接

- FRP 官方文档: https://github.com/fatedier/frp
- FRP 配置参考: https://github.com/fatedier/frp/blob/dev/README.md
