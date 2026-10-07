'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'desktop/updater.cjs'),'utf8');
const ui=fs.readFileSync(path.join(root,'pixel-studio-web-ui.js'),'utf8');
const acorn=require('acorn');
const ast=acorn.parse(ui,{ecmaVersion:'latest'}),functions=new Map(),handlers=new Map();
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration')functions.set(n.id.name,ui.slice(n.start,n.end));if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.property.name==='addEventListener'&&n.arguments[0]?.value==='click'&&n.callee.object.type==='Identifier')handlers.set(n.callee.object.name,ui.slice(n.arguments[1].start,n.arguments[1].end));for(const v of Object.values(n))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}
visit(ast);
const output=path.join(root,'logs','update-tests-'+Date.now());fs.mkdirSync(output,{recursive:true});
const bytes=Buffer.from('Not an executable. Pixel Studio update test fixture.');
const hash=crypto.createHash('sha256').update(bytes).digest('hex');
const base='https://github.com/OW3N-HE/Pixel-Studio/releases/download/v0.1.8/PixelStudio-Setup-0.1.8.exe';
function fixture(){return {tag_name:'v0.1.8',draft:false,prerelease:false,assets:[{name:'PixelStudio-Setup-0.1.8.exe',state:'uploaded',size:bytes.length,digest:'sha256:'+hash,browser_download_url:base}]};}
let counter=0;
function setup(options={}){
 const dir=path.join(output,String(++counter));fs.mkdirSync(dir);
 const calls={quit:0,open:[],dialogs:[],requests:[],progress:[]};
 const electron={app:{isPackaged:options.packaged!==false,getVersion:()=>options.current||'0.1.7',getPath:()=>dir,quit:()=>calls.quit++},dialog:{showMessageBox:async(_w,value)=>{calls.dialogs.push(value);return {response:options.confirm??0};}},shell:{openPath:async file=>{calls.open.push(file);return options.launchError||'';}}};
 const win={isDestroyed:()=>false,webContents:{send:(...args)=>calls.progress.push(args)}};
 const network=async(url,init)=>{calls.requests.push(String(url));if(options.fetch)return options.fetch(url,init);if(String(url).includes('api.github.com'))return new Response(JSON.stringify(options.release||fixture()),{status:options.http||200});if(options.redirect&&String(url)===base)return new Response(null,{status:302,headers:{Location:options.redirect}});return new Response(options.bytes||bytes);};
 const context=vm.createContext({module:{exports:{}},require:id=>id==='electron'?electron:require(id),process:{platform:'win32'},fetch:network,URL,Buffer,AbortSignal,console});
 vm.runInContext(source,context,{filename:'desktop/updater.cjs'});
 return {api:context.module.exports(()=>win,()=>options.language||'en'),calls,dir};
}
let passed=0,failed=0;
async function test(name,run){try{await run();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.stack);}}
function downloaded(dir){return fs.readdirSync(path.join(dir,'updates'),{withFileTypes:true}).flatMap(d=>fs.readdirSync(path.join(dir,'updates',d.name)).map(f=>path.join(dir,'updates',d.name,f)));}
(async()=>{
 await test('download, digest, progress and no automatic install',async()=>{const t=setup();assert.equal((await t.api.download('0.1.8')).version,'0.1.8');assert.equal(t.calls.open.length,0);assert.equal(t.calls.quit,0);assert.ok(t.calls.progress.length);assert.equal(fs.readFileSync(downloaded(t.dir)[0]).toString(),bytes.toString());});
 await test('cancel install leaves application running',async()=>{const t=setup();await t.api.download('0.1.8');assert.equal((await t.api.install()).cancelled,true);assert.equal(t.calls.open.length,0);assert.equal(t.calls.quit,0);assert.equal(t.calls.dialogs[0].defaultId,0);});
 for(const language of ['en','zh-CN'])await test('explicit installation confirmation '+language,async()=>{const t=setup({confirm:1,language});await t.api.download('0.1.8');await t.api.install();assert.equal(t.calls.open.length,1);assert.equal(t.calls.quit,1);assert.equal(/安装/.test(t.calls.dialogs[0].message),language==='zh-CN');});
 await test('install requires verified download',async()=>{const t=setup();await assert.rejects(()=>t.api.install(),/verify/);});
 await test('changed installer rejected before execution',async()=>{const t=setup({confirm:1});await t.api.download('0.1.8');fs.writeFileSync(downloaded(t.dir)[0],Buffer.alloc(bytes.length,65));await assert.rejects(()=>t.api.install(),/changed/);assert.equal(t.calls.open.length,0);assert.equal(t.calls.quit,0);});
 await test('OS launch error does not quit app',async()=>{const t=setup({confirm:1,launchError:'Access denied'});await t.api.download('0.1.8');await assert.rejects(()=>t.api.install(),/Access denied/);assert.equal(t.calls.quit,0);});
 const rejects=[['downgrade',{current:'0.2.0'},/downgrade/],['version changed',{},/changed/,'0.1.9'],['development build',{packaged:false},/installed/],['GitHub rate limit',{http:403},/403/],['metadata timeout',{fetch:async()=>{throw new Error('timeout');}},/timeout/],['invalid version',{},/version/,'vbad'],['bad digest',{bytes:Buffer.alloc(bytes.length,65)},/checksum/],['short payload',{bytes:bytes.subarray(1)},/checksum/],['oversized payload',{bytes:Buffer.concat([bytes,bytes])},/size/],['unsafe redirect',{redirect:'http://example.com/payload.exe'},/Untrusted/],['foreign HTTPS redirect',{redirect:'https://example.com/payload.exe'},/Untrusted/]];
 for(const [name,options,error,expected] of rejects)await test(name,async()=>{const t=setup(options);await assert.rejects(()=>t.api.download(expected||'0.1.8'),error);assert.equal(t.calls.open.length,0);assert.equal(t.calls.quit,0);if(fs.existsSync(path.join(t.dir,'updates')))assert.equal(downloaded(t.dir).length,0);});
 for(const [name,change] of [['missing hash',r=>delete r.assets[0].digest],['foreign asset URL',r=>r.assets[0].browser_download_url='https://example.com/a.exe'],['missing asset',r=>r.assets=[]],['prerelease',r=>r.prerelease=true],['draft',r=>r.draft=true]])await test(name,async()=>{const r=fixture();change(r);const t=setup({release:r});await assert.rejects(()=>t.api.download('0.1.8'));assert.equal(t.calls.open.length,0);});
 await test('official CDN redirect accepted',async()=>{const t=setup({redirect:'https://release-assets.githubusercontent.com/test/installer'});await t.api.download('0.1.8');assert.equal(t.calls.requests.length,3);});
 await test('concurrent download prevented',async()=>{let releaseFetch;const t=setup({fetch:async url=>String(url).includes('api.github.com')?await new Promise(resolve=>{releaseFetch=()=>resolve(new Response(JSON.stringify(fixture())));}):new Response(bytes)});const first=t.api.download('0.1.8');await assert.rejects(()=>t.api.download('0.1.8'),/already running/);releaseFetch();await first;});
 function element(){return {textContent:'',style:{},hidden:false,disabled:false,setAttribute(){}};}
 for(const language of ['en','zh-CN'])await test('update UI states and language '+language,async()=>{
  const state={document:{documentElement:{lang:language}},window:{pixelStudioDesktop:{installUpdate(){}}},VERSION:'0.1.7',updateState:'idle',remoteVersion:'0.1.8',releaseNotes:'',packages:{installer:{url:base,name:'PixelStudio-Setup-0.1.8.exe',size:bytes.length}},packageSelect:{value:'installer',options:[{},{},{}]},installerUrl:'',downloadOpened:false,nativeUpdateState:'idle',nativeUpdateVersion:'',nativePercent:42};
  for(const name of ['updateVersionLabel','updateLegend','updateSummary','updateButton','packageLabel','updateStatus','updateNotes','updateDetails','releaseLink','installerButton','installerStatus','nativeUpdateStatus','nativeInstall'])state[name]=element();
  // Markdown rendering is covered separately by test-release-notes.cjs.
  state.renderReleaseNotes=(node,text)=>{node.textContent=text;};
  const context=vm.createContext(state);vm.runInContext(functions.get('renderNativeUpdate')+'\n'+functions.get('renderUpdate'),context);
  for(const status of ['idle','checking','empty','failed','limited','timeout','invalid','latest','ahead','newer']){state.updateState=status;vm.runInContext('renderUpdate()',context);assert.ok(state.updateStatus.textContent);assert.equal(state.installerButton.disabled,!['latest','newer'].includes(status));if(language==='en')assert.ok(!/\p{Script=Han}/u.test(state.updateStatus.textContent+state.installerStatus.textContent));}
  for(const native of ['downloading','ready','failed','installing']){state.nativeUpdateState=native;state.nativeUpdateVersion='0.1.8';vm.runInContext('renderNativeUpdate()',context);assert.equal(state.nativeInstall.disabled,native!=='ready');if(language==='en')assert.ok(!/\p{Script=Han}/u.test(state.nativeUpdateStatus.textContent));}
 });
 console.log(JSON.stringify({passed,failed,fixtures:output,realNetwork:false,realInstaller:false}));process.exitCode=failed?1:0;
})();
