'use strict';
// Adapted from user-provided DeepSeek design pack (2026-09-30).
// Static functions only. No source evaluation, DOM, devices or sampler ownership.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PixelStudioDesigns=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
function helpers(paint,width,height){
 const w=15,h=27;
 const clamp=n=>Math.max(0,Math.min(1,n));
 const rgb=(r,g,b)=>'rgb('+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v)))).join(',')+')';
 const hue=(n,light=45)=>'hsl('+(((n%360)+360)%360)+',100%,'+light+'%)';
 const seed=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
 function fill(x,y,rw,rh,c){
  const left=Math.round(x),top=Math.round(y),right=Math.round(x+rw),bottom=Math.round(y+rh);
  const x0=Math.max(0,Math.min(w,left)),y0=Math.max(0,Math.min(h,top));
  const x1=Math.max(0,Math.min(w,right)),y1=Math.max(0,Math.min(h,bottom));
  if(x1<=x0||y1<=y0)return;
  paint.fillStyle=c;
  const sx=Math.round(x0*width/w),sy=Math.round(y0*height/h);
  paint.fillRect(sx,sy,Math.round(x1*width/w)-sx,Math.round(y1*height/h)-sy);
 }
 const pixel=(x,y,c)=>fill(Math.round(x),Math.round(y),1,1,c);
 const put=(x,y,c)=>{if(x>=0&&y>=0&&x<w&&y<h)pixel(x,y,c);};
 const sprite=(rows,cx,cy,c,scale=1)=>{const left=Math.floor(cx-rows[0].length*scale/2),top=Math.floor(cy-rows.length*scale/2);rows.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(row[x]==='1')fill(left+x*scale,top+y*scale,scale,scale,c);});};
 return {w,h,clamp,rgb,hue,seed,pixel,fill,put,sprite};
}
const designs=[
 {id:"scene_autumn_lane",group:"nature",zh:"秋日小路",en:"Autumn Lane",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const w=sb.w,h=sb.h;
        // Every time-varying term must complete a whole number of cycles in 24s, or the
        // loop visibly jumps. All six existing scene_ modes satisfy this (t=0 === t=24);
        // the only frequencies that do are whole multiples of PI/12.
        const TAU=Math.PI*2;
        // Two loop rules, both required for t=0 === t=24:
        //   sin/cos terms  -> f a whole multiple of PI/12 (whole cycles in 24s): snap()
        //   (t*f)%1 terms  -> 24*f a whole number: snapPhase(). Snapping these to PI/12
        //                     would give 24*f = 4*PI, which is not an integer.
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        // Slow drift day->night->day so a 24s loop never looks frozen.
        const drift=0.5+0.5*Math.cos(t*TAU/24);
        const night=Math.pow(1-drift,1.4);
        const hn=h*0.42;
        // --- sky: dusk gradient, darkening with the drift ---
        for(let y=0;y<h;y++){
          const k=Math.min(1,y/hn);
          const r=(10+8*(1-night))+(74-40*night-(10+8*(1-night)))*Math.pow(k,1.7);
          const g=(20+14*(1-night))+(58-32*night-(20+14*(1-night)))*Math.pow(k,1.7);
          const b=(34+18*(1-night))+(58-30*night-(34+18*(1-night)))*Math.pow(k,1.7);
          sb.fill(0,y,w,1,sb.rgb(r,g,b));
        }
        // stars only while dark
        for(let i=0;i<8;i++){
          if(night<0.12)break;
          if(Math.sin(t*snap(1.7)+i*2.1)<=0.4)continue;
          sb.put((i*5+2)%w,(i*5+1)%Math.max(1,Math.floor(hn*0.7)),night>0.5?'#dbe7f2':'#7d93a8');
        }
        // --- distant treeline at the horizon ---
        for(let x=0;x<w;x++){
          const bump=Math.round(1.4+1.3*Math.sin(x*0.9+1.7)+0.8*Math.sin(x*2.3));
          sb.fill(x,Math.max(0,Math.round(hn)-bump),1,bump+1,'#101c24');
        }
        // --- lane: narrow at the horizon, widening toward the viewer ---
        const laneX=w*0.5+Math.sin(t*TAU/24*1)*w*0.04;
        for(let y=Math.floor(hn);y<h;y++){
          const k=(y-hn)/Math.max(1,h-hn);
          const half=0.7+k*k*w*0.34;
          const left=Math.max(0,Math.round(laneX-half));
          const right=Math.min(w,Math.round(laneX+half));
          const shade=Math.round(118+78*k);
          sb.fill(left,y,Math.max(1,right-left),1,sb.rgb(shade*0.84,shade*0.67,shade*0.43));
          const mid=Math.max(1,Math.round((right-left)*0.34));
          sb.fill(left+Math.max(0,Math.round((right-left-mid)/2)),y,mid,1,sb.rgb(shade*0.98,shade*0.82,shade*0.54));
          if(y%3===0)sb.fill(left,y,Math.max(1,right-left),1,sb.rgb(shade*0.68,shade*0.52,shade*0.32));
        }
        // --- warm light at the vanishing point ---
        const gx=Math.round(laneX);
        sb.fill(gx-1,Math.round(hn)-2,3,2,'#f0cf8a');
        sb.fill(gx-2,Math.round(hn),5,1,'#9a7a44');
        // --- flanking trees, bare, thickening as they near the viewer ---
        for(let i=0;i<6;i++){
          const side=(i%2)?1:-1,depth=Math.floor(i/2);
          const trunk=1+depth;
          const base=h*0.60+depth*h*0.12;
          const tx=Math.round(laneX+side*(w*0.20+depth*w*0.09));
          if(tx<0||tx>=w)continue;
          const ty=Math.round(base-(h*0.38+depth*h*0.04));
          sb.fill(tx,ty,trunk,h-ty,'#20170f');
          sb.fill(tx,ty,1,h-ty,'#3a2a1a');
          for(let b=0;b<4;b++){
            const by=ty+1+b*2,dir=(b%2)?1:-1;
            const bx=dir>0?tx+trunk:tx-2;
            sb.fill(bx,by,2,1,'#20170f');
            sb.pixel(bx+(dir>0?2:-1),by-1,'#4a3520');
          }
        }
        // --- leaves ---
        // The gust must NOT multiply the fall rate: t * fallF * gust(t) is a product of two
        // time-dependent terms and cannot close the loop (verified: 217 maxDelta at t=24).
        // Instead the gust enters as a periodic OFFSET on the fall phase, which keeps
        // t=0 === t=24 while still making the leaves speed up and slow down.
        const gust=0.45+0.55*Math.sin(t*snap(0.7));
        const gustPhase=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const leafCols=['#c9622f','#b8452a','#d98a3c','#8f6b2f'];
        for(let i=0;i<13;i++){
          const fallF=Math.max(1/24,snapPhase(0.8+sb.seed(i)*2.2));
          const push=0.55*(0.5+0.5*Math.sin(t*gustPhase(0.7)+i*1.3));
          const fall=(t*fallF+push+sb.seed(i+30))%1;
          const y=h*0.12+fall*(h*0.86);
          const sway=Math.sin(t*snap(1.1)+i)*w*0.15;
          // Wrap into 0..w BEFORE adding the sway: wrapping afterwards would mix a large
          // floating-point base with the sway and break t=0 === t=24.
          const x=(((sb.seed(i+3)*w)%w)+sway+w*2)%w;
          // A boolean "draw a second pixel" test flips state at the loop point and costs
          // ~185 at two bytes (one whole pixel appearing). Use a continuous offset.
          const second=(0.5+0.5*Math.sin(t*snap(3.2)+i*2))*1.2;
          sb.pixel(x,y,leafCols[i%4]);
          sb.pixel(x+second,y,leafCols[(i+2)%4]);
          if(gust>0.82&&sb.seed(i+11)>0.75)sb.pixel(x,y-1,'#e8bd7d');
        }
        // --- near ground ---
        sb.fill(0,h-1,w,1,'#15110c');

  return true;
 }},
 {id:"pocket_snow_lantern",group:"ambience",zh:"雪夜石灯",en:"Snow Lantern",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const W=sb.w,H=sb.h;
        const TAU=Math.PI*2;
        // Two different loop rules are needed:
        //   sin/cos terms -> f must be a whole multiple of PI/12 (a whole number of cycles
        //                    in 24s), so snap() rounds to the nearest PI/12 multiple.
        //   (t*f)%1 terms -> 24*f must be a whole number, so snapPhase() rounds to the
        //                    nearest 1/24. Using PI/12 here leaves 24*f = 4*PI, which is
        //                    not an integer, and the loop jumps.
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        // Internal 15x27 framebuffer, exactly like the pocket_ family does it.
        const frame=new Array(W*H).fill('#0a141f');
        const seed=sb.seed;
        const px=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<W&&y>=0&&y<H)frame[y*W+x]=c;};
        const box=(x,y,bw,bh,c)=>{x=Math.round(x);y=Math.round(y);for(let yy=0;yy<bh;yy++)for(let xx=0;xx<bw;xx++)px(x+xx,y+yy,c);};
        const set=(x,y,c)=>{if(x>=0&&x<W&&y>=0&&y<H)frame[y*W+x]=c;};

        // --- night sky, slightly lighter near the horizon ---
        // Guard the divisor: at h=1 this would be 0/0 and produce rgb(NaN,NaN,NaN).
        for(let y=0;y<H;y++){
          const k=y/Math.max(1,H-1);
          const r=8+k*20, g=17+k*26, b=29+k*30;
          for(let x=0;x<W;x++)set(x,y,sb.rgb(r,g,b));
        }
        // a few stars, only in the upper third
        for(let i=0;i<11;i++){
          const sx=Math.round(seed(i+4)*14),sy=Math.round(seed(i+40)*9);
          const tw=Math.sin(t*snap(1.3)+i*2.1);
          if(tw>0.55)set(sx,sy,tw>0.9?'#dbeaf5':'#4d6a83');
        }
        // --- ground: snowdrift, higher at the edges, with a little surface variation ---
        const ground=20;
        for(let x=0;x<W;x++){
          const lift=Math.round(0.9*Math.abs(x-7)/7);
          const top=ground-lift;
          for(let y=top;y<H;y++){
            const d=y-top;
            // pale crust on top, cooler and slightly darker as it recedes
            const c=d===0?'#c6d9e6':(d===1?'#a9c1d2':'#8aa6ba');
            set(x,y,c);
          }
          // a few darker speckles so the snow is not a flat slab
          if((x*5+3)%7===0)set(x,top+1,'#9db6c8');
          if((x*3+1)%5===0)set(x,top+2,'#7e99ad');
        }
        // --- stone lantern, centred, with a warm window ---
        // Layout (rows 7..20), tuned so the whole lantern sits clear of the snow line:
        //   7 finial | 8 cap | 9-11 light chamber | 12-14 column | 15-17 base
        const cx=7;
        const glow=0.72+0.28*Math.sin(t*snap(1.6));
        // roof / cap
        box(cx-3,8,6,1,'#4f5a64');
        px(cx-4,9,'#4f5a64');px(cx+3,9,'#4f5a64');
        box(cx-2,9,4,1,'#5d6a76');
        // finial
        px(cx,7,'#6d7a86');
        // light chamber: dark frame, lit window, flame brighter than the glass
        box(cx-2,10,4,3,'#5d6a76');
        box(cx-1,10,2,2,sb.rgb(255*glow,206*glow,112*glow));
        px(cx-1,10,sb.rgb(255,236*glow,176*glow));
        px(cx,10,sb.rgb(255,236*glow,176*glow));
        box(cx-2,13,4,1,'#5d6a76');
        // column
        box(cx-1,14,2,1,'#8d9aa8');
        // base, stepped, ending exactly on the snow line
        box(cx-2,15,4,1,'#76838f');
        box(cx-3,16,6,1,'#6d7a86');
        box(cx-3,17,6,1,'#5f6b77');
        // --- a small pool of warm light on the snow, directly under the lantern ---
        for(let dx=-2;dx<=2;dx++){
          const x=cx+dx,d=2-Math.abs(dx);
          const lift=Math.round(0.9*Math.abs(x-7)/7);
          for(let dy=0;dy<d;dy++)set(x,ground+dy+lift,sb.rgb(196+40*glow,166+44*glow,110+40*glow));
        }
        // --- two small shrubs beside the base ---
        set(cx-4,ground+1,'#2c4a40');set(cx-4,ground,'#37604f');set(cx-4,ground-1,'#37604f');
        set(cx+4,ground+1,'#2c4a40');set(cx+4,ground,'#37604f');set(cx+4,ground-1,'#37604f');
        // --- falling snow, denser and slower than the leaves ---
        for(let i=0;i<16;i++){
          const fallF=Math.max(1/24,snapPhase(0.25+seed(i+60)*0.5));
          // Keep the seed offset below 1: (x + n) % 1 loses low bits to floating point
          // once x is large, which would leave a 1/255 mismatch at the loop point.
          const fall=(t*fallF+seed(i))%1;
          const y=fall*(H+2)-1;
          const sway=Math.sin(t*snap(0.5+seed(i+70))+i)*1.7;
          const x=seed(i+20)*W+sway;
          px(x,y,i%4===0?'#e8f2fa':'#b6cad9');
        }
        // --- blit the framebuffer over whatever paint held ---
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){sb.fill(x,y,1,1,frame[y*W+x]);}

  return true;
 }},
 {id:"demo_v_minimal",group:"classic",zh:"极简 · 三点一线",en:"Minimal · three marks",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const w=sb.w,h=sb.h;
        const TAU=Math.PI*2;
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        const seed=sb.seed;

        sb.fill(0,0,w,h,'#0d1420');
        const hz=Math.floor(h*0.62);
        sb.fill(0,hz,w,h-hz,'#1b2430');
        // sun: sinks over the loop, whole cycles only
        const sy=hz-4-Math.round(3*Math.cos(t*TAU/24));
        sb.fill(w-5,sy,3,3,'#f2c078');
        // one horizon line
        sb.fill(0,hz,w,1,'#5d7285');
        // figure: a single column plus a head
        sb.fill(4,hz-5,1,5,'#0b1018');
        sb.pixel(4,hz-6,'#0b1018');
    
  return true;
 }},
 {id:"demo_v_bold",group:"classic",zh:"低细节 · 大块面",en:"Bold · big shapes",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const w=sb.w,h=sb.h;
        const TAU=Math.PI*2;
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        const seed=sb.seed;

        const hz=Math.floor(h*0.6);
        sb.fill(0,0,w,hz,'#22304a');
        sb.fill(0,hz,w,h-hz,'#2e3d2c');
        // a 5x5 sun block with a highlight
        const sy=hz-9-Math.round(2*Math.cos(t*TAU/24));
        sb.fill(w-7,sy,5,5,'#e8a75c');
        sb.fill(w-6,sy+1,2,2,'#ffd9a0');
        // a hillside wedge
        for(let x=0;x<8;x++)sb.fill(x,hz-1-Math.floor(x*0.5),1,2+Math.floor(x*0.5),'#3b4a35');
        // figure as a 2x6 block
        sb.fill(3,hz-7,2,6,'#161d16');
        sb.fill(3,hz-9,2,2,'#161d16');
        // two birds, 2 pixels each.
        // The phase offset matters: sin(t*snap(0.7)) sits exactly on a zero crossing at
        // both t=0 and t=24 (3 whole cycles), and the sign of that near-zero value is
        // arbitrary, which flipped Math.round() and broke loop closure. Offsetting the
        // phase moves the samples away from the crossing.
        const bx=Math.round(2+7*(0.5+0.5*Math.sin(t*snap(0.7)+0.7)));
        sb.fill(bx,4,2,1,'#93a6bd');sb.fill(bx-3,7,2,1,'#93a6bd');
    
  return true;
 }},
 {id:"demo_v_detailed",group:"classic",zh:"高细节 · 写实",en:"Detailed · painterly",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const w=sb.w,h=sb.h;
        const TAU=Math.PI*2;
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        const seed=sb.seed;

        const hz=Math.floor(h*0.58);
        for(let y=0;y<h;y++){
          const k=Math.min(1,y/hz);
          const r=18+(150-18)*Math.pow(k,2.2), g=26+(92-26)*Math.pow(k,2), b=48+(74-48)*k;
          sb.fill(0,y,w,1,sb.rgb(r,g,b));
        }
        // sky gradient wisps
        for(let i=0;i<14;i++){
          const y=Math.round(seed(i)*hz*0.9), x=Math.round(seed(i+40)*w);
          sb.pixel(x,y,sb.rgb(120+60*seed(i+3),80+40*seed(i+5),70+40*seed(i+7)));
        }
        // sun with a soft halo, descending
        const sy=hz-6-Math.round(4*Math.cos(t*TAU/24)), sx=w-5;
        for(let r=4;r>=1;r--)sb.fill(sx-r,sy-r,2*r+1,2*r+1,sb.rgb(200-r*30,140-r*20,70-r*10));
        sb.fill(sx-1,sy-1,3,3,'#ffe6b0');
        // ground: many small tonal patches
        for(let y=hz;y<h;y++)for(let x=0;x<w;x++){
          const n=seed(x*7+y*13);
          sb.pixel(x,y,sb.rgb(28+n*34,44+n*40,30+n*24));
        }
        // figure with shading and a shadow
        sb.fill(3,hz-6,2,6,'#101820');
        sb.pixel(3,hz-6,'#1c2836');
        sb.fill(2,h-1,4,1,'#0a0f14');
    
  return true;
 }},
 {id:"demo_v_geometric",group:"classic",zh:"几何 · 对称",en:"Geometric · symmetric",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const w=sb.w,h=sb.h;
        const TAU=Math.PI*2;
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        const seed=sb.seed;

        sb.fill(0,0,w,h,'#0a0d14');
        const cx=(w-1)/2;
        // concentric diamonds, breathing
        for(let r=9;r>=1;r--){
          const pulse=1+0.12*Math.sin(t*snap(1.3)-r*0.6);
          const rr=Math.max(1,Math.round(r*pulse));
          const col=sb.rgb(30+r*16,60+r*12,90+r*14);
          for(let i=-rr;i<=rr;i++){
            const j=rr-Math.abs(i);
            if(cx+i<0||cx+i>=w)continue;
            sb.pixel(cx+i,Math.round((h-1)/2)+i*0+j*0.0,col);   // horizontal bar
            sb.pixel(cx+i,Math.round((h-1)/2)+j,col);
            sb.pixel(cx+i,Math.round((h-1)/2)-j,col);
          }
        }
        // a rotating diagonal cross
        for(let r=1;r<=11;r++){
          const a=t*snap(0.5);
          const dx=Math.round(Math.cos(a)*r), dy=Math.round(Math.sin(a)*r*1.6);
          if(cx+dx>=0&&cx+dx<w&&(h-1)/2+dy>=0&&(h-1)/2+dy<h)sb.pixel(cx+dx,(h-1)/2+dy,'#ffd48a');
          if(cx-dx>=0&&cx-dx<w&&(h-1)/2-dy>=0&&(h-1)/2-dy<h)sb.pixel(cx-dx,(h-1)/2-dy,'#ffd48a');
        }
        // centre dot
        sb.pixel(cx,Math.round((h-1)/2),'#ffffff');
    
  return true;
 }},
 {id:"demo_v_silhouette",group:"classic",zh:"剪影 · 逆光",en:"Silhouette · backlit",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const w=sb.w,h=sb.h;
        const TAU=Math.PI*2;
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        const seed=sb.seed;

        // bright gradient background
        for(let y=0;y<h;y++){
          const k=y/(h-1);
          sb.fill(0,y,w,1,sb.rgb(250-70*k,190-70*k,110-40*k));
        }
        // a sun disc low in frame
        const sy=Math.floor(h*0.66), sx=Math.round(w*(0.32+0.1*Math.cos(t*TAU/24)));
        for(let yy=-5;yy<=5;yy++)for(let xx=-5;xx<=5;xx++)
          if(xx*xx*1.6+yy*yy<=26)sb.pixel(sx+xx,sy+yy,'#fff3cf');
        // black silhouette: hill, tree, figure
        for(let x=0;x<w;x++){
          const crest=Math.floor(h*0.74+2.2*Math.sin(x*0.55));
          sb.fill(x,crest,1,h-crest,'#07090c');
        }
        // tree
        sb.fill(3,Math.floor(h*0.55),1,Math.floor(h*0.2),'#07090c');
        for(let i=0;i<7;i++){
          const y=Math.floor(h*0.55)+i;
          const sp=Math.max(0,3-i);
          sb.fill(3-sp,y,1+2*sp,1,'#07090c');
        }
        // figure standing on the crest
        const fx=10, fy=Math.floor(h*0.74+2.2*Math.sin(fx*0.55))-7;
        sb.fill(fx,fy,2,7,'#07090c');
        sb.fill(fx,fy-2,2,2,'#07090c');
        // a bird crossing
        const bx=Math.round(1+12*(0.5+0.5*Math.sin(t*snap(0.7)+1)));
        sb.fill(bx,5,3,1,'#3a3226');
    
  return true;
 }},
 {id:"demo_v_abstract",group:"classic",zh:"抽象 · 光带",en:"Abstract · light bands",nativeWidth:15,nativeHeight:27,loopSeconds:24,fps:24,draw(mode,time,paint,{w:outputWidth,h:outputHeight}){
  const sb=helpers(paint,outputWidth,outputHeight);
  const t=(((Math.floor(time*24+1e-9)%576)+576)%576)/24;

        const w=sb.w,h=sb.h;
        const TAU=Math.PI*2;
        const snap=(f)=>Math.round(f*24/TAU)*(TAU/24);
        const snapPhase=(f)=>Math.round(f*24)/24;
        const seed=sb.seed;

        sb.fill(0,0,w,h,'#05070c');
        // Diagonal bands scrolling.
        // Loops cleanly because: the period (w+h) is an integer; the band index is the
        // period itself, so every covered band is visited; the scroll advances a whole
        // number of periods per loop (24*scrollF = 42); and the time offset is wrapped
        // SEPARATELY from the band index. hue/glow vary with the band index and repeat
        // every period, so they line up too.
        // Use x - floor(x/p)*p for wrapping: the % operator loses low bits at large x.
        const period=w+h;
        const scrollF=Math.max(1,Math.round(1.0*24/period))*(period/24);
        const wrap=(x,p)=>x-Math.floor(x/p)*p;
        const drift=wrap(t*scrollF, period);
        for(let d=0;d<period;d++){
          const off=wrap(d+drift, period);
          const hue=Math.round(190+60*Math.sin(d*0.7));
          for(let x=0;x<w;x++){
            const y=Math.round(off-x);
            if(y<0||y>=h)continue;
            const glow=0.35+0.65*Math.pow(0.5+0.5*Math.sin(d*1.3),2);
            sb.pixel(x,y,sb.hue(hue,6+glow*40));
            if(glow>0.7&&y+1<h)sb.pixel(x,y+1,sb.hue(hue,4+glow*20));
          }
        }
        // sparkle layer
        for(let i=0;i<9;i++){
          const y=Math.round(seed(i)*h);
          // scroll period is 15 (= w), so advance a whole number of periods per loop
          const scrollF2=Math.max(1,Math.round(2.0*24/w))*(w/24);
          const x=wrap(seed(i+20)*w + t*scrollF2, w);
          const g=Math.pow(0.5+0.5*Math.sin(t*snap(1.7)+i),3);
          if(g>0.35)sb.pixel(x,y,sb.rgb(200*g+40,230*g+20,255*g));
        }
        // vignette: darken corners
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          const dx=(x-(w-1)/2)/((w-1)/2), dy=(y-(h-1)/2)/((h-1)/2);
          if(dx*dx+dy*dy>1.15)sb.pixel(x,y,'#020306');
        }
    
  return true;
 }}
];
return Object.freeze(designs.map(Object.freeze));
});
