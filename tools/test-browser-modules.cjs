'use strict';
// Fake DOM, media, serial and read-only device HTTP. No browser profile, device or network access.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
const createCanvas=require('../pixel-rgb-canvas.cjs');
function environment(){
  let now=0,id=0,dataUrlCalls=0;const timers=new Map(),nodes=[],ids=new Map(),events=new Map(),documentEvents=new Map();
  class Element{
    constructor(tag='div'){Object.assign(this,{tag,tagName:tag.toUpperCase(),value:'',type:'',style:{setProperty(){}},dataset:{},children:[],options:[],textContent:'',files:[],checked:false,hidden:false,attributes:{},listeners:new Map(),readyState:0,videoWidth:15,videoHeight:27,currentTime:0,paused:true});nodes.push(this);this.classList={add(){},remove(){},toggle(){}};}
    addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}
    dispatchEvent(event){for(const fn of this.listeners.get(event.type)||[])fn({...event,target:this});return true;}
    append(...children){this.children.push(...children);}
    setAttribute(name,value){this.attributes[name]=value;}
    setCustomValidity(value){this.validationMessage=value;}
    removeAttribute(name){delete this.attributes[name];if(name==='src')this.src='';}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
    load(){}
    closest(){return null;}
    querySelector(selector){return this.children.find(x=>selector==='.'+x.className)||null;}
    get selectedOptions(){return this.options.filter(x=>x.value===this.value);}
  }
  const html=load('index.html');
  for(const m of html.matchAll(/<(\w+)\b[^>]*>/g)){
    const key=/\bid="([^"]+)"/.exec(m[0])?.[1];if(!key)continue;
    const node=new Element(m[1]);node.id=key;ids.set(key,node);
    node.value=/\bvalue="([^"]*)"/.exec(m[0])?.[1]||'';node.type=/\btype="([^"]+)"/.exec(m[0])?.[1]||'';
    node.checked=/\bchecked\b/.test(m[0]);
    if(m[1]==='select'){
      node.options=[...html.slice(m.index,html.indexOf('</select>',m.index)).matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(o=>({value:/value="([^"]+)"/.exec(o[1])?.[1]||'',textContent:o[2],selected:/\bselected\b/.test(o[1])}));
      node.value=(node.options.find(o=>o.selected)||node.options[0])?.value||'';
    }
  }
  // Progressive UI creates these controls before the runtime starts.
  for(const name of ['libraryCategory','librarySearch'])if(!ids.has(name)){const node=new Element();node.id=name;ids.set(name,node);}
  const document={hidden:false,documentElement:{lang:'en'},getElementById:name=>ids.get(name),querySelector:()=>null,
    querySelectorAll:selector=>selector==='.animation-card'?nodes.filter(n=>n.className==='animation-card'):[],
    addEventListener(name,fn){const list=documentEvents.get(name)||[];list.push(fn);documentEvents.set(name,list);},
    removeEventListener(name,fn){documentEvents.set(name,(documentEvents.get(name)||[]).filter(item=>item!==fn));},
    dispatchEvent(event){for(const fn of [...documentEvents.get(event.type)||[]])fn(event);},
    createElement:tag=>{if(tag!=='canvas')return new Element(tag);const canvas=createCanvas(),ctx=canvas.getContext('2d');
      canvas.toDataURL=()=>{dataUrlCalls++;return 'data:image/png;base64,mock';};ctx.putImageData=()=>{};ctx.drawImage=()=>{};return canvas;}};
  const window={document,navigator:{},performance:{now:()=>now},innerWidth:1200,innerHeight:900,console,
    TextEncoder,TextDecoder,URL,AbortController,Response,Uint8Array,Uint8ClampedArray,Date,Math,
    Image:class extends Element{constructor(){super('img');this.complete=false;this.naturalWidth=15;this.naturalHeight=27;}},MutationObserver:class{observe(){}},Event:class{constructor(type){this.type=type;}},
    crypto:{randomUUID:()=> 'mock-client-000000000000000'},
    addEventListener:(name,fn)=>{const list=events.get(name)||[];list.push(fn);events.set(name,list);},
    dispatchEvent:event=>{for(const fn of [...events.get(event.type)||[]])fn(event);},
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key),
    setInterval:(fn,ms)=>{timers.set(++id,{fn,ms,interval:true});return id;},clearInterval:key=>timers.delete(key),
    fetch:async()=>{throw Error('Unexpected mock network request');}};
  window.window=window;
  return {window,ids,timers,events,documentEvents,nodes,get dataUrlCalls(){return dataUrlCalls;},setNow:value=>now=value};
}
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function run(){
  const env=environment(),context=vm.createContext(env.window);
  const modules=['pixel-settings-schema.cjs','pixel-temperature.cjs','pixel-rgb-canvas.cjs','pixel-clock-renderer.cjs','pixel-animation-designs.cjs','pixel-animation-catalog.cjs','pixel-animation-engine.cjs','pixel-output-protocols.cjs','pixel-render-settings.cjs','pixel-frame-mapping.cjs','pixel-frame-pipeline.cjs','pixel-circuit-palette.cjs','pixel-browser-media.cjs','pixel-browser-playback.cjs','pixel-browser-output.cjs'];
  for(const name of modules)vm.runInContext(load(name),context,{filename:name});
  vm.runInContext(load('pixel-animation-runtime.js'),context,{filename:'pixel-animation-runtime.js'});
  assert(env.window.pixelStudioWebRuntime);assert.equal(env.window.pixelStudioWebRuntime.playing,false);
  assert(env.ids.get('animationGallery').children.length>0);
  const firstMode=env.window.PixelStudioAnimationCatalog.galleryModes[0];
  assert.equal(env.ids.get('animationMode').value,firstMode,'Fresh web pages start with the first catalog animation');
  assert.equal(env.ids.get('animationGallery').children[0].dataset.mode,firstMode);
  assert.equal(env.ids.get('animationGallery').children[0].attributes['aria-pressed'],'true');
  assert.equal(env.ids.get('preview').src,'data:image/png;base64,mock');
  assert.equal(env.ids.get('status').textContent,'正在本地预览','The status must not repeat the animation title');
  // Exercise the runtime's language-change hook without loading a browser UI.
  env.window.pixelStudioFormatNotice=text=>env.window.document.documentElement.lang==='en'
    ? ({'正在本地预览':'Previewing locally','正在发送':'Sending'}[text]||text) : text;
  for(const [language,expected] of [['en','Previewing locally'],['zh-CN','正在本地预览'],['en','Previewing locally']]){
    env.window.document.documentElement.lang=language;
    env.window.dispatchEvent({type:'pixel-studio-language-change'});
    assert.equal(env.ids.get('status').textContent,expected);
    assert.equal(env.ids.get('animationMode').value,firstMode);
    assert.equal(env.window.pixelStudioWebRuntime.playing,false);
  }
  for(const mode of ['thermal_icons','clock','wave','fire','thermal_digits']){
    env.ids.get('animationMode').value=mode;env.ids.get('animationMode').dispatchEvent({type:'change'});
    assert.equal(env.ids.get('preview').src,'data:image/png;base64,mock');
    assert.equal(env.ids.get('status').textContent,'Previewing locally','Animation switching must not duplicate names in status');
  }
  env.ids.get('animationSpeed').dispatchEvent({type:'input'});
  env.ids.get('stopBtn').dispatchEvent({type:'click'});
  assert.equal(env.window.pixelStudioWebRuntime.playing,false);assert.equal(env.timers.size,1,'Stopping output must retain the preview timer');
  const previewTick=env.timers.entries().next().value;
  env.timers.delete(previewTick[0]);env.setNow(500);previewTick[1].fn();
  assert.equal(env.timers.size,1,'Preview must keep refreshing after output stops');
  const beforeHidden=env.dataUrlCalls;
  env.window.document.hidden=true;
  const hiddenTick=env.timers.entries().next().value;
  env.timers.delete(hiddenTick[0]);hiddenTick[1].fn();
  assert.equal(env.dataUrlCalls,beforeHidden,'Hidden preview must not encode PNG frames');
  assert.equal([...env.timers.values()][0].ms,250,'Hidden preview uses a low-frequency wakeup');
  env.window.document.hidden=false;env.window.document.dispatchEvent({type:'visibilitychange'});
  assert(env.dataUrlCalls>beforeHidden,'Visible preview resumes immediately');
  assert.equal(env.timers.size,1,'Visibility changes must not duplicate the preview timer');
  for(const fn of env.events.get('pagehide')||[])fn();
  assert.equal(env.timers.size,0,'Page disposal must release preview timers');
  assert.equal((env.documentEvents.get('visibilitychange')||[]).length,0,'Page disposal releases the visibility listener');
  env.setNow(0); // Isolate the output-only clock fixture from the preview test.

  // Exercise the actual desktop runtime and media decoder adapter with fake media.
  const desktop=environment(),dw=desktop.window;
  dw.pixelStudioDesktop={edition:true,cancelResume:async()=>{},savePlayback(){}};
  const desktopContext=vm.createContext(dw);
  for(const name of modules)vm.runInContext(load(name),desktopContext,{filename:name});
  vm.runInContext(load('pixel-animation-runtime.js'),desktopContext,{filename:'pixel-animation-runtime.js'});
  const runtime=dw.pixelStudioWebRuntime,mode=desktop.ids.get('animationMode'),stop=desktop.ids.get('stopBtn');
  assert.equal(mode.value,dw.PixelStudioAnimationCatalog.galleryModes[0],'Fresh desktop installs share the catalog default');
  assert.equal(runtime.playing,false,'Choosing an initial animation does not start device output');
  assert.equal(desktop.ids.get('status').textContent,'正在本地预览');
  const tickPreview=()=>{
    const entry=[...desktop.timers.entries()].find(([,timer])=>timer.ms===16);
    assert(entry,'An independent preview timer must exist');desktop.timers.delete(entry[0]);entry[1].fn();
  };
  const firstVideo={url:'pixel-media://library/first',type:'video/mp4',name:'first.mp4'};
  const replacing=runtime.replaceDesktopMedia(firstVideo);
  const video=desktop.nodes.filter(node=>node.tag==='video').at(-1);video.readyState=2;video.onloadeddata();
  assert.equal(await replacing,true);assert.equal(mode.value,'file');assert.equal(runtime.playing,false);assert.equal(video.paused,false);
  video.currentTime=7.5;const beforeStop=desktop.dataUrlCalls;stop.dispatchEvent({type:'click'});tickPreview();
  assert(desktop.dataUrlCalls>beforeStop);assert.equal(video.currentTime,7.5);assert.equal(video.paused,false);assert.equal(runtime.playing,false);
  mode.value='wave';mode.dispatchEvent({type:'change'});assert.equal(video.paused,true);
  const second=runtime.replaceDesktopMedia({...firstVideo,url:'pixel-media://library/second'});
  const nextVideo=desktop.nodes.filter(node=>node.tag==='video').at(-1);
  stop.dispatchEvent({type:'click'});nextVideo.readyState=2;nextVideo.onloadeddata();
  assert.equal(await second,true);assert.equal(runtime.playing,false);assert.equal(nextVideo.paused,false);tickPreview();
  let current=true;
  const stale=runtime.replaceDesktopMedia({...firstVideo,url:'pixel-media://library/stale'},()=>current);
  const staleVideo=desktop.nodes.filter(node=>node.tag==='video').at(-1);current=false;staleVideo.readyState=2;staleVideo.onloadeddata();
  assert.equal(await stale,false);assert.equal(staleVideo.paused,true);assert.equal(nextVideo.paused,false);tickPreview();
  const replacingImage=runtime.replaceDesktopMedia({url:'pixel-media://library/image',type:'image/png',name:'image.png'});
  const image=desktop.nodes.filter(node=>node.tag==='img').at(-1);image.complete=true;
  const beforeImage=desktop.dataUrlCalls;image.onload();assert.equal(await replacingImage,true);assert(desktop.dataUrlCalls>beforeImage);assert.equal(runtime.playing,false);
  // Read-only preview state must distinguish no source, pending decode and failure.
  assert.equal(runtime.previewStatus,'ready');
  mode.value='wave';mode.dispatchEvent({type:'change'});
  assert.equal(runtime.previewStatus,'ready');
  mode.value='file';mode.dispatchEvent({type:'change'});
  assert.equal(runtime.previewStatus,'empty');
  assert.equal(desktop.ids.get('status').dataset.noticeSource,'媒体模式：请选择图片或视频');
  runtime.loadDesktopMedia({...firstVideo,url:'pixel-media://library/loading'});
  assert.equal(runtime.previewStatus,'loading');
  const loadingVideo=desktop.nodes.filter(node=>node.tag==='video').at(-1);
  loadingVideo.readyState=1;loadingVideo.onloadedmetadata();
  assert.equal(runtime.previewStatus,'loading','Metadata alone is not a decoded video frame');
  loadingVideo.readyState=2;
  assert.equal(runtime.previewStatus,'ready');
  const lateError=loadingVideo.onerror;lateError();
  assert.equal(runtime.previewStatus,'error');
  runtime.loadDesktopMedia({url:'pixel-media://library/recovered',type:'image/png',name:'recovered.png'});
  assert.equal(runtime.previewStatus,'loading');
  const recovered=desktop.nodes.filter(node=>node.tag==='img').at(-1);recovered.complete=true;recovered.onload();
  assert.equal(runtime.previewStatus,'ready');
  lateError();assert.equal(runtime.previewStatus,'ready','An old decode error must not poison a newer source');
  const failedSwap=runtime.replaceDesktopMedia({...firstVideo,url:'pixel-media://library/failed-swap'});
  assert.equal(runtime.previewStatus,'ready','Keep reporting the valid preview while its replacement decodes');
  desktop.nodes.filter(node=>node.tag==='video').at(-1).onerror();
  await assert.rejects(failedSwap,/Unable to decode/);
  assert.equal(runtime.previewStatus,'ready','A failed replacement must retain the working preview');
  mode.value='wave';mode.dispatchEvent({type:'change'});
  mode.value='file';mode.dispatchEvent({type:'change'});
  const failedFirst=runtime.replaceDesktopMedia({...firstVideo,url:'pixel-media://library/failed-first'});
  assert.equal(runtime.previewStatus,'loading');
  desktop.nodes.filter(node=>node.tag==='video').at(-1).onerror();
  await assert.rejects(failedFirst,/Unable to decode/);
  assert.equal(runtime.previewStatus,'error');
  mode.value='wave';mode.dispatchEvent({type:'change'});
  const animations=dw.PixelStudioAnimations;
  dw.PixelStudioAnimations={...animations,draw(){throw new Error('Mock preview failure');}};
  tickPreview();assert.equal(runtime.previewStatus,'error');
  dw.PixelStudioAnimations=animations;
  mode.value='clock';mode.dispatchEvent({type:'change'});
  assert.equal(runtime.previewStatus,'ready');
  assert.equal(runtime.playing,false,'Preview status tracking must never start output');
  for(const fn of desktop.events.get('pagehide')||[])fn();assert.equal(desktop.timers.size,0);
  console.log('PASS preview states: empty, pending metadata/decode, ready, failure, recovery, stale callbacks and retained-source replacement.');
  console.log('PASS desktop decoded-media handoff, output-off video preview, stop without rewind, late decode, stale selection and image preview.');

  // Reordered catalogs must not require changing a hard-coded startup animation.
  const reordered=environment(),reorderedContext=vm.createContext(reordered.window);
  for(const name of modules)vm.runInContext(load(name),reorderedContext,{filename:name});
  const catalog=reordered.window.PixelStudioAnimationCatalog;
  reordered.window.PixelStudioAnimationCatalog={...catalog,galleryModes:['fire',...catalog.galleryModes.filter(id=>id!=='fire')]};
  reordered.ids.get('animationMode').value='rainbow';
  vm.runInContext(load('pixel-animation-runtime.js'),reorderedContext,{filename:'pixel-animation-runtime.js'});
  assert.equal(reordered.ids.get('animationMode').value,'fire');
  assert.equal(reordered.ids.get('animationGallery').children[0].attributes['aria-pressed'],'true');
  assert.equal(reordered.window.pixelStudioWebRuntime.playing,false);
  for(const fn of reordered.events.get('pagehide')||[])fn();
  assert.equal(reordered.timers.size,0);
  console.log('PASS catalog-driven Web/Desktop defaults, reordered catalog, and name-free bilingual animation status.');

  // Playback clock and generation invalidation with a fake output dependency.
  const playbackFactory=require('../pixel-browser-playback.cjs');let sent=0,prepares=0;
  let prepare=async()=>({ready:true});
  const outputSession={prepareOutput:(...args)=>{prepares++;return prepare(...args);},resetStats(){},resetFrameCache(){},stopOutput(){},sendOutputFrame:async()=>{sent++;}};
  const ui={fps:env.ids.get('fps')};
  const content={kind:'animation',ready:true,prepare(){},readFrame:()=>new Uint8Array(1215)};
  const player=playbackFactory({window:env.window,ui,content,outputSession,withNum:(v,f)=>parseInt(v,10)||f,
    clampFpsForCurrentMode:()=>60,setStatus(){}});
  assert.equal(prepares,0,'Constructing a player must not check or open a connection');
  env.setNow(1000);assert.equal(player.getAnimationTime(),1);player.state.animationSpeed=2;env.setNow(2000);assert.equal(player.getAnimationTime(),3);
  await player.startLoop();await new Promise(resolve=>setImmediate(resolve));assert.equal(sent,1);assert.equal(player.state.running,true);
  const late=[...env.timers.values()][0];player.stopLoop();late.fn();await new Promise(resolve=>setImmediate(resolve));assert.equal(sent,1);assert.equal(env.timers.size,0);
  env.setNow(2500);assert.equal(player.getAnimationTime(),4,'Stopping output must not reset or freeze content time');
  content.readFrame=()=>{throw new Error('无法生成动态帧');};
  await player.startLoop();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(player.state.running,false);assert.equal(sent,1);assert.equal(env.timers.size,0);
  const beforeUnavailable=prepares;content.ready=false;await player.startLoop();
  assert.equal(prepares,beforeUnavailable,'No content means no connection attempt');
  content.ready=true;content.readFrame=()=>new Uint8Array(1215);
  const preparing=deferred();let stillCurrent;
  prepare=async(_options,current)=>{stillCurrent=current;await preparing.promise;return {ready:true};};
  const pendingStart=player.startLoop();player.stopLoop();assert.equal(stillCurrent(),false);
  preparing.resolve();await pendingStart;assert.equal(sent,1);assert.equal(player.state.running,false);
  prepare=async()=>({ready:false,error:'Mock unavailable output'});await player.startLoop();assert.equal(sent,1);assert.equal(player.state.running,false);
  prepare=async()=>{throw new Error('Mock connection failure');};await player.startLoop();assert.equal(player.state.running,false);
  assert.equal(env.timers.size,0);

  // Real runtime button wiring with a fake replacement connection and frame sink.
  const buttons=environment(),bw=buttons.window,buttonContext=vm.createContext(bw);
  for(const name of modules)vm.runInContext(load(name),buttonContext,{filename:name});
  buttons.ids.get('controlMode').value='serial';buttons.ids.get('animationMode').value='wave';
  const createOutput=bw.PixelStudioBrowserOutput.create;let buttonFrames=0,connectionGate;
  bw.PixelStudioBrowserOutput.create=options=>{
    const adapter=createOutput(options),writer={};adapter.state.writer=writer;adapter.state.serialLab.confirmedWriter=writer;
    adapter.sendOutputFrame=async()=>{buttonFrames++;};
    adapter.connect=async()=>{if(connectionGate)await connectionGate.promise;options.stopBtn(false);};
    return adapter;
  };
  vm.runInContext(load('pixel-animation-runtime.js'),buttonContext,{filename:'pixel-animation-runtime.js'});
  buttons.ids.get('startBtn').dispatchEvent({type:'click'});await flush();assert.equal(bw.pixelStudioWebRuntime.playing,true);assert.equal(buttonFrames,1);
  buttons.ids.get('animationMode').value='wave';buttons.ids.get('animationMode').dispatchEvent({type:'change'});
  assert.equal(buttons.ids.get('status').textContent,'正在发送','Output status must not repeat the animation title');
  assert.equal(bw.pixelStudioWebRuntime.playing,true);
  buttons.ids.get('connectBtn').dispatchEvent({type:'click'});await flush();assert.equal(bw.pixelStudioWebRuntime.playing,false);assert.equal(buttonFrames,1,'Changing the connection must not restart output');
  buttons.ids.get('startBtn').dispatchEvent({type:'click'});await flush();assert.equal(buttonFrames,2);
  connectionGate=deferred();buttons.ids.get('connectBtn').dispatchEvent({type:'click'});buttons.ids.get('stopBtn').dispatchEvent({type:'click'});
  connectionGate.resolve();await flush();assert.equal(bw.pixelStudioWebRuntime.playing,false);assert.equal(buttonFrames,2,'A late connection must not undo stop');
  assert.equal(buttons.timers.size,1,'Connection and output changes retain the preview timer');
  for(const fn of buttons.events.get('pagehide')||[])fn();assert.equal(buttons.timers.size,0);

  // Output adapter owns fake serial reader/writer and preserves read-only device queries and Adalight output.
  const outEnv=environment(),w=outEnv.window,notices=[],requests=[],writes=[];let closeCount=0,waiting,writeGate,profileGate,outputMode='wave',outputStops=0;
  w.PixelStudioFramePipeline=require('../pixel-frame-pipeline.cjs');w.PixelStudioOutputProtocols=require('../pixel-output-protocols.cjs');
  w.fetch=async(url,options)=>{requests.push({url,options});if(profileGate)await profileGate.promise;return new Response(JSON.stringify(url.endsWith('/json/si')?{info:{arch:'esp32',ver:'mock',leds:{matrix:{w:15,h:27}}}}:{light:{gc:{col:2.8}},if:{live:{'no-gc':false}}}));};
  const reader={read:()=>new Promise(resolve=>waiting=resolve),cancel:async()=>{waiting?.({done:true});},releaseLock(){}};
  const writer={write:async(bytes)=>{writes.push(bytes);if(new TextDecoder().decode(bytes)==='v')waiting?.({value:new TextEncoder().encode('WLED mock\n'),done:false});else if(writeGate)await writeGate.promise;},releaseLock(){}};
  const port={open:async()=>{},close:async()=>{closeCount++;},getInfo:()=>({usbVendorId:0x303a,usbProductId:0x1001}),writable:{getWriter:()=>writer},readable:{getReader:()=>reader}};
  w.navigator.serial={requestPort:async()=>port};outEnv.ids.get('controlMode').value='serial';outEnv.ids.get('protocol').value='adalight';outEnv.ids.get('wledHost').value='http://192.168.1.100';
  const outUi=Object.fromEntries(['controlMode','protocol','wledHost','baudRate','fps','mapping'].map(n=>[n,outEnv.ids.get(n)]));
  const state={running:false,animationSpeed:1};
  const output=require('../pixel-browser-output.cjs')({window:w,ui:outUi,playback:state,animationCatalog:{wave:['classic',false]},getFrameConfig:()=>({w:15,h:27,d:255}),getAnimationMode:()=>outputMode,
    withNum:(v,f)=>parseInt(v,10)||f,setStatus:(...args)=>notices.push(args),logLine(){},stopLoop(){outputStops++;},stopBtn(){outputStops++;}});
  await output.connect();assert.equal(output.state.writer,writer);await output.testSerial();assert.equal(output.state.serialLab.confirmedWriter,writer);
  assert.equal((await output.prepareOutput()).ready,true);
  w.navigator.serial.requestPort=async()=>{throw Object.assign(new Error('Cancelled'),{name:'NotFoundError'});};
  await output.connect();assert.equal(output.state.writer,writer);assert.equal(output.state.serialLab.confirmedWriter,writer,'Cancelling the chooser must retain the active handshake');
  const rgb=new Uint8Array(1215).fill(127);await output.sendFrameAdalight(rgb);assert.equal(writes.at(-1).length,1221);assert.deepEqual(Array.from(writes.at(-1).slice(0,3)),[65,100,97]);
  outputMode='file';writeGate=deferred();
  const writing=output.sendFrameAdalight(rgb);assert.equal(output.state.serialLab.busy,true);output.stopOutput();
  writeGate.resolve();await writing;writeGate=null;
  assert.equal(output.state.serialLab.heldFrame,null,'Late writes must not rearm image output after stop');assert.equal(outEnv.timers.size,0);
  await output.sendFrameAdalight(rgb);assert(output.state.serialLab.heldFrame);output.stopOutput();assert.equal(outEnv.timers.size,0,'Explicitly sending again may create a new keepalive, which stop cancels');
  outUi.wledHost.value='http://192.168.1.101';profileGate=deferred();const beforeProfile=writes.length;
  const readingProfile=output.sendFrameAdalight(rgb);output.stopOutput();profileGate.resolve();await readingProfile;profileGate=null;
  assert.equal(writes.length,beforeProfile,'Stopping during device metadata lookup must prevent the later frame write');assert.equal(outEnv.timers.size,0);
  state.running=true;outUi.controlMode.value='ddp';
  await output.disconnect();assert.equal(output.state.writer,null);assert.equal(closeCount,1);assert.equal(outEnv.timers.size,0);
  assert.equal(outputStops,0,'Closing an idle serial port must not stop an independent DDP output');
  console.log('PASS output adapter readiness, connection-only buttons, cancelled chooser, stop during readiness/write/profile lookup and independent output routes.');
  console.log('PASS: assembled page bootstrap and gallery/mode events; playback clock, stop generation and timer cleanup; fake serial handshake, Adalight send and disconnect. No real UI/devices tested.');
}

async function connectionLifecycleTests(){
  function makePort({openGate,closeGate,withReader=false,failReader=false}={}){
    const state={opened:false,opens:0,closes:0,writerLocks:0,writerReleases:0,readerCancels:0,writes:0};
    let waiting;
    const writer={write:async()=>{state.writes++;},releaseLock(){state.writerReleases++;}};
    const reader={read:()=>new Promise(resolve=>{waiting=resolve;}),cancel:async()=>{state.readerCancels++;waiting?.({done:true});},releaseLock(){}};
    const port={
      async open(){state.opens++;if(openGate)await openGate.promise;state.opened=true;},
      async close(){assert(state.opened,'Only an opened port may be closed');if(closeGate)await closeGate.promise;state.opened=false;state.closes++;},
      getInfo:()=>({usbVendorId:0x303a,usbProductId:0x1001}),
      writable:{getWriter(){state.writerLocks++;return writer;}},
      readable:withReader||failReader?{getReader(){if(failReader)throw new Error('Mock reader lock failure');return reader;}}:null
    };
    return {port,writer,state};
  }
  function fixture(prepareGate){
    const env=environment(),window=env.window,notices=[],state={running:false,animationSpeed:1};
    let requested=0,confirmed=0,stopped=0;
    const choice={select:async()=>{throw new Error('No fake port selected');}};
    window.navigator.serial={requestPort:()=>{requested++;return choice.select();}};
    window.pixelStudioDesktop={prepareSerialSelection:async()=>{if(prepareGate)await prepareGate.promise;},confirmSerialConnection:async()=>{confirmed++;}};
    for(const [id,value]of Object.entries({controlMode:'serial',protocol:'adalight',wledHost:'http://192.168.1.100',baudRate:'115200'}))env.ids.get(id).value=value;
    const ui=Object.fromEntries(['controlMode','protocol','wledHost','baudRate','fps','mapping'].map(id=>[id,env.ids.get(id)]));
    const output=require('../pixel-browser-output.cjs')({window,ui,playback:state,animationCatalog:{wave:['classic',false]},
      getFrameConfig:()=>({w:15,h:27,d:255}),getAnimationMode:()=> 'wave',withNum:(v,f)=>parseInt(v,10)||f,
      setStatus:(...args)=>notices.push(args),logLine(){},stopLoop(){stopped++;state.running=false;},stopBtn(){stopped++;state.running=false;}});
    return {env,ui,state,choice,output,notices,get requested(){return requested;},get confirmed(){return confirmed;},get stopped(){return stopped;}};
  }

  {
    const f=fixture(),gate=deferred(),p=makePort();f.choice.select=async()=>{await gate.promise;return p.port;};
    const pending=f.output.connect();await flush();await f.output.disconnect();gate.resolve();await pending;
    assert.equal(p.state.opens,0,'A selection returned after disconnect must not open the port');
    assert.equal(f.output.state.writer,null);assert.equal(f.confirmed,0);assert.equal(f.notices.at(-1)[0],'已断开');
  }
  {
    const f=fixture(),gate=deferred(),p=makePort({openGate:gate});f.choice.select=async()=>p.port;
    const pending=f.output.connect();await flush();assert.equal(p.state.opens,1);await f.output.disconnect();gate.resolve();await pending;
    assert.equal(p.state.opened,false,'An open completed after disconnect must be cleaned up');
    assert.equal(p.state.closes,1);assert.equal(p.state.writerLocks,0);assert.equal(f.output.state.port,null);assert.equal(f.confirmed,0);
    assert.equal(f.notices.at(-1)[0],'已断开','A cancelled attempt must not replace the disconnected status with an error');
  }
  {
    const gate=deferred(),f=fixture(gate),p=makePort();f.choice.select=async()=>p.port;
    const pending=f.output.connect();await flush();await f.output.disconnect();gate.resolve();await pending;
    assert.equal(f.requested,0,'Cancelled desktop preparation must not open a chooser afterward');assert.equal(p.state.opens,0);
  }
  {
    const f=fixture(),gate=deferred(),p=makePort({openGate:gate});f.choice.select=async()=>p.port;
    const pending=f.output.connect();await flush();f.output.stopOutput();gate.resolve();await pending;
    assert.equal(f.output.state.writer,p.writer,'Stopping output must not cancel a pending connection');
    f.output.stopOutput();assert.equal(f.output.state.writer,p.writer,'Stopping output must retain an established connection');
    assert.equal(f.confirmed,1);assert.equal(p.state.writes,0);await f.output.disconnect();assert.equal(p.state.closes,1);
  }
  {
    const f=fixture(),first=makePort({withReader:true}),second=makePort(),choiceGate=deferred();
    f.choice.select=async()=>first.port;await f.output.connect();f.state.running=true;
    f.choice.select=async()=>{await choiceGate.promise;return second.port;};
    const replacement=f.output.connect();await flush();assert.equal(f.output.state.writer,first.writer,'Keep the old connection while the chooser is open');
    choiceGate.resolve();await replacement;
    assert.equal(first.state.closes,1);assert.equal(first.state.readerCancels,1);assert.equal(first.state.writerReleases,1);
    assert.equal(f.output.state.writer,second.writer);assert.equal(f.state.running,false);assert.equal(second.state.writes,0);
    assert.equal(f.confirmed,2);await f.output.disconnect();assert.equal(second.state.closes,1);
  }
  {
    const f=fixture(),closeGate=deferred(),first=makePort({closeGate}),second=makePort();
    f.choice.select=async()=>first.port;await f.output.connect();f.choice.select=async()=>second.port;
    const replacement=f.output.connect();await flush();const disconnecting=f.output.disconnect();closeGate.resolve();
    await Promise.all([replacement,disconnecting]);
    assert.equal(second.state.opens,0,'Disconnect during replacement cleanup must cancel the new open');
    assert.equal(first.state.closes,1);assert.equal(f.output.state.writer,null);assert.equal(f.confirmed,1);
  }
  {
    const f=fixture(),closeGate=deferred(),first=makePort({closeGate,withReader:true}),second=makePort();
    f.choice.select=async()=>first.port;await f.output.connect();const disconnecting=f.output.disconnect();
    assert.equal(f.output.state.writer,null,'An old connection is detached before asynchronous cleanup');
    f.choice.select=async()=>second.port;const reconnecting=f.output.connect();await flush();
    assert.equal(second.state.opens,0,'A new open must wait for the old cleanup');
    closeGate.resolve();await Promise.all([disconnecting,reconnecting]);
    assert.equal(first.state.closes,1);assert.equal(f.output.state.writer,second.writer);assert.equal(second.state.closes,0);
    assert.match(f.notices.at(-1)[0],/^已连接/,'Old disconnect must not overwrite the new connection status');
    await f.output.disconnect();assert.equal(second.state.closes,1);
  }
  {
    const f=fixture(),gate=deferred(),p=makePort({closeGate:gate});f.choice.select=async()=>p.port;await f.output.connect();
    const first=f.output.disconnect(),second=f.output.disconnect();await flush();gate.resolve();await Promise.all([first,second]);
    assert.equal(p.state.closes,1,'Concurrent disconnects must release the old port only once');assert.equal(p.state.writerReleases,1);
  }
  {
    const f=fixture(),gate=deferred(),p=makePort({openGate:gate});f.choice.select=async()=>p.port;
    const pending=f.output.connect();await flush();
    f.ui.controlMode.value='ddp';f.ui.controlMode.dispatchEvent({type:'change'});
    f.ui.controlMode.value='serial';f.ui.controlMode.dispatchEvent({type:'change'});
    gate.resolve();await pending;
    assert.equal(f.output.state.writer,null,'Switching routes and back must not revive the old connection attempt');
    assert.equal(p.state.closes,1);assert.equal(f.confirmed,0);
  }
  {
    const f=fixture(),p=makePort({failReader:true});f.choice.select=async()=>p.port;await f.output.connect();
    assert.equal(f.output.state.writer,null);assert.equal(p.state.writerReleases,1);assert.equal(p.state.closes,1);assert.equal(f.confirmed,0);
    assert.match(f.notices.at(-1)[0],/Mock reader lock failure/);
  }
  console.log('PASS 10 serial lifecycle scenarios: stale chooser/open/preparation, output-stop independence, replacement, reconnect, concurrent release, route changes and partial setup cleanup. All ports are fake.');
}
const deadline=setTimeout(()=>{console.error('Browser module tests timed out');process.exitCode=1;},15000);
run().then(connectionLifecycleTests).catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(deadline));
