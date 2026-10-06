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
  const context={Math,String,performance:{now:()=>1900},
    frame:{classList:{contains:()=>playing}},
    boardGeometry:{columns:15,rows:27,pitch,inset,radius:pitch*0.8/7.125,
      screenRadius:cad?4*inset:0,width:15*pitch+2*inset,height:27*pitch+2*inset,cad},
    boardGeometryKey:'',boardPixels:null,boardCellNodes:[],boardCellColors:[],
    boardBreathStart:0,boardWasPlaying:false,boardIdle,boardGlow,boardScreen,boardSvg,boardLayers,
    boardCells:{replaceChildren(){},append(){}},boardElement:rect,
    document:{hidden:true,createDocumentFragment:()=>({append(){}})},
    queueBoardPaint(){throw new Error('Hidden boards must not schedule animation');}};
  vm.runInNewContext(boardFunctions+'\npaintBoard();',context);
  for (const layer of boardLayers) {
    for (const key of ['x','y','width','height','rx','ry']) assert.equal(layer.attrs[key],boardIdle.attrs[key]);
  }
  assert.equal(context.boardCellNodes.length,405);
  assert.equal(Number(context.boardCellNodes[0].attrs.rx),cad?pitch*0.8/7.125:0);
  assert.equal(context.boardCellNodes[0].attrs.fill,'#000');
  assert.equal(boardIdle.style.display,playing?'none':'');
  assert.equal(boardGlow.style.display,playing?'':'none');
  if(playing)assert(Number(boardGlow.attrs.opacity)>=0.44 && Number(boardGlow.attrs.opacity)<=1);
}
// Preview fitting must reserve the toolbar's real width and must not use its
// own fitted scrollport as the next layout input (a page-scrollbar feedback loop).
{
  const start=ui.indexOf('    function resizePreview()');
  const end=ui.indexOf('    let pendingPreviewResize=',start);
  assert(start>=0&&end>start);
  const layout=ui.slice(start,end);
  for(const viewport of [640,800,1024,1280,1920])for(const [columns,rows] of [[15,27],[27,15],[16,16],[32,8]])for(const cad of [false,true])for(const fixed of [[128,168],[148,184]]){
    const desktop=viewport>760,availableWidth=viewport-32,insetFactor=cad?0.8/7.125:0;
    const fields={matrixW:{value:String(columns)},matrixH:{value:String(rows)}};
    const preview={style:{},classList:{contains:()=>cad}};
    fields.preview=preview;
    const columnStyle={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};
    const studio={clientWidth:availableWidth,style:columnStyle,css:{columnGap:'16px'},getBoundingClientRect:()=>({bottom:600})};
    const items=[{id:'librarySearch',getBoundingClientRect(){throw new Error('Search width must not feed back into fitting');}},...fixed.map(width=>({getBoundingClientRect:()=>({width})}))];
    items.push({hidden:true,getBoundingClientRect(){throw new Error('Hidden actions must not reserve width');}});
    const libraryToolbar={children:items,css:{columnGap:'10px'},parentElement:{css:{rowGap:'12px'}},getBoundingClientRect:()=>({top:0,height:42})};
    const stage={get clientWidth(){return parseFloat(columnStyle['--preview-column'])||availableWidth;},clientHeight:260,css:{paddingLeft:'12px',paddingRight:'12px'}};
    let maxHeight='200px';
    const well={style:{get maxHeight(){return maxHeight;},set maxHeight(value){assert(!desktop||value!=='','Never clear the desktop scrollport just to measure it');maxHeight=value;}},getBoundingClientRect(){throw new Error('Fitted scrollport must not be a geometry input');}};
    const frame={style:{},getBoundingClientRect:()=>({top:3,height:parseFloat(preview.style.height)+parseFloat(preview.style.width)/columns*insetFactor})};
    const context={$:id=>fields[id],window:{innerWidth:viewport},studio,stage,frame,well,libraryToolbar,getComputedStyle:node=>node.css||{display:'block'},api:{getFrameConfig:()=>({w:Number(fields.matrixW.value),h:Number(fields.matrixH.value)})},updateBoardGeometry(){}};
    vm.runInNewContext(layout+'\nresizePreview();',context);
    const first=JSON.stringify([preview.style,columnStyle,maxHeight,frame.style]);
    vm.runInNewContext('resizePreview();',context);
    assert.equal(JSON.stringify([preview.style,columnStyle,maxHeight,frame.style]),first,'Repeated fitting must be idempotent');
    assert(Math.abs(parseFloat(preview.style.width)/parseFloat(preview.style.height)-columns/rows)<1e-8,'Preview must retain the matrix aspect ratio');
    if(desktop){
      const reserved=Math.max(320,90+fixed[0]+fixed[1]+20);
      assert(availableWidth-parseFloat(columnStyle['--preview-column'])-16>=reserved-1e-8,'Toolbar must fit without a root scrollbar');
    }else{
      assert.equal(columnStyle['--preview-column'],undefined);
      assert.equal(maxHeight,'');
    }
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
  const status=new Notice(),runtimeNotice=new Notice(),messages=new Notice();
  runtimeNotice.hidden=true;messages.append(status,runtimeNotice);
  const document={documentElement:{lang:'zh-CN'}},api={playing:false,previewStatus:'empty'};
  const context={api,document,messages,$:id=>({status,runtimeNotice})[id],
    make:(tag,classes)=>new Notice(tag,classes),
    window:{pixelStudioFormatNotice(){throw new Error('Status polling must not retranslate or log notices');}}};
  vm.runInNewContext(ui.slice(start,end)+'\nthis.syncFeedback=syncPlaybackFeedback;this.feedback=playbackFeedback;',context);
  const setStatus=(source,text=source,error=false)=>{
    status.dataset.noticeSource=source;status.textContent=text;
    status.classList.remove('err');if(error)status.classList.add('err');
  };
  const sync=context.syncFeedback,feedback=context.feedback;
  setStatus('媒体模式：请选择图片或视频');sync();
  assert.equal(feedback.textContent,'请选择媒体');
  api.previewStatus='loading';setStatus('正在加载视频…');sync();
  assert.equal(feedback.textContent,'正在加载媒体…');
  api.previewStatus='error';setStatus('视频读取失败，请重新选择文件。',undefined,true);sync();
  assert.equal(feedback.textContent,'预览不可用 · 视频读取失败，请重新选择文件。');
  assert(feedback.children[0].classList.contains('ps-playback-error'));
  assert(feedback.children.at(-1).classList.contains('ps-playback-error'));
  api.previewStatus='ready';setStatus('视频已就绪，可点击开始发送');sync();
  assert.equal(feedback.textContent,'正在本地预览');
  const thermal=new Notice('output','thermal-status ps-playback-source err');
  thermal.textContent='温度组件未安装';messages.append(thermal);sync();
  assert.equal(feedback.textContent,'正在本地预览 · 温度组件未安装');
  assert(feedback.children.at(-1).classList.contains('ps-playback-error'));
  assert(!feedback.children[0].classList.contains('ps-playback-error'));
  const revisions=feedback.revisions;
  for(let i=0;i<50;i++)sync();
  assert.equal(feedback.revisions,revisions,'Unchanged polls must not rewrite the live region');
  document.documentElement.lang='en';setStatus('正在本地预览','Previewing locally');
  thermal.textContent='The temperature component is not installed.';sync();
  assert.equal(feedback.textContent,'Previewing locally · The temperature component is not installed.');
  assert(feedback.title.includes(thermal.textContent));
  api.playing=true;setStatus('正在发送','Sending');sync();
  assert.equal(feedback.textContent,'Sending · The temperature component is not installed.');
  thermal.hidden=true;sync();assert.equal(feedback.textContent,'Sending');
  api.playing=false;api.previewStatus='empty';setStatus('媒体模式：请选择图片或视频','Media mode: choose an image or video');sync();
  assert.equal(feedback.textContent,'Choose media');
  api.previewStatus='loading';setStatus('正在加载图片…','Loading image…');sync();
  assert.equal(feedback.textContent,'Loading media…');
  api.previewStatus='ready';setStatus('本地预览就绪','Local preview ready');sync();
  assert.equal(feedback.textContent,'Previewing locally','Activity deduplication uses source metadata, not translation side effects');
  runtimeNotice.hidden=false;runtimeNotice.classList.add('err');runtimeNotice.textContent='Mock output error';sync();
  assert.equal(feedback.textContent,'Previewing locally · Mock output error');
  assert.match(css,/\.ps-playback-feedback \.ps-playback-error\{color:var\(--danger\)\}/);
  assert.match(css,/\.ps-playback-messages>div\{[^}]*white-space:nowrap/);
  const desktopMedia=load('desktop/media-library-ui.js');
  assert(desktopMedia.includes("note=make('p','ps-desktop-media-note ps-desktop-media-error')"));
  assert.match(desktopMedia,/\.ps-desktop-media-note\.ps-desktop-media-error\{color:var\(--danger\)\}/);
  assert.match(desktopMedia,/\.ps-desktop-media-note\{[^}]*color:var\(--muted\)/);
  console.log('PASS isolated bilingual feedback states, late temperature notices, error color roles, no duplicate activity text, no polling translations and distinct media error/info styles.');
}
const logo=html.match(/(<svg class="brand-mark"[\s\S]*?<\/svg>)/)[1];
assert.equal((logo.match(/<rect /g)||[]).length,16);
for(const file of ['desktop/icons.cjs','tools/sync-guide-logo.cjs']) {
  assert(!load(file).includes('outerHTML'));
  new vm.Script(load(file),{filename:file});
}
assert(!load('installer/Prepare-Release-Archives.ps1').includes("$_.Extension -in @('.png','.ico','.json')"));
console.log('PASS: shell ids, script syntax, startup, background readiness, timeout recovery and listener cleanup, twelve SVG board states, 80 stable preview layouts, shared halo geometry, authoritative logo and archive branding. No real UI/devices tested.');
