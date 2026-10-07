# Pixel Studio V0.2.2

## 简体中文

Pixel Studio 是 Windows 像素矩阵动画工作室，提供桌面版、网页版和 OpenRGB 插件，共享动画引擎与动画库。

### 版本与下载

0.2.2 正式版提供 Windows x64 三合一安装包、完整 Web 目录和对应源码归档。

[Windows x64 三合一安装包](https://github.com/OW3N-HE/Pixel-Studio/releases/download/v0.2.2/PixelStudio-Setup-0.2.2.exe) · [Web 与源码等附件](https://github.com/OW3N-HE/Pixel-Studio/releases/tag/v0.2.2)

默认桌面版，网页版和 OpenRGB 插件可选，不捆绑 OpenRGB 主程序。安装包未签名；升级前保存工作、备份配置并退出旧程序。

### 0.2.2 改动

- 优化桌面最小化／托盘、网页隐藏及 OpenRGB 面板隐藏时的界面刷新和缩略图工作，保留输出与独立温度采集；恢复可见时同步界面，不靠降低输出帧率省资源。
- 改善持续后台温度采样和缓存读取，减少重复请求与等待；界面不再因统一的五秒期限自动清空温度。驱动、权限或硬件读取失败仍会报告，不能保证所有设备永远返回有效值。
- 底部三行分别表示选中内容、播放／操作结果、连接方式与状态／发送 FPS。结果精简为预览、输出、操作失败；详细错误通过悬停和诊断日志查看，避免重复堆叠。
- USB／DDP 使用独立状态圆点，读取尺寸成功和失败使用主题内弹窗。网页／桌面选择 USB 后验证 WLED 回复，拔出更新状态；自动回复等待上限约 0.5 秒，不包含系统开关端口的耗时。
- 统一网页、桌面、OpenRGB 和帮助页 Logo：去除外泛光、保留高光边框与原有尺寸，恢复中间方块带主题色的灰色。
- 整理共享样式、旧启动回退界面和无用解析助手，修正启动初始化顺序；源码归档补齐当前模拟回归入口，保留实际使用的素材、主题及兼容规则。
- 延续原生 PawnIO 检测、官方安装向导和个人用户温度服务管理员授权；兼容驱动复用，安装需单独同意，不自动覆盖未知或更新版本，不修改风扇设置。

详见 [0.2.2 更新说明](installer/RELEASE-0.2.2.md)。用户已反馈本轮 TEST 看起来正常，19 项源码／模拟回归通过，并从当前源码重新编译；不代表所有硬件、DPI、升级或长期运行场景已验证。四种温度设计保持独立卡片；OpenRGB 保留现有 Qt 功能；Pixel IO 当前不可用。

### 使用与构建

[双语使用指南](installer/GETTING-STARTED.html) · [源码构建](installer/SOURCE-BUILD.md) · [0.2.1 更新记录](installer/RELEASE-0.2.1.md)

桌面拥有独立温度采样器，Web/OpenRGB 共用另一采样器。Web ZIP 应完整解压后使用启动脚本；单独发送 `index.html` 不包含所需样式、脚本和本地服务。后续开发以桌面为主，兼容的动画库更新继续三端共享。

### 素材权利与联系

如有素材权利问题，请通过 [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues) 说明素材与权利依据，不公开私人证明。经核实后采取移除或替换等措施。本项目不代表 WLED、OpenRGB 或相关社区的官方产品；致谢不替代许可。

### ESP32-C3 可选固件

0.2.1 另附 `PixelStudio-C3-USB-60` 应用固件、定制源码及 `WLED-C3-USB-60-README.md`，仅适用于对应 GPIO3 原生 USB CDC 硬件，本次不修改或自动刷写固件。刷写前请备份设备并阅读说明；60 FPS 不是所有设备的性能保证。

## English

Pixel Studio is a Windows pixel-animation studio with Desktop, Web and OpenRGB editions sharing an animation engine and library.

### Version and downloads

The 0.2.2 stable release includes a Windows x64 three-in-one installer, the complete Web distribution and corresponding source archive.

[Windows x64 three-in-one installer](https://github.com/OW3N-HE/Pixel-Studio/releases/download/v0.2.2/PixelStudio-Setup-0.2.2.exe) · [Web, source and release assets](https://github.com/OW3N-HE/Pixel-Studio/releases/tag/v0.2.2)

Desktop is selected by default; Web and the OpenRGB plugin are optional. OpenRGB itself is not bundled. The installer is unsigned. Save work, back up settings and exit the old application before upgrading.

### 0.2.2 changes

- Reduced presentation refresh and thumbnail work when Desktop is minimized/in the tray, Web is hidden, or the OpenRGB panel is hidden. Output and independent temperature sampling remain active; visible UI resynchronizes without reducing configured output FPS.
- Improved continuous temperature sampling and cache reads to reduce duplicate requests and waiting. A blanket five-second expiry no longer clears readings. Driver, permission and hardware failures are still reported; valid readings cannot be guaranteed on every device.
- Separated the three playback lines into selected content, playback/action result, and transport/status/sending FPS. Concise results are Preview, Output and Operation failed; hover details and diagnostic logs explain failures without repeating full error text.
- USB/DDP labels use independent status dots. Successful size reads and failures use themed dialogs. Web/Desktop USB selection verifies WLED replies and updates state on unplugging; automatic reply waiting is about 0.5 seconds, excluding OS port opening/closing.
- Unified Web, Desktop, OpenRGB and guide branding: removed outer glow, retained highlight borders and original size, and restored the theme-tinted gray center tile.
- Cleaned shared styles, obsolete startup fallback presentation and unused parsing helpers; corrected startup initialization order. Source archives include the current mock regression entry points while retaining used artwork, themes and compatibility rules.
- Retained native PawnIO detection, official wizard access and administrator consent for per-user temperature services. Compatible drivers are shared, installation needs separate consent, unknown/newer versions are not overwritten automatically, and fan settings are untouched.

See the [0.2.2 release notes](installer/RELEASE-0.2.2.md). The user reported that this TEST looked normal; all 19 source/mock regressions passed and the components were rebuilt from current sources. This does not certify every device, DPI, upgrade or long-running scenario. The four temperature designs remain separate cards; OpenRGB retains its Qt features; Pixel IO is unavailable.

### Usage and building

[Bilingual getting-started guide](installer/GETTING-STARTED.html) · [Building from source](installer/SOURCE-BUILD.md) · [0.2.1 release notes](installer/RELEASE-0.2.1.md)

Desktop owns its sampler; Web/OpenRGB share another sampler. Extract the complete Web ZIP and use its launch scripts. Sending `index.html` alone does not include required styles, scripts or local services. Future feature development focuses on Desktop, with compatible shared animation updates across editions.

### Artwork rights and contact

For artwork rights concerns, contact the maintainer through [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues) with the artwork identifier and basis of the claim. Do not publish private evidence. Confirmed issues will be addressed through removal or replacement. This project is not an official product of WLED, OpenRGB or their communities; credits do not replace permission.

### Optional ESP32-C3 firmware

The 0.2.1 release separately includes the `PixelStudio-C3-USB-60` application firmware, custom source and `WLED-C3-USB-60-README.md` for matching ESP32-C3 hardware using GPIO3 and native USB CDC. This revision does not change or automatically flash firmware. Back up the device and read the instructions before flashing; 60 FPS is not a performance guarantee for every device.
