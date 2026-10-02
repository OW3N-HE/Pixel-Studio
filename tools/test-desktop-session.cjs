'use strict';
// Isolated scripts and fake IPC/timers only. Never launches Electron or devices.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sources=Object.fromEntries(['session-controller.js','media-playback.js'].map(name=>[name,fs.readFileSync(path.join(root,'desktop',name),'utf8')]));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function sessionFixture({settingsReady=true,connectionGate}={}){
  const events=new Map(),buttons=new Map(),calls=[],saved={mediaActive:true,selected:'original.mp4'};
  for(const id of ['stopBtn','disconnectBtn','previewOnlyBtn'])buttons.set(id,{listeners:[],addEventListener(_name,fn){this.listeners.push(fn);},click(){this.listeners.forEach(fn=>fn());}});
  const document={documentElement:{dataset:{desktopReady:settingsReady?'true':'false'}},getElementById:id=>buttons.get(id)};
  const window={pixelStudioDesktop:{edition:true,
    getMediaSession:async()=>{calls.push('settings');return saved;},
    restoreConnection:async()=>{calls.push('connection');if(connectionGate)await connectionGate.promise;},
    resumePlayback:async()=>{calls.push('play');return true;},
    saveMediaSession:async value=>{calls.push('save:'+value.selected);return value;}},
    addEventListener(name,fn){const list=events.get(name)||[];list.push(fn);events.set(name,list);}};
  vm.runInNewContext(sources['session-controller.js'],{window,document,Promise});
  return {api:window.pixelStudioDesktopSession,calls,saved,buttons,emit(name){for(const fn of events.get(name)||[])fn();}};
}
async function sessionTests(){
  const normal=sessionFixture(),adapter={restore:async saved=>{assert.equal(saved,normal.saved);normal.calls.push('content');return true;},capture:()=>normal.saved,finishRestore:()=>normal.calls.push('finish')};
  normal.api.registerContent(adapter);await flush();
  assert.deepEqual(normal.calls,['settings','connection','content','play','finish']);assert.equal(normal.api.ready,true);
  assert.equal(normal.api.captureContent(),normal.saved);
  await Promise.all([normal.api.rememberContent({selected:'first.png'}),normal.api.rememberContent({selected:'last.png'})]);
  assert.deepEqual(normal.calls.slice(-2),['save:first.png','save:last.png']);
  const canceled=sessionFixture({settingsReady:false});let finished=0;
  canceled.api.registerContent({restore:async()=>{throw Error('Unexpected content restore');},capture:()=>null,finishRestore:()=>finished++});
  canceled.buttons.get('stopBtn').click();canceled.emit('pixel-studio-desktop-ready');await flush();
  assert.deepEqual(canceled.calls,[]);assert.equal(finished,1);assert.equal(canceled.api.ready,true);
  const gate=deferred(),late=sessionFixture({connectionGate:gate});
  late.api.registerContent({restore:async()=>{late.calls.push('content');return true;},capture:()=>null});
  await flush();late.buttons.get('disconnectBtn').click();gate.resolve();await flush();
  assert.deepEqual(late.calls,['settings','connection']);assert.equal(late.api.ready,true);
  const missing=sessionFixture();missing.api.registerContent({restore:async()=>false,capture:()=>null});await flush();
  assert.deepEqual(missing.calls,['settings','connection']);assert.equal(missing.api.ready,true);
  const failed=sessionFixture();let reported=false;
  failed.api.registerContent({restore:async()=>{throw Error('fixture error');},capture:()=>null,reportError:()=>{reported=true;}});await flush();
  assert.equal(reported,true);assert.equal(failed.api.ready,true);assert.ok(!failed.calls.includes('play'));
  console.log('PASS desktop session order, independent connection, canceled startup finalization, late cancellation, missing content, failure and serialized saves.');
}
async function mediaTests(){
  const timers=new Map();let timerId=0;
  const window={};vm.runInNewContext(sources['media-playback.js'],{window,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),Date,Promise});
  const calls=[];let busy=false,active=true,request=0,stop=0,selected='first.mp4',suspended=false;
  const runtime={playing:true,replaceDesktopMedia:async(source,current)=>{calls.push('replace:'+source.name);return current();},loadDesktopMedia:source=>calls.push('load:'+source.name),desktopMediaReady:()=>true,startDesktopMedia:async()=>{calls.push('start');runtime.playing=true;}};
  const files=[{id:'a',name:'first.mp4'},{id:'b',name:'next.mp4'}],readGate=deferred();let delayRead=false;
  const api=window.pixelStudioMediaPlayback.create({runtime,policy:require('../pixel-browser-playback.cjs').policy,
    bridge:{mediaFile:async()=>{if(delayRead)await readGate.promise;return {ok:true,url:'pixel-media://library/test',type:'video/mp4'};}},
    isActive:()=>active,isBusy:()=>busy,setBusy:value=>{busy=value;},setError(){},beginRequest:()=>++request,requestRevision:()=>request,stopRevision:()=>stop,
    select:name=>{selected=name;},afterLoad(){},timeoutMessage:()=> 'timeout',loadError:e=>e.message,
    shuffleEnabled:()=>true,shuffleInterval:()=>3,files:()=>files,selected:()=>selected,isSuspended:()=>suspended});
  assert.equal(await api.load(files[1],true),true);assert.deepEqual(calls,['replace:next.mp4']);assert.equal(busy,false);
  runtime.playing=false;api.scheduleShuffle();await [...timers.values()].at(-1)();assert.equal(calls.length,1);
  runtime.playing=true;suspended=true;await [...timers.values()].at(-1)();assert.equal(calls.length,1);
  suspended=false;await [...timers.values()].at(-1)();assert.equal(calls.at(-1),'replace:first.mp4');
  delayRead=true;const pending=api.load(files[1],true);stop++;readGate.resolve();assert.equal(await pending,false);assert.equal(busy,false);
  assert.equal(calls.at(-1),'replace:first.mp4');
  delayRead=false;runtime.playing=false;assert.equal(await api.load(files[1],false,true),true);assert.deepEqual(calls.slice(-2),['load:next.mp4','start']);
  api.dispose();assert.equal(await api.load(files[0]),false);
  assert.equal(timers.has(timerId),false);
  console.log('PASS continuous media replacement, idle/suspended shuffle, cancellation, explicit start and disposal.');
}
(async()=>{await sessionTests();await mediaTests();console.log('No real UI, filesystem watcher, personal settings, sensor or controller tested.');})().catch(error=>{console.error(error);process.exitCode=1;});
