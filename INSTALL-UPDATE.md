# Installation and manual updates / 安装与手动更新

For Pixel Studio v0.1.3 on Windows. / 适用于 Windows 上的 Pixel Studio v0.1.3。

- [中文完整教程](#中文完整教程)
- [Complete English guide](#complete-english-guide)
- Official downloads / 官方下载: https://github.com/OW3N-HE/Pixel-Studio/releases

## 中文完整教程

### 1. 先选你要使用的版本

**网页版**：在浏览器里操作，不需要 OpenRGB。适合先体验动画和控制屏幕。

**OpenRGB 插件版**：在 OpenRGB 的 Pixel Studio 标签页里操作。它仍需要完整网页项目文件夹和 Node.js，不是只装一个 DLL 就全部完成。

两个版本可以同时安装，但测试时只让一个版本控制屏幕，不要同时打开同一个串口。本版本的插件直接输出 Adalight / DDP，不需要在 OpenRGB 的 Manually Added Devices 中添加 Serial Device，也不会自动使用那里配置的端口。

### 2. 下载正确的包

1. 打开上方官方 Releases 页面。
2. 找到 `Pixel Studio v0.1.3`，展开页面底部的 **Assets**。
3. 下载 `Pixel-Studio-0.1.3-Windows-x64.zip`。只用网页版也可以下载这个包。
4. 不要把 GitHub 自动生成的 `Source code (zip)` 当作已编译插件安装包。`Pixel-Studio-0.1.3-Source.zip` 也不包含编译好的 DLL。
5. 右键下载的 ZIP，选择“全部解压”。不要直接在压缩包里面运行程序。
6. 将完整内容放在固定位置，例如 `C:\PixelStudio\0.1.3\`。这只是示例，D 盘或其他可写目录也可以。

你的项目文件夹应类似：

```text
C:\PixelStudio\0.1.3\
    index.html
    Start-Pixel-DDP.cmd
    Start-Pixel-DDP.ps1
    pixel-ddp-bridge.cjs
    pixel-headless-renderer.cjs
    pixel-stream-worker.cjs
    pixel-studio-web-ui.js
    ...其余配套文件也要保留...
    tools\
        usb_adalight_stream.py
    openrgb-plugin\
        pixel-studio-host.cjs
        dist\
            PixelStudioPlugin.dll
```

如果解压后多套了一层文件夹，以**实际包含 index.html 的那一层**作为项目文件夹。不要只移动 index.html，也不要只保留 DLL 后删除整个下载目录。

保留你原来的私人版本，不要用公开包覆盖它。公开版不含授权不明的角色素材；升级不会自动合并私人动画。

### 3. 安装公共依赖 Node.js

1. 从 https://nodejs.org/ 下载并安装 Node.js 22 或更高版本。已有符合要求的版本可跳过。
2. 安装时保留加入 PATH 的选项。
3. 安装完成后重新打开终端和 OpenRGB。
4. 可在 PowerShell 输入 `node --version`，确认返回的版本号为 v22 或更高。

常见程序位置为 `C:\Program Files\nodejs\node.exe`。如果你自定义过安装路径，选择实际的 node.exe，而不是安装包或 node_modules 文件夹。

Qt、Node.js、Python、OpenRGB 和 WLED 没有捆绑在本下载包中。运行插件不需要安装编译工具；只有自行编译才需要 CMake、Qt 开发包和 Visual Studio Build Tools。

### 4. 启动网页版

1. 打开刚才解压的项目文件夹。
2. 双击 `Start-Pixel-DDP.cmd`。
3. 脚本会在后台启动本地 Node.js 服务，并打开 `http://127.0.0.1:8766/`。
4. **服务窗口默认隐藏，启动窗口自动消失是正常的。** 浏览器关闭也不一定会停止后台服务。
5. 如果打开了其他浏览器，将同一个地址放到桌面版 Chrome 或 Edge 中打开，尤其是使用 USB 时。
6. 先选择动画查看预览；未连接屏幕也可以预览。
7. 点击齿轮打开设置，选择语言、主题和屏幕尺寸。15 列、27 行对应宽 15、高 27，共 405 像素。
8. 按实际接线设置像素排列。出现隔行反向、镜像或方向不对时，检查排列和屏幕方向，不要随意改像素总数。

建议一直使用相同浏览器及相同地址 `http://127.0.0.1:8766/`。`localhost`、`127.0.0.1` 和直接双击 index.html 是不同的访问来源，保存的网页设置可能不共享。

**可选：以可见终端方式启动，方便查看错误和手动停止。** 不要与已运行的服务重复启动。在 PowerShell 中输入：

```powershell
Set-Location 'C:\PixelStudio\0.1.3'
node .\pixel-ddp-bridge.cjs
```

保持这个终端运行，手动打开上述网址。完成后在该终端按 Ctrl+C 可停止这一服务。

### 5. 网页版连接屏幕：二选一

**USB / Adalight**

1. 用支持数据传输的 USB 线连接设备。
2. 确认设备固件支持兼容的 Adalight 接收。仅插入一块没有接收固件的 ESP32 并不能播放。
3. 关闭其他占用该设备串口的程序，停止插件输出。
4. 在桌面 Chrome / Edge 的 Pixel Studio 设置中选择 USB / Adalight。
5. 点击“选择串口”，在浏览器授权窗口中选你的设备并确认。
6. 先用低亮度开始播放，再观察颜色、方向和稳定性。

普通 USB 转 UART 连接要求发送端和固件波特率一致。原生 USB CDC 不等同于普通 UART；不要只把某个波特率数字视作 60 FPS 的保证。

**网络 DDP**

1. 让电脑和 WLED 设备处于可互通的局域网。
2. 从设备或路由器查看 WLED 的实际 IP，在浏览器打开它以确认是你的设备。
3. 保持本地 Pixel Studio 服务运行，在设置中选择 DDP，并填写实际设备地址。
4. “读取屏幕尺寸”需要能够访问设备对应的网络接口；失败时先检查地址和连接，也可以按真实硬件手动设置尺寸。
5. 从低亮度开始播放。例子里的 IP 不是你设备的固定地址。

网页和插件都不能代替正确的供电、共地和 LED 数据接线。本次发布没有刷机包，也没有验证所有硬件都能达到 405 像素 60 FPS。

### 6. 安装 OpenRGB 插件

提供的 DLL 面向 **Windows x64、OpenRGB 插件 API 4、Qt 5.15.0 / MSVC x64**，构建目标为兼容 OpenRGB 1.0rc3 的环境。其他版本可能需要重新编译。可在 OpenRGB“信息 / About”中查看版本信息。

1. 停止 Pixel Studio 播放，然后退出加载插件的 OpenRGB 界面进程。如果关闭窗口只最小化到托盘，应从托盘退出该进程。不要无故停止不相关的后台服务。
2. 按 Win+R，输入 `%APPDATA%\OpenRGB\plugins`，回车。
3. 如果这是你的首次安装且目录不存在，可以创建这个目录。便携或自定义配置目录的 OpenRGB 应优先使用其插件管理器，不要猜测目录。
4. 若里面已有 `PixelStudioPlugin.dll`，将其复制到插件目录之外，例如 `C:\PixelStudio\backups\0.1.2\`，然后用新 DLL 替换原文件。
5. 新 DLL 在下载目录的 `openrgb-plugin\dist\PixelStudioPlugin.dll`。只复制这个 DLL 到 OpenRGB 插件目录，**完整项目文件夹仍保留原位**。
6. 不要在插件目录内放多个改名后的旧 DLL，否则可能重复加载。DLL 不是独立程序，不要双击运行。
7. 重新打开 OpenRGB，在“设置 → 插件”中查看是否已加载或需要启用 Pixel Studio。
8. 打开顶部的 Pixel Studio 标签页。

也可以通过 OpenRGB 自带插件管理器选择同一个 DLL 安装。两种方式选一种即可，不必重复安装。

### 7. 插件首次配置

1. 在 Pixel Studio 标签页点击齿轮。
2. 找到“动画库来源”。
3. Node.js 选择实际的 `node.exe`，常见为 `C:\Program Files\nodejs\node.exe`。
4. 网页项目选择 `C:\PixelStudio\0.1.3`，即实际包含 index.html 的目录。**不是** openrgb-plugin 子目录、dist 子目录，也不是 ZIP 文件。
5. 点击“加载动画库”。
6. 设置屏幕宽高和排列，再选择 USB / Adalight 或 DDP，填写实际串口或地址。
7. 检查“启动 OpenRGB 时自动播放”的状态。旧配置可能保留此选项；首次测试建议先关闭自动播放。
8. 先以低亮度播放一个简单动画。

插件会使用自己的运行流程，不要求你先运行网页启动脚本；不要为了使用插件而同时启动网页版抢占串口。

**插件 USB 输出额外需要 Python 3 和 pyserial**：

1. 从 https://www.python.org/downloads/windows/ 安装 Python 3，确保其命令可用。
2. 在 PowerShell 输入 `python --version`，确认是刚安装的 Python。
3. 执行 `python -m pip install pyserial`。
4. 重启 OpenRGB 后重试 USB 输出。
5. 如果有多个 Python，使用实际解释器安装 pyserial，并可设置用户环境变量 `PIXEL_STUDIO_PYTHON` 为该 python.exe 完整路径，再重启 OpenRGB。

浏览器直接 Web Serial 输出不使用这个 Python USB 辅助程序。

### 8. 手动更新：不要直接覆盖旧目录

1. 在软件设置中点击“检查更新”。它只查询本仓库正式 Release，不会后台自动安装或刷固件。
2. 点击“打开官方发布页 / 下载”，阅读说明并下载对应完整包。
3. 停止网页和插件的播放，备份旧项目、旧 DLL、私人动画和导入媒体。保留浏览器站点数据，不要为了升级清空它。
4. 将新包解压到一个新的版本目录，例如将来的 `C:\PixelStudio\0.1.4`。这只是命名示例，不代表该版本已经发布。
5. **网页版**：若旧本地服务还在运行，先确认没有其他会话使用它，再停止它，从新目录启动服务并刷新页面。
6. **插件版**：退出 OpenRGB，备份后替换 DLL；重开后将“网页项目”改为新版完整目录，点击加载动画库。
7. 在“关于”中确认版本号，重新确认尺寸、排列、地址和串口。
8. 保留旧目录一段时间。需要回退时，停止播放、退出 OpenRGB，恢复旧 DLL，再将项目路径切回旧目录；网页服务也从旧目录重新启动。

更新插件时 **DLL 和完整项目应来自同一个发布版本**。不要只更新 DLL 或混合新旧脚本。独立动画库热更新尚未实现，新增动画随完整项目发布。

**如何停止隐藏的旧网页服务？**

如果没有可见终端，不要直接结束所有 node.exe：其他程序也可能使用它。可在任务管理器“详细信息”中显示“命令行”列，定位命令行指向旧目录 `pixel-ddp-bridge.cjs` 的那个 node.exe，确认没有会话使用后只结束它。无法确认时先不要结束未知进程。

### 9. 常见问题

| 现象 | 先检查什么 |
| --- | --- |
| 找不到 node 或启动后打不开网页 | 安装 Node.js 后重新打开终端；用可见终端方式启动查看具体报错。 |
| EADDRINUSE / 8766 端口已占用 | 常见于旧服务仍在运行；定位旧服务，不要反复双击启动。也可能是其他程序占用端口。 |
| 网页仍显示旧版 | 可能仍连接旧服务；从新目录启动服务后刷新，必要时 Ctrl+F5。 |
| 没有 Pixel Studio 标签 | 检查插件是否启用，以及主程序 API、Qt、架构是否匹配。不要随意从网上下载 DLL 塞进 OpenRGB。 |
| DLL 无法替换 | 通常仍有加载它的 OpenRGB 进程，先退出该进程。 |
| 动画库加载失败 | 检查 Node.js 路径和项目目录，确认整包解压，不是选择 dist。 |
| COM 端口不存在 | 重新连接数据线并选择实际端口，旧 COM6 仅是曾经保存的配置。 |
| 串口忙 / Access denied | 关闭串口监视器、其他播放器或另一版本的 Pixel Studio。 |
| No module named serial | 用插件实际使用的 Python 安装 pyserial。 |
| 预览有画面，灯不亮 | 检查是否开始发送、固件协议、设备地址、供电、接线和尺寸。 |
| 检查更新失败 | 网络错误或 GitHub 限流不代表已是最新版；稍后重试或手动打开官方 Releases。 |

## Complete English guide

### 1. Choose an edition

**Web app:** runs in your browser without OpenRGB. Start here to preview animations and control your display.

**OpenRGB plugin:** runs in the Pixel Studio tab. It still needs Node.js and the complete extracted project folder; installing the DLL alone is not enough.

You may install both editions, but only one should control the display during testing. Never open the same serial port from both. This release sends Adalight / DDP directly; it does not use OpenRGB's native controller output or the Serial Device configuration under Manually Added Devices.

### 2. Download and extract

1. Open https://github.com/OW3N-HE/Pixel-Studio/releases.
2. Find `Pixel Studio v0.1.3` and expand **Assets**.
3. Download `Pixel-Studio-0.1.3-Windows-x64.zip`. This also works for web-only users.
4. The separately provided Source ZIP and GitHub's automatic Source code downloads do not include the compiled plugin DLL.
5. Right-click the downloaded ZIP and choose **Extract All**. Do not run files from inside the ZIP.
6. Keep the entire extracted project in a permanent, writable directory, for example `C:\PixelStudio\0.1.3`.
7. The project root is the directory containing `index.html`, `Start-Pixel-DDP.cmd`, the supporting scripts, `tools`, and `openrgb-plugin`. If extraction adds another folder level, select the inner directory containing index.html.

Do not move index.html on its own. Keep the complete project even after copying the DLL elsewhere. Keep your private/local edition separate: the public package excludes character assets with unclear redistribution rights and does not merge private animations automatically.

### 3. Install Node.js

1. Install Node.js 22 or later from https://nodejs.org/ unless a suitable version is already installed.
2. Keep the installer option to add Node.js to PATH.
3. Reopen terminals and OpenRGB after installation.
4. Optionally run `node --version` in PowerShell to confirm v22 or later.

A common executable path is `C:\Program Files\nodejs\node.exe`. Select the actual executable, not the installer or node_modules directory. Runtime dependencies are not bundled. You do not need Qt development packages, CMake, or Visual Studio just to run the supplied compatible plugin; those are for building it yourself.

### 4. Start the web app

1. Open the extracted project directory.
2. Double-click `Start-Pixel-DDP.cmd`.
3. It starts a local Node.js service in the background and opens `http://127.0.0.1:8766/`.
4. **The service window is hidden by design.** A launcher window disappearing is normal; closing the browser does not necessarily stop the service.
5. Use desktop Chrome or Edge, especially for USB. If another browser opens, enter the same address in Chrome or Edge.
6. Select an animation to preview it without a connected display.
7. Open the gear/settings dialog. Set language, theme, and actual dimensions. A 15-column, 27-row display uses width 15 and height 27, totaling 405 pixels.
8. Set pixel order to match your wiring. Reversed alternating rows or mirrored images usually require checking mapping/orientation, not inventing a different LED count.

Keep using the same browser and URL. Browser storage for localhost, 127.0.0.1, and a directly opened file may differ.

For a visible service terminal, first ensure another service is not already running, then run:

```powershell
Set-Location 'C:\PixelStudio\0.1.3'
node .\pixel-ddp-bridge.cjs
```

Open the local URL manually. Leave this terminal running; Ctrl+C stops this instance when finished.

### 5. Connect the web app to your display

**USB / Adalight**

1. Connect the device with a data-capable USB cable.
2. The device firmware must implement compatible Adalight reception. A bare ESP32 without suitable firmware cannot display frames merely because it is connected.
3. Stop plugin output and close other programs using the serial port.
4. In desktop Chrome/Edge, choose USB / Adalight in Pixel Studio settings.
5. Click **Select port**, select your device in the browser permission dialog, and confirm.
6. Start playback at low brightness and check colors, orientation, and stability.

For USB-to-UART adapters, sender and firmware baud rates must match. Native USB CDC is not the same transport as a UART bridge; a baud-rate setting alone does not guarantee 60 FPS.

**Network DDP**

1. Connect the computer and WLED device to a mutually reachable local network.
2. Find the device's actual IP address and open it in a browser to confirm the device.
3. Keep the local Pixel Studio service running. Select DDP and enter the actual device address.
4. Reading matrix size requires a reachable device network interface. If it fails, check connectivity/address or set the actual dimensions manually.
5. Start playback at low brightness. Example IP addresses are placeholders, not your device address.

Correct power, common ground, and LED data wiring are still required. This release contains no firmware/flashing package, and 405 pixels at 60 FPS has not been validated across all hardware and transports.

### 6. Install the OpenRGB plugin

The supplied binary targets **Windows x64, OpenRGB Plugin API 4, Qt 5.15.0 / MSVC x64**, built for an OpenRGB 1.0rc3-compatible environment. Other host versions may require rebuilding. Check OpenRGB's Information/About page for its versions.

1. Stop playback and exit the OpenRGB GUI process loading the plugin. If closing the window only minimizes it, exit that process from the tray. Do not stop unrelated services unnecessarily.
2. Press Win+R, enter `%APPDATA%\OpenRGB\plugins`, and press Enter.
3. Create the directory if needed for a standard first-time installation. For portable/custom configuration directories, prefer OpenRGB's plugin manager rather than guessing its location.
4. Back up an existing `PixelStudioPlugin.dll` outside the plugins directory, for example under `C:\PixelStudio\backups\0.1.2`.
5. Copy `openrgb-plugin\dist\PixelStudioPlugin.dll` from the extracted download into the OpenRGB plugins directory, replacing the old DLL if present.
6. Keep the complete extracted project in its original location. Do not keep renamed old DLL copies in the plugins directory; they may load twice. Do not double-click the DLL as an application.
7. Restart OpenRGB, check **Settings > Plugins**, and enable Pixel Studio if necessary.
8. Open the **Pixel Studio** tab.

Alternatively, install the same DLL through OpenRGB's plugin manager. Use one installation method, not both.

### 7. Configure the plugin

1. Open the gear/settings dialog in Pixel Studio.
2. Locate **Library source**.
3. Select the actual Node.js executable, commonly `C:\Program Files\nodejs\node.exe`.
4. Select the complete project root, for example `C:\PixelStudio\0.1.3`, containing index.html. Do not select the openrgb-plugin or dist subdirectory, or the ZIP itself.
5. Click **Load library**.
6. Set matrix dimensions and pixel order, then USB / Adalight or DDP with your actual port/address.
7. Check **Play automatically when OpenRGB starts**. Previous settings may retain this option; disable it for initial testing if desired.
8. Start a simple animation at low brightness.

The plugin manages its own runtime flow; you do not need to launch the web app first. Do not run the web app simultaneously on the same serial port.

**Additional requirement for plugin USB output: Python 3 with pyserial**

1. Install Python 3 from https://www.python.org/downloads/windows/ and make its command available.
2. Run `python --version` in PowerShell to confirm the intended interpreter.
3. Run `python -m pip install pyserial`.
4. Restart OpenRGB and retry USB output.
5. If multiple Python installations exist, install pyserial into the interpreter the plugin uses. You may set the user environment variable `PIXEL_STUDIO_PYTHON` to that python.exe's full path and restart OpenRGB.

Direct browser Web Serial output does not use this Python helper.

### 8. Update manually and keep a rollback

1. Click **Check for updates**. This queries only this repository's stable GitHub Releases. It does not automatically install software or flash firmware.
2. Click the official release/download link, read the notes, and download the complete package.
3. Stop playback. Back up the old project, DLL, private animation source, and imported media. Keep browser site data; do not clear it just to update.
4. Extract into a new version directory, for example a future `C:\PixelStudio\0.1.4`. This is only an example name, not an announcement of an existing release.
5. **Web app:** if the old local service is running, first ensure no session still needs it, stop it, and launch the service from the new directory. Refresh the page.
6. **Plugin:** exit OpenRGB, back up and replace the DLL, restart, select the new complete project directory, and click Load library.
7. Confirm the About version and recheck dimensions, mapping, address, and serial port.
8. Retain the old directory. To roll back, stop playback, exit OpenRGB, restore the old DLL and project path, and run the web service from the old directory if needed.

Use the DLL and project from the **same release**. Do not mix old/new scripts or update only the DLL. Standalone animation-library hot updates are not implemented; new library content comes with complete releases.

**Stopping a hidden old web service:** do not terminate every node.exe, since other applications may use Node.js. In Task Manager's Details tab, show the Command line column and identify the node.exe running the old directory's `pixel-ddp-bridge.cjs`. End only that process after confirming it is no longer needed. If you cannot identify it, do not terminate an unknown process.

### 9. Troubleshooting

| Symptom | First things to check |
| --- | --- |
| Node not found or web app will not open | Reopen your terminal after installing Node.js; use the visible-terminal launch to see the error. |
| EADDRINUSE / port 8766 occupied | An old service may still be running, or another application uses the port. Do not repeatedly launch duplicates. |
| Browser still shows the old version | Stop the old service, launch from the new folder, and refresh; use Ctrl+F5 if needed. |
| No Pixel Studio tab | Check plugin enablement and matching host API, Qt, and architecture. Do not copy arbitrary DLLs into OpenRGB. |
| Cannot replace plugin DLL | A process may still be loading it; exit the relevant OpenRGB process. |
| Library will not load | Check node.exe and the complete extracted project directory, not dist. |
| Serial port missing | Reconnect the data cable and select the current port. An old saved COM6 is not necessarily valid. |
| Port busy / Access denied | Close serial monitors, other players, or the other Pixel Studio edition. |
| No module named serial | Install pyserial using the Python interpreter actually used by the plugin. |
| Preview works but LEDs do not | Check playback/output state, firmware protocol, address, wiring, power, and dimensions. |
| Update check fails | Network failures or GitHub rate limits do not mean you are up to date. Retry later or open Releases manually. |
