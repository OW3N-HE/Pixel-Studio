'use strict';
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./pixel-render-settings.cjs'),require('./pixel-frame-mapping.cjs'));
  else root.PixelStudioFramePipeline=factory(root.PixelStudioRenderSettings,root.PixelStudioFrameMapping);
})(typeof globalThis!=='undefined'?globalThis:this,function(settings,mapping){
  const paletteModes=Object.freeze(['pocket_circuit','wave','portrait_portal','pocket_starwhale','ripples','waterfall','scene_cafe','scene_jellies','scene_train','scene_camp','scene_seasons','scene_gears']);
  function recolor(rgb,mode,palette,recolorFn){return paletteModes.includes(mode)&&typeof recolorFn==='function'?recolorFn(rgb,palette,mode):rgb;}
  function recolorRgba(rgba,mode,palette,recolorFn){
    if(!paletteModes.includes(mode)||typeof recolorFn!=='function')return rgba;
    const rgb=new Uint8Array(rgba.length/4*3);
    for(let i=0,j=0;i<rgba.length;i+=4,j+=3)rgb.set(rgba.subarray(i,i+3),j);
    const colored=recolor(rgb,mode,palette,recolorFn);
    for(let i=0,j=0;i<rgba.length;i+=4,j+=3)rgba.set(colored.subarray(j,j+3),i);
    return rgba;
  }
  // Gamma policy belongs to output callers, not artwork or the sensor sampler.
  function outputLut(brightness=255,exponent=1){
    const gain=Math.max(0,Math.min(255,Number(brightness)))/255;
    if(!Number.isFinite(gain)||!Number.isFinite(exponent)||exponent<=0)throw new TypeError('Invalid output color settings');
    return Uint8Array.from({length:256},(_,value)=>Math.round(255*Math.pow(value/255*gain,exponent)));
  }
  function render(engine,values,recolorFn){
    const options=settings.renderOptions(values);
    if(!engine.has(options.mode))throw new Error('Unknown animation: '+options.mode);
    const rgb=engine.render(options);
    return mapping.mapRgb(recolor(rgb,options.mode,options.clockPalette,recolorFn),options.width,options.height,options.mapping);
  }
  return Object.freeze({paletteModes,recolor,recolorRgba,outputLut,render});
});
