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
  if (geometry.length !== 16) throw new Error('Unexpected runtime logo geometry; refusing to generate fallback artwork.');
  return geometry;
}
const themes = {
  ice: ['83d5f2','0c161d','12212c'], mint: ['8ee6ba','0b1510','112018'],
  amber: ['ffbd75','19130d','261d14'], rose: ['efabc6','1b1118','291a24'],
  ocean: ['549dc5','0b1328','12243e'], dark: ['c4c4c4','121212','1e1e1e','c4c4c4'],
  black: ['007bd9','000000','101010','007bd9'], light: ['0088ff','101113','26282c','0088ff']
};
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
function png(theme='ice', size=64) {
  const rectangles = brandGeometry();
  const colors = (themes[theme] || themes.ice).map(hex => [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
  function inside(x,y,l,t,w,h,r) {
    const dx=Math.max(l+r-x,0,x-(l+w-r)), dy=Math.max(t+r-y,0,y-(t+h-r));
    return x>=l && x<=l+w && y>=t && y<=t+h && dx*dx+dy*dy<=r*r;
  }
  const rows=Buffer.alloc(size*(size*4+1));
  for(let py=0;py<size;py++) for(let px=0;px<size;px++) {
    const sum=[0,0,0]; let alpha=0;
    for(let sy=0;sy<4;sy++) for(let sx=0;sx<4;sx++) {
      const x=(px+(sx+.5)/4)*32/size,y=(py+(sy+.5)/4)*32/size;
      let c=colors[0],a=0;
      for(const rect of rectangles) {
        if(rect.role==='logo-halo') {
          const half=rect.stroke/2;
          const outer=inside(x,y,rect.x-half,rect.y-half,rect.w+rect.stroke,rect.h+rect.stroke,rect.r+half);
          const inner=inside(x,y,rect.x+half,rect.y+half,rect.w-rect.stroke,rect.h-rect.stroke,Math.max(0,rect.r-half));
          if(outer&&!inner) a=rect.opacity+a*(1-rect.opacity);
        } else if(inside(x,y,rect.x,rect.y,rect.w,rect.h,rect.r)) {
          c=rect.role==='logo-back'?colors[1]:rect.role==='logo-center'?colors[2]:rect.role==='logo-white'?[255,255,255]:(colors[3]||colors[0]);a=1;
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
module.exports={png,themes};
if(require.main===module){
  const dir=path.join(__dirname,'assets');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'brand-geometry.json'),JSON.stringify(brandGeometry())+'\n');
  // Preserve the static packaging allowlist; extra themes render icons at runtime.
  for(const theme of ['ice','mint','amber','rose']) fs.writeFileSync(path.join(dir,theme+'.png'),png(theme,256));
  const sizes=[16,24,32,48,64,256],images=sizes.map(s=>png('ice',s));
  const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
  let offset=header.length;
  sizes.forEach((s,i)=>{const at=6+16*i;header[at]=s%256;header[at+1]=s%256;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(images[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=images[i].length;});
  fs.writeFileSync(path.join(dir,'pixel-studio.ico'),Buffer.concat([header,...images]));
}
