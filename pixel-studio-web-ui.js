(() => {
  'use strict';
  const VERSION = '0.2.1';
  const $ = id => document.getElementById(id);
  const make = (tag, className = '', text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // Persist presentation order only; media files and playback selection never move.
  const libraryOrder = (() => {
    const storageKey='pixelStudioCardOrder.v1';
    const ids=value=>Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&id))].slice(0,1000):[];
    let records=[],serial=0;
    try{
      const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');
      if(Array.isArray(saved))records=saved.filter(item=>item&&typeof item.scope==='string'&&Array.isArray(item.order))
        .slice(-13).map(item=>({scope:item.scope,order:ids(item.order)}));
    }catch{}
    function read(scope,current){
      const all=ids(current),available=new Set(all);
      const preferred=ids(records.find(item=>item.scope===scope)?.order).filter(id=>available.has(id));
      const known=new Set(preferred);
      return [...preferred,...all.filter(id=>!known.has(id))];
    }
    function remember(scope,order){
      records=records.filter(item=>item.scope!==scope);
      records.push({scope,order:ids(order)});
      // Keep the animation order and the most recently arranged twelve folders.
      records=[...records.filter(item=>item.scope==='animations'),
        ...records.filter(item=>item.scope!=='animations').slice(-12)];
      try{localStorage.setItem(storageKey,JSON.stringify(records));}catch{}
    }
    function arrange(container,orderedTiles){
      // Move only out-of-order tiles; never detach the whole scrollport's contents.
      let cursor=container.firstElementChild;
      for(const tile of orderedTiles){
        while(cursor&&!cursor.classList.contains('ps-animation-tile'))cursor=cursor.nextElementSibling;
        if(tile===cursor)cursor=cursor.nextElementSibling;
        else container.insertBefore(tile,cursor);
      }
    }
    function attach(container,options){
      const controller=new AbortController(),signal=controller.signal;
      const hint=make('span','ps-order-accessibility'),live=make('span','ps-order-accessibility');
      hint.id='psCardOrderHint'+(++serial);
      hint.setAttribute('data-update-ui','');live.setAttribute('data-update-ui','');
      live.setAttribute('role','status');live.setAttribute('aria-live','polite');
      document.body.append(hint,live);
      let source=null,target=null,after=false,scrollFrame=0,lastFrame=0,pointerX=0,pointerY=0,suppressUntil=0;
      let visibleIds=new Set(),columnWidth=-1,oneColumn=false,markerRow=false;
      const enabled=()=>options.enabled?.()!==false;
      const tiles=()=>[...container.children].filter(node=>node.classList.contains('ps-animation-tile'));
      const cardFor=tile=>tile?.querySelector('.animation-card,.ps-desktop-media-card');
      const english=()=>document.documentElement.lang==='en';
      function labels(){
        hint.textContent=english()?'Drag to reorder. Alt+Left or Alt+Right moves a card.':'拖动调整顺序，也可按 Alt+左方向键或右方向键移动卡片。';
      }
      function decorate(tile,id){
        tile.dataset.orderId=id;
        const card=cardFor(tile);
        if(!card)return;
        card.draggable=true;
        card.setAttribute('aria-keyshortcuts','Alt+ArrowLeft Alt+ArrowRight');
        const descriptions=new Set((card.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));
        descriptions.add(hint.id);card.setAttribute('aria-describedby',[...descriptions].join(' '));
        for(const image of tile.querySelectorAll('img'))image.draggable=false;
      }
      function clearMarker(){
        if(target)target.classList.remove('ps-drop-before','ps-drop-after','ps-drop-row');
        target=null;
      }
      function stopScroll(){if(scrollFrame)cancelAnimationFrame(scrollFrame);scrollFrame=0;lastFrame=0;}
      function finish(){
        const wasDragging=!!source;
        source?.tile.classList.remove('is-dragging');
        source=null;visibleIds.clear();columnWidth=-1;
        clearMarker();stopScroll();delete container.dataset.reordering;
        if(wasDragging)options.onFinish?.();
      }
      function cancel(){
        if(source)suppressUntil=performance.now()+250;
        finish();
      }
      function marker(x,y){
        const next=document.elementFromPoint(x,y)?.closest('.ps-animation-tile');
        if(!source||!next||next.parentElement!==container||next===source.tile||next.hidden||!visibleIds.has(next.dataset.orderId)){
          clearMarker();return;
        }
        // Read geometry before changing classes; an unchanged target needs no repaint.
        const bounds=next.getBoundingClientRect(),width=container.clientWidth;
        if(width!==columnWidth){
          columnWidth=width;
          oneColumn=getComputedStyle(container).gridTemplateColumns.trim().split(/\s+/).length===1;
        }
        const putAfter=oneColumn?y>bounds.top+bounds.height/2:x>bounds.left+bounds.width/2;
        if(target===next&&after===putAfter&&markerRow===oneColumn)return;
        clearMarker();target=next;after=putAfter;markerRow=oneColumn;
        target.classList.add(after?'ps-drop-after':'ps-drop-before');
        target.classList.toggle('ps-drop-row',oneColumn);
      }
      function edgeSpeed(){
        const box=container.getBoundingClientRect(),edge=Math.min(40,box.height/4);
        if(pointerX<box.left||pointerX>box.right||pointerY<box.top||pointerY>box.bottom)return 0;
        if(pointerY<box.top+edge)return -450*(box.top+edge-pointerY)/edge;
        if(pointerY>box.bottom-edge)return 450*(pointerY-box.bottom+edge)/edge;
        return 0;
      }
      function scrollStep(now){
        scrollFrame=0;
        if(!source||!enabled()){lastFrame=0;return;}
        const speed=edgeSpeed(),previous=container.scrollTop;
        if(speed){
          const delta=lastFrame?Math.min(32,now-lastFrame):16;lastFrame=now;
          container.scrollTop+=speed*delta/1000;
        }else lastFrame=0;
        const scrolled=container.scrollTop!==previous;
        marker(pointerX,pointerY);
        if(speed&&scrolled)scrollFrame=requestAnimationFrame(scrollStep);
        else lastFrame=0;
      }
      function move(id,to,putAfter){
        const order=ids(options.order()),visible=ids(options.visible());
        if(id===to||!visible.includes(id)||!visible.includes(to))return false;
        const moved=visible.filter(key=>key!==id);
        moved.splice(moved.indexOf(to)+(putAfter?1:0),0,id);
        const slots=new Set(visible);let index=0;
        const next=order.map(key=>slots.has(key)?moved[index++]:key);
        if(next.every((key,i)=>key===order[i]))return false;
        const position=container.scrollTop;
        const anchor=container.style.overflowAnchor,behavior=container.style.scrollBehavior;
        container.style.overflowAnchor='none';container.style.scrollBehavior='auto';
        try{
          options.commit(next);
          container.scrollTop=position;
          const tile=tiles().find(node=>node.dataset.orderId===id);
          cardFor(tile)?.focus({preventScroll:true});
          live.textContent=(english()?'Position ':'已移至第 ')+(moved.indexOf(id)+1)+(english()?' of ':' 位，共 ')+moved.length+(english()?'':' 张');
          return true;
        }finally{
          container.scrollTop=position;
          container.style.overflowAnchor=anchor;container.style.scrollBehavior=behavior;
        }
      }
      container.addEventListener('dragstart',event=>{
        const card=event.target.closest?.('.animation-card,.ps-desktop-media-card');
        const tile=card?.closest('.ps-animation-tile');
        if(!enabled()||!tile||tile.parentElement!==container||card.disabled||!event.dataTransfer){
          event.preventDefault();return;
        }
        // Snapshot the filtered IDs once, rather than scanning/sorting the library on every move.
        visibleIds=new Set(options.visible());
        columnWidth=container.clientWidth;
        oneColumn=getComputedStyle(container).gridTemplateColumns.trim().split(/\s+/).length===1;
        source={tile,id:tile.dataset.orderId};
        container.dataset.reordering='true';tile.classList.add('is-dragging');
        event.dataTransfer.effectAllowed='move';
        event.dataTransfer.setData('application/x-pixel-studio-card',source.id);
      },{signal});
      function dragOver(event){
        if(!source||!enabled())return;
        event.preventDefault();
        if(event.dataTransfer)event.dataTransfer.dropEffect='move';
        pointerX=event.clientX;pointerY=event.clientY;
        // Share one frame for the insertion marker and edge scrolling.
        if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollStep);
      }
      container.addEventListener('dragenter',dragOver,{signal});
      container.addEventListener('dragover',dragOver,{signal});
      container.addEventListener('dragleave',event=>{
        if(!source)return;
        const box=container.getBoundingClientRect();
        if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom){
          clearMarker();stopScroll();
        }
      },{signal});
      container.addEventListener('drop',event=>{
        if(!source)return;
        event.preventDefault();event.stopPropagation();
        marker(event.clientX,event.clientY);
        const from=source.id,to=target?.dataset.orderId,putAfter=after,allowed=enabled();
        cancel();
        if(allowed&&to)move(from,to,putAfter);
      },{signal});
      container.addEventListener('click',event=>{
        if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}
      },{capture:true,signal});
      container.addEventListener('keydown',event=>{
        if(!event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key)||!enabled())return;
        const card=event.target.closest?.('.animation-card,.ps-desktop-media-card');
        const tile=card?.closest('.ps-animation-tile');
        if(!tile||tile.parentElement!==container||card.disabled)return;
        const visible=ids(options.visible()),index=visible.indexOf(tile.dataset.orderId),step=event.key==='ArrowLeft'?-1:1;
        if(index<0)return;
        event.preventDefault();event.stopPropagation();
        if(visible[index+step])move(tile.dataset.orderId,visible[index+step],step>0);
      },{signal});
      window.addEventListener('dragend',cancel,{signal});
      window.addEventListener('pixel-studio-language-change',labels,{signal});
      window.addEventListener('pagehide',()=>{
        finish();controller.abort();hint.remove();live.remove();
      },{once:true,signal});
      labels();
      return {decorate,cancel,get dragging(){return !!source;}};
    }
    return Object.freeze({read,remember,arrange,attach});
  })();
  window.pixelStudioLibraryOrder=libraryOrder;
  function selectReleaseNotes(source, english) {
    const lines=source.replace(/\r\n?/g,'\n').split('\n');
    const wanted=english?'en':'zh', selected=[];
    let scope='common',level=0,fence='',found=false;
    for(const line of lines){
      const marker=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if(marker){
        if(!fence)fence=marker[1];
        else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim())fence='';
      }else if(!fence){
        const heading=/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
        if(heading){
          const label=heading[2].toLowerCase();
          const language=label==='english'?'en':['简体中文','中文'].includes(label)?'zh':null;
          if(language){scope=language;level=heading[1].length;if(scope===wanted)found=true;}
          else if(heading[1].length<=level){scope='common';level=0;}
        }
      }
      if(scope==='common'||scope===wanted)selected.push(line);
    }
    // Unlabelled or single-language notes must never disappear.
    return found?selected.join('\n'):source;
  }
  function appendReleaseInline(parent, text) {
    const tokens=/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^\s)]+\))/g;
    let offset=0;
    for(const token of text.matchAll(tokens)){
      parent.append(document.createTextNode(text.slice(offset,token.index)));
      const value=token[0];let node;
      if(value[0]==='`'){node=document.createElement('code');node.textContent=value.slice(1,-1);}
      else if(value.startsWith('**')){node=document.createElement('strong');node.textContent=value.slice(2,-2);}
      else{
        const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(value);
        try{
          const url=new URL(link[2]);
          if(url.protocol==='https:'&&!url.username&&!url.password){
            node=document.createElement('a');node.textContent=link[1];node.href=url.href;
            node.target='_blank';node.rel='noopener noreferrer';
          }
        }catch{}
      }
      parent.append(node||document.createTextNode(value));offset=token.index+value.length;
    }
    parent.append(document.createTextNode(text.slice(offset)));
  }
  function renderReleaseNotes(container, source, english) {
    if(container._releaseSource===source&&container._releaseEnglish===english)return;
    container._releaseSource=source;container._releaseEnglish=english;
    container.replaceChildren();
    let paragraph=[],list=null,fence='',code=[];
    const flushParagraph=()=>{
      if(!paragraph.length)return;
      const node=document.createElement('p');appendReleaseInline(node,paragraph.join(' '));
      container.append(node);paragraph=[];
    };
    const flushCode=()=>{
      const pre=document.createElement('pre'),node=document.createElement('code');
      node.textContent=code.join('\n');pre.append(node);container.append(pre);code=[];
    };
    for(const line of selectReleaseNotes(source,english).replace(/\r\n?/g,'\n').split('\n')){
      const marker=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if(fence){
        if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim()){
          flushCode();fence='';
        }else code.push(line);
        continue;
      }
      if(marker){flushParagraph();list=null;fence=marker[1];continue;}
      if(!line.trim()){flushParagraph();list=null;continue;}
      const heading=/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      const item=/^\s*(?:([-+*])|([0-9]+)\.)\s+(.+)$/.exec(line);
      if(heading){
        flushParagraph();list=null;
        const node=document.createElement('h'+Math.min(6,heading[1].length+2));
        appendReleaseInline(node,heading[2]);container.append(node);
      }else if(item){
        flushParagraph();const tag=item[2]?'ol':'ul';
        if(!list||list.localName!==tag){
          list=document.createElement(tag);
          if(tag==='ol'&&Number.isSafeInteger(Number(item[2])))list.start=Number(item[2]);
          container.append(list);
        }
        const node=document.createElement('li');appendReleaseInline(node,item[3]);list.append(node);
      }else{list=null;paragraph.push(line.trim());}
    }
    if(fence)flushCode();flushParagraph();
  }
  function resolutionHint(limits, frame, invalid, english) {
    if(invalid)return english?`Invalid; using ${frame.w} x ${frame.h}`:`无效，仍用 ${frame.w}×${frame.h}`;
    return english?`1-${limits.maxAxis}; ≤${limits.maxPixels}px`:`1~${limits.maxAxis}，≤${limits.maxPixels}像素`;
  }
  function installSliderThumbFeedback() {
    const selector = 'body.ps-web :is(.wrap,.ps-settings,#studioSettings) input[type="range"]';
    const controller = new AbortController();
    const options = { passive:true, signal:controller.signal };
    const captureOptions = { ...options, capture:true };
    let tracked = null, point = null, pendingPaint = 0;
    function positionOf(input) {
      const min = input.min === '' ? 0 : Number(input.min);
      const max = input.max === '' ? 100 : Number(input.max);
      const position = max > min ? (input.valueAsNumber - min) / (max - min) : 0;
      return Math.max(0, Math.min(1, Number.isFinite(position) ? position : 0));
    }
    function clear() {
      if (tracked) tracked.classList.remove('ps-thumb-hover');
      tracked = null; point = null;
    }
    function update() {
      if (!tracked || !point) return;
      const rect = tracked.getBoundingClientRect();
      if (tracked.disabled || !rect.width || !rect.height) {
        clear(); return;
      }
      const style = getComputedStyle(tracked);
      const size = parseFloat(style.getPropertyValue('--ui-slider-thumb-size')) || 24;
      const scaleX = rect.width / (tracked.offsetWidth || rect.width);
      const scaleY = rect.height / (tracked.offsetHeight || rect.height);
      let position = positionOf(tracked);
      if (style.direction === 'rtl') position = 1 - position;
      const radius = size / 2;
      const centerX = rect.left + radius * scaleX + Math.max(0, rect.width - size * scaleX) * position;
      const centerY = rect.top + rect.height / 2;
      const dx = (point.x - centerX) / scaleX;
      const dy = (point.y - centerY) / scaleY;
      tracked.classList.toggle('ps-thumb-hover', dx * dx + dy * dy <= radius * radius);
    }
    function paint() {
      pendingPaint = 0;
      for (const input of document.querySelectorAll(selector)) {
        const position = (positionOf(input) * 100).toFixed(4) + '%';
        const direction = getComputedStyle(input).direction === 'rtl' ? '270deg' : '90deg';
        if (input.style.getPropertyValue('--ui-slider-fill-position') !== position)
          input.style.setProperty('--ui-slider-fill-position',position);
        if (input.style.getPropertyValue('--ui-slider-fill-direction') !== direction)
          input.style.setProperty('--ui-slider-fill-direction',direction);
      }
      update();
    }
    function schedulePaint() {
      if (!pendingPaint) pendingPaint = requestAnimationFrame(paint);
    }
    function move(event) {
      const target = event.target;
      if (event.pointerType !== 'mouse' || !(target instanceof HTMLInputElement) || !target.matches(selector)) {
        clear(); return;
      }
      if (tracked !== target) clear();
      tracked = target;
      point = { x:event.clientX, y:event.clientY };
      update();
    }
    // Capture also sees non-bubbling mode changes; paint after their handlers
    // have synchronized sliders with numeric fields and per-animation settings.
    for (const type of ['input','change']) document.addEventListener(type,schedulePaint,captureOptions);
    document.addEventListener('click',schedulePaint,options);
    document.addEventListener('toggle',schedulePaint,captureOptions);
    window.addEventListener('pixel-studio-ui-ready',schedulePaint,options);
    window.addEventListener('pixel-studio-language-change',schedulePaint,options);
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'attributes'
        ? record.target.matches(selector)
        : [...record.addedNodes].some(node => node instanceof Element &&
          (node.matches(selector) || node.querySelector('input[type="range"]'))))) schedulePaint();
    });
    observer.observe(document.body,{
      subtree:true,childList:true,attributes:true,attributeFilter:['min','max','value','disabled']
    });
    for (const type of ['pointermove','pointerdown','pointerup']) document.addEventListener(type,move,options);
    document.addEventListener('pointerout',event => { if (event.target === tracked) clear(); },options);
    document.addEventListener('pointercancel',clear,options);
    document.addEventListener('scroll',clear,captureOptions);
    window.addEventListener('blur',clear,options);
    window.addEventListener('resize',() => { clear(); schedulePaint(); },options);
    window.addEventListener('pagehide',() => {
      clear(); controller.abort(); observer.disconnect();
      if (pendingPaint) cancelAnimationFrame(pendingPaint);
    },{ once:true });
    schedulePaint();
  }
  function initialize() {
    const api = window.pixelStudioWebRuntime;
    if (!api) return;
    document.body.classList.add('ps-web');
    installSliderThumbFeedback();
    const brightness=$('brightness'),brightnessRange=$('brightnessRange');
    brightnessRange.value=brightness.value;
    brightnessRange.addEventListener('input',()=>{brightness.value=brightnessRange.value;brightness.dispatchEvent(new Event('input',{bubbles:true}));});
    brightness.addEventListener('input',()=>{brightnessRange.value=brightness.value;});
    const theme=$('webTheme');let savedTheme='system';
    try{savedTheme=localStorage.getItem('pixelStudioWebTheme')||'system';}catch{}
    if(!['system','ice','mint','amber','rose','ocean','dark','black','light'].includes(savedTheme))savedTheme='system';
    theme.prepend(new Option('跟随系统','system'));
    theme.value=savedTheme;
    const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(){
      document.documentElement.dataset.theme=theme.value==='system'?(systemTheme.matches?'black':'light'):theme.value;
      try{localStorage.setItem('pixelStudioWebTheme',theme.value);}catch{}
    }
    applyTheme();
    theme.addEventListener('change',applyTheme);
    const onSystemThemeChange=()=>{if(theme.value==='system')applyTheme();};
    systemTheme.addEventListener('change',onSystemThemeChange);
    window.addEventListener('pagehide',()=>systemTheme.removeEventListener('change',onSystemThemeChange),{once:true});
    const stage = document.querySelector('.preview-stage');
    const frame = make('div', 'ps-preview-frame');
    stage.append(frame);
    frame.append($('preview'));
    // All visible preview shapes share one SVG scene; no image mask or raster display.
    const previewSource=$('preview');
    previewSource.style.visibility='hidden';
    const boardSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    boardSvg.classList.add('ps-preview-board');
    boardSvg.setAttribute('aria-hidden','true');
    boardSvg.setAttribute('focusable','false');
    boardSvg.setAttribute('preserveAspectRatio','none');
    boardSvg.setAttribute('shape-rendering','geometricPrecision');
    frame.append(boardSvg);
    function boardElement(tag,attributes={}){
      const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
      for(const [name,value] of Object.entries(attributes))element.setAttribute(name,String(value));
      return element;
    }
    const boardIdle=boardElement('rect',{fill:'none',stroke:'var(--line)','stroke-width':3});
    const boardGlow=boardElement('g',{fill:'none',stroke:'var(--preview-glow,var(--brand))'});
    const boardLayers=[];
    // A wider halo fits the existing SVG gutter; the solid core stays 3px.
    for(let stroke=12;stroke>=1;stroke--){
      const rect=boardElement('rect',{'stroke-width':stroke+2,'stroke-opacity':stroke===1?'var(--preview-core-opacity,1)':'var(--preview-glow-opacity,.085)'});
      if(stroke===1)rect.setAttribute('stroke','var(--preview-core,var(--brand))');
      boardGlow.append(rect);boardLayers.push(rect);
    }
    const boardScreen=boardElement('rect',{fill:'#000'});
    const boardCells=boardElement('g');
    boardSvg.append(boardIdle,boardGlow,boardScreen,boardCells);
    // This tiny canvas only reads the existing matrix colors, never paints the UI.
    const boardSampler=document.createElement('canvas');
    const boardSamplePaint=boardSampler.getContext('2d',{willReadFrequently:true});
    let boardGeometry=null,boardPixels=null,boardGeometryKey='',boardPaintRequest=0;
    let boardDisposed=false;
    let boardBreathStart=performance.now(),boardWasPlaying=false;
    const boardMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    boardMotion.addEventListener('change',queueBoardPaint);
    let boardCellNodes=[],boardCellColors=[];
    function queueBoardPaint(){
      if(boardDisposed||boardPaintRequest)return;
      boardPaintRequest=requestAnimationFrame(()=>{boardPaintRequest=0;paintBoard();});
    }
    function captureBoardPixels(){
      if(boardDisposed||!boardGeometry||!previewSource.complete||!previewSource.naturalWidth)return;
      // A newly selected matrix must not sample a still-decoding previous size.
      if(previewSource.naturalWidth!==boardGeometry.columns||previewSource.naturalHeight!==boardGeometry.rows)return;
      boardSampler.width=boardGeometry.columns;
      boardSampler.height=boardGeometry.rows;
      boardSamplePaint.imageSmoothingEnabled=false;
      boardSamplePaint.drawImage(previewSource,0,0,boardSampler.width,boardSampler.height);
      boardPixels=boardSamplePaint.getImageData(0,0,boardSampler.width,boardSampler.height).data;
      queueBoardPaint();
    }
    previewSource.addEventListener('load',captureBoardPixels);
    const boardSourceObserver=new MutationObserver(()=>{
      if(!previewSource.getAttribute('src')){boardPixels=null;queueBoardPaint();}
    });
    boardSourceObserver.observe(previewSource,{attributes:true,attributeFilter:['src']});
    window.addEventListener('pagehide',()=>{
      boardDisposed=true;
      boardMotion.removeEventListener('change',queueBoardPaint);
      boardSourceObserver.disconnect();previewSource.removeEventListener('load',captureBoardPixels);
      if(boardPaintRequest)cancelAnimationFrame(boardPaintRequest);
    },{once:true});
    function boardRect(element,x,y,w,h,r){
      for(const [name,value] of Object.entries({x,y,width:w,height:h,rx:r,ry:r}))
        element.setAttribute(name,String(value));
    }
    function paintBoard(){
      if(!boardGeometry)return;
      const {columns,rows,pitch,inset,radius,screenRadius,width,height,cad}=boardGeometry;
      const key=[columns,rows,pitch,cad].join('|');
      if(key!==boardGeometryKey){
        boardGeometryKey=key;
        boardSvg.setAttribute('viewBox',`0 0 ${width+20} ${height+20}`);
        // A 1.5px outset equals half the 3px core: its inner edge touches black.
        boardRect(boardIdle,8.5,8.5,width+3,height+3,screenRadius+1.5);
        for(const rect of boardLayers)boardRect(rect,8.5,8.5,width+3,height+3,screenRadius+1.5);
        boardRect(boardScreen,10,10,width,height,screenRadius);
        // Square cells share snapped hard edges; only rounded cells need antialiasing.
        boardCells.setAttribute('shape-rendering',cad?'geometricPrecision':'crispEdges');
        if(boardCellNodes.length!==columns*rows){
          boardCells.replaceChildren();boardCellNodes=[];boardCellColors=[];
          const fragment=document.createDocumentFragment();
          for(let i=0;i<columns*rows;i++){
            const rect=boardElement('rect',{fill:'#000'});fragment.append(rect);boardCellNodes.push(rect);
          }
          boardCells.append(fragment);
        }
        for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
          boardRect(boardCellNodes[y*columns+x],10+2*inset+x*pitch,10+2*inset+y*pitch,
            pitch-2*inset,pitch-2*inset,cad?radius:0);
        }
      }
      const playing=frame.classList.contains('is-playing');
      if(playing&&!boardWasPlaying)boardBreathStart=performance.now();
      boardWasPlaying=playing;
      // Keep the same theme border underneath every pulse, including its trough.
      boardIdle.style.display='';
      boardGlow.style.display=playing?'':'none';
      if(playing){
        const elapsed=performance.now()-boardBreathStart;
        const pulse=boardMotion.matches?1:
          .5-.5*Math.cos(elapsed*2*Math.PI/3800);
        // Fade in from zero on the first rise, then keep a visible breathing floor.
        const opacity=elapsed<1900?pulse:.3+.7*pulse;
        boardGlow.setAttribute('opacity',String(opacity));
      }
      const validPixels=boardPixels&&boardPixels.length===columns*rows*4;
      for(let i=0;i<boardCellNodes.length;i++){
        const offset=i*4;
        const color=validPixels?`rgb(${boardPixels[offset]},${boardPixels[offset+1]},${boardPixels[offset+2]})`:'#000';
        if(color!==boardCellColors[i]){
          boardCellColors[i]=color;boardCellNodes[i].setAttribute('fill',color);
        }
      }
      if(playing&&!boardMotion.matches&&!document.hidden)queueBoardPaint();
    }
    const boardVisibility=()=>queueBoardPaint();
    document.addEventListener('visibilitychange',boardVisibility);
    window.addEventListener('pagehide',()=>document.removeEventListener('visibilitychange',boardVisibility),{once:true});

    // A single native dialog owns opening, closing, focus and Escape handling.
    const dialog = make('dialog', 'ps-settings');
    dialog.id = 'studioSettings';
    dialog.setAttribute('aria-labelledby', 'studioSettingsTitle');
    const heading = make('header', 'ps-settings-heading');
    const title = make('h2', '', '设置'); title.id = 'studioSettingsTitle';
    const close = make('button', 'ps-close', '\u00d7'); close.type = 'button';
    close.setAttribute('aria-label', '关闭设置');
    const body = make('div', 'ps-settings-body');
    heading.append(title, close); dialog.append(heading, body); document.body.append(dialog);
    const gear = $('webSettingsToggle');
    gear.setAttribute('aria-controls', dialog.id);
    gear.setAttribute('aria-haspopup', 'dialog');
    gear.setAttribute('aria-expanded', 'false');
    gear.addEventListener('click', () => {
      if (dialog.open) return;
      dialog.showModal(); body.scrollTop = 0; updateSettingsEdges(); gear.setAttribute('aria-expanded', 'true');
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { gear.setAttribute('aria-expanded', 'false'); gear.focus(); });
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
    });
    const group = name => {
      const node = make('fieldset', 'ps-settings-group');
      node.append(make('legend', '', name)); body.append(node); return node;
    };
    function row(parent, text, nodes, className = '') {
      const line = make('div', 'ps-setting-row');
      const label = make('label', 'ps-setting-label', text);
      const field = make('div', 'ps-setting-field ' + className);
      nodes.filter(Boolean).forEach(node => field.append(node));
      const first = field.querySelector('input:not([type=checkbox]),select,button');
      if (first?.id) label.htmlFor = first.id;
      line.append(label, field); parent.append(line);
    }
    function fieldHelp(control, help) {
      const line = control.closest('.ps-setting-row');
      line.classList.add('ps-setting-with-help');
      help.classList.add('ps-field-help');
      if (!help.id) help.id = control.id + 'Help';
      const descriptions = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      descriptions.add(help.id);
      control.setAttribute('aria-describedby', [...descriptions].join(' '));
      line.append(help);
    }
    // Move actual controls to preserve their existing transport handlers.
    const appearance = document.querySelector('.pixel-appearance');
    const appearanceButtons = appearance ? [...appearance.querySelectorAll('button')] : [];
    const interfaceGroup = group('界面设置');
    const language = make('select'); language.id = 'webLanguage';
    language.append(new Option('跟随系统', 'auto'), new Option('简体中文', 'zh-CN'), new Option('English', 'en'));
    language.value = document.documentElement.getAttribute('data-language-preference') || 'auto';
    row(interfaceGroup, '语言', [language]);
    row(interfaceGroup, '主题', [$('webTheme')]);
    const aboutButton = make('button', 'ps-about-button', '关于 Pixel Studio');
    aboutButton.type = 'button';
    const diagnosticsButton = make('button','ps-about-button');
    diagnosticsButton.type='button';diagnosticsButton.id='psDiagnosticsButton';
    diagnosticsButton.setAttribute('data-update-ui','');
    diagnosticsButton.setAttribute('aria-haspopup','dialog');
    diagnosticsButton.setAttribute('aria-controls','psDiagnosticsDialog');

    const aboutDialog = make('dialog', 'ps-settings ps-media-dialog');
    aboutDialog.setAttribute('aria-labelledby', 'pixelStudioAboutTitle');
    const aboutHeading = make('header', 'ps-settings-heading');
    const aboutTitle = make('h2', '', 'Pixel Studio'); aboutTitle.id = 'pixelStudioAboutTitle';
    const aboutClose = make('button', 'ps-close', '\u00d7'); aboutClose.type = 'button';
    aboutClose.setAttribute('aria-label', '关闭');
    aboutHeading.append(aboutTitle, aboutClose);
    const aboutBody = make('div', 'ps-settings-body ps-about-body');
    aboutBody.setAttribute('data-update-ui', '');
    aboutDialog.append(aboutHeading, aboutBody); document.body.append(aboutDialog);
    function renderAbout() {
      const english = document.documentElement.lang === 'en';
      aboutBody.replaceChildren(
        make('p', '', window.pixelStudioDesktop?.edition
          ? (english ? `Version ${VERSION} · Desktop edition` : `版本 ${VERSION} · 桌面版`)
          : (english ? `Version ${VERSION} · Web edition` : `版本 ${VERSION} · 网页版`)),
        make('p', '', english ? 'Small pixels. Endless imagination.' : '方寸像素，无限想象。'),
        make('p', '', english ? 'A pixel animation studio for WLED. The web app and OpenRGB plugin share an animation library, with live previews, custom palettes and USB / Adalight or DDP output.' : '为 WLED 打造的像素动画工作室。网页版与 OpenRGB 插件共享动画库，支持实时预览、自定义配色，以及 USB / Adalight 和 DDP 输出。'),
        make('h3', '', english ? 'Authors & collaborators' : '作者与协作成员'),
        (() => {
          const authors = make('p', '', 'GPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra · GPT-6.1 Sol');
          authors.append(make('br'), document.createTextNode('OWEN'));
          return authors;
        })(),
        make('p', '', english ? 'Created through AI and human collaboration: AI collaborators contribute to design and development; OWEN guides the product, visual direction and device feedback.' : '由 AI 与人类共同创作：AI 协作成员参与设计和开发；OWEN 主导产品方向、视觉取舍与设备体验反馈。'),
        make('p', '', english ? 'Special thanks: David Wang · Mango Akuma · Mark Peng · SSSSWILK · &#xff1f · 3FC' : '特别感谢：David Wang · Mango Akuma · Mark Peng · SSSSWILK · &#xff1f · 3FC'),
        make('p', '', english ? 'Temperature monitoring: thanks to LibreHardwareMonitor and its contributors for the hardware monitoring library, and to PawnIO for low-level hardware access.' : '温度采集：感谢 LibreHardwareMonitor 及其贡献者提供硬件监控库，感谢 PawnIO 提供底层硬件访问支持。'),
        make('p', '', english ? 'Independent project. Thanks to the WLED, OpenRGB, Qt and Node.js communities. Not an official WLED or OpenRGB release.' : '独立项目，感谢 WLED、OpenRGB、Qt 与 Node.js 社区。本项目不是 WLED 或 OpenRGB 的官方发行版。')
      );
    }
    aboutButton.addEventListener('click', () => {
      renderAbout();
      if (!aboutDialog.open) aboutDialog.showModal();
    });
    aboutClose.addEventListener('click', () => aboutDialog.close());
    aboutDialog.addEventListener('close', () => aboutButton.focus());
    const output = group('设备与输出');
    output.classList.add('ps-output-settings');
    const deviceType=make('select');deviceType.id='psOutputDevice';
    const reservedController=new Option('Pixel IO（预留）','pixel-studio-controller');
    // Layout reservation only: never present an unsupported device as connectable.
    reservedController.disabled=true;
    deviceType.append(new Option('WLED','wled'),reservedController);
    deviceType.value='wled';
    row(output,'设备',[deviceType]);
    const deviceHelp=make('p','ps-help','Pixel IO 暂不可用，先预留入口。');
    fieldHelp(deviceType,deviceHelp);
    const outputMode = $('controlMode');
    const savedMode = outputMode.value;
    outputMode.replaceChildren(new Option('USB', 'serial'), new Option('DDP', 'ddp'));
    outputMode.value = savedMode === 'ddp' ? 'ddp' : 'serial';
    $('protocol').value = 'adalight';
    outputMode.dispatchEvent(new Event('change', { bubbles:true }));
    $('runtimeNotice').hidden = true;
    row(output, '连接方式', [$('controlMode')]);
    const ddpHelp=make('div','ps-help');ddpHelp.setAttribute('data-update-ui','');
    const ddpMessage=make('p'),ddpAction=make('button','ps-about-button');ddpAction.type='button';
    ddpHelp.append(ddpMessage,ddpAction);output.append(ddpHelp);
    const desktopBridge=window.pixelStudioDesktop?.ensureDdp;
    const servedBridge=!!document.querySelector('meta[name="pixel-bridge-token"]');
    let bridgeState='idle';
    function renderDdpHelp(){
      const en=document.documentElement.lang==='en';
      ddpHelp.hidden=outputMode.value!=='ddp';ddpAction.disabled=bridgeState==='starting';
      ddpAction.hidden=servedBridge||bridgeState==='ready';
      ddpAction.textContent=desktopBridge?(en?'Start DDP service':'启动 / 重试 DDP 服务'):(en?'Open DDP page':'打开本地 DDP 页面');
      ddpMessage.textContent=servedBridge||bridgeState==='ready'?(en?'DDP ready. Enter the controller IP to send.':'DDP 服务已就绪，发送前请填写控制器 IP 地址。')
        :bridgeState==='starting'?(en?'Starting DDP...':'正在启动内置 DDP 服务…')
        :desktopBridge?(en?'DDP uses the bundled runtime. If startup fails, retry or check the log.':'DDP 使用内置运行环境，无需另装 Node.js。启动失败时可重试并查看诊断日志。')
        :(en?'Run Start-Pixel-DDP.cmd from this web folder, then use the local page it opens. This file page cannot send DDP directly. Enter your controller IP and settings again on the local page. The launcher needs bundled or installed Node.js.':'运行本网页文件夹内的 Start-Pixel-DDP.cmd，再使用它打开的本地页面。本文件页面不能直接发送 DDP；请在本地页面重新填写控制器 IP 和参数。启动器需要内置或已安装的 Node.js。');
    }
    async function prepareDdp(){
      renderDdpHelp();if(!desktopBridge||outputMode.value!=='ddp'||bridgeState==='starting'||bridgeState==='ready')return;
      bridgeState='starting';renderDdpHelp();
      try{const result=await desktopBridge();if(!result.ok)throw new Error(result.error);bridgeState='ready';}
      catch(error){bridgeState='failed';$('log').textContent+='\nDDP: '+error.message;}
      renderDdpHelp();
    }
    ddpAction.addEventListener('click',()=>{if(desktopBridge)void prepareDdp();else window.open('http://127.0.0.1:8766/','_blank','noopener,noreferrer');});
    outputMode.addEventListener('change',()=>{void prepareDdp();});
    window.addEventListener('pixel-studio-language-change',renderDdpHelp);
    void prepareDdp();
    const portStatus = make('output'); portStatus.id = 'webPortStatus'; portStatus.setAttribute('data-update-ui','');
    portStatus.value = '尚未连接'; $('quickSerialBtn').textContent = '选择串口';
    row(output, 'USB 端口', [portStatus, $('quickSerialBtn')], 'ps-input-action');
    const readSize=$('readDeviceSizeBtn');readSize.setAttribute('data-update-ui','');
    const hostInput=$('wledHost');
    const simplifyHost=()=>{
      // deviceBase supplies HTTP for bare hosts. Keep explicit HTTPS unchanged.
      hostInput.value=hostInput.value.trim().replace(/^http:\/\//i,'');
    };
    simplifyHost();
    hostInput.addEventListener('change',simplifyHost);
    window.addEventListener('pixel-studio-desktop-ready',simplifyHost);
    row(output, 'IP 地址', [hostInput, readSize], 'ps-input-action');
    const ipHelp=make('p','ps-help ps-ip-help');ipHelp.id='psIpHelp';ipHelp.setAttribute('data-update-ui','');
    $('wledHost').setAttribute('aria-describedby',ipHelp.id);readSize.setAttribute('aria-describedby',ipHelp.id);
    fieldHelp($('wledHost'), ipHelp);
    function renderIpHelp(){
      const english=document.documentElement.lang==='en';
      readSize.textContent=english?'Read size':'读取尺寸';
      readSize.title=english?'Read WLED size over the network':'通过网络读取 WLED 屏幕尺寸';
      readSize.setAttribute('aria-label',readSize.title);
      ipHelp.title=outputMode.value==='ddp'
        ?(english?'WLED network address for DDP output and device settings.':'用于 DDP 输出及读取设备设置的 WLED 网络地址。')
        :(english?'Optional WLED network address for reading size and color settings. USB frames are sent through the serial port.':'可选的 WLED 网络地址，用于读取尺寸和颜色设置；USB 画面仍通过串口发送。');
      ipHelp.textContent=outputMode.value==='ddp'
        ?(english?'Required for network output.':'必填，用于网络输出。')
        :(english?'Optional; reads device settings.':'选填，用于读取屏幕配置。');
    }
    outputMode.addEventListener('change',renderIpHelp);
    window.addEventListener('pixel-studio-language-change',renderIpHelp);
    renderIpHelp();
    const size = make('div', 'ps-size-fields');
    for (const [name, id] of [['宽', 'matrixW'], ['高', 'matrixH']]) {
      const pair=make('div','ps-size-pair');
      const label = make('label', '', name); label.htmlFor = id;
      pair.append(label,$(id));size.append(pair);
    }
    const rounded = make('input'); rounded.type = 'checkbox'; rounded.id = 'psRoundedPreview';
    rounded.setAttribute('role','switch');
    rounded.checked = $('preview').classList.contains('cad-pixels');
    const roundedLabel = make('label', 'ps-check ps-preview-switch');
    roundedLabel.htmlFor = rounded.id; roundedLabel.setAttribute('data-update-ui','');
    const roundedState = make('span','ps-switch-state'); roundedState.setAttribute('aria-hidden','true');
    const roundedTrack = make('span','ps-switch-track'); roundedTrack.setAttribute('aria-hidden','true');
    roundedLabel.append(roundedState,rounded,roundedTrack);
    row(interfaceGroup, '圆角预览', [roundedLabel], 'ps-preview-switch-field');
    interfaceGroup.lastElementChild.querySelector('.ps-setting-label').htmlFor = rounded.id;
    function renderRoundedPreview(){
      const en=document.documentElement.lang==='en';
      roundedState.textContent=rounded.checked?(en?'On':'开'):(en?'Off':'关');
      rounded.setAttribute('aria-label',en?'Rounded':'圆角预览');
    }
    renderRoundedPreview();
    row(output, '屏幕尺寸', [size]);
    const resolutionNotice=make('span','ps-size-notice');
    resolutionNotice.id='psResolutionNotice';resolutionNotice.setAttribute('role','status');
    resolutionNotice.setAttribute('data-update-ui','');size.append(resolutionNotice);
    for(const id of ['matrixW','matrixH'])$(id).setAttribute('aria-describedby','psResolutionNotice');
    const syncResolutionNotice=()=>{
      const {maxAxis,maxPixels}=window.PixelStudioRenderSettings.dimensionLimits;
      const en=document.documentElement.lang==='en';
      const invalid=!!api.resolutionError;
      resolutionNotice.textContent=resolutionHint({maxAxis,maxPixels},api.getFrameConfig(),invalid,en);
      resolutionNotice.title=api.resolutionError||(en
        ? `Each dimension: 1-${maxAxis} whole pixels. At most ${maxPixels} pixels in total.`
        : `宽和高均为 1~${maxAxis} 的整数，总像素数不超过 ${maxPixels}。`);
      resolutionNotice.classList.toggle('is-invalid',invalid);
      resolutionNotice.hidden=false;
    };
    window.addEventListener('pixel-studio-resolution-change',syncResolutionNotice);
    syncResolutionNotice();
    row(output, '快捷尺寸', [...document.querySelectorAll('.presets button')], 'ps-presets');
    row(output, '排列', [$('mapping')]);
    const fpsRange = make('input'); fpsRange.type = 'range';
    fpsRange.min = '1'; fpsRange.max = '60'; fpsRange.step = '1'; fpsRange.value = $('fps').value;
    fpsRange.setAttribute('aria-label', '发送帧率');
    row(output, '帧率', [fpsRange, $('fps'), make('span', 'ps-unit', 'FPS')], 'ps-fps');
    fpsRange.addEventListener('input', () => { $('fps').value = fpsRange.value; $('fps').dispatchEvent(new Event('change', { bubbles:true })); });
    $('fps').addEventListener('input', () => { fpsRange.value = $('fps').value; });
    function renderOutputRateHelp(){
      const en=document.documentElement.lang==='en';
      const help=outputMode.value==='ddp'
        ?(en?'Target computer send rate, not confirmed screen FPS. Short send failures are retried; statistics timeouts do not stop the stream. Try 30 FPS if the network is unstable.':'电脑目标发送帧率，不代表屏幕实测帧率。短暂发送异常会重试；统计查询超时不停止推流。网络不稳定时可尝试 30 FPS。')
        :(en?'Target serial send rate, not confirmed screen FPS.':'串口目标发送帧率，不代表屏幕实测帧率。');
      for(const node of [fpsRange,$('fps')]){node.setAttribute('data-update-ui','');node.title=help;}
    }
    outputMode.addEventListener('change',renderOutputRateHelp);
    window.addEventListener('pixel-studio-language-change',renderOutputRateHelp);
    renderOutputRateHelp();
    $('deviceInfo').classList.add('ps-help');
    if (!('serial' in navigator)) output.append(make('p', 'ps-help ps-warning', '此浏览器未提供 Web Serial。USB 输出请在支持该功能的桌面 Chrome 或 Edge 中打开。'));
    const desktopEdition = !!window.pixelStudioDesktop?.edition;
    const mediaInput = $('mediaFile'); mediaInput.hidden = true;
    const importButton = make('button', 'ps-import-button'); importButton.type = 'button';
    importButton.id = 'psMediaToggle';
    importButton.title = document.documentElement.lang === 'en' ? 'Media' : '媒体';
    importButton.setAttribute('aria-label', importButton.title);
    const headerActions = make('div', 'ps-header-actions');
    gear.before(headerActions); headerActions.append(importButton, gear);
    let mediaDialog = null;
    let renderWebMedia = () => {};
    if (desktopEdition) {
      // The desktop media library owns the toggle and all media controls.
      // Keep the internal file input for runtime compatibility, not a second UI.
      document.body.append(mediaInput);
      $('scaleMode')?.closest('div')?.remove();
    } else {
      const media = make('div', 'ps-settings-group ps-media-fields');
      const filePicker = make('div', 'ps-file-picker'); filePicker.setAttribute('data-update-ui', '');
      const chooseFile = make('button', 'ps-about-button'); chooseFile.type = 'button'; chooseFile.id = 'psChooseMedia';
      const fileName = make('span', 'ps-file-name'); fileName.id = 'psMediaFileName'; fileName.setAttribute('role', 'status');
      chooseFile.setAttribute('aria-describedby', fileName.id);
      filePicker.append(chooseFile, fileName, mediaInput);
      chooseFile.addEventListener('click', () => mediaInput.click());
      function renderMediaFile() {
        const en = document.documentElement.lang === 'en';
        chooseFile.textContent = mediaInput.files?.length ? (en ? 'Change file' : '更换文件') : (en ? 'Open file' : '选择文件');
        fileName.textContent = mediaInput.files?.[0]?.name || (en ? 'No file' : '尚未选择文件');
      }
      renderWebMedia = () => {
        renderMediaFile();
        importButton.title = document.documentElement.lang === 'en' ? 'Media' : '媒体';
        importButton.setAttribute('aria-label', importButton.title);
      };
      mediaInput.addEventListener('change', renderMediaFile); queueMicrotask(renderWebMedia);
      row(media, '图片 / 视频', [filePicker]); row(media, '画面适配', [$('scaleMode')]);
      mediaDialog = make('dialog', 'ps-settings ps-media-dialog'); mediaDialog.classList.add('ps-import-dialog');
      mediaDialog.setAttribute('aria-labelledby', 'mediaDialogTitle');
      const mediaHeading = make('header', 'ps-settings-heading');
      const mediaTitle = make('h2', '', '媒体'); mediaTitle.id = 'mediaDialogTitle';
      const mediaClose = make('button', 'ps-close', '\u00d7'); mediaClose.type = 'button';
      mediaClose.setAttribute('aria-label', '关闭媒体导入');
      mediaHeading.append(mediaTitle, mediaClose);
      const mediaBody = make('div', 'ps-settings-body');
      mediaBody.append(media);
      mediaDialog.append(mediaHeading, mediaBody); document.body.append(mediaDialog);
      importButton.setAttribute('data-update-ui', ''); importButton.setAttribute('aria-haspopup', 'dialog');
      importButton.addEventListener('click', () => {
        renderMediaFile(); if (!mediaDialog.open) mediaDialog.showModal(); scheduleShuffle();
      });
      mediaClose.addEventListener('click', () => mediaDialog.close());
      mediaDialog.addEventListener('close', () => importButton.focus());
    }
    row(output, '颜色还原', [$('colorMode')]);
    // Retain the internal value for the shared renderer and transport code,
    // without exposing a manual Gamma control in the settings dialog.
    $('colorGamma').hidden = true;
    fieldHelp($('colorMode'), $('deviceInfo'));
    const updateArea = make('fieldset', 'ps-settings-group');
    updateArea.id = 'psSoftwareUpdates';
    updateArea.setAttribute('data-update-ui', '');
    const updateLegend = make('legend');
    const updateVersionRow = make('div','ps-setting-row');
    const updateVersionLabel = make('span','ps-setting-label');
    const updateVersionField = make('div','ps-setting-field');
    const updateVersion = make('span','ps-update-version',VERSION);
    updateVersionField.append(updateVersion);updateVersionRow.append(updateVersionLabel,updateVersionField);
    const updateActions = make('div', 'ps-update-actions');
    const updateButton = make('button', 'ps-about-button'); updateButton.type = 'button';
    const updateStatus = make('p', 'ps-help'); updateStatus.setAttribute('role', 'status');
    const updateNotes = make('div', 'ps-release-notes');
    const updateDetails = make('details', 'ps-update-details');
    const updateSummary = make('summary');
    updateDetails.append(updateSummary, updateNotes);
    const releaseLink = make('a');
    releaseLink.href = 'https://github.com/OW3N-HE/Pixel-Studio/releases';
    releaseLink.target = '_blank'; releaseLink.rel = 'noopener noreferrer';
    releaseLink.style.color = 'inherit';
    const installerButton = make('button', 'ps-about-button'); installerButton.type = 'button';
    const installerStatus = make('p', 'ps-help');
    const packageLabel = make('label','ps-setting-label'); packageLabel.htmlFor = 'psUpdatePackage';
    const packageSelect = make('select'); packageSelect.id = 'psUpdatePackage';
    packageSelect.append(new Option('', 'installer'), new Option('', 'web'), new Option('', 'source'));
    packageSelect.value = window.pixelStudioDesktop?.edition ? 'installer' : 'web';
    let packages = {}, downloadOpened = false;
    let nativeUpdateState='idle',nativeUpdateVersion='',nativePercent=0;
    const nativeUpdateStatus=make('p','ps-help');nativeUpdateStatus.setAttribute('role','status');
    const nativeInstall=make('button','ps-about-button');nativeInstall.type='button';
    function renderNativeUpdate(){
      const en=document.documentElement.lang==='en';
      const messages={idle:'',downloading:en?`Downloading and verifying installer: ${nativePercent}%`:`正在下载并校验安装包：${nativePercent}%`,ready:en?`Version ${nativeUpdateVersion} downloaded; SHA-256 matches the GitHub asset digest. Ready for your installation confirmation.`:`版本 ${nativeUpdateVersion} 已下载，SHA-256 与 GitHub 附件摘要一致，等待你确认安装。`,failed:en?'Update download or installation failed. Check the diagnostic log, then retry or use the official release page.':'更新下载或安装失败，请查看诊断日志后重试，或使用官方发布页。',installing:en?'Awaiting confirmation...':'等待安装确认…'};
      nativeUpdateStatus.textContent=messages[nativeUpdateState];nativeUpdateStatus.hidden=nativeUpdateState==='idle';
      nativeInstall.textContent=en?'Install update':'安装已下载的更新';
      nativeInstall.hidden=!window.pixelStudioDesktop?.installUpdate||!nativeUpdateVersion;
      nativeInstall.disabled=nativeUpdateState!=='ready';
    }
    window.addEventListener('pixel-studio-update-progress',event=>{
      if(nativeUpdateState!=='downloading')return;
      const {received,total}=event.detail||{};
      if(Number.isFinite(received)&&total>0)nativePercent=Math.max(0,Math.min(99,Math.floor(received/total*100)));
      renderNativeUpdate();
    });
    nativeInstall.addEventListener('click',async()=>{
      nativeUpdateState='installing';renderNativeUpdate();
      try{const result=await window.pixelStudioDesktop.installUpdate();if(!result.ok)throw new Error(result.error);nativeUpdateState='ready';}
      catch(error){nativeUpdateState='failed';$('log').textContent+='\nUpdate: '+error.message;}
      renderNativeUpdate();
    });
    let updateState = 'idle', remoteVersion = '', releaseNotes = '', installerUrl = '';
    const downloadDialog=make('dialog','ps-settings');
    const downloadHeading=make('header','ps-settings-heading');
    const downloadTitle=make('h2');
    const downloadClose=make('button','ps-close','×');downloadClose.type='button';
    downloadHeading.append(downloadTitle,downloadClose);
    const downloadBody=make('div','ps-settings-body');
    const downloadDescription=make('p','ps-help');
    const downloadActions=make('div','ps-update-actions');
    const downloadCancel=make('button','ps-about-button'),downloadConfirm=make('button','ps-about-button');
    downloadCancel.type=downloadConfirm.type='button';
    downloadActions.append(downloadCancel,downloadConfirm);downloadBody.append(downloadDescription,downloadActions);
    downloadDialog.append(downloadHeading,downloadBody);downloadDialog.setAttribute('data-update-ui','');document.body.append(downloadDialog);
    let pendingDownload=null;
    function renderDownload(){
      if(!pendingDownload)return;
      const en=document.documentElement.lang==='en';
      downloadTitle.textContent=en?'Download update':'下载更新';
      downloadClose.setAttribute('aria-label',en?'Close':'关闭');
      downloadCancel.textContent=en?'Cancel':'取消';downloadConfirm.textContent=en?'Download':'继续下载';
      const steps=pendingDownload.kind==='installer'
        ?(en?'Download first. Before installing, save your work and fully quit Desktop and OpenRGB from the tray. Allow Setup to close Pixel Studio processes if prompted; never skip locked files or end unrelated Node.js processes. Keep the same installation scope and personal settings. Nothing is installed automatically.':'先下载。安装前保存工作，并从托盘完全退出桌面版和 OpenRGB。如安装程序提示关闭 Pixel Studio 进程，请允许；不要跳过占用文件，也不要结束其他软件的 Node.js。保持原安装范围并保留个人设置。不会自动安装。')
        :pendingDownload.kind==='web'
          ?(en?'Extract the complete Web ZIP into a new folder, then run Start-Pixel-Studio.cmd with its bundled runtime. Do not overwrite a running web service. The new location may require selecting your USB port again.':'将网页版 ZIP 完整解压到新文件夹，运行 Start-Pixel-Studio.cmd，使用包内运行环境启动。不要覆盖正在运行的网页服务。更换位置后可能需要重新选择串口。')
          :(en?'This is developer source, not an installer. Build tools and dependencies are not installed automatically.':'这是开发源码，不是安装程序；不会自动安装构建工具或依赖。');
      downloadDescription.textContent=pendingDownload.name+'\n\n'+steps;
      downloadDescription.style.whiteSpace='pre-line';
    }
    downloadClose.addEventListener('click',()=>downloadDialog.close());
    downloadCancel.addEventListener('click',()=>downloadDialog.close());
    downloadDialog.addEventListener('close',()=>{pendingDownload=null;});
    downloadConfirm.addEventListener('click',async()=>{
      if(!pendingDownload)return;
      if(pendingDownload.kind==='installer'&&window.pixelStudioDesktop?.downloadUpdate){
        const selectedVersion=remoteVersion;
        downloadDialog.close();nativeUpdateState='downloading';nativeUpdateVersion='';nativePercent=0;renderUpdate();
        try{const result=await window.pixelStudioDesktop.downloadUpdate(selectedVersion);if(!result.ok)throw new Error(result.error);nativeUpdateVersion=result.version;nativeUpdateState='ready';}
        catch(error){nativeUpdateState='failed';$('log').textContent+='\nUpdate: '+error.message;}
        renderUpdate();return;
      }
      window.open(pendingDownload.url,'_blank','noopener,noreferrer');
      downloadDialog.close();downloadOpened=true;renderUpdate();
    });
    packageSelect.addEventListener('change', () => { downloadOpened = false; renderUpdate(); });
    installerButton.addEventListener('click', () => {
      if (installerUrl && ['latest', 'newer'].includes(updateState)) {
        pendingDownload={...packages[packageSelect.value],kind:packageSelect.value};
        renderDownload();downloadDialog.showModal();
      }
    });
    function renderUpdate() {
      const en = document.documentElement.lang === 'en';
      updateLegend.textContent = en ? 'Updates' : '软件更新';
      updateSummary.textContent = en ? `Release notes${remoteVersion ? ' · ' + remoteVersion : ''}` : `更新说明${remoteVersion ? ' · ' + remoteVersion : ''}`;
      updateButton.textContent = en ? 'Check updates' : '检查更新';
      updateVersionLabel.textContent = en ? 'Version' : '当前版本';
      packageLabel.textContent = en ? 'Package' : '下载类型';
      const captions = en ? ['Windows installer (recommended)', 'Web ZIP', 'Source ZIP (developers)']
        : ['Windows 三合一安装包（推荐）', '网页版 ZIP', '源码 ZIP（开发者）'];
      [...packageSelect.options].forEach((option, i) => { option.textContent = captions[i]; });
      const messages = {
        idle: en ? 'Updates are installed manually.' : '更新需手动安装。',
        checking: en ? 'Checking GitHub...' : '正在检查 GitHub...',
        empty: en ? 'No stable release yet.' : '尚未发布正式版本。',
        failed: en ? 'Check failed. Check your network or GitHub limits, then retry.' : '检查失败，请检查网络或稍后重试（可能触发 GitHub 请求限额）。',
        limited: en ? 'GitHub denied the request or its rate limit was reached. Try again later or open the release page.' : 'GitHub 拒绝请求或已达到请求限额，请稍后重试或打开发布页。',
        timeout: en ? 'Check timed out. Retry or open the release page.' : '检查更新超时，请重试或打开发布页。',
        invalid: en ? 'Unsupported version. See the release page.' : '发布版本号格式无法识别，请查看发布页面。',
        latest: en ? `You are up to date (${VERSION}).` : `当前已是最新版本（${VERSION}）。`,
        ahead: en ? `Local version ${VERSION} is newer than published version ${remoteVersion}. No downgrade is offered.` : `本地版本 ${VERSION} 高于已发布版本 ${remoteVersion}，不提供降级安装。`,
        newer: en ? `New version: ${remoteVersion}. Back up your files before replacing them; firmware is not updated automatically.` : `发现新版本：${remoteVersion}。替换前请备份文件；不会自动更新固件。`
      };
      updateStatus.textContent = messages[updateState];
      renderReleaseNotes(updateNotes,releaseNotes,en);
      updateNotes.hidden = !releaseNotes;
      updateDetails.hidden = !releaseNotes;
      releaseLink.textContent = en ? 'Official releases' : '打开官方发布页 / 下载';
      updateButton.disabled = updateState === 'checking';
      const selected = packages[packageSelect.value];
      const available = ['latest', 'newer'].includes(updateState);
      installerUrl = available && selected ? selected.url : '';
      installerButton.textContent = updateState==='latest'
        ?(en?'Download again':'重新下载')
        :(en?'Download':'下载所选版本');
      installerButton.disabled = !installerUrl || ['downloading','installing'].includes(nativeUpdateState);
      const instructions = {
        installer: en ? 'Includes Desktop, Web and the OpenRGB plugin. The required Node.js runtime is bundled. Save your work, quit Desktop and OpenRGB from the tray, then run the installer. Keep personal settings when prompted; firmware is not flashed.' : '包含桌面版、网页版和 OpenRGB 插件，已内置所需 Node.js。保存工作并从托盘退出桌面版及 OpenRGB 后运行安装包；如提示处理个人设置，请选择保留。不会刷写固件。',
        web: en ? 'Extract the complete Web ZIP into a new folder and run Start-Pixel-Studio.cmd with the bundled runtime. Opening index.html directly does not start the local DDP or temperature service; browser USB output can be used separately. A new folder may require selecting your USB device again.' : '将网页版 ZIP 完整解压到新文件夹，运行 Start-Pixel-Studio.cmd，使用包内运行环境启动。直接打开 index.html 不会启动本地 DDP 或温度服务；浏览器 USB 输出可单独使用。更换位置后可能需要重新选择 USB 设备。',
        source: en ? 'For developers, not a ready-to-run installation. Build tools and dependencies must be configured separately.' : '供开发者使用，不是可直接安装的软件，需要自行配置构建工具及依赖。'
      };
      installerStatus.textContent = (installerUrl
        ? `${selected.name} · ${(selected.size / 1048576).toFixed(1)} MB\n${instructions[packageSelect.value]}`
        : available ? (en ? 'Package unavailable. Choose another or see the release page.' : '此发布尚未附加所选文件，请选择其他类型或打开发布页。')
        : updateState === 'ahead' ? (en ? 'Downloads disabled to prevent downgrading.' : '为避免降级，已禁用下载。')
        : (en ? 'Check for updates first. Only matching files from the official repository are offered.' : '请先检查更新，仅提供官方仓库中与版本匹配的文件。'))
        + (downloadOpened ? (en ? '\nDownload link opened. Check your browser downloads; installation has not started.' : '\n已打开下载链接，请查看浏览器下载列表；尚未开始安装。') : '');
      installerStatus.style.whiteSpace = 'pre-line';
      installerStatus.hidden = false;
      renderNativeUpdate();
    }
    updateButton.addEventListener('click', async () => {
      if (updateState === 'checking') return;
      updateState = 'checking'; remoteVersion = ''; releaseNotes = ''; installerUrl = ''; packages = {}; downloadOpened = false; updateDetails.open = false; renderUpdate();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('https://api.github.com/repos/OW3N-HE/Pixel-Studio/releases/latest', {
          signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (response.status === 404) updateState = 'empty';
        else if ([403, 429].includes(response.status)) updateState = 'limited';
        else {
          if (!response.ok) throw new Error('HTTP error');
          const release = await response.json();
          const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(release.tag_name || '');
          if (!match || !match.slice(1).every(part => Number.isSafeInteger(Number(part))) || release.draft || release.prerelease) updateState = 'invalid';
          else {
            remoteVersion = match.slice(1).join('.');
            const parts = match.slice(1).map(Number), current = VERSION.split('.').map(Number);
            const differing = parts.findIndex((part, i) => part !== current[i]);
            updateState = differing < 0 ? 'latest' : parts[differing] > current[differing] ? 'newer' : 'ahead';
            const names = { installer: `PixelStudio-Setup-${remoteVersion}.exe`, web: `PixelStudio-Web-${remoteVersion}.zip`, source: `PixelStudio-Source-${remoteVersion}.zip` };
            for (const [kind, name] of Object.entries(names)) {
              const url = `https://github.com/OW3N-HE/Pixel-Studio/releases/download/${release.tag_name}/${name}`;
              const asset = Array.isArray(release.assets) && release.assets.find(item => item && item.name === name && item.state === 'uploaded' && Number.isSafeInteger(item.size) && item.size > 0 && item.browser_download_url === url);
              if (asset) packages[kind] = { name, url, size: asset.size };
            }
            releaseNotes = typeof release.body === 'string' ? release.body : '';
          }
        }
      } catch { updateState = controller.signal.aborted ? 'timeout' : 'failed'; }
      finally { clearTimeout(timeout); renderUpdate(); }
    });
    updateActions.append(updateButton, installerButton);
    const packageRow=make('div','ps-setting-row');
    const packageField=make('div','ps-setting-field');packageField.append(packageSelect);
    packageRow.append(packageLabel,packageField);
    const updateContentRow=make('div','ps-setting-row');
    const updateContent=make('div','ps-update-content');
    updateContent.append(updateActions,updateStatus,installerStatus,nativeUpdateStatus,nativeInstall,updateDetails,releaseLink);
    updateContentRow.append(updateContent);
    updateArea.append(updateLegend,updateVersionRow,packageRow,updateContentRow);
    body.append(updateArea, diagnosticsButton, aboutButton);
    function arrangeSettingsGroups(){
      for(const section of body.querySelectorAll(':scope > .ps-settings-group')){
        if(section.querySelector(':scope > .ps-settings-group-body'))continue;
        const legend=section.querySelector(':scope > legend');
        const content=make('div','ps-settings-group-body');
        // Move existing nodes, preserving control listeners and live status references.
        for(const child of [...section.childNodes])if(child!==legend)content.append(child);
        section.append(content);
      }
    }
    arrangeSettingsGroups();
    // Desktop settings arrive later; preserve their direct fieldset IDs and ordering.
    const settingsGroupsObserver=new MutationObserver(arrangeSettingsGroups);
    settingsGroupsObserver.observe(body,{childList:true});
    window.addEventListener('pagehide',()=>settingsGroupsObserver.disconnect(),{once:true});
    // Match the library's edge fade without masking the fixed dialog heading.
    function updateSettingsEdges() {
      const maximum = dialog.open ? Math.max(0, body.scrollHeight - body.clientHeight) : 0;
      const top = Math.max(0, Math.min(maximum, body.scrollTop));
      const fade = distance => Math.min(12, Math.max(0, distance - 1)) + 'px';
      body.style.setProperty('--settings-fade-top', fade(top));
      body.style.setProperty('--settings-fade-bottom', fade(maximum - top));
    }
    function revealSettingsControl(event) {
      if (!dialog.open || !(event.target instanceof HTMLElement)) return;
      const viewport = body.getBoundingClientRect(), control = event.target.getBoundingClientRect();
      const top = viewport.top + body.clientTop + 16;
      const bottom = viewport.top + body.clientTop + body.clientHeight - 16;
      if (control.height <= bottom - top) {
        if (control.top < top) body.scrollTop += control.top - top;
        else if (control.bottom > bottom) body.scrollTop += control.bottom - bottom;
      }
      updateSettingsEdges();
    }
    const settingsEdgeResize = new ResizeObserver(updateSettingsEdges);
    const settingsEdgeChildren = new Set();
    settingsEdgeResize.observe(body);
    function observeSettingsContent() {
      for (const child of settingsEdgeChildren) {
        if (child.parentElement !== body) {
          settingsEdgeResize.unobserve(child);
          settingsEdgeChildren.delete(child);
        }
      }
      for (const child of body.children) {
        if (!settingsEdgeChildren.has(child)) {
          settingsEdgeChildren.add(child);
          settingsEdgeResize.observe(child);
        }
      }
      updateSettingsEdges();
    }
    const settingsEdgeMutation = new MutationObserver(observeSettingsContent);
    settingsEdgeMutation.observe(body, {
      subtree:true, childList:true, characterData:true,
      attributes:true, attributeFilter:['hidden', 'open']
    });
    body.addEventListener('scroll', updateSettingsEdges, { passive:true });
    body.addEventListener('focusin', revealSettingsControl);
    observeSettingsContent();
    window.addEventListener('pagehide', () => {
      settingsEdgeResize.disconnect();
      settingsEdgeMutation.disconnect();
      settingsEdgeChildren.clear();
      body.removeEventListener('scroll', updateSettingsEdges);
      body.removeEventListener('focusin', revealSettingsControl);
    }, { once:true });
    queueMicrotask(renderUpdate);
    // Retain IDs used by the renderer even when their old presentation is gone.
    const retained = make('div'); retained.hidden = true;
    ['pixelCount','screenResolution','colorGamma','protocol','baudRate','connectBtn','disconnectBtn','testSerialBtn','serialDiagnostic','log'].forEach(id => { if ($(id)) retained.append($(id)); });
    document.body.append(retained);
    const diagnosticsDialog=make('dialog','ps-settings ps-diagnostics-dialog');
    diagnosticsDialog.id='psDiagnosticsDialog';diagnosticsDialog.setAttribute('data-update-ui','');
    diagnosticsDialog.setAttribute('aria-labelledby','psDiagnosticsTitle');
    const diagnosticsHeading=make('header','ps-settings-heading');
    const diagnosticsTitle=make('h2');diagnosticsTitle.id='psDiagnosticsTitle';
    const diagnosticsClose=make('button','ps-close','\u00d7');diagnosticsClose.type='button';
    diagnosticsHeading.append(diagnosticsTitle,diagnosticsClose);
    const diagnosticsBody=make('div','ps-settings-body ps-diagnostics-body');
    const diagnosticsHint=make('p','ps-help');
    const errorsHeading=make('h3'),logHeading=make('h3');
    const diagnosticsErrors=make('pre','ps-diagnostic-log');diagnosticsErrors.tabIndex=0;
    const runLog=$('log');runLog.classList.add('ps-diagnostic-log');runLog.tabIndex=0;
    // Move the original log node; producers keep their existing node references and history.
    diagnosticsBody.append(diagnosticsHint,errorsHeading,diagnosticsErrors,logHeading,runLog);
    diagnosticsDialog.append(diagnosticsHeading,diagnosticsBody);document.body.append(diagnosticsDialog);
    function renderDiagnosticDetails(){
      const errors=new Set();
      for(const node of document.querySelectorAll('.ps-playback-source.err')){
        if(node.hidden)continue;
        const source=(node.dataset.noticeSource||node.textContent||'').trim();
        if(!source)continue;
        const description=window.pixelStudioDescribeNotice?.(source,'err');
        errors.add(description?.detail||source);
        if(node.title&&!description?.detail?.includes(node.title))errors.add(node.title);
      }
      const notice=api.playing?api.outputNotice:null;
      if(notice)errors.add([notice.message,notice.detail].filter(Boolean).join('\n'));
      const value=[...errors].join('\n\n')||(document.documentElement.lang==='en'?'No active errors.':'当前没有错误。');
      if(diagnosticsErrors.textContent!==value)diagnosticsErrors.textContent=value;
    }
    function renderDiagnostics(){
      const en=document.documentElement.lang==='en';
      diagnosticsButton.textContent=diagnosticsTitle.textContent=en?'Diagnostic log':'诊断日志';
      diagnosticsClose.setAttribute('aria-label',en?'Close diagnostic log':'关闭诊断日志');
      diagnosticsHint.textContent=en
        ?'Current session only; logs reset on reload. Check for device addresses or paths before sharing. Opening this view does not run device diagnostics.'
        :'仅显示本次运行记录，刷新后清空。日志可能包含设备地址或路径，分享前请检查。打开此窗口不会执行设备诊断。';
      errorsHeading.textContent=en?'Current errors':'当前错误';
      logHeading.textContent=en?'Session log':'运行记录';
      runLog.setAttribute('aria-label',logHeading.textContent);
      runLog.dataset.emptyMessage=en?'No log entries yet.':'暂无运行记录。';
      diagnosticsErrors.setAttribute('aria-label',errorsHeading.textContent);
      if(diagnosticsDialog.open)renderDiagnosticDetails();
    }
    diagnosticsButton.addEventListener('click',()=>{
      renderDiagnostics();renderDiagnosticDetails();
      if(!diagnosticsDialog.open)diagnosticsDialog.showModal();
      diagnosticsBody.scrollTop=0;
    });
    diagnosticsClose.addEventListener('click',()=>diagnosticsDialog.close());
    diagnosticsDialog.addEventListener('close',()=>diagnosticsButton.focus({preventScroll:true}));
    diagnosticsDialog.addEventListener('click',event=>{
      const r=diagnosticsDialog.getBoundingClientRect();
      if(event.target===diagnosticsDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))diagnosticsDialog.close();
    });
    renderDiagnostics();
    $('psControlBank').remove(); appearance?.remove();
    rounded.addEventListener('change', () => { appearanceButtons[rounded.checked ? 0 : 1]?.click(); renderRoundedPreview(); updateBoardGeometry(); });

    const gallery = $('animationGallery');
    const well = make('div', 'ps-library-well'); gallery.before(well); well.append(gallery);
    const empty = make('p', 'ps-empty'); empty.hidden = true; well.append(empty);
    empty.setAttribute('data-update-ui','');
    const emptyText=make('span'),clearFilter=make('button','ps-clear-filter');
    clearFilter.type='button';empty.append(emptyText,clearFilter);
    function renderEmptyState(){
      const english=document.documentElement.lang==='en';
      emptyText.textContent=english?'No animations match your filters.':'没有符合条件的动画';
      clearFilter.textContent=english?'Clear filters':'清除筛选';
    }
    renderEmptyState();
    const category = $('libraryCategory'); category.add(new Option('收藏', 'favorites'), 1);
    let saved = []; try { saved = JSON.parse(localStorage.getItem('pixel-studio-favorites') || '[]'); } catch {}
    const favoriteIds = Array.isArray(saved) ? saved : [];
    const favorites = new Set(favoriteIds);
    const cards = [...gallery.querySelectorAll('.animation-card')].map(button => {
      const mode = button.dataset.mode, name = button.querySelector('.animation-title').textContent.trim();
      if (favorites.has(name)) { favorites.delete(name); favorites.add(mode); }
      const tile = make('article', 'ps-animation-tile'); button.before(tile); tile.append(button);
      // Preserve original nodes and dimensions; crop artwork/title together inside the rim.
      const content=make('span','ps-card-content');
      content.append(...button.childNodes);button.append(content);
      const heart = make('button', 'ps-favorite'); heart.type = 'button';
      heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
      tile.append(heart);
      heart.addEventListener('click', () => {
        if (favorites.has(mode)) favorites.delete(mode); else favorites.add(mode);
        try { localStorage.setItem('pixel-studio-favorites', JSON.stringify([...favorites])); } catch {}
        syncGallery();
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          heart.querySelector('svg')?.animate([
            { transform:'scale(1)' },
            { transform:'scale(.86)', offset:.25 },
            { transform:'scale(1.12)', offset:.65 },
            { transform:'scale(1)' }
          ], { duration:260, easing:'cubic-bezier(.2,.7,.3,1)' });
        }
      });
      return { button, tile, heart, mode, name };
    });
    function applyAnimationOrder(order){
      const rank=new Map(order.map((id,index)=>[id,index]));
      cards.sort((a,b)=>rank.get(a.mode)-rank.get(b.mode));
      libraryOrder.arrange(gallery,cards.map(item=>item.tile));
    }
    applyAnimationOrder(libraryOrder.read('animations',cards.map(item=>item.mode)));
    const animationSorter=libraryOrder.attach(gallery,{
      order:()=>cards.map(item=>item.mode),
      visible:()=>cards.filter(item=>!item.tile.hidden&&!item.button.hidden).map(item=>item.mode),
      commit:order=>{
        applyAnimationOrder(order);libraryOrder.remember('animations',order);
        scheduleGalleryEdges();scheduleShuffle();
      }
    });
    for(const item of cards)animationSorter.decorate(item.tile,item.mode);
    const libraryScrollbars=new WeakMap();
    let libraryScrollbarId=0;
    function createLibraryScrollbar(scrollport) {
      const host=scrollport.closest('.ps-library-well');
      if(!host)return null;
      const controller=new AbortController(),signal=controller.signal;
      const rail=make('div','ps-library-scrollbar'),thumb=make('span','ps-library-scrollbar-thumb');
      if(!scrollport.id)scrollport.id='psLibraryScrollport'+(++libraryScrollbarId);
      rail.hidden=true;rail.tabIndex=0;rail.setAttribute('data-update-ui','');
      rail.setAttribute('role','scrollbar');rail.setAttribute('aria-orientation','vertical');
      rail.setAttribute('aria-controls',scrollport.id);rail.setAttribute('aria-valuemin','0');
      rail.setAttribute('aria-valuemax','0');rail.setAttribute('aria-valuenow','0');
      thumb.setAttribute('aria-hidden','true');rail.append(thumb);host.append(rail);
      // Native scrolling stays intact; only its layout-consuming rail is replaced.
      scrollport.classList.add('ps-library-overlay-scroll');
      scrollport.style.overflowY='auto';
      let maximum=0,track=0,thumbHeight=0,travel=0,paintFrame=0,drag=null,nearBounds=null,pointer=null;
      function label() {
        const text=document.documentElement.lang==='en'?'Scroll library':'滚动图库';
        rail.setAttribute('aria-label',text);
      }
      function finishDrag(event) {
        if(!drag||(event&&event.pointerId!==drag.id))return;
        const id=drag.id;drag=null;rail.classList.remove('is-dragging');
        if(event?.type==='pointerup')updateProximity(event);
        else if(event)clearProximity();
        if(rail.hasPointerCapture(id))rail.releasePointerCapture(id);
      }
      function hide() {
        finishDrag();rail.hidden=true;maximum=0;nearBounds=null;
        clearProximity();
      }
      function paint() {
        if(rail.hidden)return;
        const position=Math.max(0,Math.min(maximum,scrollport.scrollTop));
        const offset=maximum?position/maximum*travel:0;
        thumb.style.transform='translateY('+offset+'px)';
        rail.setAttribute('aria-valuenow',String(Math.round(position)));
        updateProximity();
      }
      function schedulePaint() {
        if(paintFrame)return;
        paintFrame=requestAnimationFrame(()=>{paintFrame=0;paint();});
      }
      function update() {
        // Overlay rails are siblings and must follow their scrollport's visibility.
        if(scrollport.hidden||getComputedStyle(scrollport).visibility!=='visible'){hide();return;}
        const height=scrollport.clientHeight;
        if(!scrollport.clientWidth||!height){hide();return;}
        maximum=Math.max(0,scrollport.scrollHeight-height);
        track=Math.max(0,height-16);
        if(maximum<=1||!track){
          if(maximum<=1&&scrollport.scrollTop)scrollport.scrollTop=0;
          hide();return;
        }
        const viewport=scrollport.getBoundingClientRect(),bounds=host.getBoundingClientRect();
        rail.style.top=(viewport.top-bounds.top-host.clientTop+scrollport.clientTop+8)+'px';
        rail.style.height=track+'px';
        // Cache the rail origin; proximity follows only the visible thumb.
        const railTop=viewport.top+scrollport.clientTop+8;
        nearBounds={right:bounds.right-host.clientLeft,top:railTop};
        // Even a small real overflow gets a visible, movable thumb rather than an empty rail.
        const minimum=Math.min(24,track/2),maximumThumb=track-Math.min(12,track/2);
        thumbHeight=Math.max(minimum,Math.min(maximumThumb,track*height/(height+maximum)));
        travel=track-thumbHeight;
        thumb.style.height=thumbHeight+'px';
        rail.setAttribute('aria-valuemax',String(Math.round(maximum)));
        rail.hidden=false;paint();
      }
      function point(clientY) {
        const bounds=rail.getBoundingClientRect();
        return bounds.height?(clientY-bounds.top)*track/bounds.height:0;
      }
      function dragTo(clientY) {
        if(!drag||!travel)return;
        const offset=Math.max(0,Math.min(travel,point(clientY)-drag.offset));
        scrollport.scrollTop=offset/travel*maximum;paint();
      }
      rail.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        update();if(rail.hidden||!travel)return;
        updateProximity(event);
        event.preventDefault();rail.focus({preventScroll:true});
        const y=point(event.clientY),top=Math.max(0,Math.min(maximum,scrollport.scrollTop))/maximum*travel;
        drag={id:event.pointerId,offset:y>=top&&y<=top+thumbHeight?y-top:thumbHeight/2};
        rail.setPointerCapture(event.pointerId);rail.classList.add('is-dragging');
        dragTo(event.clientY);
      },{signal});
      rail.addEventListener('pointermove',event=>{
        if(drag&&event.pointerId===drag.id)dragTo(event.clientY);
      },{signal});
      rail.addEventListener('pointerup',finishDrag,{signal});
      rail.addEventListener('pointercancel',finishDrag,{signal});
      rail.addEventListener('lostpointercapture',finishDrag,{signal});
      rail.addEventListener('wheel',event=>{
        if(event.ctrlKey||!event.deltaY||rail.hidden)return;
        event.preventDefault();
        const unit=event.deltaMode===1?16:event.deltaMode===2?scrollport.clientHeight:1;
        scrollport.scrollTop+=event.deltaY*unit;paint();
      },{passive:false,signal});
      rail.addEventListener('keydown',event=>{
        if(event.altKey||event.ctrlKey||event.metaKey)return;
        update();if(rail.hidden)return;
        const page=scrollport.clientHeight*.9;
        const steps={ArrowUp:-40,ArrowDown:40,PageUp:-page,PageDown:page};
        let position=scrollport.scrollTop;
        if(event.key==='Home')position=0;
        else if(event.key==='End')position=maximum;
        else if(event.key in steps)position+=steps[event.key];
        else return;
        event.preventDefault();scrollport.scrollTop=position;paint();
      },{signal});
      function clearProximity() {
        pointer=null;rail.classList.remove('is-near');
      }
      function updateProximity(event) {
        if(event)pointer={clientX:event.clientX,clientY:event.clientY,pointerType:event.pointerType};
        if(!pointer||pointer.pointerType==='touch'||rail.hidden||!nearBounds){
          rail.classList.remove('is-near');return;
        }
        const position=Math.max(0,Math.min(maximum,scrollport.scrollTop));
        const top=nearBounds.top+(maximum?position/maximum*travel:0);
        const right=nearBounds.right;
        const near=pointer.clientX>=right-24&&pointer.clientX<=right
          &&pointer.clientY>=top&&pointer.clientY<=top+thumbHeight;
        rail.classList.toggle('is-near',near);
      }
      host.addEventListener('pointermove',updateProximity,{passive:true,signal});
      host.addEventListener('pointerleave',clearProximity,{signal});
      window.addEventListener('blur',clearProximity,{signal});
      scrollport.addEventListener('scroll',schedulePaint,{passive:true,signal});
      window.addEventListener('pixel-studio-language-change',label,{signal});
      window.addEventListener('pagehide',()=>{
        finishDrag();controller.abort();
        if(paintFrame)cancelAnimationFrame(paintFrame);
        rail.remove();scrollport.classList.remove('ps-library-overlay-scroll');
        libraryScrollbars.delete(scrollport);
      },{once:true,signal});
      label();
      return {update};
    }
    function syncLibraryOverflow(scrollport) {
      let scrollbar=libraryScrollbars.get(scrollport);
      if(!scrollbar){
        if(!scrollport.clientWidth||!scrollport.clientHeight)return;
        scrollbar=createLibraryScrollbar(scrollport);
        if(!scrollbar)return;
        libraryScrollbars.set(scrollport,scrollbar);
      }
      scrollbar.update();
    }
    window.pixelStudioSyncLibraryOverflow=syncLibraryOverflow;
    let pendingGalleryEdges = false, galleryEdgesDisposed = false;
    function updateGalleryEdges() {
      const maximum = Math.max(0, gallery.scrollHeight - gallery.clientHeight);
      const top = Math.max(0, Math.min(maximum, gallery.scrollTop));
      const fade = distance => Math.min(12, Math.max(0, distance - 1)) + 'px';
      gallery.style.setProperty('--gallery-fade-top', fade(top));
      gallery.style.setProperty('--gallery-fade-bottom', fade(maximum - top));
    }
    function scheduleGalleryEdges() {
      if (pendingGalleryEdges) return;
      pendingGalleryEdges = true;
      // Reconcile DOM filtering before paint, rather than one animation frame later.
      queueMicrotask(() => {
        pendingGalleryEdges = false;
        if (galleryEdgesDisposed) return;
        syncLibraryOverflow(gallery);
        updateGalleryEdges();
      });
    }
    gallery.addEventListener('scroll', updateGalleryEdges, { passive:true });
    // Reconcile overflow before the edge masks; the final layout stays stable.
    let galleryViewportWidth=gallery.clientWidth,galleryViewportHeight=gallery.clientHeight;
    const galleryEdgeResize = new ResizeObserver(() => {
      const width=gallery.clientWidth,height=gallery.clientHeight;
      const viewportChanged=width!==galleryViewportWidth||height!==galleryViewportHeight;
      galleryViewportWidth=width;galleryViewportHeight=height;
      syncLibraryOverflow(gallery);
      updateGalleryEdges();
      // Reordering observed tiles is not a viewport resize and must not reveal a distant selection.
      if(viewportChanged&&!document.body.classList.contains('ps-compact-navigation')&&!animationSorter.dragging)revealSelectedCard();
    });
    galleryEdgeResize.observe(gallery);
    for (const item of cards) galleryEdgeResize.observe(item.tile);
    const galleryEdgeMutation = new MutationObserver(scheduleGalleryEdges);
    galleryEdgeMutation.observe(gallery, {
      subtree:true, childList:true, characterData:true,
      attributes:true, attributeFilter:['hidden']
    });
    window.addEventListener('pagehide', () => {
      galleryEdgesDisposed = true;
      galleryEdgeResize.disconnect();
      galleryEdgeMutation.disconnect();
      gallery.removeEventListener('scroll', updateGalleryEdges);
    }, { once:true });
    function syncGallery() {
      const search = $('librarySearch').value.trim().toLocaleLowerCase();
      gallery.classList.toggle('is-searching',search.length>0);
      for (const item of cards) {
        const favorite = favorites.has(item.mode);
        item.heart.setAttribute('aria-pressed', String(favorite));
        item.heart.setAttribute('aria-label', (favorite ? '取消收藏：' : '收藏：') + item.name);
        item.tile.hidden = category.value === 'favorites' ? !favorite || !item.name.toLocaleLowerCase().includes(search) : item.button.hidden;
      }
      empty.hidden = cards.some(item => !item.tile.hidden);
      scheduleGalleryEdges();
    }
    category.addEventListener('change', event => {
      if (category.value !== 'favorites') return;
      event.stopImmediatePropagation(); window.pixelStudioSetAnimationFilter('all'); syncGallery(); gallery.scrollTop = 0;
    }, true);
    category.addEventListener('change', () => { syncGallery(); gallery.scrollTop = 0; });
    clearFilter.addEventListener('click',()=>{
      category.value='all';$('librarySearch').value='';
      category.dispatchEvent(new Event('change',{bubbles:true}));
      $('librarySearch').dispatchEvent(new Event('input',{bubbles:true}));
      $('librarySearch').dispatchEvent(new Event('change',{bubbles:true}));
      gallery.scrollTop=0;$('librarySearch').focus();
    });
    $('librarySearch').addEventListener('input', syncGallery);
    function revealSelectedCard(){
      const selected=cards.find(item=>item.mode===$('animationMode').value&&!item.tile.hidden);
      if(!selected||gallery.clientHeight<=0)return;
      const viewport=gallery.getBoundingClientRect(),card=selected.tile.getBoundingClientRect();
      // Leave room for both the 12px fade and the 5px outer focus ring.
      const top=viewport.top+gallery.clientTop+17;
      const bottom=viewport.top+gallery.clientTop+gallery.clientHeight-17;
      // Only move this scrollport, and leave already-visible selections in place.
      if(card.height>bottom-top||card.top<top)gallery.scrollTop+=card.top-top;
      else if(card.bottom>bottom)gallery.scrollTop+=card.bottom-bottom;
      updateGalleryEdges();
    }
    $('animationMode').addEventListener('change',()=>{syncGallery();revealSelectedCard();}); syncGallery();
    const shuffle = make('label', 'ps-shuffle'), shuffleCheck = make('input'); shuffleCheck.type = 'checkbox'; shuffleCheck.id = 'psShuffleEnabled';
    shuffle.append(shuffleCheck, document.createTextNode('随机播放'));
    const interval = make('input'); interval.type = 'number'; interval.id = 'psShuffleInterval'; interval.min = '3'; interval.max = '99'; interval.step = '1'; interval.value = '20'; interval.disabled = true;
    interval.setAttribute('aria-label', '随机播放间隔，秒');
    const shuffleGroup = make('div', 'ps-shuffle-group');
    const shuffleValue = make('span', 'ps-time-value');
    shuffleValue.append(interval, make('span', 'ps-unit', '秒'));
    shuffleGroup.append(shuffle, shuffleValue);
    document.querySelector('.library-toolbar').append(shuffleGroup);
    const playbackPolicy = window.PixelStudioBrowserPlayback.policy;
    const playbackMode=()=>playbackPolicy.playMode(shuffleGroup.dataset.playMode,shuffleCheck.checked);
    let shuffleTimer;
    function scheduleShuffle() {
      clearInterval(shuffleTimer);
      if(boardDisposed)return;
      interval.value=String(playbackPolicy.shuffleSeconds(interval.value));
      // The active library owns scheduling, but both share mode and interval.
      if(shuffleGroup.dataset.source==='media')return;
      const suspended=mediaDialog?.open||$('animationMode').value==='file';
      shuffleCheck.disabled=suspended;
      interval.disabled=playbackMode()==='fixed'||suspended;
      if(playbackMode()==='fixed'||suspended)return;
      shuffleTimer=setInterval(()=>{
        if(shuffleGroup.dataset.source==='media'||!api.playing||mediaDialog?.open||$('animationMode').value==='file'||animationSorter.dragging)return;
        const candidates=cards.filter(item=>!item.tile.hidden&&!item.button.hidden).map(item=>item.mode);
        const next=playbackMode()==='sequential'
          ?playbackPolicy.chooseSequential(candidates,$('animationMode').value)
          :playbackPolicy.chooseNext(candidates,$('animationMode').value);
        if(next)cards.find(item=>item.mode===next).button.click();
      },playbackPolicy.shuffleSeconds(interval.value)*1000);
    }
    shuffleCheck.addEventListener('change',()=>{
      const current=playbackMode();
      shuffleGroup.dataset.playMode=shuffleCheck.checked?(current==='fixed'?'random':current):'fixed';
      scheduleShuffle();
    });
    interval.addEventListener('change',scheduleShuffle);
    shuffleGroup.addEventListener('pixel-studio-shuffle-source-change',scheduleShuffle);
    mediaDialog?.addEventListener('close',scheduleShuffle);
    $('animationMode').addEventListener('change',scheduleShuffle);
    $('mediaFile').addEventListener('change',scheduleShuffle);
    window.addEventListener('pixel-studio-playback-status-change',scheduleShuffle);
    window.addEventListener('pagehide',()=>window.removeEventListener('pixel-studio-playback-status-change',scheduleShuffle),{once:true});
    try {
      const state=JSON.parse(localStorage.getItem('pixelStudioShuffle')||'null');
      if(state){
        const mode=playbackPolicy.playMode(state.mode,state.enabled===true);
        shuffleGroup.dataset.playMode=mode;shuffleCheck.checked=mode!=='fixed';
        interval.value=String(playbackPolicy.shuffleSeconds(state.seconds));
        if([...category.options].some(option=>option.value===state.category)){
          category.value=state.category;category.dispatchEvent(new Event('change',{bubbles:true}));
        }
        $('librarySearch').value=String(state.search||'');
        $('librarySearch').dispatchEvent(new Event('input',{bubbles:true}));
      }
    }catch{}
    scheduleShuffle();
    const saveShuffle=()=>{
      try{localStorage.setItem('pixelStudioShuffle',JSON.stringify({
        mode:playbackMode(),enabled:shuffleCheck.checked,seconds:interval.value,
        category:category.value,search:$('librarySearch').value
      }));}catch{}
    };
    for(const element of [shuffleCheck,interval,category,$('librarySearch')])element.addEventListener('change',saveShuffle);
    const speedNumber = make('input'); speedNumber.id = 'animationSpeedNumber'; speedNumber.type = 'number';
    for (const key of ['min','max','step','value']) speedNumber[key] = $('animationSpeed')[key];
    speedNumber.setAttribute('aria-label', '动画速度倍数'); $('animationSpeedValue').hidden = true;
    document.querySelector('.speed-control').append(speedNumber);
    document.querySelector('label[for="animationSpeed"]').textContent = '速度';
    document.querySelector('label[for="brightness"]').textContent = '亮度';
    speedNumber.addEventListener('input', () => {
      if (!speedNumber.validity.valid || !speedNumber.value) return;
      $('animationSpeed').value = speedNumber.value; $('animationSpeed').dispatchEvent(new Event('input', { bubbles:true }));
    });
    $('animationSpeed').addEventListener('input', () => { speedNumber.value = Number($('animationSpeed').value).toFixed(2); });
    const clock = $('clockStyling'), font = $('clockFont'), palette = $('clockPalette');
    clock.replaceChildren(); row(clock, '样式', [font]); row(clock, '配色', [palette]);
    const fontNames = { rounded:'圆角像素', classic:'经典点阵', segment:'七段数码' };
    const paletteNames = { ice:'冰蓝', mint:'薄荷', amber:'琥珀', rose:'樱粉', violet:'紫晶' };
    [...font.options].forEach(option => { option.textContent = fontNames[option.value] || option.textContent; });
    [...palette.options].forEach(option => { option.textContent = paletteNames[option.value] || option.textContent; });
    const custom = make('button', 'ps-custom-colors', '自定义'); custom.type = 'button';
    palette.parentElement.append(custom);
    const colorsDialog = make('dialog', 'ps-settings ps-media-dialog');
    colorsDialog.setAttribute('aria-labelledby', 'clockColorsTitle');
    const colorsHeading = make('header', 'ps-settings-heading');
    const colorsTitle = make('h2', '', '动态时钟 · 自定义配色'); colorsTitle.id = 'clockColorsTitle';
    const colorsClose = make('button', 'ps-close', '\u00d7'); colorsClose.type = 'button';
    colorsClose.setAttribute('aria-label', '关闭配色');
    colorsHeading.append(colorsTitle, colorsClose);
    const colorsBody = make('div', 'ps-settings-body');
    colorsDialog.append(colorsHeading, colorsBody); document.body.append(colorsDialog);
    let customColors = ['#e5f5ff','#6ad3f5','#356e88'];
    try {
      const saved = JSON.parse(localStorage.getItem('pixelStudioClockCustomColors') || 'null');
      if (Array.isArray(saved) && saved.length === 3 && saved.every(value => /^#[0-9a-f]{6}$/i.test(value))) customColors = saved;
    } catch {}
    const customOption = new Option('自定义', 'custom:' + customColors.join(':')); palette.add(customOption);
    ['小时','分钟','分隔线'].forEach((name, index) => {
      const input = make('input'); input.type = 'color'; input.value = customColors[index]; input.id = 'clockCustomColor' + index;
      row(colorsBody, name, [input]);
      input.addEventListener('input', () => {
        customColors[index] = input.value;
        customOption.value = 'custom:' + customColors.join(':'); palette.value = customOption.value;
        try { localStorage.setItem('pixelStudioClockCustomColors', JSON.stringify(customColors)); } catch {}
        palette.dispatchEvent(new Event('change', { bubbles:true }));
      });
    });
    custom.addEventListener('click', () => { if (!colorsDialog.open) colorsDialog.showModal(); });
    colorsClose.addEventListener('click', () => colorsDialog.close());
    colorsDialog.addEventListener('close', () => custom.focus());
    const controls = document.querySelector('.studio-controls');
    const shuffleDock=make('div','ps-shuffle-dock');shuffleDock.id='psShuffleDock';
    shuffleDock.append(shuffleGroup);
    function syncControlLayout() {
      const thermal = Object.hasOwn(window.PixelStudioTemperature?.modes || {}, $('animationMode').value);
      controls.classList.toggle('ps-clock-controls', $('animationMode').value === 'clock' || thermal);
      controls.classList.toggle('ps-thermal-controls', thermal);
    }
    $('animationMode').addEventListener('change', syncControlLayout);
    $('mediaFile').addEventListener('change', syncControlLayout);
    syncControlLayout();
    speedNumber.value = Number($('animationSpeed').value).toFixed(2);
    speedNumber.addEventListener('blur', () => { speedNumber.value = Number($('animationSpeed').value).toFixed(2); });
    const footer = make('div', 'ps-playback-bar'), toggle = make('button', 'ps-play-toggle'); toggle.type = 'button';
    const messages = make('div', 'ps-playback-messages');
    const currentAnimation=make('div','ps-current-animation');currentAnimation.setAttribute('data-update-ui','');
    messages.append(currentAnimation,$('status'),$('runtimeNotice'));
    footer.append(toggle, messages, shuffleDock); controls.after(footer);

    // Keep the legacy checkbox as the automatic-switching flag for both libraries.
    const shuffleToggle=make('button','ps-shuffle-toggle');shuffleToggle.id='psShuffleToggle';
    shuffleToggle.type='button';shuffleToggle.setAttribute('data-update-ui','');
    const playModes=['fixed','sequential','random'];
    const modeIcons={
      fixed:'<path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6"/>',
      sequential:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
      random:'<path d="M3 6h3c4 0 8 12 12 12h3m-4-4 4 4-4 4M3 18h3c1.7 0 3.4-2.2 5.1-5M13 9c1.7-2 3.3-3 5-3h3m-4-4 4 4-4 4"/>'
    };
    let shuffleStateKey='';
    function syncInlineShuffle(){
      const group=shuffleDock.querySelector('.ps-shuffle-group');
      if(group&&shuffleToggle.parentElement!==group)group.prepend(shuffleToggle);
      const input=group?.querySelector('input[type=checkbox]');
      const mode=playbackPolicy.playMode(group?.dataset.playMode,input?.checked===true);
      const unavailable=!input||input.disabled,english=document.documentElement.lang==='en';
      const key=[mode,unavailable,english].join('|');
      if(key===shuffleStateKey)return;
      shuffleStateKey=key;
      const labels=english?{fixed:'Fixed',sequential:'In order',random:'Random'}
        :{fixed:'固定播放',sequential:'顺序播放',random:'随机播放'};
      const next=playModes[(playModes.indexOf(mode)+1)%playModes.length];
      shuffleToggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+modeIcons[mode]+'</svg>';
      shuffleToggle.disabled=unavailable;
      shuffleToggle.dataset.playMode=mode;
      shuffleToggle.classList.toggle('is-active',mode!=='fixed');
      shuffleToggle.removeAttribute('aria-pressed');
      shuffleToggle.title=unavailable
        ?(english?'Playback mode unavailable':'播放模式暂不可用')
        :(english?'Mode: '+labels[mode]+'. Switch to '+labels[next]:'当前：'+labels[mode]+'；点击切换为'+labels[next]);
      shuffleToggle.setAttribute('aria-label',shuffleToggle.title);
      interval.setAttribute('data-update-ui','');
      interval.setAttribute('aria-label',english?'Switch interval in seconds':'切换间隔，秒');
    }
    shuffleToggle.addEventListener('click',()=>{
      if(shuffleCheck.disabled)return;
      const next=playModes[(playModes.indexOf(playbackMode())+1)%playModes.length];
      shuffleGroup.dataset.playMode=next;shuffleCheck.checked=next!=='fixed';
      shuffleCheck.dispatchEvent(new Event('change',{bubbles:true}));
      syncInlineShuffle();
    });
    shuffleDock.addEventListener('change',syncInlineShuffle);
    const shuffleOwnerObserver=new MutationObserver(syncInlineShuffle);
    shuffleOwnerObserver.observe(shuffleDock,{childList:true});
    window.addEventListener('pixel-studio-language-change',syncInlineShuffle);
    window.addEventListener('pagehide',()=>{
      shuffleDock.removeEventListener('change',syncInlineShuffle);
      shuffleOwnerObserver.disconnect();
      window.removeEventListener('pixel-studio-language-change',syncInlineShuffle);
    },{once:true});
    // Modules own their notices; the footer combines them into one status line.
    const playbackFeedback = make('div', 'status ps-playback-feedback');
    playbackFeedback.setAttribute('data-update-ui', '');
    playbackFeedback.setAttribute('role', 'status');
    playbackFeedback.setAttribute('aria-live', 'polite');
    playbackFeedback.setAttribute('aria-atomic', 'true');
    for (const node of [$('status'), $('runtimeNotice')]) node.classList.add('ps-playback-source');
    messages.append(playbackFeedback, $('streamStats'));
    const playbackActivityMessages = new Set([
      '本地预览就绪', '动画预览中', '正在本地预览', '正在发送',
      '正在播放视频', '正在播放图片', '视频已就绪', '图片已就绪', '已停止',
      '正在加载视频…', '正在加载图片…', '视频已就绪，可点击开始发送',
      '图片已就绪，可点击开始发送', '媒体模式：请选择图片或视频',
      '已切换到文件模式，请选择图片或视频'
    ]);
    let playbackFeedbackKey = '';
    function syncPlaybackFeedback() {
      const english = document.documentElement.lang === 'en';
      const preview = api.previewStatus;
      const states = english
        ? {empty:'Choose media', loading:'Loading…', ready:'Preview', error:'Preview failed'}
        : {empty:'请选择媒体', loading:'加载中…', ready:'本地预览', error:'预览不可用'};
      const outputNotice=api.playing?api.outputNotice:null;
      const phase=outputNotice?.phase;
      const state = api.playing
        ? (phase==='uncertain'?(english?'Output status unconfirmed':'输出状态待确认')
          :phase==='recovering'?(english?'Retrying output':'正在重试输出'):(english?'Sending':'正在输出'))
        : (states[preview] || states.empty);
      const previewFailed = !api.playing && preview === 'error';
      const notices = new Map(), details = new Set(), errorReasons = new Set();
      function rememberErrorReason(description, detail = '') {
        const reason = description?.reason || String(detail || '').split(/\r?\n/)
          .map(line => window.pixelStudioDescribeNotice?.(line, 'err')?.reason).find(Boolean);
        if (reason) errorReasons.add(reason);
      }
      // Query on each state sync: temperature and other modules may initialize later.
      for (const node of messages.querySelectorAll('.ps-playback-source')) {
        const source = (node.dataset.noticeSource || node.textContent).trim();
        if (node.hidden || !source) continue;
        const error = node.classList.contains('err');
        if (node === $('status') && !error && playbackActivityMessages.has(source)) continue;
        const description = window.pixelStudioDescribeNotice?.(source, error ? 'err' : '');
        const text = description?.message || node.textContent.trim();
        if (description?.detail) details.add(description.detail);
        if (node.title) details.add(node.title);
        if (error) rememberErrorReason(description, node.title);
        // The connection row owns transport status; keep baud/port chatter in details.
        if (!error && /^(?:已连接|串口已打开|Connected\b|Serial port opened\b|USB connected\b|Espressif native USB connected\b)/i.test(source)) {
          details.add(description?.detail || text);
          continue;
        }
        notices.set(text, error || notices.get(text) === true);
      }
      if(outputNotice){
        const description=window.pixelStudioDescribeNotice?.(outputNotice.message,'err');
        const text=description?.message||outputNotice.message;
        if(description?.detail)details.add(description.detail);
        rememberErrorReason(description, outputNotice.detail);
        notices.set(text,true);
      }
      const entries = [...notices].sort((a, b) => Number(b[1]) - Number(a[1]));
      const key = JSON.stringify([state, previewFailed, entries,[...details],[...errorReasons],outputNotice?.detail]);
      if(diagnosticsDialog.open)renderDiagnosticDetails();
      if (key === playbackFeedbackKey) return;
      playbackFeedbackKey = key;
      const stateText = make('span', 'ps-playback-state' + (previewFailed ? ' ps-playback-error' : ''));
      stateText.textContent = state;
      const errors = entries.filter(([, error]) => error);
      const visibleEntries = (errors.length ? errors : entries).slice(0, 1);
      const fragments = errors.length ? [] : [stateText];
      for (const [text, error] of visibleEntries) {
        if (fragments.length) {
          const separator = make('span', 'ps-playback-separator');
          separator.textContent = ' · ';
          fragments.push(separator);
        }
        const notice = make('span', error ? 'ps-playback-error' : 'ps-playback-note');
        notice.textContent = text;
        fragments.push(notice);
      }
      if (errors.length > 1) {
        const more = make('span', 'ps-playback-note');
        more.textContent = ' · +' + (errors.length - 1);
        fragments.push(more);
      }
      playbackFeedback.replaceChildren(...fragments);
      // Hover explains only current failures, without preview/connection chatter or stacks.
      playbackFeedback.title = errors.length || previewFailed
        ? ([...errorReasons].join('\n') || (english
          ? 'No specific cause reported. See the diagnostic log.'
          : '未提供具体原因，请查看诊断日志。'))
        : '';
    }
    $('startBtn').hidden = true; $('stopBtn').hidden = true;
    document.querySelector('.playback-actions').hidden = true;
    let lastPlaying, lastPlaybackLanguage;
    function syncPlayback() {
      const playing = api.playing;
      const english = document.documentElement.lang === 'en';
      const output=api.outputStatus;
      const mode=$('animationMode');
      const animationName=mode.value==='file'?'':(mode.selectedOptions[0]?.textContent||'');
      const fullCaption=animationName?(english?'Animation: ':'当前动画：')+animationName:'';
      const caption=animationName;
      if(currentAnimation.textContent!==caption)currentAnimation.textContent=caption;
      if(currentAnimation.title!==fullCaption)currentAnimation.title=fullCaption;
      currentAnimation.hidden=!caption;
      const transports={usb:'USB',ddp:'DDP'};
      // Connected describes an open port; protocol verification remains internal.
      const states=english?{disconnected:'Not Connected',unverified:'Connected',connected:'Connected',sending:'Sending',idle:'Idle',unavailable:'Bridge unavailable'}:{disconnected:'未连接',unverified:'已连接',connected:'已连接',sending:'发送中',idle:'待发送',unavailable:'本地服务未启动'};
      const connectionText=output.state==='disconnected'?states.disconnected:transports[output.transport]+' · '+states[output.state];
      if (!playing) {
        const stats = $('streamStats');
        if (stats.textContent !== connectionText) stats.textContent = connectionText;
        stats.title=connectionText;
      }
      if (lastPlaying !== playing) {
        lastPlaying = playing;
        toggle.innerHTML = playing ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 3 15 9-15 9Z"/></svg>';
        toggle.classList.toggle('is-playing', playing); frame.classList.toggle('is-playing', playing); queueBoardPaint();
        lastPlaybackLanguage = undefined;
      }
      if (lastPlaybackLanguage !== english) {
        lastPlaybackLanguage = english;
        toggle.setAttribute('aria-label', playing ? (english ? 'Stop output' : '停止输出') : (english ? 'Start output' : '开始输出'));
        toggle.title = playing ? (english ? 'Stop output; keep preview' : '停止向设备输出，预览继续') : (english ? 'Send preview to device' : '向所选设备发送当前预览');
      }
      syncPlaybackFeedback();
      syncInlineShuffle();
      const status = api.serialConnected ? (english ? 'Connected' : 'USB 已连接') : (english ? 'Not connected' : '尚未连接');
      if (portStatus.value !== status) portStatus.value = status;
    }
    toggle.addEventListener('click', () => {
      (api.playing ? $('stopBtn') : $('startBtn')).click();
      syncPlayback();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        toggle.querySelector('svg')?.animate([
          { opacity:.35, transform:'scale(.88)' },
          { opacity:1, transform:'scale(1)' }
        ], { duration:180, easing:'cubic-bezier(.2,.7,.3,1)' });
      }
    });
    toggle.setAttribute('data-update-ui', '');
    $('controlMode').addEventListener('change',syncPlayback);
    window.addEventListener('pixel-studio-language-change', () => {
      renderEmptyState();
      renderRoundedPreview();
      renderDiagnostics();
      renderUpdate();
      renderWebMedia();
      syncPlayback();
      if(downloadDialog.open)renderDownload();
      if (aboutDialog.open) renderAbout();
    });
    let playbackSyncQueued=false,playbackSyncDisposed=false;
    function queuePlaybackSync(){
      if(playbackSyncQueued||playbackSyncDisposed)return;
      playbackSyncQueued=true;
      // Coalesce start/stop/error writes in one turn, before intermediate text paints.
      queueMicrotask(()=>{
        playbackSyncQueued=false;
        if(!playbackSyncDisposed)syncPlayback();
      });
    }
    window.addEventListener('pixel-studio-playback-status-change',queuePlaybackSync);
    syncPlayback();
    const stateTimer = setInterval(() => { syncPlayback(); syncTimeValueWidth(); }, 200);
    window.addEventListener('pagehide', () => {
      playbackSyncDisposed=true;
      window.removeEventListener('pixel-studio-playback-status-change',queuePlaybackSync);
      clearInterval(stateTimer);clearInterval(shuffleTimer);
    });
    function updateBoardGeometry() {
      const preview=$('preview');
      const {w:columns,h:rows}=api.getFrameConfig();
      const pitch=(parseFloat(preview.style.width)||preview.getBoundingClientRect().width)/columns;
      const cad=preview.classList.contains('cad-pixels');
      const inset=cad?pitch*(0.8/7.125)/2:0;
      const radius=cad?pitch*(0.8/7.125):0;
      const dimensionsChanged=!boardGeometry||boardGeometry.columns!==columns||boardGeometry.rows!==rows;
      frame.style.setProperty('--board-inset',inset+'px');
      boardGeometry={columns,rows,pitch,inset,radius,screenRadius:cad?radius+2*inset:0,
        width:columns*pitch+2*inset,height:rows*pitch+2*inset,cad};
      boardSvg.style.width=(boardGeometry.width+20)+'px';
      boardSvg.style.height=(boardGeometry.height+20)+'px';
      if(dimensionsChanged){boardPixels=null;captureBoardPixels();}
      // Commit the viewBox and paths with the CSS size, before the browser paints.
      paintBoard();
    }
    const studio = document.querySelector('.studio-stage');
    const libraryToolbar = studio.querySelector('.library-toolbar');

    // Keep a regular search field with a decorative icon and the original input handlers.
    const searchInput=$('librarySearch'),searchControl=make('div','ps-library-search');
    searchControl.id='psLibrarySearch';
    const searchGlyph=make('span','ps-search-glyph');
    const searchMeasure=document.createElement('canvas').getContext('2d');
    searchGlyph.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
    searchGlyph.setAttribute('aria-hidden','true');
    searchInput.before(searchControl);searchControl.append(searchGlyph,searchInput);
    function syncTimeValueWidth(){
      if(!searchMeasure)return;
      // Vertical alignment comes from the shared Custom-button caption CSS.
      // Measure only the editable width so number and unit stay close together.
      for(const unit of document.querySelectorAll('#psShuffleDock .ps-unit,.thermal-sample-unit')){
        const input=unit.parentElement.querySelector('input[type=number]');
        if(!input)continue;
        const numberStyle=getComputedStyle(input);
        searchMeasure.font=numberStyle.fontStyle+' '+numberStyle.fontWeight+' '+numberStyle.fontSize+' '+numberStyle.fontFamily;
        const digits=searchMeasure.measureText('0');
        const spacing=parseFloat(numberStyle.letterSpacing)||0;
        const value=input.value||'0';
        const textWidth=searchMeasure.measureText(value).width+Math.max(0,value.length-1)*spacing;
        const width=(Math.ceil(Math.max(digits.width,textWidth))+2)+'px';
        if(input.style.getPropertyValue('--ps-time-number-width')!==width)input.style.setProperty('--ps-time-number-width',width);
      }
    }
    function onTimeValueInput(event){
      if(event.target.matches?.('#psShuffleInterval,#thermalSampleSecondsNumber,#thermalSampleSeconds'))syncTimeValueWidth();
    }
    function onTimeValueClick(event){
      const field=event.target.closest?.('.thermal-sample-value,#psShuffleDock .ps-time-value');
      const input=field?.querySelector('input[type=number]');
      if(input&&!input.disabled&&event.target!==input)input.focus();
    }
    function syncLibraryCategoryWidth(){
      const category=$('libraryCategory');
      if(!searchMeasure||category.hidden||!category.options.length)return;
      const style=getComputedStyle(category);
      searchMeasure.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      const spacing=parseFloat(style.letterSpacing)||0;
      // Use every localized option so selecting a category never changes the field width.
      const textWidth=Math.max(...[...category.options].map(option=>{
        const text=option.textContent.trim();
        return searchMeasure.measureText(text).width+spacing*Array.from(text).length;
      }));
      const inset=['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth']
        .reduce((sum,property)=>sum+(parseFloat(style[property])||0),0);
      const width=Math.ceil(textWidth+inset)+'px';
      if(category.style.width!==width)category.style.width=width;
    }
    function syncLibrarySearch(){
      const label=document.documentElement.lang==='en'?'Search':'搜索';
      searchInput.setAttribute('aria-label',label);
      if(!searchMeasure||searchInput.clientWidth<=0)return;
      const style=getComputedStyle(searchInput),placeholder=searchInput.placeholder||label;
      searchMeasure.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      const spacing=(parseFloat(style.letterSpacing)||0)*Math.max(0,Array.from(placeholder).length-1);
      const textWidth=searchMeasure.measureText(placeholder).width+spacing;
      const editing=searchInput===document.activeElement||searchInput.value.length>0;
      // Measure the icon inset independently of the tight state's reduced padding.
      const leadingSpace=editing?(parseFloat(style.paddingLeft)||0):(parseFloat(style.getPropertyValue('--ps-search-icon-padding'))||38);
      const available=searchInput.clientWidth-leadingSpace-(parseFloat(style.paddingRight)||0);
      searchControl.classList.toggle('is-placeholder-tight',available<Math.ceil(textWidth));
    }
    for(const event of ['focus','blur','input'])searchInput.addEventListener(event,syncLibrarySearch);

    // Navigate between existing regions without cloning controls or restarting playback.
    const compactViewport=window.matchMedia('(max-width:600px)');
    let desktopMinimumWidth=600,desktopLayoutKey='';
    const previewPanel=studio.querySelector('.preview-card');
    const libraryPanel=studio.querySelector('.library-card');
    previewPanel.id='psPreviewPane';libraryPanel.id='psLibraryPane';controls.id='psAdjustPane';
    const compactNavigation=make('nav','ps-compact-nav');
    compactNavigation.id='psCompactNavigation';compactNavigation.hidden=true;
    compactNavigation.setAttribute('data-update-ui','');
    const compactViews=[
      {key:'preview',en:'Preview',zh:'预览',panels:'psPreviewPane',icon:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 18h6"/>'},
      {key:'library',en:'Library',zh:'图库',panels:'psLibraryPane',icon:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'},
      {key:'adjust',en:'Adjust',zh:'调节',panels:'psPreviewPane psAdjustPane',icon:'<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h2m4 0h12"/><circle cx="10" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>'}
    ];
    let compactView='preview';
    for(const view of compactViews){
      const button=make('button','ps-compact-tab');button.type='button';
      button.setAttribute('aria-controls',view.panels);
      button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+view.icon+'</svg>';
      view.button=button;view.label=make('span');button.append(view.label);
      button.addEventListener('click',()=>selectCompactView(view.key));
      compactNavigation.append(button);
    }
    footer.after(compactNavigation);
    function renderCompactLabels(){
      const english=document.documentElement.lang==='en';
      compactNavigation.setAttribute('aria-label',english?'Studio views':'工作区视图');
      for(const view of compactViews)view.label.textContent=english?view.en:view.zh;
    }
    function selectCompactView(view){
      if(!compactViews.some(item=>item.key===view))return;
      compactView=view;applyCompactLayout();
      // Fit the new pane synchronously, before its previous geometry can paint.
      resizePreview();
    }
    function applyCompactLayout(compact=document.body.classList.contains('ps-compact-navigation')){
      // The image, bezel and glow must disappear together until the pane is fitted.
      frame.style.visibility='hidden';
      frame.style.transform='';
      const focused=document.activeElement;
      const entering=compact&&!document.body.classList.contains('ps-compact-navigation');
      // Keep an active search accessible when its toolbar forces the compact layout.
      if(entering&&focused&&libraryPanel.contains(focused))compactView='library';
      document.body.classList.toggle('ps-compact-navigation',compact);
      if(compact)document.body.dataset.compactView=compactView;
      else delete document.body.dataset.compactView;
      compactNavigation.hidden=!compact;
      // Both layouts keep the live shuffle group and status stack in the footer.
      syncPlayback();
      for(const view of compactViews){
        const selected=view.key===compactView;
        view.button.classList.toggle('is-active',selected);
        if(selected)view.button.setAttribute('aria-current','page');
        else view.button.removeAttribute('aria-current');
      }
      // Never leave keyboard focus inside a region hidden by a breakpoint change.
      if(focused&&focused!==document.body&&focused!==document.documentElement&&!focused.getClientRects().length){
        (compact?compactViews.find(view=>view.key===compactView).button:toggle).focus({preventScroll:true});
      }
      schedulePreviewResize();
    }
    function openCompactMediaLibrary(event){
      // Desktop replaces the media action; listen on its stable ID after its handler.
      if(document.body.classList.contains('ps-compact-navigation')&&event.target.closest?.('#psMediaToggle')&&well.querySelector('.ps-desktop-media-grid')){
        selectCompactView('library');
      }
    }
    renderCompactLabels();
    compactViewport.addEventListener('change',schedulePreviewResize);
    window.addEventListener('pixel-studio-language-change',renderCompactLabels);
    document.addEventListener('click',openCompactMediaLibrary);
    window.addEventListener('pagehide',()=>{
      compactViewport.removeEventListener('change',schedulePreviewResize);
      window.removeEventListener('pixel-studio-language-change',renderCompactLabels);
      document.removeEventListener('click',openCompactMediaLibrary);
    },{once:true});
    const brand = document.querySelector('.brand');
    const brandMeasure = document.createElement('canvas').getContext('2d');
    function updateBrandSpacing() {
      const mark=brand?.querySelector('.brand-mark'),name=brand?.querySelector('.brand-name');
      const core=mark?.querySelector('.logo-halo rect:last-child');
      if(!brandMeasure||!core||!name||!mark.viewBox.baseVal.width)return;
      const style=getComputedStyle(name),viewBox=mark.viewBox.baseVal;
      brandMeasure.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      brandMeasure.textAlign='left';
      brandMeasure.direction='ltr';
      const firstLetter=Array.from(name.textContent.trimStart())[0];
      if(!firstLetter)return;
      const inkLeft=brandMeasure.measureText(firstLetter).actualBoundingBoxLeft;
      if(!Number.isFinite(inkLeft))return;
      // Use the approved logo's bright rim, not its translucent halo or SVG box.
      const bounds=core.getBBox(),stroke=parseFloat(getComputedStyle(core).strokeWidth)||0;
      const rightInset=(viewBox.x+viewBox.width-bounds.x-bounds.width-stroke/2)
        *mark.getBoundingClientRect().width/viewBox.width;
      // actualBoundingBoxLeft is negative when the glyph has a positive side bearing.
      const gap=Math.max(0,16-rightInset+inkLeft)+'px';
      if(brand.style.getPropertyValue('--brand-ink-gap')!==gap)brand.style.setProperty('--brand-ink-gap',gap);
      // Keep the logo and header actions unchanged; show the title only in full.
      // Canvas measurement still works while the title is hidden.
      const title=name.textContent.trim();
      const spacing=(parseFloat(style.letterSpacing)||0)*Array.from(title).length;
      const titleWidth=brandMeasure.measureText(title).width+spacing;
      const requiredWidth=mark.getBoundingClientRect().width+parseFloat(gap)+titleWidth;
      const returnBuffer=name.hidden?4:0;
      const hideTitle=brand.clientWidth<Math.ceil(requiredWidth)+returnBuffer;
      if(name.hidden!==hideTitle)name.hidden=hideTitle;
    }
    function hideUnavailablePreview() {
      const preview=$('preview');
      preview.style.width='0px';preview.style.height='0px';
      frame.style.setProperty('--board-inset','0px');
      if(document.body.classList.contains('ps-compact-navigation')&&compactView==='adjust'){
        document.body.classList.add('ps-adjust-without-preview');
      }
    }
    function resizePreview() {
      // Every early exit leaves the entire scene hidden, never a stale rim or dot.
      frame.style.visibility='hidden';
      // Measure the normal rows before deciding whether to collapse them again.
      // This lets the preview return as soon as the window has enough height.
      document.body.classList.remove('ps-adjust-without-preview');
      const layoutKey=[document.documentElement.lang,$('libraryCategory').hidden,document.documentElement.clientHeight].join('|');
      // Available height, source and language affect whether the full-height preview fits.
      if(layoutKey!==desktopLayoutKey){desktopLayoutKey=layoutKey;desktopMinimumWidth=600;}
      const compact=document.body.classList.contains('ps-compact-navigation');
      if(compactViewport.matches){
        if(!compact)applyCompactLayout(true);
      }else if(compact&&studio.clientWidth>=desktopMinimumWidth+24){
        // A small return buffer prevents layout chatter near the fit boundary.
        applyCompactLayout(false);
      }
      syncLibraryCategoryWidth();
      syncLibrarySearch();
      syncTimeValueWidth();
      updateBrandSpacing();
      const preview=$('preview');
      const {w:width,h:height}=api.getFrameConfig();
      const insetFactor=preview.classList.contains('cad-pixels')?0.8/7.125:0;
      const stageStyle=getComputedStyle(stage),studioStyle=getComputedStyle(studio);
      // The compact class and CSS agree on the active layout at fractional zoom widths.
      const sideBySide=studioStyle.getPropertyValue('--ps-preview-layout').trim()==='side-by-side';
      if(!sideBySide){
        studio.style.removeProperty('--preview-column');well.style.maxHeight='';frame.style.transform='';
        if(stage.clientWidth<=0||stage.clientHeight<=0){
          hideUnavailablePreview();
          return;
        }
      }
      const stageHorizontalInset=(parseFloat(stageStyle.paddingLeft)||0)+(parseFloat(stageStyle.paddingRight)||0);
      const stageVerticalInset=(parseFloat(stageStyle.paddingTop)||0)+(parseFloat(stageStyle.paddingBottom)||0);
      const toolbar=libraryToolbar.getBoundingClientRect();
      // Fit from the parent, never by temporarily expanding the fitted scrollport.
      const targetHeight=Math.max(1,studio.getBoundingClientRect().bottom-toolbar.top);
      if(sideBySide){
        const targetPitch=Math.max(0.01,targetHeight-6)/(height+insetFactor);
        const requiredColumn=targetPitch*(width+insetFactor)+6;
        const columnGap=parseFloat(studioStyle.columnGap)||16;
        const visible=item=>!item.hidden&&getComputedStyle(item).display!=='none';
        const items=[...libraryToolbar.children].filter(visible);
        const toolbarStyle=getComputedStyle(libraryToolbar);
        const toolbarGap=parseFloat(toolbarStyle.columnGap)||0;
        const searchMinimum=parseFloat(toolbarStyle.getPropertyValue('--ps-library-search-min'))
          ||parseFloat(toolbarStyle.getPropertyValue('--ui-control-height'))||40;
        const itemWidths=new Map(items.map(item=>{
          if(item===searchControl)return [item,searchMinimum];
          if(item.classList.contains('ps-desktop-media-actions')){
            // Include the shared control shell, but not flexible alignment margins.
            const children=[...item.children].filter(visible);
            const style=getComputedStyle(item);
            const gap=parseFloat(style.columnGap)||0;
            const inset=['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth']
              .reduce((sum,property)=>sum+(parseFloat(style[property])||0),0);
            return [item,children.reduce((sum,child)=>sum+child.getBoundingClientRect().width,0)
              +Math.max(0,children.length-1)*gap+inset];
          }
          return [item,item.getBoundingClientRect().width];
        }));
        // Let the gallery drop columns; only the unchanged toolbar sets its minimum width.
        const minimumLibraryWidth=items.reduce((sum,item)=>sum+itemWidths.get(item),0)
          +Math.max(0,items.length-1)*toolbarGap;
        // Do not shrink the preview while its stage still reserves the full height.
        // Switch layouts instead of leaving a blank band above the lower controls.
        desktopMinimumWidth=Math.max(600,Math.ceil(
          requiredColumn+columnGap+minimumLibraryWidth));
        if(studio.getBoundingClientRect().width<desktopMinimumWidth){
          applyCompactLayout(true);
          // Fit the newly visible compact pane in this frame, before painting.
          resizePreview();return;
        }
        // Fit the column to the visible rim, including when zoom limits preview height.
        // A minimum column wider than the rim would add blank space to the 16px gap.
        studio.style.setProperty('--preview-column',requiredColumn+'px');
        syncLibrarySearch();
      }else{studio.style.removeProperty('--preview-column');well.style.maxHeight='';}
      frame.style.transform='';
      // Fixed 3px outer edge on each side; only the black inset scales.
      const availableHeight=sideBySide?targetHeight:stage.clientHeight-stageVerticalInset;
      // Keep fractional CSS widths at non-integer browser zoom levels.
      const availableWidth=stage.getBoundingClientRect().width-(sideBySide?0:stageHorizontalInset);
      if(availableHeight<64||availableWidth<32){
        hideUnavailablePreview();
        return;
      }
      const pitch=Math.min((availableWidth-6)/(width+insetFactor),(availableHeight-6)/(height+insetFactor));
      preview.style.width=(pitch*width)+'px';preview.style.height=(pitch*height)+'px';
      updateBoardGeometry();
      if(sideBySide){
        // Fit the library below its single-row toolbar after column sizing.
        const fittedToolbar=libraryToolbar.getBoundingClientRect();
        const toolbarToWellTop=fittedToolbar.height+(parseFloat(getComputedStyle(libraryToolbar.parentElement).rowGap)||0);
        const visiblePreviewHeight=frame.getBoundingClientRect().height+6;
        well.style.maxHeight=Math.max(1,visiblePreviewHeight-toolbarToWellTop)+'px';
        const bezel=frame.getBoundingClientRect();
        // Include the SVG outset and half of the bright core's stroke width.
        const rimOuterOffset=3;
        const delta=fittedToolbar.top-(bezel.top-rimOuterOffset);
        frame.style.transform='translateY('+delta+'px)';
      }
      frame.style.visibility='visible';
    }
    let pendingPreviewResize=0;
    function schedulePreviewResize(){
      if(boardDisposed||pendingPreviewResize)return;
      pendingPreviewResize=requestAnimationFrame(()=>{
        pendingPreviewResize=0;
        resizePreview();

        updateGalleryEdges();
      });
    }
    window.pixelStudioResizePreview = schedulePreviewResize;
    document.addEventListener('input',onTimeValueInput);
    document.addEventListener('change',onTimeValueInput);
    document.addEventListener('click',onTimeValueClick);
    // Observe layout inputs, not the scrollport whose max-height we just fitted.
    const resize = new ResizeObserver(schedulePreviewResize); resize.observe(studio); resize.observe(libraryToolbar); resize.observe(stage);
    $('matrixW').addEventListener('change', schedulePreviewResize); $('matrixH').addEventListener('change', schedulePreviewResize);
    window.addEventListener('resize',schedulePreviewResize);
    window.addEventListener('pixel-studio-language-change',schedulePreviewResize);
    document.fonts?.addEventListener('loadingdone',schedulePreviewResize);
    window.addEventListener('pagehide',()=>{
      resize.disconnect();
      document.removeEventListener('input',onTimeValueInput);
      document.removeEventListener('change',onTimeValueInput);
      document.removeEventListener('click',onTimeValueClick);
      if(pendingPreviewResize)cancelAnimationFrame(pendingPreviewResize);
      window.removeEventListener('resize',schedulePreviewResize);
      window.removeEventListener('pixel-studio-language-change',schedulePreviewResize);
      document.fonts?.removeEventListener('loadingdone',schedulePreviewResize);
    },{once:true});
    applyCompactLayout(compactViewport.matches);
    resizePreview();

    // Readiness describes initialization, not a visible-window animation frame.
    document.body.dataset.studioReady = 'true';
    window.dispatchEvent(new Event('pixel-studio-ui-ready'));
    (document.fonts?.ready||Promise.resolve()).then(()=>{
      if(boardDisposed)return;
      schedulePreviewResize();
      queueBoardPaint();
      updateGalleryEdges();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once:true });
  else initialize();
})();
