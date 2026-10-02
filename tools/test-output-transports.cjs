'use strict';
// Fake sockets, processes and timers: never opens a serial port or network socket.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
const protocols=require('../pixel-output-protocols.cjs');
const source=fs.readFileSync(path.join(__dirname,'..','pixel-output-transports.cjs'),'utf8');
function harness({exists=true}={}){
  const timers=new Map(),errors=[],children=[],packets=[];let nextTimer=0,closes=0;
  const socket=new EventEmitter();socket.send=(packet,port,host,cb)=>{packets.push({packet:Buffer.from(packet),port,host});socket.pending?socket.pending.push(cb):cb(socket.failure);};
  socket.close=()=>{closes++;};
  function spawn(file,args,options){
    const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
    child.stdout.setEncoding=child.stderr.setEncoding=()=>{};child.stdin.writable=true;child.writes=[];
    child.stdin.write=(packet,cb)=>{child.writes.push(Buffer.from(packet));cb(child.writeError);};
    child.stdin.end=()=>{child.ended=true;};child.kill=()=>{child.killed=true;child.emit('exit',0);};
    children.push({child,file,args,options});return child;
  }
  const module={exports:{}};
  vm.runInNewContext(source,{module,exports:module.exports,__dirname:path.resolve(__dirname,'..'),process:{env:{}},Buffer,
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
    require:name=>{
      if(name==='node:dgram')return {createSocket:()=>socket};
      if(name==='node:child_process')return {spawn};
      if(name==='node:fs')return {existsSync:()=>exists};
      if(name==='node:path')return path;
      if(name==='./pixel-output-protocols.cjs')return protocols;
      throw Error('Unexpected dependency '+name);
    }},{filename:'pixel-output-transports.cjs'});
  const factory=config=>module.exports(config,error=>errors.push(error));
  const fire=ms=>{const entry=[...timers].find(([,t])=>t.ms===ms);assert(entry,'Expected timeout '+ms);timers.delete(entry[0]);entry[1].fn();};
  return {factory,socket,children,packets,errors,timers,fire,get closes(){return closes;}};
}
const usbConfig={transport:'usb',serialPort:'COM7',w:15,h:27};
const rgb=Uint8Array.from({length:1215},(_,i)=>i%256),lut=Uint8Array.from({length:256},(_,i)=>i);
async function run(){
  {
    const h=harness(),out=h.factory({transport:'ddp',host:'test.invalid'});
    assert.equal(out.start(),out.start());await out.start();
    assert.equal(await out.send(rgb,lut),1225);assert.equal(h.packets[0].port,4048);assert.equal(h.packets[0].host,'test.invalid');
    assert.deepEqual(h.packets[0].packet,Buffer.from(protocols.encodeDdp(rgb,{lut}).packets[0]));
    await out.send(rgb,lut);assert.equal(h.packets[1].packet[1],2);
    h.socket.pending=[];const pending=out.send(rgb,lut);await assert.rejects(out.send(rgb,lut),/Concurrent/);
    h.socket.pending.shift()();await pending;
    out.stop();out.stop();assert.equal(h.closes,1);await assert.rejects(out.start(),/stopped/);await assert.rejects(out.send(rgb,lut),/not ready/);
  }
  {
    const h=harness(),out=h.factory({transport:'ddp',host:'test.invalid'});await out.start();h.socket.failure=Error('Network failure');
    await assert.rejects(out.send(rgb,lut),/Network failure/);out.stop();
  }
  {
    const h=harness(),out=h.factory(usbConfig),starting=out.start();assert.equal(starting,out.start());assert.equal(h.children.length,1);
    const {child,args,options}=h.children[0];assert.equal(options.windowsHide,true);assert.deepEqual(Array.from(args),['--port','COM7','--pixels','405']);
    child.stdout.emit('data','{"type":"rea');child.stdout.emit('data','dy"}\n');await starting;
    const sent=out.send(rgb,lut);await assert.rejects(out.send(rgb,lut),/Concurrent/);
    assert.deepEqual(child.writes[0],Buffer.from(protocols.encodeAdalight(rgb,lut)));child.stdout.emit('data','{"type":"frame"}\n');assert.equal(await sent,1221);
    const pending=out.send(rgb,lut);const rejected=assert.rejects(pending,/stopped/);out.stop();out.stop();await rejected;
    assert(child.ended);h.fire(350);assert(child.killed);assert.equal(h.timers.size,0);
  }
  {
    const h=harness({exists:false}),out=h.factory(usbConfig);await assert.rejects(out.start(),/missing/);assert.equal(h.children.length,0);assert.equal(h.timers.size,0);
  }
  {
    const h=harness(),out=h.factory(usbConfig),p=out.start(),rejected=assert.rejects(p,/ready in time/);h.fire(10000);await rejected;
    assert(h.children[0].child.killed);assert.equal(h.timers.size,0);
  }
  {
    const h=harness(),out=h.factory(usbConfig),p=out.start(),rejected=assert.rejects(p,/stopped|exited/);out.stop();h.fire(350);await rejected;assert.equal(h.timers.size,0);
  }
  {
    const h=harness(),out=h.factory(usbConfig),p=out.start();const child=h.children[0].child;child.stdout.emit('data','{"type":"ready"}\n');await p;
    const pending=out.send(rgb,lut),rejected=assert.rejects(pending,/timed out/);h.fire(2500);await rejected;
    out.stop();h.fire(350);assert.equal(h.timers.size,0);
  }
  {
    const h=harness(),out=h.factory(usbConfig),p=out.start();const child=h.children[0].child;child.stdout.emit('data','{"type":"ready"}\n');await p;
    const pending=out.send(rgb,lut),rejected=assert.rejects(pending,/exited/);child.emit('exit',1);await rejected;assert.equal(h.errors.length,1);out.stop();assert.equal(h.timers.size,0);
  }
  console.log('PASS: DDP packet/sequence/error checks; USB readiness, split JSON, serial acknowledgement, timeout and cancellation; fake resource cleanup.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
