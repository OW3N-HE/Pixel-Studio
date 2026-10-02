'use strict';
// Pure module and source-boundary checks only; no connections or installation.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'..'),load=name=>fs.readFileSync(path.join(root,name),'utf8');
const fixture=require('./frame-pipeline-baseline.json'),NativeDate=Date;
global.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixture.at]));}static now(){return fixture.at;}};
try{
  const renderer=require('../pixel-headless-renderer.cjs')(),engine=require('../pixel-animation-engine.cjs');
  const settings=require('../pixel-render-settings.cjs'),mapping=require('../pixel-frame-mapping.cjs'),pipeline=require('../pixel-frame-pipeline.cjs');
  const browser={Date};vm.createContext(browser);
  for(const name of ['pixel-temperature.cjs','pixel-rgb-canvas.cjs','pixel-clock-renderer.cjs','pixel-animation-designs.cjs','pixel-animation-engine.cjs','pixel-render-settings.cjs','pixel-frame-mapping.cjs','pixel-frame-pipeline.cjs','pixel-circuit-palette.cjs'])vm.runInContext(load(name),browser,{filename:name});
  for(const frame of fixture.frames){
    const {mode,w,h,time,mapping:map,font,palette}=frame;
    const rgb=renderer.render(mode,w,h,time,map,font,palette,fixture.thermal,fixture.sample);
    assert.equal(crypto.createHash('sha256').update(rgb).digest('hex'),frame.sha256,'Pre-change mismatch: '+JSON.stringify(frame));
    const options={mode,width:w,height:h,time,mapping:map,clockFont:font,clockPalette:palette,thermal:fixture.thermal,temperatureSample:fixture.sample};
    assert.deepEqual(Array.from(browser.PixelStudioFramePipeline.render(browser.PixelStudioAnimations,options,browser.pixelStudioRecolor)),Array.from(rgb),'Browser pipeline: '+mode);
  }
  assert.deepEqual(settings.frameConfig({}),{w:15,h:27,d:255,pixelCount:405});
  assert.deepEqual(settings.frameConfig({width:'900',height:'0',brightness:'-1'}),{w:512,h:1,d:0,pixelCount:512});
  for(const [w,h]of [[1,1],[3,2],[14,26],[15,27]])for(const map of mapping.modes){
    const rgba=Uint8Array.from({length:w*h*4},(_,i)=>i%256);
    for(const brightness of [0,1,127,255]){
      const expected=new Uint8Array(w*h*3);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const target=(y*w+(map==='serpentine'&&y%2? w-1-x:x))*3,source=(y*w+x)*4;
        for(let c=0;c<3;c++)expected[target+c]=Math.round(rgba[source+c]*brightness/255);
      }
      assert.deepEqual(mapping.fromRgba(rgba,w,h,map,brightness),expected);
      assert.deepEqual(Array.from(browser.PixelStudioFrameMapping.fromRgba(rgba,w,h,map,brightness)),Array.from(expected));
    }
    const row=mapping.fromRgba(rgba,w,h);
    assert.deepEqual(mapping.mapRgb(row,w,h,map),mapping.fromRgba(rgba,w,h,map));
    assert.deepEqual(mapping.mapRgb(mapping.mapRgb(row,w,h,map),w,h,map),row);
  }
  for(const brightness of [0,1,127,255])for(const exponent of [1,1/2.8,1/4]){
    const expected=Uint8Array.from({length:256},(_,i)=>Math.round(255*Math.pow(i/255*(brightness/255),exponent)));
    assert.deepEqual(pipeline.outputLut(brightness,exponent),expected);
    assert.deepEqual(Array.from(browser.PixelStudioFramePipeline.outputLut(brightness,exponent)),Array.from(expected));
  }
  assert.throws(()=>mapping.mapRgb(new Uint8Array(3),2,2));
  assert.throws(()=>mapping.fromRgba(new Uint8Array(4),1,1,'unknown'));
  assert.throws(()=>renderer.render('wave',15,27,NaN,'row'));
  assert.throws(()=>renderer.render('wave',0,27,0,'row'));
  assert.throws(()=>pipeline.outputLut(NaN));assert.throws(()=>pipeline.outputLut(255,0));
  for(const forbidden of ['node:fs','node:vm','readFileSync','document','index.html','pixel-animation-runtime.js'])assert(!load('pixel-headless-renderer.cjs').includes(forbidden),'Headless dependency: '+forbidden);
  assert.equal(renderer.modes.length,engine.list().length);
  console.log('PASS: '+fixture.frames.length+' exact pre-DOM-removal hashes and browser/Node pipeline frames; settings, mapping, brightness/Gamma and headless boundaries.');
}finally{global.Date=NativeDate;}
