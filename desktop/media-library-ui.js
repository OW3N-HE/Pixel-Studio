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
    const style=make('style');
    style.textContent=`
      /* The library well owns corner clipping, just as it does for the animation gallery. */
      .ps-desktop-media-grid{position:absolute;inset:1px;z-index:2;display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));grid-auto-rows:min-content;align-items:start;align-content:start;gap:7px;padding:5px 7px 5px 5px;overflow:auto;border-radius:0;background:var(--surface-deep,var(--bg));}
      .ps-desktop-media-grid[hidden]{display:none!important}
      .ps-desktop-media-grid{overflow-x:hidden;overflow-y:auto;scrollbar-gutter:stable;scroll-padding-block:17px;overscroll-behavior:contain;}
      .ps-desktop-media-grid::-webkit-scrollbar-button{display:none;}
      .ps-desktop-media-grid{mask-image:linear-gradient(to bottom,transparent,#000 var(--gallery-fade-top,0px),#000 calc(100% - var(--gallery-fade-bottom,0px)),transparent);}
      .ps-desktop-media-card{position:relative;width:100%;min-width:0;min-height:0!important;max-height:none!important;height:100%!important;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0!important;border:0;border-radius:2px;overflow:hidden;background:var(--surface);color:var(--text);}
      .ps-desktop-media-card span{max-width:100%;overflow-wrap:anywhere;font-size:13px;line-height:1.4}
      .ps-desktop-media-thumbnail{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;}
      .ps-desktop-media-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
      .ps-desktop-media-thumbnail[hidden],.ps-desktop-media-placeholder[hidden]{display:none!important;}
      .ps-desktop-media-grid.is-searching .animation-title{opacity:1;}
      .ps-desktop-media-caption{max-height:100%;overflow-y:auto;}
      .ps-desktop-media-caption span{display:block;white-space:normal;overflow-wrap:anywhere;}
      .ps-desktop-media-card:hover .ps-desktop-media-caption,.ps-desktop-media-card:focus-within .ps-desktop-media-caption{pointer-events:auto;}
      .ps-desktop-media-badge{position:absolute;top:7px;right:7px;display:grid;place-items:center;width:22px;height:22px;box-sizing:border-box;padding:0;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--text);pointer-events:none;}
      .ps-desktop-media-badge::before{content:'';width:7px;height:8px;background:currentColor;clip-path:polygon(0 0,100% 50%,0 100%);transform:translateX(1px);}
      .ps-desktop-media-icon{font-size:20px!important;color:var(--brand)}
      .ps-desktop-media-note{grid-column:1/-1;margin:0;padding:12px;font-size:13px;color:var(--muted);overflow-wrap:anywhere}
      .ps-desktop-media-actions{display:flex;align-items:center;gap:7px;white-space:nowrap}
      .ps-web .ps-desktop-media-actions button{appearance:none;display:inline-flex;align-items:center;justify-content:center;height:42px;min-height:42px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--text);font:inherit;font-size:13px;cursor:pointer;box-shadow:none;}
      .ps-web .ps-desktop-media-actions button:hover:not(:disabled){border-color:var(--brand);}
      .ps-web .ps-desktop-media-actions button:focus-visible{outline:2px solid var(--brand);outline-offset:2px;}
      .ps-web .ps-desktop-media-actions button:disabled{opacity:.5;cursor:default;}
    `;
    document.head.append(style);
    // Replace only the desktop header action. The shared web action stays unchanged.
    const sourceButton=originalMediaButton.cloneNode(false);sourceButton.type='button';
    originalMediaButton.replaceWith(sourceButton);
    let mediaActive=false;
    const grid=make('div','ps-desktop-media-grid');grid.hidden=true;
    well.style.position='relative';well.append(grid);
    function updateMediaEdges(){
      const remaining=grid.scrollHeight-grid.clientHeight-grid.scrollTop;
      grid.style.setProperty('--gallery-fade-top',grid.scrollTop>1?'12px':'0px');
      grid.style.setProperty('--gallery-fade-bottom',remaining>1?'12px':'0px');
    }
    grid.addEventListener('scroll',updateMediaEdges,{passive:true});
    const mediaEdgeResize=new ResizeObserver(updateMediaEdges);mediaEdgeResize.observe(grid);
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
    const originalShuffle=toolbar.querySelector('.ps-shuffle-group');
    const mediaShuffle=make('div','ps-shuffle-group'),shuffleLabel=make('label','ps-shuffle');
    const shuffleCheck=make('input'),shuffleCaption=make('span'),interval=make('input'),unit=make('span','ps-unit');
    shuffleCheck.type='checkbox';interval.type='number';interval.min='3';interval.max='3600';interval.step='1';interval.value=document.getElementById('psShuffleInterval')?.value||'20';
    shuffleLabel.append(shuffleCheck,shuffleCaption);mediaShuffle.append(shuffleLabel,interval,unit);
    let outputStopRevision=0;
    let library={folder:'',files:[]},busy=false,selected=null,request=0,disposed=false,error='';
    let mediaPreviewRequested=false;
    let sessionInitialized=false;
    function rememberMediaSession(){
      if(!sessionInitialized||disposed)return;
      void window.pixelStudioDesktopSession.rememberContent({mediaActive,selected,lastAnimation,shuffle:shuffleCheck.checked,interval:interval.value}).catch(()=>{});
    }
    function restoreMediaPreview(){
      if(disposed||busy||!mediaActive||!mediaPreviewRequested)return;
      const file=library.files.find(item=>item.name===selected)||matchingFiles()[0]||library.files[0];
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
        if(disposed||busy)return;
        libraryDirty=false;void refreshLibrary('scan',true);
      },250);
    }
    const unsubscribeLibrary=bridge.onMediaLibraryChanged?.(()=>{libraryDirty=true;scheduleLibraryRefresh();});
    const mode=document.getElementById('animationMode'),search=document.getElementById('librarySearch'),category=document.getElementById('libraryCategory');
    let lastAnimation=mode.value==='file'?'rainbow':mode.value;
    const en=()=>document.documentElement.lang==='en';
    const choose=make('button','ghost'),refresh=make('button','ghost'),note=make('p','ps-desktop-media-note');
    choose.type='button';refresh.type='button';note.setAttribute('role','status');
    const actions=make('div','ps-desktop-media-actions');actions.append(choose,refresh);
    actions.hidden=true;toolbar.insertBefore(actions,originalShuffle);
    const matchingFiles=()=>library.files.filter(file=>file.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
    const mediaPlayback=window.pixelStudioMediaPlayback.create({
      bridge,runtime:window.pixelStudioWebRuntime,policy:window.PixelStudioBrowserPlayback.policy,
      isActive:()=>mediaActive,isBusy:()=>busy,
      setBusy:value=>{busy=value;syncMediaLoadState();},
      setError:value=>{error=value;note.textContent=error;note.hidden=!error;},
      beginRequest:()=>++request,requestRevision:()=>request,stopRevision:()=>outputStopRevision,
      select:name=>{selected=name;rememberMediaSession();},
      afterLoad:()=>{revealSelectedCard();scheduleLibraryRefresh();restoreMediaPreview();},
      timeoutMessage:()=>en()?'Media did not become ready.':'媒体加载超时。',
      loadError:e=>(en()?'Unable to load media: ':'无法加载媒体：')+e.message,
      shuffleEnabled:()=>shuffleCheck.checked,shuffleInterval:()=>interval.value,
      files:matchingFiles,selected:()=>selected,
      // Window visibility must not change output scheduling; dialogs still pause shuffle.
      isSuspended:()=>[...document.querySelectorAll('dialog[open],.ps-modal:not([hidden])')].some(node=>node.getClientRects().length)
    });
    function render({retryFailed=false}={}){
      sourceButton.textContent=mediaActive?(en()?'Animations':'动画'):(en()?'Media':'媒体');
      sourceButton.setAttribute('aria-label',mediaActive?(en()?'Switch to animations':'切换到动画'):(en()?'Switch to media':'切换到媒体'));
      grid.setAttribute('aria-label',en()?'Media library':'媒体片库');
      choose.textContent=en()?'Choose folder':'选择文件夹';choose.disabled=busy;
      refresh.textContent=en()?'Refresh':'刷新';refresh.disabled=busy;
      shuffleCaption.textContent=en()?'Shuffle':'随机播放';unit.textContent=en()?'s':'秒';
      shuffleCheck.disabled=matchingFiles().length<2;interval.disabled=!shuffleCheck.checked;
      interval.setAttribute('aria-label',en()?'Shuffle interval in seconds':'随机播放间隔秒数');
      const files=matchingFiles();
      note.textContent=error;note.hidden=!note.textContent;
      grid.classList.toggle('is-searching',search.value.trim().length>0);
      thumbnails.reset({retryFailed});grid.replaceChildren(note);
      if(!busy&&!files.length){const empty=make('p','ps-desktop-media-note');empty.textContent=en()?'No matching media in this folder.':'文件夹中没有符合条件的媒体。';grid.append(empty);}
      for(const file of files){
        const tile=make('div','ps-animation-tile ps-desktop-media-tile');
        const card=make('button','ps-desktop-media-card');card.type='button';card.disabled=busy;card.title=file.name;card.setAttribute('aria-pressed',String(selected===file.name));
        const image=make('img','ps-desktop-media-thumbnail');image.alt='';
        const placeholder=make('span','ps-desktop-media-placeholder ps-desktop-media-icon');placeholder.textContent=file.type.startsWith('video/')?(en()?'Video':'视频'):(en()?'Image':'图片');placeholder.setAttribute('aria-hidden','true');
        const caption=make('div','animation-title ps-desktop-media-caption'),label=make('span');label.textContent=file.name;caption.append(label);
        card.append(image,placeholder,caption);
        if(file.type.startsWith('video/')){const badge=make('span','ps-desktop-media-badge');badge.setAttribute('role','img');badge.setAttribute('aria-label',en()?'Video':'视频');card.append(badge);}
        card.addEventListener('click',()=>{window.pixelStudioDesktopSession.cancelRestore();void load(file);});tile.append(card);grid.append(tile);thumbnails.observe(file,image,placeholder);
      }
      if(library.truncated){const notice=make('p','ps-desktop-media-note');notice.textContent=en()?'Showing the first 1,000 files. Subfolders are not scanned.':'仅显示前 1,000 个文件，不扫描子文件夹。';grid.append(notice);}
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
          if(selected&&!library.files.some(file=>file.name===selected))selected=null;
        }
      }
      catch(e){if(!disposed&&revision===request){if(!automatic)library={folder:library.folder,files:[]};error=(en()?'Unable to read folder: ':'无法读取文件夹：')+e.message;changed=true;}}
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
      if(!media){mediaPreviewRequested=false;outputStopRevision++;mediaPlayback.stopShuffle();}
      if(media){
        if(mode.value!=='file')lastAnimation=mode.value;
      }
      else if(mode.value==='file'){mode.value=[...mode.options].some(option=>option.value===lastAnimation)?lastAnimation:'rainbow';mode.dispatchEvent(new Event('change',{bubbles:true}));}
      gallery.style.visibility=media?'hidden':'';grid.hidden=!media;category.hidden=media;
      actions.hidden=!media;
      if(media&&originalShuffle.isConnected)originalShuffle.replaceWith(mediaShuffle);
      else if(!media&&mediaShuffle.isConnected)mediaShuffle.replaceWith(originalShuffle);
      toolbar.style.setProperty('grid-template-columns',media?'minmax(0,1fr) max-content max-content':'max-content minmax(0,1fr) max-content','important');
      search.placeholder=en()?'Search':'搜索';render();scheduleShuffle();window.pixelStudioResizePreview?.();
      if(enteringMedia&&restorePreview){mediaPreviewRequested=true;restoreMediaPreview();}
      rememberMediaSession();
    }
    function scheduleShuffle(){
      interval.value=String(window.PixelStudioBrowserPlayback.policy.shuffleSeconds(interval.value));
      interval.disabled=!shuffleCheck.checked;
      mediaPlayback.scheduleShuffle();
    }
    shuffleCheck.addEventListener('change',()=>{scheduleShuffle();rememberMediaSession();});interval.addEventListener('change',()=>{scheduleShuffle();rememberMediaSession();});
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
      capture:()=>sessionInitialized?{mediaActive,selected,lastAnimation,shuffle:shuffleCheck.checked,interval:interval.value}:null,
      reportError:e=>{if(!disposed){error=(en()?'Unable to restore session: ':'无法恢复会话：')+e.message;syncMediaLoadState();}},
      restore:async(saved,isCurrent=()=>true)=>{
      const current=()=>!disposed&&isCurrent();
      try{
        if(!current())return false;
        if(saved){
          selected=saved.selected;lastAnimation=saved.lastAnimation;
          shuffleCheck.checked=saved.shuffle;interval.value=saved.interval;
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
      }catch(e){if(current()){error=(en()?'Unable to restore media: ':'无法恢复媒体：')+e.message;syncMediaLoadState();}return false;}
      finally{if(!disposed)sessionInitialized=true;}
      }
    });
  }
})();
