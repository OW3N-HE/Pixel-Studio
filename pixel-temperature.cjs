(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PixelStudioTemperature=factory();
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const modes=Object.freeze({
    thermal_icons:{en:'Temperature Icons',zh:'图标温度'},
    thermal_digits:{en:'Large Temperatures',zh:'大数字温度'},
    thermal_labels:{en:'Temperature Labels',zh:'标签温度'},
    thermal_gauges:{en:'Temperature Bars',zh:'温度条'}
  });
  const messages=Object.freeze({
    category:{en:'Information',zh:'信息'},
    cpuColor:{en:'CPU color',zh:'CPU 颜色'},gpuColor:{en:'GPU color',zh:'GPU 颜色'},
    dividerColor:{en:'Divider color',zh:'分隔线颜色'},
    custom:{en:'Custom colors',zh:'自定义配色'},
    loading:{en:'Reading temperatures...',zh:'正在读取温度…'},
    unavailable:{en:'Temperature unavailable. Check the sensor component and permissions.',zh:'温度不可用，请检查采集组件与权限。'},
    stale:{en:'Temperature data expired. Reconnecting...',zh:'温度数据已过期，正在重新连接…'},
    missing:{en:'The temperature component is not installed.',zh:'尚未安装温度采集组件。'},
    unsupported:{en:'Temperature monitoring is currently available on Windows only.',zh:'温度采集目前仅支持 Windows。'},
    sample:{en:'Illustration only; not a live reading.',zh:'仅为示意，非实时温度。'},
    segment:{en:'Seven-segment',zh:'七段数码'},classic:{en:'Classic pixels',zh:'经典点阵'},
    rounded:{en:'Rounded pixels',zh:'圆角像素'},close:{en:'Close',zh:'关闭'},
    reset:{en:'Restore defaults',zh:'恢复默认'},done:{en:'Done',zh:'完成'}
  });
  const brands=Object.freeze({amd:'#ff514b',intel:'#299bff',nvidia:'#44ff53'});
  const glyphs={
    '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],
    '2':['111','001','111','100','111'],'3':['111','001','111','001','111'],
    '4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
    '6':['111','100','111','101','111'],'7':['111','001','001','001','001'],
    '8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
    '-':['000','000','111','000','000'],
    C:['111','100','100','100','111'],P:['111','101','111','100','100'],
    U:['101','101','101','101','111'],G:['111','100','101','101','111']
  };
  // Native 3x7 digits: never stretch a 3x5 glyph into duplicated horizontal rows.
  const compactDigits={
    '0':['111','101','101','101','101','101','111'],
    '1':['010','110','010','010','010','010','111'],
    '2':['111','001','001','111','100','100','111'],
    '3':['111','001','001','111','001','001','111'],
    '4':['101','101','101','111','001','001','001'],
    '5':['111','100','100','111','001','001','111'],
    '6':['111','100','100','111','101','101','111'],
    '7':['111','001','001','001','001','001','001'],
    '8':['111','101','101','111','101','101','111'],
    '9':['111','101','101','111','001','001','111'],
    '-':['000','000','000','111','000','000','000']
  };
  const cpuIcon=['0101010','1111111','1000001','1111111','0101010'];
  const gpuIcon=['1111111','1001001','1010101','1001001','1111111'];
  const classic={
    '0':['01110','10001','10011','10101','11001','10001','01110'],
    '1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','10001','00001','00010','00100','01000','11111'],
    '3':['11110','00001','00001','01110','00001','00001','11110'],
    '4':['00010','00110','01010','10010','11111','00010','00010'],
    '5':['11111','10000','10000','11110','00001','10001','01110'],
    '6':['00110','01000','10000','11110','10001','10001','01110'],
    '7':['11111','00001','00010','00100','01000','01000','01000'],
    '8':['01110','10001','10001','01110','10001','10001','01110'],
    '9':['01110','10001','10001','01111','00001','00010','01100'],
    '-':['00000','00000','00000','11111','00000','00000','00000']
  };
  // Shared by the clock and large temperatures, including center-sampled scaling.
  const rounded={
    0:['01110','11011','11011','11011','11011','11011','11011','11011','01110'],
    1:['00110','01110','00110','00110','00110','00110','00110','00110','01111'],
    2:['01110','11011','00011','00011','00110','01100','11000','11000','11111'],
    3:['11110','00011','00011','00110','00110','00011','00011','00011','11110'],
    4:['00011','00111','01111','11011','11011','11111','00011','00011','00011'],
    5:['11111','11000','11000','11110','00011','00011','00011','11011','01110'],
    6:['00110','01100','11000','11110','11011','11011','11011','11011','01110'],
    7:['11111','00011','00011','00110','00110','01100','01100','11000','11000'],
    8:['01110','11011','11011','11011','01110','11011','11011','11011','01110'],
    9:['01110','11011','11011','11011','01111','00011','00011','00110','01100']
  };
  function drawDigit(paint,font,digit,left,top,gw,gh,color){
    paint.fillStyle=color;
    if(digit==='-'){
      paint.fillRect(left,top+Math.floor(gh/2),gw,1);
    }else if(font==='segment'){
      const active=['abcedf','bc','abged','abgcd','fgbc','afgcd','afgecd','abc','abcdefg','abfgcd'][Number(digit)];
      if(!active)return;
      const stroke=Math.max(1,Math.floor(gw/4)),mid=Math.floor(gh/2);
      const horizontal=y=>paint.fillRect(left+stroke,top+y,Math.max(1,gw-stroke*2),stroke);
      const vertical=(x,y,length)=>paint.fillRect(left+x,top+y,stroke,Math.max(1,length));
      if(active.includes('a'))horizontal(0);
      if(active.includes('g'))horizontal(mid);
      if(active.includes('d'))horizontal(gh-stroke);
      if(active.includes('f'))vertical(0,stroke,mid-stroke);
      if(active.includes('b'))vertical(gw-stroke,stroke,mid-stroke);
      if(active.includes('e'))vertical(0,mid+stroke,gh-mid-stroke*2);
      if(active.includes('c'))vertical(gw-stroke,mid+stroke,gh-mid-stroke*2);
    }else{
      const rows=(font==='classic'?classic:rounded)[digit];
      if(!rows)return;
      for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)
        if(rows[Math.min(rows.length-1,Math.floor((y+.5)*rows.length/gh))][Math.min(4,Math.floor((x+.5)*5/gw))]==='1')
          paint.fillRect(left+x,top+y,1,1);
    }
  }
  function text(key,language){
    const item=messages[key]||modes[key];
    return item?item[/^zh(?:-|$)/i.test(language)?'zh':'en']:String(key);
  }
  function hex(value,fallback){return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;}
  function dim(color,gain){return '#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*gain).toString(16).padStart(2,'0')).join('');}
  function palette(settings={}){
    const cpu=brands[settings.cpuBrand==='intel'?'intel':'amd'];
    const gpu=brands[['amd','intel','nvidia'].includes(settings.gpuBrand)?settings.gpuBrand:'nvidia'];
    if(settings.custom===true)return {
      cpu:hex(settings.cpu,cpu),gpu:hex(settings.gpu,gpu),divider:hex(settings.divider,dim(gpu,.3))
    };
    return {cpu,gpu,divider:dim(gpu,.3)};
  }
  function temperature(value){return typeof value==='number'&&Number.isFinite(value)&&value>=-50&&value<=150?Math.round(value):null;}
  function values(sample){
    // The backend owns validity and failure state; rendering must not add an age cutoff.
    return {cpu:temperature(sample?.cpu?.temperature),gpu:temperature(sample?.gpu?.temperature)};
  }
  function drawResponsive(paint,{w,h},mode,readings,colors,settings){
    const horizontal=w>h;
    const split=Math.floor(((horizontal?w:h)-1)/2);
    const tiles=horizontal
      ? [{x:0,y:0,w:Math.max(1,split),h},{x:w-Math.max(1,split),y:0,w:Math.max(1,split),h}]
      : [{x:0,y:0,w,h:Math.max(1,split)},{x:0,y:h-Math.max(1,split),w,h:Math.max(1,split)}];
    const wordRows=(word,alphabet)=>{
      const rows=alphabet[word[0]];
      return rows.map((_,y)=>[...word].map(ch=>alphabet[ch][y]).join('0'));
    };
    for(const [i,kind] of ['cpu','gpu'].entries()){
      const tile=tiles[i],color=colors[kind],value=readings[kind];
      const word=value===null?'--':String(value);
      // Keep every primitive inside its own CPU/GPU region on tiny matrices.
      const ink={fillStyle:color,fillRect(x,y,rw,rh){
        const left=Math.max(tile.x,Math.round(x)),top=Math.max(tile.y,Math.round(y));
        const right=Math.min(tile.x+tile.w,Math.round(x+rw)),bottom=Math.min(tile.y+tile.h,Math.round(y+rh));
        if(right>left&&bottom>top){paint.fillStyle=this.fillStyle;paint.fillRect(left,top,right-left,bottom-top);}
      }};
      if(mode==='thermal_digits'){
        const font=settings.font||'segment',fontHeight=font==='classic'?7:9;
        const margin=tile.w>=12&&tile.h>=10?1:0,gap=tile.w>=word.length*3?1:0;
        const gw=Math.max(1,Math.floor(Math.min((tile.w-margin*2-gap*(word.length-1))/word.length,(tile.h-margin*2)*5/fontHeight)));
        const gh=Math.max(1,Math.min(tile.h-margin*2,Math.round(gw*fontHeight/5)));
        const left=tile.x+Math.floor((tile.w-gw*word.length-gap*(word.length-1))/2);
        const top=tile.y+Math.floor((tile.h-gh)/2);
        [...word].forEach((digit,col)=>drawDigit(ink,font,digit,left+col*(gw+gap),top,gw,gh,color));
        continue;
      }
      const gauge=mode==='thermal_gauges'&&tile.h>=7;
      const compact=tile.h<13||gauge;
      const digits=wordRows(word,compact?glyphs:compactDigits);
      let header=null;
      if(tile.h>=9&&tile.w>=5){
        if(mode==='thermal_labels'&&tile.w>=11&&tile.h>=11)header=wordRows(kind.toUpperCase(),glyphs);
        else header=tile.h>=11&&tile.w>=7 ? (i?gpuIcon:cpuIcon)
          : (i?['11111','10101','11111']:['10101','11111','10101']);
      }
      const degree=value!==null&&tile.w>=digits[0].length+4;
      const numberWidth=digits[0].length+(degree?4:0);
      const baseWidth=Math.max(numberWidth,header?header[0].length:0);
      const baseHeight=digits.length+(header?header.length+1:0)+(gauge?2:0);
      const fit=Math.min(tile.w/baseWidth,tile.h/baseHeight);
      // Whole-pixel multiples preserve stroke weight. Only genuinely smaller
      // matrices use nearest-neighbour reduction, never smoothing/stretching.
      const scale=fit>=1?Math.floor(fit):fit;
      const top=tile.y+Math.floor((tile.h-baseHeight*scale)/2);
      const bitmap=(rows,x,y)=>{
        ink.fillStyle=color;
        for(let py=0;py<rows.length;py++)for(let px=0;px<rows[0].length;px++)
          if(rows[py][px]==='1')ink.fillRect(x+px*scale,y+py*scale,scale,scale);
      };
      if(header)bitmap(header,tile.x+Math.floor((tile.w-header[0].length*scale)/2),top);
      const numberTop=top+(header?header.length+1:0)*scale;
      const numberLeft=tile.x+Math.floor((tile.w-numberWidth*scale)/2);
      bitmap(digits,numberLeft,numberTop);
      if(degree)bitmap(['010','101','010'],numberLeft+(digits[0].length+1)*scale,numberTop);
      if(gauge){
        const inset=tile.w>=5?1:0,width=Math.max(1,tile.w-inset*2);
        const y=top+(baseHeight-1)*scale;
        ink.fillStyle='#11191e';ink.fillRect(tile.x+inset,y,width,Math.max(1,scale));
        const count=value===null?0:Math.round(Math.max(0,Math.min(100,value))/100*width);
        ink.fillStyle=color;ink.fillRect(tile.x+inset,y,count,Math.max(1,scale));
      }
    }
    if(mode==='thermal_digits'){
      paint.fillStyle=colors.divider;
      if(horizontal)paint.fillRect(Math.floor(w/2),Math.max(0,Math.floor((h-3)/2)),1,Math.min(3,h));
      else paint.fillRect(Math.max(0,Math.floor((w-3)/2)),Math.floor(h/2),Math.min(3,w),1);
    }
    return true;
  }
  function draw(paint,dimensions,mode,sample,settings={},now=Date.now()){
    if(!Object.hasOwn(modes,mode))return false;
    const {w,h}=dimensions;
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>16384)throw new RangeError('Invalid temperature canvas');
    const colors=palette(settings),readings=values(sample,now);
    paint.fillStyle='#000000';paint.fillRect(0,0,w,h);paint.imageSmoothingEnabled=false;
    if(!((w===15&&h===27)||(w===14&&h===26)))
      return drawResponsive(paint,dimensions,mode,readings,colors,settings);
    const put=(x,y,color)=>{if(x>=0&&y>=0&&x<w&&y<h){paint.fillStyle=color;paint.fillRect(x,y,1,1);}};
    const pattern=(rows,x,y,color,gw=rows[0].length,gh=rows.length)=>{
      for(let py=0;py<gh;py++)for(let px=0;px<gw;px++){
        if(rows[Math.min(rows.length-1,Math.floor(py*rows.length/gh))][Math.min(rows[0].length-1,Math.floor(px*rows[0].length/gw))]==='1')put(x+px,y+py,color);
      }
    };
    const label=(word,y,color)=>{
      const width=word.length*4-1,x=Math.floor((w-width)/2);
      [...word].forEach((ch,i)=>pattern(glyphs[ch],x+i*4,y,color));
    };
    function number(value,top,height,color,large){
      const word=value===null?'--':String(value),gap=1;
      let gw=large?Math.min(6,Math.floor((w-2-(word.length-1)*gap)/word.length)):3;
      gw=Math.max(1,gw);
      const width=word.length*gw+(word.length-1)*gap,left=Math.floor((w-width)/2);
      [...word].forEach((ch,i)=>{
        const x=left+i*(gw+gap);
        if(large)drawDigit(paint,settings.font||'segment',ch,x,top,gw,height,color);
        else pattern(height===7?compactDigits[ch]:glyphs[ch],x,top,color,gw,height);
      });
      // Degrees never participate in centering; omit rather than clip on narrow canvases.
      if(!large&&value!==null&&left+width+4<=w)pattern(['010','101','010'],left+width+1,top,color);
    }
    const half=Math.floor((h-1)/2),lower=h-half;
    if(mode==='thermal_digits'){
      const height=Math.max(1,half-2);
      number(readings.cpu,1,height,colors.cpu,true);
      number(readings.gpu,lower+1,height,colors.gpu,true);
      const dash=w>=3?3:1;
      for(let x=Math.floor((w-dash)/2);x<Math.floor((w-dash)/2)+dash;x++)put(x,Math.floor(h/2),colors.divider);
    }else{
      for(const [i,kind] of ['cpu','gpu'].entries()){
        const top=i?lower:0,color=colors[kind];
        if(mode==='thermal_labels')label(kind.toUpperCase(),top,color);
        else {const icon=i?gpuIcon:cpuIcon;pattern(icon,Math.floor((w-icon[0].length)/2),top,color);}
        const gauge=mode==='thermal_gauges',height=Math.max(1,Math.min(gauge?5:7,half-6));
        number(readings[kind],top+6,height,color,false);
        if(gauge){
          const length=Math.max(1,w-2),count=readings[kind]===null?0:Math.round(Math.max(0,Math.min(100,readings[kind]))/100*length);
          for(let x=0;x<length;x++)put(x+1,top+half-1,x<count?color:'#11191e');
        }
      }
    }
    return true;
  }
  return Object.freeze({modes,messages,brands,text,palette,values,draw,drawDigit});
});
