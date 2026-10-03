'use strict';
const assert=require('node:assert/strict');
const settings=require('../pixel-render-settings.cjs');
const schema=require('../pixel-settings-schema.cjs');
const state=settings.createDimensionState();
const original={w:15,h:27,pixelCount:405};
for(const [width,height] of [
  ['0','0'],['0','27'],['15','0'],['-1','27'],['15','-1'],['','27'],['15',''],
  ['1.5','27'],['15','2.5'],['1e2','27'],['15','300'],['15','3000'],['3000','3000'],
  ['512','512'],[Infinity,27],[NaN,27],['abc','27'],[null,27],[true,27]
]){
  assert.equal(settings.validateDimensions({width,height}),null);
  assert.equal(state.update({width,height}),false);
  assert.deepEqual(state.read(),original,'Invalid draft must keep the committed resolution');
  assert.throws(()=>settings.frameConfig({width,height}),RangeError);
  const restored=schema.sanitizePlaybackValues({matrixW:String(width),matrixH:String(height)});
  assert(!('matrixW' in restored)&&!('matrixH' in restored),'Reject an invalid saved pair');
}
for(const [width,height] of [[1,1],[14,26],[15,27],[64,64],[512,8],[8,512],[8,300]]){
  assert.equal(state.update({width:String(width),height:String(height)}),true);
  assert.deepEqual(state.read(),{w:width,h:height,pixelCount:width*height});
  const saved=schema.sanitizePlaybackValues({matrixW:String(width),matrixH:String(height)});
  assert.equal(saved.matrixW,String(width));assert.equal(saved.matrixH,String(height));
}
assert.deepEqual(settings.createDimensionState({width:0,height:3000}).read(),original);
assert.deepEqual(schema.sanitizePlaybackValues({matrixW:'15'}),{});
assert.equal(state.update({width:15,height:27}),true);
const detached=state.read();detached.w=3000;assert.deepEqual(state.read(),original);
console.log('PASS: invalid drafts, 0, 300/3000 height, preview budget, valid 1x1, committed state and saved dimensions.');
