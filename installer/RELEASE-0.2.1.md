# Pixel Studio V0.2.1

## 简体中文

发布日期：2026/10/06

### 更新内容

- 修缮网页与桌面界面，统一控件、文字、设置分组和软件更新布局；改善窄窗口与竖向布局，保持底部播放及导航区域的可用空间。这不是 iOS/Android 原生版。
- 优化动画与桌面媒体卡片拖动排序、固定／顺序／随机播放模式、选中标题、滚动条和拖动时的选中框对比。
- USB/DDP 状态简化为连接状态或发送帧率，改善启动闪烁及失败原因提示；发送帧率不代表灯屏实测帧率。
- 修正 DDP 重复停止请求的释放等待，重新开始前等待正在停止的旧会话。
- 桌面托盘根据播放状态提供停止／继续发送；退出时先收起界面、保存状态，再清理服务，避免退出前闪出服务不可用。
- 桌面切回 USB 或重新开始时可恢复记住的串口；不可用时不自动改用其他设备，仍可手动选择或清除记忆。
- 统一主题 Logo 与预览高光比例；浅色强调蓝为 #0078D4，灰黑主题保留灰白像素。固定系统图标采用冰蓝色且无外泛光；任务栏固定图标可能受 Windows 缓存影响。
- 帮助页同步 Logo，并统一品牌文字字号及视觉居中。更新特别感谢名单。
- OpenRGB 同步主题 Logo、版本和双语致谢，保留现有 Qt 界面、温度与 USB/DDP 功能。
- 清理已确认的废弃样式、重复引用和冗余控件初始化；保留兼容设置、迁移、驱动保护及共享动画库。
- Pixel IO 仅预留入口，当前不可用。后续主要功能迭代以桌面版为主，兼容的共享动画更新继续服务三端。
- 同日修订卸载流程：使用 Windows Restart Manager 检测后台文件占用，经确认关闭相关程序后重新检查；无法关闭或完成检查时停止卸载，不批量结束无关进程。
- 卸载可选择保留设置或完全清除当前卸载账户的设置、缓存、串口记录及升级备份。安装器安装的 OpenRGB 插件随程序移除；共享 PawnIO、其他插件、外部媒体和其他账户的数据保留。清理失败保留日志，不误报完全成功；恢复卸载入口的专用图标。

### 下载与升级

Windows x64 三合一安装包：PixelStudio-Setup-0.2.1.exe。默认选择桌面版，网页版和 OpenRGB 插件按需安装；不包含 OpenRGB 主程序。同时提供 Web、对应源码 ZIP 和 SHA256SUMS.txt。

升级前备份设置、保存工作并从托盘退出 Pixel Studio/OpenRGB。安装器可能关闭占用文件的程序。保留用户设置与独立采样器边界；兼容 PawnIO 直接复用，新驱动安装需要明确同意，不自动覆盖未知或更新版本，不操作 Fan Control 或风扇设置。

安装包未签名，Windows 可能提示安全警告。Web ZIP 应完整解压后使用启动脚本，直接打开 HTML 不会启动本地服务。

### 验证边界

本版依据用户对 TEST 界面和功能的反馈整理，并从当前源码重新构建。编译和打包不代表全部设备、DPI、安装升级及 USB/DDP 场景已实测通过。最后的串口恢复、托盘和停止重启调整仍需要实际设备回归；不宣称这些问题已在所有环境复现并验证解决。构建中的 NuGet 漏洞数据查询不可用，不等于依赖安全审计通过。

特别感谢：David Wang · Mango Akuma · Mark Peng · SSSSWILK · &amp;#xff1f · 3FC

### 素材权利与联系

如有素材权利问题，请通过 [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues) 联系维护者，说明涉及的素材与权利依据，不要公开私人证明文件。经核实后，将采取移除或替换等适当措施。本项目不代表 WLED、OpenRGB 或相关社区的官方产品；致谢不替代许可。

### ESP32-C3 可选固件

本次另附 `PixelStudio-C3-USB-60` 应用固件、定制源码及 `WLED-C3-USB-60-README.md`，仅适用于对应 GPIO3 原生 USB CDC 硬件。安装器不会自动刷写固件。刷写前请备份设备并阅读附带说明；60 FPS 不是所有设备的性能保证。本次卸载修订不改变固件附件。

## English

Release date: 2026/10/06

### What's new

- Refined shared Web/Desktop controls, typography, settings and updater layout, with improved narrow/portrait layouts and preserved playback/navigation space. This is not a native iOS/Android release.
- Improved animation/Desktop media card ordering, fixed/sequential/random playback modes, selection titles and scrollbar/drag feedback.
- Simplified USB/DDP status and host sending FPS; improved startup flicker and failure details. Host FPS is not measured display FPS.
- Repeated DDP stop requests now share release completion; new sessions wait for stopping sessions.
- Desktop tray offers Stop/Resume output. Exit hides the UI, saves state and then shuts down services without displaying shutdown-related service errors.
- Desktop can reuse the remembered USB device after switching outputs or restarting sending. Missing devices are not replaced automatically; manual selection and forgetting remain available.
- Updated theme branding, #0078D4 light accent and grayscale black-theme pixels. Fixed system icons use ice blue without outer glow. Pinned taskbar icons may retain Windows-cached artwork.
- Synchronized help-page branding, heading size and optical alignment; updated special thanks.
- OpenRGB receives theme Logo, version and bilingual credits updates while retaining its Qt UI, temperature and USB/DDP features.
- Removed confirmed redundant styles, includes and widget initialization while preserving migration, compatibility, driver protections and shared animations.
- Pixel IO remains a reserved, unavailable entry. Desktop is the primary future feature focus; compatible animation-library updates remain shared across editions.
- Same-day uninstall revision: Windows Restart Manager detects background file owners and, with consent, closes them before checking again. Uninstall is blocked if shutdown or detection fails; unrelated processes are not killed in bulk.
- Uninstall can preserve settings or completely clear the running account's settings, caches, remembered ports and upgrade backups. The plugin installed by Setup is removed with the application; shared PawnIO, other plugins, external media and other accounts are kept. Cleanup failures retain a report rather than claim complete removal. The dedicated uninstall-entry icon is restored.

### Download and upgrade

Use PixelStudio-Setup-0.2.1.exe for Windows x64. Desktop is selected by default; Web and the OpenRGB plugin are optional. OpenRGB itself is not bundled. Web/source ZIP archives and SHA256SUMS.txt are also provided.

Back up settings, save work and fully exit Pixel Studio/OpenRGB before upgrading. Setup may close programs holding files. Compatible PawnIO is reused; driver installation requires separate consent. Unknown/newer drivers are not automatically overwritten; Fan Control and fan settings are untouched. The installer is unsigned. Extract the complete Web ZIP and use its launch scripts.

### Validation boundaries

Prepared from current sources following user feedback on TEST builds. Compilation/packaging is not proof of all hardware, DPI, installation or upgrade scenarios. Final USB restore, tray and stop/restart changes still need device regression testing. NuGet vulnerability metadata was unavailable during builds; no completed security audit is claimed.

Special thanks: David Wang · Mango Akuma · Mark Peng · SSSSWILK · &amp;#xff1f · 3FC

### Artwork rights and contact

For artwork rights concerns, contact the maintainer through [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues), identifying the artwork and the basis of your claim. Do not publish private documents. Confirmed issues will be addressed through removal, replacement or other appropriate action. This project is not an official product of WLED, OpenRGB or their communities; credits do not replace permission.

### Optional ESP32-C3 firmware

The release separately includes the `PixelStudio-C3-USB-60` application firmware, custom source and `WLED-C3-USB-60-README.md` for the matching ESP32-C3 hardware using GPIO3 and native USB CDC. Setup does not flash firmware automatically. Back up the device and read the included instructions before flashing; 60 FPS is not a performance guarantee for every device. These firmware assets are unchanged by the uninstall revision.
