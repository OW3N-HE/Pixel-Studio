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
for (const ready of [false, true]) {
  const events = new Map(), classes = new Set(), notice = {hidden:true};
  const frames = [], deadlines = [];
  const document = {readyState:'loading', body:{dataset:{studioReady:String(ready)}},
    documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},
    getElementById:()=>notice, addEventListener:(name,fn)=>events.set(name,fn)};
  vm.runInNewContext(guard, {document,navigator:{language:'en'},requestAnimationFrame:fn=>frames.push(fn),
    window:{addEventListener:(name,fn)=>events.set(name,fn)},setTimeout:fn=>deadlines.push(fn)});
  events.get('DOMContentLoaded')();
  frames.shift()();
  if (!ready) {
    assert.equal(classes.has('ps-ui-failed'), false, 'Allow asynchronous startup before timeout');
    deadlines.shift()();
    while (frames.length) frames.shift()();
  }
  assert.equal(classes.has('ps-ui-failed'), !ready);
  assert.equal(notice.hidden, ready);
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
const logo=html.match(/(<svg class="brand-mark"[\s\S]*?<\/svg>)/)[1];
assert.equal((logo.match(/<rect /g)||[]).length,16);
for(const file of ['desktop/icons.cjs','tools/sync-guide-logo.cjs']) {
  assert(!load(file).includes('outerHTML'));
  new vm.Script(load(file),{filename:file});
}
assert(!load('installer/Prepare-Release-Archives.ps1').includes("$_.Extension -in @('.png','.ico','.json')"));
console.log('PASS: shell ids, script syntax, asynchronous startup/timeout, twelve SVG board states, 80 stable preview layouts, shared halo geometry, authoritative logo and archive branding. No real UI/devices tested.');
