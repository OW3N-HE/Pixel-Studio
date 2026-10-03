'use strict';
(function(root){
  // Persistence contract only. Platforms retain their own storage and lifecycle.
  const playbackControlIds=Object.freeze([
    'controlMode','wledHost','baudRate','protocol','matrixW','matrixH',
    'mapping','fps','brightness','animationMode','animationSpeed',
    'clockFont','clockPalette','colorMode','colorGamma',
    'libraryCategory','librarySearch','psShuffleEnabled','psShuffleInterval'
  ]);
  function sanitizePlaybackValues(input){
    const values={};
    for(const key of playbackControlIds){
      if(typeof input?.[key]==='string'&&input[key].length<=256)values[key]=input[key];
    }
    if('matrixW' in values||'matrixH' in values){
      // Resolve lazily: the browser loads the schema before render settings.
      const settings=typeof module==='object'&&module.exports?require('./pixel-render-settings.cjs'):root.PixelStudioRenderSettings;
      const dimensions=settings?.validateDimensions({width:values.matrixW,height:values.matrixH});
      if(dimensions){values.matrixW=String(dimensions.w);values.matrixH=String(dimensions.h);}
      else{delete values.matrixW;delete values.matrixH;}
    }
    if(values.controlMode && !['serial','ddp'].includes(values.controlMode))values.controlMode='serial';
    if(values.protocol)values.protocol='adalight';
    return values;
  }
  // Desktop defaults are explicitly platform-scoped, not browser defaults.
  const desktopDefaults=Object.freeze({
    launchAtLogin:true,startHidden:true,closeToTray:true,resumePlayback:true,
    theme:'system',language:'auto',serialDevice:null,playback:null,
    mediaFolder:'',mediaSession:null
  });
  function sanitizeMediaSession(value){
    if(!value||typeof value!=='object')return null;
    const selected=typeof value.selected==='string'&&value.selected.length<=1024&&!/[\\/\0]/.test(value.selected)?value.selected:null;
    const lastAnimation=typeof value.lastAnimation==='string'&&value.lastAnimation.length<=256&&value.lastAnimation!=='file'?value.lastAnimation:'rainbow';
    return {mediaActive:value.mediaActive===true,selected,lastAnimation,shuffle:value.shuffle===true,interval:String(Math.min(3600,Math.max(3,Number(value.interval)||20)))};
  }
  function sanitizePlaybackState(value){
    if(!value||typeof value!=='object')return null;
    return {
      playing:value.playing===true,
      resumeRequested:typeof value.resumeRequested==='boolean'?value.resumeRequested:value.playing===true,
      connected:typeof value.connected==='boolean'?value.connected:value.playing===true,
      values:sanitizePlaybackValues(value.values)
    };
  }
  const api=Object.freeze({playbackControlIds,sanitizePlaybackValues,desktopDefaults,sanitizeMediaSession,sanitizePlaybackState});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PixelStudioSettingsSchema=api;
})(typeof globalThis!=='undefined'?globalThis:this);
