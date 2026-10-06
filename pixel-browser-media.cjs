'use strict';
// Browser adapter with explicit dependencies; no sensor or Node transport ownership.
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.PixelStudioBrowserMedia={create:factory};
})(typeof globalThis!=='undefined'?globalThis:this,function(options){
 const window=options.window||globalThis;
 const {document,setTimeout,clearTimeout,URL,Image}=window;
 const {ui,getFrameConfig,getAnimationMode,getAnimationTime,setStatus,getPlaybackRate=()=>1,onMediaReady=()=>{}}=options;
 let mediaObj=null,mediaType=null,animationPreviewTimer=null;
 let pendingMedia=null,mediaUrl=null,mediaGeneration=0,mediaDisposed=false;
 let replacementCancel=null,previewFailed=false;
 function applyPlaybackRate(video,file){
   if(!video||typeof video.play!=='function')return;
   const value=Number(getPlaybackRate(file));
   const rate=Math.max(0.25,Math.min(3,Number.isFinite(value)?value:1));
   video.defaultPlaybackRate=rate;
   video.playbackRate=rate;
 }
 function syncPlaybackRate(){
   // Static images have no time base; output cadence and shuffle stay unchanged.
   for(const item of new Set([mediaObj,pendingMedia]))applyPlaybackRate(item);
 }
 function hasReadyMedia(){
   return Boolean(mediaObj && (mediaType==='video'
     ? mediaObj.readyState>=2 : mediaObj.complete&&mediaObj.naturalWidth>0));
 }
 function previewStatus(){
   if(previewFailed)return 'error';
   if(getAnimationMode()!=='file')return 'ready';
   if(hasReadyMedia())return 'ready';
   return pendingMedia||replacementCancel||mediaObj?'loading':'empty';
 }
 function releaseMedia(){
   replacementCancel?.();replacementCancel=null;
   mediaGeneration++;
   for(const item of new Set([mediaObj,pendingMedia])){
     if(!item)continue;
     item.onload=item.onerror=item.onloadedmetadata=item.onended=null;
     if(typeof item.pause==='function')item.pause();
   }
   if(mediaUrl!==null)URL.revokeObjectURL(mediaUrl);
   mediaUrl=null;pendingMedia=null;mediaObj=null;mediaType=null;previewFailed=false;
 }
 window.addEventListener?.('pagehide',()=>{
   mediaDisposed=true;stopAnimationPreview();releaseMedia();
 },{once:true});
 const offscreen=document.createElement('canvas');
 const offCtx=offscreen.getContext('2d',{willReadFrequently:true});
  function drawToDisplayCanvas(targetW, targetH, sourceWidth, sourceHeight) {
    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, targetW, targetH);

    if (!sourceWidth || !sourceHeight || !Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight)) {
      if(!window.pixelStudioDesktop?.edition)offCtx.drawImage(mediaObj, 0, 0, targetW, targetH);
      return;
    }

    if(!window.pixelStudioDesktop?.edition&&ui.scaleMode.value!=='fit'){
      offCtx.drawImage(mediaObj, 0, 0, targetW, targetH);
      return;
    }

    const scale = Math.min(targetW / sourceWidth, targetH / sourceHeight);
    const dw = Math.max(1, Math.round(sourceWidth * scale));
    const dh = Math.max(1, Math.round(sourceHeight * scale));
    const x = Math.max(0, Math.floor((targetW - dw) / 2));
    const y = Math.max(0, Math.floor((targetH - dh) / 2));
    offCtx.drawImage(mediaObj, x, y, dw, dh);
  }

  function extractFrame() {
    const { w, h } = getFrameConfig();
    if (offscreen.width !== w) offscreen.width = w;
    if (offscreen.height !== h) offscreen.height = h;
    offCtx.setTransform(1, 0, 0, 1, 0, 0);

    if (!mediaObj) return null;
    offCtx.clearRect(0, 0, w, h);
    try {
      const sourceW = mediaObj.videoWidth || mediaObj.naturalWidth || mediaObj.width || 0;
      const sourceH = mediaObj.videoHeight || mediaObj.naturalHeight || mediaObj.height || 0;
      drawToDisplayCanvas(w, h, sourceW, sourceH);
      if (!document.hidden) ui.preview.src = offscreen.toDataURL('image/png');
      previewFailed=false;
    } catch (e) {
      previewFailed=true;
      return null;
    }
    return sampleFrameFromCanvas();
  }

  function sampleFrameFromCanvas() {
    const {w,h,d}=getFrameConfig();
    return window.PixelStudioFrameMapping.fromRgba(offCtx.getImageData(0,0,w,h).data,w,h,ui.mapping.value,255);
  }

  function applyPreviewAspect() {
    // Output workers render pixels only; browser layout must not run there.
    if (window.pixelStudioHeadless === true) return;
    const { w, h } = getFrameConfig();
    const stage = ui.preview.closest('.preview-stage');
    const well = document.querySelector('.ps-library-well');
    const aligned = !!well && window.innerWidth > 760;
    const availableWidth = Math.max(1, (stage?.clientWidth || 380) - (aligned ? 16 : 40));
    const maxHeight = Math.max(1, aligned ? stage.clientHeight - 12 : (stage?.clientHeight || 486) - 40);
    const scale = Math.min(availableWidth / w, maxHeight / h);
    if (typeof window.pixelStudioResizePreview === 'function') {
      window.pixelStudioResizePreview();
    } else {
      ui.preview.style.width = `${w * scale}px`;
      ui.preview.style.height = `${h * scale}px`;
    }
    ui.preview.style.aspectRatio = `${w} / ${h}`;
    ui.preview.style.imageRendering = 'pixelated';
    ui.preview.style.objectFit = 'contain';
    document.getElementById('screenResolution').textContent = w + ' × ' + h;
    document.getElementById('pixelCount').textContent = (w * h) + ' PIXELS';
    document.querySelectorAll('[data-resolution]').forEach(button => button.classList.toggle('is-active', button.dataset.resolution === w + ',' + h));
  }

  function drawStudioClock(paint,dimensions,date=new Date(),font,palette){
    return window.PixelStudioClock.draw(paint,dimensions,date,font||document.getElementById('clockFont')?.value,palette||document.getElementById('clockPalette')?.value);
  }

  function drawPixelAnimation(mode,t,paint=offCtx,dimensions=getFrameConfig()){
    return window.PixelStudioAnimations.draw(paint,{mode,time:t,width:dimensions.w,height:dimensions.h,
      clockFont:document.getElementById('clockFont')?.value,clockPalette:document.getElementById('clockPalette')?.value,
      temperatureSample:window.pixelStudioTemperatureSample,thermal:window.pixelStudioTemperatureSettings||{}});
  }

  function makeAnimationThumbnail(mode) {
    const canvas=document.createElement('canvas');canvas.width=15;canvas.height=27;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#000000';ctx.fillRect(0,0,15,27);
    if(mode==='clock')drawStudioClock(ctx,{w:15,h:27},new Date(2026,0,1,14,20,0));
    else if(mode==='wave'){
      ctx.fillStyle='#ffdd57';
      for(let x=0;x<15;x++)ctx.fillRect(x,Math.round((Math.sin(x/15*Math.PI*6+2)*.45+.55)*26),1,1);
    }else drawPixelAnimation(mode,1.8,ctx,{w:15,h:27});
    return canvas.toDataURL('image/png');
  }

  function setupCadPixelPreview() {
    const preview = ui.preview;
    const stage = preview.closest('.preview-stage');
    if (!stage || stage.querySelector('.pixel-appearance')) return;

    const controls = document.createElement('div');
    controls.className = 'pixel-appearance';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', '像素预览外观');
    const cadButton = document.createElement('button');
    cadButton.type = 'button';
    cadButton.className = 'chip pixel-appearance-button';
    cadButton.textContent = 'CAD 圆角';
    cadButton.title = '参考手绘 CAD：开孔 6.325 mm，中心距 7.125 mm，圆角 R0.8 mm';
    const rawButton = document.createElement('button');
    rawButton.type = 'button';
    rawButton.className = 'chip pixel-appearance-button';
    rawButton.textContent = '原始像素';
    // Retain the button handlers consumed by the shared settings checkbox.
    controls.hidden = true;
    controls.append(cadButton, rawButton);
    stage.insertAdjacentElement('afterend', controls);

    // Appearance is painted by the shared UI's SVG preview scene.
    const updateDimensions = () => window.pixelStudioResizePreview?.();
    const setAppearance = enabled => {
      preview.classList.toggle('cad-pixels', enabled);
      cadButton.setAttribute('aria-pressed', String(enabled));
      rawButton.setAttribute('aria-pressed', String(!enabled));
      updateDimensions();
    };
    cadButton.addEventListener('click', () => setAppearance(true));
    rawButton.addEventListener('click', () => setAppearance(false));
    for (const input of [ui.matrixW, ui.matrixH]) {
      input.addEventListener('change', updateDimensions);
    }
    setAppearance(true);
  }

  function stopAnimationPreview() {
    if (animationPreviewTimer !== null) clearTimeout(animationPreviewTimer);
    animationPreviewTimer = null;
  }

  function startAnimationPreview() {
    if (mediaDisposed || window.pixelStudioHeadless === true || animationPreviewTimer !== null) return;
    const tick = () => {
      animationPreviewTimer = null;
      if (mediaDisposed) return;
      // Output has its own scheduler. Hidden windows do not need PNGs or
      // preview sampling, but video decoding and content time stay running.
      if (document.hidden) {
        animationPreviewTimer = setTimeout(tick, 250);
        return;
      }
      try {
        if (getAnimationMode() !== 'file') buildGeneratedFrame(getAnimationMode());
        else if (mediaType === 'video' && mediaObj?.readyState >= 2) extractFrame();
      } catch (error) {
        previewFailed=true;
        setStatus('预览失败：' + error.message, 'err');
        return;
      }
      animationPreviewTimer = setTimeout(tick, 16);
    };
    tick();
  }

  const resumeVisiblePreview = () => {
    if (!document.hidden && animationPreviewTimer !== null && !mediaDisposed) {
      stopAnimationPreview();
      startAnimationPreview();
    }
  };
  document.addEventListener('visibilitychange', resumeVisiblePreview);
  window.addEventListener('pagehide', () => document.removeEventListener('visibilitychange', resumeVisiblePreview), {once:true});

  function buildGeneratedFrame(mode) {
    const { w, h } = getFrameConfig();
    offscreen.width = w;
    offscreen.height = h;
    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    const t = getAnimationTime();
    if (!drawPixelAnimation(mode,t)) { previewFailed=true; return null; }
    if (window.pixelStudioRecolor && window.PixelStudioFramePipeline.paletteModes.includes(mode)) {
      const image=offCtx.getImageData(0,0,w,h);
      window.PixelStudioFramePipeline.recolorRgba(image.data,mode,window.pixelStudioAnimationPaletteKey||'original',window.pixelStudioRecolor);
      offCtx.putImageData(image,0,0);
    }
    if (!document.hidden) ui.preview.src = offscreen.toDataURL('image/png');
    const frame=sampleFrameFromCanvas();
    previewFailed=false;
    return frame;
  }

  function showStaticPreview(file,desktopUrl) {
    if (mediaDisposed || !file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      if(getAnimationMode()==='file'&&!hasReadyMedia())previewFailed=true;
      setStatus('请选择图片或视频文件。','err');
      return;
    }
    if(desktopUrl&&(!window.pixelStudioDesktop?.edition||!/^pixel-media:\/\/library\/[a-z0-9-]+$/i.test(desktopUrl))){
      if(getAnimationMode()==='file'&&!hasReadyMedia())previewFailed=true;
      setStatus('媒体地址无效。','err');return;
    }
    releaseMedia();
    const generation=mediaGeneration;
    const current=()=>!mediaDisposed&&generation===mediaGeneration;
    setStatus(file.type.startsWith('video/')?'正在加载视频…':'正在加载图片…');
    // Browser file selection keeps its original Blob/File path. Desktop
    // folders supply a scoped streaming URL, never the complete file bytes.
    const sourceUrl=desktopUrl||(mediaUrl=URL.createObjectURL(file));

    if (file.type.startsWith('video/')) {
      mediaType = 'video';
      const video = document.createElement('video');
      if(desktopUrl)video.crossOrigin='anonymous';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      pendingMedia = video;
      video.onloadedmetadata = () => {
        if(!current())return;
        pendingMedia = null;
        mediaObj = video;
        onMediaReady(file);
        syncPlaybackRate();
        video.play().catch(() => {});
        applyPreviewAspect();
        updatePreviewByMode();
        startAnimationPreview();
        setStatus(window.pixelStudioDesktop?.edition?'视频已就绪':'视频已就绪，可点击开始发送');
      };
      video.onerror = () => {
        if(!current())return;
        releaseMedia();previewFailed=true;
        setStatus('视频读取失败，请重新选择文件。','err');
      };
      video.src = sourceUrl;
      return;
    }

    mediaType = 'image';
    const img = new Image();
    if(desktopUrl)img.crossOrigin='anonymous';
    pendingMedia = img;
    img.onload = () => {
      if(!current())return;
      pendingMedia = null;
      mediaObj = img;
      onMediaReady(file);
      updatePreviewByMode();
      startAnimationPreview();
      setStatus(window.pixelStudioDesktop?.edition?'图片已就绪':'图片已就绪，可点击开始发送');
    };
    img.onerror = () => {
      if(!current())return;
      releaseMedia();previewFailed=true;
      setStatus('图片读取失败，请重新选择文件。', 'err');
    };
    img.src = sourceUrl;
  }
  function replaceDesktopMedia(file,url,shouldCommit) {
    if(!window.pixelStudioDesktop?.edition||!file||!/^pixel-media:\/\/library\/[a-z0-9-]+$/i.test(url)||! /^(image|video)\//.test(file.type))return Promise.reject(new Error('Invalid desktop media.'));
    replacementCancel?.();
    if(getAnimationMode()==='file'&&!hasReadyMedia())previewFailed=false;
    const generation=mediaGeneration,isVideo=file.type.startsWith('video/');
    const next=isVideo?document.createElement('video'):new Image();
    return new Promise((resolve,reject)=>{
      let settled=false,committing=false;
      const cancel=()=>finish(null,false);
      replacementCancel=cancel;
      const timer=setTimeout(()=>finish(new Error('Media loading timed out.')),20000);
      function finish(error,accepted){
        if(settled)return;settled=true;clearTimeout(timer);
        next.onload=next.onloadeddata=next.onerror=null;
        if(replacementCancel===cancel)replacementCancel=null;
        if(error&&generation===mediaGeneration&&getAnimationMode()==='file'&&!hasReadyMedia())previewFailed=true;
        if(!accepted){if(isVideo){next.pause();next.removeAttribute('src');next.load();}else next.src='';}
        error?reject(error):resolve(Boolean(accepted));
      }
      async function commit(){
        if(settled||committing)return;committing=true;
        try{
          if(isVideo){applyPlaybackRate(next,file);await next.play();}
          if(settled)return;
          if(mediaDisposed||mediaGeneration!==generation||!shouldCommit()){finish(null,false);return;}
          // Swap only a decoded source. The output loop and connection stay alive.
          replacementCancel=null;releaseMedia();
          mediaObj=next;mediaType=isVideo?'video':'image';
          // Restore preferences only after a successful swap, not during decoding.
          onMediaReady(file);
          syncPlaybackRate();
          startAnimationPreview();
          finish(null,true);
        }catch(error){finish(error);}
      }
      next.crossOrigin='anonymous';next.onerror=()=>finish(new Error('Unable to decode media.'));
      if(isVideo){next.muted=true;next.loop=true;next.playsInline=true;next.preload='auto';next.onloadeddata=commit;}
      else next.onload=commit;
      next.src=url;
    });
  }
  function updatePreviewByMode() {
    if (!mediaObj || mediaType !== 'image') return;
    previewFailed=true;
    const { w, h } = getFrameConfig();
    offscreen.width = w;
    offscreen.height = h;
    const sourceW = mediaObj.videoWidth || mediaObj.naturalWidth || mediaObj.width || 0;
    const sourceH = mediaObj.videoHeight || mediaObj.naturalHeight || mediaObj.height || 0;
    drawToDisplayCanvas(w, h, sourceW, sourceH);
    ui.preview.src = offscreen.toDataURL('image/png');
    previewFailed=false;
  }
 // Playback consumes one frame-source contract. Mode selection, decoding and
 // drawing remain here; connection and scheduling never choose a renderer.
 const frameSource=Object.freeze({
   get previewStatus(){return previewStatus();},
   get kind(){return getAnimationMode()==='file'?mediaType:'animation';},
   get ready(){return getAnimationMode()!=='file'||Boolean(mediaObj);},
   readFrame(){
     const mode=getAnimationMode();
     if(mode==='file')return extractFrame();
     const frame=buildGeneratedFrame(mode);
     if(!frame)throw new Error('无法生成动态帧');
     return frame;
   },
   prepare(){
     const mode=getAnimationMode();
     if(mode==='file')return;
     mediaType=mode;applyPreviewAspect();buildGeneratedFrame(mode);
   }
 });
 return {frameSource,syncPlaybackRate,drawToDisplayCanvas,extractFrame,sampleFrameFromCanvas,applyPreviewAspect,drawStudioClock,drawPixelAnimation,makeAnimationThumbnail,setupCadPixelPreview,stopAnimationPreview,startAnimationPreview,buildGeneratedFrame,showStaticPreview,replaceDesktopMedia,updatePreviewByMode,state:{get mediaObj(){return mediaObj;},set mediaObj(value){if(value===null)releaseMedia();else mediaObj=value;},get mediaType(){return mediaType;},set mediaType(value){mediaType=value;}}};
});
