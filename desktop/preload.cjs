'use strict';
const {ipcRenderer,contextBridge}=require('electron');
const startupArgument=(name,fallback)=>process.argv.find(value=>value.startsWith(name+'='))?.slice(name.length+1)||fallback;
contextBridge.exposeInMainWorld('pixelStudioDesktop',Object.freeze({edition:true,
  systemLanguage:startupArgument('--pixel-studio-system-language','en'),
  languagePreference:startupArgument('--pixel-studio-language','auto'),
  ensureDdp:()=>ipcRenderer.invoke('desktop:ddp',{action:'ensure'}),
  downloadUpdate:version=>ipcRenderer.invoke('desktop:update',{action:'download',version}),
  installUpdate:()=>ipcRenderer.invoke('desktop:update',{action:'install'}),
  ddpRequest:(route,options)=>ipcRenderer.invoke('desktop:ddp',{action:'request',route,options}),
  savePlayback:value=>ipcRenderer.send('desktop:playback',value)}));
// No Node or generic IPC API is exposed to the web page.
ipcRenderer.on('desktop:stop',()=>document.getElementById('stopBtn')?.click());
ipcRenderer.on('desktop:update-progress',(_event,value)=>window.dispatchEvent(new CustomEvent('pixel-studio-update-progress',{detail:{received:Number(value.received),total:Number(value.total)}})));
window.addEventListener('DOMContentLoaded',()=>{
  let attached=false;
  const observer=new MutationObserver(attach);
  observer.observe(document.documentElement,{childList:true,subtree:true});attach();
  function attach(){
    const body=document.querySelector('#studioSettings > .ps-settings-body');
    const language=document.getElementById('webLanguage'),theme=document.getElementById('webTheme');
    if(attached||!body||!language||!theme)return;
    const group=document.createElement('fieldset');group.className='ps-settings-group ps-desktop-settings';group.setAttribute('data-update-ui','');
    const legend=document.createElement('legend');group.append(legend);
    const switches=document.createElement('div');switches.className='ps-desktop-switches';group.append(switches);
    const fields={};
    for(const key of ['launchAtLogin','startHidden','closeToTray','resumePlayback']){
      const label=document.createElement('label');label.className='ps-check ps-desktop-option';
      const input=document.createElement('input');input.type='checkbox';input.disabled=true;
      const text=document.createElement('span');text.className='ps-desktop-caption';label.append(input,text);switches.append(label);fields[key]={input,text,label};
      input.addEventListener('change',async()=>{
        input.disabled=true;
        try{settings=await ipcRenderer.invoke('desktop:settings',{[key]:input.checked});error=false;}catch{error=true;}
        render();
      });
    }
    const note=document.createElement('p');note.className='ps-help ps-desktop-note';note.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='ps-desktop-actions';
    const hide=document.createElement('button');hide.type='button';hide.className='ps-about-button';
    hide.addEventListener('click',()=>ipcRenderer.send('desktop:hide'));
    const forget=document.createElement('button');forget.type='button';forget.className='ps-about-button';
    forget.addEventListener('click',async()=>{try{document.getElementById('disconnectBtn')?.click();settings=await ipcRenderer.invoke('desktop:settings',{forgetSerial:true});error=false;}catch{error=true;}render();});
    actions.append(forget,hide);group.append(note,actions);
    // The DDP notice is nested inside another fieldset, not a child of body.
    // Only use a direct settings group as insertBefore's reference node.
    const updates=body.querySelector(':scope > #psSoftwareUpdates')||body.querySelector(':scope > fieldset[data-update-ui]');
    body.insertBefore(group,updates);
    attached=true;observer.disconnect();
    let settings=null,error=false;
    function render(){
      const en=document.documentElement.lang==='en';legend.textContent=en?'Desktop & background':'桌面与后台运行';
      const captions=en?['Start with Windows','Hide on login','Close to tray','Resume USB playback']:['随 Windows 启动','登录时隐藏到托盘','关闭时保留在托盘','恢复 USB 播放'];
      const descriptions=en?['Launch Pixel Studio when you sign in to Windows.','Start in the system tray without opening a window when you sign in.','Keep running in the system tray when you close the window.','Resume the previous USB playback on startup. If the saved device is missing or busy, no other port is used.']:['登录 Windows 后自动启动 Pixel Studio。','登录后启动时仅显示托盘图标，不打开窗口。','关闭窗口后仍在系统托盘运行。','启动后恢复上次 USB 播放；设备缺失或被占用时，不会切换到其他端口。'];
      Object.entries(fields).forEach(([key,field],i)=>{field.text.textContent=captions[i];field.label.title=descriptions[i];field.input.checked=Boolean(settings?.[key]);field.input.disabled=!settings||(key==='launchAtLogin'&&!settings.canLaunchAtLogin);});
      note.textContent=error?(en?'Unable to save desktop settings. Please try again.':'无法保存桌面设置，请重试。'):(en?'Settings and the USB device are saved automatically. Resume uses only that device; local media and DDP must be started manually.':'设置和 USB 设备自动保存。恢复播放只连接原设备，不会切换其他端口；本地媒体和 DDP 需手动启动。');
      if(settings&&!settings.canLaunchAtLogin)note.textContent+=en?' Login startup requires an installed build.':' 开机启动需安装打包版本。';
      forget.textContent=en?'Clear saved USB device':'清除记住的 USB 设备';
      forget.title=en?'Disconnect and clear the remembered device. Select a USB port again before sending. Other settings are kept.':'断开连接并清除记住的设备，下次发送前需重新选择串口；其他设置不变。';
      hide.textContent=en?'Hide to tray':'隐藏到托盘';
    }
    async function sync(){try{await ipcRenderer.invoke('desktop:settings',{theme:theme.value,language:language.value});}catch{error=true;render();}}
    theme.addEventListener('change',sync);
    window.addEventListener('pixel-studio-language-change',()=>{render();void sync();});
    ipcRenderer.invoke('desktop:settings').then(async value=>{
      settings=value;
      for(const [id,saved] of Object.entries(value.playback?.values||{})){
        const element=document.getElementById(id);if(!element)continue;
        if(element.tagName==='SELECT'&&![...element.options].some(option=>option.value===saved))continue;
        element.value=saved;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));
      }
      render();void sync();
      await ipcRenderer.invoke('desktop:resume');
      window.dispatchEvent(new Event('pixel-studio-desktop-ready'));
    }).catch(()=>{error=true;render();});render();
  }
});
