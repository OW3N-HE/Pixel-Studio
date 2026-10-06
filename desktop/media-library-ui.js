(() => {
  'use strict';
  const bridge=window.pixelStudioDesktop;
  if(!bridge?.mediaLibrary)return;
  let attached=false;
  const observer=new MutationObserver(attach);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-studio-ready']});
  attach();
  function attach(){
    if(attached||document.body?.dataset.studioReady!=='true')return;
    const gallery=document.getElementById('animationGallery'),toolbar=document.querySelector('.library-toolbar'),well=gallery?.closest('.ps-library-well');
    const originalMediaButton=document.getElementById('psMediaToggle');
    if(!toolbar||!well||!originalMediaButton)return;
    attached=true;observer.disconnect();
    const make=(tag,className='')=>{const node=document.createElement(tag);node.className=className;return node;};
    // Media presentation is defined in the shared pixel-studio-web-ui.css.
    // Replace only the desktop header action. The shared web action stays unchanged.
    const sourceButton=originalMediaButton.cloneNode(false);sourceButton.type='button';
    originalMediaButton.replaceWith(sourceButton);
    let mediaActive=false;
    const grid=make('div','ps-desktop-media-grid');grid.hidden=true;
    well.style.position='relative';well.append(grid);
    function updateMediaEdges(){
      const maximum=Math.max(0,grid.scrollHeight-grid.clientHeight);
      const top=Math.max(0,Math.min(maximum,grid.scrollTop));
      const fade=distance=>Math.min(12,Math.max(0,distance-1))+'px';
      grid.style.setProperty('--gallery-fade-top',fade(top));
      grid.style.setProperty('--gallery-fade-bottom',fade(maximum-top));
    }
    grid.addEventListener('scroll',updateMediaEdges,{passive:true});
    let mediaViewportWidth=grid.clientWidth,mediaViewportHeight=grid.clientHeight;
    const mediaEdgeResize=new ResizeObserver(()=>{
      const width=grid.clientWidth,height=grid.clientHeight;
      const viewportChanged=width!==mediaViewportWidth||height!==mediaViewportHeight;
      mediaViewportWidth=width;mediaViewportHeight=height;
      window.pixelStudioSyncLibraryOverflow?.(grid);
      updateMediaEdges();if(viewportChanged&&!mediaSorter.dragging)revealSelectedCard();
    });mediaEdgeResize.observe(grid);
    function revealSelectedCard(){
      const card=grid.querySelector('[aria-pressed="true"]');
      if(!card||grid.clientHeight<=0)return;
      const viewport=grid.getBoundingClientRect(),bounds=card.getBoundingClientRect();
      const top=viewport.top+grid.clientTop+17,bottom=viewport.top+grid.clientTop+grid.clientHeight-17;
      if(bounds.height>bottom-top||bounds.top<top)grid.scrollTop+=bounds.top-top;
      else if(bounds.bottom>bottom)grid.scrollTop+=bounds.bottom-bottom;
      updateMediaEdges();
    }
    const thumbnails=window.pixelStudioMediaThumbnails.create(grid,bridge);
    const shuffleDock=document.getElementById('psShuffleDock');
    // Animation and media share the original controls and their persisted preference.
    const sharedShuffle=(shuffleDock||toolbar).querySelector('.ps-shuffle-group');
    const shuffleCheck=sharedShuffle.querySelector('input[type=checkbox]');
    const interval=sharedShuffle.querySelector('input[type=number]');
    let outputStopRevision=0;
    let library={folder:'',files:[]},busy=false,selected=null,request=0,disposed=false,error='';
    let mediaPreviewRequested=false;
    let sessionInitialized=false;
    const ordering=window.pixelStudioLibraryOrder;
    let mediaOrder=[];
    function orderedFiles(){
      const rank=new Map(mediaOrder.map((name,index)=>[name,index]));
      return [...library.files].sort((a,b)=>(rank.get(a.name)??Number.MAX_SAFE_INTEGER)-(rank.get(b.name)??Number.MAX_SAFE_INTEGER));
    }
    const mediaSorter=ordering.attach(grid,{
      enabled:()=>mediaActive&&!busy&&!disposed,
      order:()=>orderedFiles().map(file=>file.name),
      visible:()=>matchingFiles().map(file=>file.name),
      commit:order=>{
        mediaOrder=order;ordering.remember('media:'+library.folder,order);
        const byName=new Map([...grid.querySelectorAll('.ps-desktop-media-tile')].map(tile=>[tile.dataset.orderId,tile]));
        ordering.arrange(grid,matchingFiles().map(file=>byName.get(file.name)).filter(Boolean));
        window.pixelStudioSyncLibraryOverflow?.(grid);updateMediaEdges();scheduleShuffle();
      },
      onFinish:()=>scheduleLibraryRefresh()
    });
    function rememberMediaSession(){
      if(!sessionInitialized||disposed)return;
      void window.pixelStudioDesktopSession.rememberContent({mediaActive,selected,lastAnimation}).catch(()=>{});
    }
    function restoreMediaPreview(){
      if(disposed||busy||!mediaActive||!mediaPreviewRequested)return;
      const file=library.files.find(item=>item.name===selected)||matchingFiles()[0]||orderedFiles()[0];
      if(!file)return;
      const playing=window.pixelStudioWebRuntime.playing;
      // Restore content independently of output; switching libraries never starts sending.
      mediaPreviewRequested=false;void load(file,playing,false);
    }
    let libraryDirty=false,libraryRefreshTimer=null;
    function scheduleLibraryRefresh(){
      if(disposed||!libraryDirty)return;
      clearTimeout(libraryRefreshTimer);
      libraryRefreshTimer=setTimeout(()=>{
        libraryRefreshTimer=null;
        if(disposed||busy||mediaSorter.dragging)return;
        libraryDirty=false;void refreshLibrary('scan',true);
      },250);
    }
    const unsubscribeLibrary=bridge.onMediaLibraryChanged?.(()=>{libraryDirty=true;scheduleLibraryRefresh();});
    const mode=document.getElementById('animationMode'),search=document.getElementById('librarySearch'),category=document.getElementById('libraryCategory');
    let lastAnimation=mode.value==='file'?'rainbow':mode.value;
    const en=()=>document.documentElement.lang==='en';
    const choose=make('button','ghost ps-media-icon-action'),refresh=make('button','ghost ps-media-icon-action'),note=make('p','ps-desktop-media-note ps-desktop-media-error');
    choose.type='button';refresh.type='button';note.setAttribute('role','status');
    choose.setAttribute('data-update-ui','');refresh.setAttribute('data-update-ui','');
    choose.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z"/></svg>';
    refresh.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/></svg>';
    const actions=make('div','ps-desktop-media-actions');actions.append(choose,refresh);
    const shuffleAnchor=shuffleDock||sharedShuffle;
    actions.hidden=true;toolbar.insertBefore(actions,shuffleAnchor?.parentElement===toolbar?shuffleAnchor:null);
    const matchingFiles=()=>orderedFiles().filter(file=>file.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
    const mediaPlayback=window.pixelStudioMediaPlayback.create({
      bridge,runtime:window.pixelStudioWebRuntime,policy:window.PixelStudioBrowserPlayback.policy,
      isActive:()=>mediaActive,isBusy:()=>busy,
      setBusy:value=>{busy=value;syncMediaLoadState();},
      setError:value=>{error=value;note.textContent=error;note.hidden=!error;},
      beginRequest:()=>++request,requestRevision:()=>request,stopRevision:()=>outputStopRevision,
      select:name=>{selected=name;rememberMediaSession();},
      afterLoad:()=>{revealSelectedCard();scheduleLibraryRefresh();restoreMediaPreview();scheduleShuffle();},
      timeoutMessage:()=>en()?'Media load timed out.':'媒体加载超时。',
      loadError:e=>(en()?'Media load failed: ':'无法加载媒体：')+e.message,
      shuffleEnabled:()=>shuffleCheck.checked,shuffleInterval:()=>interval.value,
      playbackMode:()=>window.PixelStudioBrowserPlayback.policy.playMode(sharedShuffle.dataset.playMode,shuffleCheck.checked),
      files:matchingFiles,selected:()=>selected,
      // Window visibility must not change output scheduling; dialogs still pause shuffle.
      isSuspended:()=>mediaSorter.dragging||[...document.querySelectorAll('dialog[open],.ps-modal:not([hidden])')].some(node=>node.getClientRects().length)
    });
    function render({retryFailed=false}={}){
      mediaSorter.cancel();
      sourceButton.dataset.mediaTarget=mediaActive?'animations':'media';
      sourceButton.title=mediaActive?(en()?'Switch to animations':'切换到动画'):(en()?'Switch to media':'切换到媒体');
      sourceButton.setAttribute('aria-label',sourceButton.title);
      grid.setAttribute('aria-label',en()?'Media library':'媒体片库');
      choose.title=en()?'Choose folder':'选择文件夹';choose.setAttribute('aria-label',choose.title);choose.disabled=busy;
      refresh.title=en()?'Refresh':'刷新';refresh.setAttribute('aria-label',refresh.title);refresh.disabled=busy;
      syncMediaShuffleControls();
      const files=matchingFiles();
      note.textContent=error;note.hidden=!note.textContent;
      grid.classList.toggle('is-searching',search.value.trim().length>0);
      thumbnails.reset({retryFailed});grid.replaceChildren(note);
      if(!busy&&!files.length){const empty=make('p','ps-desktop-media-note');empty.textContent=en()?'No matching media.':'文件夹中没有符合条件的媒体。';grid.append(empty);}
      for(const file of files){
        const tile=make('div','ps-animation-tile ps-desktop-media-tile');
        const card=make('button','ps-desktop-media-card');card.type='button';card.disabled=busy;card.title=file.name;card.setAttribute('aria-pressed',String(selected===file.name));
        const image=make('img','ps-desktop-media-thumbnail');image.alt='';
        const placeholder=make('span','ps-desktop-media-placeholder ps-desktop-media-icon');placeholder.textContent=file.type.startsWith('video/')?(en()?'Video':'视频'):(en()?'Image':'图片');placeholder.setAttribute('aria-hidden','true');
        const caption=make('span','animation-title ps-desktop-media-caption'),label=make('span');label.textContent=file.name;caption.append(label);
        const content=make('span','ps-card-content');content.append(image,placeholder,caption);card.append(content);
        if(file.type.startsWith('video/')){const badge=make('span','ps-desktop-media-badge');badge.setAttribute('role','img');badge.setAttribute('aria-label',en()?'Video':'视频');card.append(badge);}
        card.addEventListener('click',()=>{window.pixelStudioDesktopSession.cancelRestore();void load(file);});tile.append(card);grid.append(tile);mediaSorter.decorate(tile,file.name);thumbnails.observe(file,image,placeholder);
      }
      if(library.truncated){const notice=make('p','ps-desktop-media-note');notice.textContent=en()?'First 1,000 files only; no subfolders.':'仅显示前 1,000 个文件，不扫描子文件夹。';grid.append(notice);}
      window.pixelStudioSyncLibraryOverflow?.(grid);
      updateMediaEdges();
    }
    async function refreshLibrary(action,automatic=false){
      if(busy){if(automatic){libraryDirty=true;scheduleLibraryRefresh();}return;}
      busy=true;error='';if(!automatic)render();const revision=++request;
      let changed=!automatic;
      const scrollTop=grid.scrollTop;
      try{
        const result=await bridge.mediaLibrary(action);
        if(disposed||revision!==request)return;
        if(!result.ok)throw new Error(result.error);
        if(!result.canceled){
          changed=changed||library.folder!==result.folder||library.truncated!==result.truncated||JSON.stringify(library.files)!==JSON.stringify(result.files);
          library=result;
          mediaOrder=ordering.read('media:'+library.folder,library.files.map(file=>file.name));
          if(selected&&!library.files.some(file=>file.name===selected))selected=null;
        }
      }
      catch(e){if(!disposed&&revision===request){if(!automatic)library={folder:library.folder,files:[]};error=(en()?'Folder read failed: ':'无法读取文件夹：')+e.message;changed=true;}}
      finally{if(!disposed&&revision===request){busy=false;if(changed){render({retryFailed:!automatic});grid.scrollTop=scrollTop;updateMediaEdges();}scheduleLibraryRefresh();restoreMediaPreview();}}
    }
    function syncMediaLoadState(){
      choose.disabled=busy;
      refresh.disabled=busy;
      note.textContent=error;note.hidden=!error;
      for(const card of grid.querySelectorAll('.ps-desktop-media-card')){
        card.disabled=busy;
        card.setAttribute('aria-pressed',String(card.title===selected));
      }
    }
    function load(file,continueOutput=window.pixelStudioWebRuntime.playing===true,startOutput=false){return mediaPlayback.load(file,continueOutput,startOutput);}
    function switchSource(next=mediaActive,restorePreview=true){
      const enteringMedia=next&&!mediaActive;
      const media=mediaActive=next;
      sharedShuffle.dataset.source=media?'media':'animations';
      if(!media){mediaPreviewRequested=false;outputStopRevision++;mediaPlayback.stopShuffle();}
      if(media){
        if(mode.value!=='file')lastAnimation=mode.value;
      }
      else if(mode.value==='file'){mode.value=[...mode.options].some(option=>option.value===lastAnimation)?lastAnimation:'rainbow';mode.dispatchEvent(new Event('change',{bubbles:true}));}
      gallery.style.visibility=media?'hidden':'';grid.hidden=!media;category.hidden=media;
      // Visibility changes keep the animation layout, so ResizeObserver alone is insufficient.
      window.pixelStudioSyncLibraryOverflow?.(gallery);
      window.pixelStudioSyncLibraryOverflow?.(grid);
      actions.hidden=!media;
      // Hand off scheduling without replacing controls or changing their values.
      sharedShuffle.dispatchEvent(new Event('pixel-studio-shuffle-source-change'));
      search.placeholder=en()?'Search':'搜索';render();scheduleShuffle();window.pixelStudioResizePreview?.();
      if(enteringMedia&&restorePreview){mediaPreviewRequested=true;restoreMediaPreview();}
      rememberMediaSession();
    }
    function syncMediaShuffleControls(){
      if(!mediaActive)return;
      // A small or filtered library must still allow switching back to Fixed.
      shuffleCheck.disabled=false;
      interval.disabled=window.PixelStudioBrowserPlayback.policy.playMode(sharedShuffle.dataset.playMode,shuffleCheck.checked)==='fixed';
    }
    function scheduleShuffle(){
      if(!mediaActive){mediaPlayback.stopShuffle();return;}
      interval.value=String(window.PixelStudioBrowserPlayback.policy.shuffleSeconds(interval.value));
      syncMediaShuffleControls();
      mediaPlayback.scheduleShuffle();
    }
    shuffleCheck.addEventListener('change',()=>{scheduleShuffle();rememberMediaSession();});interval.addEventListener('change',()=>{scheduleShuffle();rememberMediaSession();});
    window.addEventListener('pixel-studio-playback-status-change',scheduleShuffle);
    window.addEventListener('pagehide',()=>window.removeEventListener('pixel-studio-playback-status-change',scheduleShuffle),{once:true});
    document.getElementById('stopBtn').addEventListener('click',()=>{outputStopRevision++;});
    sourceButton.addEventListener('click',()=>{window.pixelStudioDesktopSession.cancelRestore();switchSource(!mediaActive);});choose.addEventListener('click',()=>{window.pixelStudioDesktopSession.cancelRestore();void refreshLibrary('select');});
    refresh.addEventListener('click',()=>{void refreshLibrary('scan');});
    search.addEventListener('input',()=>{if(mediaActive)render();});
    mode.addEventListener('change',()=>{if(mode.value!=='file'){lastAnimation=mode.value;if(mediaActive)switchSource(false);}});
    window.addEventListener('pixel-studio-language-change',()=>{render();search.placeholder=en()?'Search':'搜索';});
    window.addEventListener('pagehide',()=>{disposed=true;++request;observer.disconnect();mediaEdgeResize.disconnect();mediaPlayback.dispose();clearTimeout(libraryRefreshTimer);unsubscribeLibrary?.();thumbnails.dispose();},{once:true});
    switchSource();
    window.pixelStudioDesktopSession.registerContent({
      finishRestore:()=>{if(!disposed)sessionInitialized=true;},
      capture:()=>sessionInitialized?{mediaActive,selected,lastAnimation}:null,
      reportError:e=>{if(!disposed){error=(en()?'Session restore failed: ':'无法恢复会话：')+e.message;syncMediaLoadState();}},
      restore:async(saved,isCurrent=()=>true)=>{
      const current=()=>!disposed&&isCurrent();
      try{
        if(!current())return false;
        if(saved){
          selected=saved.selected;lastAnimation=saved.lastAnimation;
          // Legacy media-only shuffle fields must not overwrite the shared preference.
          // Startup restoration loads its saved file below, after the folder scan.
          switchSource(saved.mediaActive,false);
        }
        await refreshLibrary('scan');
        if(!current())return false;
        const file=mediaActive&&selected?library.files.find(item=>item.name===selected):null;
        if(file){
          if(!await load(file,false,false))return false;
          const deadline=Date.now()+20000;
          while(current()&&mediaActive&&!window.pixelStudioWebRuntime.desktopMediaReady()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
          if(!current()||!mediaActive)return false;
        }
        return current()&&(!mediaActive||(Boolean(file)&&window.pixelStudioWebRuntime.desktopMediaReady()));
      }catch(e){if(current()){error=(en()?'Media restore failed: ':'无法恢复媒体：')+e.message;syncMediaLoadState();}return false;}
      finally{if(!disposed)sessionInitialized=true;}
      }
    });
  }
})();
