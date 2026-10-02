'use strict';
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PixelStudioRenderSettings=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const integer=(value,fallback)=>{const n=parseInt(value,10);return Number.isFinite(n)?n:fallback;};
  // Keep existing UI defaults and limits; strict rendering validation is separate.
  function frameConfig(values={}){
    const w=Math.max(1,Math.min(512,integer(values.width,15)));
    const h=Math.max(1,Math.min(512,integer(values.height,27)));
    const d=Math.max(0,Math.min(255,integer(values.brightness,255)));
    return {w,h,d,pixelCount:w*h};
  }
  function renderOptions(values){
    const {width,height,time=0}=values;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>65536)
      throw new RangeError('Invalid animation dimensions');
    if(!Number.isFinite(time))throw new TypeError('Invalid animation time');
    return {...values,time,clockFont:values.clockFont||'rounded',clockPalette:values.clockPalette||'mint',
      thermal:values.thermal||{},temperatureSample:values.temperatureSample||null};
  }
  return Object.freeze({frameConfig,renderOptions});
});
