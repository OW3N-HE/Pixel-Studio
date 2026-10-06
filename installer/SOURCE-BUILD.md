# Pixel Studio corresponding source / 对应源码

This archive contains the application, Desktop, OpenRGB plugin, temperature sampler and installer sources corresponding to the release. It does not contain private logs, development screenshots, SDKs, downloaded driver installers or compiled debug symbols.

本归档提供对应版本源码，不是开发电脑的完整副本。依赖与 SDK 需另行配置；正式发布前仍需单独审核，脚本不会自动上传或安装程序。

## Build prerequisites

- Windows x64, Node.js 22 or newer, npm and PowerShell.
- Visual Studio C++ Build Tools with CMake/NMake and the Windows SDK.
- Qt 5.15.0 MSVC 2019 x64, compatible with the target OpenRGB host.
- A .NET SDK capable of building net8.0-windows, installed under `.tools/dotnet` for the unified script. Restore NuGet dependencies normally.
- Inno Setup 7.1.0 under `.tools/inno-setup-7` (including the ChineseSimplified language file).
- Official Node.js 22.23.3 Windows x64 extracted to `.tools/installer-downloads/node-v22.23.3-win-x64` for the bundled Web/OpenRGB runtime. Preserve its LICENSE.

## Build

1. Run `npm ci --prefix desktop` to restore the locked desktop dependencies.
2. Put Qt under `openrgb-plugin/.tools/qt/5.15.0/msvc2019_64`, or invoke `openrgb-plugin/Build-Plugin.ps1 -QtDir <path>` separately.
3. Run `installer/Build-Unified-Test.ps1`. It creates a fresh source snapshot, compiles the sampler and plugin, packages Desktop and builds a TEST installer. It downloads and validates the pinned official PawnIO installer if needed, but never executes it.
4. Review the generated payload and its third-party notices. `Build-Installer.ps1` without `-TestPackage` requires a truthful, version-matched `release-review.json`. Do not copy approval from another build.
5. Use `Prepare-Release-Archives.ps1` with explicit matching source/payload paths to assemble release archives. It does not publish them.

The sampler is built with a generic source path map. Its local PDB is useful for debugging, but is excluded from installed resources. Sensor notices are generated from restored NuGet metadata and runtime license files; upstream license texts are retained in `temperature/third-party`.

## Tests

From the source root, restore the locked, development-only dependencies and run the explicit regression suite. Acorn is declared in the root package, not borrowed from a firmware workspace. The runner stops on the first failure and never discovers or runs historical release scripts.

在源码根目录恢复锁定的测试依赖，再运行统一回归入口。测试不依赖未发布的固件开发目录；遇到失败即停止，不会自动执行历史发布脚本。

```powershell
npm ci --ignore-scripts
npm test
```

These are source/in-memory/mock checks. Some tests write disposable fixtures under `logs/`. They do not install software, open real devices or prove native Desktop/OpenRGB rendering, sensor access, driver compatibility or installer behavior. Those remain separate, explicitly authorized checks. To run one check, use `node tools/<test-name>.cjs` after restoring the root dependencies.

## License and upstream sources

See the project LICENSE and `openrgb-plugin/THIRD-PARTY.md`. Third-party libraries retain their own terms; Pixel Studio does not relicense their code or artwork. Installed sensor resources include the dependency inventory, complete license texts and upstream source links under `temperature/third-party`. Electron/Chromium and Node.js notices accompany those components.

OpenRGB is a separate application and is not included. Pixel Studio does not stop Fan Control, change fan settings or uninstall shared PawnIO. Temperature service authorization is separate from optional driver installation consent.
