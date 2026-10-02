(() => {
  'use strict';
  const VERSION = '0.2.0';
  const $ = id => document.getElementById(id);
  const make = (tag, className = '', text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function initialize() {
    const api = window.pixelStudioWebRuntime;
    if (!api) return;
    document.body.classList.add('ps-web');
    const brightness=$('brightness'),brightnessRange=$('brightnessRange');
    brightnessRange.value=brightness.value;
    brightnessRange.addEventListener('input',()=>{brightness.value=brightnessRange.value;brightness.dispatchEvent(new Event('input',{bubbles:true}));});
    brightness.addEventListener('input',()=>{brightnessRange.value=brightness.value;});
    const theme=$('webTheme');let savedTheme='system';
    try{savedTheme=localStorage.getItem('pixelStudioWebTheme')||'system';}catch{}
    if(!['system','ice','mint','amber','rose','ocean','dark','black','light'].includes(savedTheme))savedTheme='system';
    theme.prepend(new Option('跟随系统','system'));
    theme.value=savedTheme;
    const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(){
      document.documentElement.dataset.theme=theme.value==='system'?(systemTheme.matches?'black':'light'):theme.value;
      try{localStorage.setItem('pixelStudioWebTheme',theme.value);}catch{}
    }
    applyTheme();
    theme.addEventListener('change',applyTheme);
    const onSystemThemeChange=()=>{if(theme.value==='system')applyTheme();};
    systemTheme.addEventListener('change',onSystemThemeChange);
    window.addEventListener('pagehide',()=>systemTheme.removeEventListener('change',onSystemThemeChange),{once:true});
    const stage = document.querySelector('.preview-stage');
    const frame = make('div', 'ps-preview-frame');
    stage.append(frame);
    frame.append($('preview'));
    // All visible preview shapes share one SVG scene; no image mask or raster display.
    const previewSource=$('preview');
    previewSource.style.visibility='hidden';
    const boardSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    boardSvg.classList.add('ps-preview-board');
    boardSvg.setAttribute('aria-hidden','true');
    boardSvg.setAttribute('focusable','false');
    boardSvg.setAttribute('preserveAspectRatio','none');
    boardSvg.setAttribute('shape-rendering','geometricPrecision');
    frame.append(boardSvg);
    function boardElement(tag,attributes={}){
      const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
      for(const [name,value] of Object.entries(attributes))element.setAttribute(name,String(value));
      return element;
    }
    const boardIdle=boardElement('rect',{fill:'none',stroke:'var(--preview-idle,var(--line))','stroke-width':3});
    const boardGlow=boardElement('g',{fill:'none',stroke:'var(--preview-glow,var(--brand))'});
    const boardLayers=[];
    for(let stroke=10;stroke>=1;stroke--){
      const rect=boardElement('rect',{'stroke-width':stroke+2,'stroke-opacity':stroke===1?`var(--preview-core-opacity,${200/255})`:`var(--preview-glow-opacity,${15/255})`});
      if(stroke===1)rect.setAttribute('stroke','var(--preview-core,var(--brand))');
      boardGlow.append(rect);boardLayers.push(rect);
    }
    const boardScreen=boardElement('rect',{fill:'#000'});
    const boardCells=boardElement('g');
    boardSvg.append(boardIdle,boardGlow,boardScreen,boardCells);
    // This tiny canvas only reads the existing matrix colors, never paints the UI.
    const boardSampler=document.createElement('canvas');
    const boardSamplePaint=boardSampler.getContext('2d',{willReadFrequently:true});
    let boardGeometry=null,boardPixels=null,boardGeometryKey='',boardPaintRequest=0;
    let boardDisposed=false;
    let boardBreathStart=performance.now(),boardWasPlaying=false;
    let boardCellNodes=[],boardCellColors=[];
    function queueBoardPaint(){
      if(boardDisposed||boardPaintRequest)return;
      boardPaintRequest=requestAnimationFrame(()=>{boardPaintRequest=0;paintBoard();});
    }
    function captureBoardPixels(){
      if(boardDisposed||!boardGeometry||!previewSource.complete||!previewSource.naturalWidth)return;
      // A newly selected matrix must not sample a still-decoding previous size.
      if(previewSource.naturalWidth!==boardGeometry.columns||previewSource.naturalHeight!==boardGeometry.rows)return;
      boardSampler.width=boardGeometry.columns;
      boardSampler.height=boardGeometry.rows;
      boardSamplePaint.imageSmoothingEnabled=false;
      boardSamplePaint.drawImage(previewSource,0,0,boardSampler.width,boardSampler.height);
      boardPixels=boardSamplePaint.getImageData(0,0,boardSampler.width,boardSampler.height).data;
      queueBoardPaint();
    }
    previewSource.addEventListener('load',captureBoardPixels);
    const boardSourceObserver=new MutationObserver(()=>{
      if(!previewSource.getAttribute('src')){boardPixels=null;queueBoardPaint();}
    });
    boardSourceObserver.observe(previewSource,{attributes:true,attributeFilter:['src']});
    window.addEventListener('pagehide',()=>{
      boardDisposed=true;
      boardSourceObserver.disconnect();previewSource.removeEventListener('load',captureBoardPixels);
      if(boardPaintRequest)cancelAnimationFrame(boardPaintRequest);
    },{once:true});
    function boardRect(element,x,y,w,h,r){
      for(const [name,value] of Object.entries({x,y,width:w,height:h,rx:r,ry:r}))
        element.setAttribute(name,String(value));
    }
    function paintBoard(){
      if(!boardGeometry)return;
      const {columns,rows,pitch,inset,radius,screenRadius,width,height,cad}=boardGeometry;
      const key=[columns,rows,pitch,cad].join('|');
      if(key!==boardGeometryKey){
        boardGeometryKey=key;
        boardSvg.setAttribute('viewBox',`0 0 ${width+20} ${height+20}`);
        // A 1.5px outset equals half the 3px core: its inner edge touches black.
        boardRect(boardIdle,8.5,8.5,width+3,height+3,screenRadius+1.5);
        for(const rect of boardLayers)boardRect(rect,8.5,8.5,width+3,height+3,screenRadius+1.5);
        boardRect(boardScreen,10,10,width,height,screenRadius);
        if(boardCellNodes.length!==columns*rows){
          boardCells.replaceChildren();boardCellNodes=[];boardCellColors=[];
          const fragment=document.createDocumentFragment();
          for(let i=0;i<columns*rows;i++){
            const rect=boardElement('rect',{fill:'#000'});fragment.append(rect);boardCellNodes.push(rect);
          }
          boardCells.append(fragment);
        }
        for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
          boardRect(boardCellNodes[y*columns+x],10+2*inset+x*pitch,10+2*inset+y*pitch,
            pitch-2*inset,pitch-2*inset,cad?radius:0);
        }
      }
      const playing=frame.classList.contains('is-playing');
      if(playing&&!boardWasPlaying)boardBreathStart=performance.now();
      boardWasPlaying=playing;
      boardIdle.style.display=playing?'none':'';
      boardGlow.style.display=playing?'':'none';
      if(playing)boardGlow.setAttribute('opacity',String(
        .72+.28*Math.cos((performance.now()-boardBreathStart)*2*Math.PI/3800)));
      const validPixels=boardPixels&&boardPixels.length===columns*rows*4;
      for(let i=0;i<boardCellNodes.length;i++){
        const offset=i*4;
        const color=validPixels?`rgb(${boardPixels[offset]},${boardPixels[offset+1]},${boardPixels[offset+2]})`:'#000';
        if(color!==boardCellColors[i]){
          boardCellColors[i]=color;boardCellNodes[i].setAttribute('fill',color);
        }
      }
      if(playing&&!document.hidden)queueBoardPaint();
    }
    const boardVisibility=()=>queueBoardPaint();
    document.addEventListener('visibilitychange',boardVisibility);
    window.addEventListener('pagehide',()=>document.removeEventListener('visibilitychange',boardVisibility),{once:true});

    // A single native dialog owns opening, closing, focus and Escape handling.
    const dialog = make('dialog', 'ps-settings');
    dialog.id = 'studioSettings';
    dialog.setAttribute('aria-labelledby', 'studioSettingsTitle');
    const heading = make('header', 'ps-settings-heading');
    const title = make('h2', '', '设置'); title.id = 'studioSettingsTitle';
    const close = make('button', 'ps-close', '\u00d7'); close.type = 'button';
    close.setAttribute('aria-label', '关闭设置');
    const body = make('div', 'ps-settings-body');
    heading.append(title, close); dialog.append(heading, body); document.body.append(dialog);
    const gear = $('webSettingsToggle');
    gear.setAttribute('aria-controls', dialog.id);
    gear.setAttribute('aria-haspopup', 'dialog');
    gear.setAttribute('aria-expanded', 'false');
    gear.addEventListener('click', () => {
      if (dialog.open) return;
      dialog.showModal(); body.scrollTop = 0; gear.setAttribute('aria-expanded', 'true');
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { gear.setAttribute('aria-expanded', 'false'); gear.focus(); });
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
    });
    const group = name => {
      const node = make('fieldset', 'ps-settings-group');
      node.append(make('legend', '', name)); body.append(node); return node;
    };
    function row(parent, text, nodes, className = '') {
      const line = make('div', 'ps-setting-row');
      const label = make('label', 'ps-setting-label', text);
      const field = make('div', 'ps-setting-field ' + className);
      nodes.filter(Boolean).forEach(node => field.append(node));
      const first = field.querySelector('input:not([type=checkbox]),select,button');
      if (first?.id) label.htmlFor = first.id;
      line.append(label, field); parent.append(line);
    }
    // Move actual controls to preserve their existing transport handlers.
    const appearance = document.querySelector('.pixel-appearance');
    const appearanceButtons = appearance ? [...appearance.querySelectorAll('button')] : [];
    const interfaceGroup = group('界面设置');
    const language = make('select'); language.id = 'webLanguage';
    language.append(new Option('跟随系统', 'auto'), new Option('简体中文', 'zh-CN'), new Option('English', 'en'));
    language.value = document.documentElement.getAttribute('data-language-preference') || 'auto';
    row(interfaceGroup, '语言', [language]);
    row(interfaceGroup, '主题', [$('webTheme')]);
    const aboutButton = make('button', 'ps-about-button', '关于 Pixel Studio');
    aboutButton.type = 'button';

    const aboutDialog = make('dialog', 'ps-settings ps-media-dialog');
    aboutDialog.setAttribute('aria-labelledby', 'pixelStudioAboutTitle');
    const aboutHeading = make('header', 'ps-settings-heading');
    const aboutTitle = make('h2', '', 'Pixel Studio'); aboutTitle.id = 'pixelStudioAboutTitle';
    const aboutClose = make('button', 'ps-close', '\u00d7'); aboutClose.type = 'button';
    aboutClose.setAttribute('aria-label', '关闭');
    aboutHeading.append(aboutTitle, aboutClose);
    const aboutBody = make('div', 'ps-settings-body ps-about-body');
    aboutBody.setAttribute('data-update-ui', '');
    aboutDialog.append(aboutHeading, aboutBody); document.body.append(aboutDialog);
    function renderAbout() {
      const english = document.documentElement.lang === 'en';
      aboutBody.replaceChildren(
        make('p', '', window.pixelStudioDesktop?.edition
          ? (english ? `Version ${VERSION} · Desktop edition` : `版本 ${VERSION} · 桌面版`)
          : (english ? `Version ${VERSION} · Web edition` : `版本 ${VERSION} · 网页版`)),
        make('p', '', english ? 'Small pixels. Endless imagination.' : '方寸像素，无限想象。'),
        make('p', '', english ? 'A pixel animation studio for WLED. The web app and OpenRGB plugin share an animation library, with live previews, custom palettes and USB / Adalight or DDP output.' : '为 WLED 打造的像素动画工作室。网页版与 OpenRGB 插件共享动画库，支持实时预览、自定义配色，以及 USB / Adalight 和 DDP 输出。'),
        make('h3', '', english ? 'Authors & collaborators' : '作者与协作成员'),
        (() => {
          const authors = make('p', '', 'GPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra · GPT-6.1 Sol');
          authors.append(make('br'), document.createTextNode('OWEN'));
          return authors;
        })(),
        make('p', '', english ? 'Created through AI and human collaboration: AI collaborators contribute to design and development; OWEN guides the product, visual direction and device feedback.' : '由 AI 与人类共同创作：AI 协作成员参与设计和开发；OWEN 主导产品方向、视觉取舍与设备体验反馈。'),
        make('p', '', english ? 'Special thanks: David Wang' : '特别鸣谢：David Wang'),
        make('p', '', english ? 'Temperature monitoring: thanks to LibreHardwareMonitor and its contributors for the hardware monitoring library, and to PawnIO for low-level hardware access.' : '温度采集：感谢 LibreHardwareMonitor 及其贡献者提供硬件监控库，感谢 PawnIO 提供底层硬件访问支持。'),
        make('p', '', english ? 'Independent project. Thanks to the WLED, OpenRGB, Qt and Node.js communities. Not an official WLED or OpenRGB release.' : '独立项目，感谢 WLED、OpenRGB、Qt 与 Node.js 社区。本项目不是 WLED 或 OpenRGB 的官方发行版。')
      );
    }
    aboutButton.addEventListener('click', () => {
      renderAbout();
      if (!aboutDialog.open) aboutDialog.showModal();
    });
    aboutClose.addEventListener('click', () => aboutDialog.close());
    aboutDialog.addEventListener('close', () => aboutButton.focus());
    const output = group('WLED 输出设置');
    output.classList.add('ps-output-settings');
    const outputMode = $('controlMode');
    const savedMode = outputMode.value;
    outputMode.replaceChildren(new Option('USB / Adalight', 'serial'), new Option('DDP', 'ddp'));
    outputMode.value = savedMode === 'ddp' ? 'ddp' : 'serial';
    $('protocol').value = 'adalight';
    outputMode.dispatchEvent(new Event('change', { bubbles:true }));
    $('runtimeNotice').hidden = true;
    row(output, '输出方式', [$('controlMode')]);
    const ddpHelp=make('div','ps-help');ddpHelp.setAttribute('data-update-ui','');
    const ddpMessage=make('p'),ddpAction=make('button','ps-about-button');ddpAction.type='button';
    ddpHelp.append(ddpMessage,ddpAction);output.append(ddpHelp);
    const desktopBridge=window.pixelStudioDesktop?.ensureDdp;
    const servedBridge=!!document.querySelector('meta[name="pixel-bridge-token"]');
    let bridgeState='idle';
    function renderDdpHelp(){
      const en=document.documentElement.lang==='en';
      ddpHelp.hidden=outputMode.value!=='ddp';ddpAction.disabled=bridgeState==='starting';
      ddpAction.hidden=servedBridge||bridgeState==='ready';
      ddpAction.textContent=desktopBridge?(en?'Start / retry DDP service':'启动 / 重试 DDP 服务'):(en?'Open local DDP page':'打开本地 DDP 页面');
      ddpMessage.textContent=servedBridge||bridgeState==='ready'?(en?'DDP service ready. Enter your controller IP address before sending.':'DDP 服务已就绪，发送前请填写控制器 IP 地址。')
        :bridgeState==='starting'?(en?'Starting the built-in DDP service...':'正在启动内置 DDP 服务…')
        :desktopBridge?(en?'DDP uses the built-in runtime; no separate Node.js installation is needed. If startup fails, retry and check the diagnostic log.':'DDP 使用内置运行环境，无需另装 Node.js。启动失败时可重试并查看诊断日志。')
        :(en?'Run Start-Pixel-DDP.cmd from this web folder, then use the local page it opens. This file page cannot send DDP directly. Enter your controller IP and settings again on the local page. The launcher needs bundled or installed Node.js.':'运行本网页文件夹内的 Start-Pixel-DDP.cmd，再使用它打开的本地页面。本文件页面不能直接发送 DDP；请在本地页面重新填写控制器 IP 和参数。启动器需要内置或已安装的 Node.js。');
    }
    async function prepareDdp(){
      renderDdpHelp();if(!desktopBridge||outputMode.value!=='ddp'||bridgeState==='starting'||bridgeState==='ready')return;
      bridgeState='starting';renderDdpHelp();
      try{const result=await desktopBridge();if(!result.ok)throw new Error(result.error);bridgeState='ready';}
      catch(error){bridgeState='failed';$('log').textContent+='\nDDP: '+error.message;}
      renderDdpHelp();
    }
    ddpAction.addEventListener('click',()=>{if(desktopBridge)void prepareDdp();else window.open('http://127.0.0.1:8766/','_blank','noopener,noreferrer');});
    outputMode.addEventListener('change',()=>{void prepareDdp();});
    window.addEventListener('pixel-studio-language-change',renderDdpHelp);
    void prepareDdp();
    const portStatus = make('input'); portStatus.id = 'webPortStatus'; portStatus.readOnly = true;
    portStatus.value = '尚未连接'; $('quickSerialBtn').textContent = '选择串口';
    row(output, 'USB 端口', [portStatus, $('quickSerialBtn')], 'ps-input-action');
    $('readDeviceSizeBtn').textContent = '读取屏幕尺寸';
    row(output, 'IP 地址', [$('wledHost'), $('readDeviceSizeBtn')], 'ps-input-action');
    const size = make('div', 'ps-size-fields');
    for (const [name, id] of [['宽', 'matrixW'], ['高', 'matrixH']]) {
      const label = make('label', '', name); label.htmlFor = id; size.append(label, $(id));
    }
    const rounded = make('input'); rounded.type = 'checkbox';
    rounded.checked = $('preview').classList.contains('cad-pixels');
    const roundedLabel = make('label', 'ps-check');
    roundedLabel.append(rounded, document.createTextNode('圆角预览')); size.append(roundedLabel);
    row(output, '屏幕尺寸', [size]);
    row(output, '快捷尺寸', [...document.querySelectorAll('.presets button')], 'ps-presets');
    row(output, '排列', [$('mapping')]);
    const fpsRange = make('input'); fpsRange.type = 'range';
    fpsRange.min = '1'; fpsRange.max = '60'; fpsRange.step = '1'; fpsRange.value = $('fps').value;
    fpsRange.setAttribute('aria-label', '发送帧率');
    row(output, '帧率', [fpsRange, $('fps'), make('span', 'ps-unit', 'FPS')], 'ps-fps');
    fpsRange.addEventListener('input', () => { $('fps').value = fpsRange.value; $('fps').dispatchEvent(new Event('change', { bubbles:true })); });
    $('fps').addEventListener('input', () => { fpsRange.value = $('fps').value; });
    $('deviceInfo').classList.add('ps-help'); output.append($('deviceInfo'));
    if (!('serial' in navigator)) output.append(make('p', 'ps-help ps-warning', '此浏览器未提供 Web Serial。USB 输出请在支持该功能的桌面 Chrome 或 Edge 中打开。'));
    const desktopEdition = !!window.pixelStudioDesktop?.edition;
    const mediaInput = $('mediaFile'); mediaInput.hidden = true;
    const importButton = make('button', 'ps-import-button', '媒体'); importButton.type = 'button';
    importButton.id = 'psMediaToggle';
    const headerActions = make('div', 'ps-header-actions');
    gear.before(headerActions); headerActions.append(importButton, gear);
    let mediaDialog = null;
    let renderWebMedia = () => {};
    if (desktopEdition) {
      // The desktop media library owns the toggle and all media controls.
      // Keep the internal file input for runtime compatibility, not a second UI.
      document.body.append(mediaInput);
      $('scaleMode')?.closest('div')?.remove();
    } else {
      const media = group('本地媒体'); media.classList.add('ps-media-fields');
      const filePicker = make('div', 'ps-file-picker'); filePicker.setAttribute('data-update-ui', '');
      const chooseFile = make('button', 'ps-about-button'); chooseFile.type = 'button'; chooseFile.id = 'psChooseMedia';
      const fileName = make('span', 'ps-file-name'); fileName.id = 'psMediaFileName'; fileName.setAttribute('role', 'status');
      chooseFile.setAttribute('aria-describedby', fileName.id);
      filePicker.append(chooseFile, fileName, mediaInput);
      chooseFile.addEventListener('click', () => mediaInput.click());
      function renderMediaFile() {
        const en = document.documentElement.lang === 'en';
        chooseFile.textContent = mediaInput.files?.length ? (en ? 'Change file' : '更换文件') : (en ? 'Choose file' : '选择文件');
        fileName.textContent = mediaInput.files?.[0]?.name || (en ? 'No file selected' : '尚未选择文件');
      }
      renderWebMedia = () => {
        renderMediaFile();
        importButton.textContent = document.documentElement.lang === 'en' ? 'Media' : '媒体';
      };
      mediaInput.addEventListener('change', renderMediaFile); queueMicrotask(renderWebMedia);
      row(media, '图片 / 视频', [filePicker]); row(media, '画面适配', [$('scaleMode')]);
      mediaDialog = make('dialog', 'ps-settings ps-media-dialog'); mediaDialog.classList.add('ps-import-dialog');
      mediaDialog.setAttribute('aria-labelledby', 'mediaDialogTitle');
      const mediaHeading = make('header', 'ps-settings-heading');
      const mediaTitle = make('h2', '', '媒体'); mediaTitle.id = 'mediaDialogTitle';
      const mediaClose = make('button', 'ps-close', '\u00d7'); mediaClose.type = 'button';
      mediaClose.setAttribute('aria-label', '关闭媒体导入');
      mediaHeading.append(mediaTitle, mediaClose);
      const mediaBody = make('div', 'ps-settings-body');
      mediaBody.append(make('p', 'ps-media-description', '选择本地图片或视频，在当前像素屏尺寸下预览和播放。'), media);
      mediaDialog.append(mediaHeading, mediaBody); document.body.append(mediaDialog);
      importButton.setAttribute('data-update-ui', ''); importButton.setAttribute('aria-haspopup', 'dialog');
      importButton.addEventListener('click', () => {
        renderMediaFile(); if (!mediaDialog.open) mediaDialog.showModal(); scheduleShuffle();
      });
      mediaClose.addEventListener('click', () => mediaDialog.close());
      mediaDialog.addEventListener('close', () => importButton.focus());
    }
    const advanced = make('details', 'ps-advanced');
    advanced.hidden = true;
    advanced.append(make('summary', '', '高级设置与连接诊断')); body.append(advanced);
    row(output, '颜色还原', [$('colorMode')]);
    // Retain the internal value for the shared renderer and transport code,
    // without exposing a manual Gamma control in the settings dialog.
    $('colorGamma').hidden = true;
    output.append($('deviceInfo'));
    const safe = make('label', 'ps-check'); safe.append($('safeMode'), document.createTextNode('自动限制帧率'));
    row(advanced, '稳定优先', [safe]); row(advanced, 'USB 协议', [$('protocol')]);
    row(advanced, '波特率', [$('baudRate')]); row(advanced, 'HTTP 路径', [$('httpPath')]);
    row(advanced, '连接操作', ['connectBtn','disconnectBtn','testHttpBtn','testSerialBtn'].map($), 'ps-buttons');
    if ($('serialDiagnostic')) advanced.append($('serialDiagnostic'));
    row(advanced, '测试色', ['testRedBtn','testGreenBtn','testBlueBtn','testWhiteBtn','testBlackBtn'].map($), 'ps-buttons');
    row(advanced, '预览操作', [$('previewOnlyBtn'), $('clearPreviewBtn')], 'ps-buttons');
    advanced.append($('log'));
    const updateArea = make('fieldset', 'ps-settings-group');
    updateArea.id = 'psSoftwareUpdates';
    updateArea.setAttribute('data-update-ui', '');
    const updateLegend = make('legend');
    const updateActions = make('div', 'ps-update-actions');
    const updateButton = make('button', 'ps-about-button'); updateButton.type = 'button';
    const updateStatus = make('p', 'ps-help'); updateStatus.setAttribute('role', 'status');
    const updateNotes = make('p', 'ps-help'); updateNotes.style.whiteSpace = 'pre-wrap';
    const updateDetails = make('details', 'ps-update-details');
    const updateSummary = make('summary');
    updateDetails.append(updateSummary, updateNotes);
    const releaseLink = make('a');
    releaseLink.href = 'https://github.com/OW3N-HE/Pixel-Studio/releases';
    releaseLink.target = '_blank'; releaseLink.rel = 'noopener noreferrer';
    releaseLink.style.color = 'inherit';
    const installerButton = make('button', 'ps-about-button'); installerButton.type = 'button';
    const installerStatus = make('p', 'ps-help');
    const packageLabel = make('label'); packageLabel.htmlFor = 'psUpdatePackage';
    const packageSelect = make('select'); packageSelect.id = 'psUpdatePackage';
    packageSelect.append(new Option('', 'installer'), new Option('', 'web'), new Option('', 'source'));
    packageSelect.value = window.pixelStudioDesktop?.edition ? 'installer' : 'web';
    let packages = {}, downloadOpened = false;
    let nativeUpdateState='idle',nativeUpdateVersion='',nativePercent=0;
    const nativeUpdateStatus=make('p','ps-help');nativeUpdateStatus.setAttribute('role','status');
    const nativeInstall=make('button','ps-about-button');nativeInstall.type='button';
    function renderNativeUpdate(){
      const en=document.documentElement.lang==='en';
      const messages={idle:'',downloading:en?`Downloading and verifying installer: ${nativePercent}%`:`正在下载并校验安装包：${nativePercent}%`,ready:en?`Version ${nativeUpdateVersion} downloaded; SHA-256 matches the GitHub asset digest. Ready for your installation confirmation.`:`版本 ${nativeUpdateVersion} 已下载，SHA-256 与 GitHub 附件摘要一致，等待你确认安装。`,failed:en?'Update download or installation failed. Check the diagnostic log, then retry or use the official release page.':'更新下载或安装失败，请查看诊断日志后重试，或使用官方发布页。',installing:en?'Waiting for installation confirmation...':'等待安装确认…'};
      nativeUpdateStatus.textContent=messages[nativeUpdateState];nativeUpdateStatus.hidden=nativeUpdateState==='idle';
      nativeInstall.textContent=en?'Install downloaded update':'安装已下载的更新';
      nativeInstall.hidden=!window.pixelStudioDesktop?.installUpdate||!nativeUpdateVersion;
      nativeInstall.disabled=nativeUpdateState!=='ready';
    }
    window.addEventListener('pixel-studio-update-progress',event=>{
      if(nativeUpdateState!=='downloading')return;
      const {received,total}=event.detail||{};
      if(Number.isFinite(received)&&total>0)nativePercent=Math.max(0,Math.min(99,Math.floor(received/total*100)));
      renderNativeUpdate();
    });
    nativeInstall.addEventListener('click',async()=>{
      nativeUpdateState='installing';renderNativeUpdate();
      try{const result=await window.pixelStudioDesktop.installUpdate();if(!result.ok)throw new Error(result.error);nativeUpdateState='ready';}
      catch(error){nativeUpdateState='failed';$('log').textContent+='\nUpdate: '+error.message;}
      renderNativeUpdate();
    });
    let updateState = 'idle', remoteVersion = '', releaseNotes = '', installerUrl = '';
    const downloadDialog=make('dialog','ps-settings');
    const downloadHeading=make('header','ps-settings-heading');
    const downloadTitle=make('h2');
    const downloadClose=make('button','ps-close','×');downloadClose.type='button';
    downloadHeading.append(downloadTitle,downloadClose);
    const downloadBody=make('div','ps-settings-body');
    const downloadDescription=make('p','ps-help');
    const downloadActions=make('div','ps-update-actions');
    const downloadCancel=make('button','ps-about-button'),downloadConfirm=make('button','ps-about-button');
    downloadCancel.type=downloadConfirm.type='button';
    downloadActions.append(downloadCancel,downloadConfirm);downloadBody.append(downloadDescription,downloadActions);
    downloadDialog.append(downloadHeading,downloadBody);downloadDialog.setAttribute('data-update-ui','');document.body.append(downloadDialog);
    let pendingDownload=null;
    function renderDownload(){
      if(!pendingDownload)return;
      const en=document.documentElement.lang==='en';
      downloadTitle.textContent=en?'Download update':'下载更新';
      downloadClose.setAttribute('aria-label',en?'Close':'关闭');
      downloadCancel.textContent=en?'Cancel':'取消';downloadConfirm.textContent=en?'Continue to download':'继续下载';
      const steps=pendingDownload.kind==='installer'
        ?(en?'Download first. Before installing, save your work and fully quit Desktop and OpenRGB from the tray. Allow Setup to close Pixel Studio processes if prompted; never skip locked files or end unrelated Node.js processes. Keep the same installation scope and personal settings. Nothing is installed automatically.':'先下载。安装前保存工作，并从托盘完全退出桌面版和 OpenRGB。如安装程序提示关闭 Pixel Studio 进程，请允许；不要跳过占用文件，也不要结束其他软件的 Node.js。保持原安装范围并保留个人设置。不会自动安装。')
        :pendingDownload.kind==='web'
          ?(en?'Extract into a new folder. Use the included launcher when a bundled runtime is available; a source-only web ZIP may require Node.js. Do not overwrite a running web service. The new location may require selecting your USB port again.':'解压到新文件夹。带运行环境的包使用内置启动器；不含运行环境的网页 ZIP 可能需要 Node.js。不要覆盖正在运行的网页服务。更换位置后可能需要重新选择串口。')
          :(en?'This is developer source, not an installer. Build tools and dependencies are not installed automatically.':'这是开发源码，不是安装程序；不会自动安装构建工具或依赖。');
      downloadDescription.textContent=pendingDownload.name+'\n\n'+steps;
      downloadDescription.style.whiteSpace='pre-line';
    }
    downloadClose.addEventListener('click',()=>downloadDialog.close());
    downloadCancel.addEventListener('click',()=>downloadDialog.close());
    downloadDialog.addEventListener('close',()=>{pendingDownload=null;});
    downloadConfirm.addEventListener('click',async()=>{
      if(!pendingDownload)return;
      if(pendingDownload.kind==='installer'&&window.pixelStudioDesktop?.downloadUpdate){
        const selectedVersion=remoteVersion;
        downloadDialog.close();nativeUpdateState='downloading';nativeUpdateVersion='';nativePercent=0;renderUpdate();
        try{const result=await window.pixelStudioDesktop.downloadUpdate(selectedVersion);if(!result.ok)throw new Error(result.error);nativeUpdateVersion=result.version;nativeUpdateState='ready';}
        catch(error){nativeUpdateState='failed';$('log').textContent+='\nUpdate: '+error.message;}
        renderUpdate();return;
      }
      window.open(pendingDownload.url,'_blank','noopener,noreferrer');
      downloadDialog.close();downloadOpened=true;renderUpdate();
    });
    packageSelect.addEventListener('change', () => { downloadOpened = false; renderUpdate(); });
    installerButton.addEventListener('click', () => {
      if (installerUrl && ['latest', 'newer'].includes(updateState)) {
        pendingDownload={...packages[packageSelect.value],kind:packageSelect.value};
        renderDownload();downloadDialog.showModal();
      }
    });
    function renderUpdate() {
      const en = document.documentElement.lang === 'en';
      updateLegend.textContent = en ? 'Software updates' : '软件更新';
      updateSummary.textContent = en ? `Release notes (original text)${remoteVersion ? ' · ' + remoteVersion : ''}` : `更新说明（发布者原文）${remoteVersion ? ' · ' + remoteVersion : ''}`;
      updateButton.textContent = en ? 'Check for updates' : '检查更新';
      packageLabel.textContent = en ? 'Download package' : '下载类型';
      const captions = en ? ['Windows 3-in-1 installer (recommended)', 'Web edition ZIP', 'Source code ZIP (developers)']
        : ['Windows 三合一安装包（推荐）', '网页版 ZIP', '源码 ZIP（开发者）'];
      [...packageSelect.options].forEach((option, i) => { option.textContent = captions[i]; });
      const messages = {
        idle: en ? `Current version: ${VERSION}. Updates are installed manually.` : `当前版本：${VERSION}。更新需手动安装。`,
        checking: en ? 'Checking GitHub...' : '正在检查 GitHub...',
        empty: en ? 'No stable release has been published yet.' : '尚未发布正式版本。',
        failed: en ? 'Unable to check. Check your connection or GitHub rate limits, then retry.' : '检查失败，请检查网络或稍后重试（可能触发 GitHub 请求限额）。',
        limited: en ? 'GitHub denied the request or its rate limit was reached. Try again later or open the release page.' : 'GitHub 拒绝请求或已达到请求限额，请稍后重试或打开发布页。',
        timeout: en ? 'The update check timed out. Try again or open the release page.' : '检查更新超时，请重试或打开发布页。',
        invalid: en ? 'The release version is not supported. Please check the release page.' : '发布版本号格式无法识别，请查看发布页面。',
        latest: en ? `You are up to date (${VERSION}).` : `当前已是最新版本（${VERSION}）。`,
        ahead: en ? `Local version ${VERSION} is newer than published version ${remoteVersion}. No downgrade is offered.` : `本地版本 ${VERSION} 高于已发布版本 ${remoteVersion}，不提供降级安装。`,
        newer: en ? `New version: ${remoteVersion}. Back up your files before replacing them; firmware is not updated automatically.` : `发现新版本：${remoteVersion}。替换前请备份文件；不会自动更新固件。`
      };
      updateStatus.textContent = messages[updateState];
      updateNotes.textContent = releaseNotes;
      updateNotes.hidden = !releaseNotes;
      updateDetails.hidden = !releaseNotes;
      releaseLink.textContent = en ? 'Open official releases / download' : '打开官方发布页 / 下载';
      updateButton.disabled = updateState === 'checking';
      const selected = packages[packageSelect.value];
      const available = ['latest', 'newer'].includes(updateState);
      installerUrl = available && selected ? selected.url : '';
      installerButton.textContent = en ? 'Download selected package' : '下载所选版本';
      installerButton.disabled = !installerUrl || ['downloading','installing'].includes(nativeUpdateState);
      const instructions = {
        installer: en ? 'Includes Desktop, Web and the OpenRGB plugin. The required Node.js runtime is bundled. Save your work, quit Desktop and OpenRGB from the tray, then run the installer. Keep personal settings when prompted; firmware is not flashed.' : '包含桌面版、网页版和 OpenRGB 插件，已内置所需 Node.js。保存工作并从托盘退出桌面版及 OpenRGB 后运行安装包；如提示处理个人设置，请选择保留。不会刷写固件。',
        web: en ? 'Extract to a new folder and open index.html. Browser USB output does not require Node.js. Network DDP requires the local bridge; use the Windows installer for bundled dependencies. A new folder may require selecting your USB device again.' : '解压到新文件夹并打开 index.html。浏览器 USB 输出无需 Node.js；网络 DDP 需要本地桥接服务，建议使用内置依赖的 Windows 安装包。新文件夹可能需要重新选择 USB 设备。',
        source: en ? 'For developers, not a ready-to-run installation. Build tools and dependencies must be configured separately.' : '供开发者使用，不是可直接安装的软件，需要自行配置构建工具及依赖。'
      };
      installerStatus.textContent = (installerUrl
        ? `${selected.name} · ${(selected.size / 1048576).toFixed(1)} MB\n${instructions[packageSelect.value]}`
        : available ? (en ? 'This package has not been attached to the release. Choose another package or open the release page.' : '此发布尚未附加所选文件，请选择其他类型或打开发布页。')
        : updateState === 'ahead' ? (en ? 'Downloads are disabled to avoid downgrading this version.' : '为避免降级，已禁用下载。')
        : (en ? 'Check for updates first. Only matching files from the official repository are offered.' : '请先检查更新，仅提供官方仓库中与版本匹配的文件。'))
        + (downloadOpened ? (en ? '\nDownload link opened. Check your browser downloads; installation has not started.' : '\n已打开下载链接，请查看浏览器下载列表；尚未开始安装。') : '');
      installerStatus.style.whiteSpace = 'pre-line';
      installerStatus.hidden = false;
      renderNativeUpdate();
    }
    updateButton.addEventListener('click', async () => {
      if (updateState === 'checking') return;
      updateState = 'checking'; remoteVersion = ''; releaseNotes = ''; installerUrl = ''; packages = {}; downloadOpened = false; updateDetails.open = false; renderUpdate();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('https://api.github.com/repos/OW3N-HE/Pixel-Studio/releases/latest', {
          signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (response.status === 404) updateState = 'empty';
        else if ([403, 429].includes(response.status)) updateState = 'limited';
        else {
          if (!response.ok) throw new Error('HTTP error');
          const release = await response.json();
          const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(release.tag_name || '');
          if (!match || !match.slice(1).every(part => Number.isSafeInteger(Number(part))) || release.draft || release.prerelease) updateState = 'invalid';
          else {
            remoteVersion = match.slice(1).join('.');
            const parts = match.slice(1).map(Number), current = VERSION.split('.').map(Number);
            const differing = parts.findIndex((part, i) => part !== current[i]);
            updateState = differing < 0 ? 'latest' : parts[differing] > current[differing] ? 'newer' : 'ahead';
            const names = { installer: `PixelStudio-Setup-${remoteVersion}.exe`, web: `PixelStudio-Web-${remoteVersion}.zip`, source: `PixelStudio-Source-${remoteVersion}.zip` };
            for (const [kind, name] of Object.entries(names)) {
              const url = `https://github.com/OW3N-HE/Pixel-Studio/releases/download/${release.tag_name}/${name}`;
              const asset = Array.isArray(release.assets) && release.assets.find(item => item && item.name === name && item.state === 'uploaded' && Number.isSafeInteger(item.size) && item.size > 0 && item.browser_download_url === url);
              if (asset) packages[kind] = { name, url, size: asset.size };
            }
            releaseNotes = typeof release.body === 'string' ? release.body.slice(0, 6000) : '';
          }
        }
      } catch { updateState = controller.signal.aborted ? 'timeout' : 'failed'; }
      finally { clearTimeout(timeout); renderUpdate(); }
    });
    updateActions.append(updateButton, installerButton);
    updateArea.append(updateLegend, updateStatus, packageLabel, packageSelect, updateActions, installerStatus, nativeUpdateStatus, nativeInstall, updateDetails, releaseLink);
    body.append(updateArea, aboutButton);
    queueMicrotask(renderUpdate);
    // Retain IDs used by the renderer even when their old presentation is gone.
    const retained = make('div'); retained.hidden = true;
    ['pixelCount','screenResolution','colorGamma'].forEach(id => { if ($(id)) retained.append($(id)); });
    document.body.append(retained);
    $('psControlBank').remove(); appearance?.remove();
    rounded.addEventListener('change', () => { appearanceButtons[rounded.checked ? 0 : 1]?.click(); updateBoardGeometry(); });

    const gallery = $('animationGallery');
    const well = make('div', 'ps-library-well'); gallery.before(well); well.append(gallery);
    const empty = make('p', 'ps-empty'); empty.hidden = true; well.append(empty);
    empty.setAttribute('data-update-ui','');
    const emptyText=make('span'),clearFilter=make('button','ps-clear-filter');
    clearFilter.type='button';empty.append(emptyText,clearFilter);
    function renderEmptyState(){
      const english=document.documentElement.lang==='en';
      emptyText.textContent=english?'No animations match your filters.':'没有符合条件的动画';
      clearFilter.textContent=english?'Clear filters':'清除筛选';
    }
    renderEmptyState();
    const category = $('libraryCategory'); category.add(new Option('收藏', 'favorites'), 1);
    let saved = []; try { saved = JSON.parse(localStorage.getItem('pixel-studio-favorites') || '[]'); } catch {}
    const favoriteIds = Array.isArray(saved) ? saved : [];
    const favorites = new Set(favoriteIds);
    const cards = [...gallery.querySelectorAll('.animation-card')].map(button => {
      const mode = button.dataset.mode, name = button.querySelector('.animation-title').textContent.trim();
      if (favorites.has(name)) { favorites.delete(name); favorites.add(mode); }
      const tile = make('article', 'ps-animation-tile'); button.before(tile); tile.append(button);
      const heart = make('button', 'ps-favorite'); heart.type = 'button';
      heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
      tile.append(heart);
      heart.addEventListener('click', () => {
        if (favorites.has(mode)) favorites.delete(mode); else favorites.add(mode);
        try { localStorage.setItem('pixel-studio-favorites', JSON.stringify([...favorites])); } catch {}
        syncGallery();
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          heart.querySelector('svg')?.animate([
            { transform:'scale(1)' },
            { transform:'scale(.86)', offset:.25 },
            { transform:'scale(1.12)', offset:.65 },
            { transform:'scale(1)' }
          ], { duration:260, easing:'cubic-bezier(.2,.7,.3,1)' });
        }
      });
      return { button, tile, heart, mode, name };
    });
    let pendingGalleryEdges = false, galleryEdgesDisposed = false;
    function updateGalleryEdges() {
      const remaining = gallery.scrollHeight - gallery.clientHeight - gallery.scrollTop;
      gallery.style.setProperty('--gallery-fade-top', gallery.scrollTop > 1 ? '12px' : '0px');
      gallery.style.setProperty('--gallery-fade-bottom', remaining > 1 ? '12px' : '0px');
    }
    function scheduleGalleryEdges() {
      if (pendingGalleryEdges) return;
      pendingGalleryEdges = true;
      // Reconcile DOM filtering before paint, rather than one animation frame later.
      queueMicrotask(() => {
        pendingGalleryEdges = false;
        if (galleryEdgesDisposed) return;
        updateGalleryEdges();
      });
    }
    gallery.addEventListener('scroll', updateGalleryEdges, { passive:true });
    // Mask changes do not resize the scrollport, so delivery can update it directly.
    const galleryEdgeResize = new ResizeObserver(updateGalleryEdges);
    galleryEdgeResize.observe(gallery);
    for (const item of cards) galleryEdgeResize.observe(item.tile);
    const galleryEdgeMutation = new MutationObserver(scheduleGalleryEdges);
    galleryEdgeMutation.observe(gallery, {
      subtree:true, childList:true, characterData:true,
      attributes:true, attributeFilter:['hidden']
    });
    window.addEventListener('pagehide', () => {
      galleryEdgesDisposed = true;
      galleryEdgeResize.disconnect();
      galleryEdgeMutation.disconnect();
      gallery.removeEventListener('scroll', updateGalleryEdges);
    }, { once:true });
    function syncGallery() {
      const search = $('librarySearch').value.trim().toLocaleLowerCase();
      gallery.classList.toggle('is-searching',search.length>0);
      for (const item of cards) {
        const favorite = favorites.has(item.mode);
        item.heart.setAttribute('aria-pressed', String(favorite));
        item.heart.setAttribute('aria-label', (favorite ? '取消收藏：' : '收藏：') + item.name);
        item.tile.hidden = category.value === 'favorites' ? !favorite || !item.name.toLocaleLowerCase().includes(search) : item.button.hidden;
      }
      empty.hidden = cards.some(item => !item.tile.hidden);
      scheduleGalleryEdges();
    }
    category.addEventListener('change', event => {
      if (category.value !== 'favorites') return;
      event.stopImmediatePropagation(); window.pixelStudioSetAnimationFilter('all'); syncGallery(); gallery.scrollTop = 0;
    }, true);
    category.addEventListener('change', () => { syncGallery(); gallery.scrollTop = 0; });
    clearFilter.addEventListener('click',()=>{
      category.value='all';$('librarySearch').value='';
      category.dispatchEvent(new Event('change',{bubbles:true}));
      $('librarySearch').dispatchEvent(new Event('input',{bubbles:true}));
      $('librarySearch').dispatchEvent(new Event('change',{bubbles:true}));
      gallery.scrollTop=0;$('librarySearch').focus();
    });
    $('librarySearch').addEventListener('input', syncGallery);
    function revealSelectedCard(){
      const selected=cards.find(item=>item.mode===$('animationMode').value&&!item.tile.hidden);
      if(!selected||gallery.clientHeight<=0)return;
      const viewport=gallery.getBoundingClientRect(),card=selected.tile.getBoundingClientRect();
      // Leave room for both the 12px fade and the 5px outer focus ring.
      const top=viewport.top+gallery.clientTop+17;
      const bottom=viewport.top+gallery.clientTop+gallery.clientHeight-17;
      // Only move this scrollport, and leave already-visible selections in place.
      if(card.height>bottom-top||card.top<top)gallery.scrollTop+=card.top-top;
      else if(card.bottom>bottom)gallery.scrollTop+=card.bottom-bottom;
      updateGalleryEdges();
    }
    $('animationMode').addEventListener('change',()=>{syncGallery();revealSelectedCard();}); syncGallery();
    $('randomAnimationBtn').hidden = true;
    const shuffle = make('label', 'ps-shuffle'), shuffleCheck = make('input'); shuffleCheck.type = 'checkbox'; shuffleCheck.id = 'psShuffleEnabled';
    shuffle.append(shuffleCheck, document.createTextNode('随机播放'));
    const interval = make('input'); interval.type = 'number'; interval.id = 'psShuffleInterval'; interval.min = '3'; interval.max = '3600'; interval.step = '1'; interval.value = '20'; interval.disabled = true;
    interval.setAttribute('aria-label', '随机播放间隔，秒');
    const shuffleGroup = make('div', 'ps-shuffle-group'); shuffleGroup.append(shuffle, interval, make('span', 'ps-unit', '秒'));
    document.querySelector('.library-toolbar').append(shuffleGroup);
    const playbackPolicy = window.PixelStudioBrowserPlayback.policy;
    let shuffleTimer;
    function scheduleShuffle() {
      clearInterval(shuffleTimer);
      if(boardDisposed)return;
      const suspended=mediaDialog?.open||$('animationMode').value==='file';
      // Temporarily suspend the controls without changing the saved preference.
      shuffleCheck.disabled=suspended;
      interval.disabled = !shuffleCheck.checked||suspended;
      if (!shuffleCheck.checked||suspended) return;
      const seconds = playbackPolicy.shuffleSeconds(interval.value); interval.value = String(seconds);
      shuffleTimer = setInterval(() => {
        if (!api.playing||mediaDialog?.open||$('animationMode').value==='file') return;
        const next = playbackPolicy.chooseNext(cards.filter(item => !item.tile.hidden).map(item => item.mode), $('animationMode').value);
        if (next) cards.find(item => item.mode === next).button.click();
      }, seconds * 1000);
    }
    shuffleCheck.addEventListener('change', scheduleShuffle); interval.addEventListener('change', scheduleShuffle);
    mediaDialog?.addEventListener('close',scheduleShuffle);
    $('animationMode').addEventListener('change',scheduleShuffle);
    $('mediaFile').addEventListener('change',scheduleShuffle);
    try {
      const state=JSON.parse(localStorage.getItem('pixelStudioShuffle')||'null');
      if(state){shuffleCheck.checked=state.enabled===true;interval.value=String(playbackPolicy.shuffleSeconds(state.seconds));if([...category.options].some(o=>o.value===state.category)){category.value=state.category;category.dispatchEvent(new Event('change',{bubbles:true}));} $('librarySearch').value=String(state.search||'');$('librarySearch').dispatchEvent(new Event('input',{bubbles:true}));scheduleShuffle();}
    }catch{}
    const saveShuffle=()=>{try{localStorage.setItem('pixelStudioShuffle',JSON.stringify({enabled:shuffleCheck.checked,seconds:interval.value,category:category.value,search:$('librarySearch').value}));}catch{}};
    for(const element of [shuffleCheck,interval,category,$('librarySearch')])element.addEventListener('change',saveShuffle);
    const speedNumber = make('input'); speedNumber.id = 'animationSpeedNumber'; speedNumber.type = 'number';
    for (const key of ['min','max','step','value']) speedNumber[key] = $('animationSpeed')[key];
    speedNumber.setAttribute('aria-label', '动画速度倍数'); $('animationSpeedValue').hidden = true;
    document.querySelector('.speed-control').append(speedNumber);
    document.querySelector('label[for="animationSpeed"]').textContent = '速度';
    document.querySelector('label[for="brightness"]').textContent = '亮度';
    speedNumber.addEventListener('input', () => {
      if (!speedNumber.validity.valid || !speedNumber.value) return;
      $('animationSpeed').value = speedNumber.value; $('animationSpeed').dispatchEvent(new Event('input', { bubbles:true }));
    });
    $('animationSpeed').addEventListener('input', () => { speedNumber.value = Number($('animationSpeed').value).toFixed(2); });
    const clock = $('clockStyling'), font = $('clockFont'), palette = $('clockPalette');
    clock.replaceChildren(); row(clock, '样式', [font]); row(clock, '配色', [palette]);
    const fontNames = { rounded:'圆角像素', classic:'经典点阵', segment:'七段数码' };
    const paletteNames = { ice:'冰蓝', mint:'薄荷', amber:'琥珀', rose:'樱粉', violet:'紫晶' };
    [...font.options].forEach(option => { option.textContent = fontNames[option.value] || option.textContent; });
    [...palette.options].forEach(option => { option.textContent = paletteNames[option.value] || option.textContent; });
    const custom = make('button', 'ps-custom-colors', '自定义配色'); custom.type = 'button';
    palette.parentElement.append(custom);
    const colorsDialog = make('dialog', 'ps-settings ps-media-dialog');
    colorsDialog.setAttribute('aria-labelledby', 'clockColorsTitle');
    const colorsHeading = make('header', 'ps-settings-heading');
    const colorsTitle = make('h2', '', '动态时钟 · 自定义配色'); colorsTitle.id = 'clockColorsTitle';
    const colorsClose = make('button', 'ps-close', '\u00d7'); colorsClose.type = 'button';
    colorsClose.setAttribute('aria-label', '关闭配色');
    colorsHeading.append(colorsTitle, colorsClose);
    const colorsBody = make('div', 'ps-settings-body');
    colorsDialog.append(colorsHeading, colorsBody); document.body.append(colorsDialog);
    let customColors = ['#e5f5ff','#6ad3f5','#356e88'];
    try {
      const saved = JSON.parse(localStorage.getItem('pixelStudioClockCustomColors') || 'null');
      if (Array.isArray(saved) && saved.length === 3 && saved.every(value => /^#[0-9a-f]{6}$/i.test(value))) customColors = saved;
    } catch {}
    const customOption = new Option('自定义', 'custom:' + customColors.join(':')); palette.add(customOption);
    ['小时','分钟','分隔线'].forEach((name, index) => {
      const input = make('input'); input.type = 'color'; input.value = customColors[index]; input.id = 'clockCustomColor' + index;
      row(colorsBody, name, [input]);
      input.addEventListener('input', () => {
        customColors[index] = input.value;
        customOption.value = 'custom:' + customColors.join(':'); palette.value = customOption.value;
        try { localStorage.setItem('pixelStudioClockCustomColors', JSON.stringify(customColors)); } catch {}
        palette.dispatchEvent(new Event('change', { bubbles:true }));
      });
    });
    custom.addEventListener('click', () => { if (!colorsDialog.open) colorsDialog.showModal(); });
    colorsClose.addEventListener('click', () => colorsDialog.close());
    colorsDialog.addEventListener('close', () => custom.focus());
    const controls = document.querySelector('.studio-controls');
    function syncControlLayout() {
      const thermal = Object.hasOwn(window.PixelStudioTemperature?.modes || {}, $('animationMode').value);
      controls.classList.toggle('ps-clock-controls', $('animationMode').value === 'clock' || thermal);
      controls.classList.toggle('ps-thermal-controls', thermal);
    }
    $('animationMode').addEventListener('change', syncControlLayout);
    $('mediaFile').addEventListener('change', syncControlLayout);
    syncControlLayout();
    speedNumber.value = Number($('animationSpeed').value).toFixed(2);
    speedNumber.addEventListener('blur', () => { speedNumber.value = Number($('animationSpeed').value).toFixed(2); });
    const footer = make('div', 'ps-playback-bar'), toggle = make('button', 'ps-play-toggle'); toggle.type = 'button';
    const messages = make('div', 'ps-playback-messages'); messages.append($('status'), $('runtimeNotice'));
    footer.append(toggle, messages, $('streamStats')); controls.after(footer);
    $('startBtn').hidden = true; $('stopBtn').hidden = true;
    document.querySelector('.playback-actions').hidden = true;
    document.querySelector('.now-playing').hidden = true; $('progress').hidden = true;
    let lastPlaying, lastPlaybackLanguage;
    function syncPlayback() {
      const playing = api.playing;
      const english = document.documentElement.lang === 'en';
      const output=api.outputStatus;
      const transports={usb:'USB',ddp:'IP / DDP',ws:'IP / WebSocket',http:'IP / HTTP',auto:english?'IP / Auto':'IP / 自动'};
      const states=english?{disconnected:'Not connected',unverified:'Open, not verified',connected:'Connected',sending:'Sending',idle:'Awaiting playback',unavailable:'Bridge unavailable'}:{disconnected:'未连接',unverified:'已打开，待验证',connected:'已连接',sending:'发送中',idle:'待发送',unavailable:'本地服务未启动'};
      const connectionText=transports[output.transport]+' · '+states[output.state];
      if (!playing) {
        const stats = $('streamStats');
        const previewLabel = (english ? 'Preview' : '预览')+' · '+connectionText;
        if (stats.textContent !== previewLabel) stats.textContent = previewLabel;
      }
      if (lastPlaying !== playing) {
        lastPlaying = playing;
        toggle.innerHTML = playing ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 3 15 9-15 9Z"/></svg>';
        toggle.classList.toggle('is-playing', playing); frame.classList.toggle('is-playing', playing); queueBoardPaint();
        lastPlaybackLanguage = undefined;
      }
      if (lastPlaybackLanguage !== english) {
        lastPlaybackLanguage = english;
        toggle.setAttribute('aria-label', playing ? (english ? 'Stop' : '停止播放') : (english ? 'Play' : '播放'));
        toggle.title = playing ? (english ? 'Stop' : '停止播放') : (english ? 'Send animation to the selected device' : '向所选设备发送动画');
      }
      const status = api.serialConnected ? (english ? 'USB connected' : 'USB 已连接') : (english ? 'Not connected' : '尚未连接');
      if (portStatus.value !== status) portStatus.value = status;
    }
    toggle.addEventListener('click', () => {
      (api.playing ? $('stopBtn') : $('startBtn')).click();
      syncPlayback();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        toggle.querySelector('svg')?.animate([
          { opacity:.35, transform:'scale(.88)' },
          { opacity:1, transform:'scale(1)' }
        ], { duration:180, easing:'cubic-bezier(.2,.7,.3,1)' });
      }
    });
    toggle.setAttribute('data-update-ui', '');
    $('controlMode').addEventListener('change',syncPlayback);
    window.addEventListener('pixel-studio-language-change', () => {
      renderEmptyState();
      renderUpdate();
      renderWebMedia();
      syncPlayback();
      if(downloadDialog.open)renderDownload();
      if (aboutDialog.open) renderAbout();
    });
    syncPlayback();
    const stateTimer = setInterval(syncPlayback, 200);
    window.addEventListener('pagehide', () => { clearInterval(stateTimer); clearInterval(shuffleTimer); });
    function updateBoardGeometry() {
      const preview=$('preview');
      const columns=Math.max(1,Number($('matrixW').value));
      const rows=Math.max(1,Number($('matrixH').value));
      const pitch=(parseFloat(preview.style.width)||preview.getBoundingClientRect().width)/columns;
      const cad=preview.classList.contains('cad-pixels');
      const inset=cad?pitch*(0.8/7.125)/2:0;
      const radius=cad?pitch*(0.8/7.125):0;
      const dimensionsChanged=!boardGeometry||boardGeometry.columns!==columns||boardGeometry.rows!==rows;
      frame.style.setProperty('--board-inset',inset+'px');
      boardGeometry={columns,rows,pitch,inset,radius,screenRadius:cad?radius+2*inset:0,
        width:columns*pitch+2*inset,height:rows*pitch+2*inset,cad};
      boardSvg.style.width=(boardGeometry.width+20)+'px';
      boardSvg.style.height=(boardGeometry.height+20)+'px';
      if(dimensionsChanged){boardPixels=null;captureBoardPixels();}
      // Commit the viewBox and paths with the CSS size, before the browser paints.
      paintBoard();
    }
    const studio = document.querySelector('.studio-stage');
    function resizePreview() {
      const preview=$('preview');
      // Measure the unconstrained library before fitting both visible bottoms.
      well.style.maxHeight='';
      const width=Math.max(1,Number($('matrixW').value)),height=Math.max(1,Number($('matrixH').value));
      const insetFactor=preview.classList.contains('cad-pixels')?0.8/7.125:0;
      const stageStyle=getComputedStyle(stage);
      const stageHorizontalInset=(parseFloat(stageStyle.paddingLeft)||0)+(parseFloat(stageStyle.paddingRight)||0);
      if(window.innerWidth>760){
        const toolbar=studio.querySelector('.library-toolbar').getBoundingClientRect();
        const targetHeight=Math.max(1,well.getBoundingClientRect().bottom-toolbar.top);
        const targetPitch=Math.max(0.01,targetHeight-6)/(height+insetFactor);
        const requiredColumn=targetPitch*(width+insetFactor)+6;
        const columnGap=parseFloat(getComputedStyle(studio).columnGap)||16;
        const maxColumn=Math.max(120,studio.clientWidth-columnGap-320);
        const column=Math.max(120,Math.min(maxColumn,requiredColumn));
        studio.style.setProperty('--preview-column',column+'px');
      }else{studio.style.removeProperty('--preview-column');}
      frame.style.transform='';
      const toolbar=studio.querySelector('.library-toolbar').getBoundingClientRect();
      const targetHeight=Math.max(1,well.getBoundingClientRect().bottom-toolbar.top);
      // Fixed 3px outer edge on each side; only the black inset scales.
      const availableHeight=window.innerWidth>760?targetHeight:Math.max(1,stage.clientHeight-12);
      const heightPitch=Math.max(0.01,availableHeight-6)/(height+insetFactor);
      const pitch=Math.max(0.01,Math.min(Math.max(1,stage.clientWidth-(window.innerWidth>760?0:stageHorizontalInset)-6)/(width+insetFactor),heightPitch));
      preview.style.width=(pitch*width)+'px';preview.style.height=(pitch*height)+'px';
      updateBoardGeometry();
      if(window.innerWidth>760){
        const toolbarToWellTop=well.getBoundingClientRect().top-toolbar.top;
        const visiblePreviewHeight=frame.getBoundingClientRect().height+6;
        well.style.maxHeight=Math.max(1,visiblePreviewHeight-toolbarToWellTop)+'px';
        const bezel=frame.getBoundingClientRect();
        // Include the SVG outset and half of the bright core's stroke width.
        const rimOuterOffset=3;
        const delta=toolbar.top-(bezel.top-rimOuterOffset);
        frame.style.transform='translateY('+delta+'px)';
      }
    }
    let pendingPreviewResize=0;
    function schedulePreviewResize(){
      if(boardDisposed||pendingPreviewResize)return;
      pendingPreviewResize=requestAnimationFrame(()=>{
        pendingPreviewResize=0;
        resizePreview();

        updateGalleryEdges();
      });
    }
    window.pixelStudioResizePreview = schedulePreviewResize;
    // Do not mutate observed dimensions inside ResizeObserver delivery.
    const resize = new ResizeObserver(schedulePreviewResize); resize.observe(studio); resize.observe(well);
    $('matrixW').addEventListener('change', schedulePreviewResize); $('matrixH').addEventListener('change', schedulePreviewResize);
    window.addEventListener('resize',schedulePreviewResize);
    window.addEventListener('pixel-studio-language-change',schedulePreviewResize);
    document.fonts?.addEventListener('loadingdone',schedulePreviewResize);
    window.addEventListener('pagehide',()=>{
      resize.disconnect();
      if(pendingPreviewResize)cancelAnimationFrame(pendingPreviewResize);
      window.removeEventListener('resize',schedulePreviewResize);
      window.removeEventListener('pixel-studio-language-change',schedulePreviewResize);
      document.fonts?.removeEventListener('loadingdone',schedulePreviewResize);
    },{once:true});
    resizePreview();

    // Settle the initial layout while the startup guard still hides the shell.
    let startupReadyRequest=0;
    (document.fonts?.ready||Promise.resolve()).then(()=>{
      if(boardDisposed)return;
      schedulePreviewResize();
      startupReadyRequest=requestAnimationFrame(()=>{
        startupReadyRequest=requestAnimationFrame(()=>{
          startupReadyRequest=0;
          paintBoard();
          updateGalleryEdges();
          document.body.dataset.studioReady = 'true';
        });
      });
    });
    window.addEventListener('pagehide',()=>{
      if(startupReadyRequest)cancelAnimationFrame(startupReadyRequest);
    },{once:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once:true });
  else initialize();
})();
