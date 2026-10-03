'use strict';
// Browser adapter with explicit dependencies; no sensor or Node transport ownership.
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.PixelStudioBrowserOutput={create:factory};
})(typeof globalThis!=='undefined'?globalThis:this,function(options){
 const window=options.window||globalThis;
 const {document,navigator,performance,setTimeout,clearTimeout,setInterval,clearInterval,fetch,URL,AbortController,Response,TextEncoder,TextDecoder,crypto}=window;
 const {ui,playback,animationCatalog,getFrameConfig,getAnimationMode,withNum,setStatus,logLine,stopLoop,stopBtn}=options;
 const encoder=new TextEncoder();
 let port=null,writer=null,reader=null,selectingSerial=false,serialOutputGeneration=0;
  let serialConnectionGeneration=0,serialClosing=Promise.resolve();
  ui.controlMode.addEventListener('change',()=>{serialConnectionGeneration++;});
 let serialColorProfile=null,serialColorLut=null,serialColorUiKey='';
  const serialLab = { confirmedWriter:null, pending:null, readTask:null, bytes:0, nativeUsb:false, activeBaud:115200, frames:0, sampleAt:0, busy:false, heldFrame:null, holdTimer:null, lastWrite:0 };

  let serialNotice = null;
  window.addEventListener('pixel-studio-language-change', () => {
    if (serialNotice) serialNote(serialNotice.message, serialNotice.kind);
    else serialNote('尚未诊断。先确认固件命令通道，再判断像素输出。');
  });

  let deviceProfile = null;
  let profilePromise = null;
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
    runtimeNotice.innerHTML = '当前为文件兼容模式，可使用本地预览或 USB 输出；DDP 需要本地服务。要使用最新控制，请打开 <a href="http://127.0.0.1:8766/" target="_blank" rel="noopener">本地高速 DDP 服务</a>。';
    runtimeNotice.classList.add('err');
  }
  const ddp = {session:null,pending:null,epoch:0,releasing:Promise.resolve(),controller:null};

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
    serialStopHold();
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
    const generation=serialOutputGeneration;
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
      if (generation !== serialOutputGeneration || writer !== sourceWriter || serialLab.confirmedWriter !== sourceWriter) return;
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
      // A completed OS write cannot be recalled, but it must not resurrect
      // output statistics or the image keepalive after stop/disconnect.
      if (generation !== serialOutputGeneration || writer !== sourceWriter || serialLab.confirmedWriter !== sourceWriter) return;
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
    serialOutputGeneration++;
    serialLab.heldFrame=null;
    clearTimeout(serialLab.holdTimer);
  }

  function deviceBase() {
    const raw = (ui.wledHost.value || '').trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : 'http://' + raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('请输入有效的 WLED 地址');
    return url.origin;
  }

  async function fetchDeviceJSON(path) {
    if (bridgeToken) return (await bridgeRequest('/api/device?host='+encodeURIComponent(deviceBase())+'&path='+encodeURIComponent(path))).json();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(deviceBase() + path, {
        method:'GET',
        cache:'no-store',
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
      const profile = { host, gamma, realtimeGammaKnown, realtimeGammaEnabled, matrix:info.leds?.matrix, count:info.leds?.count, arch:info.arch, version:info.ver };
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
    serialColorLut = null;
  }

  async function prepareDdp() {
    if (!isDdpMode()) throw new Error('请选择 USB / Adalight 或 DDP 输出');
    if (!bridgeToken) throw new Error('请双击 Start-Pixel-DDP.cmd 打开本地 DDP 高速入口');
    await readDeviceProfile();
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

  async function sendOutputFrame(frame) {
    if (ui.controlMode.value === 'serial') return sendFrameAdalight(frame);
    if (isDdpMode()) return sendFrameDdp(frame);
    throw new Error('请选择 USB / Adalight 或 DDP 输出');
  }

  // Output readiness belongs to the adapter, not the content or scheduler.
  async function prepareOutput(options = {}, isCurrent = () => true) {
    if(!isCurrent())return {ready:false};
    if(isDdpMode()){
      if(!bridgeToken)return {ready:false,error:'DDP 需要本地服务：请启动 Start-Pixel-DDP.cmd 并从服务页面播放；USB 请在设置中选择 USB 输出。'};
      try{deviceBase();}catch(_){return {ready:false,error:'请输入有效的 WLED 地址'};}
      return {ready:true};
    }
    if(ui.controlMode.value!=='serial')return {ready:false,error:'请选择 USB / Adalight 或 DDP 输出'};
    if(!writer)await connect({restore:options.restore===true});
    if(!isCurrent()||!writer)return {ready:false};
    if(serialLab.confirmedWriter!==writer)await testSerial();
    if(!isCurrent())return {ready:false};
    if(!writer||serialLab.confirmedWriter!==writer)return {
      ready:false,error:'USB 已打开，但尚未收到 WLED 握手响应。请查看设置中的连接诊断，并确认串口、波特率和固件。'
    };
    return {ready:true};
  }

  function resetStats(now){statsWindow={at:now,frames:0,bytes:0,ms:0};}
  function stopOutput(reason){
    serialStopHold();stopDdpPlayback();
    if(reason)logLine(reason);
  }

  function stopSerialOutput() {
    // Closing an idle serial connection must not stop a different output route.
    if(ui.controlMode.value==='serial'){
      if(playback.running)stopLoop('串口断开');
      else stopBtn(false);
    }
  }

  function releaseSerialConnection() {
    serialResetSession();
    // Detach synchronously, then release only this connection's resources.
    // A later connect waits for the queue instead of sharing mutable globals.
    const oldReader=reader,oldWriter=writer,oldPort=port,readTask=serialLab.readTask;
    reader=null;writer=null;port=null;serialLab.readTask=null;
    serialClosing=serialClosing.catch(()=>{}).then(async()=>{
      if(oldReader){
        try{await oldReader.cancel();if(readTask)await readTask;}catch(_){}
        try{oldReader.releaseLock();}catch(_){}
      }
      if(oldWriter){try{oldWriter.releaseLock();}catch(_){}}
      if(oldPort){try{await oldPort.close();}catch(_){}}
    });
    return serialClosing;
  }

  async function connect(options = {}) {
    if (selectingSerial) return;
    if (ui.controlMode.value !== 'serial') {
      try { await prepareDdp(); setStatus('DDP 服务就绪，点击开始发送进入实时模式', 'ok'); }
      catch (error) { setStatus('连接失败：' + error.message, 'err'); }
      return;
    }

    if (!('serial' in navigator)) {
      setStatus('当前浏览器不支持 Web Serial', 'err');
      return;
    }

    selectingSerial = true;
    const generation=++serialConnectionGeneration;
    const current=()=>generation===serialConnectionGeneration&&ui.controlMode.value==='serial';
    let selected=null,opened=false,committed=false,selectedWriter=null,selectedReader=null;
    try {
      await window.pixelStudioDesktop?.prepareSerialSelection(options.restore===true);
      if(!current())return;
      selected = await navigator.serial.requestPort();
      if(!current())return;
      // Cancelling the chooser leaves the current connection untouched.
      // Replacing it releases resources without cancelling this same attempt.
      if(port||writer||reader){stopSerialOutput();await releaseSerialConnection();}
      else await serialClosing;
      if(!current())return;
      serialResetSession();
      const baudRate = withNum(ui.baudRate.value, 115200);
      await selected.open({ baudRate });
      opened=true;
      if(!current())return;
      selectedWriter=selected.writable.getWriter();
      const serialUsbInfo=selected.getInfo();
      if(selected.readable)selectedReader=selected.readable.getReader();
      // Publish only a fully opened, still-current connection.
      port=selected;writer=selectedWriter;reader=selectedReader;committed=true;
      serialLab.activeBaud=baudRate;
      serialLab.nativeUsb=serialUsbInfo.usbVendorId===0x303a && serialUsbInfo.usbProductId===0x1001;
      serialNote((serialLab.nativeUsb?"已连接 Espressif 原生 USB。":"串口已打开。")+" 请点击串口诊断；打开端口不等于 WLED 已响应。");
      if(reader)serialLab.readTask=readLoop();
      setStatus(`已连接（baud ${baudRate}）`, 'ok');
      logLine('串口已连接');
      await window.pixelStudioDesktop?.confirmSerialConnection();
    } catch (err) {
      if(committed&&port===selected){stopSerialOutput();await releaseSerialConnection();}
      if(!current())return;
      if (err.name === 'NotFoundError') {
        setStatus('已取消选择串口');
        return;
      }
      setStatus(`连接失败：${err.message}`, 'err');
      logLine(`连接失败: ${err.message}`);
    } finally {
      // A cancelled open may complete after disconnect has already returned.
      // Its local candidate was never published, but must still be closed.
      if(!committed){
        if(selectedReader){
          try{await selectedReader.cancel();}catch(_){}
          try{selectedReader.releaseLock();}catch(_){}
        }
        if(selectedWriter){try{selectedWriter.releaseLock();}catch(_){}}
        if(opened){try{await selected.close();}catch(_){}}
      }
      selectingSerial=false;
    }
  }

  async function disconnect() {
    const generation=++serialConnectionGeneration;
    stopSerialOutput();
    await releaseSerialConnection();
    if(generation!==serialConnectionGeneration)return;
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
 return {prepareOutput,resetStats,stopOutput,serialNote,serialUartFps,serialStopHold,sendFrameAdalight,deviceBase,readDeviceProfile,resetFrameCache,showStreamStats,sendOutputFrame,connect,disconnect,testSerial,isDdpMode,ddpTargetFps,bridgeRequest,stopDdpPlayback,ensureDdpSession,sendFrameDdp,updateBackgroundStats,state:{get port(){return port;},set port(value){port=value;},get writer(){return writer;},set writer(value){writer=value;},get reader(){return reader;},set reader(value){reader=value;},get deviceProfile(){return deviceProfile;},set deviceProfile(value){deviceProfile=value;},get statsWindow(){return statsWindow;},set statsWindow(value){statsWindow=value;},get serialLab(){return serialLab;},get bridgeToken(){return bridgeToken;}}};
});
