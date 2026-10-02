'use strict';
// Browser adapter with explicit dependencies; no sensor or Node transport ownership.
(function(root,factory){
 // Content time is continuous and independent of output start/stop sessions.
 factory.createTimeline=function(now,wallNow=Date.now){
  let elapsed=0,lastTime=now(),speed=1;
  const timeline={
   getTime(){const at=now();elapsed+=(at-lastTime)/1000*speed;lastTime=at;return elapsed;},
   setSpeed(value){timeline.getTime();speed=Number(value)||1;},
   synchronize(time,wallTime){
    if(!Number.isFinite(time)||time<0)return;
    elapsed=time+(Number.isFinite(wallTime)?Math.max(0,wallNow()-wallTime)/1000*speed:0);
    lastTime=now();
   },
   snapshot(){return {animationTime:timeline.getTime(),animationWallTime:wallNow()};}
  };
  return timeline;
 };
 // Coordinates existing adapters; does not own a serial port or transport.
 factory.createConnectionLifecycle=function(options){
  const {connection,connect,testSerial,serialStopHold,stopDdpPlayback,logLine}=options;
  let starting=false;
  return {
   get starting(){return starting;},
   async prepareSerial(restore,isCurrent){
    starting=true;
    try{
     if(!connection.writer)await connect({restore:restore===true});
     if(!isCurrent()||!connection.writer)return {ready:false};
     if(connection.serialLab.confirmedWriter!==connection.writer)await testSerial();
     if(!isCurrent())return {ready:false};
     if(connection.serialLab.confirmedWriter!==connection.writer)return {
      ready:false,error:'USB 已打开，但尚未收到 WLED 握手响应。请查看设置中的连接诊断，并确认串口、波特率和固件。'
     };
     return {ready:true};
    }finally{starting=false;}
   },
   resetStats(now){connection.statsWindow={at:now,frames:0,bytes:0,ms:0};},
   stopOutput(reason){
    serialStopHold();
    stopDdpPlayback();
    if(reason)logLine(reason);
   }
  };
 };
 // Startup policy reads platform state but neither opens devices nor updates UI.
 factory.createStartPolicy=function(options){
  const {ui,content,connection,isHttpMode,isWsMode,isDdpMode,getHttpTarget,frameBytesForCurrentConfig}=options;
  return {
   bridgeError(){
    return isDdpMode()&&!connection.bridgeToken
     ? 'DDP 需要本地服务：请启动 Start-Pixel-DDP.cmd 并从服务页面播放；USB 请在设置中选择 USB 输出。' : null;
   },
   targetError(){
    if(isHttpMode()){
     const target=getHttpTarget();
     if(!target.startsWith('http://')&&!target.startsWith('https://'))return 'HTTP 地址不合法';
    }else if(!isWsMode()&&!connection.writer)return '请先连接串口再发送';
    return null;
   },
   contentError(){return content.ready?null:'请先选择图片/视频文件';},
   frameError(){
    return frameBytesForCurrentConfig()>8192&&ui.protocol.value==='wled-json'&&isHttpMode()
     ? 'HTTP + JSON 单帧数据过大，先降分辨率再测试' : null;
   }
  };
 };
 // Presentation owns DOM writes; the scheduler reports lifecycle events.
 factory.createPresentation=function(options){
  const window=options.window||globalThis;
  const {ui,setStatus}=options;
  return {
   status:setStatus,
   started(){
    ui.progress.value=0;
    setStatus('正在发送','ok');
    window.document.getElementById('streamStats').textContent='0.0 / '+ui.fps.value+' FPS | 0.0 kbps';
   },
   frameSent(kind){ui.progress.value=kind==='image'?1:(ui.progress.value+0.02)%1;},
   imageCompleted(){setStatus('静态图片已发送完成','ok');ui.progress.value=1;},
   stopped(){setStatus('已停止');}
  };
 };
 // Pure rules shared by Web, Desktop and the OpenRGB Node adapter.
 factory.policy=Object.freeze({
  shuffleSeconds(value){return Math.max(3,Math.min(3600,Number(value)||20));},
  chooseNext(candidates,current,random=Math.random){
   const choices=[...new Set(candidates)].filter(mode=>typeof mode==='string'&&mode&&mode!==current);
   if(!choices.length)return null;
   return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];
  }
 });
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.PixelStudioBrowserPlayback={create:factory,policy:factory.policy,createPresentation:factory.createPresentation,createStartPolicy:factory.createStartPolicy,createConnectionLifecycle:factory.createConnectionLifecycle};
})(typeof globalThis!=='undefined'?globalThis:this,function createPlayback(options){
 const window=options.window||globalThis;
 const {performance,setTimeout,clearTimeout}=window;
 const {ui,content,connection,withNum,clampFpsForCurrentMode,minIntervalMs,sendFrameRaw,sendFrameWledJson,isHttpMode,resetFrameCache}=options;
 const presentation=options.presentation||createPlayback.createPresentation(options);
 const startPolicy=options.startPolicy||createPlayback.createStartPolicy(options);
 const connectionLifecycle=options.connectionLifecycle||createPlayback.createConnectionLifecycle(options);
 const setStatus=presentation.status;
 let running=false,stopFlag=false,rafId=null,currentFrame=0,playbackGeneration=0,frameInFlight=false;
 let animationElapsed=0,animationLastTime=performance.now(),animationSpeed=1;
  function getAnimationTime() {
    const now = performance.now();
    animationElapsed += (now - animationLastTime) / 1000 * animationSpeed;
    animationLastTime = now;
    return animationElapsed;
  }

  async function sendFrame() {
    const frame = content.readFrame();
    if (!frame) return false;
    if (ui.protocol.value === 'raw-bin') {
      if (isHttpMode()) {
        throw new Error('HTTP 模式不支持 raw-bin，请切回串口 + raw-bin');
      }
      await sendFrameRaw(frame);
    } else {
      await sendFrameWledJson(frame,content.sendOptions);
    }
    currentFrame++;
    return true;
  }

  async function loopFrames(generation = playbackGeneration) {
    if (!running || stopFlag || generation !== playbackGeneration) return;
    if (frameInFlight) {
      rafId = setTimeout(() => loopFrames(generation), 25);
      return;
    }
    const startedAt = performance.now();
    const sourceKind = content.kind;
    frameInFlight = true;
    try {
      const ok = await sendFrame();
      if (ok && generation === playbackGeneration) {
        presentation.frameSent(sourceKind);
      }
    } catch (e) {
      if (generation === playbackGeneration) {
        stopLoop(`发送失败：${e.message}`);
        setStatus(`发送失败：${e.message}`, 'err');
      }
      return;
    } finally {
      frameInFlight = false;
    }

    if (!running || stopFlag || generation !== playbackGeneration) return;
    const baseDelay = 1000 / Math.max(1, withNum(ui.fps.value, 12));
    const safeDelay = Math.max(baseDelay, minIntervalMs());
    const effectiveDelay = Math.max(safeDelay, 1000 / clampFpsForCurrentMode(ui.protocol.value === 'raw-bin' && !isHttpMode(), withNum(ui.fps.value, 12)));
    if (content.kind === 'image' && !window.pixelStudioDesktop?.edition) {
      running = false;
      stopBtn(false);
      presentation.imageCompleted();
      return;
    }
    rafId = setTimeout(() => loopFrames(generation), Math.max(0, effectiveDelay - (performance.now() - startedAt)));
  }

  async function startLoop(options = {}) {
    if (connectionLifecycle.starting) return;
    if (running) return;
    const startGeneration = playbackGeneration;
    const bridgeError=startPolicy.bridgeError();
    if (bridgeError) {
      setStatus(bridgeError, 'err');
      return;
    }
    if (ui.controlMode.value === 'serial') {
      const result=await connectionLifecycle.prepareSerial(options.restore,()=>startGeneration===playbackGeneration);
      if(!result.ready){
        if(result.error)setStatus(result.error,'err');
        return;
      }
    }
    const targetError=startPolicy.targetError();
    if (targetError) {
      setStatus(targetError, 'err');
      return;
    }
    const contentError=startPolicy.contentError();
    if (contentError) {
      setStatus(contentError, 'err');
      return;
    }
    content.prepare();
    const frameError=startPolicy.frameError();
    if (frameError) {
      setStatus(frameError, 'err');
      return;
    }
    resetFrameCache();
    connectionLifecycle.resetStats(performance.now());
    playbackGeneration++;
    running = true;
    stopFlag = false;
    currentFrame = 0;
    presentation.started();
    loopFrames();
  }

  function stopBtn(setMsg = true) {
    playbackGeneration++;
    running = false;
    stopFlag = true;
    if (rafId) clearTimeout(rafId);
    rafId = null;
    if (setMsg) presentation.stopped();
  }

  function stopLoop(reason) {
    connectionLifecycle.stopOutput(reason);
    stopBtn(true);
  }
 return {getAnimationTime,sendFrame,loopFrames,startLoop,stopBtn,stopLoop,state:{get running(){return running;},set running(value){running=value;},get stopFlag(){return stopFlag;},set stopFlag(value){stopFlag=value;},get rafId(){return rafId;},set rafId(value){rafId=value;},get currentFrame(){return currentFrame;},set currentFrame(value){currentFrame=value;},get animationElapsed(){return animationElapsed;},set animationElapsed(value){animationElapsed=value;},get animationLastTime(){return animationLastTime;},set animationLastTime(value){animationLastTime=value;},get animationSpeed(){return animationSpeed;},set animationSpeed(value){animationSpeed=value;},get playbackGeneration(){return playbackGeneration;},set playbackGeneration(value){playbackGeneration=value;},get frameInFlight(){return frameInFlight;},set frameInFlight(value){frameInFlight=value;}}};
});
