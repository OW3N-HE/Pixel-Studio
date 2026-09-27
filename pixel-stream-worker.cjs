'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {performance}=require('node:perf_hooks');
const dgram=require('node:dgram');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const createRenderer=require('./pixel-headless-renderer.cjs');
const renderer=createRenderer();
const config=workerData;
if(!renderer.modes.includes(config.mode))throw new Error('Unknown animation: '+config.mode);
const transport=config.transport==='usb'?'usb':'ddp';
const socket=transport==='ddp'?dgram.createSocket('udp4'):null;
function perceptualLut(brightness){
  const gain=Math.pow(Math.max(0,Math.min(255,Number(brightness)??255))/255,2.2);
  return Uint8Array.from({length:256},(_,i)=>Math.round(i*gain));
}
let lut=config.lut?Uint8Array.from(config.lut):perceptualLut(config.brightness??255);
let interval=1000/config.fps;
const started=performance.now();
let next=started,sequence=0,timer=null,stopped=false;
let frames=0,missed=0,bytes=0,sampleAt=started,sampleFrames=0,sampleBytes=0,totalMs=0,sampleCount=0,outputFrameAt=0;
let usbProcess=null;
let usbAckWaiters=[];

function stop(){
  stopped=true;clearTimeout(timer);
  try{socket?.close();}catch{}
  for(const waiter of usbAckWaiters.splice(0))waiter.reject(new Error('USB writer stopped.'));
  if(usbProcess){try{usbProcess.stdin.end();}catch{} setTimeout(()=>{try{usbProcess?.kill();}catch{}},350).unref();usbProcess=null;}
}
function fatal(error){if(stopped)return;parentPort.postMessage({type:'error',message:error.message});stop();}
socket?.on('error',fatal);
parentPort.on('message',message=>{
  if(message.type==='stop'){stop();return;}
  if(message.type!=='update'||!message.config)return;
  const nextConfig=message.config;
  if(!renderer.modes.includes(nextConfig.mode)){fatal(new Error('Unknown animation: '+nextConfig.mode));return;}
  for(const key of ['mode','mapping','clockFont','clockPalette','speed','brightness','fps']){
    if(nextConfig[key]!==undefined)config[key]=nextConfig[key];
  }
  interval=1000/Math.max(1,Math.min(60,Number(config.fps)||60));
  lut=nextConfig.lut?Uint8Array.from(nextConfig.lut):perceptualLut(config.brightness??255);
  next=performance.now();
  parentPort.postMessage({type:'updated',mode:config.mode});
});
function startUsb(){
  return new Promise((resolve,reject)=>{
    const bundled=path.join(__dirname,'.venv-platformio','Scripts','python.exe');
    const python=process.env.PIXEL_STUDIO_PYTHON||(fs.existsSync(bundled)?bundled:'python');
    const script=path.join(__dirname,'tools','usb_adalight_stream.py');
    const child=spawn(python,[script,'--port',config.serialPort,'--pixels',String(config.w*config.h)],{
      cwd:__dirname,windowsHide:true,stdio:['pipe','pipe','pipe']
    });
    usbProcess=child;
    let settled=false,stdout='',stderr='';
    const timeout=setTimeout(()=>finish(new Error('USB port did not become ready in time.')),10000);
    function finish(error){
      if(settled)return;settled=true;clearTimeout(timeout);
      if(error){try{child.kill();}catch{} reject(error);}else resolve();
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-2048);});
    child.stdout.on('data',chunk=>{
      stdout+=chunk;
      for(;;){const end=stdout.indexOf('\n');if(end<0)break;const line=stdout.slice(0,end);stdout=stdout.slice(end+1);
        try{
          const message=JSON.parse(line);
          if(message.type==='ready')finish();
          else if(message.type==='frame'){const waiter=usbAckWaiters.shift();if(waiter)waiter.resolve();}
          else if(message.type==='error'){
            const error=new Error(message.message);
            if(settled)fatal(error);else finish(error);
          }
        }catch{}
      }
    });
    child.on('error',finish);
    child.on('exit',code=>{
      for(const waiter of usbAckWaiters.splice(0))waiter.reject(new Error('USB writer exited.'));
      if(!settled)finish(new Error(stderr||('USB writer exited with code '+code)));
      else if(!stopped)fatal(new Error(stderr||'USB writer stopped unexpectedly.'));
    });
  });
}
function writeUsb(packet){
  return new Promise((resolve,reject)=>{
    if(!usbProcess||!usbProcess.stdin.writable)return reject(new Error('USB writer is not available.'));
    const timer=setTimeout(()=>{
      const index=usbAckWaiters.indexOf(waiter);if(index>=0)usbAckWaiters.splice(index,1);
      reject(new Error('USB frame acknowledgement timed out.'));
    },2500);
    const waiter={
      resolve:()=>{clearTimeout(timer);resolve();},
      reject:error=>{clearTimeout(timer);reject(error);}
    };
    usbAckWaiters.push(waiter);
    usbProcess.stdin.write(packet,error=>{
      if(!error)return;
      const index=usbAckWaiters.indexOf(waiter);if(index>=0)usbAckWaiters.splice(index,1);
      waiter.reject(error);
    });
  });
}
async function sendDdp(rgb){
  for(let offset=0;offset<rgb.length;offset+=1440){
    if(stopped)return;
    const count=Math.min(1440,rgb.length-offset),packet=Buffer.allocUnsafe(10+count);
    packet[0]=0x40|(offset+count===rgb.length?1:0);
    sequence=sequence%15+1;packet[1]=sequence;packet[2]=0x0b;packet[3]=1;
    packet.writeUInt32BE(offset,4);packet.writeUInt16BE(count,8);
    for(let i=0;i<count;i++)packet[10+i]=lut[rgb[offset+i]];
    await new Promise((resolve,reject)=>socket.send(packet,4048,config.host,error=>error?reject(error):resolve()));
    bytes+=packet.length;
  }
}
async function sendUsb(rgb){
  const count=config.w*config.h-1,packet=Buffer.allocUnsafe(6+rgb.length);
  packet[0]=0x41;packet[1]=0x64;packet[2]=0x61;packet[3]=(count>>8)&255;packet[4]=count&255;packet[5]=packet[3]^packet[4]^0x55;
  for(let i=0;i<rgb.length;i++)packet[6+i]=lut[rgb[i]];
  await writeUsb(packet);bytes+=packet.length;
}
async function tick(){
  if(stopped)return;
  const now=performance.now();
  if(now+0.05<next){timer=setTimeout(tick,Math.max(1,next-now));return;}
  // Advance on a fixed time grid. Missed deadlines are dropped, never replayed in a burst.
  const skipped=Math.max(0,Math.floor((now-next)/interval));
  missed+=skipped;next+=(skipped+1)*interval;
  try{
    const rgb=renderer.render(config.mode,config.w,config.h,(now-started)/1000*config.speed,config.mapping,config.clockFont,config.clockPalette);
    if(transport==='usb')await sendUsb(rgb);else await sendDdp(rgb);
    frames++;totalMs+=performance.now()-now;sampleCount++;
    const finished=performance.now();
    if(finished-outputFrameAt>=80){
      parentPort.postMessage({type:'outputFrame',w:config.w,h:config.h,
        rgb:Buffer.from(rgb).toString('base64'),transport});
      outputFrameAt=finished;
    }
    if(finished-sampleAt>=1000){
      const seconds=(finished-sampleAt)/1000;
      parentPort.postMessage({type:'stats',stats:{targetFps:config.fps,fps:(frames-sampleFrames)/seconds,
        kbps:(bytes-sampleBytes)/seconds/1024,frameMs:totalMs/Math.max(1,sampleCount),frames,missed,
        uptime:(finished-started)/1000,mode:config.mode,transport}});
      sampleAt=finished;sampleFrames=frames;sampleBytes=bytes;totalMs=0;sampleCount=0;
    }
  }catch(error){fatal(error);return;}
  if(!stopped)timer=setTimeout(tick,Math.max(0,next-performance.now()));
}
async function boot(){
  try{if(transport==='usb')await startUsb();if(stopped)return;parentPort.postMessage({type:'ready',targetFps:config.fps,transport});void tick();}
  catch(error){fatal(error);}
}
void boot();
