'use strict';
const {app,dialog,shell}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Readable,Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const repository='https://github.com/OW3N-HE/Pixel-Studio';
const maximum=512*1024*1024;
function version(value){
  const match=/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value||'');
  if(!match||!match.slice(1).every(n=>Number.isSafeInteger(Number(n))))throw new Error('Unsupported release version');
  return match.slice(1).map(Number);
}
function compare(a,b){for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i]?1:-1;return 0;}
async function officialDownload(url,signal){
  for(let hop=0;hop<6;hop++){
    const u=new URL(url);
    if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(u.hostname))throw new Error('Untrusted download destination');
    const response=await fetch(u,{signal,redirect:'manual',credentials:'omit'});
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get('location');await response.body?.cancel();
      if(!location)throw new Error('Invalid download redirect');url=new URL(location,u).href;continue;
    }
    if(!response.ok){await response.body?.cancel();throw new Error('Installer download failed: HTTP '+response.status);}
    return response;
  }
  throw new Error('Too many download redirects');
}
async function digest(file){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}

module.exports=function createUpdater(getWindow,getLanguage){
  let busy=false,verified=null;
  async function download(expectedVersion){
    if(busy)throw new Error('An update operation is already running');
    if(!app.isPackaged||process.platform!=='win32')throw new Error('Installer updates require an installed Windows edition');
    busy=true;verified=null;let partial;
    try{
      version(expectedVersion);
      const response=await fetch('https://api.github.com/repos/OW3N-HE/Pixel-Studio/releases/latest',{
        signal:AbortSignal.timeout(15000),redirect:'error',credentials:'omit',headers:{Accept:'application/vnd.github+json','User-Agent':'PixelStudio/'+app.getVersion()}
      });
      if(!response.ok)throw new Error('Release check failed: HTTP '+response.status);
      let json='';for await(const chunk of response.body){json+=Buffer.from(chunk).toString('utf8');if(json.length>1048576)throw new Error('Release metadata is too large');}
      const release=JSON.parse(json),parts=version(release.tag_name),number=parts.join('.');
      if(release.draft||release.prerelease||number!==expectedVersion||compare(parts,version(app.getVersion()))<0)throw new Error('Release changed or would downgrade. Check for updates again.');
      const name=`PixelStudio-Setup-${number}.exe`;
      const url=`${repository}/releases/download/${release.tag_name}/${name}`;
      const asset=Array.isArray(release.assets)&&release.assets.find(item=>item?.name===name&&item.state==='uploaded'&&item.browser_download_url===url);
      if(!asset||!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>maximum||!/^sha256:[a-f0-9]{64}$/i.test(asset.digest||''))throw new Error('A matching installer with a SHA-256 digest is required');
      const hashExpected=asset.digest.slice(7).toLowerCase();
      const root=path.join(app.getPath('userData'),'updates');await fs.promises.mkdir(root,{recursive:true});
      const directory=await fs.promises.mkdtemp(path.join(root,'download-'));
      const file=path.join(directory,name);partial=file+'.partial';
      const body=await officialDownload(url,AbortSignal.timeout(10*60*1000));
      let received=0,lastProgress=0;const hash=crypto.createHash('sha256');
      const meter=new Transform({transform(chunk,_encoding,done){
        received+=chunk.length;if(received>asset.size||received>maximum){done(new Error('Installer size mismatch'));return;}
        hash.update(chunk);
        if(Date.now()-lastProgress>200){lastProgress=Date.now();const win=getWindow();if(win&&!win.isDestroyed())win.webContents.send('desktop:update-progress',{received,total:asset.size});}
        done(null,chunk);
      }});
      await pipeline(Readable.fromWeb(body.body),meter,fs.createWriteStream(partial,{flags:'wx'}));
      if(received!==asset.size||hash.digest('hex')!==hashExpected)throw new Error('Installer checksum mismatch');
      await fs.promises.rename(partial,file);partial=null;
      verified={file,sha256:hashExpected,size:asset.size,version:number};
      return {version:number};
    }finally{if(partial)await fs.promises.unlink(partial).catch(()=>{});busy=false;}
  }
  async function install(language){
    if(busy||!verified)throw new Error('Download and verify an installer first');
    busy=true;
    try{
      const en=(['en','zh-CN'].includes(language)?language:getLanguage())==='en';
      const answer=await dialog.showMessageBox(getWindow(),{type:'question',title:'Pixel Studio',
        message:en?`Install Pixel Studio ${verified.version}?`:`安装 Pixel Studio ${verified.version}？`,
        detail:en?'Pixel Studio Desktop will exit and its output will stop. Save your work and quit OpenRGB from the tray first. Keep your current installation scope and personal settings. The installer may request administrator permission.':'Pixel Studio 桌面版将退出并停止发送。请先保存工作并从托盘退出 OpenRGB。保持现有安装范围并保留个人设置；安装程序可能请求管理员权限。',
        buttons:en?['Cancel','Install and exit']:['取消','安装并退出'],defaultId:0,cancelId:0,noLink:true});
      if(answer.response!==1)return {cancelled:true};
      const stat=await fs.promises.stat(verified.file);
      if(stat.size!==verified.size||await digest(verified.file)!==verified.sha256){verified=null;throw new Error('Installer changed. Download it again.');}
      const error=await shell.openPath(verified.file);if(error)throw new Error(error);
      app.quit();return {started:true};
    }finally{busy=false;}
  }
  return {download,install};
};
