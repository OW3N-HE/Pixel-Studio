'use strict';
// Fake DOM, media, serial and HTTP/WS. No browser profile, device or network access.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
const createCanvas=require('../pixel-rgb-canvas.cjs');
function environment(){
  let now=0,id=0,dataUrlCalls=0;const timers=new Map(),nodes=[],ids=new Map(),events=new Map(),documentEvents=new Map();
  class Element{
    constructor(tag='div'){Object.assign(this,{tag,value:'',type:'',style:{setProperty(){}},dataset:{},children:[],options:[],textContent:'',files:[],checked:false,hidden:false,attributes:{},listeners:new Map()});nodes.push(this);this.classList={add(){},remove(){},toggle(){}};}
    addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}
    dispatchEvent(event){for(const fn of this.listeners.get(event.type)||[])fn({...event,target:this});return true;}
    append(...children){this.children.push(...children);}
    setAttribute(name,value){this.attributes[name]=value;}
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
    Image:class{},MutationObserver:class{observe(){}},Event:class{constructor(type){this.type=type;}},
    crypto:{randomUUID:()=> 'mock-client-000000000000000'},
    addEventListener:(name,fn)=>{const list=events.get(name)||[];list.push(fn);events.set(name,list);},
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key),
    setInterval:(fn,ms)=>{timers.set(++id,{fn,ms,interval:true});return id;},clearInterval:key=>timers.delete(key),
    fetch:async()=>{throw Error('Unexpected mock network request');}};
  window.window=window;
  return {window,ids,timers,events,documentEvents,get dataUrlCalls(){return dataUrlCalls;},setNow:value=>now=value};
}
async function run(){
  const env=environment(),context=vm.createContext(env.window);
  const modules=['pixel-temperature.cjs','pixel-rgb-canvas.cjs','pixel-clock-renderer.cjs','pixel-animation-designs.cjs','pixel-animation-catalog.cjs','pixel-animation-engine.cjs','pixel-output-protocols.cjs','pixel-render-settings.cjs','pixel-frame-mapping.cjs','pixel-frame-pipeline.cjs','pixel-circuit-palette.cjs','pixel-browser-media.cjs','pixel-browser-playback.cjs','pixel-browser-output.cjs'];
  for(const name of modules)vm.runInContext(load(name),context,{filename:name});
  vm.runInContext(load('pixel-animation-runtime.js'),context,{filename:'pixel-animation-runtime.js'});
  assert(env.window.pixelStudioWebRuntime);assert.equal(env.window.pixelStudioWebRuntime.playing,false);
  assert(env.ids.get('animationGallery').children.length>0);
  for(const mode of ['thermal_icons','clock','wave','fire','thermal_digits']){
    env.ids.get('animationMode').value=mode;env.ids.get('animationMode').dispatchEvent({type:'change'});
    assert.equal(env.ids.get('preview').src,'data:image/png;base64,mock');
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

  // Playback clock and generation invalidation with a fake output dependency.
  const playbackFactory=require('../pixel-browser-playback.cjs');let sent=0;
  const connection={writer:{},serialLab:{confirmedWriter:null},bridgeToken:'mock'},media={mediaObj:null,mediaType:null};
  env.ids.get('controlMode').value='http';env.ids.get('animationMode').value='wave';
  const ui=Object.fromEntries(['controlMode','protocol','fps','progress'].map(n=>[n,env.ids.get(n)]));
  const content={kind:'animation',ready:true,prepare(){},readFrame:()=>new Uint8Array(1215),sendOptions:{skipHttpResponseRead:true}};
  const player=playbackFactory({window:env.window,ui,content,connection,withNum:(v,f)=>parseInt(v,10)||f,
    getAnimationMode:()=>env.ids.get('animationMode').value,getFrameConfig:()=>({w:15,h:27,d:255}),frameBytesForCurrentConfig:()=>1215,
    clampFpsForCurrentMode:()=>60,minIntervalMs:()=>0,setStatus(){},logLine(){},extractFrame:()=>new Uint8Array(1215),buildGeneratedFrame:()=>new Uint8Array(1215),
    applyPreviewAspect(){},stopAnimationPreview(){},sendFrameRaw:async()=>{sent++;},sendFrameWledJson:async()=>{sent++;},isHttpMode:()=>true,isWsMode:()=>false,isDdpMode:()=>false,
    connect:async()=>{},testSerial:async()=>{},getHttpTarget:()=> 'http://192.168.1.100/json/state',resetFrameCache(){},serialStopHold(){},stopDdpPlayback(){}});
  env.setNow(1000);assert.equal(player.getAnimationTime(),1);player.state.animationSpeed=2;env.setNow(2000);assert.equal(player.getAnimationTime(),3);
  await player.startLoop();await new Promise(resolve=>setImmediate(resolve));assert.equal(sent,1);assert.equal(player.state.running,true);
  const late=[...env.timers.values()][0];player.stopLoop();late.fn();await new Promise(resolve=>setImmediate(resolve));assert.equal(sent,1);assert.equal(env.timers.size,0);
  content.readFrame=()=>{throw new Error('无法生成动态帧');};
  await player.startLoop();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(player.state.running,false);assert.equal(sent,1);assert.equal(env.timers.size,0);

  // Output adapter owns fake serial reader/writer and preserves JSON/Adalight routes.
  const outEnv=environment(),w=outEnv.window,notices=[],requests=[],writes=[];let closeCount=0,waiting;
  w.PixelStudioFramePipeline=require('../pixel-frame-pipeline.cjs');w.PixelStudioOutputProtocols=require('../pixel-output-protocols.cjs');
  w.fetch=async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify(url.endsWith('/json/si')?{info:{arch:'esp32',ver:'mock',leds:{matrix:{w:15,h:27}}}}:{light:{gc:{col:2.8}},if:{live:{'no-gc':false}}}));};
  const reader={read:()=>new Promise(resolve=>waiting=resolve),cancel:async()=>{waiting?.({done:true});},releaseLock(){}};
  const writer={write:async(bytes)=>{writes.push(bytes);if(new TextDecoder().decode(bytes)==='v')waiting?.({value:new TextEncoder().encode('WLED mock\n'),done:false});},releaseLock(){}};
  const port={open:async()=>{},close:async()=>{closeCount++;},getInfo:()=>({usbVendorId:0x303a,usbProductId:0x1001}),writable:{getWriter:()=>writer},readable:{getReader:()=>reader}};
  w.navigator.serial={requestPort:async()=>port};outEnv.ids.get('controlMode').value='serial';outEnv.ids.get('protocol').value='adalight';outEnv.ids.get('wledHost').value='http://192.168.1.100';
  const outUi=Object.fromEntries(['controlMode','protocol','wledHost','httpPath','baudRate','fps','mapping'].map(n=>[n,outEnv.ids.get(n)]));
  const state={running:false,playbackGeneration:0,currentFrame:0,animationSpeed:1};
  const output=require('../pixel-browser-output.cjs')({window:w,ui:outUi,playback:state,animationCatalog:{wave:['classic',false]},getFrameConfig:()=>({w:15,h:27,d:255}),getAnimationMode:()=> 'wave',
    withNum:(v,f)=>parseInt(v,10)||f,setStatus:(...args)=>notices.push(args),logLine(){},stopLoop(){},stopBtn(){}});
  await output.connect();assert.equal(output.state.writer,writer);await output.testSerial();assert.equal(output.state.serialLab.confirmedWriter,writer);
  const rgb=new Uint8Array(1215).fill(127);await output.sendFrameAdalight(rgb);assert.equal(writes.at(-1).length,1221);assert.deepEqual(Array.from(writes.at(-1).slice(0,3)),[65,100,97]);
  await output.disconnect();assert.equal(output.state.writer,null);assert.equal(closeCount,1);assert.equal(outEnv.timers.size,0);
  console.log('PASS: assembled page bootstrap and gallery/mode events; playback clock, stop generation and timer cleanup; fake serial handshake, Adalight send and disconnect. No real UI/devices tested.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
