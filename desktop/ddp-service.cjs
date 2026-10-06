'use strict';
const {utilityProcess}=require('electron');
const path=require('node:path');
module.exports=function createDdpService(webRoot){
  let child=null,ready=null,endpoint=null,closing=false;
  function ensure(){
    if(closing)return Promise.reject(new Error('DDP service is shutting down'));
    if(ready)return ready;
    ready=new Promise((resolve,reject)=>{
      const worker=utilityProcess.fork(path.join(webRoot,'pixel-ddp-bridge.cjs'),[],{
        cwd:webRoot,env:{...process.env,PIXEL_STUDIO_BRIDGE_PORT:'0',PIXEL_STUDIO_SENSOR_CHANNEL:'Desktop'},serviceName:'Pixel Studio DDP',stdio:'ignore'
      });
      child=worker;
      const timer=setTimeout(()=>{reject(new Error('DDP service startup timed out'));worker.kill();},12000);
      worker.on('message',message=>{
        if(message?.type!=='pixel-ddp-ready')return;
        if(!Number.isInteger(message.port)||message.port<1||message.port>65535||!/^[a-f0-9]{64}$/.test(message.token))return;
        endpoint={origin:'http://127.0.0.1:'+message.port,token:message.token};clearTimeout(timer);resolve();
      });
      worker.once('exit',()=>{
        clearTimeout(timer);if(child===worker){child=null;ready=null;endpoint=null;}
        reject(new Error('DDP service stopped. Retry to restart it.'));
      });
    });
    ready=ready.catch(error=>{ready=null;throw error;});return ready;
  }
  async function request(route,options={}){
    if(typeof route!=='string'||route.length>1024||!/^\/api\/(device|temperature|start|update|stats|frame|stop)(?:\?|$)/.test(route))throw new Error('Unsupported DDP command');
    const parsed=new URL(route,'http://127.0.0.1');
    const read=parsed.pathname==='/api/device'||parsed.pathname==='/api/stats'||parsed.pathname==='/api/temperature';
    let body;
    if(parsed.pathname==='/api/frame'){
      if(!Array.isArray(options.binary)||options.binary.length>12288||!options.binary.every(n=>Number.isInteger(n)&&n>=0&&n<=255))throw new Error('Invalid pixel frame');
      body=Buffer.from(options.binary);
    }else if(!read){body=JSON.stringify(options.json||{});if(Buffer.byteLength(body)>4096)throw new Error('DDP command is too large');}
    const failure=(status,code,error,retryable=false)=>({
      status,body:JSON.stringify({error,code,source:'bridge',retryable,route:parsed.pathname})
    });
    // Session IDs belong to one utility process. Do not revive a lost session.
    const sessionCommand=['/api/stats','/api/update','/api/frame'].includes(parsed.pathname);
    if(sessionCommand&&(!child||!endpoint))return failure(409,'SESSION_LOST','DDP service exited; the session is no longer available');
    if(parsed.pathname==='/api/stop'&&(!child||!endpoint))return {status:200,body:'{"stopped":true}'};
    try{await ensure();}catch(error){return failure(503,'BRIDGE_UNAVAILABLE',error.message);}
    const current=endpoint,worker=child;
    try{
      const response=await fetch(current.origin+route,{
        method:read?'GET':'POST',redirect:'error',headers:{'X-Pixel-Token':current.token,...(typeof body==='string'?{'Content-Type':'application/json'}:{})},
        body,signal:AbortSignal.timeout(Math.max(1000,Math.min(25000,Number(options.timeout)||6000)))
      });
      const text=await response.text();
      if(sessionCommand&&(endpoint!==current||child!==worker))return failure(409,'SESSION_LOST','DDP service changed during the request');
      const headers={};
      for(const name of ['X-Pixel-Dropped','X-Pixel-Send-Ms']){
        const value=response.headers.get(name);if(value!==null)headers[name]=value;
      }
      return {status:response.status,body:text,headers};
    }catch(error){
      if(endpoint!==current||child!==worker)return failure(409,'SESSION_LOST','DDP service exited during the request');
      const code=error.cause?.code||error.code;
      const timeout=error.name==='TimeoutError'||error.name==='AbortError'||code==='ETIMEDOUT';
      const transient=timeout||['ECONNRESET','EPIPE','EAGAIN'].includes(code);
      return failure(timeout?504:503,timeout?'BRIDGE_TIMEOUT':'BRIDGE_UNAVAILABLE',error.message,transient);
    }
  }
  async function stop(){
    closing=true;const worker=child;if(!worker)return;
    await new Promise(resolve=>{
      const timer=setTimeout(()=>{worker.kill();resolve();},5500);
      worker.once('exit',()=>{clearTimeout(timer);resolve();});
      try{worker.postMessage({type:'pixel-ddp-stop'});}catch{clearTimeout(timer);worker.kill();resolve();}
    });
  }
  return {ensure,request,stop,get active(){return !!child;}};
};
