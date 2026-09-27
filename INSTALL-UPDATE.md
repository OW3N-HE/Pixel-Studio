# Installation and updates / 安装与更新

## 网页版

1. 下载官方 Release 的 Windows 完整包，解压到独立目录。不要只取 index.html。
2. 安装 Node.js 22 或更新版本。双击 `Start-Pixel-DDP.cmd`，打开本地网页 `http://127.0.0.1:8766`。DDP 服务仅监听本机。
3. 在设置中选择语言、主题和实际矩阵尺寸。DDP 填写你自己的 WLED 局域网 IP；示例 IP 不是你的设备地址。
4. USB 使用支持 Web Serial 的桌面 Chrome / Edge，由你选择串口。设备固件必须支持兼容的 Adalight 接收。普通 UART 两端波特率必须匹配；不要把原生 USB CDC 与 USB 转 UART 混为一谈。
5. 先低亮度预览，再开始发送。不要让网页、插件和其他程序同时占用同一个串口或控制同一块屏幕。

## OpenRGB 插件

1. 确认 OpenRGB 为 Windows x64、插件 API 4、Qt 5.15.0 兼容版本。插件 DLL 不是独立应用，不能直接运行。
2. 退出加载插件的 OpenRGB 界面进程，备份已有 PixelStudioPlugin.dll。不要无故停止其他后台服务。
3. 通过 OpenRGB 插件管理器安装 `openrgb-plugin/dist/PixelStudioPlugin.dll`，或将它放入 `%APPDATA%\OpenRGB\plugins`。
4. 重新打开 OpenRGB，在 Pixel Studio 设置中选择 Node.js 程序，以及解压后包含 `index.html` 和 `openrgb-plugin` 的完整项目目录，再加载动画库。
5. USB 输出还需要 Python 3 与 pyserial：`python -m pip install pyserial`。Python 应在 PATH 中，或使用环境变量 `PIXEL_STUDIO_PYTHON` 指定 python.exe 后重启 OpenRGB。
6. 选择正确串口或 DDP 地址。已有配置中的自动播放选项会保留，请在连接设备前确认其状态。

## 检查更新与手动替换

1. 点击设置中的“检查更新”。唯一官方更新源为 `https://github.com/OW3N-HE/Pixel-Studio/releases`。
2. 阅读版本说明，下载完整软件包。网络失败或 GitHub 请求限额不代表已经是最新版本；稍后重试或手动打开官方发布页。
3. 停止输出，备份旧项目目录、插件 DLL 和用户导入的媒体。OpenRGB 插件设置位于用户的 PixelStudio/OpenRGBPlugin 配置中；网页设置保存在浏览器的站点存储中。更换浏览器或访问地址可能无法沿用原设置。
4. 退出使用该 DLL 的 OpenRGB 界面。解压新版到新的目录，不要直接混合新旧脚本，也不要删除旧目录以便回退。
5. 替换插件 DLL，在插件设置中把网页项目路径切换到新版目录。若本地 DDP 服务仍运行旧版，应停止旧服务再从新版目录启动；先确认没有其他播放会话需要它。
6. 刷新网页或重开 OpenRGB，确认版本号并选择实际设备。不要覆盖个人配置、私有动画源或媒体文件。
7. 需要回退时，退出界面后恢复备份 DLL，并将项目路径切回旧目录。

更新按钮不会自动覆盖文件，不会自动刷 WLED。首发公开包不包含授权不明的手绘和角色素材；你自己的旧目录可以继续私下保留。

## English quick guide

Extract the complete package, install Node.js 22+, and run `Start-Pixel-DDP.cmd` for the local web/DDP app. For browser USB use supported desktop Chrome/Edge and choose your serial device. Set your actual WLED IP, dimensions and wiring order.

For OpenRGB, use a compatible API 4 / Qt 5.15.0 Windows x64 host. Close the GUI process loading the plugin, back up the old DLL, and install `openrgb-plugin/dist/PixelStudioPlugin.dll` through the plugin manager or `%APPDATA%\OpenRGB\plugins`. Select Node.js and the extracted complete project folder in Pixel Studio settings. Plugin USB requires Python 3 with pyserial; `PIXEL_STUDIO_PYTHON` can specify the interpreter.

To update, check the official Release page, stop playback, back up your project and DLL, extract the new version into a separate folder, replace the DLL while OpenRGB is closed, and select the new project folder. Restart the old local service only when no other session needs it. Keep personal settings and media, and retain the previous folder/DLL for rollback. Firmware is never updated by this button.
