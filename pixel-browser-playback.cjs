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
 // Presentation owns DOM writes; the scheduler reports lifecycle events.
 factory.createPresentation=function(options){
  const {setStatus}=options;
  return {
   status:setStatus,
   // Transport statistics, including the initial placeholder, belong to output.
   started(){setStatus('正在发送','ok');},
   imageCompleted(){setStatus('静态图片已发送完成','ok');},
   stopped(){setStatus('已停止');}
  };
 };
 // Pure rules shared by Web, Desktop and the OpenRGB Node adapter.
 factory.policy=Object.freeze({
  shuffleSeconds(value){return Math.max(3,Math.min(99,Math.round(Number(value)||20)));},
  playMode(value,enabled=false){return ['fixed','sequential','random'].includes(value)?value:(enabled?'random':'fixed');},
  chooseSequential(candidates,current){
   const choices=[...new Set(candidates)].filter(value=>typeof value==='string'&&value);
   if(!choices.length)return null;
   const next=choices[(choices.indexOf(current)+1)%choices.length];
   return next===current?null:next;
  },
  chooseNext(candidates,current,random=Math.random){
   const choices=[...new Set(candidates)].filter(mode=>typeof mode==='string'&&mode&&mode!==current);
   if(!choices.length)return null;
   return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];
  }
 });
 if(typeof module==='object'&&module.exports)module.exports=factory;
  else root.PixelStudioBrowserPlayback={create:factory,policy:factory.policy,createPresentation:factory.createPresentation};
})(typeof globalThis!=='undefined'?globalThis:this,function createPlayback(options){
 const window=options.window||globalThis;
 const {performance,setTimeout,clearTimeout}=window;
 const {ui,content,outputSession,withNum,clampFpsForCurrentMode}=options;
 const presentation=options.presentation||createPlayback.createPresentation(options);
 const setStatus=presentation.status;
 let running=false,starting=false,rafId=null,playbackGeneration=0,frameInFlight=false;
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
    await outputSession.sendOutputFrame(frame);
    return true;
  }

  async function loopFrames(generation = playbackGeneration) {
    if (!running || generation !== playbackGeneration) return;
    if (frameInFlight) {
      rafId = setTimeout(() => loopFrames(generation), 25);
      return;
    }
    const startedAt = performance.now();
    frameInFlight = true;
    try {
      await sendFrame();
    } catch (e) {
      if (generation === playbackGeneration) {
        stopLoop(`发送失败：${e.message}`);
        setStatus(`发送失败：${e.message}`, 'err');
      }
      return;
    } finally {
      frameInFlight = false;
    }

    if (!running || generation !== playbackGeneration) return;
    const baseDelay = 1000 / Math.max(1, withNum(ui.fps.value, 12));
    const effectiveDelay = Math.max(baseDelay, 1000 / clampFpsForCurrentMode(withNum(ui.fps.value, 12)));
    if (content.kind === 'image' && !window.pixelStudioDesktop?.edition) {
      running = false;
      stopBtn(false);
      presentation.imageCompleted();
      return;
    }
    rafId = setTimeout(() => loopFrames(generation), Math.max(0, effectiveDelay - (performance.now() - startedAt)));
  }

  async function startLoop(options = {}) {
    if (starting || running) return;
    const startGeneration = playbackGeneration;
    if (!content.ready) {
      setStatus('请先选择图片/视频文件', 'err');
      return;
    }
    starting=true;
    try {
      // The adapter owns transport checks and handshakes. Preview never calls it.
      const result=await outputSession.prepareOutput(options,()=>startGeneration===playbackGeneration);
      if(startGeneration!==playbackGeneration)return;
      if(!result.ready){
        if(result.error)setStatus(result.error,'err');
        return;
      }
      if(!content.ready){setStatus('请先选择图片/视频文件','err');return;}
      content.prepare();
      outputSession.resetFrameCache();
      outputSession.resetStats(performance.now());
      playbackGeneration++;
      running = true;
      presentation.started();
      void loopFrames();
    } catch(error) {
      if(startGeneration===playbackGeneration)setStatus('发送失败：'+error.message,'err');
    } finally {
      starting=false;
    }
  }

  function stopBtn(setMsg = true) {
    playbackGeneration++;
    running = false;
    if (rafId) clearTimeout(rafId);
    rafId = null;
    if (setMsg) presentation.stopped();
  }

  function stopLoop(reason) {
    stopBtn(true);
    outputSession.stopOutput(reason);
  }
 return {getAnimationTime,startLoop,stopBtn,stopLoop,state:{get running(){return running;},get animationElapsed(){return animationElapsed;},set animationElapsed(value){animationElapsed=value;},get animationLastTime(){return animationLastTime;},set animationLastTime(value){animationLastTime=value;},get animationSpeed(){return animationSpeed;},set animationSpeed(value){animationSpeed=value;}}};
});
