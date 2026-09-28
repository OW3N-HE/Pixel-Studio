# Pixel Studio 0.1.8

## English

### What's new
- Restored Desktop & background settings and initialization of saved USB playback.
- Improved update-panel spacing; retained the two-column desktop switches.
- Pure-black CAD grid/backplate across Desktop, Web and OpenRGB. Animation colors, geometry and theme glow are unchanged.
- Removed number-input stepper buttons and their reserved space in Desktop/Web only.
- Simplified the getting-started guide, English first, then Chinese.

### Download
| File | Use |
| --- | --- |
| **PixelStudio-Setup-0.1.8.exe** | Recommended: Windows x64 installer. Desktop default; Web/OpenRGB optional. Required runtimes included. |
| PixelStudio-Web-0.1.8.zip | Web app with bundled Windows Node.js. Extract all, run `Start-Pixel-Studio.cmd`. |
| PixelStudio-Source-0.1.8.zip | Corresponding public source for developers. |
| SHA256SUMS.txt | Download checksums. |

### Install / update
1. Desktop 0.1.7: **Settings → Check for updates → Download → Install downloaded update**. Web/OpenRGB: download the installer and run it manually.
2. Quit OpenRGB and other Pixel Studio senders from their tray menus. Keep the original installation scope, folder and components. Never skip locked files.
3. Open your edition, check the saved device and play. In-place updates keep settings and do not flash firmware.

Unsigned Windows build. Logic regression tests passed; actual device playback, visual layout and the full installed upgrade need real-world feedback. Private hand-drawn assets and excluded character modes are not included. No macOS/Linux binary. Installer taskbar-icon appearance remains a known issue.

---

## 简体中文

### 本次更新
- 恢复桌面后台设置，以及读取已保存 USB 播放状态的初始化。
- 优化更新区间距，保留桌面开关两列布局。
- 桌面、网页和 OpenRGB 的 CAD 网格及背板统一为纯黑；动画颜色、几何和主题泛光不变。
- 仅网页及桌面版移除数字输入框的上下调节控件及其占位。
- 精简使用指南，先英文、后中文。

### 下载
| 文件 | 用途 |
| --- | --- |
| **PixelStudio-Setup-0.1.8.exe** | 推荐：Windows x64 三合一安装包。默认桌面版，网页/OpenRGB 可选，所需运行环境已包含。 |
| PixelStudio-Web-0.1.8.zip | 内置 Windows Node.js 的网页版，完整解压后运行 `Start-Pixel-Studio.cmd`。 |
| PixelStudio-Source-0.1.8.zip | 对应的公开源码，供开发者使用。 |
| SHA256SUMS.txt | 下载校验值。 |

### 安装 / 升级
1. 桌面版 0.1.7：**设置 → 检查更新 → 下载 → 安装已下载的更新**。网页版/OpenRGB 下载安装包后手动运行。
2. 从托盘退出 OpenRGB 和其他 Pixel Studio 发送程序，沿用原安装范围、目录和组件；文件占用时不要跳过。
3. 重新打开使用的版本，确认保存的设备后播放。原位更新保留设置，不刷写固件。

Windows 安装包未签名。逻辑回归测试已通过，实际设备播放、视觉布局及完整升级仍需实机反馈。公开包不包含私人手绘素材和已排除的角色模式，不提供 macOS/Linux 安装包。安装程序任务栏图标显示仍为已知问题。
