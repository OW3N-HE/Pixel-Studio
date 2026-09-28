'use strict';
const {app,BrowserWindow,Tray,Menu,nativeImage,ipcMain,shell,dialog}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {png,themes}=require('./icons.cjs');
app.setAppUserModelId('com.ow3nhe.pixelstudio.desktop');
app.setPath('userData',path.join(app.getPath('appData'),'Pixel Studio Desktop'));
let window, tray, quitting=false, preferences, restoringUntil=0;
const defaults={launchAtLogin:true,startHidden:true,closeToTray:true,resumePlayback:true,theme:'ice',language:'auto',serialDevice:null,playback:null};
const controlIds=['controlMode','wledHost','baudRate','protocol','matrixW','matrixH','mapping','fps','brightness','animationMode','animationSpeed','clockFont','clockPalette','colorMode','colorGamma','safeMode','scaleMode','libraryCategory','librarySearch','psShuffleEnabled','psShuffleInterval'];
function playbackState(value){
  if(!value || typeof value!=='object')return null;
  const values={};
  for(const key of controlIds)if(typeof value.values?.[key]==='string'&&value.values[key].length<=256)values[key]=value.values[key];
  return {playing:value.playing===true,values};
}
function deviceId(port){return {portName:String(port.portName||''),vendorId:String(port.vendorId||''),productId:String(port.productId||''),serialNumber:String(port.serialNumber||'')};}
function sameDevice(port,saved){
  const candidate=deviceId(port);
  if(!saved||!saved.portName)return false;
  return candidate.vendorId===saved.vendorId&&candidate.productId===saved.productId&&
    (saved.serialNumber ? candidate.serialNumber===saved.serialNumber : candidate.portName===saved.portName);
}
const settingsPath=()=>path.join(app.getPath('userData'),'desktop-settings.json');
const sharedWeb=app.isPackaged ? path.join(process.resourcesPath,'..','..','app') : '';
const webRoot=app.isPackaged ? (fs.existsSync(path.join(sharedWeb,'index.html')) ? sharedWeb : path.join(process.resourcesPath,'web')) : path.join(__dirname,'..');
const entry=pathToFileURL(path.join(webRoot,'index.html')).href;
const ddpService=require('./ddp-service.cjs')(webRoot);
const updater=require('./updater.cjs')(()=>window,()=>effectiveLanguage());
function ownPage(contents){return window && contents===window.webContents && contents.getURL().split('#')[0]===entry;}
function save(){fs.mkdirSync(path.dirname(settingsPath()),{recursive:true});fs.writeFileSync(settingsPath()+'.tmp',JSON.stringify(preferences));fs.renameSync(settingsPath()+'.tmp',settingsPath());}
function loginOptions(){return {path:process.execPath,args:['--login-start']};}
function state(){return {...preferences,launchAtLogin:app.isPackaged ? app.getLoginItemSettings(loginOptions()).openAtLogin : false,canLaunchAtLogin:app.isPackaged};}
function show(){if(!window || window.isDestroyed())return;if(window.isMinimized())window.restore();window.show();window.focus();}
const iconCache=new Map();
function icon(theme,size){const key=theme+size;if(!iconCache.has(key))iconCache.set(key,nativeImage.createFromBuffer(png(theme,size,size===32)));return iconCache.get(key);}
function refreshTheme(){window?.setIcon(icon(preferences.theme,64));tray?.setImage(icon(preferences.theme,32));}
function systemLanguage(){return /^zh(?:-|$)/i.test(app.getPreferredSystemLanguages()[0] || 'en') ? 'zh-CN' : 'en';}
function effectiveLanguage(){return preferences.language==='auto' ? systemLanguage() : preferences.language;}
function trayMenu(){
  const en=effectiveLanguage()==='en';
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:en?'Open Pixel Studio':'打开 Pixel Studio',click:show},
    {label:en?'Stop output':'停止发送',click:()=>window?.webContents.send('desktop:stop')},
    {type:'separator'},
    {label:en?'Quit':'退出',click:()=>app.quit()}
  ]));
}
function external(url){try{const u=new URL(url);if(u.protocol==='https:' && u.hostname==='github.com' && u.pathname.startsWith('/OW3N-HE/Pixel-Studio/'))void shell.openExternal(u.href);}catch{}}
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',show);
  let bridgeShutdown=false;
  app.on('before-quit',event=>{quitting=true;if(ddpService.active&&!bridgeShutdown){event.preventDefault();bridgeShutdown=true;void ddpService.stop().finally(()=>app.quit());}});
  app.on('window-all-closed',()=>{if(!tray)app.quit();});
  app.whenReady().then(()=>{
    preferences={...defaults};
    let hasSavedLoginPreference=false;
    try{const p=JSON.parse(fs.readFileSync(settingsPath(),'utf8'));hasSavedLoginPreference=typeof p.launchAtLogin==='boolean';for(const key of ['launchAtLogin','startHidden','closeToTray','resumePlayback'])if(typeof p[key]==='boolean')preferences[key]=p[key];if(Object.hasOwn(themes,p.theme))preferences.theme=p.theme;if(['auto','en','zh-CN'].includes(p.language))preferences.language=p.language;preferences.playback=playbackState(p.playback);if(p.serialDevice&&typeof p.serialDevice.portName==='string')preferences.serialDevice=deviceId(p.serialDevice);}catch{}
    if(app.isPackaged&&!hasSavedLoginPreference){app.setLoginItemSettings({...loginOptions(),openAtLogin:preferences.launchAtLogin});save();}
    window=new BrowserWindow({width:1280,height:880,minWidth:640,minHeight:520,show:false,title:'Pixel Studio',icon:icon(preferences.theme,64),backgroundColor:'#0c1921',autoHideMenuBar:true,webPreferences:{additionalArguments:['--pixel-studio-system-language='+systemLanguage(),'--pixel-studio-language='+preferences.language],preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
    window.on('page-title-updated',event=>{event.preventDefault();window.setTitle('Pixel Studio');});
    tray=new Tray(icon(preferences.theme,32));tray.setToolTip('Pixel Studio');tray.on('double-click',show);trayMenu();
    window.on('close',event=>{if(!quitting&&preferences.closeToTray){event.preventDefault();window.hide();}else{quitting=true;tray.destroy();tray=null;app.quit();}});
    window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
    window.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==entry){event.preventDefault();external(url);}});
    window.webContents.on('will-attach-webview',event=>event.preventDefault());
    const session=window.webContents.session;
    session.setPermissionCheckHandler((contents,permission)=>ownPage(contents)&&permission==='serial');
    session.setPermissionRequestHandler((contents,permission,callback)=>callback(ownPage(contents)&&permission==='serial'));
    session.on('select-serial-port',async(event,ports,contents,callback)=>{
      event.preventDefault();
      if(!ownPage(contents)||!ports.length){callback('');return;}
      const matches=ports.filter(port=>sameDevice(port,preferences.serialDevice));
      if(matches.length===1){callback(matches[0].portId);return;}
      if(Date.now()<restoringUntil || preferences.serialDevice){callback('');return;}
      show();
      const en=effectiveLanguage()==='en';
      try{
        const result=await dialog.showMessageBox(window,{type:'question',title:en?'Select serial port':'选择串口',message:en?'Select your LED controller.':'请选择灯屏控制器的串口。',detail:en?'If a device was just connected, cancel and reopen this dialog.':'如果刚插入设备，请取消后重新选择。',buttons:[...ports.map(p=>`${p.displayName || p.portName} (${p.portName})`),en?'Cancel':'取消'],defaultId:ports.length,cancelId:ports.length,noLink:true});
        const selected=ports[result.response];
        if(selected){preferences.serialDevice=deviceId(selected);save();}
        callback(selected?.portId || '');
      }catch{callback('');}
    });
    ipcMain.handle('desktop:settings',(event,patch)=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller');
      if(patch){
        if(typeof patch!=='object')throw new Error('Invalid settings');
        for(const key of ['startHidden','closeToTray','resumePlayback'])if(typeof patch[key]==='boolean')preferences[key]=patch[key];
        if(patch.forgetSerial===true)preferences.serialDevice=null;
        if(typeof patch.launchAtLogin==='boolean'&&app.isPackaged){app.setLoginItemSettings({...loginOptions(),openAtLogin:patch.launchAtLogin});preferences.launchAtLogin=patch.launchAtLogin;}
        if(Object.hasOwn(themes,patch.theme))preferences.theme=patch.theme;
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
      const next=playbackState(value);
      if(next&&JSON.stringify(next)!==JSON.stringify(preferences.playback)){preferences.playback=next;try{save();}catch{}}
    });
    ipcMain.handle('desktop:resume',async event=>{
      if(!ownPage(event.sender)||event.senderFrame!==window.webContents.mainFrame)return false;
      if(!preferences.resumePlayback||!preferences.playback?.playing||preferences.playback.values.animationMode==='file')return false;
      if (!['serial','ddp'].includes(preferences.playback.values.controlMode)) return false;
    if (preferences.playback.values.controlMode === 'serial' && !preferences.serialDevice) return false;
      restoringUntil=Date.now()+30000;
      // A fixed local action, never renderer-supplied JavaScript. The selection
      // handler above permits only the explicitly remembered device on resume.
      await window.webContents.executeJavaScript("document.getElementById('startBtn').click()",true);
      return true;
    });
    window.once('ready-to-show',()=>{if(!(process.argv.includes('--login-start')&&preferences.startHidden))show();});
    window.webContents.on('did-fail-load',(_event,code,message)=>{show();void dialog.showMessageBox(window,{type:'error',message:'Pixel Studio could not load.',detail:`${code}: ${message}`});});
    window.loadURL(entry);
  }).catch(error=>{dialog.showErrorBox('Pixel Studio',error.message);app.quit();});
}
