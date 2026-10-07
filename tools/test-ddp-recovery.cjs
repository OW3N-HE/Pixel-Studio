'use strict';
// All HTTP, IPC, sockets, workers and clocks below are fakes. No device access.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const root=path.resolve(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
const ok=(value={},status=200,headers={})=>({ok:true,status,body:status===204?'':JSON.stringify(value),headers});
const timeout=()=>ok({error:'The operation was aborted due to timeout',source:'bridge',code:'BRIDGE_TIMEOUT',retryable:true},504);
function fixture(mode='wave'){
  let now=0,id=0;const timers=new Map(),calls=[],logs=[],nodes=new Map(),handlers={};
  const element=()=>({value:'',dataset:{},children:[],ownText:'',
    get textContent(){return this.ownText+this.children.map(child=>child.textContent).join('');},
    set textContent(value){this.ownText=String(value);this.children=[];},
    replaceChildren(...children){this.ownText='';this.children=children;},
    classList:{add(){},remove(){}},addEventListener(){},setAttribute(){}});
  const node=name=>{
    if(!nodes.has(name))nodes.set(name,element());
    return nodes.get(name);
  };
  const state={running:true,animationSpeed:1,animationElapsed:0,animationLastTime:0};
  const f={mode,handlers,calls,logs,nodes,timers,state,node,setNow:n=>now=n};
  const window={document:{documentElement:{lang:'en'},querySelector:()=>null,getElementById:node,createElement:element,createTextNode:text=>({textContent:text})},navigator:{},
    performance:{now:()=>now},TextEncoder,TextDecoder,URL,AbortController,Response,crypto:{randomUUID:()=> 'mock-client-0000000000'},
    addEventListener(){},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key),
    setInterval(fn,ms){timers.set(++id,{fn,ms});return id;},clearInterval:key=>timers.delete(key),
    fetch:async()=>{throw Error('Real network is forbidden');},
    pixelStudioDesktop:{ddpRequest:async(route,options)=>{
      const key=route.split('?')[0];calls.push({route:key,options});
      if(handlers[key])return handlers[key](options);
      if(key==='/api/start')return ok({id:'mock-session',autonomous:f.mode!=='file',packetCount:1,targetFps:60});
      if(key==='/api/stats')return ok({frames:60,fps:60,targetFps:60,kbps:1,frameMs:0.2,missed:0});
      if(key==='/api/update')return ok({updated:true});
      if(key==='/api/frame')return ok({},204);
      if(key==='/api/stop')return ok({stopped:true});
      throw Error('Unexpected route '+route);
    }}
  };
  const ui=Object.fromEntries(['controlMode','protocol','wledHost','fps','mapping','animationMode'].map(k=>[k,node(k)]));
  Object.assign(ui.controlMode,{value:'ddp'});ui.wledHost.value='http://192.168.1.100';ui.fps.value='60';
  node('colorMode').value='match';node('colorGamma').value='2.8';node('clockFont').value='rounded';node('clockPalette').value='original';
  const output=require('../pixel-browser-output.cjs')({window,ui,playback:state,animationCatalog:{wave:[],fire:[],clock:[]},
    getFrameConfig:()=>({w:1,h:1,d:255}),getAnimationMode:()=>f.mode,withNum:(v,n)=>Number(v)||n,
    setStatus(){},logLine:message=>logs.push(message),stopLoop(){throw Error('Adapter must report fatal errors to playback');},stopBtn(){}});
  return Object.assign(f,{window,ui,output});
}
async function adapterTests(){
  {
    const f=fixture(),session=await f.output.ensureDdpSession();
    f.handlers['/api/stats']=timeout;
    for(let i=0;i<12;i++){f.setNow(i*3500);await f.output.sendFrameDdp(new Uint8Array(3));}
    assert.equal(f.output.state.outputNotice.phase,'uncertain');
    assert.equal(f.node('streamStats').children[1].dataset.state,'pending');
    assert.equal(f.calls.filter(x=>x.route==='/api/start').length,1);
    assert.equal(f.calls.filter(x=>x.route==='/api/stop').length,0,'Telemetry timeouts must not stop the worker');
    assert.equal(f.logs.filter(x=>x.includes('[DDP stats]')).length,1,'Repeated timeouts must not flood logs');
    delete f.handlers['/api/stats'];f.setNow(45000);await f.output.updateBackgroundStats(session);
    assert.equal(f.output.state.outputNotice,null);
    assert.equal(f.node('streamStats').textContent,'DDP  60.0 / 60 FPS');
    assert.match(f.node('streamStats').title,/not confirmed screen FPS/);
    assert.equal(f.node('streamStats').children[1].dataset.state,'ready');
    f.handlers['/api/stats']=()=>ok({error:'Worker failed',source:'worker',code:'WORKER_FAILED',retryable:false},502);
    f.setNow(47000);await assert.rejects(f.output.updateBackgroundStats(session),e=>e.code==='WORKER_FAILED');
  }
  {
    const f=fixture(),session=await f.output.ensureDdpSession(),old=session.key;
    f.mode='fire';f.handlers['/api/update']=timeout;
    await f.output.ensureDdpSession();assert.equal(session.key,old);assert.equal(f.output.state.outputNotice.phase,'sending');
    f.mode='clock';delete f.handlers['/api/update'];f.setNow(1000);
    await f.output.ensureDdpSession();assert.equal(f.calls.filter(x=>x.route==='/api/update').at(-1).options.json.mode,'clock');
    assert.equal(f.output.state.outputNotice,null);assert.equal(f.calls.filter(x=>x.route==='/api/start').length,1);
    assert(!f.node('streamStats').textContent.includes('切换'),'Configuration updates must not write switch announcements');
    f.mode='fire';f.handlers['/api/update']=timeout;await f.output.ensureDdpSession();
    f.setNow(12000);await assert.rejects(f.output.ensureDdpSession(),e=>e.code==='BRIDGE_TIMEOUT');
  }
  {
    const f=fixture();await f.output.ensureDdpSession();f.mode='fire';
    const gate=deferred();f.handlers['/api/update']=()=>gate.promise;
    const pending=f.output.ensureDdpSession();await flush();f.output.stopOutput();gate.resolve(ok({updated:true}));
    assert.equal(await pending,null);assert.equal(f.output.state.outputNotice,null);
    await flush();assert.equal(f.calls.filter(x=>x.route==='/api/start').length,1);
    assert.equal(f.calls.filter(x=>x.route==='/api/stop').length,1);
  }
  {
    const f=fixture(),gate=deferred();f.handlers['/api/start']=()=>gate.promise;
    const pending=f.output.ensureDdpSession();await flush();f.output.stopOutput();
    gate.resolve(ok({id:'late-session',autonomous:true,packetCount:1,targetFps:60}));
    assert.equal(await pending,null);assert.equal(f.calls.at(-1).options.json.id,'late-session');
  }
  {
    const f=fixture(),session=await f.output.ensureDdpSession(),gate=deferred();
    f.handlers['/api/stats']=()=>gate.promise;
    const pending=f.output.updateBackgroundStats(session);await flush();f.output.stopOutput();
    f.node('streamStats').textContent='Stopped';
    gate.resolve(timeout());await pending;
    assert.equal(f.output.state.outputNotice,null);assert.equal(f.node('streamStats').textContent,'Stopped');
  }
  {
    const f=fixture('file');await f.output.ensureDdpSession();
    f.handlers['/api/frame']=()=>ok({},204,{'X-Pixel-Dropped':'1'});
    await f.output.sendFrameDdp(Uint8Array.of(1,2,3));
    assert.equal(f.output.state.statsWindow.frames,0);
    assert.equal(f.output.state.outputNotice.phase,'recovering');
    f.setNow(300);delete f.handlers['/api/frame'];
    await f.output.sendFrameDdp(Uint8Array.of(4,5,6));
    assert.deepEqual(f.calls.filter(x=>x.route==='/api/frame').at(-1).options.binary,[4,5,6],'Retry sends a fresh frame');
    assert.equal(f.output.state.outputNotice,null);assert.equal(f.output.state.statsWindow.frames,1);
    f.handlers['/api/frame']=timeout;await f.output.sendFrameDdp(new Uint8Array(3));
    f.setNow(6000);await assert.rejects(f.output.sendFrameDdp(new Uint8Array(3)),e=>e.code==='BRIDGE_TIMEOUT');
  }
  {
    const f=fixture();f.handlers['/api/stats']=timeout;
    const player=require('../pixel-browser-playback.cjs')({window:f.window,ui:f.ui,
      content:{kind:'animation',ready:true,prepare(){},readFrame:()=>new Uint8Array(3)},outputSession:f.output,
      withNum:(v,n)=>Number(v)||n,clampFpsForCurrentMode:()=>60,setStatus(){}});
    await player.startLoop();await flush();assert.equal(player.state.running,true);
    f.setNow(4000);f.handlers['/api/stats']=()=>ok({error:'Expired',code:'SESSION_LOST',retryable:false},409);
    const [id,timer]=f.timers.entries().next().value;f.timers.delete(id);timer.fn();await flush();
    assert.equal(player.state.running,false,'Confirmed lost sessions stop output');
  }
  {
    const f=fixture();
    f.handlers['/api/start']=()=>ok({error:'Raw OS timeout',code:'DEVICE_TIMEOUT',source:'device',retryable:false},504);
    await assert.rejects(f.output.ensureDdpSession(),e=>e.source==='device'&&e.message.includes('WLED')&&!e.message.includes('Raw OS'));
  }
  console.log('PASS DDP adapter: telemetry recovery, bounded updates/frames, latest settings/frames, compact units, lost sessions and late-response cancellation.');
}
async function serviceTests(){
  let forks=0,fetcher=async()=>new Response(null,{status:204,headers:{'X-Pixel-Dropped':'1'}}),worker;
  const module={exports:{}};
  vm.runInNewContext(source('desktop/ddp-service.cjs'),{module,Buffer,URL,process:{env:{}},AbortSignal,
    setTimeout:()=>1,clearTimeout(){},fetch:(...args)=>fetcher(...args),
    require:name=>{
      if(name==='node:path')return path;
      if(name==='electron')return {utilityProcess:{fork(){
        forks++;worker=new EventEmitter();worker.kill=()=>worker.emit('exit',0);
        queueMicrotask(()=>worker.emit('message',{type:'pixel-ddp-ready',port:12345,token:'a'.repeat(64)}));return worker;
      }}};
      throw Error('Unexpected service dependency '+name);
    }});
  const service=module.exports(root);
  const missing=await service.request('/api/stats?id=missing');
  assert.equal(missing.status,409);assert.equal(forks,0,'Polling must not start a replacement service');
  await service.ensure();
  const frame=await service.request('/api/frame?id=one',{binary:[0,0,0]});
  assert.equal(frame.headers['X-Pixel-Dropped'],'1');
  fetcher=async()=>{throw Object.assign(new Error('OS timeout'),{name:'TimeoutError'});};
  const timed=JSON.parse((await service.request('/api/stats?id=one')).body);
  assert.equal(timed.code,'BRIDGE_TIMEOUT');assert.equal(timed.source,'bridge');assert.equal(timed.retryable,true);
  worker.emit('exit',1);
  assert.equal((await service.request('/api/stats?id=one')).status,409);
  assert.equal((await service.request('/api/stop',{json:{id:'one'}})).status,200);
  assert.equal(forks,1);
  await assert.rejects(service.request('/api/not-allowed'),/Unsupported/);
  await assert.rejects(service.request('/api/frame',{binary:[-1]}),/Invalid pixel/);
  console.log('PASS desktop IPC: structured local timeouts, dropped-frame headers, no service resurrection and route/frame validation.');
}
async function workerTests(){
  async function make(config={}){
    let now=0,id=0,stops=0,failCode='',reportError;
    const timers=new Map(),messages=[],renderTimes=[];
    const parent=new EventEmitter();parent.postMessage=m=>messages.push(m);parent.close=()=>{};
    vm.runInNewContext(source('pixel-stream-worker.cjs'),{Uint8Array,
      setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key),
      require:name=>{
        if(name==='node:worker_threads')return {parentPort:parent,workerData:{transport:'ddp',retryDdpSendErrors:true,mode:'wave',w:1,h:1,fps:60,speed:1,...config}};
        if(name==='node:perf_hooks')return {performance:{now:()=>now}};
        if(name==='./pixel-browser-playback.cjs')return require('../pixel-browser-playback.cjs');
        if(name==='./pixel-headless-renderer.cjs')return ()=>({modes:['wave'],render(_m,_w,_h,t){renderTimes.push(t);return new Uint8Array(3);}});
        if(name==='./pixel-output-transports.cjs')return (_config,error)=>{
          reportError=error;
          return {start:async()=>{},stop(){stops++;},send:async()=>{if(failCode)throw Object.assign(new Error('mock send failure'),{code:failCode});return 13;}};
        };
        throw Error('Unexpected worker dependency '+name);
      }});
    await flush();
    return {messages,parent,timers,renderTimes,get stops(){return stops;},fail:code=>failCode=code,
      report:code=>reportError(Object.assign(new Error('mock socket error'),{code})),
      async step(time){now=time;const entry=timers.entries().next().value;assert(entry,'Worker timer expected');timers.delete(entry[0]);entry[1].fn();await flush();}};
  }
  const f=await make();f.fail('ENOBUFS');await f.step(1000);
  assert.equal(f.stops,0);assert.equal(f.messages.at(-1).stats.recovering,true);
  f.fail('');await f.step(2000);assert.equal(f.messages.at(-1).stats.recovering,false);
  assert(f.renderTimes.at(-1)>=2,'Retry uses current content time');
  f.report('ENETUNREACH');await f.step(3000);assert.equal(f.stops,0);
  f.parent.emit('message',{type:'stop'});assert.equal(f.timers.size,0);assert.equal(f.stops,1);
  const persistent=await make();persistent.fail('ENETDOWN');await persistent.step(1000);await persistent.step(6000);
  assert.equal(persistent.stops,1);assert.equal(persistent.messages.at(-1).type,'error');
  const plugin=await make({retryDdpSendErrors:false});plugin.fail('ENOBUFS');await plugin.step(1000);assert.equal(plugin.stops,1);
  const usb=await make({transport:'usb'});usb.fail('ENOBUFS');await usb.step(1000);assert.equal(usb.stops,1);
  console.log('PASS worker: transient UDP/socket errors, current-time recovery, bounded failure, stop cancellation and unchanged opt-out/USB behavior.');
}
async function bridgeTests(){
  let handler,fetcher,workers=0;const io=[],token='01'.repeat(32);
  class Worker extends EventEmitter{
    constructor(_file,options){super();workers++;this.options=options;queueMicrotask(()=>this.emit('message',{type:'ready'}));}
    postMessage(){}async terminate(){return 0;}
  }
  const server={listen(port,host,callback){assert.equal(host,'127.0.0.1');callback();},address:()=>({port:8766}),on(){},close(){}};
  const nodeCrypto=require('node:crypto');
  vm.runInNewContext(source('pixel-ddp-bridge.cjs'),{Buffer,URL,Uint8Array,AbortSignal,console:{log(){},error(){}},
    __dirname:root,process:{env:{},argv:[],on(){},exit(){throw Error('Unexpected process exit');}},
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>({unref(){}}),clearInterval(){},
    fetch:async(url,options)=>{io.push({url,options});return fetcher(url,options);},
    require:name=>{
      if(name==='node:http')return {createServer:fn=>{handler=fn;return server;}};
      if(name==='node:dgram')return {createSocket:()=>({on(){},send(_packet,_port,_host,done){done();},close(){}})};
      if(name==='node:worker_threads')return {Worker};
      if(name==='node:perf_hooks')return {performance:{now:()=>0}};
      if(name==='node:crypto')return {...nodeCrypto,randomBytes:n=>Buffer.alloc(n,1)};
      if(name==='node:path')return path;
      if(name==='node:fs')return {readFileSync(){throw Error('Unexpected asset read');}};
      if(name==='./pixel-temperature-service.cjs')return ()=>({sample:async()=>({}),stop(){},active:false});
      if(name==='./pixel-output-protocols.cjs')return require('../pixel-output-protocols.cjs');
      if(name==='./pixel-frame-pipeline.cjs')return require('../pixel-frame-pipeline.cjs');
      throw Error('Unexpected bridge dependency '+name);
    }});
  async function request(route,{method='GET',body,headers={}}={}){
    const req=new EventEmitter(),res=new EventEmitter();
    Object.assign(req,{url:route,method,headers:{host:'127.0.0.1:8766','x-pixel-token':token,...headers},resume(){},destroy(){this.destroyed=true;}});
    const finished=deferred();
    Object.assign(res,{headersSent:false,destroyed:false,writableFinished:false,
      writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;},
      end(text){this.writableFinished=true;finished.resolve({status:this.status,body:text?JSON.parse(text):null});}});
    const handling=handler(req,res);
    if(body!==undefined){req.emit('data',Buffer.from(JSON.stringify(body)));req.emit('end');}
    await handling;return finished.promise;
  }
  fetcher=async()=>{throw Object.assign(new Error('WLED timeout'),{name:'TimeoutError'});};
  const response=await request('/api/device?host=192.168.1.100&path=/json/si');
  assert.equal(response.status,504);assert.equal(response.body.source,'device');assert.equal(response.body.code,'DEVICE_TIMEOUT');
  const before=io.length;
  assert.equal((await request('/api/stats?id=x',{headers:{'x-pixel-token':'wrong'}})).status,403);
  assert.equal((await request('/api/stats?id=x',{headers:{origin:'https://other.example'}})).status,403);
  assert.equal((await request('/api/device?host=127.0.0.1&path=/json/si')).status,400);
  assert.equal((await request('/api/device?host=192.168.1.100&path=/private')).status,400);
  assert.equal(io.length,before,'Rejected requests must not access a target');
  assert.equal((await request('/api/stats?id=missing')).body.code,'SESSION_LOST');
  fetcher=async url=>new Response(JSON.stringify(url.endsWith('/json/si')
    ?{info:{leds:{count:1}}}:url.endsWith('/json/cfg')?{if:{live:{en:true,'no-gc':true}},light:{gc:{col:false}}}:{}));
  const started=await request('/api/start',{method:'POST',body:{host:'192.168.1.100',w:1,h:1,brightness:255,mode:'wave',fps:60,speed:1}});
  assert.equal(started.status,200);assert.equal(workers,1);
  const duplicate=await request('/api/start',{method:'POST',body:{host:'192.168.1.100',w:1,h:1,brightness:255,mode:'wave',fps:60,speed:1}});
  assert.equal(duplicate.status,409,'Do not create two senders for the same target');
  await request('/api/stop',{method:'POST',body:{id:started.body.id}});
  assert.equal((await request('/api/stats?id='+started.body.id)).body.code,'SESSION_LOST');
  console.log('PASS bridge: WLED/local error distinction, loopback binding, token/origin/private-address/route checks and single-sender ownership.');
}
(async()=>{await adapterTests();await serviceTests();await workerTests();await bridgeTests();})().catch(error=>{console.error(error);process.exitCode=1;});
