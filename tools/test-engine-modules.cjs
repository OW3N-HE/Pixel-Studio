'use strict';
// In-memory checks only. No device, network, browser profile or installation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const load=name=>fs.readFileSync(path.join(root,name),'utf8');
const engine=require('../pixel-animation-engine.cjs');
const catalog=require('../pixel-animation-catalog.cjs');
const protocols=require('../pixel-output-protocols.cjs');
const renderer=require('../pixel-headless-renderer.cjs')();
const baseline=require('./animation-module-baseline.json');
const browser={};vm.createContext(browser);
for(const name of ['pixel-temperature.cjs','pixel-rgb-canvas.cjs','pixel-clock-renderer.cjs','pixel-animation-designs.cjs','pixel-animation-catalog.cjs','pixel-animation-engine.cjs','pixel-output-protocols.cjs'])vm.runInContext(load(name),browser,{filename:name});
for(const id of renderer.modes)if(id!=='file')assert(engine.has(id),'Missing registered animation: '+id);
assert.equal(new Set(engine.list().map(x=>x.id)).size,engine.list().length);
let exactHistorical=0,captureJitter=0;
const captureOffsets=[0.000001,0.000002,0.000005,0.00001,0.00002,0.00005,0.0001,0.0002,0.0005,0.001];
// The old capture added wall-clock time after setting frame.time. Preserve its hashes,
// but explicitly allow up to 1ms of positive capture jitter. This is not exact-time
// historical equivalence. New repeated renders below must match byte-for-byte.
const hash=rgb=>crypto.createHash('sha256').update(rgb).digest('hex');
for(const frame of baseline.frames){
  const render=time=>renderer.render(frame.mode,frame.w,frame.h,time,baseline.mapping,'rounded','original',baseline.thermal,baseline.sample);
  const rgb=render(frame.time);
  assert.deepEqual(render(frame.time),rgb,'Nondeterministic frame: '+frame.mode);
  if(hash(rgb)===frame.sha256){exactHistorical++;continue;}
  let matched=captureOffsets.some(offset=>hash(render(frame.time+offset))===frame.sha256);
  // Three old captures lie in narrower intervals between the coarse candidates.
  if(!matched)for(let step=1;step<=10000;step++)if(hash(render(frame.time+step/10000000))===frame.sha256){matched=true;break;}
  assert(matched,'Historical frame differs beyond capture jitter: '+JSON.stringify(frame));
  captureJitter++;
}
let count=0;
const validSample={status:'ready',sampledAt:Date.now(),cpu:{id:'cpu',brand:'amd',temperature:61},gpu:{id:'gpu',brand:'nvidia',temperature:42}};
for(const {id} of engine.list())for(const [width,height] of [[15,27],[14,26],[27,15],[8,8],[30,54]]){
  const options={mode:id,time:1.25,width,height,date:new Date(2026,8,30,13,26),clockFont:'rounded',clockPalette:'ice',temperatureSample:validSample,thermal:baseline.thermal};
  const rgb=engine.render(options);
  assert.equal(rgb.length,width*height*3);
  assert.deepEqual(Array.from(browser.PixelStudioAnimations.render(options)),Array.from(rgb),'Browser/Node mismatch: '+id);
  count++;
}
assert.deepEqual(Array.from(browser.PixelStudioAnimationCatalog.mappings,x=>x.value),catalog.mappings.map(x=>x.value));
assert.throws(()=>engine.render({mode:'missing',width:15,height:27}));
assert.throws(()=>engine.render({mode:'clock',width:0,height:27}));
assert.throws(()=>engine.register({id:'clock',draw(){}}));
for(const mode of ['thermal_icons','thermal_digits','thermal_labels','thermal_gauges']){
  const options={mode,width:15,height:27,time:0};
  assert.notDeepEqual(engine.render({...options,temperatureSample:validSample}),engine.render(options),'Temperature digits were not rendered: '+mode);
}
let packetCases=0;
for(const pixels of [1,405,480,481,1000,65536])for(const lut of [undefined,Uint8Array.from({length:256},(_,i)=>255-i)]){
  const rgb=Uint8Array.from({length:pixels*3},(_,i)=>i%256),n=pixels-1;
  const ada=Buffer.alloc(6+rgb.length);ada.set([65,100,97,n>>8,n&255,(n>>8)^(n&255)^0x55]);
  for(let i=0;i<rgb.length;i++)ada[i+6]=lut?lut[rgb[i]]:rgb[i];
  assert.deepEqual(Buffer.from(protocols.encodeAdalight(rgb,lut)),ada);
  assert.deepEqual(Array.from(browser.PixelStudioOutputProtocols.encodeAdalight(rgb,lut)),Array.from(ada));
  for(const initial of [0,14,15]){
    let sequence=initial;const packets=[];
    for(let offset=0;offset<rgb.length;offset+=1440){
      const len=Math.min(1440,rgb.length-offset),packet=Buffer.alloc(10+len);
      packet[0]=0x40|(offset+len===rgb.length?1:0);sequence=sequence%15+1;
      packet[1]=sequence;packet[2]=11;packet[3]=1;packet.writeUInt32BE(offset,4);packet.writeUInt16BE(len,8);
      for(let i=0;i<len;i++)packet[10+i]=lut?lut[rgb[offset+i]]:rgb[offset+i];packets.push(packet);
    }
    const actual=protocols.encodeDdp(rgb,{lut,sequence:initial});assert.equal(actual.sequence,sequence);
    assert.deepEqual(actual.packets.map(p=>Buffer.from(p)),packets);
    const b=browser.PixelStudioOutputProtocols.encodeDdp(rgb,{lut,sequence:initial});assert.equal(b.sequence,sequence);
    assert.deepEqual(Array.from(b.packets,p=>Array.from(p)),packets.map(p=>Array.from(p)));packetCases++;
  }
}
assert.throws(()=>protocols.encodeAdalight(new Uint8Array(4)));
assert.throws(()=>protocols.encodeDdp(new Uint8Array(3),{maxPayload:4}));
assert(!load('index.html').includes('function drawPixelAnimation('),'Drawing runtime must not be embedded in HTML');
console.log('PASS: '+exactHistorical+' exact historical hashes; '+captureJitter+' historical hashes matched with documented <=1ms capture jitter; '+baseline.frames.length+' deterministic repeat checks.');
console.log('PASS: '+count+' browser/Node frames; '+packetCases+' DDP cases and Adalight equivalence.');
