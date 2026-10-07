# Windows installer / Windows 安装程序

## 0.2.2 正式发布准备（2026-10-07）

本轮 0.2.2 TEST 已获用户反馈“看起来没问题”，19 项源码／模拟回归通过，桌面、温度组件、OpenRGB 插件与串口助手从当前源码重新编译。正式安装器使用同批版本匹配载荷重新编译，不将 TEST 改名。用户允许检查待发布文件、生成校验文件并上传 GitHub；这不是对全部硬件、权限、升级或长期运行场景的保证。

以下 0.2.1、0.1.11 路径和验收记录保留为历史追溯，不作为 0.2.2 构建输入。当前入口为 Build-Unified-Test.ps1 新建源快照及载荷，再经独立审核调用 Build-Installer.ps1 编译正式包；对应更新说明为 RELEASE-0.2.2.md。

The 0.2.2 TEST received user feedback that it looked normal. All 19 source/mock regressions passed and matching components were rebuilt. Stable Setup is compiled from this batch, not a renamed TEST. The user authorized publication checks, checksum generation and GitHub upload; this is not certification of all hardware, permission or upgrade scenarios. Older paths below are historical, not current build inputs.

## V0.2.1 卸载修订（2026-10-06）/ Uninstall revision

此节为当前卸载行为，下方旧版记录仅用于历史追溯。卸载前以 Windows Restart Manager 检测本安装的程序、桥接进程和插件文件占用，经用户确认后关闭，并重新检查。关闭或检查失败时不开始删除文件；静默卸载保留数据，遇到占用则停止，不擅自强制关闭。

可选择“卸载并保留设置”（默认）或“卸载并完全清除”。后者删除当前卸载账户的设置、缓存、记住的串口和升级备份；两种方式均删除本安装的自启动项和安装器安装的插件 DLL。清理错误日志保存在卸载临时目录之外。浏览器设置需另行清除；不删除其他插件、外部媒体、项目、其他账户数据或共享 PawnIO，不操作 Fan Control。

This section supersedes historical uninstall behavior below. Windows Restart Manager identifies this installation's applications, bridge processes and plugin file owners. Shutdown requires consent and is followed by another check; failure blocks deletion. Silent uninstall preserves data and aborts on active owners without forcing shutdown.

Choose settings retention (default) or complete account-data cleanup. Complete cleanup removes this account's settings, caches, remembered ports and upgrade backups. Both options remove this installation's startup entry and installed plugin DLL. Failure reports persist outside the uninstaller's temporary directory. Browser preferences require separate clearing; other plugins, media, projects, accounts, shared PawnIO and Fan Control are left alone.

TEST 包已获用户反馈“没问题”；编译、只读占用检查与用户反馈不代表全部权限、升级或硬件场景均已验证。

## 当前采用的安装流程（2026-09-29）

本节取代下方历史草稿中的范围和验证状态。V0.1.11 已于 2026-09-29
发布 GitHub 正式版。用户已反馈本轮安装器成功退出旧程序并完成安装，
并于 2026-09-29 确认最新测试包验收通过。这不是对全部升级、卸载场景
或所有设备的验证。完整记录见 `../docs/DEVELOPMENT-LOG-0.1.11.md`。

新接手先读 `../docs/HANDOFF.md`；依赖和构建入口见 `SOURCE-BUILD.md`。
正式构建批次为 `20260929-142536`，附件位于
`release-staging/official-0.1.11-20260929-142536`（相对于项目根目录）。
下方 TEST 批次是功能验收历史，不是当前正式包位置。

1. 使用 `Build-Unified-Test.ps1` 从权威源码创建新的版本匹配快照，
   编译温度组件、OpenRGB 插件和 USB 辅助程序，打包桌面版，再生成统一安装包。
   不使用旧二进制改版本号，不将私人日志或截图加入公开载荷。
2. 安装前提示保存工作和 OpenRGB 设置。使用 Windows Restart Manager
   定位占用待更新文件的应用，交互安装时由用户选择是否自动关闭。
   当前采用 `CloseApplications=force`、`RestartApplications=no`：必要时
   强制关闭文件占用者，不按进程名批量结束 Node.js，不操作 Fan Control。
   强制关闭可能丢失未保存的内容。静默安装也可能关闭占用者，不能假定它无副作用。
3. 显式登记桌面可执行文件、所选插件 DLL 和安装目录内的 Node.js 运行时。
   桌面版响应系统结束会话时绕过关闭到托盘。首次复制文件前保留迁移与备份保护；
   文件仍被占用时应停止并处理，不跳过文件。
4. 支持安装范围选择及已有范围保留；管理员安装默认勾选温度采集服务授权。
   仅当前用户安装不默认获得系统服务权限。保留用户偏好、串口记忆和插件路径。
5. 复用兼容的系统 PawnIO。驱动安装另需明确同意；未知或更新的版本不自动覆盖。
   不卸载共享 PawnIO，不改变风扇控制设置。
6. 文件安装完成后配置桌面与共享温度服务，分别供桌面和 Web/OpenRGB 使用。
   温度服务配置失败需明确提示，不把成功安装界面当作 CPU 采集验证。
7. 编译、打包、用户安装反馈、UI 检查和传感器实测分别记录。
   构建不自动安装，也不自动发布 GitHub Release。

### 已确认的组件与构建约定

- 使用 Inno Setup 7.1.0，`SetupArchitecture=x64`；应用和安装器均面向 Windows x64。
- 交互安装首次进入组件页默认仅勾选桌面版，不自动沿用旧的全选状态。
- 网页版、OpenRGB 插件按需选择；任一选中即自动勾选并锁定共用动画库与运行组件，两者都不选则取消共用组件。
- 桌面版使用自身打包资源；网页与 OpenRGB 共享 `app` 动画资源和 `runtime` 运行时，不重复复制同一路径文件。
- 共用动画资源归属 `core` 组件，避免在网页和 OpenRGB 项目下重复展示整套动画库占用；底部空间需求以所选文件集合计算，不能简单相加各行数字。
- 使用指南源码为 `GETTING-STARTED.html`，安装至根目录供快捷方式和安装完成页打开；语言不再硬编码英文。

### 本轮用户反馈与验证边界

- V0.1.11 TEST：自动退出旧程序已由用户确认成功，后续保留此安装流程。
- 早期出现 CPU 温度暂缺后恢复；后续已调整服务等待、重试和错误分类，并重新构建，用户反馈温度采集正常。
- 最新验收包为 `PixelStudio-Setup-0.1.11-TEST.exe`，构建批次 `20260929-133314`。同名安装包可能被后续构建覆盖，追溯时须同时记录批次。
- 用户验收不等于所有服务冷启动、权限、静默安装、卸载及设备组合已经自动测试通过；正式发布审核另行记录。

## 历史草稿（非当前安装范围）

## 当前范围

本目录是安装脚本，尚未生成或验证安装 EXE。不会自动上传或替换当前安装。
使用 Inno Setup 6；默认安装至当前用户的 `%LOCALAPPDATA%\Programs\PixelStudio`，
不需要管理员权限，不修改系统 PATH，不安装全局 Node.js。

- 网页版：安装完整网页和动画库，通过开始菜单打开；USB 请使用支持 Web Serial 的 Chrome / Edge。
- OpenRGB：额外安装专用 Node.js，并将 DLL 放到选定的插件目录。需要兼容的 OpenRGB API 4、Qt 5.15、Windows x64。
- C++ USB 辅助程序随项目文件提供，不再要求 Python。
- 首次启动插件会读取安装器登记的默认路径；已有 project/node 设置优先保留。
- 如果已有设置仍指向旧项目，需在插件设置中手动切换到安装目录的 `app` 和 `runtime/node.exe`。
- 网页直开提供 USB；DDP 仍需要启动现有本地桥接服务，本步骤不包含自动启动服务。
- 旧 DLL 备份到 `%LOCALAPPDATA%\PixelStudio\InstallerBackups`。
- 卸载保留用户配置、备份和插件 DLL，避免误删后来手动更新的 DLL；卸载后若不再使用，请在 OpenRGB 中移除插件。
- 不刷写 WLED，不安装 Electron，不改动本地保留的角色素材。

## 发布前准备

1. 另建发布副本，清理隐私信息与未获授权的素材。不要直接将私人项目根目录打包。
2. 同步两端源码、版本号和说明，编译这一版本的 DLL 和 C++ 辅助程序。
3. 从 Node.js 官方发行包取 Windows x64 `node.exe` 和完整 `LICENSE`，保留第三方声明并校验官方散列。
4. 组装以下 payload；app 必须包含对应完整运行文件及第三方许可，不能带构建缓存、日志、凭据或私人素材。
5. 完成审核后填写 `release-review.json`，这些标记仅记录人工审核，不代替检查。
6. 使用 `Build-Installer.ps1` 编译。安装测试、升级测试、卸载测试和发布是后续独立步骤。

```text
payload/
  LICENSE
  release-review.json
  app/                         reviewed web/runtime files
    index.html
    openrgb-plugin/
      pixel-studio-host.cjs
      dist/PixelStudioSerial.exe
  runtime/
    node.exe
    LICENSE
  plugin/
    PixelStudioPlugin.dll
```

```json
{
  "version": "0.1.4",
  "privacyReviewed": true,
  "assetsReviewed": true,
  "matchingBinariesBuilt": true
}
```

```powershell
.\installer\Build-Installer.ps1 -PayloadDir C:\Release\payload -IsccPath 'C:\Program Files (x86)\Inno Setup 6\ISCC.exe'
```

输出名称为 `PixelStudio-Setup-0.1.4.exe`，与两端检查更新按钮约定一致。
只有上传至官方对应版本的 GitHub Release 后，按钮才有实际可下载的安装包。
未签名安装包可能触发 Windows 安全提示；不要指导用户关闭安全软件。

## English

These are unbuilt installer sources, not a finished installer. The per-user setup
offers the web edition and an optional OpenRGB plugin. It keeps a private Node.js
runtime, does not modify PATH, and does not require Python or flash firmware.

Prepare a separate reviewed payload using the layout above. Include matching
compiled binaries, the official Node.js executable and license, project license
and third-party notices. Record completed privacy, asset and binary review in
`release-review.json`, then invoke the PowerShell build command above with Inno
Setup 6. Never package the private development workspace wholesale.

Close OpenRGB before installing. Standard plugins go into the current user's
AppData OpenRGB plugins directory; select the correct folder for portable or
custom installations. Existing DLLs are backed up. Existing plugin preferences
take precedence over installer defaults, so existing users may need to select
the new `app` project folder and `runtime/node.exe` in plugin settings.

The Start menu web shortcut uses your default browser; use Chrome or Edge for
USB Web Serial. DDP still requires the existing local bridge to be started;
automatic bridge startup is not included in this step.

Uninstall preserves preferences, backups and the external OpenRGB DLL. Remove
that DLL manually if the plugin is no longer needed; it cannot run after its
runtime files have been uninstalled. Installation, upgrade and uninstall tests,
code signing and GitHub publication remain pending.
