'use strict';
// Browser adapter with explicit dependencies; no sensor or Node transport ownership.
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.PixelStudioBrowserOutput={create:factory};
})(typeof globalThis!=='undefined'?globalThis:this,function(options){
 const window=options.window||globalThis;
 const {document,navigator,performance,setTimeout,clearTimeout,setInterval,clearInterval,fetch,WebSocket,URL,AbortController,Response,TextEncoder,TextDecoder,crypto}=window;
 const {ui,playback,animationCatalog,getFrameConfig,getAnimationMode,withNum,setStatus,logLine,stopLoop,stopBtn}=options;
 const encoder=new TextEncoder();
 let port=null,writer=null,reader=null,ws=null,selectingSerial=false;
 let serialColorProfile=null,serialColorLut=null,serialColorUiKey='';
  const serialLab = { confirmedWriter:null, pending:null, readTask:null, bytes:0, nativeUsb:false, activeBaud:115200, frames:0, sampleAt:0, busy:false, heldFrame:null, holdTimer:null, lastWrite:0 };

  let serialNotice = null;
  window.addEventListener('pixel-studio-language-change', () => {
    if (serialNotice) serialNote(serialNotice.message, serialNotice.kind);
    else serialNote('尚未诊断。先确认固件命令通道，再判断像素输出。');
  });

  let ipTransport = 'http';
  let frameSocketPromise = null;
  let wsPending = null;
  let deviceProfile = null;
  let profilePromise = null;
  let preparedOutput = '';
  let lastSentColors = null;
  let lastFrameKey = '';
  let lastKeyframeAt = 0;
  let statsWindow = { at:performance.now(), frames:0, bytes:0, ms:0 };


  const desktopDdp = window.pixelStudioDesktop?.ddpRequest;
  const pageBridgeToken = document.querySelector('meta[name="pixel-bridge-token"]')?.content || '';
  const bridgeToken = desktopDdp ? 'desktop-ipc' : pageBridgeToken;
  const webClientId=pageBridgeToken&&!desktopDdp?crypto.randomUUID():'';
  const reportWebClient=closed=>{if(!webClientId)return;fetch('/api/web-client',{method:'POST',headers:{'X-Pixel-Token':pageBridgeToken,'Content-Type':'application/json'},body:JSON.stringify({id:webClientId,closed}),keepalive:true}).catch(()=>{});};
  if(webClientId){reportWebClient(false);const leaseTimer=setInterval(()=>reportWebClient(false),30000);window.addEventListener('pagehide',()=>{clearInterval(leaseTimer);reportWebClient(true);});window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});}

  const runtimeNotice = document.getElementById('runtimeNotice');
  if (bridgeToken) {
    runtimeNotice.textContent = '高速控制已连接 · DDP 后台 60 FPS · 动画与亮度支持无缝更新';
    runtimeNotice.classList.add('ok');
  } else {
    runtimeNotice.innerHTML = '当前为文件兼容模式，仅适合预览或低速控制。要使用最新控制，请打开 <a href="http://127.0.0.1:8766/" target="_blank" rel="noopener">本地高速 DDP 服务</a>。';
    runtimeNotice.classList.add('err');
  }
  const ddp = {session:null,pending:null,epoch:0,releasing:Promise.resolve(),controller:null};

  function isHttpMode() {
    return ui.controlMode.value === 'ddp' || ui.controlMode.value === 'http' || (ui.controlMode.value === 'auto' && ipTransport !== 'ws');
  }

  function isWsMode() {
    return ui.controlMode.value === 'ws' || (ui.controlMode.value === 'auto' && ipTransport === 'ws');
  }

  function getHttpTarget() {
    const host = (ui.wledHost.value || '').trim().replace(/\/$/, '');
    const path = (ui.httpPath.value || '/json/state').trim();
    return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  function getWsUrl() {
    const rawHost = (ui.wledHost.value || '').trim();
    if (!rawHost) throw new Error('未填写 WLED 地址');
    try {
      const u = new URL(rawHost);
      return `ws://${u.host}/ws`;
    } catch {
      return `ws://${rawHost.replace(/\/+$/, '')}/ws`;
    }
  }

  function wsSendPayload(payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 未连接');
    }
    ws.send(JSON.stringify(payload));
  }

  function serialNote(message, kind) {
    serialNotice = { message, kind };
    const node=document.getElementById('serialDiagnostic');
    if(node) {node.textContent=window.pixelStudioFormatNotice ? window.pixelStudioFormatNotice(message, kind) : message;node.dataset.state=kind||'info';}
  }

  function serialResetSession() {
    serialColorProfile = null;
    serialColorLut = null;
    serialColorUiKey = '';
    serialLab.confirmedWriter=null;
    serialLab.bytes=0;serialLab.frames=0;serialLab.sampleAt=0;
    serialLab.heldFrame=null;clearTimeout(serialLab.holdTimer);
    if(serialLab.pending)serialLab.pending.finish(null);
  }

  function serialAcceptLine(line, sourceWriter) {
    const pending=serialLab.pending;
    if(!pending || pending.writer!==sourceWriter)return;
    const trimmed=line.trim();
    if(pending.type==='version' && /^WLED\s+\S+/i.test(trimmed))pending.finish(trimmed.slice(0,100));
    if(pending.type==='json'){
      try {const value=JSON.parse(trimmed);if(value.info && typeof value.info.ver==='string' && value.state)pending.finish('WLED '+value.info.ver);}catch(_){}
    }
  }

  async function serialQuery(type, payload) {
    const sourceWriter=writer;
    return new Promise((resolve,reject)=>{
      const pending={type,writer:sourceWriter,timer:null,finish:null};
      pending.finish=value=>{clearTimeout(pending.timer);if(serialLab.pending===pending)serialLab.pending=null;resolve(value);};
      serialLab.pending=pending;
      pending.timer=setTimeout(()=>pending.finish(null),1800);
      sourceWriter.write(encoder.encode(payload)).catch(error=>{
        clearTimeout(pending.timer);
        if(serialLab.pending===pending)serialLab.pending=null;
        reject(error);
      });
    });
  }

  async function sendFrameAdalight(frame) {
    if(!writer || serialLab.confirmedWriter!==writer)throw new Error('请先连接串口并点击「串口诊断」，收到 WLED 回包后才能发送。');
    if(serialLab.pending)throw new Error('串口诊断正在进行，请稍候。');
    if(serialLab.busy) return;
    const count=frame.length/3;
    if(!Number.isInteger(count)||count<1||count>65535)throw new Error('Adalight 帧必须为 1–65535 个 RGB 像素。');
    const sourceWriter=writer;
    serialLab.busy=true;
    try {
      const host = deviceBase();
      if (!serialColorProfile || serialColorProfile.writer !== sourceWriter || serialColorProfile.host !== host) {
        const entry = {writer:sourceWriter, host, profile:null};
        serialColorProfile = entry;
        try { entry.profile = await readDeviceProfile(true); }
        catch (_) {
          logLine(document.documentElement.lang === 'en'
            ? 'Cannot read WLED color settings. USB keeps original colors; Gamma compensation is bypassed.'
            : '未读取到 WLED 颜色设置：USB 保留原始颜色，不猜测或应用 Gamma 补偿。');
        }
      }
      if (writer !== sourceWriter || serialLab.confirmedWriter !== sourceWriter) return;
      const profile = serialColorProfile?.profile;
      const known = profile?.realtimeGammaKnown === true;
      const match = document.getElementById('colorMode').value === 'match';
      const gammaField = document.getElementById('colorGamma');
      const gamma = Math.max(1,Math.min(4,known ? profile.gamma : Number(gammaField.value)||2.8));
      const exponent = match && known && profile.realtimeGammaEnabled ? 1/gamma : 1;
      // Update the settings DOM only when the color state or language changes.
      // Repeated textContent writes also wake the language MutationObserver.
      const language = document.documentElement.lang;
      const colorUiKey = host + ':' + known + ':' + match + ':' + gamma + ':' + exponent + ':' + language;
      if (serialColorUiKey !== colorUiKey) {
        serialColorUiKey = colorUiKey;
        gammaField.disabled = true;
        gammaField.title = language === 'en'
          ? 'USB uses detected device Gamma only. Unknown or disabled realtime Gamma: no compensation. Stop and reconnect after changing WLED settings.'
          : 'USB 仅使用实际读取的设备 Gamma；未知或实时 Gamma 关闭时不补偿。修改 WLED 设置后请停止并重新连接串口。';
        document.getElementById('deviceInfo').textContent = language === 'en'
          ? (!known ? 'USB: device color settings unavailable; original RGB.' : exponent === 1 ? 'USB: Gamma compensation bypassed; original RGB.' : 'USB: matching device Gamma ' + gamma.toFixed(2))
          : (!known ? 'USB：未读取到设备颜色配置，保留原始 RGB。' : exponent === 1 ? 'USB：未启用 Gamma 补偿，保留原始 RGB。' : 'USB：正在补偿设备 Gamma ' + gamma.toFixed(2));
      }
      const brightness=Math.max(0,Math.min(255,Number(getFrameConfig().d)))/255;
      const key = brightness + ':' + exponent;
      if (!serialColorLut || serialColorLut.key !== key) serialColorLut = {key,
        values:window.PixelStudioFramePipeline.outputLut(getFrameConfig().d,exponent)};
      const packet=window.PixelStudioOutputProtocols.encodeAdalight(frame,serialColorLut.values);
      const writeStarted=performance.now();
      await sourceWriter.write(packet);
      showStreamStats(true, packet.length, performance.now()-writeStarted);
      serialLab.lastWrite=performance.now();
      serialLab.frames++;
      if(!serialLab.sampleAt)serialLab.sampleAt=serialLab.lastWrite;
      const elapsed=serialLab.lastWrite-serialLab.sampleAt;
      if(elapsed>=1000){
        serialNote((serialLab.nativeUsb?'原生 USB CDC':'UART '+serialLab.activeBaud)+' · 写入 '+(serialLab.frames*1000/elapsed).toFixed(1)+' FPS · '+count+' 像素。此处是电脑写入速率，不是屏幕实测帧率。','ok');
        serialLab.sampleAt=serialLab.lastWrite;serialLab.frames=0;
      }
      if(!animationCatalog[getAnimationMode()]) {
        serialLab.heldFrame=new Uint8Array(frame);
        clearTimeout(serialLab.holdTimer);
        serialLab.holdTimer=setTimeout(serialHoldImage,500);
      } else serialLab.heldFrame=null;
    } finally {serialLab.busy=false;}
  }

  async function serialHoldImage() {
    if(!serialLab.heldFrame || !writer || serialLab.confirmedWriter!==writer || ui.controlMode.value!=='serial' || ui.protocol.value!=='adalight')return;
    if(serialLab.busy){serialLab.holdTimer=setTimeout(serialHoldImage,200);return;}
    try {await sendFrameAdalight(serialLab.heldFrame);}
    catch(error){serialLab.heldFrame=null;serialNote('静态画面续传已停止：'+error.message,'error');}
  }

  function serialUartFps(frameBytes) {
    const baud=serialLab.activeBaud||115200;
    return Math.max(1,Math.floor(baud/(10*((frameBytes||getFrameConfig().w*getFrameConfig().h*3)+6))*0.85));
  }

  function serialStopHold() {
    serialLab.heldFrame=null;
    clearTimeout(serialLab.holdTimer);
  }

  function bytesToHex(u8) {
    let s = '';
    for (const b of u8) {
      s += b.toString(16).padStart(2, '0');
    }
    return s;
  }

  function pixelToHex(v) {
    return Math.max(0, Math.min(255, v ?? 0)).toString(16).padStart(2, '0').toUpperCase();
  }

function frameToHexList(frame) {
    const colors = [];
    for (let i = 0; i < frame.length; i += 3) {
      colors.push(`${pixelToHex(frame[i])}${pixelToHex(frame[i + 1])}${pixelToHex(frame[i + 2])}`);
    }
    return colors;
  }

  function buildFramePairs(frame) {
    const colors = frameToHexList(frame);
    const pairs = [];
    for (let i = 0; i < colors.length; i++) {
      pairs.push(i, colors[i]);
    }
    return pairs;
  }

  function frameToRgbTriples(frame) {
    const rgb = [];
    for (let i = 0; i < frame.length; i += 3) {
      rgb.push([
        Math.max(0, Math.min(255, frame[i] ?? 0)),
        Math.max(0, Math.min(255, frame[i + 1] ?? 0)),
        Math.max(0, Math.min(255, frame[i + 2] ?? 0))
      ]);
    }
    return rgb;
  }

  async function writeLine(line) {
    if (!writer) throw new Error('串口未连接');
    await writer.write(encoder.encode(line));
  }

  function deviceBase() {
    const raw = (ui.wledHost.value || '').trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : 'http://' + raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('请输入有效的 WLED 地址');
    return url.origin;
  }

  async function fetchDeviceJSON(path, payload) {
    if (bridgeToken && payload === undefined) return (await bridgeRequest('/api/device?host='+encodeURIComponent(deviceBase())+'&path='+encodeURIComponent(path))).json();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(deviceBase() + path, {
        method:payload === undefined ? 'GET' : 'POST',
        cache:'no-store',
        ...(payload === undefined ? {} : {headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}),
        signal:controller.signal
      });
      const text = await res.text();
      if (!res.ok) throw new Error('WLED HTTP ' + res.status + ': ' + text.slice(0, 80));
      const result = text ? JSON.parse(text) : {};
      if (result.error) throw new Error('WLED 错误 ' + result.error);
      return result;
    } finally { clearTimeout(timer); }
  }

  async function readDeviceProfile(force = false) {
    const host = deviceBase();
    if (!force && deviceProfile?.host === host) return deviceProfile;
    if (profilePromise) return profilePromise;
    profilePromise = (async () => {
      const [stateResult, configResult] = await Promise.allSettled([
        fetchDeviceJSON('/json/si'), fetchDeviceJSON('/json/cfg')
      ]);
      if (stateResult.status !== 'fulfilled' && configResult.status !== 'fulfilled') throw stateResult.reason;
      const info = stateResult.status === 'fulfilled' ? stateResult.value.info || {} : {};
      const gc = configResult.status === 'fulfilled' ? configResult.value.light?.gc : null;
      const live = configResult.status === 'fulfilled' ? configResult.value.if?.live : null;
      let gamma = Number(document.getElementById('colorGamma').value) || 2.8;
      if (gc) gamma = (gc.col === false || gc.col === 0) ? 1 : typeof gc.col === 'number' ? gc.col : Number(gc.val) || 2.8;
      gamma = Math.max(1, Math.min(4, gamma));
      const realtimeGammaKnown = gc?.col !== undefined && live?.['no-gc'] !== undefined;
      const realtimeGammaEnabled = realtimeGammaKnown && !live['no-gc'] && gc.col !== false && gc.col !== 0 && gamma !== 1;
      const profile = { host, gamma, realtimeGammaKnown, realtimeGammaEnabled, matrix:info.leds?.matrix, count:info.leds?.count, arch:info.arch, version:info.ver, maxMessage:info.arch === 'esp8266' ? 480 : 1200 };
      if (deviceBase() !== host) throw new Error('设备地址已改变，请重新开始');
      deviceProfile = profile;
      document.getElementById('colorGamma').value = gamma.toFixed(2);
      document.getElementById('deviceInfo').textContent = (info.release || info.arch || 'WLED') + ' · ' + (info.ver || '') + (profile.matrix ? ' · 设备 ' + profile.matrix.w + ' × ' + profile.matrix.h : '') + ' · Gamma ' + gamma;
      if (!gc) logLine(document.documentElement.lang === 'en' ? 'Device color configuration unavailable; USB Gamma compensation will be bypassed.' : '未读取到颜色配置，USB 将跳过 Gamma 补偿。');
      return profile;
    })();
    try { return await profilePromise; } finally { profilePromise = null; }
  }

  function resetFrameCache() {
    lastSentColors = null; lastFrameKey = ''; lastKeyframeAt = 0; preparedOutput = '';
  }

  function closeFrameSocket() {
    const socket = ws;
    ws = null; frameSocketPromise = null;
    if (wsPending) { const pending = wsPending; wsPending = null; clearTimeout(pending.timer); pending.reject(new Error('WebSocket 已断开')); }
    if (socket) { try { socket.close(); } catch (_) {} }
    resetFrameCache();
  }

  async function openFrameSocket() {
    const url = getWsUrl();
    if (ws?.readyState === WebSocket.OPEN && ws.url === url) return;
    if (frameSocketPromise) return frameSocketPromise;
    if (ws) closeFrameSocket();
    frameSocketPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      ws = socket;
      let welcomed = false;
      const timer = setTimeout(() => { reject(new Error('WebSocket 连接超时')); socket.close(); }, 2500);
      socket.onmessage = (event) => {
        if (ws !== socket || typeof event.data !== 'string') return;
        if (event.data === 'pong') {
          if (wsPending) { const p = wsPending; wsPending = null; clearTimeout(p.timer); p.resolve(); }
          return;
        }
        let data;
        try { data = JSON.parse(event.data); } catch (_) { return; }
        if (!welcomed && (data.state || data.info)) {
          welcomed = true; clearTimeout(timer); resolve();
        }
        if (data.error && wsPending) {
          const p = wsPending; wsPending = null; clearTimeout(p.timer);
          p.reject(new Error('WLED WebSocket 错误 ' + data.error));
          socket.close();
        }
      };
      socket.onerror = () => { clearTimeout(timer); reject(new Error('WebSocket 无法连接')); };
      socket.onclose = () => {
        clearTimeout(timer);
        if (!welcomed) reject(new Error('WebSocket 连接已关闭'));
        if (ws === socket) {
          ws = null; frameSocketPromise = null; resetFrameCache();
          if (wsPending) { const p = wsPending; wsPending = null; clearTimeout(p.timer); p.reject(new Error('WebSocket 连接中断')); }
        }
      };
    });
    try { await frameSocketPromise; } finally { frameSocketPromise = null; }
  }

  async function sendSocketCommand(payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket 未连接');
    if (wsPending) throw new Error('上一条设备命令尚未完成');
    if (ws.bufferedAmount > 4096) throw new Error('设备接收缓慢，已停止积压');
    const socket = ws;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (wsPending?.timer !== timer) return;
        wsPending = null; reject(new Error('WLED 响应超时')); socket.close();
      }, 2500);
      wsPending = {resolve, reject, timer};
      try {
        socket.send(JSON.stringify(payload));
        // A pong is a barrier for the preceding JSON message, not an unrelated state broadcast.
        socket.send('p');
      } catch (error) { clearTimeout(timer); wsPending = null; reject(error); }
    });
  }

  async function ensureIpTransport() {
    if (isDdpMode()) {
      if (!bridgeToken) throw new Error('请双击 Start-Pixel-DDP.cmd 打开本地 DDP 高速入口');
      await readDeviceProfile(); ipTransport='ddp'; return;
    }
    await readDeviceProfile();
    const mode = ui.controlMode.value;
    if (mode === 'http') { ipTransport = 'http'; return; }
    if (mode === 'auto' && ipTransport === 'http-fallback') return;
    try { await openFrameSocket(); ipTransport = 'ws'; }
    catch (error) {
      if (mode !== 'auto') throw error;
      closeFrameSocket(); ipTransport = 'http-fallback';
      logLine('长连接不可用，已回退 HTTP：' + error.message);
    }
  }

  function compensateColors(frame) {
    const match = document.getElementById('colorMode').value === 'match';
    const gamma = match ? Math.max(1, Math.min(4, Number(document.getElementById('colorGamma').value) || 2.8)) : 1;
    const lut = Array.from(window.PixelStudioFramePipeline.outputLut(255,1/gamma),value=>value.toString(16).padStart(2,'0').toUpperCase());
    const colors = [];
    for (let i = 0; i < frame.length; i += 3) colors.push(lut[frame[i]] + lut[frame[i + 1]] + lut[frame[i + 2]]);
    return colors;
  }

  function encodePixelPackets(colors, previous, limit) {
    const packets = [];
    let values = [], cursor = 0;
    const wrap = list => ({seg:{id:0,i:list}});
    const flush = () => { if (values.length) packets.push(wrap(values)); values = []; cursor = 0; };
    for (let start = 0; start < colors.length;) {
      if (previous && previous[start] === colors[start]) { start++; continue; }
      let end = start + 1;
      while (end < colors.length && colors[end] === colors[start]) end++;
      const unit = () => end - start > 1 ? [start, end, colors[start]] : start === cursor ? [colors[start]] : [start, colors[start]];
      let next = unit();
      if (values.length && JSON.stringify(wrap(values.concat(next))).length > limit) { flush(); next = unit(); }
      values.push(...next); cursor = end; start = end;
    }
    flush();
    return packets;
  }

  function showStreamStats(sent, bytes, ms) {
    const now = performance.now();
    statsWindow.frames += sent ? 1 : 0; statsWindow.bytes += bytes;
    if (sent) statsWindow.ms = ms;
    if (now - statsWindow.at < 700) return;
    const seconds = (now - statsWindow.at) / 1000;
    const name = ui.controlMode.value === 'serial' ? 'Adalight' : 'DDP';
    document.getElementById('streamStats').textContent = name + ' · ' + (statsWindow.frames / seconds).toFixed(1) + ' / ' + ui.fps.value + ' FPS | ' + (statsWindow.bytes * 8 / seconds / 1000).toFixed(1) + ' kbps';
    statsWindow = {at:now, frames:0, bytes:0, ms:statsWindow.ms};
  }

  async function sendFrameWledJson(frame, options = {}) {
    if(ui.controlMode.value==='serial' && ui.protocol.value==='adalight')return sendFrameAdalight(frame);
    if (isDdpMode()) return sendFrameDdp(frame);
    const generation = playback.playbackGeneration;
    const started = performance.now();
    if (ui.controlMode.value === 'serial') {
      await writeLine(JSON.stringify({on:true,bri:getFrameConfig().d,seg:{id:0,i:compensateColors(frame)}}) + '\n');
      return;
    }
    await ensureIpTransport();
    if (generation !== playback.playbackGeneration) return;
    const {w,h,d} = getFrameConfig();
    const matrix = deviceProfile?.matrix;
    if (matrix && (w !== matrix.w || h !== matrix.h)) throw new Error('设备为 ' + matrix.w + '×' + matrix.h + '，请点击“读取设备尺寸”后再发送');
    const outputKey = deviceBase() + '|' + ipTransport + '|' + d;
    const dispatch = payload => isWsMode() ? sendSocketCommand(payload) : sendFrameHttp(payload, {skipResponseRead:true});
    if (preparedOutput !== outputKey) {
      await dispatch({on:d > 0,bri:d,tt:0,seg:{id:0,on:true,bri:255}});
      if (generation !== playback.playbackGeneration) return;
      preparedOutput = outputKey; lastSentColors = null;
    }
    const colors = compensateColors(frame);
    const frameKey = outputKey + '|' + w + ',' + h + '|' + ui.mapping.value + '|' + document.getElementById('colorMode').value + '|' + document.getElementById('colorGamma').value;
    const forceFull = frameKey !== lastFrameKey || performance.now() - lastKeyframeAt > 2000;
    const packets = encodePixelPackets(colors, forceFull ? null : lastSentColors, isWsMode() ? (deviceProfile?.maxMessage || 1200) : 6000);
    let bytes = 0;
    for (const payload of packets) {
      if (generation !== playback.playbackGeneration) return;
      await dispatch(payload); bytes += JSON.stringify(payload).length;
    }
    if (generation !== playback.playbackGeneration) return;
    lastSentColors = colors; lastFrameKey = frameKey;
    if (forceFull) lastKeyframeAt = performance.now();
    showStreamStats(packets.length > 0, bytes, performance.now() - started);
  }

  async function sendFrameHttp(payload, options = {}) {
    let path = (ui.httpPath.value || '/json/state').trim();
    if (!path.startsWith('/')) path = '/' + path;
    const result = await fetchDeviceJSON(path, payload);
    if (!options.skipResponseRead) logLine('HTTP 回包: ' + JSON.stringify(result));
  }

  async function sendFrameWledColorCompat(color) {
    await sendFrameWledJson(buildSolidFrame(color));
  }

  async function sendFrameRaw(frame) {
    // 自定义协议：按行传输十六进制分包，方便你按 ESP32 侧需求快速对接
    const { w, h } = getFrameConfig();
    const chunkBytes = 64;
    await writeLine(`@WLEDRAW ${w} ${h} ${frame.length} ${chunkBytes}\n`);
    let index = 0;
    let chunkId = 0;
    while (index < frame.length) {
      const next = Math.min(index + chunkBytes, frame.length);
      const chunk = frame.slice(index, next);
      const hex = bytesToHex(chunk);
      await writeLine(`@CHUNK ${chunkId} ${chunk.length} ${hex}\n`);
      index = next;
      chunkId++;
    }
    await writeLine(`@END ${playback.currentFrame}\n`);
  }

  async function connect(options = {}) {
    if (selectingSerial) return;
    serialResetSession();
    if (ui.controlMode.value !== 'serial') {
      try { await ensureIpTransport(); setStatus(isDdpMode() ? 'DDP 服务就绪，点击开始发送进入实时模式' : isWsMode() ? 'WLED 长连接就绪' : 'WLED HTTP 就绪', 'ok'); }
      catch (error) { setStatus('连接失败：' + error.message, 'err'); }
      return;
    }

    if (!('serial' in navigator)) {
      setStatus('当前浏览器不支持 Web Serial', 'err');
      return;
    }

    selectingSerial = true;
    let selected = null, opened = false;
    try {
      await window.pixelStudioDesktop?.prepareSerialSelection(options.restore===true);
      selected = await navigator.serial.requestPort();
      // Cancellation leaves the existing connection intact. Release it only
      // once a replacement has actually been selected.
      if (port || writer || reader) await disconnect();
      port = selected;
      const baudRate = withNum(ui.baudRate.value, 115200);
      await port.open({ baudRate });
      opened = true;
      writer = port.writable.getWriter();
      serialLab.activeBaud=Number(ui.baudRate.value)||115200;
      const serialUsbInfo=port.getInfo();
      serialLab.nativeUsb=serialUsbInfo.usbVendorId===0x303a && serialUsbInfo.usbProductId===0x1001;
      serialNote((serialLab.nativeUsb?"已连接 Espressif 原生 USB。":"串口已打开。")+" 请点击串口诊断；打开端口不等于 WLED 已响应。");
      if (port.readable) {
        reader = port.readable.getReader();
        serialLab.readTask=readLoop();
      }
      setStatus(`已连接（baud ${baudRate}）`, 'ok');
      logLine('串口已连接');
      await window.pixelStudioDesktop?.confirmSerialConnection();
    } catch (err) {
      if (port === selected) {
        if (opened) await disconnect();
        else port = null;
      }
      if (err.name === 'NotFoundError') {
        setStatus('已取消选择串口');
        return;
      }
      setStatus(`连接失败：${err.message}`, 'err');
      logLine(`连接失败: ${err.message}`);
    } finally { selectingSerial = false; }
  }

  async function disconnect() {
    if(ui.controlMode.value==='serial' && playback.running)stopLoop('串口断开');
    serialResetSession();
    stopBtn(false);
    closeFrameSocket();
    ipTransport = 'http';
    if (ws) {
      try { ws.close(); } catch (_) {}
      ws = null;
      logLine('WebSocket 已断开');
    }
    if (reader) {
      try { await reader.cancel();
        if(serialLab.readTask)await serialLab.readTask; } catch (_) {}
      try { reader.releaseLock(); } catch (_) {}
      reader = null;
    }
    if (writer) {
      try { writer.releaseLock(); } catch (_) {}
      writer = null;
    }
    if (port) {
      try { await port.close(); } catch (_) {}
      port = null;
    }
    setStatus('已断开');
    logLine('串口已断开');
  }

  async function readLoop() {
    const sourceReader=reader,sourceWriter=writer;
    const decoder=new TextDecoder();
    let buffer='';
    try {
      while(sourceReader){
        const {value,done}=await sourceReader.read();
        if(done)break;
        if(!value)continue;
        serialLab.bytes+=value.length;
        buffer+=decoder.decode(value,{stream:true});
        const lines=buffer.split(/\r?\n/);
        buffer=lines.pop().slice(-16384);
        for(const line of lines)serialAcceptLine(line,sourceWriter);
      }
    } catch(error) {
      if(writer===sourceWriter)serialNote('串口读取中断：'+error.message,'error');
    } finally {
      if(serialLab.pending && serialLab.pending.writer===sourceWriter)serialLab.pending.finish(null);
      if(serialLab.confirmedWriter===sourceWriter)serialLab.confirmedWriter=null;
      try{sourceReader.releaseLock();}catch(_){}
    }
  }

  async function testHttp() {
    try {
      await readDeviceProfile(true);
      if (ui.controlMode.value !== 'serial') await ensureIpTransport();
      setStatus('设备可达，颜色配置已读取' + (isWsMode() ? '，长连接就绪' : ''), 'ok');
    } catch (error) { setStatus('连接测试失败：' + error.message, 'err'); }
  }

  async function testSerial() {
    if(ui.controlMode.value!=='serial') {serialNote('先把控制方式切换到串口。IP / DDP 无需此诊断。');return;}
    if(!writer || !reader){serialNote('请先连接 ESP32 的串口。');return;}
    if(playback.running || serialLab.busy || serialLab.heldFrame){serialNote('请先停止播放，再运行只读诊断，避免查询和像素数据混在一起。');return;}
    if(serialLab.pending)return;
    const sourceWriter=writer,startBytes=serialLab.bytes;
    serialLab.confirmedWriter=null;
    const button=document.getElementById('testSerialBtn');
    if(button)button.disabled=true;
    serialNote('只读诊断中：先查询 WLED 版本，必要时再查询 JSON 状态。不会改灯光、波特率或固件。');
    try {
      let version=await serialQuery('version','v');
      if(!version && writer===sourceWriter)version=await serialQuery('json',JSON.stringify({v:true})+'\n');
      if(writer!==sourceWriter)return;
      if(version){
        serialLab.confirmedWriter=sourceWriter;
        const config=getFrameConfig();
        serialNote('已收到 '+version+' 回包，串口命令通道可用。'+(serialLab.nativeUsb?'检测到 Espressif 原生 USB CDC；吞吐仍需实测。':'UART 安全帧率上限约 '+serialUartFps(config.w*config.h*3)+' FPS。')+' 选择 Adalight 后可开始发送；回包不代表像素输出已验证。','ok');
      }else{
        const received=serialLab.bytes-startBytes;
        serialNote((received?'收到 '+received+' 字节，但不是有效 WLED 回包。':'查询超时，没有收到 WLED 回包。')+' 尚不能确认串口控制可用。请核对端口、固件的 USB CDC / UART 编译选项及串口引脚占用；提高波特率不能解决接口未启用。','error');
      }
    }catch(error){serialNote('诊断失败：'+error.message,'error');}
    finally{if(button)button.disabled=false;}
  }

  function buildSolidFrame(color) {
    const { w, h } = getFrameConfig();
    const frame = new Uint8Array(w * h * 3);
    for (let i = 0; i < frame.length; i += 3) {
      frame[i] = color[0];
      frame[i + 1] = color[1];
      frame[i + 2] = color[2];
    }
    return frame;
  }

  function isDdpMode() { return ui.controlMode.value === 'ddp'; }

  function ddpTargetFps() { return Math.max(1,Math.min(60,Math.round(Number(ui.fps.value)||60))); }

  async function bridgeRequest(route, options = {}) {
    if (!bridgeToken) throw new Error('DDP 需要本地服务：请双击 Start-Pixel-DDP.cmd，从 127.0.0.1:8766 打开');
    if(desktopDdp){
      if(options.controller?.signal.aborted)throw new Error('DDP request cancelled');
      const result=await desktopDdp(route,{
        ...(options.json===undefined?{}:{json:options.json}),
        ...(options.binary===undefined?{}:{binary:Array.from(options.binary)}),timeout:options.timeout||6000
      });
      if(!result.ok)throw new Error(result.error||'DDP service unavailable');
      const response=new Response(result.status===204?null:result.body,{status:result.status});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'DDP service error '+response.status);}
      return response;
    }
    const controller = options.controller || new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || 6000);
    try {
      const response = await fetch(route, {
        method:options.json === undefined && options.binary === undefined ? 'GET' : 'POST',
        headers:{'X-Pixel-Token':bridgeToken,'X-Pixel-Client':webClientId,...(options.json === undefined ? {} : {'Content-Type':'application/json'})},
        ...(options.json === undefined ? options.binary === undefined ? {} : {body:options.binary} : {body:JSON.stringify(options.json)}),
        signal:controller.signal,cache:'no-store',keepalive:!!options.keepalive
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '本地 DDP 服务错误 ' + response.status);
      }
      return response;
    } finally { clearTimeout(timer); }
  }

  function stopDdpPlayback() {
    ddp.epoch++;
    ddp.controller?.abort();ddp.controller=null;
    const old = ddp.session;ddp.session=null;
    if (old) ddp.releasing = ddp.releasing.catch(() => {}).then(async () => {
      try { await bridgeRequest('/api/stop',{json:{id:old.id},keepalive:true}); }
      catch (error) { logLine('DDP 停止通知：'+error.message+'；设备将按实时超时设置退出'); }
    });
  }

  async function ensureDdpSession() {
    if (!bridgeToken) throw new Error('请双击 Start-Pixel-DDP.cmd，从本地高速入口打开 DDP 模式');
    const {w,h,d}=getFrameConfig();
    const config={host:deviceBase(),w,h,brightness:d,mode:getAnimationMode(),thermal:window.pixelStudioTemperatureSettings||{},speed:playback.animationSpeed,fps:ddpTargetFps(),mapping:ui.mapping.value,clockFont:document.getElementById('clockFont').value,clockPalette:getAnimationMode()==='clock'?document.getElementById('clockPalette').value:(window.pixelStudioAnimationPaletteKey||'original'),match:document.getElementById('colorMode').value==='match',gamma:Number(document.getElementById('colorGamma').value)||2.8};
    const compatibilityKey=[config.host,w,h,config.mode==='file'?'file':'generated'].join('|');
    const key=[compatibilityKey,d,config.mode,playback.animationSpeed,config.fps,config.mapping,config.clockFont,config.clockPalette,config.match,config.gamma,JSON.stringify(config.thermal)].join('|');
    if (ddp.session?.key === key) return ddp.session;
    if (ddp.pending) { await ddp.pending; return ensureDdpSession(); }
    if (ddp.session?.autonomous && ddp.session.compatibilityKey === compatibilityKey) {
      const clock={animationTime:playback.animationElapsed+(performance.now()-playback.animationLastTime)/1000*playback.animationSpeed,animationWallTime:Date.now()};
      await (await bridgeRequest('/api/update',{json:{id:ddp.session.id,...config,...clock},timeout:6500})).json();
      ddp.session.key=key;
      ddp.session.targetFps=config.fps;
      document.getElementById('streamStats').textContent='DDP 后台 · 已无缝切换至 '+ui.animationMode.selectedOptions[0].textContent;
      return ddp.session;
    }
    if (ddp.session) stopDdpPlayback();
    const epoch=ddp.epoch;
    ddp.pending=(async () => {
      await ddp.releasing;
      if (epoch!==ddp.epoch) return null;
      const clock={animationTime:playback.animationElapsed+(performance.now()-playback.animationLastTime)/1000*playback.animationSpeed,animationWallTime:Date.now()};
      const result=await (await bridgeRequest('/api/start',{json:{...config,...clock},timeout:20000})).json();
      if (epoch!==ddp.epoch) {
        await bridgeRequest('/api/stop',{json:{id:result.id}});
        return null;
      }
      ddp.session={...result,key,compatibilityKey,statsAt:-Infinity};
      ipTransport='ddp';
      logLine((result.autonomous?'DDP 后台动画已启动，目标 '+result.targetFps+' FPS，切换标签页不影响发送':'DDP 图片/视频由网页供帧，请保持页面在前台')+'；每帧 '+result.packetCount+' 个 UDP 包；'+(result.gammaCompensated?'按设备实时 Gamma 补偿':'直接发送原始 RGB'));
      return ddp.session;
    })();
    try { return await ddp.pending; } finally { ddp.pending=null; }
  }

  async function sendFrameDdp(frame) {
    const epoch=ddp.epoch;
    const session=await ensureDdpSession();
    if (!session || session!==ddp.session || epoch!==ddp.epoch) return;
    if (session.autonomous) { await updateBackgroundStats(session); return; }
    const started=performance.now();
    const controller=new AbortController();ddp.controller=controller;
    try {
      const response=await bridgeRequest('/api/frame?id='+session.id,{binary:frame,controller,timeout:1500});
      if (session!==ddp.session) return;
      const sent=response.headers.get('X-Pixel-Dropped')!=='1';
      showStreamStats(sent,sent?frame.length+session.packetCount*10:0,performance.now()-started);
    } finally { if(ddp.controller===controller)ddp.controller=null; }
  }

  async function updateBackgroundStats(session) {
    const now=performance.now();
    if(now-session.statsAt<750)return;
    session.statsAt=now;
    const stats=await (await bridgeRequest('/api/stats?id='+session.id,{timeout:2500})).json();
    if(ddp.session!==session)return;
    const fps=Number(stats.fps)||0,target=Number(stats.targetFps)||60;
    document.getElementById('streamStats').textContent='DDP 后台 · 目标 '+target+' FPS · 实际发送 '+fps.toFixed(1)+
      ' 帧/s · '+(Number(stats.frameMs)||0).toFixed(1)+' ms/帧 · '+(Number(stats.kbps)||0).toFixed(1)+
      ' KB/s · 调度跳帧 '+(Number(stats.missed)||0)+(stats.frames?'':' · 正在采样');
  }
 return {isHttpMode,isWsMode,getHttpTarget,getWsUrl,wsSendPayload,serialNote,serialResetSession,serialAcceptLine,serialQuery,sendFrameAdalight,serialHoldImage,serialUartFps,serialStopHold,bytesToHex,pixelToHex,frameToHexList,buildFramePairs,frameToRgbTriples,writeLine,deviceBase,fetchDeviceJSON,readDeviceProfile,resetFrameCache,closeFrameSocket,openFrameSocket,sendSocketCommand,ensureIpTransport,compensateColors,encodePixelPackets,showStreamStats,sendFrameWledJson,sendFrameHttp,sendFrameWledColorCompat,sendFrameRaw,connect,disconnect,readLoop,testHttp,testSerial,buildSolidFrame,isDdpMode,ddpTargetFps,bridgeRequest,stopDdpPlayback,ensureDdpSession,sendFrameDdp,updateBackgroundStats,state:{get port(){return port;},set port(value){port=value;},get writer(){return writer;},set writer(value){writer=value;},get reader(){return reader;},set reader(value){reader=value;},get ws(){return ws;},set ws(value){ws=value;},get ipTransport(){return ipTransport;},set ipTransport(value){ipTransport=value;},get deviceProfile(){return deviceProfile;},set deviceProfile(value){deviceProfile=value;},get statsWindow(){return statsWindow;},set statsWindow(value){statsWindow=value;},get serialLab(){return serialLab;},get bridgeToken(){return bridgeToken;}}};
});
