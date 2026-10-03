'use strict';
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PixelStudioRenderSettings=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const integer=(value,fallback)=>{const n=parseInt(value,10);return Number.isFinite(n)?n:fallback;};
  // Interactive SVG previews need a tighter budget than the headless renderer.
  const dimensionLimits=Object.freeze({maxAxis:512,maxPixels:4096});
  const defaultDimensions=Object.freeze({width:15,height:27});
  function validateDimensions(values={}){
    const axis=value=>typeof value==='number'?value:
      typeof value==='string'&&/^\d+$/.test(value.trim())?Number(value):NaN;
    const w=axis(values.width),h=axis(values.height);
    if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||
      w>dimensionLimits.maxAxis||h>dimensionLimits.maxAxis||w*h>dimensionLimits.maxPixels)return null;
    return {w,h,pixelCount:w*h};
  }
  function createDimensionState(initial=defaultDimensions){
    let current=validateDimensions(initial)||validateDimensions(defaultDimensions);
    return Object.freeze({
      read:()=>({...current}),
      update:values=>{const next=validateDimensions(values);if(!next)return false;current=next;return true;}
    });
  }
  function frameConfig(values={}){
    const dimensions=validateDimensions({width:values.width===undefined?15:values.width,height:values.height===undefined?27:values.height});
    if(!dimensions)throw new RangeError('Invalid preview dimensions');
    const {w,h,pixelCount}=dimensions;
    const d=Math.max(0,Math.min(255,integer(values.brightness,255)));
    return {w,h,d,pixelCount};
  }
  function renderOptions(values){
    const {width,height,time=0}=values;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>65536)
      throw new RangeError('Invalid animation dimensions');
    if(!Number.isFinite(time))throw new TypeError('Invalid animation time');
    return {...values,time,clockFont:values.clockFont||'rounded',clockPalette:values.clockPalette||'mint',
      thermal:values.thermal||{},temperatureSample:values.temperatureSample||null};
  }
  return Object.freeze({dimensionLimits,validateDimensions,createDimensionState,frameConfig,renderOptions});
});
