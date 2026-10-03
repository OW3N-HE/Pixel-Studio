'use strict';
// Desktop startup orchestration only: no decoding, drawing or device protocol.
(() => {
  const bridge=window.pixelStudioDesktop;
  if(!bridge?.edition||window.pixelStudioDesktopSession)return;
  let phase='waiting',generation=0,outputGeneration=0,connectionGeneration=0,content=null;
  let provideContent;
  const contentReady=new Promise(resolve=>{provideContent=resolve;});
  const settingsReady=document.documentElement.dataset.desktopReady==='true'
    ? Promise.resolve()
    : new Promise(resolve=>window.addEventListener('pixel-studio-desktop-ready',resolve,{once:true}));
  let saveQueue=Promise.resolve();
  function cancelOutputRestore(){outputGeneration++;}
  // Choosing content cancels stale saved content and automatic output, not the connection.
  function cancelRestore(){generation++;cancelOutputRestore();}
  document.getElementById('stopBtn')?.addEventListener('click',cancelOutputRestore);
  document.getElementById('disconnectBtn')?.addEventListener('click',()=>{
    connectionGeneration++;cancelOutputRestore();
  });
  window.addEventListener('pagehide',()=>{phase='disposed';connectionGeneration++;cancelRestore();},{once:true});
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
    const revision=generation,outputRevision=outputGeneration,connectionRevision=connectionGeneration;
    const alive=()=>phase!=='disposed';
    const current=()=>alive()&&generation===revision;
    const outputCurrent=()=>alive()&&outputGeneration===outputRevision;
    const connectionCurrent=()=>alive()&&connectionGeneration===connectionRevision;
    try{
      await Promise.all([settingsReady,contentReady]);
      if(!alive())return;
      phase='restoring';
      // Both tasks own their errors. Only automatic output waits for both;
      // an unavailable connection must never block local content restoration.
      const preview=(async()=>{
        try{
          if(!current())return false;
          const saved=await bridge.getMediaSession();
          if(!current())return false;
          return await content.restore(saved,current);
        }catch(error){if(current())content?.reportError?.(error);return false;}
        finally{if(alive())content?.finishRestore?.();}
      })();
      const connection=(async()=>{
        if(!connectionCurrent())return false;
        try{
          await bridge.restoreConnection();
          return connectionCurrent();
        }catch(error){if(connectionCurrent())content?.reportError?.(error);return false;}
      })();
      const [ready,connectionReady]=await Promise.all([preview,connection]);
      if(!current()||!outputCurrent()||!ready||!connectionReady)return;
      // Content readiness is platform-local; the main process only authorizes
      // resuming the saved output intent, never selects an animation or file.
      await bridge.resumePlayback();
    }catch(error){if(outputCurrent())content?.reportError?.(error);}
    finally{
      if(alive())phase='ready';
    }
  })();
})();
