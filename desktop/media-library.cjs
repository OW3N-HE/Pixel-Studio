'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {Readable}=require('node:stream');
const {watch}=require('node:fs');
const types=new Map(Object.entries({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.bmp':'image/bmp','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'}));
module.exports=function(options){
  let entries=new Map(),generation=0;
  let watcher=null,watchedRoot='',watchTimer=null,disposed=false;
  function closeWatcher(){
    clearTimeout(watchTimer);watchTimer=null;watcher?.close();watcher=null;watchedRoot='';
  }
  function notifyChange(){
    clearTimeout(watchTimer);
    watchTimer=setTimeout(()=>{watchTimer=null;if(!disposed)options.onChange?.();},750);
  }
  function watchFolder(root){
    if(disposed||watchedRoot===root)return;
    closeWatcher();
    try{
      watcher=watch(root,{persistent:false},(_event,filename)=>{
        if(!filename||types.has(path.extname(String(filename)).toLowerCase()))notifyChange();
      });
      watchedRoot=root;
      watcher.on('error',()=>{closeWatcher();notifyChange();});
    }catch{closeWatcher();}
  }
  async function scan(){
    const revision=++generation,folder=options.getFolder();
    if(!folder){closeWatcher();entries=new Map();return {folder:'',files:[],truncated:false};}
    try{
      const root=await fs.realpath(folder);
      watchFolder(root);
      const directory=await fs.readdir(root,{withFileTypes:true});
      const candidates=directory.filter(item=>item.isFile()&&types.has(path.extname(item.name).toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
      const next=new Map(),files=[];
      for(const item of candidates.slice(0,1000)){
        const filename=path.join(root,item.name);
        let stat;
        try{stat=await fs.stat(filename);}catch(error){if(error.code==='ENOENT')continue;throw error;}
        if(!stat.isFile())continue;
        const saved=[...entries].find(([,entry])=>entry.root===root&&entry.filename===filename);
        const id=saved?saved[0]:crypto.randomUUID(),type=types.get(path.extname(item.name).toLowerCase());
        next.set(id,{root,filename,type});
        files.push({id,name:item.name,type,size:stat.size,lastModified:stat.mtimeMs});
      }
      if(revision!==generation)throw new Error('Folder changed; refresh the library.');
      entries=next;return {folder,files,truncated:candidates.length>1000};
    }catch(error){if(revision===generation)entries=new Map();throw error;}
  }
  async function select(){
    const result=await options.dialog.showOpenDialog(options.window(),{title:options.english()?'Select media folder':'选择媒体文件夹',properties:['openDirectory'],...(options.getFolder()?{defaultPath:options.getFolder()}:{})});
    if(result.canceled||!result.filePaths.length)return {canceled:true};
    const folder=await fs.realpath(result.filePaths[0]);
    if(!(await fs.stat(folder)).isDirectory())throw new Error('Not a folder.');
    options.setFolder(folder);return scan();
  }
  async function resolve(id){
    const entry=entries.get(id);
    if(!entry)throw new Error('Refresh the library and select the file again.');
    const filename=await fs.realpath(entry.filename);
    if(path.dirname(filename)!==entry.root)throw new Error('File is outside the selected folder.');
    return {...entry,filename};
  }
  async function read(id){
    const entry=await resolve(id),stat=await fs.stat(entry.filename);
    if(!stat.isFile())throw new Error('Not a regular file.');
    // A stable, private identity across scans/restarts; replacing a file resets its speed.
    const speedKey=crypto.createHash('sha256').update(JSON.stringify([entry.filename,stat.size,stat.mtimeMs])).digest('hex');
    return {url:'pixel-media://library/'+id,type:entry.type,lastModified:stat.mtimeMs,speedKey};
  }
  async function respond(request){
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
    let entry;
    try{
      const url=new URL(request.url);
      if(url.hostname!=='library'||url.search||url.hash)throw new Error('Invalid media URL.');
      entry=await resolve(url.pathname.slice(1));
    }catch{return new Response(null,{status:404});}
    const filename=entry.filename;
    const handle=await fs.open(filename,'r');
    let streaming=false;
    try{
      const stat=await handle.stat();
      if(!stat.isFile())return new Response(null,{status:404});
      const headers={'Content-Type':entry.type,'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
      const range=request.headers.get('range');
      let start=0,end=stat.size-1,status=200;
      if(range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        if(!match||(!match[1]&&!match[2])||stat.size===0)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+stat.size}});
        if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+stat.size}});start=Math.max(0,stat.size-suffix);}
        else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=stat.size||end<start)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+stat.size}});
        status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;
      }
      headers['Content-Length']=String(stat.size?end-start+1:0);
      if(request.method==='HEAD'||stat.size===0)return new Response(null,{status,headers});
      const stream=handle.createReadStream({start,end,autoClose:true,highWaterMark:64*1024});
      const abort=()=>stream.destroy();
      request.signal?.addEventListener('abort',abort,{once:true});
      stream.once('close',()=>request.signal?.removeEventListener('abort',abort));
      if(request.signal?.aborted)stream.destroy();
      streaming=true;
      return new Response(Readable.toWeb(stream),{status,headers});
    }finally{if(!streaming)await handle.close();}
  }
  function dispose(){disposed=true;generation++;closeWatcher();entries.clear();}
  return {scan,select,read,respond,dispose};
};
