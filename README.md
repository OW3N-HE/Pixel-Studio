# Pixel Studio 0.1.10

Public source for the Windows Desktop, Web and OpenRGB editions. The full animation library is included with the project owner's publication approval. Display names use neutral descriptions. See RELEASE-NOTES.md and GETTING-STARTED.html.

## Downloads

Use [GitHub Releases](https://github.com/OW3N-HE/Pixel-Studio/releases) for the three-in-one Windows installer, Web ZIP (with Windows Node.js runtime), or corresponding source ZIP. The installer defaults to Desktop and optionally installs Web and OpenRGB. No macOS/Linux binary is supplied.

Web ZIP: extract all files and run Start-Pixel-Studio.cmd to start the local service and browser together. Direct index.html supports browser USB but does not start DDP. A browser cannot execute a local service by itself.

OpenRGB: plugin API 4, Qt 5.15.0 MSVC x64 ABI; compatible OpenRGB must be installed separately. The package uses PixelStudioSerial.exe for native USB; Python is not required. OpenRGB updates are checked/downloaded from the plugin, then installed manually with OpenRGB closed.

Desktop: check for updates in Settings, download and verify, then explicitly confirm installation. No automatic firmware update or silent installation.

## Building the corresponding source

Install Node.js 22+, npm, Visual Studio C++ Build Tools/CMake, Qt 5.15.0 MSVC 2019 x64 and Inno Setup 6.7+. No developer tools or caches are in this archive.

1. In desktop, run npm ci, then node icons.cjs.
2. Build Desktop with npx electron-builder --dir --win --x64 --config electron-builder.unified.cjs --publish never. Use the unified config; the older standalone NSIS extraResources path is not used by this release.
3. Run openrgb-plugin/Build-Plugin.ps1 -QtDir followed by your Qt directory to build the plugin and USB helper. No DLL is installed automatically.
4. Assemble a payload with desktop/ from desktop/dist-unified/win-unpacked; app/ containing the public web files and openrgb-plugin sources/helper; plugin/PixelStudioPlugin.dll; runtime/node.exe and runtime/LICENSE from Node.js 22; and LICENSE at the payload root. The web launcher scripts and GETTING-STARTED.html belong in app/.
5. Compile installer/PixelStudio.iss using Inno Setup ISCC, defining PayloadDir, AppVersion=0.1.10 and OutputPath. Test builds additionally define TestPackage=1. Build-Installer.ps1 performs payload checks; production builds also require a truthful release-review.json.

Build-Unified-Test.ps1 is the maintainer's convenience wrapper and expects locally provisioned Qt/Node/Inno tool directories as named in the script. Prepare-Test-Payload.cjs and the tests require acorn, installable with npm install --prefix firmware/wled-usb-pixel --no-save acorn. Do not publish private development directories or machine profiles.

## Scope and validation

Mocked desktop-settings/IPC and updater regression tests passed. This is not certification of visual layout, actual controller playback or the installed upgrade flow. See openrgb-plugin/THIRD-PARTY.md; Electron and Node distributions retain their own license notices. No code-signing certificate is supplied.

## 简体中文

这是桌面版、网页版和 OpenRGB 插件的公开源码。推荐使用 Releases 中的三合一安装包，默认桌面版，其他组件可选。网页版 ZIP 已包含 Windows Node.js，完整解压后运行 Start-Pixel-Studio.cmd；直接打开 HTML 不会启动 DDP 服务。升级不会刷写固件。

源码编译需要 Node.js、Visual Studio C++、Qt 5.15.0 和 Inno Setup；安装包用户不需要这些开发工具。完整动画库已按项目所有者的确认纳入，展示名称使用中性描述。设置与更新逻辑已通过模拟回归测试，真实设备和完整安装升级仍需实机反馈。
