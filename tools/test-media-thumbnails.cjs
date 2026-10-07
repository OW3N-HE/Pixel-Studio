'use strict';
// Isolated DOM, decoding, IPC and timers. No Electron, files, codecs or devices.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'desktop','media-thumbnails.js'),'utf8');
const librarySource=fs.readFileSync(path.join(root,'desktop','media-library-ui.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const file=(id,type='image/png')=>({id,type,name:id,size:10,lastModified:1});
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function fixture(){
  const requests=[],decoders=[],canvases=[],timers=new Map(),observed=new Set();
  let callback,timerId=0,read=id=>({ok:true,url:'pixel-media://library/'+id});
  class Media{
    constructor(video=false){
      Object.assign(this,{video,src:'',naturalWidth:15,naturalHeight:27,videoWidth:15,videoHeight:27,duration:10,currentTime:0,pauses:0,loads:0});
      decoders.push(this);
    }
    pause(){this.pauses++;}
    removeAttribute(name){if(name==='src')this.src='';}
    load(){this.loads++;}
  }
  const document={createElement(tag){
    if(tag==='video')return new Media(true);
    assert.equal(tag,'canvas');
    const context={fillRect(){},drawImage(...args){this.draw=args;}};
    const canvas={context,width:0,height:0,getContext:()=>context,toDataURL(mime,quality){
      this.mime=mime;this.quality=quality;return 'data:'+mime+';base64,fixture'+canvases.indexOf(this);
    }};
    canvases.push(canvas);return canvas;
  }};
  const window={};
  vm.runInNewContext(source,{window,document,Image:Media,
    IntersectionObserver:class{
      constructor(fn){callback=fn;}
      observe(image){observed.add(image);}
      unobserve(image){observed.delete(image);}
      disconnect(){observed.clear();}
    },
    setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},
    clearTimeout:id=>timers.delete(id)
  },{filename:'desktop/media-thumbnails.js'});
  const api=window.pixelStudioMediaThumbnails.create({}, {mediaFile:async id=>{requests.push(id);return read(id);}});
  return {api,requests,decoders,canvases,timers,observed,
    setRead:fn=>{read=fn;},
    card(value){
      const image={isConnected:true,style:{},hidden:true,src:''},placeholder={hidden:false};
      api.observe(value,image,placeholder);return {image,placeholder};
    },
    reveal(...cards){callback(cards.map(card=>({target:card.image,isIntersecting:true})));},
    finish(media=decoders.at(-1),w=15,h=27){
      if(media.video){media.videoWidth=w;media.videoHeight=h;media.onloadeddata();media.onseeked?.();}
      else{media.naturalWidth=w;media.naturalHeight=h;media.onload();}
    }
  };
}
async function scalingAndCache(){
  const f=fixture(),cases=[
    {file:file('pixel-image'),w:15,h:27,pixelated:true},
    {file:file('pixel-video','video/mp4'),w:15,h:27,pixelated:true},
    {file:file('photo'),w:1920,h:1080,pixelated:false}
  ];
  for(const item of cases){
    const card=f.card(item.file);f.reveal(card);await flush();f.finish(undefined,item.w,item.h);await flush();
    assert.equal(card.image.hidden,false);assert.equal(card.placeholder.hidden,true);
    assert.equal(card.image.style.imageRendering,item.pixelated?'pixelated':'auto');
    const canvas=f.canvases.at(-1);
    assert.equal(canvas.context.imageSmoothingEnabled,!item.pixelated);
    assert.equal(canvas.mime,item.pixelated?'image/png':'image/jpeg');
    const scale=Math.min(300/item.w,540/item.h),dw=item.w*scale,dh=item.h*scale;
    assert.deepEqual(canvas.context.draw.slice(1),[Math.floor((300-dw)/2),Math.floor((540-dh)/2),dw,dh]);
    item.url=card.image.src;
  }
  assert.equal(f.decoders[1].currentTime,1);assert.equal(f.decoders[1].pauses,1);assert.equal(f.decoders[1].loads,1);
  f.api.reset({retryFailed:true});
  for(const item of cases)assert.equal(f.card(item.file).image.src,item.url,'Successful thumbnails survive manual refresh');
  assert.equal(f.requests.length,3);assert.equal(f.observed.size,0);assert.equal(f.timers.size,0);
  const changed=f.card({...cases[0].file,lastModified:2});f.reveal(changed);await flush();
  assert.equal(f.requests.length,4,'Changed file metadata invalidates its cached thumbnail');
  f.finish();await flush();f.api.dispose();
}
async function failureRetry(){
  for(const failure of ['ipc','decode','timeout']){
    const f=fixture(),value=file('retry-'+failure,'video/mp4');
    if(failure==='ipc')f.setRead(()=>({ok:false,error:'Temporary file failure'}));
    const first=f.card(value);f.reveal(first);await flush();
    if(failure==='decode')f.decoders.at(-1).onerror();
    if(failure==='timeout'){
      const [id,timer]=f.timers.entries().next().value;f.timers.delete(id);timer.fn();
    }
    await flush();assert.equal(first.placeholder.hidden,false);assert.equal(f.timers.size,0);
    f.api.reset();const ordinary=f.card(value);
    assert.equal(ordinary.placeholder.hidden,false);assert.equal(f.observed.size,0);
    assert.equal(f.requests.length,1,'Ordinary redraw must not repeatedly decode a failed file');
    f.setRead(id=>({ok:true,url:'pixel-media://library/'+id}));
    f.api.reset({retryFailed:true});const retry=f.card(value);f.reveal(retry);await flush();
    assert.equal(f.requests.length,2,'Manual refresh must retry '+failure+' failures');
    f.finish();await flush();assert.equal(retry.placeholder.hidden,true);f.api.dispose();
  }
}
async function cancellationAndLateResults(){
  const f=fixture(),value=file('active','video/mp4');
  const first=f.card(value),second=f.card(file('second','video/mp4')),queued=f.card(file('queued'));
  f.reveal(first,second,queued);await flush();
  assert.equal(f.decoders.length,2,'At most two decodes may run concurrently');
  f.api.reset({retryFailed:true});await flush();
  assert.equal(f.timers.size,0);assert.equal(f.requests.length,2,'Old queued work must be discarded');
  for(const decoder of f.decoders){assert.equal(decoder.pauses,1);assert.equal(decoder.loads,1);assert.equal(decoder.src,'');assert.equal(decoder.onerror,null);}
  assert.equal(first.placeholder.hidden,false);assert.equal(second.placeholder.hidden,false);
  f.reveal(second);await flush();assert.equal(f.requests.length,2,'Late observer entries must be ignored');
  const replacement=f.card(value);f.reveal(replacement);await flush();
  assert.equal(f.requests.length,3,'Canceled tasks must not add failure-cache entries');
  f.finish();await flush();assert.equal(replacement.placeholder.hidden,true);f.api.dispose();

  const ipc=fixture(),gate=deferred();ipc.setRead(()=>gate.promise);
  const old=ipc.card(file('late'));ipc.reveal(old);await flush();
  ipc.api.reset({retryFailed:true});gate.resolve({ok:true,url:'pixel-media://library/late'});await flush();
  assert.equal(ipc.decoders.length,0,'An IPC reply from an older generation must not start decoding');
  assert.equal(old.placeholder.hidden,false);
  ipc.setRead(id=>({ok:true,url:'pixel-media://library/'+id}));
  const next=ipc.card(file('late'));ipc.reveal(next);await flush();ipc.finish();
  ipc.api.reset();await flush();
  assert.equal(next.placeholder.hidden,false,'A decoded result awaiting delivery must not paint a retired card');
  const fresh=ipc.card(file('late'));ipc.reveal(fresh);await flush();
  assert.equal(ipc.requests.length,3,'A retired decode result must not populate the new generation cache');
  ipc.api.dispose();await flush();assert.equal(ipc.timers.size,0);assert.equal(fresh.placeholder.hidden,false);
}
async function refreshWiring(){
  assert.match(librarySource,/thumbnails\.reset\(\{retryFailed\}\)/,'Render must forward retry policy');
  const start=librarySource.indexOf('    async function refreshLibrary('),end=librarySource.indexOf('    function syncMediaLoadState(',start);
  assert(start>=0&&end>start,'Media library refresh entry point must exist');
  for(const automatic of [false,true])for(const changed of [false,true]){
    const renders=[],library={folder:'fixture',files:[{name:'first.mp4'}],truncated:false};
    const result={...library,files:changed?[{name:'next.mp4'}]:library.files};
    const context={busy:false,error:'',request:0,disposed:false,library,selected:null,libraryDirty:false,
      ordering:{read:(_scope,names)=>names},mediaOrder:[],grid:{scrollTop:30},bridge:{mediaLibrary:async()=>({ok:true,...result})},
      render:({retryFailed=false}={})=>renders.push(retryFailed),
      scheduleLibraryRefresh(){},updateMediaEdges(){},restoreMediaPreview(){},en:()=>true
    };
    vm.runInNewContext(librarySource.slice(start,end)+'\nglobalThis.runRefresh=refreshLibrary;',context);
    await context.runRefresh('scan',automatic);
    assert.equal(context.busy,false);assert.equal(context.grid.scrollTop,30);
    assert.deepEqual(renders,automatic?(changed?[false]:[]):[false,true],'Only explicit refresh should clear failure cache');
  }
}
(async()=>{
  await scalingAndCache();await failureRetry();await cancellationAndLateResults();await refreshWiring();
  console.log('PASS thumbnail scaling, success-cache reuse, IPC/decode/timeout retry, concurrency, cancellation, stale results, disposal and manual/automatic refresh wiring. No real UI/codecs/devices tested.');
})().catch(error=>{console.error(error);process.exitCode=1;});
