# Native Windows USB writer (development)

This source revision replaces the plugin's Python/pyserial USB sender with
`PixelStudioSerial.exe`, a C++17 program using the Windows serial APIs. Node.js
still renders animations. The Qt interface, DDP path and browser Web Serial
implementation are unchanged. This is not yet part of the published v0.1.3.

## Build and placement

Run `Build-Plugin.ps1` with the existing supported C++/Qt toolchain. It now builds
both `dist/PixelStudioPlugin.dll` and `dist/PixelStudioSerial.exe`. The serial
executable does not link Qt and uses the static MSVC runtime.

Keep the EXE at `<selected project>/openrgb-plugin/dist/PixelStudioSerial.exe`.
The Node worker finds it in that project, NOT in OpenRGB's executable directory.
Install the DLL as before and select this matching complete project folder.
Packaging must include the EXE; copying only the DLL is still insufficient.
An absolute `PIXEL_STUDIO_SERIAL_WRITER` environment variable may override the
EXE location. There is no automatic Python fallback. The old Python source is
retained for reference/rollback only; the updated worker does not execute it.

## Compatibility and limitations

- Existing packet framing, 1..4096 pixels, 4096-byte chunks, 115200 baud default,
  disabled DTR/RTS and 2.5-second startup wait are retained.
- This change does not increase a UART link's bandwidth or guarantee 60 FPS.
- An internal `--baud` option is available to helper callers; the worker keeps
  the existing default and no new baud-rate UI is introduced here.
- A frame event means the host writer completed its write/queue drain, not that
  the device acknowledged the frame or the LEDs displayed it.
- The helper validates input frames, bounds serial write/queue-drain time,
  releases its port on exit, and reports Windows error numbers in ASCII.
- Stop ends the input pipe and terminates a helper that does not exit promptly.

Compilation and hardware validation have not been performed for this revision.
Before release, check build success, unplug/error behavior, stop/restart, port
conflicts, and measured playback with the intended firmware. Do not remove a
working installed version until the replacement has been built and tested.
