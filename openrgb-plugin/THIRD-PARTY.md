# Third-party provenance

## OpenRGB plugin ABI

The compatibility declarations in compat/OpenRGBPluginInterface.h are based on the OpenRGB API 4 interface at commit 6fbcf62d7694e7b92fd0a5884b40b92984fbd1b0, matching the installed host's information page. The upstream interface is SPDX GPL-2.0-or-later.

Upstream authors credited in the interface: herosilas12 (CoffeeIsLife), 2020; Adam Honse, 2021.

- [Upstream interface](https://gitlab.com/CalcProgrammer1/OpenRGB/-/blob/6fbcf62d7694e7b92fd0a5884b40b92984fbd1b0/OpenRGBPluginInterface.h)
- [OpenRGB project and licensing](https://gitlab.com/CalcProgrammer1/OpenRGB)
- [Official plugin documentation](https://openrgb.org/plugins.html)

The local header preserves the API 4 field order, virtual method order and Load(ResourceManagerInterface*) signature.
It forward-declares ResourceManagerInterface rather than importing the full host headers; this plugin does not call methods on that pointer.
Upstream licensing obligations apply to reused declarations and redistribution. This file does not grant a new license for OpenRGB.

## Qt development components

Qt 5.15.0 MSVC 2019 x64 qtbase was selected to match the installed host's Qt runtime.

- [Official Qt package feed](https://download.qt.io/online/qtsdkrepository/windows_x86/desktop/qt5_5150/Updates.xml)
- [Qt licensing](https://www.qt.io/licensing/)
- [Qt open-source obligations](https://www.qt.io/licensing/open-source-lgpl-obligations)

Qt development files stay in .tools. The plugin links dynamically to the host's Qt Core, Gui and Widgets libraries. No replacement Qt runtime is installed into OpenRGB.

## Archive extraction

The local development setup uses 7zr.exe from [7-Zip](https://www.7-zip.org/), downloaded from its official site, only to extract the Qt SDK.

## Existing project and artwork

The original webpage, animation code and hand-drawn artwork remain in the existing project. Their ownership and licensing are unchanged. This integration does not relicense the user's or their friends' artwork.
