'use strict';
// Run the same trusted, local animation definitions without a browser or DOM timers.
// The canvas adapter implements the integer pixel drawing used by this project.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const recolorCircuit = require('./pixel-circuit-palette.cjs');
const { performance } = require('node:perf_hooks');

function createCanvas() {
  let width = 300, height = 150, pixels = new Uint8ClampedArray(width * height * 4);
  let previousStyle = null, ink = [0,0,0,255];
  const channel = value => Math.max(0,Math.min(255,Math.round(value)));
  function color(style) {
    if (style === previousStyle) return ink;
    previousStyle = style;
    if (style === 'black') style = '#000000';
    if (style === 'white') style = '#ffffff';
    if (style.startsWith('#')) {
      let hex = style.slice(1);
      if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c+c).join('');
      ink = [0,2,4].map(i => parseInt(hex.slice(i,i+2),16));
      ink.push(hex.length === 8 ? parseInt(hex.slice(6,8),16) : 255);
    } else {
      const numbers = (style.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) || []).map(Number);
      if (style.startsWith('rgb')) ink = [numbers[0],numbers[1],numbers[2],numbers.length>3 ? numbers[3]*255 : 255];
      else if (style.startsWith('hsl')) {
        const hue = ((numbers[0]%360)+360)%360/360, sat = numbers[1]/100, light = numbers[2]/100;
        const f = n => { const k=(n+hue*12)%12; return 255*(light-sat*Math.min(light,1-light)*Math.max(-1,Math.min(k-3,9-k,1))); };
        ink = [f(0),f(8),f(4),numbers.length>3 ? numbers[3]*255 : 255];
      } else throw new Error('Unsupported pixel color: '+style);
    }
    if (ink.some(n => !Number.isFinite(n))) throw new Error('Invalid pixel color');
    ink = ink.map(channel);return ink;
  }
  function rectangle(x,y,w,h,clear) {
    if (![x,y,w,h].every(Number.isFinite)) throw new Error('Invalid pixel rectangle');
    const left=Math.max(0,Math.floor(Math.min(x,x+w))),right=Math.min(width,Math.ceil(Math.max(x,x+w)));
    const top=Math.max(0,Math.floor(Math.min(y,y+h))),bottom=Math.min(height,Math.ceil(Math.max(y,y+h)));
    const c=clear ? [0,0,0,0] : color(context.fillStyle);
    for(let row=top;row<bottom;row++)for(let col=left;col<right;col++) {
      const at=(row*width+col)*4;
      if(clear || c[3]===255) { pixels[at]=c[0];pixels[at+1]=c[1];pixels[at+2]=c[2];pixels[at+3]=c[3]; }
      else { const alpha=c[3]/255;for(let k=0;k<3;k++)pixels[at+k]=c[k]*alpha+pixels[at+k]*(1-alpha);pixels[at+3]=255; }
    }
  }
  const context = {
    fillStyle:'#000000',imageSmoothingEnabled:false,
    setTransform(){},
    fillRect(x,y,w,h){rectangle(x,y,w,h,false);},
    clearRect(x,y,w,h){rectangle(x,y,w,h,true);},
    getImageData(){return {data:pixels};},
    drawImage(){throw new Error('Image/video rendering requires a decoded frame source');}
  };
  const canvas = {
    getContext:()=>context,
    toDataURL:()=>'', // No PNG encoding or preview DOM work in the output thread.
    get width(){return width;},
    set width(value){width=Number(value);pixels=new Uint8ClampedArray(width*height*4);},
    get height(){return height;},
    set height(value){height=Number(value);pixels=new Uint8ClampedArray(width*height*4);}
  };
  return canvas;
}

module.exports = function createRenderer() {
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  let source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function drawPixelAnimation('));
  if (!source) throw new Error('Animation source is missing from index.html');
  const nodes=[],ids=new Map();
  class Element {
    constructor(tag='div') {
      Object.assign(this,{tag,value:'',textContent:'',className:'',style:{},dataset:{},children:[],files:[],hidden:false,
        parentElement:{clientWidth:400},attributes:{},options:[]});
      nodes.push(this);
      this.classList={add(){},remove(){},toggle(){}};
    }
    addEventListener(){}
    dispatchEvent(){return true;}
    append(...items){this.children.push(...items);}
    setAttribute(key,value){this.attributes[key]=value;}
    get selectedOptions(){return this.options.filter(o=>o.value===this.value);}
  }
  for(const match of html.matchAll(/<(\w+)\b[^>]*>/g)) {
    const id=/\bid="([^"]+)"/.exec(match[0])?.[1];
    if(!id && !/data-(filter|resolution)=/.test(match[0]))continue;
    const element=new Element(match[1]);
    if(id){element.id=id;ids.set(id,element);}
    element.value=/\bvalue="([^"]*)"/.exec(match[0])?.[1] || '';
    element.checked=/\bchecked\b/.test(match[0]);
    element.className=/\bclass="([^"]+)"/.exec(match[0])?.[1] || '';
    for(const data of match[0].matchAll(/data-([a-z]+)="([^"]+)"/g))element.dataset[data[1]]=data[2];
    if(match[1]==='select') {
      element.options=[...html.slice(match.index,html.indexOf('</select>',match.index)).matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)]
        .map(o=>({value:/value="([^"]+)"/.exec(o[1])?.[1] || '',textContent:o[2],selected:/\bselected\b/.test(o[1])}));
      element.value=(element.options.find(o=>o.selected) || element.options[0])?.value || '';
    }
  }
  const document={
    getElementById:id=>ids.get(id),querySelector:()=>null,
    querySelectorAll:selector=>selector==='[data-resolution]' ? nodes.filter(n=>n.dataset.resolution) : selector==='[data-filter]' ? nodes.filter(n=>n.dataset.filter) : [],
    createElement:tag=>tag==='canvas' ? createCanvas() : new Element(tag),addEventListener(){},hidden:false
  };
  const sandbox={console,document,performance,Date,Math,Uint8Array,Uint8ClampedArray,TextEncoder,TextDecoder,URL,Blob,recolorCircuit,
    AbortController,Event:class{constructor(type){this.type=type;}},navigator:{},innerWidth:1200,innerHeight:900,
    pixelStudioHeadless:true,
    addEventListener(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
    requestAnimationFrame:()=>0,cancelAnimationFrame(){},
    fetch:()=>Promise.reject(new Error('Network access belongs to the DDP transport, not the renderer'))};
  sandbox.window=sandbox;
  // The HTML remains the sole animation source. Do not initialize the gallery or UI loops here.
  source=source.replace(/\bsetupStudio\(\);/g,'');
  const end=source.lastIndexOf('})();');
  if(end<0)throw new Error('Animation bootstrap is missing');
  const exports=String.raw`
    globalThis.pixelRenderer={
      modes:Object.keys(animationDescriptions),
      mappings:ui.mapping.options.map(option=>option.value),
      render(mode,w,h,time,mapping,clockFont,clockPalette){
        ui.matrixW.value=String(w);ui.matrixH.value=String(h);ui.mapping.value=mapping;
        document.getElementById('clockFont').value=clockFont || 'rounded';
        document.getElementById('clockPalette').value=clockPalette || 'mint';
        ui.brightness.value='255';ui.controlMode.value='ddp';
        ui.protocol.value=ui.protocol.options.find(option=>option.value!=='raw-bin').value;
        animationElapsed=time;animationSpeed=1;animationLastTime=performance.now();
        const frame = buildGeneratedFrame(mode);
        return ['pocket_circuit','wave','portrait_portal','pocket_starwhale','ripples','waterfall','scene_cafe','scene_jellies','scene_train','scene_camp','scene_seasons','scene_gears'].includes(mode)
          ? recolorCircuit(frame, clockPalette, mode) : frame;
      }
    };
  `;
  vm.runInNewContext(source.slice(0,end)+exports+source.slice(end),sandbox,{filename:'pixel-animation-runtime.js',timeout:2000});
  const renderer=sandbox.pixelRenderer;
  return {
    modes:renderer.modes,
    render(mode,w,h,time,mapping,clockFont,clockPalette){
      if(!renderer.modes.includes(mode))throw new Error('Unknown animation: '+mode);
      if(!renderer.mappings.includes(mapping))throw new Error('Unknown pixel mapping: '+mapping);
      const rgb=renderer.render(mode,w,h,time,mapping,clockFont,clockPalette);
      if(!rgb || rgb.length!==w*h*3)throw new Error('Incorrect animation frame size');
      return rgb;
    }
  };
};
