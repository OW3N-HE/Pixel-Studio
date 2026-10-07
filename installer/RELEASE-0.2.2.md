# Pixel Studio V0.2.2

## 简体中文

发布日期：2026/10/07

### 更新内容

- 优化后台界面刷新：桌面最小化或收进托盘、网页隐藏、OpenRGB 面板隐藏时暂停不必要的预览、缩略图与界面刷新，恢复可见时同步当前内容；仍在输出时不因界面隐藏而停止发送或温度采样。
- 温度采用持续后台采样和缓存读取，减少重复请求与等待，移除统一的五秒期限自动清空读数规则。读取失败仍保留诊断信息，不将历史值伪装为新采样，也不承诺硬件或驱动永不失败。
- 梳理底部状态：第一行显示选中内容；第二行只显示本地预览、输出或操作失败；第三行显示 USB／DDP、连接状态圆点与发送 FPS。错误详情通过悬停和诊断日志查看，减少重复文案。
- 读取尺寸成功和失败使用主题内弹窗，改善英文长度和竖版设置布局。发送 FPS 是软件发送统计，不是屏幕实测刷新率。
- 保留网页／桌面 USB 选择后的 WLED 回复验证和拔出状态更新。自动回复等待上限约 0.5 秒，系统开关端口及慢启动固件可能需额外时间或重试；OpenRGB 原生串口握手未按网页逻辑重新设计。
- 所有 Logo 保持原有几何与尺寸，去除外泛光、保留高光边框，中间方块恢复带主题色的灰色，帮助页同步。
- 清理确认冗余的共享样式、旧启动回退布局与无用解析助手，修正启动初始化顺序；补齐源码归档所需的模拟回归文件，保留使用中的素材、动态主题、兼容设置与许可证。
- 延续原生 PawnIO 检测、官方安装向导及个人用户温度服务单独管理员授权。兼容驱动复用，新驱动安装需同意，不自动覆盖未知或更新版本，不卸载共享 PawnIO，不操作 Fan Control 或风扇设置。
- 四种温度设计保持独立卡片；桌面拥有独立采样器，Web/OpenRGB 共用另一采样器。Pixel IO 当前仍不可用。

### 安装与测试

Windows x64 三合一安装包为 `PixelStudio-Setup-0.2.2.exe`，使用本轮新编译的版本匹配组件重新生成正式安装器。同时提供 `PixelStudio-Web-0.2.2.zip`、`PixelStudio-Source-0.2.2.zip` 和 `SHA256SUMS.txt`。默认桌面版，网页和 OpenRGB 插件可选，不捆绑 OpenRGB 主程序，不自动刷写固件。

升级前保存工作、备份设置，从托盘退出 Pixel Studio／OpenRGB 后手动安装。安装包未签名，Windows 可能提示安全警告。网页需要完整资源与启动脚本，单个 HTML 不是独立发行文件。

本轮 19 项源码／模拟回归通过，温度组件、OpenRGB 插件与串口助手、桌面程序重新编译，用户反馈 TEST 看起来正常。升级后仍建议确认持续温度、托盘输出与恢复、USB 拔插及个人用户安装。源码模拟回归、编译、包检查与真实硬件验收是不同步骤；不宣称所有权限、长期运行或设备场景均已验证。

### 素材权利

如有素材权利问题，请通过 [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues) 提供素材标识与权利依据，不公开私人证明。确认后采取移除或替换等措施。本项目不是 WLED、OpenRGB 或相关社区的官方产品。

## English

Release date: 2026/10/07

### Changes

- Reduced unnecessary previews, thumbnails and presentation refresh when Desktop is minimized/in the tray, Web is hidden, or the OpenRGB panel is hidden. Visible UI resynchronizes on return; active output and temperature sampling do not stop just because the UI is hidden.
- Continuous backend sampling and cache reads reduce duplicate requests and waiting. Removed the blanket five-second reading expiry. Failures retain diagnostic information; historical values are not presented as new samples, and hardware/driver failures remain possible.
- Clarified the three playback lines: selected content; Preview, Output or Operation failed; then USB/DDP, an independent connection dot and sending FPS. Hover details and diagnostic logs explain failures without repeating complete errors.
- Successful size reads and failures use themed dialogs; refined English labels and portrait settings. Sending FPS is a host statistic, not measured display refresh.
- Retained Web/Desktop WLED USB reply verification and unplug state updates. Automatic reply waiting is about 0.5 seconds; OS port opening/closing and slow firmware startup can add time or require retries. OpenRGB's native serial handshake has not been redesigned around the Web implementation.
- Preserved Logo geometry and size across editions and the guide: removed outer glow, kept highlight borders and restored the theme-tinted gray center tile.
- Removed confirmed redundant shared styles, obsolete startup fallback presentation and unused parsing helpers; corrected startup initialization order and included required mock regressions in source archives. Used artwork, dynamic themes, compatibility settings and licenses remain intact.
- Retained native PawnIO checks, official wizard access and separate administrator consent for per-user temperature services. Compatible drivers are reused, new installation requires consent, unknown/newer versions are not overwritten, and shared PawnIO, Fan Control and fan settings are untouched.
- The four temperature designs remain separate cards. Desktop owns its sampler; Web/OpenRGB share another sampler. Pixel IO is still unavailable.

### Installation and testing

Use the Windows x64 three-in-one `PixelStudio-Setup-0.2.2.exe`, compiled as a stable installer with this batch's freshly built, version-matched components. `PixelStudio-Web-0.2.2.zip`, `PixelStudio-Source-0.2.2.zip` and `SHA256SUMS.txt` are provided. Desktop is selected by default; Web and the OpenRGB plugin are optional. OpenRGB itself is not bundled; firmware is not flashed automatically.

Save work, back up settings and exit Pixel Studio/OpenRGB from the tray before manual installation. The installer is unsigned and Windows may warn. Web requires complete resources and launch scripts; a lone HTML file is not a standalone distribution.

All 19 source/mock regressions passed, and the sampler, OpenRGB plugin/serial writer and Desktop were rebuilt. The user reported that this TEST looked normal. After upgrading, check continuous temperatures, tray output/restoration, USB unplugging and per-user installation. Source/mock regressions, compilation, package checks and hardware acceptance are distinct; not all permissions, long-running conditions or devices are certified.

### Artwork rights

For artwork rights concerns, contact the maintainer through [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues) with the artwork identifier and basis of the claim. Do not publish private evidence. Confirmed issues will be addressed through removal or replacement. This project is not an official product of WLED, OpenRGB or their communities.
