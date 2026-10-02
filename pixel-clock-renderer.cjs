'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./pixel-temperature.cjs'));else root.PixelStudioClock=factory(root.PixelStudioTemperature);})(typeof globalThis!=='undefined'?globalThis:this,function(temperature){
const clockPalettes = {
    mint:{hour:'#f2ebd6',minute:'#8af2c9',divider:'#397660'},
    amber:{hour:'#ffe2ab',minute:'#ffad59',divider:'#925628'},
    ice:{hour:'#e5f5ff',minute:'#6ad3f5',divider:'#356e88'},
    rose:{hour:'#fff0f5',minute:'#ff9ec3',divider:'#9e4d72'},
    violet:{hour:'#f5efff',minute:'#be97ff',divider:'#67508e'}
  };
function drawStudioClock(paint,dimensions,date=new Date(),font,palette) {
    const {w,h}=dimensions;
    font=font || 'rounded';
    palette=palette || 'mint';
    const custom=/^custom:(#[0-9a-f]{6}):(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i.exec(palette);
    const colors=custom ? {hour:custom[1],minute:custom[2],divider:custom[3]} : (clockPalettes[palette] || clockPalettes.mint);
    const hours=String(date.getHours()).padStart(2,'0'),minutes=String(date.getMinutes()).padStart(2,'0');
    paint.fillStyle='#000000';paint.fillRect(0,0,w,h);paint.imageSmoothingEnabled=false;
    const glyph=(digit,left,top,gw,gh,color)=>
      temperature.drawDigit(paint,font,digit,left,top,gw,gh,color);
    if(h>=w || w<24){
      const margin=w>=12 && h>=20 ? 1 : 0;
      const digitGap=w>=14 ? (w%2 ? 1 : 2) : 1;
      const gw=Math.max(1,Math.floor((w-margin*2-digitGap)/2));
      const groupW=gw*2+digitGap;
      const split=h>=20 ? (h%2 ? 3 : 2) : 1;
      const gh=Math.max(1,Math.floor((h-margin*2-split)/2));
      const top=Math.floor((h-(gh*2+split))/2),left=Math.floor((w-groupW)/2);
      [hours,minutes].forEach((line,row)=>[...line].forEach((digit,col)=>glyph(digit,left+col*(gw+digitGap),top+row*(gh+split),gw,gh,row?colors.minute:colors.hour)));
      paint.fillStyle=colors.divider;
      let dash=Math.min(w,Math.max(2,Math.min(4,Math.floor(w*.3))));
      if((w-dash)%2)dash=Math.max(1,dash-1);
      paint.fillRect(Math.floor((w-dash)/2),top+gh+(split%2?Math.floor(split/2):0),dash,split%2?1:split);
    }else{
      const gh=Math.max(1,h-2),gap=Math.max(1,Math.floor(w/32)),colon=2;
      const gw=Math.max(1,Math.floor((w-2-gap*2-colon-2)/4));
      const content=gw*4+gap*2+colon+2,left=Math.floor((w-content)/2),top=Math.floor((h-gh)/2);
      [...hours].forEach((digit,col)=>glyph(digit,left+col*(gw+gap),top,gw,gh,colors.hour));
      const cx=left+gw*2+gap;
      paint.fillStyle=colors.divider;paint.fillRect(cx+1,Math.floor(h*.35),1,1);paint.fillRect(cx+1,Math.floor(h*.65),1,1);
      [...minutes].forEach((digit,col)=>glyph(digit,cx+colon+2+col*(gw+gap),top,gw,gh,colors.minute));
    }
  }
return Object.freeze({draw:drawStudioClock,palettes:clockPalettes});
});
