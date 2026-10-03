(() => {
  let media,output,player;
  function applyPreviewAspect(...args){return media.applyPreviewAspect(...args);}
  function makeAnimationThumbnail(...args){return media.makeAnimationThumbnail(...args);}
  function setupCadPixelPreview(...args){return media.setupCadPixelPreview(...args);}
  function stopAnimationPreview(...args){return media.stopAnimationPreview(...args);}
  function startAnimationPreview(...args){return media.startAnimationPreview(...args);}
  function buildGeneratedFrame(...args){return media.buildGeneratedFrame(...args);}
  function showStaticPreview(...args){return media.showStaticPreview(...args);}
  function updatePreviewByMode(...args){return media.updatePreviewByMode(...args);}
  function getAnimationTime(...args){return player.getAnimationTime(...args);}
  function startLoop(...args){return player.startLoop(...args);}
  function stopBtn(...args){return player.stopBtn(...args);}
  function stopLoop(...args){return player.stopLoop(...args);}
  function serialUartFps(...args){return output.serialUartFps(...args);}
  function serialStopHold(...args){return output.serialStopHold(...args);}
  function deviceBase(...args){return output.deviceBase(...args);}
  function readDeviceProfile(...args){return output.readDeviceProfile(...args);}
  function resetFrameCache(...args){return output.resetFrameCache(...args);}
  function connect(...args){return output.connect(...args);}
  function disconnect(...args){return output.disconnect(...args);}
  function testSerial(...args){return output.testSerial(...args);}
  function isDdpMode(...args){return output.isDdpMode(...args);}
  function bridgeRequest(...args){return output.bridgeRequest(...args);}
  function stopDdpPlayback(...args){return output.stopDdpPlayback(...args);}
  const ui = {
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    controlMode: document.getElementById('controlMode'),
    wledHost: document.getElementById('wledHost'),
    baudRate: document.getElementById('baudRate'),
    matrixW: document.getElementById('matrixW'),
    matrixH: document.getElementById('matrixH'),
    scaleMode: window.pixelStudioDesktop?.edition ? null : document.getElementById('scaleMode'),
    brightness: document.getElementById('brightness'),
    fps: document.getElementById('fps'),
    mapping: document.getElementById('mapping'),
    protocol: document.getElementById('protocol'),
    status: document.getElementById('status'),
    mediaFile: document.getElementById('mediaFile'),
    animationMode: document.getElementById('animationMode'),
    quickSerialBtn: document.getElementById('quickSerialBtn'),
    testSerialBtn: document.getElementById('testSerialBtn'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    preview: document.getElementById('preview'),
    log: document.getElementById('log'),
  };

  function getAnimationMode() {
    return ui.animationMode.value;
  }

function nowText() {
    return new Date().toLocaleTimeString();
  }

  function logLine(msg) {
    ui.log.textContent = `[${nowText()}] ${msg}\n` + ui.log.textContent;
    if (ui.log.textContent.length > 3000) {
      ui.log.textContent = ui.log.textContent.slice(0, 3000);
    }
  }

  let statusSource = null;
  let statusKind = '';
  function renderStatus() {
    if (statusSource === null) return;
    ui.status.setAttribute('data-update-ui', '');
    ui.status.textContent = window.pixelStudioFormatNotice ? window.pixelStudioFormatNotice(statusSource, statusKind) : statusSource;
  }
  window.addEventListener('pixel-studio-language-change', renderStatus);
  function setStatus(text, kind = '') {
    statusSource = String(text);
    statusKind = kind;
    renderStatus();
    ui.status.classList.remove('ok', 'err');
    if (kind) ui.status.classList.add(kind);
  }

  function withNum(v, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  const renderSettings=window.PixelStudioRenderSettings;
  const dimensions=renderSettings.createDimensionState({width:ui.matrixW.value,height:ui.matrixH.value});
  const initialDimensions=dimensions.read();
  ui.matrixW.value=String(initialDimensions.w);ui.matrixH.value=String(initialDimensions.h);
  let resolutionError='';
  function dimensionMessage(){
    const {maxAxis,maxPixels}=renderSettings.dimensionLimits;
    const {w,h}=dimensions.read();
    return document.documentElement.lang==='en'
      ? `Width and height must be whole numbers from 1 to ${maxAxis}, with at most ${maxPixels} pixels in total. Still using ${w} x ${h}.`
      : `宽和高须为 1~${maxAxis} 的整数，总像素数不能超过 ${maxPixels}。当前仍使用 ${w} × ${h}。`;
  }
  function validateDimensionInputs(){
    const valid=!!renderSettings.validateDimensions({width:ui.matrixW.value,height:ui.matrixH.value});
    resolutionError=valid?'':dimensionMessage();
    for(const field of [ui.matrixW,ui.matrixH]){
      field.setCustomValidity(resolutionError);
      if(valid)field.removeAttribute('aria-invalid');else field.setAttribute('aria-invalid','true');
    }
    window.dispatchEvent(new Event('pixel-studio-resolution-change'));
    return valid;
  }
  function getFrameConfig() {
    const {w,h}=dimensions.read();
    return renderSettings.frameConfig({width:w,height:h,brightness:ui.brightness.value});
  }
  function commitDimensions(){
    if(!validateDimensionInputs())return false;
    const previous=dimensions.read();
    dimensions.update({width:ui.matrixW.value,height:ui.matrixH.value});
    const current=dimensions.read();
    if(current.w===previous.w&&current.h===previous.h)return true;
    serialStopHold();resetFrameCache();
    applyPreviewAspect();updatePreviewByMode();startAnimationPreview();
    return true;
  }
  window.addEventListener('pixel-studio-language-change',validateDimensionInputs);

  function clampFpsForCurrentMode(userFps) {
    const target = Math.max(1, Math.min(60, Number(userFps) || 20));
    if (ui.controlMode.value !== 'serial') return target;
    const {w,h}=getFrameConfig();
    return output.state.serialLab.nativeUsb ? target : Math.min(target,serialUartFps(w*h*3));
  }

  const animationDescriptions=window.PixelStudioAnimationCatalog.descriptions;



  const animationCatalog = window.PixelStudioAnimationCatalog.entries;
  let activeAnimationFilter = 'all';

  function syncStudioSelection() {
    const mode = getAnimationMode();
    const search = document.getElementById('librarySearch').value.trim().toLocaleLowerCase();
    document.querySelectorAll('.animation-card').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      const categoryHidden = activeAnimationFilter === 'new' ? !animationCatalog[button.dataset.mode][1] : activeAnimationFilter !== 'all' && animationCatalog[button.dataset.mode][0] !== activeAnimationFilter;
      const title = button.querySelector('.animation-title').textContent.toLocaleLowerCase();
      button.hidden = categoryHidden || (search && !title.includes(search));
    });
  }


  function setupStudio() {
    setupCadPixelPreview();
    for(const control of [ui.controlMode,ui.protocol]){
      if(control)control.addEventListener('change',serialStopHold);
    }
    const gallery = document.getElementById('animationGallery');
    for (const mode of window.PixelStudioAnimationCatalog.galleryModes) {
      const title = Array.from(ui.animationMode.options).find(option => option.value === mode).textContent;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'animation-card'; button.dataset.mode = mode;
      button.setAttribute('aria-label', title); button.setAttribute('aria-pressed', 'false');
      const thumb = document.createElement('span'); thumb.className = 'animation-thumb';
      const image = document.createElement('img'); image.src = makeAnimationThumbnail(mode); image.alt = ''; thumb.append(image);
      const label = document.createElement('span'); label.className = 'animation-title'; label.textContent = title; button.append(thumb, label);
      button.addEventListener('click', () => { ui.animationMode.value = mode; ui.animationMode.dispatchEvent(new Event('change')); });
      gallery.append(button);
    }
    window.pixelStudioSetAnimationFilter = value => {
      activeAnimationFilter = value;
      syncStudioSelection();
    };
    document.getElementById('libraryCategory').addEventListener('change', event => {
      window.pixelStudioSetAnimationFilter(event.target.value === 'favorites' ? 'all' : event.target.value);
    });
    document.getElementById('librarySearch').addEventListener('input', syncStudioSelection);
    document.querySelectorAll('[data-resolution]').forEach(button => button.addEventListener('click', () => {
      const [w, h] = button.dataset.resolution.split(','); ui.matrixW.value = w; ui.matrixH.value = h;
      ui.matrixW.dispatchEvent(new Event('change'));
    }));
    ui.animationMode.addEventListener('change', syncStudioSelection);
    ui.mediaFile.addEventListener('change', syncStudioSelection);
    window.addEventListener('resize', applyPreviewAspect);
    ui.animationMode.dispatchEvent(new Event('change'));
  }

  const playbackState={get running(){return player.state.running;},get animationElapsed(){return player.state.animationElapsed;},get animationLastTime(){return player.state.animationLastTime;},get animationSpeed(){return player.state.animationSpeed;}};
  media=window.PixelStudioBrowserMedia.create({window,ui,getFrameConfig,getAnimationMode,getAnimationTime,setStatus});
  output=window.PixelStudioBrowserOutput.create({window,playback:playbackState,ui,animationCatalog,getFrameConfig,getAnimationMode,withNum,setStatus,logLine,stopLoop:(...args)=>stopLoop(...args),stopBtn:(...args)=>stopBtn(...args)});
  player=window.PixelStudioBrowserPlayback.create({window,content:media.frameSource,outputSession:output,ui,withNum,clampFpsForCurrentMode,setStatus});

  ui.connectBtn.addEventListener('click', () => connect());
  ui.quickSerialBtn.addEventListener('click', async () => {
    if (!('serial' in navigator)) { setStatus('当前浏览器不支持 Web Serial，请使用桌面版 Chrome 或 Edge', 'err'); return; }
    ui.controlMode.value = 'serial';
    ui.protocol.value = 'adalight';
    await connect();
  });
  ui.disconnectBtn.addEventListener('click', disconnect);
  ui.testSerialBtn.addEventListener('click', testSerial);
  ui.startBtn.addEventListener('click', startLoop);
  ui.stopBtn.addEventListener('click', stopLoop.bind(null, ''));
  let desktopMediaTransition=false;
  ui.animationMode.addEventListener('change', () => {
    const mode = getAnimationMode();
    player.state.animationElapsed = 0;
    player.state.animationLastTime = performance.now();
    stopAnimationPreview();
    document.getElementById('animationHint').textContent = animationDescriptions[mode] || '选择图片或视频文件后，可以预览并发送到 WLED。';
    if (mode !== 'file') {
      media.state.mediaObj = null;
      media.state.mediaType = mode;
      applyPreviewAspect();
      startAnimationPreview();
      setStatus(window.pixelStudioDesktop?.edition&&!player.state.running ? '动画预览中' : `已切换到${ui.animationMode.selectedOptions[0].textContent}${player.state.running ? '，持续发送中' : '，正在本地预览'}`);
    } else {
      if(desktopMediaTransition)return;
      if (player.state.running) stopLoop(window.pixelStudioDesktop?.edition?'切换到媒体模式':'切换到文件模式');
      setStatus(window.pixelStudioDesktop?.edition?'媒体模式：请选择图片或视频':'已切换到文件模式，请选择图片或视频');
    }
  });
  document.getElementById('animationSpeed').addEventListener('input', (e) => {
    getAnimationTime();
    player.state.animationSpeed = Number(e.target.value) || 1;
    document.getElementById('animationSpeedValue').value = player.state.animationSpeed.toFixed(2) + '×';
  });

  ui.mediaFile.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (player.state.running) stopLoop('选择了新的媒体文件');
    stopAnimationPreview();
    ui.animationMode.value = 'file';
    document.getElementById('animationHint').textContent = '选择图片或视频文件后，可以预览并发送到 WLED。';
    showStaticPreview(f);
  });
  for(const field of [ui.matrixW,ui.matrixH]){
    field.addEventListener('input',validateDimensionInputs);
    field.addEventListener('change',commitDimensions);
  }
  ui.scaleMode?.addEventListener('change', () => {
    applyPreviewAspect();
    updatePreviewByMode();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) stopLoop('用户按键停止');
  });

  applyPreviewAspect();

  for (const id of ['colorMode','colorGamma']) document.getElementById(id).addEventListener('change', resetFrameCache);
  for (const field of [ui.wledHost,ui.controlMode]) field.addEventListener('change', () => {
    stopLoop('设备通道已改变'); resetFrameCache(); output.state.deviceProfile = null;
  });
  document.getElementById('readDeviceSizeBtn').addEventListener('click', async () => {
    stopLoop('读取设备尺寸');
    try {
      const profile = await readDeviceProfile(true);
      if (!profile.matrix) throw new Error('设备未报告二维矩阵尺寸，请手动输入');
      if(!renderSettings.validateDimensions({width:profile.matrix.w,height:profile.matrix.h}))throw new Error(dimensionMessage());
      ui.matrixW.value = profile.matrix.w; ui.matrixH.value = profile.matrix.h;
      commitDimensions();
      setStatus('已使用设备尺寸 ' + profile.matrix.w + '×' + profile.matrix.h, 'ok');
    } catch (error) { setStatus(error.message, 'err'); }
  });

  ui.stopBtn.addEventListener('click',()=>{
    if(!output.state.bridgeToken || !isDdpMode())return;
    // Also stop a worker left player.state.running by a crashed/reloaded browser tab.
    void bridgeRequest('/api/stop',{json:{host:deviceBase()},keepalive:true})
      .then(()=>{document.getElementById('streamStats').textContent='DDP 后台播放已停止';})
      .catch(error=>setStatus('后台停止失败：'+error.message,'err'));
  });

  // The service enables DDP but does not select an output or start playback.
  window.addEventListener('pagehide',stopDdpPlayback);

  function syncClockStyling() {
    document.getElementById('clockStyling').hidden=getAnimationMode()!=='clock';
  }
  ui.animationMode.addEventListener('change',syncClockStyling);
  for(const id of ['clockFont','clockPalette'])document.getElementById(id).addEventListener('change',()=>{
    resetFrameCache();
    if(getAnimationMode()==='clock' && !player.state.running)buildGeneratedFrame('clock');
    const thumb=document.querySelector('[data-mode="clock"] img');
    if(thumb)thumb.src=makeAnimationThumbnail('clock');
  });

  setupStudio();
  syncClockStyling();
  // Explicit browser-only state: the shell never infers playback from status text.
  if (window.pixelStudioHeadless !== true) {
    window.pixelStudioWebRuntime = {
      get playing() { return player.state.running; },
      get serialConnected() { return !!output.state.writer; },
      get outputStatus() {
        const state=output.state;
        if(ui.controlMode.value==='serial')return {transport:'usb',state:!state.writer?'disconnected':state.serialLab.confirmedWriter!==state.writer?'unverified':player.state.running?'sending':'connected'};
        if(isDdpMode())return {transport:'ddp',state:player.state.running?'sending':state.bridgeToken?'idle':'unavailable'};
        return {transport:'usb',state:'disconnected'};
      },
      resizePreview: applyPreviewAspect,
      getFrameConfig,
      get resolutionError(){return resolutionError;},
      refreshPalette: resetFrameCache,
      disconnectSerial: disconnect,
      resumePlayback: async () => { await startLoop({restore:true}); return player.state.running; }
    };
    if (window.pixelStudioDesktop?.edition) {
      let desktopConnectionGeneration=0;
      window.pixelStudioWebRuntime.restoreDesktopConnection=async()=>{
        if(ui.controlMode.value!=='serial')return false;
        if(output.state.writer)return true;
        const generation=desktopConnectionGeneration;
        await connect({restore:true});
        if(generation!==desktopConnectionGeneration){await disconnect();return false;}
        return Boolean(output.state.writer);
      };
      window.pixelStudioWebRuntime.desktopMediaReady = () => {
        const source=media.state.mediaObj;
        return Boolean(source && (source.tagName==='VIDEO'
          ? source.readyState>=2 : source.complete&&source.naturalWidth>0));
      };
      window.pixelStudioWebRuntime.startDesktopMedia = async () => {
        await startLoop();
        if(player.state.running)setStatus(media.state.mediaType==='video'?'正在播放视频':'正在播放图片');
        return player.state.running;
      };
      window.pixelStudioWebRuntime.replaceDesktopMedia = async (file,shouldCommit=()=>true) => {
        const accepted=await media.replaceDesktopMedia(file,file.url,shouldCommit);
        if(accepted&&getAnimationMode()!=='file'){
          desktopMediaTransition=true;
          try{ui.animationMode.value='file';ui.animationMode.dispatchEvent(new Event('change',{bubbles:true}));}
          finally{desktopMediaTransition=false;}
        }
        if(accepted){
          // A mode change stops the old preview timer; the new source needs its own
          // preview loop even when no output session is running.
          updatePreviewByMode();
          startAnimationPreview();
          setStatus(player.state.running
            ? (media.state.mediaType==='video'?'正在播放视频':'正在播放图片')
            : (media.state.mediaType==='video'?'视频已就绪':'图片已就绪'));
        }
        return accepted;
      };
      window.pixelStudioWebRuntime.loadDesktopMedia = file => {
        if(!file||typeof file.url!=='string'||typeof file.type!=='string')return;
        if(player.state.running)stopLoop('选择了新的媒体文件');
        stopAnimationPreview();
        ui.mediaFile.value='';
        if(ui.animationMode.value!=='file'){
          ui.animationMode.value='file';
          ui.animationMode.dispatchEvent(new Event('change',{bubbles:true}));
        }
        showStaticPreview({type:file.type,name:file.name},file.url);
      };
      for (const id of ['stopBtn','disconnectBtn'])
        document.getElementById(id)?.addEventListener('click', () => {
          if(id==='disconnectBtn')desktopConnectionGeneration++;
          void window.pixelStudioDesktop.cancelResume(id==='disconnectBtn');
          Promise.resolve().then(rememberPlayback);
        });
      const captureDesktopPlayback = () => {
        const values = {};
        for (const id of window.PixelStudioSettingsSchema.playbackControlIds) {
          const element = document.getElementById(id);
          if (element) values[id] = element.type === 'checkbox' ? String(element.checked) : element.value;
        }
        const current=dimensions.read();
        values.matrixW=String(current.w);values.matrixH=String(current.h);
        const session=window.pixelStudioDesktopSession;
        return {playing:player.state.running,connected:Boolean(output.state.writer),values,sessionReady:session?.ready===true,mediaSession:session?.captureContent()||null};
      };
      window.pixelStudioWebRuntime.captureDesktopPlayback=captureDesktopPlayback;
      const rememberPlayback=()=>window.pixelStudioDesktop.savePlayback(captureDesktopPlayback());
      window.addEventListener('pixel-studio-desktop-ready', () => {
        setInterval(rememberPlayback, 1000);
        window.addEventListener('beforeunload', rememberPlayback);
      }, {once:true});
    }
  }
})();
