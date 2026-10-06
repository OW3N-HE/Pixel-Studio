'use strict';
// Source manifest inspection, not a package build or installed-application check.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
const names=['pixel-settings-schema.cjs','pixel-rgb-canvas.cjs','pixel-clock-renderer.cjs','pixel-animation-designs.cjs','pixel-animation-catalog.cjs','pixel-animation-engine.cjs','pixel-animation-runtime.js','pixel-output-protocols.cjs','pixel-output-transports.cjs','pixel-render-settings.cjs','pixel-frame-mapping.cjs','pixel-frame-pipeline.cjs','pixel-browser-media.cjs','pixel-browser-playback.cjs','pixel-browser-output.cjs'];
for(const p of ['installer/Prepare-Test-Payload.cjs','installer/Build-Unified-Test.ps1','installer/Prepare-Release-Archives.ps1','desktop/electron-builder.unified.cjs']){
  const text=load(p);for(const name of names)assert(text.includes("'"+name+"'"),'Missing '+name+' from '+p);
}
const required=load('installer/Build-Installer.ps1');for(const name of names)assert(required.includes("'app\\"+name+"'"),'Missing installer requirement '+name);
const html=load('index.html'),bridge=load('pixel-ddp-bridge.cjs');
const scripts=[...html.matchAll(/<script\b[^>]*src="\.\/([^"]+)"/g)].map(m=>m[1]);
for(const name of names.filter(n=>n!=='pixel-output-transports.cjs')){
  assert(scripts.includes(name),'Missing browser script '+name);assert(bridge.includes("'/"+name+"':'text/javascript'"),'Missing HTTP asset '+name);
}
for(const [dependency,consumer]of [['pixel-temperature.cjs','pixel-clock-renderer.cjs'],['pixel-rgb-canvas.cjs','pixel-animation-engine.cjs'],['pixel-clock-renderer.cjs','pixel-animation-engine.cjs'],['pixel-animation-designs.cjs','pixel-animation-engine.cjs'],['pixel-animation-engine.cjs','pixel-animation-runtime.js'],['pixel-animation-catalog.cjs','pixel-animation-runtime.js'],['pixel-output-protocols.cjs','pixel-animation-runtime.js'],['pixel-render-settings.cjs','pixel-frame-pipeline.cjs'],['pixel-frame-mapping.cjs','pixel-frame-pipeline.cjs'],['pixel-frame-pipeline.cjs','pixel-animation-runtime.js'],['pixel-browser-media.cjs','pixel-animation-runtime.js'],['pixel-browser-playback.cjs','pixel-animation-runtime.js'],['pixel-browser-output.cjs','pixel-animation-runtime.js']])assert(scripts.indexOf(dependency)<scripts.indexOf(consumer),'Script order '+dependency);
// Derive coverage from the page, not just the hand-maintained package list.
for(const name of scripts){
  assert(fs.existsSync(path.join(root,name)),'Missing page dependency '+name);
  assert(bridge.includes("'/"+name+"':'text/javascript'"),'Unserved page dependency '+name);
}
assert(scripts.indexOf('pixel-settings-schema.cjs')<scripts.indexOf('pixel-animation-runtime.js'),'Settings must load before the runtime');
assert(!bridge.includes("'/pixel-output-transports.cjs'"),'Do not serve Node transport module');
const project=load('temperature/PixelStudio.Sensors.csproj'),icon=/<ApplicationIcon>([^<]+)<\/ApplicationIcon>/.exec(project);
assert(icon);const bytes=fs.readFileSync(path.resolve(root,'temperature',icon[1]));
assert.equal(bytes.readUInt16LE(0),0);assert.equal(bytes.readUInt16LE(2),1);assert(bytes.readUInt16LE(4)>0);
assert(load('desktop/package.json').includes('"version": "0.2.0"'));
console.log('PASS: fifteen module source/package manifests, browser dependency order, every page script route, sensor ICO reference and unchanged version. No binaries built.');
