'use strict';
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PixelStudioFrameMapping=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const modes=Object.freeze(['row','serpentine']);
  function validate(width,height,mapping){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>512||height>512)
      throw new RangeError('Invalid frame dimensions');
    if(!modes.includes(mapping))throw new Error('Unknown pixel mapping: '+mapping);
  }
  function index(x,y,width,mapping){return y*width+(mapping==='serpentine'&&y%2===1?width-1-x:x);}
  function fromRgba(rgba,width,height,mapping='row',brightness=255){
    validate(width,height,mapping);
    if(!rgba||rgba.length!==width*height*4)throw new RangeError('Incorrect RGBA frame size');
    const gain=Math.max(0,Math.min(255,brightness))/255,rgb=new Uint8Array(width*height*3);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const source=(y*width+x)*4,target=index(x,y,width,mapping)*3;
      for(let channel=0;channel<3;channel++)rgb[target+channel]=Math.round(rgba[source+channel]*gain);
    }
    return rgb;
  }
  function mapRgb(rgb,width,height,mapping='row'){
    validate(width,height,mapping);
    if(!rgb||rgb.length!==width*height*3)throw new RangeError('Incorrect RGB frame size');
    const result=new Uint8Array(rgb.length);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const source=(y*width+x)*3,target=index(x,y,width,mapping)*3;
      result.set(rgb.subarray(source,source+3),target);
    }
    return result;
  }
  return Object.freeze({modes,index,fromRgba,mapRgb});
});
