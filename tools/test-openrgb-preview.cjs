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
    exiting: false, outputBlocked: false, sessionId, revision: 7, previewTimer: 0,
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
console.log('PASS: OpenRGB host preview renders once with or without active DDP output, preserves clock/revision/mapping and backpressure. Native UI and devices not tested.');
