'use strict';
// Fake renderer, transport and time. No sensors, sockets, processes or devices.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
const source=fs.readFileSync(path.join(__dirname,'..','pixel-stream-worker.cjs'),'utf8');
async function run(){
  let now=0,starts=0,stops=0,closed=0,nextTimer=0;
  const timers=new Map(),renders=[],sent=[],messages=[];
  const parent=new EventEmitter();parent.postMessage=value=>messages.push(value);parent.close=()=>closed++;
  const modes=['thermal_icons','clock','fire','wave'];
  const sample={status:'ready',sampledAt:1000,cpu:{temperature:61},gpu:{temperature:42}};
  const config={transport:'usb',mode:'thermal_icons',w:15,h:27,fps:60,speed:1,brightness:255,mapping:'rows',thermal:{sampleSeconds:1},temperatureSample:sample};
  vm.runInNewContext(source,{Buffer,Uint8Array,
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
    require:name=>{
      if(name==='node:worker_threads')return {parentPort:parent,workerData:config};
      if(name==='node:perf_hooks')return {performance:{now:()=>now}};
      if(name==='./pixel-browser-playback.cjs')return require('../pixel-browser-playback.cjs');
      if(name==='./pixel-headless-renderer.cjs')return ()=>({modes,render:(...args)=>{renders.push(args);return new Uint8Array(1215);}});
      if(name==='./pixel-output-transports.cjs')return ()=>({start:async()=>{starts++;},stop:()=>{stops++;},send:async(rgb,lut)=>{sent.push({rgb,lut});return rgb.length+6;}});
      throw Error('Unexpected dependency '+name);
    }},{filename:'pixel-stream-worker.cjs'});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
  assert.equal(starts,1);assert.equal(renders.length,1);
  for(let i=0;i<100;i++){
    const mode=modes[i%modes.length];parent.emit('message',{type:'update',config:{mode,fps:60,speed:1}});
    if(i===50)parent.emit('message',{type:'temperature',sample});
    now+=20;
    const entry=timers.entries().next().value;assert(entry,'Worker timer missing');timers.delete(entry[0]);entry[1].fn();await flush();
    assert.equal(renders.at(-1)[0],mode);assert.equal(renders.at(-1)[8],sample,'Animation update lost sample');
  }
  assert.equal(starts,1,'Animation updates restarted transport');assert.equal(stops,0);
  assert.equal(renders.length,101);assert.equal(sent.length,101);
  assert(messages.some(message=>message.type==='ready'),'Worker readiness must still be reported');
  const stats=messages.filter(message=>message.type==='stats');
  assert(stats.length>0,'Removing unused frame telemetry must preserve output statistics');
  assert(stats.every(message=>message.stats.frames>0&&Number.isFinite(message.stats.fps)&&message.stats.targetFps===60));
  assert(!messages.some(message=>message.type==='error'),'Worker must not fail while outputting frames');
  assert(!messages.some(message=>message.type==='outputFrame'),'Unused frame telemetry must not be emitted');
  parent.emit('message',{type:'stop'});parent.emit('message',{type:'stop'});
  assert.equal(stops,1);assert.equal(closed,1);assert.equal(timers.size,0);
  console.log('PASS: 100 fast animation updates retained sample and connection; 101 output frames; readiness/statistics preserved without unused frame telemetry; single start and idempotent stop.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
