# Pixel Studio V0.1.11

## 简体中文

### 更新内容

- 新增四种独立温度动画：图标温度、大数字温度、标签温度和温度条，与动态时钟统一放在“信息”分类。
- 支持 CPU/GPU 品牌配色、三色自定义和采样间隔设置；大数字温度支持时钟字体，温度布局适配更多矩阵尺寸。
- 接入温度采集服务，改善服务启动等待、短暂断线重试和权限提示。感谢 LibreHardwareMonitor 与 PawnIO；相关许可及源码地址随包提供。
- 统一网页、桌面和 OpenRGB 的控件排版，修复温度控件尺寸、采样数字居中、中英文秒单位和动画预览配色。
- 改善桌面串口记忆、恢复播放和默认菜单行为；统一品牌图标。
- 改进双语使用指南，支持桌面、网页和 OpenRGB 分页选择及语言跟随。
- 安装器采用原生 x64，默认只选桌面版；网页/OpenRGB 自动选择必需的共用组件，改善升级时旧程序退出流程。

### 下载与安装

推荐 **PixelStudio-Setup-0.1.11.exe**。桌面版默认勾选，网页版和 OpenRGB 按需选择，不需要单独安装 Node.js。OpenRGB 主程序不包含在安装包中，需要兼容的 Windows x64、插件 API 4、Qt 5.15.0 环境。

升级前保存工作及 OpenRGB 设置，再允许安装程序关闭占用文件的程序。必要时可能强制退出，未保存的工作可能丢失。保持原安装范围，保留个人设置，不跳过被占用的文件；不会刷写控制器固件。

温度服务需要管理员授权。兼容的 PawnIO 驱动会复用；驱动安装另需同意，不会自动覆盖未知或更新版本，不更改 Fan Control 或风扇设置。未授权、硬件不支持或暂时无法读取时，温度可能显示 `--`。

安装包未签名，暂不提供 macOS/Linux 二进制。`PixelStudio-Web-0.1.11.zip` 完整解压后运行 `Start-Pixel-Studio.cmd`；便携网页版不能替代安装器配置系统温度服务。`PixelStudio-Source-0.1.11.zip` 是对应源码，构建工具及 SDK 需另行配置。

用户已验收此前的功能测试包；正式包在此基础上补齐许可并排除调试符号。模拟测试、构建与包检查不等于所有硬件、分辨率、权限、升级和卸载组合均已实测。

## English

### What's new

- Four separate temperature animations: Temperature Icons, Large Temperatures, Temperature Labels and Temperature Bars, under Information alongside Digital Clock.
- CPU/GPU brand colors, three-channel custom colors and sampling interval controls. Large temperature digits share clock fonts; temperature layouts adapt to additional matrix sizes.
- Temperature services with improved startup waiting, transient retry and permission reporting. Thanks to LibreHardwareMonitor and PawnIO; notices and source links are included.
- Consistent Web, Desktop and OpenRGB controls, including temperature control sizing, centered sampling values, localized seconds and original thumbnail palettes.
- Improved remembered serial connections and playback recovery, desktop menu behavior and consistent branding.
- Bilingual getting-started guide with edition selection and language handling.
- Native x64 installer with Desktop selected by default, automatic Web/OpenRGB shared dependencies, and improved handling of applications holding upgrade files open.

### Downloads and upgrade

Use **PixelStudio-Setup-0.1.11.exe** for the recommended Windows installation. Web and OpenRGB are optional; Node.js is bundled where required. OpenRGB itself is not bundled and must have a compatible Windows x64 / Plugin API 4 / Qt 5.15.0 environment.

Save work and OpenRGB settings before allowing Setup to close applications using updated files. Forced closing may lose unsaved work. Keep the existing installation scope and personal settings; do not skip locked files. Controller firmware is not flashed.

Temperature services require administrator consent. Compatible PawnIO installations are reused; driver installation needs separate consent. Unknown or newer driver versions are not automatically overwritten. Fan Control and fan settings are not changed. Unsupported, unauthorized or temporarily unavailable readings may show `--`.

The installer is unsigned. No macOS/Linux binaries are provided. Extract `PixelStudio-Web-0.1.11.zip` completely and run `Start-Pixel-Studio.cmd`; portable Web does not configure system temperature services. `PixelStudio-Source-0.1.11.zip` contains corresponding source; build tools and SDKs are separate prerequisites. See `SHA256SUMS.txt` for download hashes.

The preceding functional test build was accepted by the user. Release preparation adds dependency notices and excludes debug symbols. Mocked tests, builds and package checks do not cover every device, resolution, permission, upgrade or uninstall combination.
