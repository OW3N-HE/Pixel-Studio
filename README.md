# Pixel Studio

Small pixels. Endless imagination.

Pixel Studio is an independent pixel animation studio for WLED, available as a web application and an OpenRGB plugin. Both editions share the same rendering source and animation library.

## v0.1.3 public edition

- 71 procedural animations and clock modes, live preview and custom palettes.
- USB / Adalight and network DDP output, with a target of up to 60 FPS.
- Chinese and English interfaces, themes and favorites.
- Manual update checks against **https://github.com/OW3N-HE/Pixel-Studio/releases** only.
- OpenRGB update checks use the existing Node.js runtime; no Qt Network installation is needed.
- Private hand-drawn assets and characters with unclear redistribution rights are excluded from this public edition. Local private editions may contain additional animations.

The current update checker reads the latest stable GitHub Release, displays its notes, and links to the official release page. It does **not** automatically install files, update firmware, or independently download animation packs. Future library additions are delivered as part of a complete project release. It checks only when the user clicks the button.

## Downloads

Download `Pixel-Studio-0.1.3-Windows-x64.zip` from [Releases](https://github.com/OW3N-HE/Pixel-Studio/releases). It includes the web app, plugin DLL, corresponding source and these instructions. `Pixel-Studio-0.1.3-Source.zip` contains the source without the compiled DLL or build caches.

Read [INSTALL-UPDATE.md](INSTALL-UPDATE.md) before installation or replacement.

## Requirements

- Windows x64 for the supplied plugin DLL.
- OpenRGB plugin API 4, Qt **5.15.0**, MSVC x64 ABI. The binary was built for an OpenRGB 1.0rc3-compatible host; other API/Qt combinations may require rebuilding.
- Node.js 22 or newer for the local DDP service and OpenRGB plugin.
- Desktop Chrome or Edge with Web Serial for browser USB output.
- Python 3 and `pyserial` for the plugin's USB helper. They are not bundled.
- WLED and a correctly configured LED matrix. 405 pixels / 60 FPS is a target, not a guarantee for all hardware, firmware and transports.

## Build the OpenRGB plugin

Install Visual Studio Build Tools with Desktop development with C++, CMake, and Qt 5.15.0 MSVC 2019 x64. Run:

```powershell
./openrgb-plugin/Build-Plugin.ps1 -QtDir 'C:\Qt\5.15.0\msvc2019_64'
```

The build script produces `openrgb-plugin/dist/PixelStudioPlugin.dll`. It does not install or flash anything. The release build intentionally has no developer-specific default project folder: select your extracted project folder in the plugin settings.

## Validation and limitations

The public source passed JavaScript syntax parsing and headless rendering of all 71 available modes at 15 x 27 pixels, three timestamps and two mappings (426 frames). The Windows plugin compiled successfully with an existing variable-shadowing warning. This is not a device timing, electrical safety, endurance or full UI regression test. Animation source inspection cannot establish that every artistic concept is legally protectable or unprotectable; report any rights concern before redistribution.

Custom ESP32-C3 WLED firmware is **not included in this software release**. Its source, license, build correspondence, watchdog behavior and flashing instructions need a separate experimental firmware release. Do not flash software archives or assume an application BIN belongs at offset 0x0.

## License and third-party notices

Pixel Studio project-owned code is licensed under **GPL-2.0-or-later**. See [LICENSE](LICENSE) for the GPLv2 text; at your option you may use a later GPL version. The project is provided without warranty. Existing third-party copyright notices and licenses remain applicable; see [openrgb-plugin/THIRD-PARTY.md](openrgb-plugin/THIRD-PARTY.md).

Qt, Node.js, Python, pyserial, OpenRGB and WLED are not bundled in this release. WLED firmware is a separate project and is not relicensed by this statement.

Contributions adding original or properly licensed animations are welcome. Please discuss significant UI changes before proposing them to the official project. This is a contribution preference, not a restriction on GPL modification or redistribution rights. Clearly identify unofficial builds.

## Authors and collaborators

GPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra  
OWEN

Created through AI and human collaboration: AI collaborators contribute to design and development; OWEN guides the product, visual direction and device feedback.

Special thanks: **David Wang**.

Thanks to the WLED, OpenRGB, Qt and Node.js communities. This is not an official WLED or OpenRGB release.
