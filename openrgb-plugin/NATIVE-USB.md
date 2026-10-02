# Native Windows USB writer

Updated 2026-09-30. The native writer is included in the published V0.1.12
Windows packages. The early V0.1.3 development-only status no longer applies.

PixelStudioSerial.exe is a C++17 helper using Windows serial APIs. Node.js
renders animation frames; the helper sends the existing Adalight framing.
The plugin does not require Python. Browser Web Serial is a separate sender.

## Build and placement

Run Build-Plugin.ps1 with the supported C++/Qt toolchain to build
dist/PixelStudioPlugin.dll and dist/PixelStudioSerial.exe. The serial helper
does not link Qt and uses the static MSVC runtime.

Keep the EXE at <selected project>/openrgb-plugin/dist/PixelStudioSerial.exe.
The Node worker finds it in that project, not in OpenRGB's executable directory.
A matching package needs the DLL, helper, animation sources and Node.js runtime.
An absolute PIXEL_STUDIO_SERIAL_WRITER environment variable may override the
helper location. There is no automatic Python fallback.

## Transport and frame-rate limits

- Default serial line coding is 115200, 8N1; DTR/RTS are disabled.
- A physical UART link at 115200 has a theoretical ceiling of about 9.43 FPS
  for 15 x 27 RGB pixels: 1221 bytes including the Adalight header per frame.
- Native ESP32-C3 USB CDC is a USB transport. Its baud-rate setting is not a
  physical UART bandwidth limit. The matching custom firmware is intended for
  the project's 60 FPS output target.
- Actual reception and LED refresh depend on firmware, device and transport.
  Host FPS measures completed writes, not device acknowledgements or LED refresh.
- An internal --baud option is available; callers must match actual UART
  configuration when using a UART bridge.
- Input validation, bounded serial writes/queue drain, port release and Windows
  error reporting belong to the helper. Stop closes its pipe and terminates a
  helper that does not exit promptly.

## Validation record and remaining coverage

The helper was compiled and packaged in the V0.1.11/V0.1.12 unified builds.
The user reported successful playback with the intended hardware, including USB
operation. These are build records and user feedback, not a comprehensive
hardware compatibility certification.

Before each release, record the exact build and verify relevant changes.
Device-level coverage should include unplug/replug, busy ports, stop/restart,
resume, sustained playback and the intended firmware. Simulated settings,
language and updater tests do not measure USB reception or physical LED FPS.

Source edits made after the V0.1.12 release require a new build and validation;
they do not change the already-published installer.