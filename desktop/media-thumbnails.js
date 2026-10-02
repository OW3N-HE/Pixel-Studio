(() => {
  'use strict';
  window.pixelStudioMediaThumbnails = {create(root, bridge) {
    const cache=new Map(),queue=[],active=new Set();
    let running=0,disposed=false;
    const key=file=>file.id+':'+file.lastModified+':'+file.size;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        observer.unobserve(entry.target);
        const task=entry.target._mediaThumbnail;
        if(task){queue.push(task);pump();}
      }
    },{root,rootMargin:'240px'});
    function remember(id,value){
      cache.delete(id);cache.set(id,value);
      while(cache.size>128)cache.delete(cache.keys().next().value);
    }
    function paint(task,value){
      if(disposed||!task.image.isConnected)return;
      if(value){task.image.style.imageRendering=value.pixelated?'pixelated':'auto';task.image.src=value.url;task.image.hidden=false;task.placeholder.hidden=true;}
    }
    function decode(file,url){
      return new Promise((resolve,reject)=>{
        const video=file.type.startsWith('video/');
        const media=video?document.createElement('video'):new Image();
        let settled=false,seeking=false;
        const cancel=()=>finish(new Error('Thumbnail cancelled'));
        active.add(cancel);
        const timer=setTimeout(()=>finish(new Error('Thumbnail timeout')),15000);
        function finish(error,value){
          if(settled)return;settled=true;clearTimeout(timer);active.delete(cancel);
          media.onload=media.onerror=media.onloadeddata=media.onseeked=null;
          if(video){media.pause();media.removeAttribute('src');media.load();}
          else media.src='';
          error?reject(error):resolve(value);
        }
        function capture(){
          try{
            const w=video?media.videoWidth:media.naturalWidth,h=video?media.videoHeight:media.naturalHeight;
            if(!w||!h)throw new Error('No thumbnail frame');
            // Classify by decoded dimensions, not media type: small video
            // frames need the same sharp scaling as pixel-art images.
            const pixelated=w<=64&&h<=64;
            const canvas=document.createElement('canvas');canvas.width=300;canvas.height=540;
            const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,300,540);
            ctx.imageSmoothingEnabled=!pixelated;ctx.imageSmoothingQuality='high';
            // All media use proportional contain; only sampling differs.
            const scale=Math.min(300/w,540/h);
            const dw=w*scale,dh=h*scale;
            ctx.drawImage(media,Math.floor((300-dw)/2),Math.floor((540-dh)/2),dw,dh);
            finish(null,{url:pixelated?canvas.toDataURL('image/png'):canvas.toDataURL('image/jpeg',.92),pixelated});
          }catch(error){finish(error);}
        }
        media.crossOrigin='anonymous';media.onerror=()=>finish(new Error('Unsupported media'));
        if(video){
          media.muted=true;media.preload='auto';media.playsInline=true;
          media.onloadeddata=()=>{
            if(seeking||settled)return;
            const time=Number.isFinite(media.duration)?Math.min(1,media.duration/10):0;
            if(time>0){seeking=true;media.onseeked=capture;media.currentTime=time;}
            else capture();
          };
        }else media.onload=capture;
        media.src=url;
      });
    }
    async function process(task){
      const id=key(task.file);
      try{
        if(cache.has(id)){paint(task,cache.get(id));return;}
        const result=await bridge.mediaFile(task.file.id);
        if(disposed||!task.image.isConnected)return;
        if(!result.ok)throw new Error(result.error);
        const value=await decode(task.file,result.url);remember(id,value);paint(task,value);
      }catch{if(!disposed)remember(id,null);}
    }
    function pump(){
      while(!disposed&&running<2&&queue.length){
        const task=queue.shift();if(!task.image.isConnected)continue;
        running++;void process(task).finally(()=>{running--;pump();});
      }
    }
    return {
      observe(file,image,placeholder){
        const task={file,image,placeholder},id=key(file);
        if(cache.has(id)){paint(task,cache.get(id));return;}
        image._mediaThumbnail=task;observer.observe(image);
      },
      reset(){observer.disconnect();queue.length=0;},
      dispose(){disposed=true;observer.disconnect();queue.length=0;for(const cancel of [...active])cancel();cache.clear();}
    };
  }};
})();
