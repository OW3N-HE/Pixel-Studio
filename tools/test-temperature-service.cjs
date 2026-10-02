'use strict';
// Tests private stdio fallback only, not Windows service/PawnIO/hardware access.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const timers=new Map(),children=[];let timerId=0,now=100000;
const moduleScope={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','pixel-temperature-service.cjs'),'utf8'),{
  module:moduleScope,exports:moduleScope.exports,__dirname:path.resolve(__dirname,'..'),Buffer,process:{env:{},platform:'win32'},
  setTimeout:(fn,ms)=>{const timer={id:++timerId,fn,ms,unref(){}};timers.set(timer.id,timer);return timer;},clearTimeout:timer=>{if(timer)timers.delete(timer.id);},
  require:name=>name==='node:path'?path:name==='node:fs'?{existsSync:()=>true}:name==='node:child_process'?{}:name==='node:net'?{}:null
},{filename:'pixel-temperature-service.cjs'});
function spawn(){
  const child=new EventEmitter();child.stdin=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();
  child.stdout.setEncoding=()=>{};child.stdin.write=value=>{child.writes.push(value);};child.stdin.end=()=>{child.ended=true;};child.kill=()=>{child.killed=true;child.emit('exit',0);};child.writes=[];children.push(child);return child;
}
const reading=(id,brand,temperature)=>({id,name:id,sensor:id,brand,temperature});
async function run(){
  const service=moduleScope.exports({spawn,exists:()=>true,now:()=>now});
  const pending=service.sample();assert.equal(service.sample(),pending);assert.equal(children.length,1);
  const child=children[0],sample={status:'ready',sampledAt:now,cpu:reading('cpu','amd',61),gpu:reading('gpu','nvidia',42),cpuSensors:[],gpuSensors:[]};
  child.stdout.emit('data',JSON.stringify(sample)+'\n');const result=await pending;assert.equal(result.status,'ready');assert.equal(result.cpu.temperature,61);
  await service.sample();assert.equal(child.writes.length,1,'Fresh-cache read restarted sampling');
  now+=1000;const next=service.sample();assert.equal(children.length,1,'Repeated sample restarted collector');child.stdout.emit('data',JSON.stringify({...sample,sampledAt:now})+'\n');assert.equal((await next).status,'ready');
  now+=1000;const stale=service.sample();child.stdout.emit('data',JSON.stringify({...sample,sampledAt:now-6000})+'\n');assert.equal((await stale).status,'unavailable','Old reading must not look fresh');
  service.stop();assert(child.ended);assert.equal((await service.sample()).status,'closed');
  for(const [id,timer]of [...timers])if(timer.ms===2000){timers.delete(id);timer.fn();}
  assert.equal(timers.size,0);assert(child.killed);
  const missing=moduleScope.exports({spawn,exists:()=>false,now:()=>now});assert.equal((await missing.sample()).status,'missing');missing.stop();
  console.log('PASS: stdio sampler coalescing, fresh cache, repeated requests without restart, stale rejection, missing collector and owned-child cleanup. Broker/PawnIO not exercised.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
