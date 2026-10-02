# Pixel Studio V0.2.0

## 简体中文

Pixel Studio 是 Windows 像素矩阵动画工作室，提供桌面版、网页版和 OpenRGB 插件，共享 96 个内置动画模式。默认矩阵为 15 x 27，另有 14 x 26 预设。

### 更新内容

V0.2.0 已于 2026/10/02 正式发布，不再是架构预览版本。

- 动画绘制与目录从 HTML 中分离，共享引擎管理 96 个内置模式。
- 时钟绘制、渲染参数、像素排列及配色处理拥有明确模块边界。
- 后台直接调用共享引擎，不再读取页面源码或模拟网页控件。
- 网页运行时拆分媒体预览、播放计时与连接输出，入口保留控件事件及模块组装。
- 协议编码与连接的启动、发送、停止分离。
- 打包资源白名单及模拟回归检查同步补齐。
- 更新网页与桌面界面，统一卡片、选中强调框、圆角滚动底框、边缘淡入淡出及双语控件。
- 桌面新增媒体库，支持选择文件夹、搜索、缩略图、手动刷新和文件夹监听；动画/媒体切换及定时随机播放保留 15:27 卡片比例。
- 低分辨率图片/视频按像素图清晰缩放，高清素材平滑缩放；桌面媒体默认保持比例、居中最大化并补黑边，不拉伸。
- 悬停或聚焦时直接显示完整文件名，不先显示短名称再展开，不改变卡片尺寸。
- 预览与设备输出分离：停止输出不暂停或重置预览，启动输出使用当前帧；图片播放期间保持静态画面及播放状态，按设置间隔切换。
- 修正媒体切换、停止输出后的随机切换、输出状态闪烁、异步取消，以及 OpenRGB 开始输出后无法切换动画的问题。
- 桌面媒体会话恢复与连接恢复各自负责，记住串口不再依赖当前选择的是动画还是媒体。
- 减少后台窗口预览重绘及 PNG 编码开销，不主动停止设备输出；未提供实际 CPU 降幅保证。
- 新用户的网页/桌面主题默认跟随系统，保留已有偏好；应用、安装包及 Sensor 固定图标使用冰蓝色，认可的 Logo 造型不变。
- 协作成员加入 GPT-6.1 Sol；OpenRGB 关于日期统一为 YYYY/MM/DD，关于和更新检查同步为 0.2.0。
- 移除旧名称数字指纹及无效兼容分支，修复精简旧媒体 UI 后的桌面启动错误，并补齐源码归档模块清单。
- 新三合一安装包提供网页、桌面及 OpenRGB 组件，保留随包依赖声明。

### 下载与升级

推荐 Windows x64 安装包 [PixelStudio-Setup-0.2.0.exe](https://github.com/OW3N-HE/Pixel-Studio/releases/download/v0.2.0/PixelStudio-Setup-0.2.0.exe)。桌面版默认勾选，网页版和 OpenRGB 插件按需选择；安装包不包含 OpenRGB 主程序。另提供网页版、对应源码 ZIP 与 SHA-256 校验文件。

升级前请备份设置、保存工作及 OpenRGB 设置，并从托盘完全退出桌面版/OpenRGB。安装器可能关闭占用更新文件的相关程序，未保存的工作可能丢失。

温度服务需要管理员授权；兼容 PawnIO 驱动会复用，新驱动安装需要另行同意。未知或更新版本不会自动覆盖，不修改 Fan Control 或风扇设置。采样持续运行不代表传感器永远可用，权限、硬件或通信问题仍可能使读数暂时显示 `--`。

安装包未签名。网页版压缩包需完整解压后使用启动脚本；直接打开 `index.html` 不会启动本地温度服务。源码包供开发者构建，不包含 SDK、第三方安装器或私人工作区文件。

### 使用方式与源码

| 版本 | 用途 |
| --- | --- |
| 桌面版 | 独立应用，支持媒体库、托盘播放和专属温度采样器。 |
| 网页版 | 启动本地服务后在浏览器中使用，支持 USB 或 DDP 输出。 |
| OpenRGB 插件 | 在另行安装的兼容 OpenRGB 中提供 Pixel Studio 标签页。 |

四张独立温度动画位于“信息”分类，与时钟并列。桌面版拥有专属采样器，网页版/OpenRGB 共享另一采样器，采样生命周期独立于动画选择及帧输出。

根目录的 `index.html`、`pixel-*` 文件和 `desktop/`、`openrgb-plugin/`、`temperature/`、`installer/` 是项目源码；`Start-*.cmd` 和 `Start-*.ps1` 是启动脚本。`release-staging/` 为历史发布材料，不是当前源码来源。

参阅 [双语使用指南](installer/GETTING-STARTED.html)、[源码构建说明](installer/SOURCE-BUILD.md) 和 [V0.2.0 更新说明](installer/RELEASE-0.2.0.md)。编译需要独立开发工具，使用安装包不需要这些工具。仓库零散文件是源码，不是安装包。

三端保留各自的平台适配与权限边界。模块化不代表全部动画自动适配任意分辨率；电脑发送帧率不代表灯屏刷新率。构建、模拟与隔离启动检查不能替代设备或升级实测。

### 动画素材权利与联系

如您是权利人或其授权代表，认为 Pixel Studio 中的动画或图案涉及侵权，请通过 [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues) 联系维护者，说明对应动画、相关权利及主张依据。我们会核实通知，并根据核实结果采取下架、删除或替换等适当措施。请勿在公开 Issue 中提交隐私文件或个人信息，可先请求私下联系渠道。本声明不表示获得官方认可或授权，也不代替适用的许可与授权。

## English

Pixel Studio is a Windows pixel-matrix animation studio with Desktop, Web and OpenRGB editions sharing 96 built-in animation modes. The default matrix is 15 x 27, with a 14 x 26 preset.

### What's new

V0.2.0 was officially released on 2026/10/02; it is no longer an architecture preview.

- Shared animation registry and catalog for 96 built-in modes.
- Independent clock drawing, render settings, frame mapping and palette processing.
- DOM-free headless rendering.
- Separate browser media/preview, playback/timing and output adapters.
- Separate Adalight/DDP encoding and Node USB/DDP connection lifecycle.
- Packaging allowlists and simulated regression coverage updated for the new modules.
- Redesigned shared Web/Desktop interface with consistent gallery cards, selection rings, rounded scrolling surfaces, edge fades and bilingual controls.
- Desktop media library: folder selection, search, thumbnails, manual refresh and folder watching. Added Animation/Media switching and timed shuffle while preserving 15:27 card proportions.
- Low-resolution image/video thumbnails use crisp pixel scaling; high-resolution thumbnails use smooth scaling. Media is proportionally maximized, centered and letterboxed without stretching.
- Full filenames appear directly on hover/focus without an intermediate truncated-name state or resizing the card.
- Preview and device output are independent: stopping output does not stop or restart the preview timeline; starting output uses the current frame. Static images remain in the playing state for the selected interval.
- Corrected media replacement, idle shuffle, output status flicker, asynchronous cancellation and OpenRGB animation switching after output starts.
- Desktop media-session restoration and connection restoration have independent ownership. Remembered USB selection does not depend on choosing an animation rather than media.
- Reduced hidden-window preview redraw and PNG encoding work without intentionally stopping device output.
- Web/Desktop default theme follows the system for new profiles; existing preferences are preserved. Fixed application, installer and Sensor icons use ice blue, retaining approved Logo geometry.
- Updated credits include GPT-6.1 Sol. OpenRGB About dates use YYYY/MM/DD; About and update checks identify version 0.2.0.
- Removed retired-name migration fingerprints and dead compatibility branches; corrected Desktop startup after removing obsolete media UI, and completed source archive module lists.
- Fresh three-in-one installer provides Web, Desktop and OpenRGB components with retained dependency notices.

### Download and upgrade

Use the Windows x64 installer [PixelStudio-Setup-0.2.0.exe](https://github.com/OW3N-HE/Pixel-Studio/releases/download/v0.2.0/PixelStudio-Setup-0.2.0.exe). Desktop is selected by default; Web and the OpenRGB plugin are optional. OpenRGB itself is not bundled. Separate Web and corresponding-source ZIP archives and SHA-256 checksums are provided.

Back up settings, save work and OpenRGB settings, and fully exit Desktop/OpenRGB from the tray before upgrading. The installer may close programs holding update files; unsaved work may be lost.

The temperature service requires administrator authorization. Compatible PawnIO drivers are reused; driver installation requires separate consent. Unknown or newer versions are not automatically overwritten. Fan Control and fan settings are not changed. Continuous sampling does not guarantee sensor availability; permission, hardware or communication problems may temporarily produce `--` readings.

The installer is unsigned. Fully extract the Web archive and use its launch scripts; opening `index.html` alone does not start the local temperature service. The source archive is for developer builds and excludes SDKs, third-party installers and private workspace files.

### Editions and source

| Edition | Purpose |
| --- | --- |
| Desktop | Standalone app with media library, tray playback and its own temperature sampler. |
| Web | Starts a local service and opens the browser for USB or DDP output. |
| OpenRGB plugin | Adds a Pixel Studio tab to compatible, separately installed OpenRGB. |

Four separate temperature designs appear alongside the clock in the Information category. Desktop owns its sampler; Web/OpenRGB share a separate sampler. Sampling lifecycle remains independent of animation selection and frame output.

The root `index.html`, `pixel-*` files, `desktop/`, `openrgb-plugin/`, `temperature/` and `installer/` are project sources. `Start-*.cmd` and `Start-*.ps1` are launch scripts. `release-staging/` is historical release material, not current source authority.

See the [bilingual getting-started guide](installer/GETTING-STARTED.html), [corresponding-source build instructions](installer/SOURCE-BUILD.md) and [V0.2.0 release notes](installer/RELEASE-0.2.0.md). Building requires separate development tools; installer users do not need them. Individual repository files are source code, not an installer.

Each edition retains its platform adapters and permissions. Modularization does not make all animations fit every resolution; host sending FPS is not proof of physical-display FPS. Builds, simulated and isolated-startup checks do not replace device or upgrade testing.

### Artwork rights and contact

If you are a rights holder or an authorized representative and believe that an animation or artwork included in Pixel Studio infringes your rights, please contact the maintainer through [GitHub Issues](https://github.com/OW3N-HE/Pixel-Studio/issues). Please identify the animation, the relevant rights and the basis of your claim. After reviewing the notice, we will take appropriate action, which may include removal or replacement of the material. Please do not post private documents or personal information in a public issue; you may first request a private contact channel. This notice does not imply official endorsement or authorization, nor does it replace applicable licenses or permissions.
