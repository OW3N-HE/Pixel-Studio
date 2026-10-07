'use strict';
// Isolated scripts and fake IPC/timers only. Never launches Electron or devices.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sources=Object.fromEntries(['session-controller.js','media-playback.js','media-library-ui.js'].map(name=>[name,fs.readFileSync(path.join(root,'desktop',name),'utf8')]));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function sessionFixture({settingsReady=true,connectionGate,settingsGate,connectionError=false}={}){
  const events=new Map(),buttons=new Map(),calls=[],saved={mediaActive:true,selected:'original.mp4'};
  for(const id of ['stopBtn','disconnectBtn'])buttons.set(id,{listeners:[],addEventListener(_name,fn){this.listeners.push(fn);},click(){this.listeners.forEach(fn=>fn());}});
  const document={documentElement:{dataset:{desktopReady:settingsReady?'true':'false'}},getElementById:id=>buttons.get(id)};
  const window={pixelStudioDesktop:{edition:true,
    getMediaSession:async()=>{calls.push('settings');if(settingsGate)await settingsGate.promise;return saved;},
    restoreConnection:async()=>{calls.push('connection');if(connectionGate)await connectionGate.promise;if(connectionError)throw Error('connection fixture error');},
    resumePlayback:async()=>{calls.push('play');return true;},
    saveMediaSession:async value=>{calls.push('save:'+value.selected);return value;}},
    addEventListener(name,fn){const list=events.get(name)||[];list.push(fn);events.set(name,list);}};
  vm.runInNewContext(sources['session-controller.js'],{window,document,Promise});
  return {api:window.pixelStudioDesktopSession,calls,saved,buttons,emit(name){for(const fn of events.get(name)||[])fn();}};
}
async function sessionTests(){
  const normal=sessionFixture(),adapter={restore:async saved=>{assert.equal(saved,normal.saved);normal.calls.push('content');return true;},capture:()=>normal.saved,finishRestore:()=>normal.calls.push('finish')};
  normal.api.registerContent(adapter);await flush();
  assert.deepEqual(normal.calls,['settings','connection','content','finish','play']);assert.equal(normal.api.ready,true);
  assert.equal(normal.api.captureContent(),normal.saved);
  await Promise.all([normal.api.rememberContent({selected:'first.png'}),normal.api.rememberContent({selected:'last.png'})]);
  assert.deepEqual(normal.calls.slice(-2),['save:first.png','save:last.png']);
  const stopped=sessionFixture({settingsReady:false});let finished=0;
  stopped.api.registerContent({restore:async(_saved,current)=>{assert.equal(current(),true);stopped.calls.push('content');return true;},capture:()=>null,finishRestore:()=>finished++});
  stopped.buttons.get('stopBtn').click();stopped.emit('pixel-studio-desktop-ready');await flush();
  assert.deepEqual(stopped.calls,['settings','connection','content']);assert.equal(finished,1);assert.equal(stopped.api.ready,true);
  for(const action of ['stopBtn','disconnectBtn']){
    const gate=deferred(),late=sessionFixture({connectionGate:gate});
    late.api.registerContent({restore:async()=>{late.calls.push('content');return true;},capture:()=>null,finishRestore:()=>late.calls.push('finish')});
    await flush();assert.deepEqual(late.calls,['settings','connection','content','finish'],'Preview must not wait for connection');
    late.buttons.get(action).click();gate.resolve();await flush();
    assert.ok(!late.calls.includes('play'));assert.equal(late.api.ready,true);
  }
  const disconnected=sessionFixture({settingsReady:false});
  disconnected.api.registerContent({restore:async()=>{disconnected.calls.push('content');return true;},capture:()=>null});
  disconnected.buttons.get('disconnectBtn').click();disconnected.emit('pixel-studio-desktop-ready');await flush();
  assert.deepEqual(disconnected.calls,['settings','content'],'Disconnect cancels connection/output, not preview');
  const connectionFailed=sessionFixture({connectionError:true});let connectionReported=false;
  connectionFailed.api.registerContent({restore:async()=>{connectionFailed.calls.push('content');return true;},capture:()=>null,reportError:()=>{connectionReported=true;}});await flush();
  assert.equal(connectionReported,true);assert.ok(connectionFailed.calls.includes('content'));assert.ok(!connectionFailed.calls.includes('play'));assert.equal(connectionFailed.api.ready,true);
  const contentGate=deferred(),loading=sessionFixture();let contentCurrent;
  loading.api.registerContent({restore:async(_saved,current)=>{contentCurrent=current;await contentGate.promise;loading.calls.push('content');return current();},capture:()=>null});
  await flush();loading.buttons.get('stopBtn').click();assert.equal(contentCurrent(),true);contentGate.resolve();await flush();
  assert.ok(loading.calls.includes('content'));assert.ok(!loading.calls.includes('play'));
  for(const cancel of ['selection','pagehide']){
    const gate=deferred(),stale=sessionFixture({settingsGate:gate});let finishes=0;
    stale.api.registerContent({restore:async()=>{throw Error('Stale saved content must not replace manual selection');},capture:()=>null,finishRestore:()=>finishes++});
    await flush();if(cancel==='selection')stale.api.cancelRestore();else stale.emit('pagehide');gate.resolve();await flush();
    assert.ok(!stale.calls.includes('play'));assert.equal(finishes,cancel==='selection'?1:0);assert.equal(stale.api.ready,cancel==='selection');
  }
  const missing=sessionFixture();missing.api.registerContent({restore:async()=>false,capture:()=>null});await flush();
  assert.deepEqual(missing.calls,['settings','connection']);assert.equal(missing.api.ready,true);
  const failed=sessionFixture();let reported=false;
  failed.api.registerContent({restore:async()=>{throw Error('fixture error');},capture:()=>null,reportError:()=>{reported=true;}});await flush();
  assert.equal(reported,true);assert.equal(failed.api.ready,true);assert.ok(!failed.calls.includes('play'));
  console.log('PASS independent preview/connection restoration, stopped output, disconnected/failed/pending connection, stale selection, disposal and serialized saves.');
}
async function mediaTests(){
  const timers=new Map();let timerId=0;
  const window={};vm.runInNewContext(sources['media-playback.js'],{window,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),Date,Promise});
  const calls=[];let busy=false,active=true,request=0,stop=0,selected='first.mp4',suspended=false,hidden=false,dragging=false;
  const document={get hidden(){return hidden;},querySelectorAll:()=>suspended?[{getClientRects:()=>[{}]}]:[]};
  const suspensionRule=sources['media-library-ui.js'].match(/^\s*isSuspended:(.+)$/m);
  assert(suspensionRule,'Desktop media suspension policy must exist');
  const isSuspended=vm.runInNewContext('('+suspensionRule[1]+')',{document,mediaSorter:{get dragging(){return dragging;}}});
  let decodeGate=null;
  const runtime={playing:true,replaceDesktopMedia:async(source,current)=>{calls.push('replace:'+source.name);if(decodeGate)await decodeGate.promise;return current();},loadDesktopMedia:source=>calls.push('load:'+source.name),desktopMediaReady:()=>true,startDesktopMedia:async()=>{calls.push('start');runtime.playing=true;}};
  const files=[{id:'a',name:'first.mp4'},{id:'b',name:'next.mp4'}];let readGate=deferred(),delayRead=false;
  const api=window.pixelStudioMediaPlayback.create({runtime,policy:require('../pixel-browser-playback.cjs').policy,
    bridge:{mediaFile:async()=>{if(delayRead)await readGate.promise;return {ok:true,url:'pixel-media://library/test',type:'video/mp4'};}},
    isActive:()=>active,isBusy:()=>busy,setBusy:value=>{busy=value;},setError(){},beginRequest:()=>++request,requestRevision:()=>request,stopRevision:()=>stop,
    select:name=>{selected=name;},afterLoad(){},timeoutMessage:()=> 'timeout',loadError:e=>e.message,
    shuffleEnabled:()=>true,shuffleInterval:()=>3,files:()=>files,selected:()=>selected,isSuspended});
  assert.equal(await api.load(files[1],true),true);assert.deepEqual(calls,['replace:next.mp4']);assert.equal(busy,false);
  runtime.playing=false;api.scheduleShuffle();await [...timers.values()].at(-1)();assert.equal(calls.length,1);
  runtime.playing=true;suspended=true;await [...timers.values()].at(-1)();assert.equal(calls.length,1);
  hidden=true;suspended=false;await [...timers.values()].at(-1)();assert.equal(calls.at(-1),'replace:first.mp4','Hidden window must continue media shuffle');
  const afterHiddenShuffle=calls.length;
  dragging=true;await [...timers.values()].at(-1)();assert.equal(calls.length,afterHiddenShuffle,'Dragging cards must suspend shuffle');dragging=false;
  suspended=true;await [...timers.values()].at(-1)();assert.equal(calls.length,afterHiddenShuffle,'Open dialog must still suspend shuffle');
  suspended=false;runtime.playing=false;await [...timers.values()].at(-1)();
  assert.equal(calls.length,afterHiddenShuffle,'Hidden window must not restart stopped output');assert.equal(runtime.playing,false);
  hidden=false;runtime.playing=true;
  delayRead=true;const pending=api.load(files[1],true);stop++;runtime.playing=false;readGate.resolve();assert.equal(await pending,true);assert.equal(busy,false);
  assert.equal(calls.at(-1),'replace:next.mp4');assert.equal(selected,'next.mp4');assert.equal(runtime.playing,false);assert.ok(!calls.includes('start'));
  delayRead=false;decodeGate=deferred();runtime.playing=true;
  const decoding=api.load(files[0],true);await flush();stop++;runtime.playing=false;decodeGate.resolve();assert.equal(await decoding,true);decodeGate=null;
  assert.equal(selected,'first.mp4');assert.equal(runtime.playing,false);assert.ok(!calls.includes('start'));
  assert.equal(await api.load(files[1],false),true);assert.equal(calls.at(-1),'load:next.mp4');assert.equal(runtime.playing,false);
  readGate=deferred();delayRead=true;const beforeStale=calls.length,stale=api.load(files[0],false);active=false;readGate.resolve();assert.equal(await stale,false);
  assert.equal(calls.length,beforeStale);assert.equal(busy,false);active=true;
  delayRead=false;runtime.playing=false;assert.equal(await api.load(files[1],false,true),true);assert.deepEqual(calls.slice(-2),['load:next.mp4','start']);
  api.dispose();assert.equal(await api.load(files[0]),false);
  assert.equal(timers.has(timerId),false);
  console.log('PASS continuous media replacement, stop during IPC/decode, preview-only loads, stale selection, hidden shuffle, explicit start and disposal.');
}
function librarySwitchTests(){
  const source=sources['media-library-ui.js'],calls=[];
  const begin=source.indexOf('    function restoreMediaPreview('),end=source.indexOf('    let libraryDirty=',begin);
  const switchBegin=source.indexOf('    function switchSource('),switchEnd=source.indexOf('    function scheduleShuffle(',switchBegin);
  assert(begin>=0&&end>begin&&switchBegin>=0&&switchEnd>switchBegin);
  const saved={name:'saved.mp4'},other={name:'other.png'};
  const originalShuffle={isConnected:true,replaceWith(node){this.isConnected=false;node.isConnected=true;}},mediaShuffle={isConnected:false,replaceWith:originalShuffle.replaceWith};
  let stopHandler;
  const context={disposed:false,busy:false,mediaActive:false,mediaPreviewRequested:false,outputStopRevision:0,selected:saved.name,lastAnimation:'wave',library:{files:[other,saved]},
    matchingFiles:()=>[other],load:(file,continuing,start)=>{calls.push({name:file.name,continuing,start});return Promise.resolve(true);},
    window:{pixelStudioWebRuntime:{playing:false}},mode:{value:'wave',options:[{value:'wave'}],dispatchEvent(){}},
    gallery:{style:{}},grid:{},category:{},actions:{},originalShuffle,mediaShuffle,toolbar:{style:{setProperty(){}}},search:{},
    sharedShuffle:{dataset:{},dispatchEvent(){}},mediaPlayback:{stopShuffle(){}},en:()=>true,render(){},scheduleShuffle(){},rememberMediaSession(){},Event:class{},
    document:{getElementById:()=>({addEventListener:(_name,fn)=>{stopHandler=fn;}})}
  };
  const stopLine=source.split('\n').find(line=>line.includes("document.getElementById('stopBtn').addEventListener"));assert(stopLine);
  vm.runInNewContext(source.slice(begin,end)+source.slice(switchBegin,switchEnd)+stopLine,context);
  context.switchSource(true);assert.deepEqual(calls,[{name:'saved.mp4',continuing:false,start:false}]);
  assert.equal(context.mode.value,'wave','Keep the current preview until the runtime loads the selected media');
  context.switchSource(false);context.busy=true;context.switchSource(true);stopHandler();context.busy=false;context.restoreMediaPreview();
  assert.equal(calls.length,2);assert.equal(calls.at(-1).start,false,'Stop must not cancel queued preview restoration or start output');
  context.switchSource(false);context.busy=true;context.switchSource(true);context.switchSource(false);context.busy=false;context.restoreMediaPreview();
  assert.equal(calls.length,2,'Returning to animations cancels queued media restoration');
  context.switchSource(true,false);assert.equal(calls.length,2,'Startup restoration must not schedule a duplicate media load');
  console.log('PASS output-off library switch, remembered file independent of search, queued preview stop and rapid source switches.');
}
async function contentRestoreTests(){
  const source=sources['media-library-ui.js'],begin=source.indexOf('      restore:async'),end=source.indexOf('\n    });',begin);
  assert(begin>=0&&end>begin);
  const restoreSource=source.slice(begin,end).trim().replace(/^restore:/,'');
  for(const action of ['stop-scan','stop-decode','manual-selection']){
    const scan=deferred(),loads=[],timers=[],file={name:'saved.mp4'};let valid=true,ready=action!=='stop-decode';
    const context={disposed:false,sessionInitialized:false,mediaActive:false,selected:null,lastAnimation:'wave',outputStopRevision:0,
      shuffleCheck:{},interval:{},library:{files:[file]},window:{pixelStudioWebRuntime:{desktopMediaReady:()=>ready}},
      switchSource(value,restorePreview){context.mediaActive=value;assert.equal(restorePreview,false);},refreshLibrary:()=>scan.promise,
      load:async(value,continuing,start)=>{loads.push(value);assert.equal(continuing,false);assert.equal(start,false);return true;},
      en:()=>true,syncMediaLoadState(){},Date,Promise,setTimeout:fn=>timers.push(fn)};
    const restore=vm.runInNewContext('('+restoreSource+')',context);
    const pending=restore({mediaActive:true,selected:file.name,lastAnimation:'wave',shuffle:false,interval:3},()=>valid);
    if(action==='manual-selection')valid=false;else context.outputStopRevision++;
    scan.resolve();await flush();
    if(action==='stop-decode'){assert.equal(timers.length,1);context.outputStopRevision++;ready=true;timers.shift()();}
    assert.equal(await pending,action!=='manual-selection');assert.equal(loads.length,action==='manual-selection'?0:1);assert.equal(context.sessionInitialized,true);
  }
  console.log('PASS saved-media preview survives output stop while scanning/decoding and rejects superseded startup content.');
}
(async()=>{await sessionTests();await mediaTests();librarySwitchTests();await contentRestoreTests();console.log('No real UI, filesystem watcher, personal settings, sensor or controller tested.');})().catch(error=>{console.error(error);process.exitCode=1;});
