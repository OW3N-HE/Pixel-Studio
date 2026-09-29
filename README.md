# Pixel Studio 0.1.12

Pixel Studio controls pixel-matrix animations on Windows. The public release offers three ways to use the animation library: a standalone Desktop app, a browser-based Web edition, and an OpenRGB plugin. The default matrix is 15 x 27, with a 14 x 26 preset.

## Download / 下载

Download the [latest Windows x64 installer](https://github.com/OW3N-HE/Pixel-Studio/releases/latest). It selects **Desktop only** by default; Web and OpenRGB are optional. The release also provides separate Web and corresponding-source ZIP archives. Do not download individual repository files as an installer.

从 [GitHub Releases](https://github.com/OW3N-HE/Pixel-Studio/releases/latest) 下载 Windows x64 安装包。安装器默认只选桌面版，网页版和 OpenRGB 插件按需勾选；同一页面另有网页版与对应源码压缩包。仓库中的零散文件是源码，不是安装步骤。

## Editions / 使用方式

| Edition | What it does / 用途 |
| --- | --- |
| Desktop / 桌面版 | Standalone app with tray playback and its own temperature sampler. 独立运行，支持托盘播放。 |
| Web / 网页版 | Starts a local service and opens the browser for USB or DDP output. 启动本地服务后在浏览器中使用。 |
| OpenRGB plugin / 插件 | Adds a Pixel Studio tab to a compatible, separately installed OpenRGB. 需另行安装兼容的 OpenRGB。 |

Temperature designs are available in the Information category. Desktop uses its own sampler; Web and OpenRGB share a separate sampler. A compatible system PawnIO driver may be reused. Installing or replacing that driver requires separate consent; Pixel Studio does not stop Fan Control or change fan settings.

温度动画位于“信息”分类。桌面版与网页版/OpenRGB 的采集进程分开；兼容的系统 PawnIO 驱动可复用。安装或替换驱动需另行确认，不会关闭 Fan Control 或修改风扇设置。

## Source and guides / 源码与指南

The root `index.html`, `pixel-*` files, `desktop/`, `openrgb-plugin/`, `temperature/`, and `installer/` are project sources. `Start-*.cmd` and `Start-*.ps1` are launch scripts. `release-staging/` is historical release material, not the current source authority.

See the bilingual [getting-started guide](installer/GETTING-STARTED.html), [corresponding-source build instructions](installer/SOURCE-BUILD.md), and [V0.1.12 release notes](installer/RELEASE-0.1.12.md). Building requires separate development tools; users of the installer do not need them. A successful build is not a substitute for device or upgrade testing.

根目录的页面、脚本及各子目录是项目源码。具体使用方法、编译依赖和本版改动请看上述指南；`release-staging/` 仅供历史追溯，不应当作当前源码。下载安装包的用户不需要安装编译工具。