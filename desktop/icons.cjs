'use strict';
// Code-rendered runtime brand-mark from index.html / PixelStudioLogo.h.
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
let geometry;
function brandGeometry() {
  if (geometry) return geometry;
  if (require.main !== module) return geometry = require('./assets/brand-geometry.json');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const match = html.match(/(<svg class="brand-mark"[\s\S]*?<\/svg>)/);
  if (!match) throw new Error('The approved runtime brand-mark SVG is missing.');
  const roles = [];
  geometry = [];
  for (const tag of match[1].matchAll(/<g\b[^>]*>|<\/g>|<rect\b[^>]*\/>/g)) {
    const value = tag[0];
    if (value === '</g>') { roles.pop(); continue; }
    const attributes = Object.fromEntries([...value.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    if (value.startsWith('<g')) { roles.push(attributes.class); continue; }
    geometry.push({role:attributes.class || roles[roles.length-1],
      x:Number(attributes.x),y:Number(attributes.y),w:Number(attributes.width),h:Number(attributes.height),r:Number(attributes.rx),
      stroke:Number(attributes['stroke-width'] || 0),opacity:Number(attributes['stroke-opacity'] || 1)});
  }
  if (geometry.length !== 11 || geometry.filter(rect => rect.role === 'logo-halo').length !== 1) throw new Error('Unexpected runtime logo geometry; refusing to generate fallback artwork.');
  return geometry;
}
// Fixed branding uses ice blue; live icons follow the web header.
const brandTheme = 'ice';
const accents = {
  ice:'83d5f2', mint:'8ee6ba', amber:'ffbd75', rose:'efabc6',
  ocean:'549dc5', dark:'c4c4c4', black:'4cc2ff', light:'0078d4'
};
// Match the theme-tinted center colors already defined in index.html.
const centers = {
  ice:'12212c', mint:'112018', amber:'261d14', rose:'291a24',
  ocean:'12243e', dark:'303030', black:'101010', light:'26282c'
};
const themes = Object.fromEntries(Object.entries(accents).map(([theme,accent])=>[
  theme,[accent,'151515',centers[theme],
    ...Array(3).fill(theme==='dark'?'686868':accent)]
]));
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit=0; bit<8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const result = Buffer.alloc(data.length+12);
  result.writeUInt32BE(data.length,0); payload.copy(result,4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0,result.length-4);
  return result;
}
function iconViewport() {
  const edge = brandGeometry().find(rect => rect.role === 'logo-halo');
  return {start:edge.x-edge.stroke/2-.5,size:edge.w+edge.stroke+1};
}
function png(theme=brandTheme, size=64) {
  // System icons retain the same crisp highlight at every size, without glow.
  const shapes = brandGeometry();
  const highlight = [...shapes].reverse().find(rect => rect.role === 'logo-halo');
  const viewport = iconViewport();
  const viewStart = viewport.start, viewSize = viewport.size;
  const rectangles = shapes.filter(rect => rect.role !== 'logo-halo' || rect === highlight);
  const colors = (themes[theme] || themes[brandTheme]).map(hex => [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
  function inside(x,y,l,t,w,h,r) {
    const dx=Math.max(l+r-x,0,x-(l+w-r)), dy=Math.max(t+r-y,0,y-(t+h-r));
    return x>=l && x<=l+w && y>=t && y<=t+h && dx*dx+dy*dy<=r*r;
  }
  const rows=Buffer.alloc(size*(size*4+1));
  for(let py=0;py<size;py++) for(let px=0;px<size;px++) {
    const sum=[0,0,0]; let alpha=0;
    for(let sy=0;sy<4;sy++) for(let sx=0;sx<4;sx++) {
      const x=viewStart+(px+(sx+.5)/4)*viewSize/size,y=viewStart+(py+(sy+.5)/4)*viewSize/size;
      let c=colors[0],a=0;
      for(const rect of rectangles) {
        if(rect.role==='logo-halo') {
          // Match the SVG's filled highlight: no transparent seam beside the backplate.
          if(rect===highlight && inside(x,y,rect.x,rect.y,rect.w,rect.h,rect.r)) {c=colors[1];a=1;}
          const half=rect.stroke/2;
          const outer=inside(x,y,rect.x-half,rect.y-half,rect.w+rect.stroke,rect.h+rect.stroke,rect.r+half);
          const inner=inside(x,y,rect.x+half,rect.y+half,rect.w-rect.stroke,rect.h-rect.stroke,Math.max(0,rect.r-half));
          if(outer&&!inner) {
            const combined=rect.opacity+a*(1-rect.opacity);
            c=colors[0].map((channel,i)=>(channel*rect.opacity+c[i]*a*(1-rect.opacity))/combined);
            a=combined;
          }
        } else if(inside(x,y,rect.x,rect.y,rect.w,rect.h,rect.r)) {
          const tile=rect.y<8 ? (colors[4]||colors[3]||colors[0]) : rect.y>20 ? (colors[5]||colors[3]||colors[0]) : (colors[3]||colors[0]);
          c=rect.role==='logo-back'?colors[1]:rect.role==='logo-center'?colors[2]:rect.role==='logo-white'?[255,255,255]:tile;a=1;
        }
      }
      alpha+=a; for(let i=0;i<3;i++) sum[i]+=c[i]*a;
    }
    const offset=py*(size*4+1)+1+px*4;
    for(let i=0;i<3;i++) rows[offset+i]=alpha ? Math.round(sum[i]/alpha) : 0;
    rows[offset+3]=Math.round(alpha/16*255);
  }
  const header=Buffer.alloc(13); header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
function ico(theme=brandTheme) {
  const sizes=[16,24,32,48,64,256],images=sizes.map(s=>png(theme,s));
  const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
  let offset=header.length;
  sizes.forEach((s,i)=>{const at=6+16*i;header[at]=s%256;header[at+1]=s%256;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(images[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=images[i].length;});
  return Buffer.concat([header,...images]);
}
module.exports={png,ico,themes,brandTheme,iconViewport};
if(require.main===module){
  const dir=path.join(__dirname,'assets');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'brand-geometry.json'),JSON.stringify(brandGeometry())+'\n');
  // System icons are generated on demand; packaging and Sensors use the fixed ICO.
  fs.writeFileSync(path.join(dir,'pixel-studio.ico'),ico(brandTheme));
}
