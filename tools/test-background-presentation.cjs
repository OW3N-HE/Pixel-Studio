'use strict';
// Isolated clocks, DOM surfaces, Electron IPC and fake frames only.
// No application launch, service changes, sensor reads or controller access.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const root=path.resolve(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function surface(){
  const listeners=new Map();
  return {
    addEventListener(type,callback,options={}){
      if(!listeners.has(type))listeners.set(type,new Map());
      listeners.get(type).set(callback,options);
    },
    removeEventListener(type,callback){listeners.get(type)?.delete(callback);},
    dispatchEvent(event){
      for(const [callback,options] of [...(listeners.get(event.type)||[])]){
        callback(event);
        if(options.once)listeners.get(event.type)?.delete(callback);
      }
      return true;
    }
  };
}
class FakeEvent{constructor(type){this.type=type;}}
function factory(file){
  const module={exports:{}};
  vm.runInNewContext(source(file),{module,exports:module.exports},{filename:file});
  return module.exports;
}
function mediaHarness({desktop=true,visible=true}={}){
  const document=surface(),window=surface(),timers=new Map();
  let now=0,serial=0,encoded=0,drawn=0,mapped=0,mode='rainbow';
  const presentation={visible};
  const nodes=new Map();
  document.hidden=false;
  document.getElementById=id=>{
    if(!nodes.has(id))nodes.set(id,{value:'original',textContent:''});
    return nodes.get(id);
  };
  document.querySelector=()=>null;document.querySelectorAll=()=>[];
  document.createElement=tag=>{
    assert.equal(tag,'canvas');
    const canvas={width:0,height:0};
    const context={
      setTransform(){},clearRect(){},fillRect(){},drawImage(){},
      getImageData(){return {data:new Uint8ClampedArray(canvas.width*canvas.height*4)};}
    };
    canvas.getContext=()=>context;
    canvas.toDataURL=()=>{encoded++;return 'data:image/png;fixture,'+encoded;};
    return canvas;
  };
  const ui={
    preview:{style:{},src:'',closest:()=>({clientWidth:380,clientHeight:486})},
    mapping:{value:'row'},scaleMode:{value:'fit'},fps:{value:'60'}
  };
  Object.assign(window,{
    document,innerWidth:1280,performance:{now:()=>now},URL:{revokeObjectURL(){},createObjectURL:()=>''},
    Image:class{},PixelStudioAnimations:{draw(){drawn++;return true;}},
    PixelStudioFramePipeline:{paletteModes:[]},
    PixelStudioFrameMapping:{fromRgba(){mapped++;return new Uint8Array(15*27*3);}},
    setTimeout(callback,ms){const id=++serial;timers.set(id,{callback,at:now+ms});return id;},
    clearTimeout(id){timers.delete(id);}
  });
  if(desktop)window.pixelStudioDesktop={edition:true,isPresentationVisible:()=>presentation.visible};
  const media=factory('pixel-browser-media.cjs')({
    window,ui,getFrameConfig:()=>({w:15,h:27,d:405}),
    getAnimationMode:()=>mode,getAnimationTime:()=>now/1000,setStatus(){}
  });
  return {
    window,document,ui,media,timers,
    get encoded(){return encoded;},get drawn(){return drawn;},get mapped(){return mapped;},
    nativeVisibility(value){presentation.visible=value;window.dispatchEvent(new FakeEvent('pixel-studio-presentation-change'));},
    webVisibility(hidden){document.hidden=hidden;document.dispatchEvent(new FakeEvent('visibilitychange'));},
    setMode(value){mode=value;},
    async advance(ms){
      const end=now+ms;
      for(;;){
        const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!next)break;
        now=next[1].at;timers.delete(next[0]);next[1].callback();await flush();
      }
      now=end;await flush();
    }
  };
}
function nativeMain(){
  const main=source('desktop/main.cjs'),events=new Map(),sent=[];
  const win={
    visible:true,minimized:false,destroyed:false,
    isVisible(){return this.visible;},isMinimized(){return this.minimized;},
    isDestroyed(){return this.destroyed;},
    on(name,callback){events.set(name,callback);},
    webContents:{mainFrame:{},send(channel,value){sent.push({channel,value});}}
  };
  let trusted=true,handler;
  const context={window:win,quitting:false,Boolean,
    ownPage:contents=>trusted&&contents===win.webContents,
    ipcMain:{handle(channel,callback){assert.equal(channel,'desktop:presentation');handler=callback;}}
  };
  const begin=main.indexOf('function presentationVisible()');
  const end=main.indexOf('function save()',begin);
  assert(begin>=0&&end>begin);
  vm.runInNewContext(main.slice(begin,end),context);
  const eventsCode=main.match(/for\(const event of \['show','hide','minimize','restore'\]\)window\.on\(event,notifyPresentation\);/);
  const ipcCode=main.match(/ipcMain\.handle\('desktop:presentation',event=>\{[\s\S]*?\n    \}\);/);
  assert(eventsCode&&ipcCode,'Native visibility notifications and a trusted startup query are required');
  vm.runInNewContext(eventsCode[0]+'\n'+ipcCode[0],context);
  const event={sender:win.webContents,senderFrame:win.webContents.mainFrame};
  assert.equal(handler(event),true);
  win.minimized=true;events.get('minimize')();assert.equal(sent.at(-1).value,false);
  win.minimized=false;events.get('restore')();assert.equal(sent.at(-1).value,true);
  win.visible=false;events.get('hide')();assert.equal(sent.at(-1).value,false);
  events.get('restore')();assert.equal(sent.at(-1).value,false,'Restore does not imply a hidden window was shown');
  win.visible=true;events.get('show')();assert.equal(sent.at(-1).value,true);
  assert(sent.every(value=>value.channel==='desktop:presentation'));
  assert.throws(()=>handler({...event,senderFrame:{}}),/Untrusted caller/);
  trusted=false;assert.throws(()=>handler(event),/Untrusted caller/);
  const count=sent.length;events.get('show')();assert.equal(sent.length,count,'Never notify a foreign page');
  trusted=true;context.quitting=true;assert.equal(handler(event),false);
}
async function preloadState(){
  async function harness(){
    const window=surface(),document=surface(),ipcRenderer=new EventEmitter();
    let api,resolveInitial,changes=0;
    const initial=new Promise(resolve=>{resolveInitial=resolve;});
    ipcRenderer.invoke=channel=>{assert.equal(channel,'desktop:presentation');return initial;};
    window.addEventListener('pixel-studio-presentation-change',()=>changes++);
    vm.runInNewContext(source('desktop/preload.cjs'),{
      window,document,Event:FakeEvent,CustomEvent:FakeEvent,process:{argv:[]},
      require:()=>({ipcRenderer,contextBridge:{exposeInMainWorld(_name,value){api=value;}}})
    });
    return {window,ipcRenderer,api,resolveInitial,get changes(){return changes;}};
  }
  const race=await harness();
  assert.equal(race.api.isPresentationVisible(),false,'Hidden until native startup state is known');
  race.ipcRenderer.emit('desktop:presentation',{},true);
  race.resolveInitial(false);await flush();
  assert.equal(race.api.isPresentationVisible(),true,'A stale startup reply cannot overwrite a newer show event');
  race.ipcRenderer.emit('desktop:presentation',{},true);assert.equal(race.changes,1,'Duplicate native events do not restart presentation loops');
  race.ipcRenderer.emit('desktop:presentation',{},false);assert.equal(race.api.isPresentationVisible(),false);
  race.window.dispatchEvent(new FakeEvent('pagehide'));
  assert.equal(race.ipcRenderer.listenerCount('desktop:presentation'),0);
  race.ipcRenderer.emit('desktop:presentation',{},true);assert.equal(race.api.isPresentationVisible(),false);
  const startup=await harness();
  startup.resolveInitial(true);await flush();assert.equal(startup.api.isPresentationVisible(),true);
  startup.window.dispatchEvent(new FakeEvent('pagehide'));
}
async function mediaLifecycle(){
  const visible=mediaHarness();
  visible.media.startAnimationPreview();assert.equal(visible.encoded,1);assert.equal(visible.timers.size,1);
  visible.nativeVisibility(false);
  assert.equal(visible.document.hidden,false,'Electron can report visible while the native window is hidden');
  assert.equal(visible.timers.size,0,'No recurring preview wakeups while hidden');
  await visible.advance(1000);assert.equal(visible.encoded,1);
  const renders=visible.drawn;assert.equal(visible.media.frameSource.readFrame().length,15*27*3);
  assert.equal(visible.drawn,renders+1,'Output still receives a freshly rendered frame');
  assert.equal(visible.encoded,1,'Output must not encode an invisible preview PNG');
  visible.nativeVisibility(true);assert.equal(visible.encoded,2);assert.equal(visible.timers.size,1);
  visible.media.stopAnimationPreview();visible.nativeVisibility(false);visible.nativeVisibility(true);
  assert.equal(visible.timers.size,0,'A stopped preview is not revived by visibility');
  const hidden=mediaHarness({visible:false});
  hidden.media.startAnimationPreview();assert.equal(hidden.encoded,0);assert.equal(hidden.timers.size,0);
  hidden.nativeVisibility(true);assert.equal(hidden.encoded,1);
  hidden.window.dispatchEvent(new FakeEvent('pagehide'));hidden.nativeVisibility(true);
  assert.equal(hidden.timers.size,0);
  const web=mediaHarness({desktop:false});
  web.media.startAnimationPreview();web.webVisibility(true);assert.equal(web.timers.size,0);
  await web.advance(1000);assert.equal(web.encoded,1);
  web.webVisibility(false);assert.equal(web.encoded,2);web.media.stopAnimationPreview();
  const image=mediaHarness({visible:false});
  image.setMode('file');image.media.state.mediaObj={complete:true,naturalWidth:15,naturalHeight:27};
  image.media.state.mediaType='image';image.media.updatePreviewByMode();image.media.startAnimationPreview();
  assert.equal(image.encoded,0);image.nativeVisibility(true);assert.equal(image.encoded,1,'Restore paints an image selected while hidden');
  image.media.stopAnimationPreview();
}
async function continuousOutput(){
  const h=mediaHarness({visible:false});let frames=0;
  h.media.startAnimationPreview();
  const player=factory('pixel-browser-playback.cjs')({
    window:h.window,ui:h.ui,content:h.media.frameSource,
    outputSession:{async prepareOutput(){return {ready:true};},resetFrameCache(){},resetStats(){},async sendOutputFrame(){frames++;},stopOutput(){}},
    withNum:(value,fallback)=>Number(value)||fallback,clampFpsForCurrentMode:value=>value,setStatus(){}
  });
  await player.startLoop();await flush();await h.advance(500);
  assert(player.state.running);assert(frames>=29&&frames<=32,'Hidden output retains the requested 60 FPS cadence');
  assert.equal(h.encoded,0,'No presentation PNGs during background output');
  const before=frames;h.nativeVisibility(true);await h.advance(100);assert(frames>before);
  player.stopLoop('fixture cleanup');h.media.stopAnimationPreview();assert.equal(h.timers.size,0);
}
async function run(){
  nativeMain();await preloadState();await mediaLifecycle();await continuousOutput();
  console.log('PASS native minimized/tray visibility, trusted IPC, stale startup response, hidden-preview suspension, restore/stop cleanup, browser visibility, static images and unchanged 60 FPS fake output. No real UI, devices, sensors or CPU/GPU measurements.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});

