'use strict';
// Desktop startup orchestration only: no decoding, drawing or device protocol.
(() => {
  const bridge=window.pixelStudioDesktop;
  if(!bridge?.edition||window.pixelStudioDesktopSession)return;
  let phase='waiting',generation=0,content=null;
  let provideContent;
  const contentReady=new Promise(resolve=>{provideContent=resolve;});
  const settingsReady=document.documentElement.dataset.desktopReady==='true'
    ? Promise.resolve()
    : new Promise(resolve=>window.addEventListener('pixel-studio-desktop-ready',resolve,{once:true}));
  let saveQueue=Promise.resolve();
  function cancelRestore(){generation++;}
  for(const id of ['stopBtn','disconnectBtn','previewOnlyBtn'])
    document.getElementById(id)?.addEventListener('click',cancelRestore);
  window.addEventListener('pagehide',()=>{phase='disposed';cancelRestore();},{once:true});
  window.pixelStudioDesktopSession=Object.freeze({
    get ready(){return phase==='ready';},
    cancelRestore,
    registerContent(adapter){
      if(content)throw new Error('Desktop content adapter already registered.');
      if(typeof adapter?.restore!=='function'||typeof adapter?.capture!=='function')throw new Error('Invalid desktop content adapter.');
      content=adapter;provideContent();
    },
    captureContent(){return content?.capture()||null;},
    rememberContent(snapshot){
      // Serialize writes, but keep a later save possible after an earlier failure.
      saveQueue=saveQueue.catch(()=>{}).then(()=>bridge.saveMediaSession(snapshot));
      return saveQueue;
    }
  });
  void (async()=>{
    const revision=generation;
    const current=()=>phase!=='disposed'&&generation===revision;
    try{
      await Promise.all([settingsReady,contentReady]);
      if(!current())return;
      phase='restoring';
      const saved=await bridge.getMediaSession();
      if(!current())return;
      await bridge.restoreConnection();
      if(!current())return;
      const ready=await content.restore(saved);
      if(!current()||!ready)return;
      // Content readiness is platform-local; the main process only authorizes
      // resuming the saved output intent, never selects an animation or file.
      await bridge.resumePlayback();
    }catch(error){if(current())content?.reportError?.(error);}
    finally{
      if(phase!=='disposed'){
        content?.finishRestore?.();
        phase='ready';
      }
    }
  })();
})();
