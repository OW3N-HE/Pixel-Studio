'use strict';
// Explicit list: never auto-discover historical release/install scripts.
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const tests = [
  'test-dimension-settings.cjs',
  'test-module-resources.cjs',
  'test-web-shell.cjs',
  'check-language-state.cjs',
  'test-release-notes.cjs',
  'test-desktop-settings.cjs',
  'test-desktop-session.cjs',
  'test-updater.cjs',
  'test-engine-modules.cjs',
  'test-frame-pipeline.cjs',
  'test-browser-modules.cjs',
  'test-ddp-recovery.cjs',
  'test-output-transports.cjs',
  'test-stream-worker.cjs',
  'test-temperature-service.cjs',
  'test-temperature-pipe.cjs',
  'test-background-presentation.cjs',
  'test-media-thumbnails.cjs',
  'test-openrgb-preview.cjs'
];
for (const name of tests) {
  console.log('\n=== ' + name + ' ===');
  const result = spawnSync(process.execPath, [path.join(__dirname, name)], {
    cwd: root, stdio: 'inherit', windowsHide: true, timeout: 180000
  });
  if (result.error || result.status !== 0) {
    console.error('Stopped at ' + name + ': ' + (result.error?.message || result.signal || result.status));
    process.exitCode = 1;
    break;
  }
}
if (!process.exitCode) console.log('\nAll listed source/mock regressions passed. No native UI, installation or real-device validation.');
