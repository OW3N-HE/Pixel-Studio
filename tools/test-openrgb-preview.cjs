'use strict';
// Isolated host preview regression. No OpenRGB, network, serial port or sensors.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '..', 'openrgb-plugin', 'pixel-studio-host.cjs');
const source = fs.readFileSync(file, 'utf8');
new vm.Script(source, { filename: file });
const start = source.indexOf('function preview() {');
const end = source.indexOf('async function thumbnails()', start);
assert(start >= 0 && end > start, 'Host preview entry point must exist');
for (const sessionId of [null, 'mock-ddp-session']) {
  const frames = [], renders = [];
  const context = {
    exiting: false, presentationVisible: true, outputBlocked: false, sessionId, revision: 7, previewTimer: 0,
    config: {mode: 'wave', w: 15, h: 27, mapping: 'serpentine', clockFont: 'classic', clockPalette: 'ice', thermal: {}},
    linearMapping: 'row', temperatureSample: {cpu: 42},
    animationClock: {getTime: () => 12.5},
    renderer: {render(...args) {renders.push(args); return new Uint8Array(1215).fill(64);}},
    output: message => frames.push(message), Buffer, clearInterval() {}, describeError: error => error.message
  };
  vm.runInNewContext(source.slice(start, end) + '\npreview();', context);
  assert.equal(renders.length, 1, 'Preview must not render a second frame for a hidden output label');
  assert.equal(renders[0][3], 12.5, 'Preview uses the continuous animation clock');
  assert.equal(renders[0][4], 'row', 'Preview uses screen order, not device wiring order');
  assert.equal(frames.length, 1);
  assert.equal(frames[0].type, 'frame');
  assert.equal(frames[0].revision, 7);
  assert.equal(Buffer.from(frames[0].rgb, 'base64').length, 1215);
  context.outputBlocked = true;
  vm.runInNewContext(source.slice(start, end) + '\npreview();', context);
  assert.equal(renders.length, 1, 'Backpressure must still skip preview work');
}
// Visibility commands bypass a potentially slow output-start queue. Everything
// below is isolated: no helper process, network, device or sensor is created.
const visibilityStart = source.indexOf('function setPresentation(visible) {');
assert(visibilityStart >= 0 && visibilityStart < start);
const commandStart = source.indexOf("        if (message.op === 'presentation') {");
const commandEnd = source.indexOf("        if (message.op === 'stop'", commandStart);
assert(commandStart >= 0 && commandEnd > commandStart);
for (const transport of ['ddp', 'usb']) {
  const timers = new Map(), messages = [], renders = [];
  let nextTimer = 0, animationTime = 12.5, sentFrames = 0;
  const config = {mode:'wave', w:15, h:27, mapping:'row', clockFont:'classic', clockPalette:'ice', thermal:{sampleSeconds:0.5}, fps:60};
  const sample = {cpu:42, gpu:36};
  const worker = transport === 'usb' ? {postMessage(){throw new Error('Visibility must not reconfigure the output worker.');}} : null;
  const context = {
    exiting:false, presentationVisible:true, outputBlocked:false, revision:17,
    previewTimer:0, config, temperatureSample:sample, usbWorker:worker,
    sessionId:transport === 'ddp' ? 'mock-ddp-session' : null,
    linearMapping:'row', animationClock:{getTime:()=>animationTime},
    renderer:{render(...args){renders.push(args);return new Uint8Array(1215).fill(64);}},
    output:message=>messages.push(message), Buffer, queueTouched:0,
    setInterval(callback,ms){const id=++nextTimer;timers.set(id,{callback,ms});return id;},
    clearInterval(id){timers.delete(id);}, describeError:error=>error.message,
    stopOwnSession(){throw new Error('Visibility must not stop playback.');}
  };
  vm.createContext(context);
  vm.runInContext(source.slice(visibilityStart,end)+'\n'+
    'function dispatchVisibility(message) {\n'+source.slice(commandStart,commandEnd)+'\nqueueTouched++;\n}\n'+
    'previewTimer=setInterval(preview,1000/12);preview();',context);
  assert.equal(timers.size,1);
  assert.equal(messages.length,1);
  const savedConfig=JSON.stringify(config);
  vm.runInContext("dispatchVisibility({id:1,op:'presentation',data:{visible:false}});",context);
  assert.equal(context.presentationVisible,false);
  assert.equal(timers.size,0,'Hidden UI has no recurring preview timer');
  const hiddenRenderCount=renders.length;
  for(let frame=0;frame<60;frame++){
    sentFrames++; // The separate device worker is not controlled by this timer.
    vm.runInContext('preview();',context);
  }
  assert.equal(sentFrames,60);
  assert.equal(renders.length,hiddenRenderCount,'No hidden RGB generation or Base64 frame output');
  assert.equal(context.queueTouched,0,'Visibility never waits in the output-operation queue');
  assert.equal(context.temperatureSample,sample);
  assert.equal(context.usbWorker,worker);
  assert.equal(JSON.stringify(context.config),savedConfig);
  animationTime=30.25;
  vm.runInContext('setPresentation(false);setPresentation(true);',context);
  assert.equal(timers.size,1);
  assert.equal(renders.at(-1)[3],30.25,'Restore uses current time, not a paused preview clock');
  const resumedRenderCount=renders.length, timerId=context.previewTimer;
  vm.runInContext('setPresentation(true);',context);
  assert.equal(timers.size,1);
  assert.equal(context.previewTimer,timerId,'Duplicate show events do not create another timer');
  assert.equal(renders.length,resumedRenderCount);
  assert.throws(()=>vm.runInContext("setPresentation('true');",context),/Invalid preview visibility/);
  assert.equal(context.presentationVisible,true,'Malformed visibility leaves the previous state intact');
  context.exiting=true;
  vm.runInContext('setPresentation(false);setPresentation(true);preview();',context);
  assert.equal(timers.size,0,'Shutdown cannot revive a preview');
  assert.equal(renders.length,resumedRenderCount);
}
console.log('PASS: OpenRGB preview clock/revision/mapping/backpressure; hidden generation/timers stop, immediate current-time restore, duplicate/invalid events, priority visibility commands and untouched fake USB/DDP/temperature ownership. Native UI and devices not tested.');
