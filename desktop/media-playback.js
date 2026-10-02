'use strict';
// Media scheduling and source transitions, with no DOM or persistence ownership.
(() => {
  window.pixelStudioMediaPlayback=Object.freeze({create(options){
    const {bridge,runtime,policy}=options;
    let timer=null,disposed=false;
    async function load(file,continueOutput=runtime.playing===true,startOutput=false){
      if(disposed||options.isBusy())return false;
      options.setBusy(true);options.setError('');
      const revision=options.beginRequest(),stopRevision=options.stopRevision();
      const current=()=>!disposed&&options.isActive()&&revision===options.requestRevision();
      const uninterrupted=()=>current()&&stopRevision===options.stopRevision();
      try{
        const result=await bridge.mediaFile(file.id);
        if(!current())return false;
        if(!result.ok)throw new Error(result.error);
        const source={url:result.url,type:result.type,name:file.name};
        if(continueOutput){
          if(!uninterrupted()||!runtime.playing)return false;
          if(!await runtime.replaceDesktopMedia(source,uninterrupted)||!uninterrupted())return false;
        }else{
          runtime.loadDesktopMedia(source);
          if(startOutput){
            const deadline=Date.now()+20000;
            while(uninterrupted()&&!runtime.desktopMediaReady()){
              if(Date.now()>deadline)throw new Error(options.timeoutMessage());
              await new Promise(resolve=>setTimeout(resolve,20));
            }
            if(!uninterrupted())return false;
            await runtime.startDesktopMedia();
          }
        }
        if(!current())return false;
        options.select(file.name);
        return true;
      }catch(error){
        if(!disposed&&revision===options.requestRevision())options.setError(options.loadError(error));
        return false;
      }finally{
        if(!disposed&&revision===options.requestRevision()){
          options.setBusy(false);options.afterLoad();
        }
      }
    }
    function stopShuffle(){clearTimeout(timer);timer=null;}
    function scheduleShuffle(){
      stopShuffle();
      if(disposed||!options.isActive()||!options.shuffleEnabled())return;
      const seconds=policy.shuffleSeconds(options.shuffleInterval());
      timer=setTimeout(async()=>{
        try{
          if(!disposed&&!options.isBusy()&&!options.isSuspended()&&runtime.playing){
            const files=options.files();
            const name=policy.chooseNext(files.map(file=>file.name),options.selected());
            const file=files.find(item=>item.name===name);
            if(file)await load(file,true);
          }
        }finally{scheduleShuffle();}
      },seconds*1000);
    }
    return Object.freeze({load,scheduleShuffle,stopShuffle,dispose(){disposed=true;stopShuffle();}});
  }});
})();
