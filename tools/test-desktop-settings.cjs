'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'desktop/preload.cjs'),'utf8');
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.value='';}
  setAttribute(key,value){this.attributes[key]=value;}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  insertBefore(node,reference){if(reference&&reference.parentElement!==this)throw new Error('NotFoundError: reference is not a child');node.parentElement=this;const at=reference?this.children.indexOf(reference):this.children.length;this.children.splice(at,0,node);}
  addEventListener(name,callback){this.listeners[name]=callback;}
  dispatchEvent(event){this.listeners[event.type]?.(event);return true;}
  click(){this.listeners.click?.();}
}
async function run(language,legacy=false){
  const body=new Element(),output=new Element('fieldset'),notice=new Element(),updates=new Element('fieldset');
  output.append(notice);body.append(output,updates);updates.id='psSoftwareUpdates';
  body.querySelector=selector=>selector==='[data-update-ui]'?notice:selector.startsWith(':scope >')?updates:null;
  const ids={webLanguage:new Element('select'),webTheme:new Element('select'),brightness:new Element('input'),disconnectBtn:new Element('button')};
  ids.webLanguage.value=language;ids.webTheme.value='ice';
  const calls=[],events=[],listeners={};
  const settings={launchAtLogin:true,startHidden:true,closeToTray:true,resumePlayback:true,canLaunchAtLogin:true,playback:{values:{brightness:'137'}}};
  const ipcRenderer={on(){},send:(...args)=>calls.push(args),invoke:async(channel,patch)=>{calls.push([channel,patch]);return channel==='desktop:settings'?{...settings,...patch}:true;}};
  const window={addEventListener:(name,callback)=>{listeners[name]=callback;},dispatchEvent:event=>{events.push(event.type);listeners[event.type]?.(event);}};
  const document={documentElement:{lang:language,dataset:{}},getElementById:id=>ids[id],querySelector:()=>body,createElement:tag=>new Element(tag)};
  class Event {constructor(type){this.type=type;}}
  const context=vm.createContext({require:()=>({ipcRenderer,contextBridge:{exposeInMainWorld:(key,value)=>{window[key]=value;}}}),process:{argv:[]},window,document,MutationObserver:class{observe(){}disconnect(){}},Event,CustomEvent:Event,console});
  const code=legacy?source.replace("body.insertBefore(group,updates);","body.insertBefore(group,body.querySelector('[data-update-ui]')); "):source;
  vm.runInContext(code,context);
  if(legacy){assert.throws(()=>listeners.DOMContentLoaded(),/NotFoundError/);assert.equal(calls.length,0);return;}
  listeners.DOMContentLoaded();await new Promise(resolve=>setImmediate(resolve));
  const group=body.children.find(node=>node.className?.includes('ps-desktop-settings'));
  assert.ok(group);assert.equal(body.children.indexOf(group)+1,body.children.indexOf(updates));
  const switches=group.children.find(node=>node.className==='ps-desktop-switches');
  assert.equal(switches.children.length,4);
  for(const option of switches.children){assert.equal(option.children[0].checked,true);assert.equal(option.children[0].disabled,false);if(language==='en')assert.ok(!/\p{Script=Han}/u.test(option.children[1].textContent));}
  assert.equal(ids.brightness.value,'137');assert.ok(!calls.some(([channel])=>channel==='desktop:resume'||channel==='desktop:restore-connection'));assert.equal(document.documentElement.dataset.desktopReady,'true');assert.ok(events.includes('pixel-studio-desktop-ready'));
  const close=switches.children[2].children[0];close.checked=false;await close.listeners.change();assert.ok(calls.some(([channel,patch])=>channel==='desktop:settings'&&patch?.closeToTray===false));
  assert.equal(typeof window.pixelStudioDesktop.downloadUpdate,'function');
  await window.pixelStudioDesktop.downloadUpdate('0.1.8');assert.ok(calls.some(([channel,request])=>channel==='desktop:update'&&request.version==='0.1.8'));
}
(async()=>{
  await run('en',true);console.log('PASS reproduce previous nested-notice insertion failure');
  for(const language of ['en','zh-CN']){await run(language);console.log('PASS desktop settings, remembered values, resume initialization and update IPC: '+language);}
  const ui=fs.readFileSync(path.join(root,'pixel-studio-web-ui.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'pixel-studio-web-ui.css'),'utf8');
  assert.ok(ui.includes("updateArea.id = 'psSoftwareUpdates'"));
  assert.match(css,/#psSoftwareUpdates\s*\{[^}]*gap:\s*14px/);
  assert.match(css,/\.ps-desktop-switches\s*\{[^}]*grid-template-columns:\s*repeat\(2,/);
  console.log('PASS stable update group anchor and two-column desktop layout rules');
  console.log('No application launched, personal settings changed, or device output sent. DOM/IPC are mocked; visual and real-device behavior are not tested.');
})().catch(error=>{console.error(error);process.exitCode=1;});
