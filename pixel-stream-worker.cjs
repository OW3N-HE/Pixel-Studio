'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {performance}=require('node:perf_hooks');
const createRenderer=require('./pixel-headless-renderer.cjs');
const createOutputTransport=require('./pixel-output-transports.cjs');
const createTimeline=require('./pixel-browser-playback.cjs').createTimeline;
const renderer=createRenderer();
const config=workerData;
if(!renderer.modes.includes(config.mode))throw new Error('Unknown animation: '+config.mode);
const transport=config.transport==='usb'?'usb':'ddp';
const output=createOutputTransport({...config,transport},fatal);
function perceptualLut(brightness){
  const gain=Math.max(0,Math.min(255,Number(brightness)??255))/255;
  return Uint8Array.from({length:256},(_,i)=>Math.round(i*gain));
}
let lut=config.lut?Uint8Array.from(config.lut):perceptualLut(config.brightness??255);
let interval=1000/config.fps;
const started=performance.now();
const animationClock=createTimeline(()=>performance.now());
animationClock.setSpeed(config.speed);
animationClock.synchronize(config.animationTime,config.animationWallTime);
let next=started,timer=null,stopped=false;
let frames=0,missed=0,bytes=0,sampleAt=started,sampleFrames=0,sampleBytes=0,totalMs=0,sampleCount=0,outputFrameAt=0;


function stop(){
  if(stopped)return;
  stopped=true;clearTimeout(timer);output.stop();parentPort.close();
}
function fatal(error){if(stopped)return;parentPort.postMessage({type:'error',message:error.message});stop();}
parentPort.on('message',message=>{
  if(message.type==='stop'){stop();return;}
  if(message.type==='temperature'){config.temperatureSample=message.sample;return;}
  if(message.type!=='update'||!message.config)return;
  const nextConfig=message.config;
  if(!renderer.modes.includes(nextConfig.mode)){fatal(new Error('Unknown animation: '+nextConfig.mode));return;}
  if(nextConfig.speed!==undefined)animationClock.setSpeed(nextConfig.speed);
  animationClock.synchronize(nextConfig.animationTime,nextConfig.animationWallTime);
  for(const key of ['mode','mapping','clockFont','clockPalette','speed','brightness','fps','thermal']){
    if(nextConfig[key]!==undefined)config[key]=nextConfig[key];
  }
  interval=1000/Math.max(1,Math.min(60,Number(config.fps)||60));
  lut=nextConfig.lut?Uint8Array.from(nextConfig.lut):perceptualLut(config.brightness??255);
  next=performance.now();
  parentPort.postMessage({type:'updated',mode:config.mode});
});




async function tick(){
  if(stopped)return;
  const now=performance.now();
  if(now+0.05<next){timer=setTimeout(tick,Math.max(1,next-now));return;}
  // Advance on a fixed time grid. Missed deadlines are dropped, never replayed in a burst.
  const skipped=Math.max(0,Math.floor((now-next)/interval));
  missed+=skipped;next+=(skipped+1)*interval;
  try{
    const rgb=renderer.render(config.mode,config.w,config.h,animationClock.getTime(),config.mapping,config.clockFont,config.clockPalette,config.thermal,config.temperatureSample);
    bytes+=await output.send(rgb,lut);
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
  try{await output.start();if(stopped)return;parentPort.postMessage({type:'ready',targetFps:config.fps,transport});void tick();}
  catch(error){fatal(error);}
}
void boot();
