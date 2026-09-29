# Pixel Studio V0.1.12

## 简体中文

### 更新内容

- 温度采集不再随动画卡片切换而暂停。桌面版和网页版的 DDP 播放进程持续接收采样；OpenRGB 面板在切换到非温度动画后也继续采样。
- OpenRGB 为四种温度动画分别保存字体、CPU/GPU 品牌配色、自定义颜色及采样间隔，不再让一种样式覆盖其他卡片的设置。
- 保留 V0.1.11 已验收的界面、安装流程、四张独立温度卡片和中英文控制布局。没有加入无限期保留旧温度读数的显示平滑方案。

### 下载与升级

推荐 Windows x64 安装包 `PixelStudio-Setup-0.1.12.exe`。桌面版默认勾选，网页版和 OpenRGB 插件按需选择；安装包不包含 OpenRGB 主程序。升级前请保存工作及 OpenRGB 设置，允许安装器处理占用更新文件的程序。安装器可能强制关闭相关程序，未保存的工作可能丢失。

温度服务仍需管理员授权。兼容 PawnIO 驱动会复用；新驱动安装需要另行同意，不修改 Fan Control 或风扇设置。采集持续运行不代表传感器永远可用；权限、硬件或通信问题仍可能使读数暂时显示 `--`。

安装包未签名。网页版压缩包需要完整解压后使用启动脚本；直接打开 `index.html` 不会启动本地温度服务。源码包仅供开发者构建，不包含 SDK、第三方安装器或私人工作区文件。

## English

### What's new

- Temperature sampling no longer pauses when switching animation cards. Desktop and Web DDP playback workers continue receiving samples, and the OpenRGB panel keeps sampling after switching away from a temperature animation.
- OpenRGB saves font, CPU/GPU brand colors, custom colors and sampling interval separately for each of the four temperature animations.
- Preserves the V0.1.11 UI and installer flow, four independent temperature cards, and bilingual controls. This update does not indefinitely display old readings to hide sensor outages.

### Downloads and upgrade

The recommended Windows x64 download is `PixelStudio-Setup-0.1.12.exe`. Desktop is selected by default; Web and the OpenRGB plugin are optional. OpenRGB itself is not bundled. Save work and OpenRGB settings before upgrading. Setup may forcibly close applications holding update files, which can discard unsaved work.

Temperature services still require administrator consent. Compatible PawnIO installations are reused; installing a new driver requires separate consent. Fan Control and fan settings are not changed. Continuous sampling cannot guarantee sensor availability: permission, hardware or communication failures may temporarily show `--`.

The installer is unsigned. Extract the Web ZIP completely and use its startup script; opening `index.html` directly does not start the local temperature service. The source archive is for building and excludes SDKs, third-party installers and private workspace files.
