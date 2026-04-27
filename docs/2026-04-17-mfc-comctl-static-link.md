# MFC 中使用 COMCTL 的风险与规避（静态链接场景）

## 一句话结论

在“多个静态链接 MFC 的模块”同时使用通用控件（`comctl32.dll`）时，依赖 MFC 自动加载/卸载机制可能导致 `comctl32.dll` 被某个先卸载模块提前释放，进而让仍在运行的模块后续控件操作失败。

## 背景

Windows 通用控件由 `comctl32.dll` 提供。程序使用前通常需要：

1. 加载 `comctl32.dll`
2. 调用 `InitCommonControls` 或 `InitCommonControlsEx` 注册控件类

若未完成，`CreateWindow` 创建对应控件会失败。

## MFC 自动机制

MFC 在创建相关控件前，会通过内部流程（如 `AfxDeferRegisterClass` 的通用控件分支）自动完成：

1. 检查并加载 `comctl32.dll`
2. 调用 `InitCommonControlsEx` 注册控件类
3. 若该 DLL 由当前 MFC 模块“自行加载”，则在该模块卸载时尝试卸载它

大多数单模块场景下，这套机制通常可用。

## 问题触发链路（多静态 MFC 模块）

典型序列：

1. 模块 A、B 都静态链接 MFC，且都使用通用控件
2. A 首次创建控件，触发自动加载 `comctl32.dll`
3. B 后续复用已加载句柄
4. A 卸载时把 `comctl32.dll` 一并卸载
5. B 仍在运行，但其后续控件相关调用开始异常

根因是“模块级加载/卸载责任”与“进程内多模块共享依赖”发生冲突。

## 落地建议

优先方案：

1. 由主模块（EXE）显式负责 `comctl32.dll` 的加载与通用控件初始化
2. 在进程生命周期内统一持有该依赖，不把卸载责任分散到各个静态 MFC 子模块

工程化补充建议：

1. 把“通用控件初始化”收敛到单一入口（如 `AppInitUI()`）
2. 插件/子模块只“使用控件”，不“管理 DLL 生命周期”
3. 在模块卸载测试中增加回归用例：A 卸载后 B 的控件创建、消息处理、销毁流程仍可正常运行

## 可参考的最小初始化片段

```cpp
// EXE 启动阶段（示意）
void InitUiCommonControls()
{
    INITCOMMONCONTROLSEX icc{};
    icc.dwSize = sizeof(icc);
    icc.dwICC = ICC_WIN95_CLASSES | ICC_BAR_CLASSES | ICC_TAB_CLASSES;
    InitCommonControlsEx(&icc);

    // 若需显式持有 DLL，可在 EXE 统一 LoadLibrary 并在进程结束时释放。
    // 关键点是：生命周期归主模块统一管理。
}
```

## 适用范围与边界

- 主要针对：多模块、静态链接 MFC、模块可动态装卸（如插件化）
- 若是单 EXE 单模块，或全局已统一初始化并稳定持有，风险显著降低
