'use strict';
// Static shell and isolated startup/rim checks, not real-browser visual QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const load = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = load('index.html'), ui = load('pixel-studio-web-ui.js');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML ids');
for (const id of ["randomAnimationBtn","previewOnlyBtn","clearPreviewBtn","testRedBtn","testGreenBtn","testBlueBtn","testWhiteBtn","testBlackBtn","nowPlaying","progress"]) {
  assert(!ids.includes(id), 'Obsolete control must not return: ' + id);
  assert(!new RegExp(`(?:\\$|getElementById)\\(\\s*['"]${id}['"]\\s*\\)|querySelector(?:All)?\\(\\s*['"]#${id}['"]\\s*\\)`).test(ui), 'Modern UI must not depend on obsolete control: ' + id);
}
assert.equal((html.match(/class="card library-card"/g) || []).length, 1);
assert(!/outerHTML|class="intro"|data-filter=|class="right-column"/.test(html));
assert.match(ui, /document\.body\.dataset\.studioReady = 'true'/);
const scripts = [...html.matchAll(/<script(?: src="\.\/([^"]+)")?>([\s\S]*?)<\/script>/g)];
for (const [, src, inline] of scripts) new vm.Script(src ? load(src) : inline, {filename:src || 'startup'});
const guard = scripts.find(m => !m[1])[2];
function startupFixture(hidden=false){
  const target=()=>({listeners:new Map(),
    addEventListener(name,fn){const set=this.listeners.get(name)||new Set();set.add(fn);this.listeners.set(name,set);},
    removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);},
    fire(name){for(const fn of [...(this.listeners.get(name)||[])])fn();}});
  const classes=new Set(),notice={hidden:true},deadlines=new Map();let next=0;
  const window=target(),document=Object.assign(target(),{hidden,readyState:'loading',body:{dataset:{}},
    documentElement:{classList:{add:(...names)=>names.forEach(x=>classes.add(x)),remove:(...names)=>names.forEach(x=>classes.delete(x))}},getElementById:()=>notice});
  vm.runInNewContext(guard,{document,window,navigator:{language:'en'},
    setTimeout:fn=>{deadlines.set(++next,fn);return next;},clearTimeout:id=>deadlines.delete(id)});
  return {window,document,classes,notice,deadlines,
    load(){document.readyState='interactive';document.fire('DOMContentLoaded');},
    expire(){for(const [id,fn]of [...deadlines]){deadlines.delete(id);fn();}},
    ready(){document.body.dataset.studioReady='true';window.fire('pixel-studio-ui-ready');}};
}
{
  const t=startupFixture();t.load();t.ready();t.window.fire('error');t.expire();
  assert(!t.classes.has('ps-ui-starting'));assert(!t.classes.has('ps-ui-failed'));assert(t.notice.hidden);
  assert.equal(t.window.listeners.get('error').size,0,'Post-startup errors must not replace the UI');
}
{
  const t=startupFixture(true);t.load();assert.equal(t.deadlines.size,0);t.expire();assert(t.notice.hidden);
  t.ready();assert(!t.classes.has('ps-ui-starting'),'Background startup does not need requestAnimationFrame');
}
{
  const t=startupFixture();t.load();t.document.hidden=true;t.document.fire('visibilitychange');
  assert.equal(t.deadlines.size,0);t.document.hidden=false;t.document.fire('visibilitychange');
  assert.equal(t.deadlines.size,1);t.expire();assert(t.classes.has('ps-ui-failed'));assert(!t.notice.hidden);
  t.ready();assert(!t.classes.has('ps-ui-failed'));assert(t.notice.hidden,'Late successful initialization recovers');
}
{
  const t=startupFixture();t.window.fire('error');t.load();assert(!t.notice.hidden);t.ready();assert(t.notice.hidden);
  const abandoned=startupFixture();abandoned.window.fire('pagehide');assert.equal(abandoned.deadlines.size,0);
}
{
  // Preserve the production lexical order, not just isolated function bodies.
  // An eager visibility sync before searchMeasure must fail this fixture with a TDZ.
  const pollingStart=ui.indexOf('    let playbackSyncQueued=false,playbackSyncDisposed=false;');
  const pollingEnd=ui.indexOf('    function updateBoardGeometry()',pollingStart);
  const measureDeclaration=ui.match(/    const searchMeasure=[^\r\n]+/);
  const widthStart=ui.indexOf('    function syncTimeValueWidth()');
  const widthEnd=ui.indexOf('    function onTimeValueInput(',widthStart);
  const finalStart=ui.indexOf('    applyCompactLayout(compactViewport.matches);',widthEnd);
  const finalEnd=ui.indexOf('    (document.fonts?.ready',finalStart);
  assert(pollingStart>=0&&pollingEnd>pollingStart&&measureDeclaration);
  assert(measureDeclaration.index>pollingEnd&&widthStart>measureDeclaration.index);
  assert(widthEnd>widthStart&&finalStart>widthEnd&&finalEnd>finalStart);
  const lifecycle='(function(){\n'+ui.slice(pollingStart,pollingEnd)+'\n'
    +measureDeclaration[0]+'\n'+ui.slice(widthStart,widthEnd)+'\n'
    +ui.slice(finalStart,finalEnd)
    +'\nreturn {refresh:syncVisiblePlayback};\n})();';
  const target=()=>({listeners:new Map(),
    addEventListener(name,fn){const set=this.listeners.get(name)||new Set();set.add(fn);this.listeners.set(name,set);},
    removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);},
    dispatchEvent(event){for(const fn of [...(this.listeners.get(event.type)||[])])fn(event);}});
  for(const native of [false,true])for(const initiallyVisible of [false,true]){
    const trace=[],timers=new Map(),microtasks=[];
    let next=0,widthWrites=0,playbackWrites=0,nativeVisible=initiallyVisible;
    const window=target(),document=Object.assign(target(),{
      hidden:native?false:!initiallyVisible,body:{dataset:{}},
      createElement(tag){
        assert.equal(tag,'canvas');trace.push('measure-ready');
        return {getContext:()=>({measureText:text=>({width:text.length*8})})};
      }
    });
    const input={value:'3',style:{width:'',getPropertyValue(){return this.width;},
      setProperty(name,value){assert.equal(name,'--ps-time-number-width');this.width=value;widthWrites++;trace.push('width');}}};
    document.querySelectorAll=()=>[{parentElement:{querySelector:()=>input}}];
    const context={window,document,Event:class{constructor(type){this.type=type;}},
      presentationVisible:()=>!document.hidden&&(!native||nativeVisible),
      syncPlayback(){playbackWrites++;},queueMicrotask:fn=>microtasks.push(fn),
      setInterval(fn,ms){assert.equal(ms,200);timers.set(++next,fn);return next;},
      clearInterval:id=>timers.delete(id),shuffleTimer:0,compactViewport:{matches:false},
      applyCompactLayout(){trace.push('layout');},resizePreview(){trace.push('resize');},
      getComputedStyle:()=>({fontStyle:'normal',fontWeight:'600',fontSize:'14px',fontFamily:'fixture',letterSpacing:'0'})};
    const flush=()=>{while(microtasks.length)microtasks.shift()();};
    let ready=0;window.addEventListener('pixel-studio-ui-ready',()=>{ready++;trace.push('ready');});
    const lifecycleApi=vm.runInNewContext(lifecycle,context);flush();
    assert.equal(document.body.dataset.studioReady,'true');assert.equal(ready,1);
    assert.equal(timers.size,initiallyVisible?1:0,'Hidden startup must not start UI polling');
    assert.equal(widthWrites,initiallyVisible?1:0);
    if(initiallyVisible)assert(trace.indexOf('measure-ready')<trace.indexOf('width'),'Measurement must initialize before first width sync');
    const visibility=value=>{
      if(native){nativeVisible=value;window.dispatchEvent({type:'pixel-studio-presentation-change'});}
      else{document.hidden=!value;document.dispatchEvent({type:'visibilitychange'});}
      flush();
    };
    visibility(true);assert.equal(timers.size,1);assert.equal(widthWrites,1,'Restore measures the current layout immediately');
    for(let i=0;i<5;i++)visibility(true);
    assert.equal(timers.size,1,'Repeated visible events must not duplicate timers');
    const beforeTick=playbackWrites;for(const tick of timers.values())tick();
    assert.equal(playbackWrites,beforeTick+1);
    visibility(false);assert.equal(timers.size,0);
    const beforeHidden=playbackWrites;lifecycleApi.refresh();flush();
    assert.equal(playbackWrites,beforeHidden,'Hidden refresh must do no presentation work');
    input.value='123';visibility(true);
    assert.equal(widthWrites,2,'Restore must use the latest input width');assert.equal(timers.size,1);
    window.dispatchEvent({type:'pixel-studio-playback-status-change'});
    window.dispatchEvent({type:'pagehide'});const beforeDisposed=playbackWrites;flush();
    assert.equal(timers.size,0);assert.equal(playbackWrites,beforeDisposed,'Disposed queued work must not run');
    visibility(false);visibility(true);lifecycleApi.refresh();flush();assert.equal(timers.size,0);
    assert.equal(document.listeners.get('visibilitychange').size,0);
    assert.equal(window.listeners.get('pixel-studio-presentation-change').size,0);
  }
  console.log('PASS production startup order, visible/hidden web and desktop initialization, width measurement, single polling timer, restore and disposal. Isolated DOM only.');
}
const css = load('pixel-studio-web-ui.css');
assert(!/ps-preview-frame[^{}]*::after|\.new-label|--rim-glow-/.test(css));
assert.match(css, /ps-preview-frame\{[^}]*overflow:visible/);
assert.match(css, /ps-preview-board\{[^}]*pointer-events:none/);
const boardStart=ui.indexOf('    function boardRect('), boardEnd=ui.indexOf('    const boardVisibility=',boardStart);
assert(boardStart>=0 && boardEnd>boardStart, 'Current SVG board functions must exist');
const boardFunctions=ui.slice(boardStart,boardEnd);
for (const cad of [false,true]) for (const pitch of [8,16,28]) for (const playing of [false,true]) {
  const rect=()=>({attrs:{},style:{},setAttribute(k,v){this.attrs[k]=v;}});
  const boardIdle=rect(), boardGlow=rect(), boardScreen=rect(), boardSvg=rect();
  const boardLayers=Array.from({length:10},rect);
  const inset=cad?pitch*0.8/7.125/2:0;
  let visible=true,queued=0;
  const context={Math,String,performance:{now:()=>1900},
    boardDisposed:false,presentationVisible:()=>visible,
    frame:{classList:{contains:()=>playing}},
    boardGeometry:{columns:15,rows:27,pitch,inset,radius:pitch*0.8/7.125,
      screenRadius:cad?4*inset:0,width:15*pitch+2*inset,height:27*pitch+2*inset,cad},
    boardGeometryKey:'',boardPixels:null,boardCellNodes:[],boardCellColors:[],
    boardBreathStart:0,boardWasPlaying:false,boardMotion:{matches:false},boardIdle,boardGlow,boardScreen,boardSvg,boardLayers,
    boardCells:{setAttribute(){},replaceChildren(){},append(){}},boardElement:rect,
    document:{hidden:false,createDocumentFragment:()=>({append(){}})},
    queueBoardPaint(){queued++;}};
  vm.runInNewContext(boardFunctions+'\npaintBoard();',context);
  for (const layer of boardLayers) {
    for (const key of ['x','y','width','height','rx','ry']) assert.equal(layer.attrs[key],boardIdle.attrs[key]);
  }
  assert.equal(context.boardCellNodes.length,405);
  assert.equal(Number(context.boardCellNodes[0].attrs.rx),cad?pitch*0.8/7.125:0);
  assert.equal(context.boardCellNodes[0].attrs.fill,'#000');
  assert.equal(boardIdle.style.display,'','Theme rim remains underneath the breathing layer');
  assert.equal(boardGlow.style.display,playing?'':'none');
  if(playing)assert.equal(Number(boardGlow.attrs.opacity),0,'The first pulse starts smoothly at zero');
  assert.equal(queued,playing?1:0,'Only visible playing boards schedule their next visual frame');
  const before=JSON.stringify([boardIdle,boardGlow,boardScreen,boardSvg,boardLayers,context.boardCellNodes]);
  const queuedBefore=queued;
  visible=false;
  context.boardPixels=new Uint8ClampedArray(405*4).fill(255);
  vm.runInNewContext('paintBoard();',context);
  assert.equal(JSON.stringify([boardIdle,boardGlow,boardScreen,boardSvg,boardLayers,context.boardCellNodes]),before,'Native-hidden boards neither repaint pixels nor update their halo');
  assert.equal(queued,queuedBefore,'Native-hidden boards do not schedule another visual frame');
  visible=true;context.boardDisposed=true;
  vm.runInNewContext('paintBoard();',context);
  assert.equal(queued,queuedBefore,'Disposed boards cannot resume their visual loop');
}
// Preview fitting must reserve the toolbar's real width and must not use its
// own fitted scrollport as the next layout input (a page-scrollbar feedback loop).
{
  const start=ui.indexOf('    function resizePreview()');
  const end=ui.indexOf('    let pendingPreviewResize=',start);
  assert(start>=0&&end>start);
  const layout=ui.slice(start,end);
  for(const viewport of [640,800,1024,1280,1920])for(const [columns,rows] of [[15,27],[27,15],[16,16],[32,8]])for(const cad of [false,true])for(const fixed of [[128,168],[148,184]]){
    const availableWidth=viewport-32,insetFactor=cad?0.8/7.125:0,classes=new Set(viewport<=760?['ps-compact-navigation']:[]);
    const classList={contains:name=>classes.has(name),add:name=>classes.add(name),remove:name=>classes.delete(name)};
    const fields={matrixW:{value:String(columns)},matrixH:{value:String(rows)},libraryCategory:{hidden:false}};
    const preview={style:{},classList:{contains:()=>cad}};fields.preview=preview;
    const columnStyle={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};
    const studio={clientWidth:availableWidth,style:columnStyle,css:{columnGap:'16px',getPropertyValue:()=>classes.has('ps-compact-navigation')?'stacked':'side-by-side'},getBoundingClientRect:()=>({bottom:600,width:availableWidth})};
    const searchControl={hidden:false,classList:{contains:()=>false},getBoundingClientRect(){throw Error('Flexible search width must not feed back into fitting');}};
    const items=[searchControl,...fixed.map(width=>({hidden:false,classList:{contains:()=>false},getBoundingClientRect:()=>({width})}))];
    items.push({hidden:true,getBoundingClientRect(){throw Error('Hidden actions must not reserve width');}});
    const libraryToolbar={children:items,css:{columnGap:'10px',getPropertyValue:()=> '90'},parentElement:{css:{rowGap:'12px'}},getBoundingClientRect:()=>({top:0,height:42})};
    const stage={get clientWidth(){return parseFloat(columnStyle['--preview-column'])||availableWidth;},clientHeight:260,css:{paddingLeft:'12px',paddingRight:'12px'},getBoundingClientRect(){return {width:this.clientWidth};}};
    let maxHeight='200px';const well={style:{get maxHeight(){return maxHeight;},set maxHeight(value){maxHeight=value;}},getBoundingClientRect(){throw Error('Fitted scrollport must not be a geometry input');}};
    const frame={style:{},getBoundingClientRect:()=>({top:3,height:parseFloat(preview.style.height)+parseFloat(preview.style.width)/columns*insetFactor})};
    const context={$:id=>fields[id],window:{innerWidth:viewport},document:{body:{classList},documentElement:{lang:'en',clientHeight:900}},
      desktopLayoutKey:'',desktopMinimumWidth:600,compactViewport:{matches:viewport<=760},applyCompactLayout:value=>value?classes.add('ps-compact-navigation'):classes.delete('ps-compact-navigation'),
      syncLibraryCategoryWidth(){},syncLibrarySearch(){},syncTimeValueWidth(){},updateBrandSpacing(){},
      hideUnavailablePreview(){throw Error('Usable preview must not be hidden');},searchControl,studio,stage,frame,well,libraryToolbar,
      getComputedStyle:node=>node.css||{display:'block'},api:{getFrameConfig:()=>({w:columns,h:rows})},updateBoardGeometry(){}};
    vm.runInNewContext(layout+'\nresizePreview();',context);
    const first=JSON.stringify([preview.style,columnStyle,maxHeight,frame.style]);
    vm.runInNewContext('resizePreview();',context);
    assert.equal(JSON.stringify([preview.style,columnStyle,maxHeight,frame.style]),first,'Repeated fitting must be idempotent');
    assert(Math.abs(parseFloat(preview.style.width)/parseFloat(preview.style.height)-columns/rows)<1e-8,'Matrix aspect ratio must remain exact');
    assert.equal(frame.style.visibility,'visible');
    if(!classes.has('ps-compact-navigation')){
      assert(availableWidth-parseFloat(columnStyle['--preview-column'])-16>=90+fixed[0]+fixed[1]+20,'Desktop toolbar must fit without shrinking its controls');
    }else{assert.equal(columnStyle['--preview-column'],undefined);assert.equal(maxHeight,'');}
  }
}
{
  // Execute the production footer formatter with inert DOM nodes, never a browser.
  const start=ui.indexOf("    const playbackFeedback = make('div', 'status ps-playback-feedback');");
  const end=ui.indexOf("    $('startBtn').hidden = true",start);
  assert(start>=0&&end>start,'Feedback formatter must remain independently testable');
  class Notice {
    constructor(tag='div',className=''){
      Object.assign(this,{tag,className,dataset:{},hidden:false,children:[],ownText:'',attributes:{},revisions:0});
      this.classList={
        contains:name=>this.className.split(/\s+/).includes(name),
        add:name=>{if(!this.classList.contains(name))this.className+=' '+name;},
        remove:name=>{this.className=this.className.split(/\s+/).filter(value=>value!==name).join(' ');}
      };
    }
    get textContent(){return this.ownText+this.children.map(node=>node.textContent).join('');}
    set textContent(value){this.ownText=String(value);this.children=[];}
    setAttribute(name,value){this.attributes[name]=value;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.ownText='';this.children=nodes;this.revisions++;}
    querySelectorAll(){return this.children.filter(node=>node.classList.contains('ps-playback-source'));}
  }
  const status=new Notice(),runtimeNotice=new Notice(),streamStats=new Notice(),messages=new Notice(),diagnosticsErrors=new Notice();
  runtimeNotice.hidden=true;messages.append(status,runtimeNotice);
  const document={documentElement:{lang:'zh-CN'},querySelectorAll:()=>messages.children.filter(node=>node.classList.contains('ps-playback-source')&&node.classList.contains('err'))};
  const api={playing:false,previewStatus:'empty',outputNotice:null};
  const diagnosticsDialog={open:false};
  const context={api,document,messages,diagnosticsDialog,diagnosticsErrors,$:id=>({status,runtimeNotice,streamStats})[id],
    make:(tag,classes)=>new Notice(tag,classes),
    window:{pixelStudioFormatNotice(){throw Error('Status polling must not retranslate or log notices');},
      pixelStudioMergeNoticeDetails:(...values)=>[...new Set(values.flatMap(value=>String(value||'').split(/\n+/)).map(value=>value.trim()).filter(Boolean))].join('\n')}};
  const diagnosticStart=ui.indexOf('    function renderDiagnosticDetails()'),diagnosticEnd=ui.indexOf('    function renderDiagnostics()',diagnosticStart);
  assert(diagnosticStart>=0&&diagnosticEnd>diagnosticStart);
  vm.runInNewContext(ui.slice(diagnosticStart,diagnosticEnd)+ui.slice(start,end)+'\nthis.syncFeedback=syncPlaybackFeedback;this.feedback=playbackFeedback;',context);
  const setStatus=(source,text=source,error=false)=>{
    status.dataset.noticeSource=source;status.textContent=text;status.title='';
    status.classList.remove('err');if(error)status.classList.add('err');
  };
  const sync=context.syncFeedback,feedback=context.feedback;
  for(const preview of ['empty','loading','ready']){
    api.previewStatus=preview;setStatus('正在本地预览');sync();assert.equal(feedback.textContent,'本地预览');
  }
  api.previewStatus='error';setStatus('视频读取失败，请重新选择文件。',undefined,true);sync();
  assert.equal(feedback.textContent,'操作失败');assert.equal(feedback.title,'视频读取失败，请重新选择文件。');
  assert.equal(feedback.children.length,1);assert(feedback.children[0].classList.contains('ps-playback-error'));
  api.previewStatus='ready';setStatus('本地预览就绪');sync();assert.equal(feedback.textContent,'本地预览');assert.equal(feedback.title,'');
  context.window.pixelStudioTemperatureNotice={message:'温度组件未安装',detail:'温度组件未安装'};
  diagnosticsDialog.open=true;sync();
  assert.equal(feedback.textContent,'操作失败');assert.equal(feedback.title,'温度组件未安装');
  assert.equal(diagnosticsErrors.textContent,feedback.title,'Temperature errors must reach the diagnostic view, not a separate controls paragraph');
  const revisions=feedback.revisions;for(let i=0;i<50;i++)sync();assert.equal(feedback.revisions,revisions,'Unchanged polls must not rewrite the live region');
  document.documentElement.lang='en';context.window.pixelStudioTemperatureNotice={message:'The temperature component is not installed.',detail:'The temperature component is not installed.'};
  sync();assert.equal(feedback.textContent,'Failed');assert.equal(feedback.title,'The temperature component is not installed.');
  api.playing=true;setStatus('正在发送','Sending');sync();assert.equal(feedback.textContent,'Failed','A thermal content failure does not stop output or change transport readiness');
  context.window.pixelStudioTemperatureNotice=null;sync();assert.equal(feedback.textContent,'Sending');assert.equal(feedback.title,'');
  for(const phase of ['recovering','uncertain']){
    api.outputNotice={phase,message:'Retrying',detail:'Temporary telemetry timeout'};sync();
    assert.equal(feedback.textContent,'Sending','Recovery must not introduce a fourth visible playback state');
  }
  api.outputNotice={phase:'sending',message:'Send failed',detail:'USB write failed'};sync();
  assert.equal(feedback.textContent,'Failed');assert(feedback.title.includes('USB write failed'));
  api.outputNotice=null;api.playing=false;setStatus('USB 设备已断开','USB device disconnected',true);sync();
  assert.equal(feedback.textContent,'Failed');assert(feedback.title.includes('USB 设备已断开'));
  setStatus('本地预览就绪');runtimeNotice.hidden=false;runtimeNotice.classList.add('err');runtimeNotice.textContent='DDP service not connected';sync();
  assert.equal(feedback.textContent,'Preview','Environment readiness is not a failed playback action');
  document.documentElement.lang='zh-CN';sync();assert.equal(feedback.textContent,'本地预览');
  assert.match(css,/\.ps-playback-feedback \.ps-playback-error\{color:var\(--danger\)\}/);
  assert.match(css,/\.ps-playback-messages>div\{[^}]*white-space:nowrap/);
  assert(!css.includes('ps-playback-note')&&!css.includes('ps-playback-separator'),'Removed detail/separator DOM must not leave unused styling');
  assert.match(css,/\.ps-desktop-media-note\.ps-desktop-media-error\{color:var\(--danger\)\}/);
  assert.match(css,/\.ps-desktop-media-note\{[^}]*color:var\(--muted\)/);
  console.log('PASS three bilingual playback states, thermal diagnostic snapshot, hover-only errors, deduplication, recovery/readiness separation and stable live-region updates.');
}
const logo=html.match(/(<svg class="brand-mark"[\s\S]*?<\/svg>)/)[1];
assert.equal((logo.match(/<rect /g)||[]).length,11);
for(const file of ['desktop/icons.cjs','tools/sync-guide-logo.cjs']) {
  assert(!load(file).includes('outerHTML'));
  new vm.Script(load(file),{filename:file});
}
assert(!load('installer/Prepare-Release-Archives.ps1').includes("$_.Extension -in @('.png','.ico','.json')"));
console.log('PASS: shell ids, script syntax, startup, background readiness, timeout recovery and listener cleanup, twelve SVG board states, 80 stable preview layouts, preview rim geometry, authoritative logo and archive branding. No real UI/devices tested.');
