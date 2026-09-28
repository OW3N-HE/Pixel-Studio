'use strict';
// Code-rendered version of the existing PixelStudioLogo.h geometry.
const zlib = require('node:zlib');
const themes = {
  ice: ['83d5f2','0c161d','12212c'], mint: ['8ee6ba','0b1510','112018'],
  amber: ['ffbd75','19130d','261d14'], rose: ['efabc6','1b1118','291a24']
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
function png(theme='ice', size=64, compact=false) {
  const colors = (themes[theme] || themes.ice).map(hex => [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
  function inside(x,y,l,t,w,h,r) {
    const dx=Math.max(l+r-x,0,x-(l+w-r)), dy=Math.max(t+r-y,0,y-(t+h-r));
    return x>=l && x<=l+w && y>=t && y<=t+h && dx*dx+dy*dy<=r*r;
  }
  const rows=Buffer.alloc(size*(size*4+1));
  for(let py=0;py<size;py++) for(let px=0;px<size;px++) {
    const sum=[0,0,0]; let alpha=0;
    for(let sy=0;sy<4;sy++) for(let sx=0;sx<4;sx++) {
      const span=compact ? 28 : 32, inset=(32-span)/2;
      const x=inset+(px+(sx+.5)/4)*span/size,y=inset+(py+(sy+.5)/4)*span/size;
      let c=colors[0],a=0;
      for(let stroke=compact ? 1 : 6;stroke>=1;stroke--) {
        if(inside(x,y,3-stroke/2,3-stroke/2,26+stroke,26+stroke,3+stroke/2)) a=stroke===1 ? .75 : Math.max(a,.05*(7-stroke));
      }
      if(inside(x,y,3.8,3.8,24.4,24.4,2.2)){ c=colors[1]; a=1; }
      const tile=(24.4-3.2)/3;
      for(let row=0;row<3;row++) for(let col=0;col<3;col++) {
        if(inside(x,y,4.6+col*(tile+.8),4.6+row*(tile+.8),tile,tile,.894)) {
          c=row===1&&col===1 ? colors[2] : row===2&&col===2 ? [255,255,255] : colors[0]; a=1;
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
  const fs=require('node:fs'),path=require('node:path');
  const dir=path.join(__dirname,'assets');fs.mkdirSync(dir,{recursive:true});
  for(const theme of Object.keys(themes)) fs.writeFileSync(path.join(dir,theme+'.png'),png(theme,256));
  const sizes=[16,24,32,48,64,256],images=sizes.map(s=>png('ice',s));
  const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
  let offset=header.length;
  sizes.forEach((s,i)=>{const at=6+16*i;header[at]=s%256;header[at+1]=s%256;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(images[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=images[i].length;});
  fs.writeFileSync(path.join(dir,'pixel-studio.ico'),Buffer.concat([header,...images]));
}
