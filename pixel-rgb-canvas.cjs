'use strict';
(function(root,factory){
if(typeof module==='object'&&module.exports)module.exports=factory();
else root.PixelStudioRgbCanvas=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
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
return createCanvas;
});
