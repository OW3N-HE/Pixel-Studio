'use strict';
const base=require('./package.json').build;
const fs=require('node:fs');
const path=require('node:path');
// A fresh, explicitly prepared source tree is mandatory. Never reuse a historic payload.
const source=process.env.PIXEL_STUDIO_WEB_SOURCE;
if(!source || !path.isAbsolute(source))throw new Error('Run installer/Build-Unified-Test.ps1 to prepare PIXEL_STUDIO_WEB_SOURCE.');
for(const file of ['index.html','pixel-temperature.cjs','pixel-temperature-service.cjs','pixel-temperature-ui.js','temperature/PixelStudio.Sensors.exe']){
  if(!fs.existsSync(path.join(source,file)))throw new Error('Incomplete Desktop resources: '+file);
}
module.exports={...base,extraResources:[{from:source,to:'web',filter:[
  'index.html','pixel-circuit-palette.cjs','pixel-ddp-bridge.cjs','pixel-headless-renderer.cjs',
  'pixel-stream-worker.cjs','pixel-temperature.cjs','pixel-temperature-service.cjs','pixel-temperature-ui.js',
  'pixel-studio-web-language.js','pixel-studio-web-palettes.js','pixel-studio-web-ui.css','pixel-studio-web-ui.js',
  'GETTING-STARTED.html','LICENSE','temperature/**','!temperature/**/*.pdb','openrgb-plugin/dist/PixelStudioSerial.exe'
]}],directories:{output:'dist-unified'}};
