'use strict';
// Connection lifecycle only. Rendering, sampling and playback scheduling belong to callers.
const dgram=require('node:dgram');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const protocols=require('./pixel-output-protocols.cjs');
module.exports=function createOutputTransport(config,onError){
 const kind=config.transport || 'ddp';
 if(!['usb','ddp'].includes(kind))throw new Error('Unsupported output transport: '+kind);
 const socket=kind==='ddp'?dgram.createSocket('udp4'):null;
 let stopped=false,started=false,starting=null,sending=false,sequence=0,bytes=0,lut;
 let usbProcess=null,usbAckWaiters=[];
 function fatal(error){if(!stopped)onError(error);}
 socket?.on('error',fatal);
 function stop(){
  if(stopped)return;stopped=true;
  try{socket?.close();}catch{}
  for(const waiter of usbAckWaiters.splice(0))waiter.reject(new Error('USB writer stopped.'));
  if(usbProcess){const child=usbProcess;usbProcess=null;try{child.stdin.end();}catch{}
   const killTimer=setTimeout(()=>{try{child.kill();}catch{}},350);
   child.once('exit',()=>clearTimeout(killTimer));}
 }
function startUsb(){
  return new Promise((resolve,reject)=>{
    const writer=process.env.PIXEL_STUDIO_SERIAL_WRITER||path.join(__dirname,'openrgb-plugin','dist','PixelStudioSerial.exe');
    if(!path.isAbsolute(writer)||!fs.existsSync(writer)){
      reject(new Error('Native USB writer missing: build or install openrgb-plugin/dist/PixelStudioSerial.exe.'));return;
    }
    const child=spawn(writer,['--port',config.serialPort,'--pixels',String(config.w*config.h)],{
      cwd:__dirname,windowsHide:true,stdio:['pipe','pipe','pipe']
    });
    usbProcess=child;
    child.stdin.on('error',error=>{if(!stopped){if(settled)fatal(error);else finish(error);}});
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
      // An exited child must not receive another delayed shutdown timer.
      if(usbProcess===child)usbProcess=null;
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
 const encoded=protocols.encodeDdp(rgb,{lut,sequence});
 for(const packet of encoded.packets){
  if(stopped)return;sequence=packet[1];
  await new Promise((resolve,reject)=>socket.send(packet,4048,config.host,error=>error?reject(error):resolve()));bytes+=packet.length;
 }
}

async function sendUsb(rgb){
 const packet=protocols.encodeAdalight(rgb,lut);
 await writeUsb(packet);bytes+=packet.length;
}
 function start(){
  if(stopped)return Promise.reject(new Error('Output transport stopped.'));
  if(starting)return starting;
  starting=(async()=>{
   try{if(kind==='usb')await startUsb();if(stopped)throw new Error('Output transport stopped.');started=true;}
   catch(error){stop();throw error;}
  })();
  return starting;
 }
 async function send(rgb,colorLut){
  if(stopped||!started)throw new Error('Output transport is not ready.');
  if(sending)throw new Error('Concurrent output frames are not supported.');
  sending=true;lut=colorLut;const before=bytes;
  try{if(kind==='usb')await sendUsb(rgb);else await sendDdp(rgb);return bytes-before;}
  finally{sending=false;}
 }
 return Object.freeze({kind,start,send,stop});
};
