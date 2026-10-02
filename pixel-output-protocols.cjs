'use strict';
(function(root,factory){
if(typeof module==='object'&&module.exports)module.exports=factory();
else root.PixelStudioOutputProtocols=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){

function validate(rgb,lut){
 if(!ArrayBuffer.isView(rgb)||rgb.BYTES_PER_ELEMENT!==1||!rgb.length||rgb.length%3)throw new TypeError('Expected RGB24 byte frame');
 if(lut&&(!ArrayBuffer.isView(lut)||lut.BYTES_PER_ELEMENT!==1||lut.length!==256))throw new TypeError('Expected 256-byte color LUT');
}
function encodeAdalight(rgb,lut){
 validate(rgb,lut);const count=rgb.length/3-1;
 if(count>65535)throw new RangeError('Adalight supports at most 65536 pixels');
 const packet=new Uint8Array(rgb.length+6),hi=count>>8,lo=count&255;
 packet.set([65,100,97,hi,lo,hi^lo^0x55]);
 for(let i=0;i<rgb.length;i++)packet[i+6]=lut?lut[rgb[i]]:rgb[i];return packet;
}
function encodeDdp(rgb,{lut,sequence=0,maxPayload=1440,destination=1}={}){
 validate(rgb,lut);
 if(!Number.isInteger(sequence)||sequence<0||sequence>15)throw new RangeError('Invalid DDP sequence');
 if(!Number.isInteger(maxPayload)||maxPayload<3||maxPayload>65535||maxPayload%3)throw new RangeError('Invalid DDP payload size');
 if(!Number.isInteger(destination)||destination<0||destination>255)throw new RangeError('Invalid DDP destination');
 const packets=[];
 for(let offset=0;offset<rgb.length;offset+=maxPayload){
  const count=Math.min(maxPayload,rgb.length-offset),packet=new Uint8Array(10+count),view=new DataView(packet.buffer);
  packet[0]=0x40|(offset+count===rgb.length?1:0);sequence=sequence%15+1;
  packet[1]=sequence;packet[2]=0x0b;packet[3]=destination;view.setUint32(4,offset);view.setUint16(8,count);
  for(let i=0;i<count;i++)packet[10+i]=lut?lut[rgb[offset+i]]:rgb[offset+i];packets.push(packet);
 }return {packets,sequence};
}
return Object.freeze({encodeAdalight,encodeDdp});
});
