'use strict';
const {app,BrowserWindow,Tray,Menu,nativeImage,nativeTheme,ipcMain,shell,dialog,protocol}=require('electron');
protocol.registerSchemesAsPrivileged([{scheme:'pixel-media',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {png,ico,themes}=require('./icons.cjs');
app.setAppUserModelId('com.ow3nhe.pixelstudio.desktop');
app.setPath('userData',path.join(app.getPath('appData'),'Pixel Studio Desktop'));
let window, tray, quitting=false, preferences, serialRestore=false, pendingSerial=null, keepResumeIntent=false;
let startupPlayback=null,resumeAttempted=false,resumeInProgress=false;
let connectionRestoreAttempted=false,connectionRestoreCanceled=false;
function deviceId(port){return {portName:String(port.portName||''),vendorId:String(port.vendorId||''),productId:String(port.productId||''),serialNumber:String(port.serialNumber||'')};}
function sameDevice(port,saved){
  const candidate=deviceId(port);
  if(!saved||!saved.portName)return false;
  return candidate.vendorId===saved.vendorId&&candidate.productId===saved.productId&&
    (saved.serialNumber ? candidate.serialNumber===saved.serialNumber : candidate.portName===saved.portName);
}
const settingsPath=()=>path.join(app.getPath('userData'),'desktop-settings.json');
const webRoot=app.isPackaged ? path.join(process.resourcesPath,'web') : path.join(__dirname,'..');
const settingsSchema=require(path.join(webRoot,'pixel-settings-schema.cjs'));
const defaults=settingsSchema.desktopDefaults;
const mediaSession=settingsSchema.sanitizeMediaSession;
const playbackState=settingsSchema.sanitizePlaybackState;
const entry=pathToFileURL(path.join(webRoot,'index.html')).href;
const ddpService=require('./ddp-service.cjs')(webRoot);
const updater=require('./updater.cjs')(()=>window,()=>effectiveLanguage());
function ownPage(contents){return window && contents===window.webContents && contents.getURL().split('#')[0]===entry;}
function save(){fs.mkdirSync(path.dirname(settingsPath()),{recursive:true});fs.writeFileSync(settingsPath()+'.tmp',JSON.stringify(preferences));fs.renameSync(settingsPath()+'.tmp',settingsPath());}
function loginOptions(){return {path:process.execPath,args:['--login-start']};}
function state(){return {...preferences,launchAtLogin:app.isPackaged ? app.getLoginItemSettings(loginOptions()).openAtLogin : false,canLaunchAtLogin:app.isPackaged};}
function show(){if(quitting || !window || window.isDestroyed())return;if(window.isMinimized())window.restore();window.show();window.focus();}
const iconCache=new Map();
function icon(theme,size){const key=theme+size;if(!iconCache.has(key))iconCache.set(key,nativeImage.createFromBuffer(png(theme,size)));return iconCache.get(key);}
function effectiveTheme(){return preferences.theme==='system'?(nativeTheme.shouldUseDarkColors?'black':'light'):preferences.theme;}
const taskbarIconPaths=new Map();
function refreshTheme(){
  if(!preferences)return;
  const theme=effectiveTheme();
  if(window&&!window.isDestroyed()){
    window.setIcon(icon(theme,64));
    if(process.platform==='win32'){
      try{
        let iconPath=taskbarIconPaths.get(theme);
        if(!iconPath){
          const directory=path.join(app.getPath('userData'),'icons');
          fs.mkdirSync(directory,{recursive:true});
          iconPath=path.join(directory,'pixel-studio-brand10-'+theme+'.ico');
          fs.writeFileSync(iconPath,ico(theme));
          taskbarIconPaths.set(theme,iconPath);
        }
        // Set the taskbar group/relaunch icon as well as the window icon.
        // Existing pinned shortcuts are user-owned and are not rewritten.
        const relaunchCommand=app.isPackaged ? '"'+process.execPath+'"' : '"'+process.execPath+'" "'+app.getAppPath()+'"';
        window.setAppDetails({appId:'com.ow3nhe.pixelstudio.desktop',appIconPath:iconPath,appIconIndex:0,relaunchCommand,relaunchDisplayName:'Pixel Studio'});
      }catch(error){console.warn('Taskbar icon update failed:',error.message);}
    }
  }
  if(tray&&!tray.isDestroyed())tray.setImage(icon(theme,32));
}
nativeTheme.on('updated',()=>{if(preferences?.theme==='system')refreshTheme();});
function systemLanguage(){return /^zh(?:-|$)/i.test(app.getPreferredSystemLanguages()[0] || 'en') ? 'zh-CN' : 'en';}
function effectiveLanguage(){return preferences.language==='auto' ? systemLanguage() : preferences.language;}
let trayPlaying=false;
function trayMenu(){
  if(!tray||tray.isDestroyed()||quitting)return;
  const en=effectiveLanguage()==='en';
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:en?'Open Pixel Studio':'打开 Pixel Studio',click:show},
    {label:trayPlaying?(en?'Stop output':'停止发送'):(en?'Resume output':'继续发送'),click:()=>{
      if(window&&!window.isDestroyed()&&!quitting)window.webContents.send(trayPlaying?'desktop:stop':'desktop:start');
    }},
    {type:'separator'},
    {label:en?'Quit':'退出',click:()=>app.quit()}
  ]));
}
function external(url){try{const u=new URL(url);if(u.protocol==='https:' && u.hostname==='github.com' && u.pathname.startsWith('/OW3N-HE/Pixel-Studio/'))void shell.openExternal(u.href);}catch{}}
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',show);
  let shutdownStarted=false,shutdownFinished=false;
  app.on('before-quit',event=>{
    quitting=true;
    if(shutdownFinished)return;
    event.preventDefault();
    if(shutdownStarted)return;
    shutdownStarted=true;
    if(window&&!window.isDestroyed())window.hide();
    tray?.destroy();tray=null;
    void (async()=>{
      try{
        if(window&&!window.isDestroyed()&&ownPage(window.webContents)){
          let captureTimer;
          let value;
          try {
            value=await Promise.race([
              window.webContents.executeJavaScript('window.pixelStudioWebRuntime.captureDesktopPlayback?.() || null'),
              new Promise(resolve=>{captureTimer=setTimeout(()=>resolve(null),1500);})
            ]);
          } finally {clearTimeout(captureTimer);}
          const snapshot=value?.sessionReady===false?null:playbackState(value);
          if(snapshot){snapshot.resumeRequested=snapshot.playing||keepResumeIntent;preferences.playback=snapshot;const content=mediaSession(value.mediaSession);if(content)preferences.mediaSession=content;save();}
        }
      }catch{}
      // Close the renderer before shutting down its bridge and polling endpoints.
      if(window&&!window.isDestroyed())window.destroy();
      try{await ddpService.stop();}catch{}
      shutdownFinished=true;
      app.quit();
    })();
  });
  app.on('window-all-closed',()=>{if(!tray)app.quit();});
  app.whenReady().then(()=>{
    Menu.setApplicationMenu(null);
    preferences={...defaults};
    let hasSavedLoginPreference=false;
    try{const p=JSON.parse(fs.readFileSync(settingsPath(),'utf8'));hasSavedLoginPreference=typeof p.launchAtLogin==='boolean';for(const key of ['launchAtLogin','startHidden','closeToTray','resumePlayback'])if(typeof p[key]==='boolean')preferences[key]=p[key];if(p.theme==='system'||Object.hasOwn(themes,p.theme))preferences.theme=p.theme;if(['auto','en','zh-CN'].includes(p.language))preferences.language=p.language;preferences.playback=playbackState(p.playback);if(p.serialDevice&&typeof p.serialDevice.portName==='string')preferences.serialDevice=deviceId(p.serialDevice);}catch{}
    try{const p=JSON.parse(fs.readFileSync(settingsPath(),'utf8'));if(typeof p.mediaFolder==='string'&&path.isAbsolute(p.mediaFolder))preferences.mediaFolder=p.mediaFolder;preferences.mediaSession=mediaSession(p.mediaSession);}catch{}
    startupPlayback=preferences.playback;
    keepResumeIntent=preferences.resumePlayback&&startupPlayback?.resumeRequested===true;
    const mediaLibrary=require('./media-library.cjs')({dialog,window:()=>window,english:()=>effectiveLanguage()==='en',getFolder:()=>preferences.mediaFolder,setFolder:folder=>{preferences.mediaFolder=folder;save();},onChange:()=>{
      if(window&&!window.isDestroyed()&&ownPage(window.webContents))window.webContents.send('desktop:media-changed');
    }});
    app.once('will-quit',()=>mediaLibrary.dispose());
    if(app.isPackaged&&!hasSavedLoginPreference){app.setLoginItemSettings({...loginOptions(),openAtLogin:preferences.launchAtLogin});save();}
    window=new BrowserWindow({width:1280,height:880,minWidth:360,minHeight:720,show:false,title:'Pixel Studio',icon:icon(effectiveTheme(),64),backgroundColor:'#0c1921',autoHideMenuBar:true,webPreferences:{additionalArguments:['--pixel-studio-system-language='+systemLanguage(),'--pixel-studio-language='+preferences.language],preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
    window.on('page-title-updated',event=>{event.preventDefault();window.setTitle('Pixel Studio');});
    // Restart Manager must not turn an installer shutdown into close-to-tray.
    window.on('query-session-end',()=>{quitting=true;});
    window.on('session-end',()=>{quitting=true;void ddpService.stop();});
    tray=new Tray(icon(effectiveTheme(),32));tray.setToolTip('Pixel Studio');tray.on('double-click',show);trayMenu();refreshTheme();
    window.on('close',event=>{if(!quitting&&preferences.closeToTray){event.preventDefault();window.hide();}else{quitting=true;tray?.destroy();tray=null;app.quit();}});
    window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
    window.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==entry){event.preventDefault();external(url);}});
    window.webContents.on('will-attach-webview',event=>event.preventDefault());
    window.webContents.on('did-finish-load',()=>{
      if(!ownPage(window.webContents))return;
      const mediaScripts=['session-controller.js','media-playback.js','media-thumbnails.js','media-library-ui.js'].map(file=>fs.readFileSync(path.join(__dirname,file),'utf8')).join('\n');
      void window.webContents.executeJavaScript(mediaScripts).catch(error=>console.error('Desktop media UI:',error.message));
    });
    const session=window.webContents.session;
    session.protocol.handle('pixel-media',request=>mediaLibrary.respond(request).catch(()=>new Response(null,{status:404})));
    session.setPermissionCheckHandler((contents,permission)=>ownPage(contents)&&permission==='serial');
    session.setPermissionRequestHandler((contents,permission,callback)=>callback(ownPage(contents)&&permission==='serial'));
    session.on('select-serial-port',async(event,ports,contents,callback)=>{
      event.preventDefault();
      const restoring=serialRestore;serialRestore=false;pendingSerial=null;
      if(!ownPage(contents)||!ports.length){callback('');return;}
      const matches=ports.filter(port=>sameDevice(port,preferences.serialDevice));
      if(restoring){
        if(restoring===true&&connectionRestoreCanceled){callback('');return;}
        const selected=matches.length===1?matches[0]:null;
        pendingSerial=selected?deviceId(selected):null;
        callback(selected?.portId||'');return;
      }
      show();
      const en=effectiveLanguage()==='en';
      try{
        const result=await dialog.showMessageBox(window,{type:'question',title:en?'Select serial port':'选择串口',message:en?'Select your LED controller.':'请选择灯屏控制器的串口。',detail:en?'If a device was just connected, cancel and reopen this dialog.':'如果刚插入设备，请取消后重新选择。',buttons:[...ports.map(p=>`${p.displayName || p.portName} (${p.portName})`),en?'Cancel':'取消'],defaultId:ports.length,cancelId:ports.length,noLink:true});
        const selected=ports[result.response];
        pendingSerial=selected?deviceId(selected):null;
        callback(selected?.portId || '');
      }catch{callback('');}
    });
    ipcMain.handle('desktop:media',async(event,request)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller');
      try{
        if(request?.action==='scan')return {ok:true,...await mediaLibrary.scan()};
        if(request?.action==='select')return {ok:true,...await mediaLibrary.select()};
        if(request?.action==='read'&&typeof request.id==='string')return {ok:true,...await mediaLibrary.read(request.id)};
        throw new Error('Unsupported media action');
      }catch(error){return {ok:false,error:error.message};}
    });
    ipcMain.handle('desktop:serial', (event,request)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller');
      if(request?.action==='prepare'){
        serialRestore=request.restore===true?true:(request.reuse===true&&preferences.serialDevice?'remembered':false);pendingSerial=null;
        return {remembered:serialRestore==='remembered'};
      }else if(request?.action==='connected'&&pendingSerial){
        preferences.serialDevice=pendingSerial;pendingSerial=null;save();
      }else if(request?.action==='cancel-resume'){
        keepResumeIntent=false;
        resumeAttempted=true;
        if(request.connection===true)connectionRestoreCanceled=true;
        if(preferences.playback){preferences.playback.playing=false;preferences.playback.resumeRequested=false;if(request.connection===true)preferences.playback.connected=false;save();}
      }
    });
    ipcMain.handle('desktop:settings',async(event,patch)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller');
      if(patch){
        if(typeof patch!=='object')throw new Error('Invalid settings');
        for(const key of ['startHidden','closeToTray','resumePlayback'])if(typeof patch[key]==='boolean')preferences[key]=patch[key];
        if(patch.forgetSerial===true){
          await window.webContents.executeJavaScript("window.pixelStudioWebRuntime.disconnectSerial()");
          preferences.serialDevice=null;pendingSerial=null;serialRestore=false;keepResumeIntent=false;
        }
        if(typeof patch.launchAtLogin==='boolean'&&app.isPackaged){app.setLoginItemSettings({...loginOptions(),openAtLogin:patch.launchAtLogin});preferences.launchAtLogin=patch.launchAtLogin;}
        if(patch.theme==='system'||Object.hasOwn(themes,patch.theme))preferences.theme=patch.theme;
        if(['auto','en','zh-CN'].includes(patch.language))preferences.language=patch.language;
        save();refreshTheme();trayMenu();
      }
      return state();
    });
    ipcMain.on('desktop:hide',event=>{if(ownPage(event.sender))window.hide();});
    ipcMain.handle('desktop:update',async(event,request)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller');
      try{
        if(request?.action==='download')return {ok:true,...await updater.download(request.version)};
        if(request?.action==='install')return {ok:true,...await updater.install(request.language === 'en' ? 'en' : request.language === 'zh-CN' ? 'zh-CN' : effectiveLanguage())};
        throw new Error('Unsupported update action');
      }catch(error){return {ok:false,error:error.message};}
    });
    ipcMain.handle('desktop:ddp',async(event,request)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller');
      try{
        if(request?.action==='ensure'){await ddpService.ensure();return {ok:true};}
        if(request?.action!=='request')throw new Error('Unsupported DDP action');
        return {ok:true,...await ddpService.request(request.route,request.options)};
      }catch(error){return {ok:false,error:error.message};}
    });
    ipcMain.on('desktop:playback',(event,value)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)return;
      if(quitting)return;
      if(value?.sessionReady===false)return;
      const next=playbackState(value);
      if(next&&trayPlaying!==next.playing){trayPlaying=next.playing;trayMenu();}
      if(value?.playing===true)keepResumeIntent=false;
      if(next)next.resumeRequested=next.playing||keepResumeIntent;
      if(next&&JSON.stringify(next)!==JSON.stringify(preferences.playback)){preferences.playback=next;try{save();}catch{}}
    });
    ipcMain.handle('desktop:media-session',(event,patch)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller');
      if(quitting)return preferences.mediaSession;
      if(patch!==undefined){const next=mediaSession(patch);if(!next)throw new Error('Invalid media session');preferences.mediaSession=next;save();}
      return preferences.mediaSession;
    });
    ipcMain.handle('desktop:restore-connection',async event=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)return false;
      if(connectionRestoreAttempted||connectionRestoreCanceled||!startupPlayback?.connected||startupPlayback.values.controlMode!=='serial'||!preferences.serialDevice)return false;
      connectionRestoreAttempted=true;
      return window.webContents.executeJavaScript('window.pixelStudioWebRuntime.restoreDesktopConnection()',true);
    });
    ipcMain.handle('desktop:resume',async event=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)return false;
      if(!preferences.resumePlayback||!startupPlayback?.resumeRequested||resumeAttempted||resumeInProgress)return false;
      if (!['serial','ddp'].includes(startupPlayback.values.controlMode)) return false;
    if (startupPlayback.values.controlMode === 'serial' && !preferences.serialDevice) return false;
      keepResumeIntent=true;
      // A fixed local action, never renderer-supplied JavaScript. The selection
      // handler above permits only the explicitly remembered device on resume.
      resumeInProgress=true;
      try{
        const resumed=await window.webContents.executeJavaScript('window.pixelStudioWebRuntime.resumePlayback()',true);
        if(resumed){keepResumeIntent=false;resumeAttempted=true;}
        return resumed;
      }finally{resumeInProgress=false;}
    });
    window.once('ready-to-show',()=>{if(!(process.argv.includes('--login-start')&&preferences.startHidden))show();});
    window.webContents.on('did-fail-load',(_event,code,message)=>{show();void dialog.showMessageBox(window,{type:'error',message:'Pixel Studio could not load.',detail:`${code}: ${message}`});});
    window.loadURL(entry);
  }).catch(error=>{dialog.showErrorBox('Pixel Studio',error.message);app.quit();});
}
