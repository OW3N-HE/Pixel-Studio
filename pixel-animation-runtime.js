(() => {
  let media,output,player;
  function drawToDisplayCanvas(...args){return media.drawToDisplayCanvas(...args);}
  function extractFrame(...args){return media.extractFrame(...args);}
  function sampleFrameFromCanvas(...args){return media.sampleFrameFromCanvas(...args);}
  function applyPreviewAspect(...args){return media.applyPreviewAspect(...args);}
  function drawStudioClock(...args){return media.drawStudioClock(...args);}
  function drawPixelAnimation(...args){return media.drawPixelAnimation(...args);}
  function makeAnimationThumbnail(...args){return media.makeAnimationThumbnail(...args);}
  function setupCadPixelPreview(...args){return media.setupCadPixelPreview(...args);}
  function stopAnimationPreview(...args){return media.stopAnimationPreview(...args);}
  function startAnimationPreview(...args){return media.startAnimationPreview(...args);}
  function buildGeneratedFrame(...args){return media.buildGeneratedFrame(...args);}
  function showStaticPreview(...args){return media.showStaticPreview(...args);}
  function updatePreviewByMode(...args){return media.updatePreviewByMode(...args);}
  function getAnimationTime(...args){return player.getAnimationTime(...args);}
  function sendFrame(...args){return player.sendFrame(...args);}
  function loopFrames(...args){return player.loopFrames(...args);}
  function startLoop(...args){return player.startLoop(...args);}
  function stopBtn(...args){return player.stopBtn(...args);}
  function stopLoop(...args){return player.stopLoop(...args);}
  function isHttpMode(...args){return output.isHttpMode(...args);}
  function isWsMode(...args){return output.isWsMode(...args);}
  function getHttpTarget(...args){return output.getHttpTarget(...args);}
  function getWsUrl(...args){return output.getWsUrl(...args);}
  function wsSendPayload(...args){return output.wsSendPayload(...args);}
  function serialNote(...args){return output.serialNote(...args);}
  function serialResetSession(...args){return output.serialResetSession(...args);}
  function serialAcceptLine(...args){return output.serialAcceptLine(...args);}
  function serialQuery(...args){return output.serialQuery(...args);}
  function sendFrameAdalight(...args){return output.sendFrameAdalight(...args);}
  function serialHoldImage(...args){return output.serialHoldImage(...args);}
  function serialUartFps(...args){return output.serialUartFps(...args);}
  function serialStopHold(...args){return output.serialStopHold(...args);}
  function bytesToHex(...args){return output.bytesToHex(...args);}
  function pixelToHex(...args){return output.pixelToHex(...args);}
  function frameToHexList(...args){return output.frameToHexList(...args);}
  function buildFramePairs(...args){return output.buildFramePairs(...args);}
  function frameToRgbTriples(...args){return output.frameToRgbTriples(...args);}
  function writeLine(...args){return output.writeLine(...args);}
  function deviceBase(...args){return output.deviceBase(...args);}
  function fetchDeviceJSON(...args){return output.fetchDeviceJSON(...args);}
  function readDeviceProfile(...args){return output.readDeviceProfile(...args);}
  function resetFrameCache(...args){return output.resetFrameCache(...args);}
  function closeFrameSocket(...args){return output.closeFrameSocket(...args);}
  function openFrameSocket(...args){return output.openFrameSocket(...args);}
  function sendSocketCommand(...args){return output.sendSocketCommand(...args);}
  function ensureIpTransport(...args){return output.ensureIpTransport(...args);}
  function compensateColors(...args){return output.compensateColors(...args);}
  function encodePixelPackets(...args){return output.encodePixelPackets(...args);}
  function showStreamStats(...args){return output.showStreamStats(...args);}
  function sendFrameWledJson(...args){return output.sendFrameWledJson(...args);}
  function sendFrameHttp(...args){return output.sendFrameHttp(...args);}
  function sendFrameWledColorCompat(...args){return output.sendFrameWledColorCompat(...args);}
  function sendFrameRaw(...args){return output.sendFrameRaw(...args);}
  function connect(...args){return output.connect(...args);}
  function disconnect(...args){return output.disconnect(...args);}
  function readLoop(...args){return output.readLoop(...args);}
  function testHttp(...args){return output.testHttp(...args);}
  function testSerial(...args){return output.testSerial(...args);}
  function buildSolidFrame(...args){return output.buildSolidFrame(...args);}
  function isDdpMode(...args){return output.isDdpMode(...args);}
  function ddpTargetFps(...args){return output.ddpTargetFps(...args);}
  function bridgeRequest(...args){return output.bridgeRequest(...args);}
  function stopDdpPlayback(...args){return output.stopDdpPlayback(...args);}
  function ensureDdpSession(...args){return output.ensureDdpSession(...args);}
  function sendFrameDdp(...args){return output.sendFrameDdp(...args);}
  function updateBackgroundStats(...args){return output.updateBackgroundStats(...args);}
  const ui = {
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    controlMode: document.getElementById('controlMode'),
    wledHost: document.getElementById('wledHost'),
    httpPath: document.getElementById('httpPath'),
    baudRate: document.getElementById('baudRate'),
    matrixW: document.getElementById('matrixW'),
    matrixH: document.getElementById('matrixH'),
    scaleMode: window.pixelStudioDesktop?.edition ? null : document.getElementById('scaleMode'),
    brightness: document.getElementById('brightness'),
    fps: document.getElementById('fps'),
    mapping: document.getElementById('mapping'),
    protocol: document.getElementById('protocol'),
    status: document.getElementById('status'),
    progress: document.getElementById('progress'),
    mediaFile: document.getElementById('mediaFile'),
    animationMode: document.getElementById('animationMode'),
    previewOnlyBtn: document.getElementById('previewOnlyBtn'),
    testHttpBtn: document.getElementById('testHttpBtn'),
    quickSerialBtn: document.getElementById('quickSerialBtn'),
    testSerialBtn: document.getElementById('testSerialBtn'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    preview: document.getElementById('preview'),
    log: document.getElementById('log'),
    testRedBtn: document.getElementById('testRedBtn'),
    testGreenBtn: document.getElementById('testGreenBtn'),
    testBlueBtn: document.getElementById('testBlueBtn'),
    testBlackBtn: document.getElementById('testBlackBtn'),
    testWhiteBtn: document.getElementById('testWhiteBtn'),
    clearPreviewBtn: document.getElementById('clearPreviewBtn'),
    safeMode: document.getElementById('safeMode')
  };

  function motionPixel(value) {
    return Math.round(value);
  }

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

  function getFrameConfig() {
    return window.PixelStudioRenderSettings.frameConfig({width:ui.matrixW.value,height:ui.matrixH.value,brightness:ui.brightness.value});
  }

  function frameBytesForCurrentConfig() {
    const { pixelCount } = getFrameConfig();
    return pixelCount * 3;
  }

  function clampFpsForCurrentMode(rawMode, userFps) {
    if(ui.controlMode.value==='serial' && ui.protocol.value==='adalight'){
      const target=Math.max(1,Math.min(60,Number(ui.fps.value)||20));
      const config=getFrameConfig();
      return output.state.serialLab.nativeUsb?Math.min(target,60):Math.min(target,serialUartFps(config.w*config.h*3));
    }
    const base = Math.max(1, Math.min(60, withNum(userFps, 20)));
    if (ui.controlMode.value === 'ddp') return base;
    if (!ui.safeMode.checked) return base;
    const bytes = frameBytesForCurrentConfig();
    if (ui.controlMode.value !== 'serial') return Math.min(base, bytes > 6144 ? 6 : bytes > 3072 ? 12 : 20);
    return Math.min(base, bytes > 2048 ? 4 : bytes > 1024 ? 6 : 8);
  }
  function minIntervalMs() {
    if(ui.controlMode.value==='serial' && ui.protocol.value==='adalight')return 0;
    return ui.safeMode.checked && ui.controlMode.value === 'serial' ? 120 : 0;
  }

  const animationDescriptions=window.PixelStudioAnimationCatalog.descriptions;



  // Hand-drawn originals belong to the user and their friend. Pixels are embedded for offline use.

  // Dedicated odd-sized editions keep the original pixels and palette intact.
  // Insert at the center horizontally, and away from facial details vertically.

  // V0.1.10 scenes alone use extended, 24-second, 24-step/second stories.

  const animationCatalog = window.PixelStudioAnimationCatalog.entries;
  let activeAnimationFilter = 'all';

  function syncStudioSelection() {
    const mode = getAnimationMode();
    const search = document.getElementById('librarySearch').value.trim().toLocaleLowerCase();
    document.getElementById('nowPlaying').textContent = mode === 'file' ? '我的图片 / 视频' : ui.animationMode.selectedOptions[0].textContent;
    document.querySelectorAll('.animation-card').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      const categoryHidden = activeAnimationFilter === 'new' ? !animationCatalog[button.dataset.mode][1] : activeAnimationFilter !== 'all' && animationCatalog[button.dataset.mode][0] !== activeAnimationFilter;
      const title = button.querySelector('.animation-title').textContent.toLocaleLowerCase();
      button.hidden = categoryHidden || (search && !title.includes(search));
    });
  }


  function setupStudio() {
    setupCadPixelPreview();
    for(const control of [ui.stopBtn,ui.previewOnlyBtn,ui.disconnectBtn]){
      if(control)control.addEventListener('click',serialStopHold);
    }
    for(const control of [ui.controlMode,ui.protocol,ui.matrixW,ui.matrixH]){
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
    document.getElementById('randomAnimationBtn').addEventListener('click', () => {
      const choices = Object.keys(animationCatalog).filter(mode => mode !== getAnimationMode() && (activeAnimationFilter === 'all' || (activeAnimationFilter === 'new' ? animationCatalog[mode][1] : animationCatalog[mode][0] === activeAnimationFilter)));
      if (!choices.length) return;
      ui.animationMode.value = choices[Math.floor(Math.random() * choices.length)]; ui.animationMode.dispatchEvent(new Event('change'));
    });
    ui.animationMode.addEventListener('change', syncStudioSelection);
    ui.mediaFile.addEventListener('change', syncStudioSelection);
    window.addEventListener('resize', applyPreviewAspect);
    ui.animationMode.dispatchEvent(new Event('change'));
  }

  async function sendSolidFrame(color) {
    stopLoop('发送测试颜色');
    try {
      const deadline = performance.now() + 5000;
      while (player.state.frameInFlight && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
      if (player.state.frameInFlight) throw new Error('上一帧尚未结束，请稍后再试');
      resetFrameCache();
      if (ui.protocol.value === 'raw-bin') {
        if (ui.controlMode.value !== 'serial') throw new Error('二进制串口协议不能用于 IP 控制');
        await sendFrameRaw(buildSolidFrame(color));
      } else await sendFrameWledJson(buildSolidFrame(color));
      setStatus('测试颜色已发送到整屏', 'ok');
    } catch (error) { setStatus('发送测试色失败：' + error.message, 'err'); }
  }

  const playbackState={get running(){return player.state.running;},get stopFlag(){return player.state.stopFlag;},get rafId(){return player.state.rafId;},get currentFrame(){return player.state.currentFrame;},get animationElapsed(){return player.state.animationElapsed;},get animationLastTime(){return player.state.animationLastTime;},get animationSpeed(){return player.state.animationSpeed;},get playbackGeneration(){return player.state.playbackGeneration;},get frameInFlight(){return player.state.frameInFlight;}};
  media=window.PixelStudioBrowserMedia.create({window,ui,getFrameConfig,getAnimationMode,getAnimationTime,setStatus});
  output=window.PixelStudioBrowserOutput.create({window,playback:playbackState,ui,animationCatalog,getFrameConfig,getAnimationMode,withNum,setStatus,logLine,stopLoop:(...args)=>stopLoop(...args),stopBtn:(...args)=>stopBtn(...args)});
  player=window.PixelStudioBrowserPlayback.create({window,content:media.frameSource,connection:output.state,ui,withNum,frameBytesForCurrentConfig,clampFpsForCurrentMode,minIntervalMs,setStatus,logLine,sendFrameRaw:(...args)=>sendFrameRaw(...args),sendFrameWledJson:(...args)=>sendFrameWledJson(...args),isHttpMode:(...args)=>isHttpMode(...args),isWsMode:(...args)=>isWsMode(...args),isDdpMode:(...args)=>isDdpMode(...args),connect:(...args)=>connect(...args),testSerial:(...args)=>testSerial(...args),getHttpTarget:(...args)=>getHttpTarget(...args),resetFrameCache:(...args)=>resetFrameCache(...args),serialStopHold:(...args)=>serialStopHold(...args),stopDdpPlayback:(...args)=>stopDdpPlayback(...args)});

  ui.connectBtn.addEventListener('click', async () => {
    const resume = player.state.running;
    await connect();
    if (resume && output.state.writer && !player.state.running) await startLoop();
  });
  ui.quickSerialBtn.addEventListener('click', async () => {
    if (!('serial' in navigator)) { setStatus('当前浏览器不支持 Web Serial，请使用桌面版 Chrome 或 Edge', 'err'); return; }
    ui.controlMode.value = 'serial';
    ui.protocol.value = 'adalight';
    await connect();
  });
  ui.disconnectBtn.addEventListener('click', disconnect);
  ui.testHttpBtn.addEventListener('click', testHttp);
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
  ui.previewOnlyBtn.addEventListener('click', () => {
    if (getAnimationMode() !== 'file') {
      if (player.state.running) stopLoop('切换到本地预览');
      applyPreviewAspect();
      startAnimationPreview();
      setStatus('正在本地预览，点击开始发送可控制 WLED');
      return;
    }
    const f = ui.mediaFile.files && ui.mediaFile.files[0];
    if (media.state.mediaObj) {
      if (player.state.running) stopLoop('切换到本地预览');
      startAnimationPreview();
      updatePreviewByMode();
      return;
    }
    if (!f) {
      setStatus('请先选择文件', 'err');
      return;
    }
    showStaticPreview(f);
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
  ui.matrixW.addEventListener('change', () => {
    applyPreviewAspect();
    updatePreviewByMode();
  });
  ui.matrixH.addEventListener('change', () => {
    applyPreviewAspect();
    updatePreviewByMode();
  });
  ui.scaleMode?.addEventListener('change', () => {
    applyPreviewAspect();
    updatePreviewByMode();
  });
  ui.testRedBtn.addEventListener('click', () => sendSolidFrame([255, 0, 0]));
  ui.testGreenBtn.addEventListener('click', () => sendSolidFrame([0, 255, 0]));
  ui.testBlueBtn.addEventListener('click', () => sendSolidFrame([0, 0, 255]));
  ui.testBlackBtn.addEventListener('click', () => sendSolidFrame([0, 0, 0]));
  ui.testWhiteBtn.addEventListener('click', () => sendSolidFrame([255, 255, 255]));
  ui.clearPreviewBtn.addEventListener('click', () => {
    stopLoop('预览已清空');
    stopAnimationPreview();
    media.state.mediaObj = null;
    media.state.mediaType = null;
    ui.preview.src = '';
    ui.mediaFile.value = '';
    setStatus('预览已清空');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) stopLoop('用户按键停止');
  });

  applyPreviewAspect();

  for (const id of ['colorMode','colorGamma']) document.getElementById(id).addEventListener('change', resetFrameCache);
  for (const field of [ui.wledHost,ui.controlMode]) field.addEventListener('change', () => {
    stopLoop('设备通道已改变'); closeFrameSocket(); output.state.deviceProfile = null; output.state.ipTransport = 'http';
  });
  document.getElementById('readDeviceSizeBtn').addEventListener('click', async () => {
    stopLoop('读取设备尺寸');
    try {
      const profile = await readDeviceProfile(true);
      if (!profile.matrix) throw new Error('设备未报告二维矩阵尺寸，请手动输入');
      ui.matrixW.value = profile.matrix.w; ui.matrixH.value = profile.matrix.h;
      applyPreviewAspect(); resetFrameCache();
      if (getAnimationMode() === 'file') updatePreviewByMode(); else startAnimationPreview();
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
        const socketOpen=state.ws?.readyState===WebSocket.OPEN;
        const transport=ui.controlMode.value==='http'||state.ipTransport==='http'||state.ipTransport==='http-fallback'?'http':socketOpen||ui.controlMode.value==='ws'?'ws':'auto';
        return {transport,state:player.state.running?'sending':socketOpen&&transport==='ws'?'connected':'idle'};
      },
      resizePreview: applyPreviewAspect,
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
        const generation=player.state.playbackGeneration;
        const accepted=await media.replaceDesktopMedia(file,file.url,()=>player.state.running&&player.state.playbackGeneration===generation&&shouldCommit());
        if(accepted&&getAnimationMode()!=='file'){
          desktopMediaTransition=true;
          try{ui.animationMode.value='file';ui.animationMode.dispatchEvent(new Event('change',{bubbles:true}));}
          finally{desktopMediaTransition=false;}
        }
        if(accepted&&player.state.running&&player.state.playbackGeneration===generation)setStatus(media.state.mediaType==='video'?'正在播放视频':'正在播放图片');
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
      for (const id of ['stopBtn','disconnectBtn','previewOnlyBtn'])
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
