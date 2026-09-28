# Pixel Studio V0.1.10

## English

### What's new

- Six new animated scenes: Rainy Window Cafe, Jellyfish Garden, Star Train, Moonlit Camp, Four Seasons Tree and Mechanical Garden. Each has a 24-second sequence and supports the existing preset/custom color controls. Previous animations and hand-drawn artwork are retained.
- Desktop can resume the last playing built-in animation over USB or DDP, with saved output settings, shuffle interval and library filters. Stopped playback stays stopped. USB only reconnects to the remembered device; imported media must be selected again.
- The Web launcher service exits after the last page closes and no other clients are active, with a grace period for reopening. Desktop's private bridge is unaffected.
- Larger update-window text, improved desktop option alignment, and centered OpenRGB update buttons.
- Getting-started guide follows the browser's preferred language on first use, remembers manual selection and restores the segmented language switch. The guide uses the application icon.
- Installation confirmation follows the application's language. The existing download and SHA-256 verification flow is retained; download cancellation/retry redesign is deferred.

### Download and install

| File | Use |
| --- | --- |
| **PixelStudio-Setup-0.1.10.exe** | Recommended Windows x64 installer. Desktop selected by default; Web and OpenRGB optional. Required runtime included. |
| PixelStudio-Web-0.1.10.zip | Extract everything, then run `Start-Pixel-Studio.cmd`. Includes Windows Node.js. |
| PixelStudio-Source-0.1.10.zip | Corresponding source for developers; build dependencies are not included. |
| SHA256SUMS.txt | SHA-256 checksums for these downloads. |

Save your work before upgrading. Quit OpenRGB from its tray and let Setup close Pixel Studio processes when prompted. Keep the existing installation scope and personal settings. Do not skip files that are in use. Updates do not flash controller firmware.

Directly opening `index.html` supports preview/browser USB, but cannot start a local DDP service. OpenRGB must be installed separately: Windows x64, Plugin API 4, Qt 5.15.0 compatibility required. No macOS/Linux binaries are provided. The Windows installer is unsigned.

Validation covers automated rendering, mocked updater/settings and service lifecycle checks, plus release-package checks. It does not replace testing on your physical controller or a real installed upgrade.

## 简体中文

### 更新内容

- 新增六个动画：雨窗咖啡、水母花园、星际列车、月夜露营、四季小树、机械花园。采用 24 秒场景序列，支持现有预设与自定义配色。保留旧动画和全部手绘作品。
- 桌面版可继续上次正在播放的 USB 或 DDP 内置动画，保留输出设置、随机播放间隔和片库筛选。退出前已停止则不自动播放；USB 只连接记住的设备，导入媒体需重新选择。
- 关闭最后一个网页且没有其他客户端使用时，网页启动器服务延迟退出，为重新打开预留缓冲时间；不影响桌面版独立服务。
- 放大更新窗口说明文字，改善桌面选项对齐及 OpenRGB 更新按钮文字居中。
- 使用说明首次跟随浏览器首选语言，记住手动选择，恢复中英文切换框，并使用应用图标。
- 安装确认跟随应用语言。保留原有下载与 SHA-256 校验流程，暂不加入下载取消或重试机制改造。

### 下载与安装

推荐 **PixelStudio-Setup-0.1.10.exe 三合一安装包**，默认桌面版，网页版和 OpenRGB 按需勾选，无需另装 Node.js。

网页版 ZIP 完整解压后运行 `Start-Pixel-Studio.cmd`；直接打开 HTML 不会启动 DDP 服务。源码 ZIP 供开发者使用。

升级前保存工作，从托盘退出 OpenRGB，并允许安装程序关闭提示中的 Pixel Studio 进程。沿用原安装范围并保留个人设置，不要跳过被占用文件。不会刷写控制器固件。安装包未签名，暂不提供 macOS/Linux 安装包。

自动检查覆盖动画渲染、模拟更新与设置恢复、服务生命周期和发布包一致性；不代表已完成真实灯屏或实际安装升级测试。
