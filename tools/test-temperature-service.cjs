'use strict';
// Fake processes, named pipes and clocks only. No Windows service or sensor access.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const source=fs.readFileSync(path.join(__dirname,'..','pixel-temperature-service.cjs'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness({exists=true,broker=false,serviceCode=0}={}){
  const timers=new Map(),children=[],sockets=[],commands=[];let timerId=0,now=100000;
  function spawn(){
    const child=new EventEmitter();child.stdin=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();
    child.stdout.setEncoding=()=>{};child.writes=[];
    child.stdin.write=value=>child.writes.push(value);child.stdin.end=value=>{child.ended=value||true;};
    child.kill=()=>{child.killed=true;child.emit('exit',0);};children.push(child);return child;
  }
  const module={exports:{}};
  vm.runInNewContext(source,{
    module,exports:module.exports,__dirname:path.resolve(__dirname,'..'),Buffer,queueMicrotask,process:{env:{},platform:'win32'},
    setTimeout(fn,ms){const timer={id:++timerId,fn,ms,at:now+ms,unref(){}};timers.set(timer.id,timer);return timer;},
    clearTimeout:timer=>{if(timer)timers.delete(timer.id);},
    require(name){
      if(name==='node:path')return path;
      if(name==='node:fs')return {existsSync:()=>exists};
      if(name==='node:perf_hooks')return {performance:{now:()=>now}};
      if(name==='node:child_process')return {spawn,execFile:(file,args,_options,done)=>{commands.push({file,args});done(serviceCode?{code:serviceCode}:null);}};
      if(name==='node:net')return {createConnection(){
        const socket=new EventEmitter();socket.setEncoding=()=>{};
        socket.destroy=error=>{if(socket.destroyed)return;socket.destroyed=true;if(error)socket.emit('error',error);socket.emit('close');};
        sockets.push(socket);return socket;
      }};
      throw Error('Unexpected dependency '+name);
    }
  },{filename:'pixel-temperature-service.cjs'});
  const service=module.exports({exists:()=>exists,now:()=>now,...(broker?{}:{spawn})});
  return {service,timers,children,sockets,commands,get now(){return now;},
    async advance(ms){now+=ms;for(const [id,timer]of [...timers])if(timer.at<=now&&timers.has(id)){timers.delete(id);timer.fn();}await flush();},
    reply(value,child=children.at(-1)){child.stdout.emit('data',JSON.stringify(value)+'\n');},
    pipeReply(value,socket=sockets.at(-1)){socket.emit('connect');socket.emit('data',JSON.stringify(value)+'\n');}
  };
}
const reading=(id,temperature,sampledAt)=>({id,name:id,sensor:id,brand:id==='cpu'?'amd':'nvidia',temperature,sampledAt});
const ready=at=>({status:'ready',sampledAt:at,cpu:reading('cpu',61,at),gpu:reading('gpu',42,at),cpuSensors:[],gpuSensors:[]});
async function run(){
  const h=harness(),s=h.service;
  assert.equal(s.active,true);await flush();assert.equal((await s.sample()).status,'loading');
  const child=h.children[0];assert.equal(child.writes.length,1,'Backend begins independently of UI hardware reads');
  assert.equal((await s.sample()).status,'loading');assert.equal(child.writes.length,1,'UI polling must not overlap hardware reads');
  h.reply(ready(h.now));await flush();assert.equal((await s.sample()).cpu.temperature,61);
  await s.sample({clientId:'fast',intervalMs:500});
  await h.advance(500);assert.equal(child.writes.length,2,'The selected 0.5 second cadence reaches the backend');
  const waiting=await s.sample({clientId:'fast',intervalMs:500});
  assert.equal(waiting.status,'ready');assert.equal(waiting.diagnostics.busy,true,'Waiting for hardware retains the previous completed snapshot');
  await h.advance(7000);
  assert.equal((await s.sample({clientId:'fast',intervalMs:500})).cpu.temperature,61,'No independent five-second display expiry');
  assert.equal(child.writes.length,2,'Slow hardware must not queue overlapping or catch-up reads');
  h.reply(ready(h.now-6000));await flush();
  assert.equal((await s.sample({clientId:'fast',intervalMs:500})).status,'ready','Valid LHM readings are not rejected just because they are older than five seconds');
  await h.advance(500);assert.equal(child.writes.length,3,'Sampling continues without a UI poll');
  h.reply({...ready(h.now),cpu:null});await flush();
  assert.equal((await s.sample({clientId:'fast',intervalMs:500})).status,'partial');
  assert.equal((await s.sample({clientId:'fast',intervalMs:500})).cpu,null,'An explicit missing sensor is not replaced with an invented old value');
  await h.advance(500);h.reply({status:'unavailable',sampledAt:h.now,cpu:null,gpu:null});await flush();
  assert.equal((await s.sample({clientId:'fast',intervalMs:500})).status,'unavailable');
  await h.advance(31000);assert.equal(child.writes.length,5,'Expired UI interval leases do not stop the owning backend');
  s.stop();await flush();assert.equal(child.ended,'quit\n');assert.equal(s.active,false);
  h.reply(ready(h.now));assert.equal((await s.sample()).status,'closed','Late child data cannot revive a stopped backend');
  await h.advance(2000);assert(child.killed);assert.equal(h.timers.size,0);
  const missing=harness({exists:false});await flush();
  assert.equal((await missing.service.sample()).status,'missing');missing.service.stop();assert.equal(missing.timers.size,0);
  const invalid=harness();await flush();invalid.reply(ready(invalid.now+2000));await flush();
  assert.equal((await invalid.service.sample()).status,'unavailable','Future-dated readings must not look valid');
  invalid.service.stop();await invalid.advance(2000);assert.equal(invalid.timers.size,0);
  const timed=harness();await flush();await timed.advance(15000);
  assert.equal((await timed.service.sample()).status,'unavailable');assert.equal(timed.children.length,1);
  timed.service.stop();await timed.advance(2000);assert.equal(timed.timers.size,0);
  const broker=harness({broker:true});await flush();broker.pipeReply(ready(broker.now));await flush();
  assert.equal((await broker.service.sample()).status,'ready');assert.equal(broker.children.length,0);
  await broker.advance(1000);broker.sockets.at(-1).emit('connect');broker.sockets.at(-1).emit('error',Error('Mock connected pipe failed'));await flush();
  assert.equal((await broker.service.sample()).status,'unavailable');
  assert.equal(broker.children.length,0,'A connected service fault must not silently switch to an unprivileged sampler');
  assert.equal(broker.commands.length,0,'A connected service fault must not restart the shared service');
  assert.equal((await broker.service.sample()).diagnostics.serviceErrorCode,'PIPE_ERROR');
  await broker.advance(1000);assert.equal(broker.sockets.length,3,'A completed connection failure resumes at the ordinary sampling cadence');
  broker.pipeReply(ready(broker.now));await flush();
  assert.equal((await broker.service.sample()).diagnostics.serviceErrorCode,undefined,'Success clears the previous communication fault');
  broker.service.stop();assert.equal(broker.timers.size,0);

  const transient=harness({broker:true});await flush();transient.pipeReply(ready(transient.now));await flush();
  await transient.advance(1000);
  let socket=transient.sockets.at(-1);socket.emit('connect');
  socket.emit('error',Object.assign(Error('Private path must not be logged'),{code:'EPIPE'}));await flush();
  assert.equal((await transient.service.sample()).cpu.temperature,61,'A quick response retry retains the original completed cache');
  assert.equal((await transient.service.sample()).diagnostics.busy,true);
  await transient.advance(50);socket=transient.sockets.at(-1);socket.emit('connect');
  socket.emit('data','{"status":');socket.emit('end');await flush();
  await transient.advance(100);socket=transient.sockets.at(-1);socket.emit('connect');
  const response=JSON.stringify(ready(transient.now));socket.emit('data',response.slice(0,20));
  assert.equal((await transient.service.sample()).diagnostics.busy,true,'A split response is not published before its full line');
  socket.emit('data',response.slice(20)+'\n');await flush();
  assert.equal((await transient.service.sample()).status,'ready');
  assert.equal(transient.sockets.length,4,'An initial response plus at most two reconnect retries');
  assert.equal(transient.commands.length,0);assert.equal(transient.children.length,0);
  transient.service.stop();assert.equal(transient.timers.size,0);

  const exhausted=harness({broker:true});await flush();exhausted.pipeReply(ready(exhausted.now));await flush();
  await exhausted.advance(1000);
  for(const delay of [0,50,100]){
    if(delay)await exhausted.advance(delay);
    socket=exhausted.sockets.at(-1);socket.emit('connect');
    socket.emit('error',Object.assign(Error('C:/private/sensor.log'),{code:'EPIPE'}));await flush();
  }
  const failed=await exhausted.service.sample();
  assert.equal(failed.status,'unavailable','An exhausted retry must not indefinitely present an old reading as current');
  assert.equal(failed.diagnostics.serviceErrorCode,'PIPE_DISCONNECTED');
  assert.equal(failed.diagnostics.serviceTransportCode,'EPIPE');
  assert(!JSON.stringify(failed.diagnostics).includes('private'),'Faults expose bounded error codes, not private exception messages');
  assert.equal(exhausted.sockets.length,4);assert.equal(exhausted.commands.length,0);assert.equal(exhausted.children.length,0);
  await exhausted.advance(850);assert.equal(exhausted.sockets.length,5,'No extra two-second wait after response retries are exhausted');
  exhausted.pipeReply(ready(exhausted.now));await flush();assert.equal((await exhausted.service.sample()).status,'ready');
  exhausted.service.stop();assert.equal(exhausted.timers.size,0);

  const budget=harness({broker:true});await flush();socket=budget.sockets[0];socket.emit('connect');
  socket.emit('error',Object.assign(Error('Mock disconnect'),{code:'EPIPE'}));await flush();
  await budget.advance(50);budget.sockets.at(-1).emit('connect');await budget.advance(14950);
  const timeout=await budget.service.sample();
  assert.equal(timeout.diagnostics.serviceErrorCode,'READ_TIMEOUT');
  assert.equal(timeout.diagnostics.lastReadDurationMs,15000,'Reconnects share the original response deadline');
  assert.equal(budget.sockets.length,2,'Hardware timeouts are not multiplied by quick reconnect retries');
  assert.equal(budget.commands.length,0);assert.equal(budget.children.length,0);
  budget.service.stop();assert.equal(budget.timers.size,0);

  const malformed=harness({broker:true});await flush();socket=malformed.sockets[0];socket.emit('connect');
  socket.emit('data','C:/private/not-json\n');await flush();
  assert.equal((await malformed.service.sample()).diagnostics.serviceErrorCode,'INVALID_RESPONSE');
  assert.equal(malformed.sockets.length,1,'Malformed responses are reported, not repeatedly resampled');
  malformed.service.stop();assert.equal(malformed.timers.size,0);

  const hardware=harness({broker:true});await flush();
  hardware.pipeReply({status:'unavailable',sampledAt:hardware.now,cpu:null,gpu:null,diagnostics:{samplingErrors:['SAMPLER_TIMEOUT: OperationCanceledException']}});
  await flush();const hardwareFailure=await hardware.service.sample();
  assert.equal(hardwareFailure.diagnostics.serviceState,'ready','Successful delivery and an unavailable hardware reading are different faults');
  assert.equal(hardwareFailure.diagnostics.samplingErrors[0],'SAMPLER_TIMEOUT: OperationCanceledException');
  assert.equal(hardware.sockets.length,1,'An explicit hardware failure is not treated as a lost response');
  hardware.service.stop();assert.equal(hardware.timers.size,0);

  const stopping=harness({broker:true});await flush();socket=stopping.sockets[0];socket.emit('connect');
  socket.emit('error',Object.assign(Error('Mock disconnect'),{code:'EPIPE'}));await flush();
  stopping.service.stop();await flush();assert.equal(stopping.timers.size,0,'Stop cancels retry delays and pending sockets');
  await stopping.advance(1000);assert.equal(stopping.sockets.length,1,'A canceled reconnect must not create another pipe');

  const fallback=harness({broker:true,serviceCode:1060});await flush();
  fallback.sockets[0].emit('error',Error('Mock missing service pipe'));await flush();
  assert.equal(fallback.commands.length,1);assert.deepEqual(Array.from(fallback.commands[0].args),['start','PixelStudioSensorsShared']);
  assert.equal(fallback.children.length,1);
  fallback.reply(ready(fallback.now));await flush();assert.equal((await fallback.service.sample()).diagnostics.serviceState,'missing');
  fallback.service.stop();await fallback.advance(2000);assert.equal(fallback.timers.size,0);
  console.log('PASS continuous background/cache-only sampling, bounded pipe retries and deadlines, explicit hardware failures, error diagnostics, stop cleanup and private fallback. All hardware and service operations are mocked.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
