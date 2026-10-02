'use strict';
// Pure drawing + postprocessing. No HTML, DOM, VM, timers, I/O or sampler ownership.
const animations=require('./pixel-animation-engine.cjs');
const pipeline=require('./pixel-frame-pipeline.cjs');
const mappings=require('./pixel-frame-mapping.cjs');
const recolor=require('./pixel-circuit-palette.cjs');
module.exports=function createRenderer(){
  const modes=animations.list().map(entry=>entry.id);
  return {modes,render(mode,w,h,time,mapping,clockFont,clockPalette,thermal,temperatureSample,date){
    if(!mappings.modes.includes(mapping))throw new Error('Unknown pixel mapping: '+mapping);
    return pipeline.render(animations,{mode,width:w,height:h,time,mapping,clockFont,clockPalette,thermal,temperatureSample,date},recolor);
  }};
};
