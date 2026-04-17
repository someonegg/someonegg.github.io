# Windows DLL 加载卸载中的异常可见性

## 一句话结论

在 DLL 的初始化/反初始化阶段（例如 `DllMain`、全局对象构造与析构）抛出的异常，很多时候会被系统加载器路径内的异常保护吞掉，表现为“模块加载/卸载失败或行为异常，但看不到清晰崩溃栈”。

## 背景

对 C/C++ 程序来说，`LoadLibrary` / `FreeLibrary` 并不只是“映射或卸载 DLL 文件”，还会触发：

1. 模块级初始化/反初始化
2. CRT 初始化/反初始化
3. 全局/静态对象的构造与析构

因此，业务代码中的构造/析构逻辑，实际上可能运行在“加载器关键路径”里。

## 为什么异常不容易暴露

加载器内部对部分路径做了异常保护（SEH）。这会带来一个常见现象：

1. DLL 加载阶段触发初始化，若构造中发生异常，调用方可能只看到加载失败
2. DLL 卸载阶段触发反初始化，若析构中发生异常，调用方可能只看到卸载异常状态
3. 某些“进程退出时统一清理”的路径上，异常行为与可见性又可能不同

结果是：同一段初始化/清理代码，在不同触发时机下，外在症状并不一致，排查成本高。

## 高风险代码位置

优先排查以下位置是否包含可能抛异常或执行复杂逻辑的代码：

1. `DllMain`（`DLL_PROCESS_ATTACH/DETACH`、`DLL_THREAD_ATTACH/DETACH`）
2. 全局对象构造函数与析构函数
3. 静态局部对象析构
4. CRT 启停钩子、TLS 回调

## 工程实践建议

1. 不在 `DllMain` 中做复杂逻辑：避免 I/O、锁竞争、线程创建、跨模块调用
2. 全局构造/析构保持“无异常”原则：构造失败改为显式 `Init()` 返回错误码
3. 将可失败初始化改为显式生命周期：`Init/Start/Stop/Shutdown` 由调用方控制
4. 在卸载路径做幂等与降级：清理失败只记录日志，不再抛异常扩散
5. 对关键模块增加“加载-调用-卸载”回归测试，覆盖重复装载与进程退出场景

## 推荐模式（示意）

```cpp
class Runtime {
public:
    bool Init() noexcept;      // 显式返回状态
    void Shutdown() noexcept;  // 保证不抛异常
};

static Runtime g_runtime;

extern "C" __declspec(dllexport) BOOL ModuleInit()
{
    return g_runtime.Init() ? TRUE : FALSE;
}

extern "C" __declspec(dllexport) void ModuleShutdown()
{
    g_runtime.Shutdown();
}
```

要点：

1. 把“可能失败”的初始化移出全局构造与 `DllMain`
2. 对外暴露显式入口，便于日志、监控和错误恢复
3. 把异常收敛在模块内部并转为状态码

## 适用范围

- 使用 `LoadLibrary/FreeLibrary` 的插件化系统
- 同时依赖多 DLL 的桌面程序或服务程序
- 历史代码中大量使用全局对象构造/析构执行业务初始化
