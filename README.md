# Pixel Studio V0.2.1

Pixel Studio 是 Windows 像素矩阵动画工作室，提供桌面版、网页版和 OpenRGB 插件，共享动画引擎与动画库。

Pixel Studio is a Windows pixel-animation studio with Desktop, Web and OpenRGB editions sharing an animation engine and library.

## 下载 / Download

[Windows x64 三合一安装包 / Installer](https://github.com/OW3N-HE/Pixel-Studio/releases/download/v0.2.1/PixelStudio-Setup-0.2.1.exe) · [全部附件 / All assets](https://github.com/OW3N-HE/Pixel-Studio/releases/tag/v0.2.1)

默认安装桌面版，Web 和 OpenRGB 插件可选，不捆绑 OpenRGB 主程序。安装包未签名；升级前保存工作、备份配置并退出旧程序。

Desktop is selected by default; Web and the OpenRGB plugin are optional. OpenRGB itself is not bundled. The installer is unsigned. Save work, back up settings and exit the old application before upgrading.

## 0.2.1 更新 / Highlights

- 统一 UI 与窄窗口／竖向布局，优化卡片排序、播放模式和滚动条。
- 改善 USB/DDP 状态、停止后重新发送、托盘停止／继续及退出流程。
- 恢复记住的 USB 串口；统一主题 Logo、系统图标、帮助页品牌显示与致谢。
- OpenRGB 保留现有功能，同步主题 Logo；Pixel IO 仅预留入口。
- Refined responsive UI, card ordering, playback modes and scrollbars.
- Improved USB/DDP lifecycle, tray Stop/Resume, shutdown and remembered USB selection.
- Updated branding and help. OpenRGB retains its platform features; Pixel IO remains unavailable.

详见 [完整双语更新说明 / Full release notes](installer/RELEASE-0.2.1.md)。构建不代表所有硬件和升级路径测试通过；最终修复仍需设备回归。Compilation does not certify all hardware or upgrade paths.

## 使用与构建 / Usage and source

[双语使用指南 / Getting started](installer/GETTING-STARTED.html) · [源码构建 / Building from source](installer/SOURCE-BUILD.md) · [V0.2.0 更新记录 / Previous release](installer/RELEASE-0.2.0.md)

桌面拥有独立温度采样器，Web/OpenRGB 共用另一采样器。兼容 PawnIO 复用，安装驱动需单独同意，不自动覆盖未知／更新版本，不修改风扇设置。Web ZIP 完整解压后使用启动脚本。后续开发以桌面为主，兼容的动画库更新继续三端共享。

Desktop owns its sampler; Web/OpenRGB share another sampler. Compatible PawnIO is reused, driver installation requires consent, and unknown/newer versions and fan settings are not changed. Extract Web ZIP fully and use its launch scripts. Future feature development focuses on Desktop, with compatible shared animation updates across editions.

特别感谢 / Special thanks: David Wang · Mango Akuma · Mark Peng · SSSSWILK · &amp;#xff1f · 3FC

## 素材权利 / Artwork rights

如有素材权利问题，请通过 [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues) 联系维护者并说明依据，不要公开私人证明文件。核实后将采取移除或替换等适当措施。致谢不代表授权。

Rights holders may contact the maintainer through GitHub Issues identifying the artwork and basis of their claim. Do not publish private documents. Confirmed issues may result in removal or replacement; credits do not imply permission or endorsement.

## ESP32-C3 可选固件 / Optional firmware

本次另附 PixelStudio-C3-USB-60 应用固件、定制源码及 WLED-C3-USB-60-README.md，仅适用于对应 GPIO3 原生 USB CDC 硬件，不由安装器自动刷写。刷写前备份并阅读说明，60 FPS 不是所有设备的性能保证。

Separate USB-60 firmware, custom source and instructions are supplied for the matching ESP32-C3 board. Setup does not flash firmware. Read the included guide and back up the device first; 60 FPS is not a universal guarantee.
