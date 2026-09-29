'use strict';
// Builds an isolated release source tree. Does not publish or mark it reviewed.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const version = require('../desktop/package.json').version;
const targetName = process.argv[2] || `installer-test-${version}`;
if (!/^[a-zA-Z0-9.-]+$/.test(targetName)) throw new Error('Invalid staging directory name');
const out = path.join(root, 'release-staging', targetName);
if (fs.existsSync(out)) throw new Error('Test staging already exists; refusing to overwrite.');
// All animation assets are included with the project owner's publication approval.
const files = ['index.html','pixel-circuit-palette.cjs','pixel-temperature.cjs','pixel-temperature-service.cjs','pixel-temperature-ui.js','pixel-ddp-bridge.cjs','pixel-headless-renderer.cjs','pixel-stream-worker.cjs','pixel-studio-web-language.js','pixel-studio-web-palettes.js','pixel-studio-web-ui.css','pixel-studio-web-ui.js','Start-Pixel-DDP.cmd','Start-Pixel-DDP.ps1','Start-Pixel-Studio.cmd','openrgb-plugin/Build-Plugin.ps1','openrgb-plugin/CMakeLists.txt','openrgb-plugin/plugin.json','openrgb-plugin/pixel-studio-host.cjs','openrgb-plugin/THIRD-PARTY.md','openrgb-plugin/NATIVE-USB.md'];
for (const dir of ['openrgb-plugin/src','openrgb-plugin/compat']) {
  for (const name of fs.readdirSync(path.join(root,dir))) if (/\.(cpp|h)$/.test(name)) files.push(dir+'/'+name);
}
for (const file of files) {
  let content = fs.readFileSync(path.join(root,file),'utf8');
  content = content.replace(/192\.168\.31\.(?:119|29)/g,'192.168.1.100');
  if (file === 'openrgb-plugin/CMakeLists.txt') content = content.replace('PIXEL_STUDIO_PROJECT_ROOT="${PIXEL_STUDIO_PROJECT_ROOT}"','PIXEL_STUDIO_PROJECT_ROOT=""');
  const target = path.join(out,'app',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,content);
}
fs.copyFileSync(path.join(root,'LICENSE'),path.join(out,'LICENSE'));
fs.copyFileSync(path.join(out,'LICENSE'),path.join(out,'app/LICENSE'));
fs.copyFileSync(path.join(__dirname,'GETTING-STARTED.html'),path.join(out,'app/GETTING-STARTED.html'));
console.log('Prepared isolated TEST sources: '+out);
