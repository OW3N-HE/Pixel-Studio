'use strict';
(function(root,factory){
if(typeof module==='object'&&module.exports)module.exports=factory(require('./pixel-rgb-canvas.cjs'),require('./pixel-temperature.cjs'),require('./pixel-clock-renderer.cjs'),require('./pixel-animation-designs.cjs'));
else root.PixelStudioAnimations=factory(root.PixelStudioRgbCanvas,root.PixelStudioTemperature,root.PixelStudioClock,root.PixelStudioDesigns);
})(typeof globalThis!=='undefined'?globalThis:this,function(createCanvas,temperature,clock,designs){
const motionPixel=value=>Math.round(value);
function drawPocketScenes(mode, t, paint, dimensions) {
    const { w, h } = dimensions;
    const W = 15, H = 27;
    const frame = new Array(W * H).fill('#07101d');
    const seed = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const mod = (n, d) => ((n % d) + d) % d;
    const px = (x, y, color) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < W && y >= 0 && y < H) frame[y * W + x] = color;
    };
    const box = (x, y, width, height, color) => {
      x = Math.round(x); y = Math.round(y);
      for (let yy = 0; yy < height; yy++) for (let xx = 0; xx < width; xx++) px(x + xx, y + yy, color);
    };
    const line = (x1, y1, x2, y2, color) => {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
      for (let i = 0; i <= steps; i++) px(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, color);
    };
    const oval = (cx, cy, rx, ry, color) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if ((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1) px(x, y, color);
    };
    const sprite = (rows, x, y, colors) => {
      rows.forEach((row, yy) => {
        for (let xx = 0; xx < row.length; xx++) if (colors[row[xx]]) px(x + xx, y + yy, colors[row[xx]]);
      });
    };
    const hue = (angle, light = 50) => 'hsl(' + Math.round(mod(angle, 360)) + ',85%,' + Math.round(light) + '%)';
    const stars = (count = 13, ceiling = 16) => {
      for (let i = 0; i < count; i++) {
        const glow = 0.5 + 0.5 * Math.sin(t * 1.2 + i * 2.3);
        px(seed(i + 10) * 14, seed(i + 80) * ceiling, glow > 0.78 ? '#a7cbdf' : '#24364a');
      }
    };
    const cloud = (x, y, color) => { box(x, y, 5, 1, color); box(x + 1, y - 1, 3, 1, color); };
    const flower = (x, y, color) => {
      line(x, y + 1, x, 26, '#2b7353');
      px(x - 1, y, color); px(x + 1, y, color);
      px(x, y - 1, color); px(x, y + 1, color); px(x, y, '#ffe8a1');
    };

    switch (mode) {
      case 'pocket_shy_blink': {
        frame.fill('#231c32');
        stars(9, 26);
        const bob = Math.sin(t * 2) > .65 ? -1 : 0;
        const face = [
          '...KK...KK...',
          '..KWWKKKWWK..',
          '.KWWWWWWWWWK.',
          '.KWWWWWWWWWK.',
          'KWWWKWWWKWWWK',
          'KWWWWWWWWWWWK',
          'KWWKKWWWKKWWK',
          'KWWKKWWWKKWWK',
          'KPPPWKWKWPPPK',
          'KPPPWWKWWPPPK',
          '.KWWWWWWWWWK.',
          '.KWWWWKWWWWK.',
          '..KKWWWWWKK..',
          '....KKKKK....'
        ];
        sprite(face,1,8+bob,{K:'#191922',W:'#fff4df',P:'#f49a8e'});
        if(mod(t,4.8) > 4.55) {
          box(4,14+bob,2,2,'#fff4df');box(9,14+bob,2,2,'#fff4df');
          box(4,15+bob,2,1,'#191922');box(9,15+bob,2,1,'#191922');
        }
        const lift = Math.floor(mod(t*.7,3));
        sprite(['.P.P.','PPPPP','.PPP.','..P..'],5,4-lift,{P:'#e894ac'});
        box(4,24,7,1,'#594456');
        break;
      }
      case 'pocket_strawberry': {
        frame.fill('#142b29');
        const sway = Math.round(Math.sin(t*1.3));
        line(7,19,7+sway,10,'#79ab64');
        oval(4+sway,12,2,1,'#6dba81');oval(9+sway,10,2,1,'#99ce79');
        sprite(['.GGG.','GRRRG','RRRYR','RYRRR','.RRR.','..R..'],5+sway,13,
          {G:'#75b17a',R:'#ed6578',Y:'#ffe4a1'});
        box(3,20,9,2,'#dc9a76');box(4,22,7,3,'#b77461');box(5,25,5,1,'#925451');
        for(let i=0;i<5;i++)px(mod(i*4+t*.6,15),mod(i*7-t*.7,17),'#d8c68e');
        break;
      }
      case 'pocket_starwhale': {
        frame.fill('#111b36');stars(17,27);
        const y=12+Math.round(Math.sin(t*.9));
        sprite(['...BBBB....','..BBBBBB...','.BBBBBBBB..','BBBBBBBBB.B','BBBBWBBBBBB','.BCCCCCCBB.','..CCCCCC...'],1,y,
          {B:'#549dc5',C:'#a6d9dc',W:'#12243e'});
        px(12,y+2+Math.round(Math.sin(t*2)),'#74b9d2');
        const bubble=mod(t*1.7,8);
        px(5,10-bubble,'#b8e9e3');px(7,8-mod(bubble+3,8),'#71abbf');
        break;
      }
      case 'pocket_windbell': {
        frame.fill('#17252e');stars(11,27);
        const sway=Math.round(Math.sin(t*1.2));
        line(7,0,7,6,'#d4c6a0');
        sprite(['...AAA...','..ACCCA..','.ACCCCCA.','ACCCCCCCA','AAAAAAAAA'],3+sway,7,
          {A:'#7db8ae',C:'#315b61'});
        px(5+sway,9,'#c3e7cf');
        line(7+sway,12,7+sway*2,16,'#d8c29a');
        box(6+sway*2,17,3,7,'#aadbc6');
        box(7+sway*2,19,1,3,'#468b80');
        break;
      }
      case 'pocket_brave_steps': {
        frame.fill('#efb7c5');
        for (let i = 0; i < 9; i++) {
          const glow = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.4);
          px(seed(i + 107) * 14, 2 + seed(i + 77) * 21, glow > 0.7 ? '#fff0b1' : '#d58fa8');
        }
        const bob = Math.round((0.5 + 0.5 * Math.sin(t * 2.4)) * -1);
        const blink = mod(t, 5.2) > 4.86;
        sprite([
          '...oo...oo...',
          '..owwo.owwo..',
          '.oowwwwwwwoo.',
          'oowwwwwwwwwoo',
          'owwwwwwwwwwo',
          'owwkswwwkswwo',
          'owwwwwwwwwwo',
          'opppwwwwwpppo',
          'owwwwwkwwwwo',
          'owwwwkmkwwwwo',
          'owwwwwwwwwwo',
          'owwwwwwwwwwo',
          '.owwwwwwwwwo.',
          '..owwwwwwwo..',
          '...owwwwwo...',
          '...oo...oo...'
        ], 1, 5 + bob, {o:'#312d36',w:'#fff9e9',p:'#ed9cac',k:'#292631',s:'#ffffff',m:'#6b4653'});
        if (blink) { box(4, 10 + bob, 2, 1, '#312d36'); box(9, 10 + bob, 2, 1, '#312d36'); }
        const step = Math.sin(t * 2.4) > 0;
        px(step ? 0 : 1, 17 + bob, '#312d36'); px(step ? 14 : 13, 18 + bob, '#312d36');
        px(0, 18 + bob, '#fff9e9'); px(14, 17 + bob, '#fff9e9');
        px(6, 22 + (step ? -1 : 0), '#fff9e9'); px(9, 22 + (step ? 0 : -1), '#fff9e9');
        for (let x = 0; x < 15; x++) px(x, 25 + Math.round(Math.sin(x * 0.7) * 0.4), '#c67f98');
        break;
      }
      case 'pocket_star_dumpling': {
        frame.fill('#11142b');
        for (let i = 0; i < 14; i++) {
          const glow = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 2.1);
          px(seed(i + 21) * 14, seed(i + 61) * 22,
            glow > 0.72 ? ['#ffe49b','#8fe4d2','#f3a9c2'][i % 3] : '#303454');
        }
        const bob = Math.round((0.5 + 0.5 * Math.sin(t * 2.2)) * -1);
        const blink = mod(t, 4.8) > 4.45;
        sprite([
          '..oo...oo..',
          '.oppo.oppo.',
          '.oowwwwwoo.',
          'oowwwwwwwoo',
          'owwwwwwwwwo',
          'owwkwwwkwwo',
          'owwpwpwpwwo',
          'owwwwmwwwwo',
          '.owwwwwwwo.',
          '..owwwwwo..',
          '.oowwwwwwoo',
          '..owwwwwwo.',
          '..owwwwwwo.',
          '...oo.oo...',
          '...oo.oo...'
        ], 2, 7 + bob, {o:'#8e8795',p:'#f2a7b7',w:'#fff4df',k:'#332d3b',m:'#76505d'});
        if (blink) { box(5, 12 + bob, 2, 1, '#8e8795'); box(9, 12 + bob, 2, 1, '#8e8795'); }
        px(4, 14 + bob, '#f3abb4'); px(12, 14 + bob, '#f3abb4');
        const wave = Math.sin(t * 3) > 0;
        px(wave ? 1 : 2, 17 + bob, '#fff4df'); px(wave ? 13 : 12, 18 + bob, '#fff4df');
        box(0, 24, 15, 3, '#182b39');
        for (let x = 1; x < 15; x += 3) px(x, 24 + (x % 2), '#315468');
        break;
      }
      case 'pocket_fox': {
        frame.fill('#0a191d'); stars(10, 10);
        for (const [x, top] of [[1, 7], [12, 5]]) {
          line(x, top, x, 24, '#23453a');
          for (let y = top; y < 21; y += 3) {
            line(x, y, x - 2, y + 3, '#1b3a32'); line(x, y, x + 2, y + 3, '#1b3a32');
          }
        }
        box(0, 24, 15, 3, '#183d33'); box(3, 23, 9, 2, '#61442f');
        const lift = Math.round(Math.sin(t * 1.8) * 0.35);
        const tailY = 21 + Math.round(Math.sin(t * 2.4));
        oval(11, tailY, 2.6, 2.2, '#e57038'); box(12, tailY - 2, 2, 2, '#f5d5a0');
        sprite([
          '.o.....o.', '.od...do.', '.oodddoo.', '..ooooo..', '.oofofoo.',
          '.owwowwo.', '..wwkww..', '...www...', '..ooooo..', '..owwwo..',
          '..owwwo..', '..d...d..'
        ], 3, 11 + lift, { o:'#ed8a42', d:'#804631', w:'#ffe3b1', k:'#27202a', f:'#181b24' });
        if (mod(t, 5.5) > 5.23) { px(6, 15 + lift, '#ed8a42'); px(8, 15 + lift, '#ed8a42'); }
        for (let i = 0; i < 3; i++) px(2 + i * 5 + Math.sin(t + i), 8 + mod(t * 1.4 + i * 7, 14), '#b4a35e');
        break;
      }
      case 'pocket_capybara': {
        frame.fill('#162b35');
        for (let x = 0; x < W; x++) {
          const mountain = 8 + Math.round(Math.abs(x - 5) * 0.55);
          box(x, mountain, 1, H - mountain, '#294147');
        }
        box(0, 18, 15, 9, '#285c66'); oval(7, 21, 7, 3.3, '#768381');
        oval(7, 20, 5.7, 2.3, '#3b9294');
        const by = 11 + Math.round(Math.sin(t) * 0.35);
        sprite([
          '.dd...dd.', '.ddbbbbb.', '..bbbbbb.', '.bbkbbkb.', '.bbbbbbb.',
          '.bbssssb.', '..sskkss.', '..bbbbbb.', '..bbbbbb.'
        ], 3, by, { d:'#866448', b:'#ba9165', s:'#d7b58b', k:'#322d31' });
        box(6, by - 2, 3, 2, '#f4ad43'); px(7, by - 3, '#6bb26e');
        for (let y = 0; y < 7; y++) {
          const x = 4 + Math.round(Math.sin(t * 1.3 - y * 0.6));
          px(x, 9 - y, y % 2 ? '#47646d' : '#7d9c9a');
          px(x + 6, 8 - y, '#47646d');
        }
        for (let x = 2; x < 13; x++) if (Math.sin(x * 0.8 + t * 2) > 0.25) px(x, 21, '#94c8ba');
        box(0, 25, 15, 2, '#243d40');
        break;
      }
      case 'pocket_owl': {
        frame.fill('#11182b'); stars(15, 18);
        oval(3, 4, 2.1, 2.1, '#f4d6a0'); oval(4, 3, 1.6, 1.8, '#11182b');
        box(12, 9, 2, 18, '#47343d'); line(1, 22, 13, 21, '#79514b');
        const flap = Math.round(Math.sin(t * 1.6));
        line(3, 15, 2, 19 + flap, '#936d64'); line(11, 15, 12, 19 - flap, '#936d64');
        sprite([
          'd.......d', 'dd.....dd', '.ddddddd.', '.dccdccd.',
          '.cwwcwwc.', '.cwwcwwc.', '..cckcc..', '..cbbbc..',
          '..bwbwb..', '..bbbbb..', '...b.b...'
        ], 3, 10, { d:'#775655', c:'#bc9581', w:'#ffe2ad', k:'#e7a648', b:'#a87964' });
        const look = Math.round(Math.sin(t * 0.65));
        px(5 + look, 15, '#151d2b'); px(9 + look, 15, '#151d2b');
        if (mod(t, 6) > 5.65) { line(4, 15, 6, 15, '#775655'); line(8, 15, 10, 15, '#775655'); }
        px(6, 21, '#e4b374'); px(9, 21, '#e4b374');
        break;
      }
      case 'pocket_axolotl': {
        frame.fill('#0b2834');
        for (let i = 0; i < 7; i++) {
          const y = 25 - mod(t * (1 + seed(i) * 0.7) + i * 4, 28);
          const x = 1 + seed(i + 22) * 12;
          px(x, y, '#315c70'); if (i % 3 === 0) px(x + 1, y - 1, '#55899a');
        }
        const by = 10 + Math.round(Math.sin(t * 1.1));
        for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 3; i++) {
          const x = 7 + side * 4, y = by + 2 + i * 2;
          line(x, y, x + side, y - 1 + Math.round(Math.sin(t * 2 + i) * 0.5), '#e881aa');
          px(x + side * 2, y - 1, '#ffbfd0');
        }
        sprite([
          '..ppp..', '.ppppp.', 'ppppppp', 'pkpppkp', 'ppppppp',
          '.ppkpp.', '..ppp..', '.pwpwp.', '..pwp..', '..pwp..', '...p...'
        ], 4, by, { p:'#f3b6c3', w:'#ffe1d4', k:'#59364c' });
        for (let x of [1, 12, 14]) for (let y = 0; y < 5; y++) px(x + Math.sin(t + y * 0.7), 26 - y, '#397965');
        box(4, 26, 7, 1, '#486f71');
        break;
      }
      case 'pocket_snail': {
        frame.fill('#13242a');
        for (let i = 0; i < 8; i++) px(seed(i + 41) * 14, mod(t * 2 + i * 3.7, 19), '#365965');
        box(0, 25, 15, 2, '#64784a');
        for (let x = 0; x < 15; x += 3) line(x, 25, x + Math.round(Math.sin(t + x)), 22, '#426548');
        const sx = 3 + Math.round(Math.sin(t * 0.5));
        box(sx - 1, 23, 10, 2, '#c9b96c'); box(sx, 22, 7, 1, '#efe39a');
        oval(sx + 3, 19, 3.2, 3.4, '#aa849f'); oval(sx + 3, 19, 2.2, 2.4, '#dcc2b0');
        line(sx + 2, 17, sx + 4, 17, '#815e86'); line(sx + 4, 17, sx + 4, 20, '#815e86');
        line(sx + 2, 20, sx + 4, 20, '#815e86'); px(sx + 2, 19, '#815e86');
        const head = sx + 7;
        line(head, 22, head - 1, 18, '#e4d98a'); line(head + 1, 22, head + 2, 19, '#e4d98a');
        px(head - 1, 18, '#f5ecc4'); px(head + 2, 19, '#f5ecc4');
        if (mod(t, 5) < 4.7) { px(head - 1, 17, '#202c32'); px(head + 2, 18, '#202c32'); }
        cloud(mod(t * 0.35, 22) - 6, 4, '#27404b');
        break;
      }
      case 'pocket_bees': {
        frame.fill('#162d32'); line(0, 4, 10, 5, '#71594a'); line(7, 5, 7, 7, '#98704b');
        oval(7, 11, 3.8, 4.2, '#daa350');
        for (const y of [8, 11, 14]) line(4, y, 10, y, '#a87539');
        oval(7, 13, 1.4, 1.4, '#493a31');
        flower(2, 23, '#f3b5a1'); flower(7, 24, '#b7bdde'); flower(12, 22, '#e5bd6c');
        for (let i = 0; i < 2; i++) {
          const angle = t * (i ? -1.3 : 1.1) + i * 3;
          const x = 7 + Math.sin(angle) * 4.8;
          const y = 18 + Math.cos(angle * 0.8) * 2;
          box(x - 1, y, 3, 2, '#f6ce68'); box(x, y, 1, 2, '#58432f');
          px(x + 2, y, '#ddd9ad');
          px(x - 1, y - 1 - (Math.sin(t * 8 + i) > 0 ? 1 : 0), '#d9eeec');
          px(x + 1, y - 1, '#8cc5c4');
        }
        break;
      }
      case 'pocket_ferris': {
        frame.fill('#10162b'); stars(14, 23);
        line(7, 11, 2, 24, '#446c7b'); line(7, 11, 12, 24, '#446c7b');
        box(1, 24, 13, 2, '#274d59'); box(0, 26, 15, 1, '#192e42');
        const colors = ['#f3bc7a','#a0dbc5','#c1b0e5','#ec96a6','#79bed8','#e6d79b'];
        for (let i = 0; i < 48; i++) {
          const a = i / 48 * Math.PI * 2;
          px(7 + Math.cos(a) * 5, 11 + Math.sin(a) * 6, '#47617e');
        }
        for (let i = 0; i < 6; i++) {
          const a = t * 0.32 + i / 6 * Math.PI * 2;
          const x = 7 + Math.cos(a) * 5, y = 11 + Math.sin(a) * 6;
          line(7, 11, x, y, '#6a8b99');
          box(x - 1, y, 3, 3, colors[i]); box(x - 1, y, 3, 1, '#233d53'); px(x, y + 1, '#eff1d5');
        }
        px(7, 11, '#f6eac4');
        break;
      }
      case 'pocket_cablecar': {
        frame.fill('#28314c'); oval(11, 4, 2, 2, '#e8b69c');
        cloud(mod(t * 0.25, 24) - 6, 3, '#5a526a');
        for (let x = 0; x < W; x++) {
          let top = 10 + Math.round(Math.abs(x - 4) * 1.1);
          box(x, top, 1, H - top, '#6d87a1'); box(x, top, 1, 2, '#c6d7d7');
          top = 18 + Math.round(Math.abs(x - 11) * 0.65);
          box(x, top, 1, H - top, '#3e667e'); px(x, top, '#8fb6c3');
        }
        line(0, 6, 14, 10, '#a9acb5');
        const x = 7 + Math.sin(t * 0.43) * 5;
        const y = 6 + x * 4 / 14;
        line(x, y, x, y + 3, '#dac7b5'); box(x - 2, y + 3, 5, 5, '#bf625f');
        box(x - 1, y + 4, 3, 2, '#b9d9d3'); px(x, y + 4, '#547589'); box(x - 1, y + 7, 3, 1, '#874856');
        for (let i = 0; i < 5; i++) px(seed(i + 93) * 14 + Math.sin(t * 0.4 + i), mod(t * 0.9 + i * 6, 27), '#a5c4cf');
        break;
      }
      case 'pocket_windmill': {
        for (let y = 0; y < H; y++) box(0, y, W, 1, y < 8 ? '#62506a' : y < 17 ? '#bd866b' : '#42604d');
        oval(11, 5, 2.2, 2.2, '#f7c981'); cloud(mod(t * 0.3, 22) - 6, 8, '#ddad89');
        for (let x = 0; x < W; x++) box(x, 20 + Math.round(Math.sin(x * 0.45) * 2), 1, 8, '#6f8954');
        box(5, 13, 5, 10, '#dcceab'); box(8, 13, 2, 10, '#b8aa89');
        for (let y = 0; y < 3; y++) box(7 - y, 10 + y, y * 2 + 1, 1, '#784c48');
        box(6, 20, 2, 3, '#635752'); px(6, 16, '#759b9b');
        for (let i = 0; i < 4; i++) {
          const a = t * 0.72 + i * Math.PI / 2;
          const ex = 7 + Math.cos(a) * 5, ey = 12 + Math.sin(a) * 5;
          line(7, 12, ex, ey, '#f2e0b5');
          line(7 + Math.cos(a) * 3 - Math.sin(a), 12 + Math.sin(a) * 3 + Math.cos(a), ex - Math.sin(a), ey + Math.cos(a), '#d8b580');
        }
        px(7, 12, '#8a624f');
        for (let x of [1, 3, 11, 13]) { line(x, 26, x + Math.sin(t + x) * 0.7, 23, '#d7c178'); px(x + 1, 24, '#e7d692'); }
        break;
      }
      case 'pocket_telescope': {
        frame.fill('#111a32'); stars(21, 17);
        box(3, 21, 9, 6, '#735b74'); box(4, 22, 7, 5, '#94748a');
        oval(7, 20, 5, 4, '#54738d'); box(2, 20, 11, 2, '#334b69');
        box(6, 23, 3, 4, '#334356'); px(7, 24, '#eacb8b');
        const angle = -1.03 + Math.sin(t * 0.35) * 0.19;
        const ex = 7 + Math.cos(angle) * 6, ey = 18 + Math.sin(angle) * 6;
        line(7, 18, ex, ey, '#d4d6c5'); line(8, 18, ex + 1, ey, '#88aeba');
        box(ex, ey - 1, 2, 2, '#89e0d7'); box(6, 17, 2, 2, '#658795');
        const travel = mod(t * 2.7, 32);
        if (travel < 17) for (let i = 0; i < 4; i++) px(travel - i, 3 + (travel - i) * 0.45, i === 0 ? '#f3d7a1' : '#536d85');
        break;
      }
      case 'pocket_submarine': {
        frame.fill('#092434');
        for (let y = 0; y < H; y++) {
          px(3 + Math.sin(y * 0.25 + t * 0.5), y, '#113b4b');
          px(10 + Math.sin(y * 0.3 - t * 0.4), y, '#103444');
        }
        const cy = 13 + Math.round(Math.sin(t * 0.9));
        box(6, cy - 5, 2, 3, '#c6a15f'); box(7, cy - 5, 3, 1, '#e6c47a');
        oval(7, cy, 5.3, 3.1, '#d1a650'); box(3, cy + 2, 8, 1, '#a97a43');
        line(1, cy - 2, 1, cy + 2, '#cfbd86'); px(0, cy + Math.round(Math.sin(t * 6) * 2), '#7eafb4');
        for (let x of [5, 9]) { oval(x, cy, 1.6, 1.7, '#6a684b'); oval(x, cy, 0.9, 1, '#7dd1d5'); px(x, cy - 1, '#d8ede0'); }
        line(12, cy, 14, cy - 2, '#28514d'); line(12, cy, 14, cy + 2, '#28514d');
        for (let i = 0; i < 6; i++) px(1 + seed(i + 120) * 12, 26 - mod(t * 1.2 + i * 5, 28), '#356274');
        for (let x of [1, 4, 11, 13]) for (let y = 0; y < 6; y++) px(x + Math.sin(t + y * 0.65), 26 - y, '#306356');
        break;
      }
      case 'pocket_castle': {
        frame.fill('#293047'); stars(10, 14);
        cloud(mod(t * 0.45, 23) - 7, 8, '#54546d'); cloud(14 - mod(t * 0.35, 23), 19, '#6b647b');
        const dy = Math.round(Math.sin(t * 0.8));
        for (let y = 0; y < 6; y++) box(2 + y, 20 + y + dy, 11 - y * 2, 1, y < 2 ? '#77988d' : '#514a65');
        box(4, 12 + dy, 7, 8, '#b8a4b6'); box(3, 10 + dy, 3, 10, '#cbb8c0'); box(9, 8 + dy, 3, 12, '#9a91ae');
        for (const [cx, top] of [[4, 7], [10, 5]]) {
          for (let y = 0; y < 3; y++) box(cx - y, top + y + dy, y * 2 + 1, 1, '#bd7895');
          line(cx, top + dy, cx, top - 3 + dy, '#d7c59f');
          box(cx + 1, top - 3 + dy + (Math.sin(t * 2 + cx) > 0 ? 0 : 1), 2, 1, '#efbe7a');
        }
        box(6, 17 + dy, 3, 3, '#574b6b');
        for (const [x,y] of [[4,13],[10,11],[7,14]]) box(x, y + dy, 1, 2, '#f3d69a');
        for (let i = 0; i < 4; i++) px(3, 22 + mod(t * 3 + i * 2, 6), i % 2 ? '#83ccc9' : '#4a818f');
        break;
      }
      case 'pocket_mushrooms': {
        frame.fill('#111b2b');
        for (let x of [1, 12, 14]) line(x, 26, x - 1, 8, '#203e45');
        box(5, 13, 5, 11, '#749996'); box(5, 14, 2, 9, '#b2c7ad');
        oval(7, 12, 6.2, 4.3, '#805b94'); box(1, 12, 13, 3, '#9c6ca5');
        line(2, 15, 12, 15, '#c4d6c2');
        for (const [x,y] of [[4,10],[9,10],[6,12],[11,12],[2,13]]) px(x, y, '#dfc8d1');
        for (const [x,y,c] of [[2,23,'#cc997b'],[12,21,'#81bcb0']]) {
          box(x, y, 1, 5, '#a1ac8e'); oval(x, y, 2.1, 1.5, c); px(x - 1, y - 1, '#e8dfb9');
        }
        box(0, 26, 15, 1, '#31544b');
        for (let i = 0; i < 9; i++) {
          const x = seed(i + 181) * 14 + Math.sin(t * 0.7 + i);
          const y = 25 - mod(t * 0.8 + i * 3.9, 27);
          px(x, y, Math.sin(t * 1.2 + i) > 0.5 ? '#c2e6bb' : '#446e72');
        }
        break;
      }
      case 'pocket_pumpkin': {
        frame.fill('#1b1b2a'); stars(9, 9); box(0, 24, 15, 3, '#294037');
        oval(7, 16, 6.1, 7.3, '#c66c37'); oval(7, 16, 4.5, 7, '#ea9144');
        for (let y = 10; y < 23; y++) {
          px(4 + Math.sin((y - 10) / 13 * Math.PI), y, '#c77337');
          px(10 - Math.sin((y - 10) / 13 * Math.PI), y, '#c77337');
        }
        box(6, 7, 2, 3, '#7a8650'); line(7, 7, 10, 5, '#8da365'); line(10, 5, 11, 6, '#8da365');
        px(5, 8, '#4b6b4b'); px(4, 7, '#617e53');
        sprite(['.k...k.','kk...kk','..k.k..','.......','k.k.k.k','.kkkkk.'], 4, 13, { k:'#633732' });
        const glow = Math.sin(t * 2.2) + Math.sin(t * 3.7) * 0.4 > 0 ? '#f9d879' : '#eeba63';
        px(5, 14, glow); px(9, 14, glow); line(5, 18, 9, 18, glow);
        for (let i = 0; i < 3; i++) px(2 + i * 5 + Math.sin(t * 0.7 + i), mod(t * 0.7 + i * 8, 26), '#856c43');
        break;
      }
      case 'pocket_gyroscope': {
        frame.fill('#081421'); stars(18, 26);
        for (let ring = 0; ring < 3; ring++) {
          const tilt = t * 0.37 + ring * Math.PI / 3;
          const roll = t * 0.21 + ring * 0.7;
          let last = null;
          for (let i = 0; i <= 60; i++) {
            const a = i / 60 * Math.PI * 2, r = 5 - ring * 0.55;
            const x = Math.cos(a) * r, y = Math.sin(a) * Math.cos(tilt) * r, z = Math.sin(a) * Math.sin(tilt);
            const scale = 1 / (1 + z * 0.12);
            const xx = 7 + (x * Math.cos(roll) - y * Math.sin(roll)) * scale;
            const yy = 13 + (x * Math.sin(roll) + y * Math.cos(roll)) * scale * 1.75;
            const color = hue(170 + ring * 80 + a * 30 + t * 9, 37 + (z + 1) * 12);
            if (last) line(last[0], last[1], xx, yy, color);
            last = [xx, yy];
          }
        }
        px(7, 13, '#e0f4ec'); px(6, 13, '#86c9bc'); px(8, 13, '#86c9bc');
        break;
      }
      case 'pocket_circuit': {
        frame.fill('#091d22');
        const paths = [
          [[0,1],[3,1],[3,6],[5,8],[5,11]],
          [[14,2],[11,2],[11,5],[9,7],[9,11]],
          [[0,10],[1,10],[1,13],[5,13]],
          [[14,9],[13,9],[13,15],[9,15]],
          [[0,25],[3,25],[3,21],[5,19],[5,16]],
          [[14,24],[11,24],[11,21],[9,19],[9,16]],
          [[7,0],[7,11]], [[7,26],[7,16]]
        ];
        paths.forEach((points, n) => {
          const dots = [];
          for (let i = 1; i < points.length; i++) {
            const [x1,y1] = points[i-1], [x2,y2] = points[i];
            const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
            for (let j = 0; j < steps; j++) dots.push([Math.round(x1+(x2-x1)*j/steps),Math.round(y1+(y2-y1)*j/steps)]);
          }
          dots.forEach(([x,y]) => px(x,y,'#24514e'));
          const head = Math.floor(mod(t * 5 + n * 3, dots.length + 8));
          for (let tail = 4; tail >= 0; tail--) {
            const dot = dots[head-tail];
            if (dot) px(dot[0],dot[1],['#c4ead0','#76cbb6','#49a48e','#327865','#285c53'][tail]);
          }
        });
        box(4, 10, 7, 8, '#447e6a'); box(5, 11, 5, 6, '#112e34');
        for (let y = 11; y < 18; y += 2) { px(3,y,'#b5a374');px(11,y,'#b5a374'); }
        const route = [[6,12],[7,12],[8,12],[8,13],[8,14],[8,15],[7,15],[6,15],[6,14],[6,13]];
        route.forEach(([x,y]) => px(x,y,'#285b57'));
        const routeIndex = Math.floor(mod(t * 3, route.length));
        const pos = route[routeIndex];
        if (pos) px(pos[0],pos[1],'#ebcc87');
        break;
      }
    }

    // Nearest-neighbor sampling keeps the shared low-resolution art crisp.
    // Equal-color runs reduce work in both the browser and headless renderers.
    paint.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const sy = Math.min(H - 1, Math.floor((y + 0.5) * H / h));
      for (let x = 0; x < w;) {
        const color = frame[sy * W + Math.min(W - 1, Math.floor((x + 0.5) * W / w))];
        let end = x + 1;
        while (end < w && frame[sy * W + Math.min(W - 1, Math.floor((end + 0.5) * W / w))] === color) end++;
        paint.fillStyle = color;
        paint.fillRect(x, y, end - x, 1);
        x = end;
      }
    }
    return true;
  }

function drawPortraitScenes(mode, t, paint, dimensions) {
    const {w, h} = dimensions;
    const r = (x, y, rw, rh, color) => {
      const x0 = Math.round(x * w / 15), y0 = Math.round(y * h / 27);
      const x1 = Math.round((x + rw) * w / 15), y1 = Math.round((y + rh) * h / 27);
      if (x1 <= x0 || y1 <= y0) return;
      paint.fillStyle = color; paint.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    const p = (x,y,c) => r(Math.round(x),Math.round(y),1,1,c);
    const seed = n => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };
    const rgb = (red,green,blue) => 'rgb(' + [red,green,blue].map(v => Math.max(0,Math.min(255,Math.round(v)))).join(',') + ')';
    const bg = (a,b) => {
      for(let y=0;y<27;y++){const k=y/26;r(0,y,15,1,rgb(...a.map((v,i)=>v+(b[i]-v)*k)));}
    };
    const art = (rows,x,y,palette) => rows.forEach((row,dy)=>Array.from(row).forEach((c,dx)=>{if(palette[c])p(x+dx,y+dy,palette[c]);}));
    const stars = (count=12) => {
      for(let i=0;i<count;i++){const glow=0.4+0.6*(0.5+0.5*Math.sin(t*1.6+i*2.4));p(seed(i)*14,seed(i+40)*20,rgb(120*glow,172*glow,225*glow));}
    };
    paint.imageSmoothingEnabled=false;
    paint.fillStyle='#000000';paint.fillRect(0,0,w,h);
    switch(mode) {
      case 'portrait_fireflies': {
        bg([3,12,24],[6,30,22]);
        r(11,2,2,3,'#c9e5bc');r(12,2,1,2,'#102d35');
        for(let i=0;i<9;i++){const x=i*2-1,height=3+Math.floor(seed(i+90)*5);r(x,27-height,1,height,'#145a40');p(x+1,26-height,'#3a8853');}
        for(let i=0;i<10;i++){const x=1+seed(i+12)*12+Math.sin(t*.7+i)*1.1,y=5+seed(i+24)*17+Math.cos(t*.6+i)*1.4;
          const g=Math.pow(.5+.5*Math.sin(t*2+i*1.7),2);p(x,y,rgb(70+185*g,85+150*g,12+38*g));if(g>.85){p(x-1,y,'#243d12');p(x+1,y,'#243d12');}}
        break;
      }
      case 'portrait_balloon': {
        bg([30,97,142],[236,162,117]);
        for(let i=0;i<4;i++){const x=((t*(.3+i*.08)+seed(i)*24)%24)-6,y=3+i*5;r(x,y,4,1,'#c4e1d6');r(x+1,y-1,2,1,'#e4eadd');}
        for(let x=0;x<15;x++){const y=23+Math.sin(x*.6)*2;r(x,y,1,27-y,'#336d6a');r(x,25+Math.sin(x*.8+2),1,3,'#204b55');}
        const y=5+Math.round(Math.sin(t*.7));
        art(['..aaa..','.abbba.','abbcbba','abbcbba','abbcbba','.abbba.','..aba..','..d.d..','..ddd..'],4,y,{a:'#e76456',b:'#ffc56c',c:'#fff0b7',d:'#855b40'});
        break;
      }
      case 'portrait_penguin': {
        bg([11,40,70],[82,143,167]);stars(8);
        r(0,23,15,4,'#92d5d8');r(0,23,15,1,'#e7f5e5');r(3,25,4,1,'#60aabb');r(10,24,3,1,'#60aabb');
        const x=4+motionPixel(Math.sin(t*.6)*2,t,9),bob=motionPixel((Math.sin(t*3-Math.PI/2)+1)*.5,t,10);
        art(['..aaa..','.abbba.','abbcbba','abbcbba','abdddda','aeeeeea','aeeeeea','aeeeeea','.eeee.'],x,13-bob,{a:'#14334c',b:'#e6f5dc',c:'#183346',d:'#ffbe62',e:'#c4e7dd'});
        p(x+1,22-bob,'#ffb052');p(x+2,22,'#ffb052');p(x+4,22,'#ffb052');p(x+5,22-bob,'#ffb052');
        for(let i=0;i<7;i++)p(seed(i+2)*14,(t*(1+seed(i))+i*4)%26,'#b9e4e5');
        break;
      }
      case 'portrait_bamboo': {
        bg([5,24,31],[18,57,43]);
        for(let i=0;i<4;i++){const x=1+i*4,top=3+Math.floor(seed(i)*5);r(x,top,1,27-top,i%2?'#3c9869':'#296d57');
          for(let y=top+3;y<27;y+=5){p(x,y,'#acd09b');const d=(i+y)%2?1:-1;p(x+d,y-1,'#56ab79');p(x+d*2,y-2,'#3f8c68');p(x+d*2,y,'#3f8c68');}}
        for(let i=0;i<10;i++){const y=(t*12+seed(i+7)*30)%31-3;r(seed(i)*14,y,1,2,'#254e52');}
        break;
      }
      case 'portrait_sakura': {
        bg([23,19,48],[84,58,74]);r(0,19,15,8,'#203e5c');
        r(2,3,1,17,'#69494f');r(3,6,3,1,'#80515c');r(0,3,5,1,'#80515c');r(5,4,1,3,'#80515c');
        for(let i=0;i<20;i++){const x=Math.floor(seed(i+100)*10)-2,y=Math.floor(seed(i+30)*7);p(x,y,i%3?'#e09eae':'#ffd4bf');}
        for(let i=0;i<11;i++){const y=(t*(.9+seed(i)) + i*2.6)%27,x=(seed(i+9)*14+Math.sin(t*.7+i)*2+15)%15;p(x,y,i%2?'#ffd0d4':'#df8bac');}
        for(let i=0;i<5;i++)r((t*.8+i*3)%16-2,20+i,2,1,i%2?'#64748a':'#42617d');
        break;
      }
      case 'portrait_whale': {
        bg([8,9,34],[29,22,65]);stars(22);
        r(11,3,2,2,'#bd93cd');p(10,4,'#604374');p(13,3,'#604374');
        const y=12+Math.round(Math.sin(t*.8));
        art(['...aaaaa....','..abbbbba...','.abccbbbba..','abbbbbbbbd.a','abbbbbbbbaaa','.aeeeeeeaa..','..aaaaaa....'],1,y,{a:'#3767a5',b:'#739ce1',c:'#bfceff',d:'#0c234b',e:'#a0c0e5'});
        for(let i=0;i<3;i++){const phase=(t*2+i*2)%7;p(5+(i-1)*Math.floor(phase/3),y-1-phase,phase<5?'#9dddea':'#46689a');}
        break;
      }
      case 'portrait_portal': {
        for(let y=0;y<27;y++)for(let x=0;x<15;x++){
          const edge=Math.min(x,14-x,Math.floor(y*15/27),Math.floor((26-y)*15/27));
          const phase=edge*0.78-t*.65;
          const pulse=.5+.5*Math.sin(phase*1.8);
          p(x,y,rgb(30+110*pulse+edge*12,60+145*(1-pulse),145+100*pulse));
        }
        r(5,9,5,9,'#060a1a');r(6,10,3,7,'#090522');
        p(7,13,'#f5eaff');p(7,14,'#f5eaff');break;
      }
      case 'portrait_coffee': {
        bg([30,18,25],[66,37,39]);r(0,22,15,2,'#ad7752');r(0,24,15,3,'#4f3433');
        r(3,14,8,6,'#e5d0a1');r(4,20,6,1,'#c1a477');r(4,14,6,1,'#653d2f');r(11,15,2,4,'#e5d0a1');r(11,16,1,2,'#422830');r(2,21,11,1,'#f5ddb0');
        p(5,17,'#b17960');p(8,17,'#b17960');r(6,19,2,1,'#b17960');
        for(let i=0;i<3;i++)for(let k=0;k<5;k++){const y=12-((t*2+k+i*.6)%8);p(4+i*3+Math.sin(y*.9+t+i),y,rgb(112+k*16,89+k*15,82+k*13));}
        break;
      }
      case 'portrait_prism': {
        bg([5,13,28],[17,10,37]);
        const colors=['#f674a3','#ffb65e','#e7e885','#73d6bc','#71b5f4','#ad95e3'];
        for(let i=0;i<12;i++){const x=Math.floor(seed(i+60)*15),y=motionPixel((t*(3+seed(i)*5)+seed(i+11)*34)%34-7,t,i+11);
          for(let k=0;k<5;k++){const c=colors[i%colors.length],v=parseInt(c.slice(1),16),f=(5-k)/5;p(x,y-k,rgb((v>>16)*f,((v>>8)&255)*f,(v&255)*f));}
          p(x,y,'#e9eeff');}
        break;
      }
      case 'portrait_dancer': {
        bg([14,9,32],[32,17,43]);
        for(let y=21;y<27;y++)for(let x=0;x<15;x++)p(x,y,(x+y+motionPixel(t*2,t,12))%4?'#26203e':'#804b91');
        const sway=motionPixel(Math.sin(t*3),t,13),arm=motionPixel((Math.sin(t*3)+1)*.5,t,14);
        art(['.aaa.','abbba','abcba','abbba','.aaa.','..d..','.ddd.','ddddd','.ddd.','..d..'],5+sway,7,{a:'#e58b80',b:'#ffc5a0',c:'#512953',d:'#68cbbd'});
        for(let i=0;i<3;i++){p(4+sway-i,14+(arm?-i:i),'#ffc5a0');p(10+sway+i,14+(arm?i:-i),'#ffc5a0');}
        for(let i=0;i<4;i++){p(7+sway-Math.round(i*.7),17+i,'#8295e6');p(7+sway+Math.round(i*.7),17+i,'#8295e6');}
        p(3+sway,21,'#f3b669');p(11+sway,21,'#f3b669');break;
      }
      case 'portrait_rose': {
        bg([10,18,26],[24,39,40]);r(7,13,1,11,'#459b68');r(5,18,2,1,'#70bd79');p(4,17,'#70bd79');r(8,20,2,1,'#34794f');p(10,19,'#34794f');
        const pulse=.5+.5*Math.sin(t*.9),petals=['..aa.aa..','.abbbbaaa','abccbbbba','abccdbbba','.abbbbaa.','..aaaaa..'];
        art(petals,3,7,{a:'#892b57',b:rgb(202+pulse*28,70+pulse*18,110+pulse*15),c:'#ffb49c',d:'#f5d294'});
        for(let i=0;i<4;i++){const y=(t*1.2+i*6)%25;p(2+seed(i)*11+Math.sin(t+i),y,'#ad6279');}
        r(5,24,5,1,'#28433c');break;
      }
      case 'portrait_moonrabbit': {
        bg([10,14,36],[29,29,58]);stars(15);
        r(9,3,3,4,'#f9dda3');r(8,4,1,2,'#f9dda3');r(10,3,2,3,'#17203f');
        for(let x=0;x<15;x++)r(x,23+Math.sin(x*.45),1,5,'#4b6479');
        const y=13-Math.max(0,Math.round(Math.sin(t*1.6)*2));
        art(['.a..a..','.b..b..','.b..b..','.aaaa..','aabcaa.','aaaaaa.','.aaaa..','aaaaaaa','aaaaaaa','.a...a.'],4,y,{a:'#ece5d1',b:'#dba1b0',c:'#334059'});
        p(5,23,'#829395');p(10,25,'#829395');break;
      }
      default:return false;
    }
    return true;
  }

function drawStoryScene(mode,time,paint,{w,h}) {
    const t=Math.floor(((time%24)+24)%24*24)/24, phase=t/24;
    const bg='#05090d',main='#579bad',accent='#c98a63',light='#f8e7bb';
    const box=(x,y,ww,hh,c)=>{paint.fillStyle=c;const x0=Math.round(x*w/15),y0=Math.round(y*h/27);paint.fillRect(x0,y0,Math.max(1,Math.round((x+ww)*w/15)-x0),Math.max(1,Math.round((y+hh)*h/27)-y0));};
    const dot=(x,y,c)=>box(x,y,1,1,c);
    const sprite=(rows,x,y)=>rows.forEach((r,j)=>[...r].forEach((v,i)=>{if(v!=='.')dot(x+i,y+j,({a:main,b:accent,c:light,d:bg})[v]);}));
    box(0,0,15,27,bg);
    const stars=()=>{for(let i=0;i<13;i++)dot((i*7+2)%15,(i*11+3)%17,Math.sin(t*1.6+i)>0.45?light:'#244554');};
    if(mode==='scene_cafe'){
      box(1,2,13,15,'#172d3c');box(7,2,1,15,accent);box(1,9,13,1,accent);
      for(let i=0;i<12;i++){const y=(t*(3+i%3)+i*7)%15;box(2+i%11,2+y,1,2,main);}
      box(0,20,15,2,accent);box(0,22,15,5,'#221b1a');
      sprite(['ccccc.','baaaa.c','baaaa.c','.bbbb.'],3,16);
      for(let i=0;i<3;i++){const y=15-(t*2+i*2)%6;dot(5+Math.sin(t*2+i),y,light);}
      if(t>10&&t<17)sprite(['.aa.','aaaa','acc a'.replace(' ',''),'aaaa'],10,16);
      dot(2+(t*0.7)%11,11,light);
    }else if(mode==='scene_jellies'){
      for(let i=0;i<3;i++){
        const x=2+i*4+Math.sin(t*.65+i),y=5+i*5+Math.sin(t*.45+i)*2;
        sprite(['.aaa.','accca','aaaaa'],x-2,y);
        for(let k=0;k<3;k++)for(let q=0;q<4;q++)dot(x-1+k+Math.sin(t*2+q+i)*.6,y+3+q,k===1?accent:main);
      }
      for(let i=0;i<6;i++)dot((i*3+1)%15,26-(t*2+i*4)%27,light);
      for(let i=0;i<5;i++)for(let j=0;j<4;j++)dot(i*3+Math.sin(t+i+j)*.7,26-j,accent);
    }else if(mode==='scene_train'){
      stars();sprite(['.bbbb.','bbccbb','bbbbbb','.bbbb.'],9-Math.sin(t*.26)*2,3);
      for(let x=0;x<15;x++)dot(x,20+Math.sin(x*.5)*2,main);
      const x=t<4?-21+t*5.25:t<13?0:(t-13)*3;
      for(let k=0;k<3;k++){box(x+k*6,15,5,4,accent);box(x+k*6+1,16,3,1,light);dot(x+k*6+1,19,main);dot(x+k*6+4,19,main);}
      for(let i=0;i<5;i++)dot((i*4+t*2)%17-1,23+(i%2),light);
    }else if(mode==='scene_camp'){
      stars();sprite(['.ccc','ccc.','ccc.','.ccc'],10,2);
      for(let x=0;x<15;x++)box(x,18-Math.abs(x-7)*.4,1,10,'#18302c');
      for(let y=0;y<6;y++)box(6-y*.7,15+y,1+y*1.4,1,accent);
      sprite(['.dd.','dddd','dddd'],4,18);box(0,23,15,4,'#25201b');
      box(9,23,4,1,accent);const flame=2+Math.floor((Math.sin(t*7)+1)*1.3);box(10,23-flame,2,flame,light);dot(9+Math.sin(t*5)*2,21-(t*2)%5,accent);
      if(t>15&&t<19){const x=(t-15)*5;dot(x,5,light);dot(x-1,4,main);}
    }else if(mode==='scene_seasons'){
      const season=Math.floor(t/6), growth=Math.min(1,(t%6)/2);
      box(7,12,1,12,accent);box(4,16,4,1,accent);box(8,14,3,1,accent);box(0,25,15,2,main);
      for(let y=0;y<9;y++)for(let x=0;x<11;x++)if((x-5)**2/26+(y-4)**2/18<1&&((x*7+y*3)%11)/11<growth){
        const c=season===0?((x+y)%4===0?light:main):season===1?main:season===2?((x+y)%3?accent:light):light;
        dot(x+2,y+7,c);
      }
      for(let i=0;i<7;i++)dot((i*3+Math.sin(t+i)*2+15)%15,(t*(season===3?1.4:2)+i*4)%25,season===2?accent:light);
      if(season===1)sprite(['.c.','ccc','.b.'],2,22);
    }else{
      box(0,25,15,2,accent);
      for(let i=0;i<3;i++){
        const x=3+i*4,y=9+(i%2)*7,angle=t*(i%2?-1:1)*.7;
        box(x,y+2,1,25-y,main);
        for(let k=0;k<8;k++){const a=angle+k*Math.PI/4;dot(x+Math.cos(a)*2,y+Math.sin(a)*2,k%2?accent:light);}
        dot(x,y,light);dot(x+1,y+5,accent);
      }
      for(let i=0;i<4;i++)dot((t*1.8+i*4)%15,3+i*3,light);
      const bud=phase<.5?Math.floor(phase*10):Math.floor((1-phase)*10);box(12,23-bud,1,bud+1,main);dot(12,22-bud,accent);
    }
    return true;
  }
const handmadeSource = {"Echo.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[141,198,224,255],[112,154,209,255],[153,217,234,255],[70,70,70,255],[200,238,247,255],[255,255,255,255],[214,214,214,255],[232,174,65,255],[230,119,55,255],[180,180,180,255],[0,0,0,0]],"d":"0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b010b0b0b0b0b0b0b0b0b0b0b0b0b02010b0b0b0b0b0b0b0b0b0b0b020103030b010b0b0b0b0b0b0b0b020101030303010b0b0b0b0b0b0b02010301030303010b0b0b0b0b0b0201010101030303010b0b0b0b0b0201010404010104040b0b0b0b0b0b02040303040401030b0b0b0b0b0b02040506030306050b0b0b0b0b0b0b040303030303030b0b0b0b0b0b0b0104030303030b0b0b0b0b0b0707070808010108070b0b0b0b0b070307070801080807030b0b0b0b070703030908080903070b0b0b0b070707070908090707070b0b0b0b010707070709090a0a070b0b0b0b0101010a0a0a0a0a0a010b0b0b0b0103010a0a0a0a0a0a030b0b0b0b0103030a0a0a0a0a01030b0b0b0103030a010101010301030b0b0b0103010a010101030a01030b0b0b010108090a0303030a0a030b0b0b010208090a0a030a090a020b0b0b02020a08090a0a09080a020b0b","ms":120}]},"Ironman_1.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[0,0,0,255],[255,0,0,255],[255,194,14,255],[0,183,239,255],[0,0,0,0]],"d":"05050505050101010105050505050505050101020202020101050505050501020202020202020201050505010203030202020203030201050501020303020202020303020105050102030303020203030302010501020103030303030303030102010102010101010101010101010201010203040404010104040403020101020203030303030303030202010501020303030303030303020105050102030303030303030302010505050102030303030303020105050505010203010101010302010505050505010103030303010105050505050102010202020201020105050501030301020404020103030105010202030102040402010302020101020201010202020201010202010501010001020202020100010105050505010202020202020105050505050501020202020202010505050505050103030101030301050505050501030301050501030301050505050102020105050102020105050505010101010505010101010505","ms":120}]},"Ironman_2.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[0,0,0,255],[255,0,0,255],[255,194,14,255],[0,183,239,255],[0,0,0,0]],"d":"05050505010101010101050505050505050102020202020201050505050501020202020202020201050505010203020202020202030201050102020303020202020303020201010202030303020203030302020101020103030303030303030102010102010101010101010101010201010203040404030304040403020101020203030303030303030202010501020303030303030303020105050102030303030303030302010505050102030303030303020105050505010203010101010302010505050505010103030303010105050505050102010202020201020105050501030301020404020103030105010202030102040402010302020101020201010202020201010202010501010001020202020100010105050505010202020202020105050505050501020202020202010505050505050103030101030301050505050501030301050501030301050505050102020105050102020105050505010101010505010101010505","ms":120}]},"Ironman_3.png":{"w":14,"h":26,"frames":[{"p":[[180,180,180,255],[0,0,0,255],[255,0,0,255],[237,28,36,255],[255,194,14,255],[0,183,239,255],[0,0,0,0]],"d":"06060606060101010106060606060606060101020202020101060606060601020202020202020201060606010304020202020202040301060101030404020202020404030101010203040404020204040403020101020104040404040404040102010102010101010101010101010201010202050505040405050502020101020204040404040404040202010601020404040404040404020106060102040404040404040402010606060102040404040404020106060606010204010101010402010606060606010104040404010106060606060102010202020201020106060601040401020505020104040106010202040102050502010402020101020201010202020201010202010601010001020202020100010106060606010202020202020106060606060601020202020202010606060606060104040101040401060606060601040401060601040401060606060102020106060102020106060606010101010606010101010606","ms":120}]},"Kiriko.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[49,94,62,255],[242,128,134,255],[255,255,255,255],[250,213,219,255],[255,242,242,255],[0,0,0,255],[70,70,70,255],[255,245,219,255],[154,173,159,255],[191,70,78,255],[255,219,191,255],[0,0,0,0]],"d":"0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c01010c0c0c0c0c0c020c0c0101020301010c0c0c0c020402010102040203010c0c0c0c020202020202020201010c0c0c0c02010501010501020101010c0c0c0105060501060501010c010c0c0c0105070505070501010c0c0c0c0c01040405050404010c0c0c0c0c0c08090a04040a0908080c0c0c0c0808090b0a0a0b0908080c0c0c0c08080b0b0b0b0b0b08080c0c0c0c05080b0b0b0b0b0b08050c0c0c0c05050b0b0b0b0b0b05050c0c0c0c05050a0a0a0a0a0a05050c0c0c0c0a0a0b0b0b0b0b0b0a0a0c0c0c0c050509090909090905050c0c0c0c0c0c0909090909090c0c0c0c0c0c0c0c0909090909090c0c0c0c0c0c0c0c0909090909090c0c0c0c0c0c0c0c0909090909090c0c0c0c0c0c0c0c0909090909090c0c0c0c0c0c0c0c0909090909090c0c0c0c0c0c0c0c0101010101010c0c0c0c0c0c0c0c0a0a0a0a0a0a0c0c0c0c","ms":120}]},"LavaBucket.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[0,0,0,255],[255,126,0,255],[140,90,69,255],[204,143,118,255],[237,28,36,255],[255,242,0,255],[217,217,217,255],[153,0,48,255],[196,196,196,255],[227,227,227,255],[255,194,14,255],[180,180,180,255],[255,255,255,255],[0,0,0,0]],"d":"0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0101010101010e0e0e0e0e0e010102030404050501010e0e0e0100050606020206020504010e0e0105020602060602060205010e0e0107080502060506060509010e0e010a0708080808050b0c09010e0e010a0a0a0a070709020c07010e0e010a0a0d0a0707090c0c07010e0e01090a0d0a070709020c07010e0e010c0a0d0a0707090c0c09010e0e0e010a0a0a0707090c09010e0e0e0e01070a0a0709090c09010e0e0e0e0e01070a07090c09010e0e0e0e0e0e0e0101010101010e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e","ms":120}]},"LavaBucket_2.png":{"w":14,"h":26,"frames":[{"p":[[255,255,255,255],[0,0,0,255],[255,126,0,255],[140,90,69,255],[204,143,118,255],[237,28,36,255],[0,0,0,0],[255,242,0,255],[217,217,217,255],[153,0,48,255],[196,196,196,255],[227,227,227,255],[255,194,14,255],[180,180,180,255],[0,0,0,0]],"d":"0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0101010101010e0e0e0e0e0e010102030404050501010e0e0e0106050707020207020504010e0e0105020702070702070205010e0e010809050207050707050a010e0e010b0809090909050c0d0a010e0e010b0b0b0b08080a020d08010e0e010b0b000b08080a0d0d08010e0e010a0b000b08080a020d08010e0e010d0b000b08080a0d0d0a010e0e0e010b0b0b08080a0d0a010e0e0e0e01080b0b080a0a0d0a010e0e0e0e0e01080b080a0d0a010e0e0e0e0e0e0e0101010101010e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e","ms":120}]},"Mario_1.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[237,28,36,255],[156,90,60,255],[255,194,14,255],[0,0,0,255],[0,0,255,255],[84,25,0,255],[0,0,0,0]],"d":"07070701010101010107070707070707070101010101010707070707070701010101010101010101070707070202020303030303070707070702030203030303040307070707070203020203030304030307070707070203030303030303030307070707070303030303030403030307070707030303030304040404070707070703030303030303030707070707070303030303030303070707070701010105010101070707070707010101010505010107070707070701010105050505010107070707070101050505030305010707070707010101050503030505070707070705010101010505050507070707070505010303030505050707070707070505030303050505070707070707050503030305050707070707070705050505050505070707070707070505050505050507070707070707050505050505050707070707070702020206060606070707070707070202020206060606070707070707020202020606060607070707","ms":120}]},"Mario_2.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[255,0,0,255],[156,90,60,255],[229,170,122,255],[0,0,0,255],[0,0,255,255],[255,242,0,255],[0,0,0,0]],"d":"07070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070101010101070707070707070701010101010101010107070707070202020303040307070707070702030203030304030303070707070203020203030304030303070707020203030303040404040707070707070303030303030307070707070701010501010107070707070707010101050101050101010707070101010105050505010101010707030301050605050605010303070703030305050505050503030307070303050505050505050503030707070705050507070505050707070707020202070707070202020707070202020207070707020202020707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707","ms":120}]},"Mario_3.png":{"w":14,"h":26,"frames":[{"p":[[255,255,255,255],[255,0,0,255],[156,90,60,255],[229,170,122,255],[0,0,0,255],[0,0,255,255],[255,242,0,255],[0,0,0,0]],"d":"07070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070101010101070707070707070701010101010101010107070707070202020303040307070707070702030203030304030303070707070203020203030304030303070707020203030303040404040707070707070303030303030307070707070701010501010107070707070707010101050101050101010707070101010105050505010101010707030301050605050605010303070703030305050505050503030307070303050505050505050503030707070705050507070505050707070707020202070707070202020707070202020207070707020202020707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707070707","ms":120}]},"pixil-frame-0.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[255,242,0,255],[255,194,14,255],[34,177,76,255],[211,249,188,255],[0,183,239,255],[237,28,36,255],[156,90,60,255],[0,0,0,0]],"d":"08080808080801010808080808080808080801010101010208080808080808080801010102080808080808080808080202020208080808080808080802020303020208080808080808080803030303080808080808080808030303030303080808080808080404020404040404080808080803030304040405030303080808080803060303030302030808080808040404030303060404040808080303020404050504040403030803030303030303030606030303030403050503030202030305050304040404040303030303030404040408040202040606040404040404080803030303030303030202030308080805050303030303030505080808080808080707070708080808080808080808070707070808080808080808080807070707080808080808080808080707070708080808080808080808070707070808080808080808080807070707080808080808080808080707070708080808080808080808070707070808080808","ms":120}]},"Rocket.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,0],[0,0,0,255],[0,0,255,255],[255,255,255,255],[0,183,239,255],[255,0,0,255],[255,126,0,255],[255,242,0,255],[0,0,0,0]],"d":"08080808080808080808080808080808080808080101080808080808080808080801020201080808080808080808010102020101080808080808080801020202020108080808080808010101010101010108080808080801030303030303010808080808080103010101010301080808080808010301040401030108080808080801030104040103010808080808010303010101010303010808080801030303030303030301080808010103030001010303030101080102010303010202010303010201010201010101020201010101020101020105060102020106050102010102010506010202010605010201010101050601010101060501010108080105060707070706050108080808010506070707070605010808080808010506070706050108080808080801050607070605010808080808080801050606050108080808080808080801050501080808080808080808080801010808080808080808080808080808080808080808","ms":120}]},"Rocket_2.png":{"w":14,"h":26,"frames":[{"p":[[180,180,180,255],[0,0,0,255],[0,0,255,255],[255,255,255,255],[0,183,239,255],[0,0,0,0],[255,0,0,255],[255,126,0,255],[255,242,0,255],[0,0,0,0]],"d":"09090909090909090909090909090909090909090101090909090909090909090901020201090909090909090909010102020101090909090909090901020202020109090909090909010101010101010109090909090901030303030303010909090909090103010101010301090909090909010301040401030109090909090901030104040103010909090909010303010101010303010909090901030303030303030301090909010103030501010303030101090102010303010202010303010201010201010101020201010101020101020106070102020107060102010102010607010202010706010201010101060701010101070601010109090106070808080807060109090909010607080808080706010909090909010607080807060109090909090901060708080706010909090909090901060707060109090909090909090901060601090909090909090909090901010909090909090909090909090909090909090909","ms":120}]},"ROG_1.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,255],[237,28,36,255],[0,0,0,0]],"d":"02020202020202020202020202020202020202010101010202020202020202020201000001020202020202020202020100000102020202020202020202010101010202020202020202020201010202020202020202020202020102010202020202020202020202010202010202020202020202020202020202020202020202020202020101010102020202020202020202010000010202020202020202020201000001020202020202020202020100000102020202020202020202010000010202020202020202020201000001020202020202020202020101010102020202020202020202020202020202020202020202020201010101020202020202020202020102020202020202020202020202010202020202020202020202020201020101020202020202020202020102020102020202020202020202010202010202020202020202020201010101020202020202020202020202020202020202020202020202020202020202020202","ms":120}]},"ROG_2.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,255],[237,28,36,255],[0,0,0,0]],"d":"02020202020202020202020202020202020201010101010102020202020202020100000000010202020202020202010000000001020202020202020201010101010102020202020202020101020202020202020202020202010201010202020202020202020201020202010102020202020202020202020202020202020202020202010101010101020202020202020201000000000102020202020202020100000000010202020202020202010000000001020202020202020201000000000102020202020202020100000000010202020202020202010101010101020202020202020202020202020202020202020202020101010101010202020202020202010202020202020202020202020201020202020202020202020202020102020101010202020202020202010202020201020202020202020201020202020102020202020202020101010101010202020202020202020202020202020202020202020202020202020202020202","ms":120}]},"superMarioRun.gif":{"w":14,"h":14,"frames":[{"p":[[0,0,0,0],[255,0,0,255],[75,26,0,255],[255,214,0,255],[0,0,0,255],[0,30,255,255],[251,255,0,255],[60,21,0,255],[0,0,0,0]],"d":"08080808010101010108080808080808080101010101010101080808080808020202030304030808080808080803020203030304030308080808080203030303040404080808080808080303030303030808080808080801010105010108080808080808080101010505010108080808080808010105050605050808080808080801010105050505080808080808080501030305050808080808080808050505050505080808080808080802020207070708080808080808080202020207070708080808","ms":170},{"p":[[0,0,0,0],[255,0,0,255],[75,26,0,255],[255,214,0,255],[0,0,0,255],[0,30,255,255],[0,0,0,0]],"d":"06060606010101010106060606060606060101010101010101060606060606020202030304030606060606060603020203030304030306060606060203030303040404060606060606060303030303030606060606060606060101050501060606060606060601010101050103060606060606030101010101010303060606060303050101010101030606060606020505050505050506060606060602050506060505050606060606060206060606020202060606060606060606060602020206060606","ms":170},{"p":[[0,0,0,0],[255,0,0,255],[75,26,0,255],[255,214,0,255],[0,0,0,255],[0,30,255,255],[251,255,0,255],[60,21,0,255],[0,0,0,0]],"d":"08080808010101010108080808080808080101010101010101080808080808020202030304030808080808080803020203030304030308080808080203030303040404080808080808080303030303030808080808080801010105010108080808080808080101010505010108080808080808010105050605050808080808080801010105050505080808080808080501030305050808080808080808050505050505080808080808080802020207070708080808080808080202020207070708080808","ms":170},{"p":[[0,0,0,0],[255,0,0,255],[75,26,0,255],[255,214,0,255],[0,0,0,255],[0,30,255,255],[251,255,0,255],[0,0,0,0]],"d":"07070707010101010107070707070707070101010101010101070707070707020202030304030707070707070703020203030304030307070707070203030303040404070707070707070303030303030707070707070101010501010105070707070303010101050501010101030303030303010105060505050101030303030005050505050505000002070707050505050505050505020207070202050507070707050502020707020207070707070707070707070707020207070707070707070707","ms":170}]},"T1_1.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,255],[255,255,255,255],[0,0,0,0]],"d":"02020202020202020202020202020201010101010101010101010102020101010101010101010101010202010101010101010101010101020202020202010101010202020202020202020201010101020202020202020202020101010102020202020202020202010101010202020202020202020201010101020202020202020202020101010102020202020202020202010101010202020202020202020201010101020202020202020202020202020202020202020202020202020202020202020202020202020201010101020202020202020202020101010102020202020202020202010101010202020202020202020201010101020202020202020202020101010102020202020202020202010101010202020202020202020201010101020202020202020202020101010102020202020202020202010101010202020202020202020201010101020202020202020202020101010102020202020202020202020202020202020202","ms":120}]},"T1_2.png":{"w":14,"h":26,"frames":[{"p":[[0,0,0,255],[255,255,255,255],[0,0,0,0]],"d":"02020202020202020202020202020202020101010101010101020202020202010101010101010102020202020202020201010202020202020202020202020101020202020202020202020202010102020202020202020202020201010202020202020202020202020101020202020202020202020202010102020202020202020202020201010202020202020202020202020101020202020202020202020202010102020202020202020202020202020202020202020202020202020202020202020202020202020202010102020202020202020202020201010202020202020202020202020101020202020202020202020202010102020202020202020202020201010202020202020202020202020101020202020202020202020202010102020202020202020202020201010202020202020202020202020101020202020202020202020202010102020202020202020202020201010202020202020202020202020202020202020202","ms":120}]}};
const handmadeDecoded = new Map();
const handmade15Decoded = new Map();
const handmade15Rows = {
    'Echo.png':18,
    'Ironman_1.png':20,'Ironman_2.png':20,'Ironman_3.png':20,
    'Kiriko.png':20,
    'LavaBucket.png':14,'LavaBucket_2.png':14,
    'Mario_1.png':20,'Mario_2.png':16,'Mario_3.png':16,
    'pixil-frame-0.png':13,
    'Rocket.png':12,'Rocket_2.png':12,
    'ROG_1.png':9,'ROG_2.png':9,
    'T1_1.png':13,'T1_2.png':13,
    'superMarioRun.gif':9
  };
function handmadeFrame(name, time=0) {
    const asset=handmadeSource[name];
    const duration=asset.frames.reduce((sum,frame)=>sum+frame.ms,0);
    let position=((time*1000)%duration+duration)%duration,index=0;
    while(index<asset.frames.length-1 && position>=asset.frames[index].ms)position-=asset.frames[index++].ms;
    const key=name+':'+index;
    if(!handmadeDecoded.has(key)){
      const frame=asset.frames[index],pixels=[];
      for(let i=0;i<frame.d.length;i+=2)pixels.push(frame.p[parseInt(frame.d.slice(i,i+2),16)]);
      handmadeDecoded.set(key,{w:asset.w,h:asset.h,pixels});
    }
    return handmadeDecoded.get(key);
  }
function handmadeFrame15(name,time=0) {
    const original=handmadeFrame(name,time);
    if(original.w!==14 || ![14,26].includes(original.h))return original;
    if(handmade15Decoded.has(original))return handmade15Decoded.get(original);
    const width=original.w+1,height=original.h+1;
    const column=original.w/2;
    const row=Math.max(1,Math.min(original.h-1,handmade15Rows[name] ?? Math.floor(original.h/2)));
    const pixels=new Array(width*height);
    for(let y=0;y<height;y++){
      const sy=y<row?y:y-1;
      for(let x=0;x<width;x++){
        const sx=x<column?x:x-1;
        pixels[y*width+x]=original.pixels[sy*original.w+sx];
      }
    }
    const edition={w:width,h:height,pixels};
    handmade15Decoded.set(original,edition);
    return edition;
  }
function drawHandmadeAnimation(mode,t,paint,{w,h}) {
    if(!mode.startsWith('hand_'))return false;
    const dot=(x,y,color)=>{paint.fillStyle=color;paint.fillRect(Math.round(x),Math.round(y),1,1);};
    const rnd=n=>{const v=Math.sin(n*71.7+19.3)*13849.21;return v-Math.floor(v);};
    let names=[],pulse=1,bob=0,kind=mode;
    if(mode==='hand_echo'){names=['Echo.png'];bob=Math.sin(t*1.7);pulse=.94+.06*Math.sin(t*2);}
    if(mode==='hand_ironman'){names=['Ironman_1.png','Ironman_2.png','Ironman_3.png','Ironman_2.png'];pulse=.93+.07*Math.sin(t*2.5);}
    if(mode==='hand_kiriko'){names=['Kiriko.png'];bob=Math.sin(t*1.2);}
    if(mode==='hand_lava')names=['LavaBucket.png','LavaBucket_2.png'];
    if(mode==='hand_mario'){names=['Mario_2.png','Mario_3.png','Mario_1.png','Mario_1.png'];bob=Math.max(0,Math.sin(t*3))*-1;}
    if(mode==='hand_mariorun')names=['superMarioRun.gif'];
    if(mode==='hand_tree')names=['pixil-frame-0.png'];
    if(mode==='hand_rocket'){names=['Rocket.png','Rocket_2.png'];bob=Math.sin(t*1.4);}
    if(mode==='hand_rog')names=['ROG_1.png','ROG_2.png'];
    if(mode==='hand_t1')names=['T1_1.png','T1_2.png'];
    if(!names.length)return false;
    const pick=Math.floor(t/(kind==='hand_ironman'?1.3:kind==='hand_mario'?2:3))%names.length;
    const use15Edition=w>=15 && h>=27 && w%15===0 && h%27===0 && w/15===h/27;
    const frame=use15Edition?handmadeFrame15(names[pick],t):handmadeFrame(names[pick],t);
    const scale=Math.min(w/frame.w,h/frame.h),factor=scale>=1?Math.floor(scale):scale;
    const dw=Math.max(1,Math.round(frame.w*factor)),dh=Math.max(1,Math.round(frame.h*factor));
    const left=Math.floor((w-dw)/2);let top=Math.floor((h-dh)/2);
    let ymin=frame.h,ymax=0;
    frame.pixels.forEach((c,i)=>{if(c[3]>0){ymin=Math.min(ymin,Math.floor(i/frame.w));ymax=Math.max(ymax,Math.floor(i/frame.w));}});
    const room=Math.max(0,Math.min(1,top+Math.floor(ymin*factor),h-1-(top+Math.ceil((ymax+1)*factor)-1)));
    top+=Math.round(bob*room);
    if(kind==='hand_echo'||kind==='hand_rocket')
      for(let i=0;i<11;i++)dot(rnd(i)*(w-1),(rnd(i+20)*h+t*(kind==='hand_rocket'?5:1.4))%h,i%3?'#152e43':'#426779');
    if(kind==='hand_kiriko')
      for(let i=0;i<7;i++)dot((rnd(i)*w+Math.sin(t+i))%w,(t*1.7+i*4)%h,i%2?'#74384a':'#d77d8e');
    if(kind==='hand_mariorun'){
      for(let x=0;x<w;x++)dot(x,Math.min(h-1,top+dh+1),(x+motionPixel(t*5,t,x))%4?'#427b42':'#a5bb68');
      for(let i=0;i<3;i++)dot(w-1-((t*3+i*6)%(w+2)),2+i*2,'#263a43');
    }
    for(let dy=0;dy<dh;dy++)for(let dx=0;dx<dw;dx++){
      const sx=Math.min(frame.w-1,Math.floor((dx+.5)*frame.w/dw)),sy=Math.min(frame.h-1,Math.floor((dy+.5)*frame.h/dh));
      const c=frame.pixels[sy*frame.w+sx];if(!c[3])continue;
      let gain=pulse;
      if(kind==='hand_rog'||kind==='hand_t1')gain=.55+.45*Math.pow(.5+.5*Math.sin(sy*.35-t*2),2);
      if(kind==='hand_tree' && (c[0]>c[1]*1.2 || c[2]>c[1]*1.2))gain=.55+.45*(.5+.5*Math.sin(t*2+sx+sy));
      if((kind==='hand_lava'||kind==='hand_rocket') && c[0]>180 && c[1]<180)gain=.78+.22*(.5+.5*Math.sin(t*6+sx+sy));
      const alpha=c[3]/255;
      dot(left+dx,top+dy,'rgb('+c.slice(0,3).map(v=>Math.round(v*gain*alpha)).join(',')+')');
    }
    if(kind==='hand_lava'){
      for(let i=0;i<3;i++){const lift=(t*2+i*1.6)%5;dot(w*.4+i%2*3,h*.27-lift,lift<2?'#faab30':'#7f3921');}
    }
    return true;
  }
function drawNewScenes(mode,t,paint,{w,h}) {
    const dot=(x,y,color)=>{paint.fillStyle=color;paint.fillRect(Math.round(x),Math.round(y),1,1);};
    const rect=(x,y,rw,rh,color)=>{paint.fillStyle=color;paint.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(rw)),Math.max(1,Math.round(rh)));};
    const rgb=(r,g,b)=>'rgb('+[r,g,b].map(n=>Math.max(0,Math.min(255,Math.round(n)))).join(',')+')';
    const seed=n=>{const v=Math.sin(n*33.19+7)*2917.31;return v-Math.floor(v);};
    const shape=(rows,x,y,palette)=>rows.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(palette[c])dot(x+dx,y+dy,palette[c]);}));
    switch(mode){
      case 'tiny_train':{
        for(let y=0;y<h;y++)rect(0,y,w,1,rgb(29+y/h*55,27+y/h*28,55+y/h*12));
        shape(['01110','11111','11111','01110'],Math.floor(w*.6)-2,Math.floor(h*.18),{'1':'#f5b86e'});
        for(let x=0;x<w;x++){
          const hill=motionPixel(h*.48+Math.sin(x*.45-t*.15)*2,t,x);
          rect(x,hill,1,h-hill,'#263f48');
        }
        const y=Math.floor(h*.69),offset=motionPixel((t*4)%(w+19)-19,t,2);
        rect(0,y+5,w,1,'#a28867');rect(0,y+6,w,h-y-6,'#172f30');
        for(let k=0;k<3;k++){
          const x=offset+k*7;rect(x,y,6,4,k===0?'#a35145':'#ba7454');
          rect(x+1,y+1,2,1,'#ffe2a0');rect(x+4,y+1,1,1,'#ffe2a0');
          dot(x+1,y+4,'#08181b');dot(x+4,y+4,'#08181b');
        }
        for(let x=0;x<w;x+=4)dot(x,y+7,'#6c6650');
        break;
      }
      case 'rainy_umbrella':{
        rect(0,0,w,h,'#071b2b');
        for(let i=0;i<16;i++){const x=Math.floor(seed(i)*w),y=motionPixel((t*7+i*2.7)%h,t,i);dot(x,y,'#294e6b');if(i%3===0)dot(x,y-1,'#142c41');}
        const cx=Math.floor(w/2),y=Math.floor(h*.39);
        shape(['000111000','011111110','111111111','111111111','101010101'],cx-4,y,{'1':'#df786a'});
        rect(cx,y+4,1,6,'#dab19b');dot(cx-1,y+9,'#dab19b');
        rect(0,h-4,w,4,'#112c38');
        for(let x=0;x<w;x++)if(Math.sin(x*.8+t*2)>.2)dot(x,h-2,'#397383');
        const ripple=motionPixel(t*2,t,3)%5;
        dot(cx-ripple,h-3,'#719b9b');dot(cx+ripple,h-3,'#719b9b');
        break;
      }
      case 'moon_lighthouse':{
        rect(0,0,w,h,'#0b1429');
        for(let i=0;i<8;i++)dot(seed(i+5)*(w-1),seed(i+24)*h*.4,'#5b657e');
        shape(['0110','1111','1110','0110'],w-5,2,{'1':'#e3d4ab'});
        const cx=motionPixel(w*.35,t,4),cy=motionPixel(h*.39,t,5),sweep=Math.sin(t*.7);
        for(let x=0;x<w;x++)for(let y=cy-4;y<cy+5;y++)
          if(Math.abs(y-cy-sweep*(x-cx)*.65)<1.15 && (x-cx)*sweep>0)dot(x,y,'#a79155');
        rect(0,h*.67,w,h*.33,'#102f40');
        for(let y=Math.floor(h*.7);y<h;y+=2)for(let x=0;x<w;x++)if(Math.sin(x*.8+y-t*2)>.55)dot(x,y,'#366477');
        shape(['01110','11111','00100','01110','01110','01110','01110','11111'],cx-2,cy,{'1':'#d3d6c6'});
        rect(cx-1,cy+1,3,1,'#ffd985');rect(cx-1,cy+4,3,1,'#b1584a');
        break;
      }
      case 'little_vinyl':{
        rect(0,0,w,h,'#101b1b');
        const cx=(w-1)/2,cy=h*.43,r=Math.min(w*.41,h*.3);
        rect(1,cy-r-2,w-2,r*2+5,'#735849');
        for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=0;x<w;x++){
          const d=Math.hypot(x-cx,y-cy),angle=Math.atan2(y-cy,x-cx);
          if(d<=r)dot(x,y,d<r*.25?'#cf795d':Math.sin(angle+t*2+d*2)>.6?'#354749':'#12282b');
        }
        dot(cx,cy,'#f4ddab');
        for(let i=0;i<6;i++)dot(w-3-i*.45,cy-r+i,'#cfbea2');
        for(let i=0;i<3;i++){
          const y=h-2-((t*2+i*3)%Math.max(3,h*.25)),x=2+i*(w-4)/3;
          dot(x,y,'#84baa5');dot(x+1,y-1,'#84baa5');
        }
        break;
      }
      case 'paper_flight':{
        for(let y=0;y<h;y++)rect(0,y,w,1,rgb(20+y/h*20,47+y/h*26,68+y/h*24));
        for(let i=0;i<4;i++){
          const x=(seed(i)*w-t*.7+i*4)%(w+6),y=3+i*h*.22;
          shape(['01110','11111'],x-3,y,{'1':'#476b80'});
        }
        const cx=motionPixel(w*.5+Math.sin(t*.7)*w*.18,t,6),cy=motionPixel(h*.45+Math.sin(t*1.1)*2,t,7);
        for(let i=2;i<7;i++)if(i%2===0)dot(cx-i*.5,cy+i,'#70929d');
        shape(['00001','00111','11111','00110','00100'],cx-2,cy-2,{'1':'#eee7d5'});
        dot(cx+1,cy,'#adc1c0');
        break;
      }
      case 'tiny_greenhouse':{
        rect(0,0,w,h,'#0c211f');
        const cx=Math.floor(w/2),roof=Math.floor(h*.22),base=h-3;
        for(let y=roof;y<=base;y++){
          const half=Math.min(Math.floor(w*.4),y-roof);
          for(let x=cx-half;x<=cx+half;x++)dot(x,y,x===cx-half||x===cx+half?'#9baf91':'#183d39');
        }
        rect(cx,roof,1,base-roof,'#687c64');rect(cx-w*.35,base,w*.7,1,'#a89d72');
        for(let i=0;i<3;i++){
          const x=Math.round((i+1)*w/4),grow=3+motionPixel((Math.sin(t*.45+i)+1)*2,t,i+8);
          rect(x,base-grow,1,grow,'#7fac68');dot(x-1,base-grow+2,'#b4c27c');dot(x+1,base-grow+1,'#7eab6c');
          dot(x,base-grow-1,i%2?'#e8b778':'#d88487');
        }
        for(let i=0;i<3;i++)dot((t*.7+i*5)%w,roof-2+i%2,'#8cac71');
        break;
      }
      default:return false;
    }
    return true;
  }
function drawClassicAnimation(mode,t,paint,dimensions) {
    const { w, h } = dimensions;
    const clamp = (n) => Math.max(0, Math.min(1, n));
    const rgb = (r, g, b) => `rgb(${Math.round(clamp(r / 255) * 255)},${Math.round(clamp(g / 255) * 255)},${Math.round(clamp(b / 255) * 255)})`;
    const hue = (n, light = 45) => `hsl(${((n % 360) + 360) % 360},100%,${light}%)`;
    const seed = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const pixel = (x, y, color) => {
      paint.fillStyle = color;
      paint.fillRect(Math.round(x), Math.round(y), 1, 1);
    };
    const sprite = (rows, cx, cy, color, scale = 1) => {
      const left = Math.floor(cx - rows[0].length * scale / 2);
      const top = Math.floor(cy - rows.length * scale / 2);
      paint.fillStyle = color;
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '1') paint.fillRect(left + x * scale, top + y * scale, scale, scale);
        }
      });
    };
    paint.fillStyle = '#000000';
    paint.fillRect(0, 0, w, h);
    paint.imageSmoothingEnabled = false;

    switch (mode) {
      case 'rainbow':
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) pixel(x, y, hue(x / w * 130 + y / h * 230 - t * 35, 32));
        }
        break;
      case 'fire':
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const nx = (x + 0.5) / w;
            const altitude = 1 - y / Math.max(1, h - 1);
            const flame = 0.52 + Math.sin(nx * 11 + t * 2.4) * 0.14 + Math.sin(nx * 23 - t * 3.1) * 0.1;
            const heat = clamp((flame - altitude + Math.sin(nx * 41 + y * 1.7 - t * 5) * 0.065) * 2.2);
            pixel(x, y, rgb(255 * Math.pow(heat, 0.65), heat * heat * 230, Math.pow(heat, 6) * 100));
          }
        }
        for (let i = 0; i < 4; i++) {
          const rise = (t * (0.13 + seed(i) * 0.1) + seed(i + 8)) % 1;
          pixel(seed(i + 4) * (w - 1), (1 - rise) * (h - 1), rgb(190 * (1 - rise), 65 * (1 - rise), 0));
        }
        break;
      case 'rain':
        for (let x = 0; x < w; x++) {
          const tail = 3 + Math.floor(seed(x + 5) * 6);
          const head = (t * (3 + seed(x) * 5) + seed(x + 2) * (h + tail)) % (h + tail);
          for (let k = tail; k >= 0; k--) {
            const fade = Math.pow(1 - k / (tail + 1), 2);
            pixel(x, Math.floor(head) - k, k === 0 ? '#b8ffcc' : rgb(5 * fade, 180 * fade, 48 * fade));
          }
        }
        break;
      case 'meteors':
        for (let i = 0; i < Math.max(6, Math.floor(w * h / 24)); i++) {
          const glow = 20 + 65 * (0.5 + Math.sin(t * 1.3 + i * 2.4) * 0.5);
          pixel(seed(i + 3) * (w - 1), seed(i + 91) * (h - 1), rgb(glow * 0.5, glow * 0.7, glow));
        }
        for (let i = 0; i < 3; i++) {
          const phase = (t * (0.12 + i * 0.022) + i / 3) % 1;
          const headY = phase * (h + 10) - 5;
          const headX = seed(i + 14) * w * 0.55 + phase * w * 0.45;
          for (let k = 6; k >= 0; k--) pixel(headX - k * 0.45, headY - k, k === 0 ? '#dcfaff' : rgb(12, 150 * (1 - k / 7), 230 * (1 - k / 7)));
        }
        break;
      case 'fireworks':
        for (let i = 0; i < 3; i++) {
          const cycle = (t + i * 1.6) / 4.8;
          const age = (cycle - Math.floor(cycle)) * 4.8;
          const id = Math.floor(cycle) * 3 + i;
          const cx = (0.25 + seed(id + 10) * 0.5) * (w - 1);
          const cy = (0.23 + seed(id + 20) * 0.28) * (h - 1);
          const color = seed(id + 30) * 360;
          if (age < 1.2) {
            const y = h - 1 - (h - 1 - cy) * age / 1.2;
            pixel(cx, y + 1, '#7d3510');
            pixel(cx, y, '#ffe3a0');
          } else if (age < 3.4) {
            const burst = age - 1.2;
            for (let k = 0; k < 12; k++) {
              const angle = k / 12 * Math.PI * 2;
              for (let tail = 1; tail >= 0; tail--) {
                const dt = Math.max(0, burst - tail * 0.14);
                const radius = dt * Math.min(w, h) * 0.32;
                pixel(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius + dt * dt * 1.8, hue(color + k * 4, (1 - burst / 2.2) * (tail ? 20 : 60)));
              }
            }
          }
        }
        break;
      case 'heart': {
        const beat = t % 1.4;
        const large = beat < 0.18 || (beat > 0.33 && beat < 0.51);
        const rows = large
          ? ['00110001100', '01111011110', '11111111111', '11111111111', '01111111110', '00111111100', '00011111000', '00001110000', '00000100000']
          : ['001000100', '011101110', '111111111', '011111110', '001111100', '000111000', '000010000'];
        const scale = Math.max(1, Math.floor(Math.min(w / 13, h / 19)));
        sprite(rows, w / 2, h * 0.4, large ? '#ff3972' : '#bd1849', scale);
        const trace = [0, 0, 0, -1, 2, -3, 1, 0, 0, 0, 0, 0];
        for (let x = 0; x < w; x++) {
          const y = Math.round(h * 0.78) + trace[((x - motionPixel(t * 5,t,x+19)) % trace.length + trace.length) % trace.length];
          pixel(x, y, '#29a88f');
        }
        break;
      }
      case 'ripples': {
        const cx = (w - 1) * (0.5 + Math.sin(t * 0.35) * 0.16);
        const cy = (h - 1) * (0.48 + Math.cos(t * 0.27) * 0.13);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const distance = Math.hypot(x - cx, y - cy);
            const ring = Math.pow(0.5 + Math.sin(distance * 1.35 - t * 3) * 0.5, 4);
            pixel(x, y, hue(185 + distance * 6, 3 + ring * 43));
          }
        }
        break;
      }
      case 'snake': {
        const length = Math.max(12, Math.min(60, w * 2));
        const drawSmoothPixel = (x, y, color) => {
          const left = Math.floor(x), top = Math.floor(y);
          const fx = x - left, fy = y - top;
          paint.fillStyle = color;
          for (let dy = 0; dy <= 1; dy++) {
            for (let dx = 0; dx <= 1; dx++) {
              const px = left + dx, py = top + dy;
              if (px < 0 || py < 0 || px >= w || py >= h) continue;
              const weight = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
              if (weight < 0.01) continue;
              paint.globalAlpha = weight;
              paint.fillRect(px, py, 1, 1);
            }
          }
          paint.globalAlpha = 1;
        };
        for (let k = length; k >= 0; k--) {
          const phase = t * 0.8 - k * 0.075;
          const x = (w - 1) / 2 + Math.max(0, w - 3) / 2 * Math.sin(phase);
          const y = (h - 1) / 2 + Math.max(0, h - 3) / 2 * Math.sin(phase * 1.7 + 0.8);
          drawSmoothPixel(x, y, k === 0 ? '#efffff' : hue(k / length * 300 + t * 20, 14 + (1 - k / length) * 35));
        }
        break;
      }
      case 'lava': {
        const blobs = Array.from({ length: 4 }, (_, i) => ({
          x: 0.5 + Math.sin(t * 0.4 + i * 2.1) * 0.32,
          y: 1.3 - ((t * (0.055 + i * 0.009) + i * 0.34) % 1.6),
          radius: 0.16 + seed(i) * 0.08
        }));
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let field = 0;
            for (const blob of blobs) {
              const dx = (x + 0.5) / w - blob.x;
              const dy = ((y + 0.5) / h - blob.y) * 1.5;
              field += Math.exp(-(dx * dx + dy * dy) / (blob.radius * blob.radius));
            }
            const glow = clamp((field - 0.2) * 1.4);
            pixel(x, y, rgb(240 * glow, 100 * glow * glow, 40 * glow * (1 - glow)));
          }
        }
        break;
      }
      case 'jellyfish': {
        const scale = Math.max(1, Math.floor(Math.min(w / 13, h / 23)));
        const cx = w / 2 + Math.sin(t * 0.65) * Math.max(0, (w - 10 * scale) / 2);
        const cy = h * 0.32 + Math.sin(t * 0.9) * Math.max(1, h * 0.06);
        for (let arm = -1; arm <= 1; arm++) {
          for (let k = 0; k < 8 * scale; k++) {
            const sway = Math.sin(t * 2 - k * 0.5 + arm) * (0.5 + k / (8 * scale)) * scale;
            pixel(cx + arm * 2 * scale + sway, Math.floor(cy + 2 * scale) + k, hue(185 + k * 5, 45 - k / scale * 3));
          }
        }
        sprite(['000111000', '001111100', '011111110', '111111111', '011111110'], cx, cy, '#2886c9', scale);
        pixel(cx - 2 * scale, cy, '#b3fcff');
        pixel(cx + 2 * scale, cy, '#b3fcff');
        for (let i = 0; i < 4; i++) pixel(seed(i + 51) * (w - 1), (1 - ((t * 0.09 + i * 0.27) % 1)) * (h - 1), '#123f57');
        break;
      }

      case 'aurora':
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const nx = x / Math.max(1, w - 1), ny = y / h;
          const curtain = 0.32 + Math.sin(nx * 5 + t * 0.6) * 0.18 + Math.sin(nx * 11 - t * 0.4) * 0.09;
          const glow = Math.exp(-Math.pow((ny - curtain) * 7, 2)) * (0.7 + Math.sin(nx * 20 + t) * 0.3);
          pixel(x, y, rgb(12 + glow * 35, 7 + glow * 170, 22 + glow * 130));
        }
        for (let i = 0; i < 9; i++) pixel(seed(i + 8) * (w - 1), seed(i + 30) * h * 0.3, '#698c92');
        break;
      case 'snow':
        for (let y = 0; y < h; y++) { paint.fillStyle = rgb(4 + y / h * 5, 11 + y / h * 10, 23 + y / h * 18); paint.fillRect(0, y, w, 1); }
        for (let i = 0; i < Math.max(12, Math.floor(w * h / 14)); i++) {
          const y = (t * (1.1 + seed(i) * 2.6) + seed(i + 70) * (h + 2)) % (h + 2) - 1;
          const x = (seed(i + 40) * w + Math.sin(t * 0.7 + i) * 1.6 + w) % w;
          pixel(x, y, i % 3 === 0 ? '#f1fcff' : '#769fb6');
        }
        for (let x = 0; x < w; x++) { const height = 1 + Math.round((Math.sin(x * 0.6) + 1) * Math.max(1, h * 0.035)); paint.fillStyle = '#9bb9c8'; paint.fillRect(x, h - height, 1, height); }
        break;
      case 'sunset': {
        const horizon = Math.floor(h * 0.55), sunX = motionPixel((w - 1) / 2,t,20), sunY = motionPixel(h * (0.29 + Math.sin(t * 0.15) * 0.03),t,21), radius = Math.max(1, w * 0.24);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (y < horizon) {
            const fade = y / Math.max(1, horizon);
            pixel(x, y, rgb(34 + 106 * fade, 17 + 27 * fade, 60 - 18 * fade));
            if (Math.hypot(x - sunX, y - sunY) < radius) pixel(x, y, '#ffbd67');
          } else {
            const depth = (y - horizon) / Math.max(1, h - horizon), shimmer = Math.sin(x * 1.8 + y * 0.8 - t * 2) * 0.5 + 0.5;
            const reflection = Math.abs(x - sunX) < (0.08 + depth * 0.32) * w && shimmer > 0.43;
            pixel(x, y, reflection ? rgb(175 * (1 - depth * 0.4), 75 * (1 - depth * 0.4), 62) : rgb(12, 27 + shimmer * 10, 45 + shimmer * 22));
          }
        }
        break;
      }
      case 'bubbles':
        for (let i = 0; i < 6; i++) {
          const phase = (t * (0.07 + seed(i) * 0.07) + i / 6) % 1, cy = h + 3 - phase * (h + 7);
          const cx = (0.15 + seed(i + 5) * 0.7) * (w - 1) + Math.sin(t + i) * 1.2, radius = 1.2 + seed(i + 12) * Math.max(1, w * 0.18);
          for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
            if (Math.abs(Math.hypot(x - cx, y - cy) - radius) < 0.55) pixel(x, y, hue(170 + i * 15, 25 + phase * 20));
          }
          pixel(cx - radius * 0.35, cy - radius * 0.6, '#a6eee5');
        }
        break;
      case 'butterfly': {
        const cy = (h - 1) * 0.44 + Math.sin(t * 1.3), cx = (w - 1) / 2, spread = 0.4 + Math.abs(Math.sin(t * 2.5)) * 0.6;
        const wingW = Math.max(2, Math.floor(w * 0.4 * spread)), wingH = Math.max(3, Math.floor(h * 0.22));
        for (let dy = -wingH; dy <= wingH; dy++) {
          const wingShape = dy < 0 ? 1 - Math.abs(dy + wingH * 0.48) / wingH : 0.74 - Math.abs(dy - wingH * 0.42) / wingH;
          for (let dx = 1; dx <= Math.max(0, Math.round(wingW * wingShape)); dx++) {
            const c = hue(20 + dy * 12 + dx * 20 + t * 18, dx === 1 ? 30 : 49);
            pixel(cx - dx, cy + dy, c); pixel(cx + dx, cy + dy, c);
          }
        }
        for (let dy = -wingH + 1; dy < wingH; dy++) pixel(cx, cy + dy, '#eccda0');
        pixel(cx - 1, cy - wingH, '#b39b78'); pixel(cx + 1, cy - wingH, '#b39b78');
        for (let i = 0; i < 4; i++) pixel(seed(i + 51) * (w - 1), h * 0.8 + Math.sin(t + i) * 2, hue(60 + i * 30, 25));
        break;
      }
      case 'invaders': {
        const design = Math.floor(t * 2) % 2 ? ['0010100','0111110','1101011','1111111','0100010','1010101'] : ['0010100','0111110','1101011','1111111','0010100','0100010'];
        const shift = Math.round(Math.sin(t * 1.2) * Math.max(1, (w - 9) / 2));
        for (let i = 0; i < Math.max(1, Math.floor(h / 9)); i++) sprite(design, w / 2 + (i % 2 ? -shift : shift), 5 + i * 9, hue(100 + i * 80, 48));
        for (let i = 0; i < 3; i++) pixel(seed(i + 90) * (w - 1), h - 1 - ((t * 8 + i * 9) % h), '#ffe3a1');
        break;
      }
      case 'pacman': {
        const size = Math.max(1, Math.floor(Math.min(w / 6, h / 8))), laneY = [Math.floor(h * 0.3), Math.floor(h * 0.72)];
        laneY.forEach((cy, lane) => {
          const direction = lane === 0 ? 1 : -1, progress = (t * 3.2) % (w + 10 * size);
          const cx = direction === 1 ? progress - 5 * size : w + 5 * size - progress;
          for (let x = 1; x < w; x += 3) if ((x - cx) * direction > 2 * size) pixel(x, cy, '#887850');
          const mouth = Math.floor(t * 5) % 2 ? ['01110','11100','11000','11100','01110'] : ['01110','11111','11110','11111','01110'];
          sprite(direction === 1 ? mouth : mouth.map(row => row.split('').reverse().join('')), cx, cy, '#ffd64b', size);
          sprite(['01110','11111','10101','11111','10101'], cx - direction * 7 * size, cy, lane ? '#75d2e1' : '#f08399', size);
        });
        break;
      }
      case 'hourglass': {
        const left = Math.max(0, Math.floor(w * 0.16)), right = w - 1 - left, top = Math.max(1, Math.floor(h * 0.09)), bottom = h - 1 - top;
        const middle = (top + bottom) / 2, center = (w - 1) / 2, phase = (t * 0.16) % 1;
        for (let y = top; y <= bottom; y++) {
          const width = Math.max(0.5, Math.abs(y - middle) / Math.max(1, middle - top) * (right - left) / 2);
          pixel(center - width, y, '#638b82'); pixel(center + width, y, '#638b82');
          for (let x = Math.ceil(center - width + 1); x <= Math.floor(center + width - 1); x++) {
            const upper = y < middle && (y - top) / Math.max(1, middle - top) > phase, lower = y > middle && (bottom - y) / Math.max(1, bottom - middle) < phase;
            if (upper || lower) pixel(x, y, hue(35 + seed(x + y * w) * 10, 40 + seed(y) * 13));
          }
        }
        for (let x = left; x <= right; x++) { pixel(x, top, '#c4a573'); pixel(x, bottom, '#c4a573'); }
        for (let y = Math.floor(middle); y < bottom - phase * (bottom - middle); y++) if ((y + Math.floor(t * 10)) % 3 !== 0) pixel(center, y, '#fbd480');
        break;
      }
      case 'galaxy':
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const nx = (x - (w - 1) / 2) / Math.max(1, w * 0.5), ny = (y - (h - 1) / 2) / Math.max(1, w * 0.5), radius = Math.hypot(nx, ny);
          const arm = Math.pow(0.5 + Math.sin(Math.atan2(ny, nx) * 3 - radius * 6 + t * 0.85) * 0.5, 3), glow = arm * Math.exp(-radius * 1.3);
          pixel(x, y, rgb(22 * glow + 100 * Math.exp(-radius * 5), 80 * glow, 230 * glow));
        }
        for (let i = 0; i < 10; i++) { const glow = 30 + 100 * (0.5 + Math.sin(t + i * 3) * 0.5); pixel(seed(i + 91) * (w - 1), seed(i + 75) * (h - 1), rgb(glow, glow, glow)); }
        break;
      case 'checker': {
        const size = Math.max(2, Math.floor(w / 4)), scroll = motionPixel(t * 2,t,22), light = 28 + Math.sin(t * 2) * 12;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pixel(x, y, (Math.floor((x + scroll) / size) + Math.floor((y + scroll) / size)) % 2 ? hue(165 + t * 20, light) : '#10241d');
        break;
      }
      case 'equalizer': {
        const bars = Math.max(1, Math.floor(w / 3)), barW = Math.max(1, Math.floor(w / bars));
        for (let i = 0; i < bars; i++) {
          const value = 0.24 + (Math.sin(t * 2.7 + i * 1.7) * 0.5 + 0.5) * 0.43 + (Math.sin(t * 4.1 - i) * 0.5 + 0.5) * 0.25, height = Math.max(1, Math.floor(value * h));
          for (let y = h - height; y < h; y++) for (let dx = 0; dx < Math.max(1, barW - 1); dx++) pixel(i * barW + dx, y, hue(145 - (1 - y / h) * 130, 42));
          for (let dx = 0; dx < Math.max(1, barW - 1); dx++) pixel(i * barW + dx, Math.max(0, h - height - 2), '#f2f0ac');
        }
        break;
      }
      case 'bloom': {
        const cx = (w - 1) / 2, cy = (h - 1) * 0.38, opening = 0.65 + Math.sin(t * 0.9) * 0.35, radius = Math.max(1, Math.min(w * 0.33, h * 0.18));
        for (let y = Math.round(cy); y < h - 2; y++) pixel(cx, y, '#4baf77');
        sprite(['10000','11000','01100','00111','00010'], cx, h * 0.76, '#39996c');
        for (let i = 0; i < 6; i++) {
          const angle = i / 6 * Math.PI * 2 + Math.sin(t * 0.45) * 0.1, px = cx + Math.cos(angle) * radius * opening, py = cy + Math.sin(angle) * radius * opening, petal = Math.max(1, radius * 0.62);
          for (let dy = -Math.ceil(petal); dy <= petal; dy++) for (let dx = -Math.ceil(petal); dx <= petal; dx++) if (dx * dx + dy * dy <= petal * petal) pixel(px + dx, py + dy, hue(325 + i * 6 + Math.sin(t * 0.3) * 24, 42 + i * 2));
        }
        sprite(['010','111','010'], cx, cy, '#ffe291');
        break;
      }

      case 'koi': {
        for (let y=0;y<h;y++) for(let x=0;x<w;x++) pixel(x,y,rgb(3,14+Math.sin(x*.6+y*.4-t)*5,20));
        const fish=['00100','01110','11111','11111','11111','01110','00100','01010','10001'];
        for(let i=0;i<2;i++){
          const cy=(t*(i?1.6:2.1)+i*h*.55)%(h+10)-5,cx=(w-1)*(.3+i*.4)+Math.sin(t*.8+i)*1.2;
          fish.forEach((row,y)=>{for(let x=0;x<5;x++)if(row[x]==='1')pixel(cx+x-2,cy+y-4,(y<3||(x+y+i)%4===0)?'#ef7b32':'#dfd8b7');});
          pixel(cx,cy-3,'#382719');
        }
        break;
      }
      case 'lanterns':
        for(let i=0;i<8;i++)pixel(seed(i+71)*(w-1),seed(i+19)*(h-1),'#292b35');
        for(let i=0;i<4;i++){
          const rise=(t*(.035+seed(i)*.025)+i*.27)%1,cy=h+4-rise*(h+9),cx=(.2+seed(i+31)*.6)*(w-1)+Math.sin(t*.5+i);
          sprite(['01110','11111','11111','11111','01110'],cx,cy,hue(23+i*6,38+Math.sin(t*1.5+i)*5));
          pixel(cx,cy,'#ffd691');pixel(cx,cy+3,'#d76e34');
        }
        break;
      case 'city': {
        for(let x=0;x<w;x++){
          const building=Math.floor(x/3),roof=Math.floor(h*(.34+seed(building+8)*.3));
          for(let y=roof;y<h;y++)pixel(x,y,x%3===2?'#071119':'#102434');
          if(x%3!==2)for(let y=roof+2;y<h;y+=3)if(seed(building*19+y+Math.floor(t*.2))>.35)pixel(x,y,hue(180+building*35,28));
        }
        for(let i=0;i<7;i++){const y=(t*7+i*4)%h,x=seed(i+80)*(w-1);pixel(x,y,'#39809c');pixel(x,y-1,'#1d4155');}
        break;
      }
      case 'mountains':
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          let c=rgb(35+y/h*35,70+y/h*50,95+y/h*35);
          if(y>h*.45+Math.sin(x/w*5+1)*h*.12)c='#516b80';
          if(y>h*.64+Math.sin(x/w*7)*h*.12)c='#315b62';
          if(y>h*.82+Math.sin(x/w*6+2)*h*.08)c='#1b443c';
          pixel(x,y,c);
        }
        for(let i=0;i<3;i++){const x=(t*.6+i*w*.6)%(w+7)-3; sprite(['011100','111111'],x,h*(.15+i*.08),'#c0d8cf');}
        break;
      case 'rocket': {
        for(let i=0;i<12;i++)pixel(seed(i+50)*(w-1),(seed(i+9)*h+t*(1+seed(i)*3))%h,i%3?'#3c536e':'#a0c5c9');
        const cx=w/2+Math.sin(t*.8)*Math.max(1,w*.1),cy=h*.45+Math.sin(t*1.3);
        sprite(['00100','01110','01110','01110','11111','10101'],cx,cy,'#dce5e2');
        pixel(cx,cy-1,'#50add0');
        for(let k=0;k<3+Math.floor((Math.sin(t*13)+1)*1.5);k++)pixel(cx,cy+3+k,k<2?'#ffcf70':'#db5a39');
        break;
      }
      case 'fish':
        for(let i=0;i<4;i++){
          const direction=i%2?1:-1,phase=(t*(2+seed(i))+i*7)%(w+10),cx=direction>0?phase-5:w+5-phase,cy=(i+.5)*h/4+Math.sin(t+i)*.7;
          const rows=['001100','111110','001100'],fish=direction<0?rows.map(row=>row.split('').reverse().join('')):rows;
          sprite(fish,cx,cy,hue(i*85+t*8,47));
          pixel(cx+direction,cy,'#172a29');
        }
        for(let x=0;x<w;x+=4)for(let k=0;k<4;k++)pixel(x+Math.sin(t+k*.7)*.5,h-1-k,'#26735e');
        break;
      case 'cat': {
        const cx=w/2,cy=h*.4,bob=Math.round(Math.sin(t*1.3)*.6);
        sprite(['110000011','111000111','111111111','111111111','111111111','011111110','001111100'],cx,cy+bob,'#b18b70');
        const blink=t%4.8>4.4;
        pixel(cx-2,cy-1+bob,blink?'#493d39':'#b7e098');pixel(cx+2,cy-1+bob,blink?'#493d39':'#b7e098');
        pixel(cx,cy+1+bob,'#f0b2a4');
        sprite(['01110','11111','11111','11011'],cx,cy+6,'#8c705f');
        for(let k=0;k<5;k++)pixel(cx+3+Math.sin(t*1.5+k*.5),cy+7-k,'#b18b70');
        break;
      }
      case 'candle': {
        const left=Math.floor(w*.35),right=Math.ceil(w*.65),top=Math.floor(h*.48);
        for(let y=top;y<h-2;y++)for(let x=left;x<right;x++)pixel(x,y,rgb(165+(x-left)*9,129+(x-left)*5,83));
        const cx=(w-1)/2+Math.sin(t*4)*.9,cy=top-4;
        sprite(['00100','01100','01110','11111','01110'],cx,cy,rgb(230+Math.sin(t*5)*14,128+Math.sin(t*3)*14,39));
        sprite(['010','111','010'],cx,cy+1,'#ffd780');pixel(cx,top-1,'#35281c');
        break;
      }
      case 'waterfall':
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          const band=Math.sin(x*1.6)*.5+.5,fall=Math.sin(y*.8-t*5+x)*.5+.5,foam=y>h*.8?(Math.sin(x*1.7+t*2+y)*.5+.5)*.6:0;
          pixel(x,y,rgb(9+(fall*band+foam)*75,28+(fall*band+foam)*125,50+(fall*band+foam)*145));
        }
        break;
      case 'orbit': {
        const cx=(w-1)/2,cy=(h-1)/2,r=Math.max(1,w*.23);
        for(let i=0;i<8;i++)pixel(seed(i+61)*(w-1),seed(i+83)*(h-1),'#4a5964');
        for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Math.hypot(x-cx,y-cy)<r)pixel(x,y,hue(18+y*3,30+Math.sin(y*1.4)*8));
        for(let k=0;k<36;k++){const a=k/36*Math.PI*2;pixel(cx+Math.cos(a)*w*.42,cy+Math.sin(a)*w*.16,'#ad9471');}
        pixel(cx+Math.cos(t*.9)*w*.42,cy+Math.sin(t*.9)*h*.37,'#a7e1e8');
        break;
      }
      case 'dna':
        for(let y=0;y<h;y++){
          const phase=y*.48-t*1.8,left=(w-1)/2+Math.sin(phase)*w*.32,right=(w-1)/2-Math.sin(phase)*w*.32;
          if(y%3===0)for(let x=Math.round(Math.min(left,right));x<=Math.round(Math.max(left,right));x++)pixel(x,y,'#243f4b');
          pixel(left,y,'#44cdbc');pixel(right,y,'#eb7697');
        }
        break;
      case 'tunnel':
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          const dx=Math.abs(x-(w-1)/2),dy=Math.abs(y-(h-1)/2)*w/h,depth=Math.max(dx,dy),phase=depth-t*1.3;
          const glow=.5+Math.sin(phase*2)*.5;
          pixel(x,y,hue(depth*28+t*24,8+glow*32));
        }
        break;
      default: return false;
    }
    return true;
  }
const entries=new Map();
function register(definition){
 if(!definition||typeof definition.id!=='string'||!/^[a-z][a-z0-9_]*$/.test(definition.id)||typeof definition.draw!=='function')throw new TypeError('Invalid animation definition');
 if(entries.has(definition.id))throw new Error('Animation already registered: '+definition.id);
 entries.set(definition.id,Object.freeze({...definition}));
}
for(const id of ["pocket_shy_blink","pocket_strawberry","pocket_starwhale","pocket_windbell","pocket_brave_steps","pocket_star_dumpling","pocket_fox","pocket_capybara","pocket_owl","pocket_axolotl","pocket_snail","pocket_bees","pocket_ferris","pocket_cablecar","pocket_windmill","pocket_telescope","pocket_submarine","pocket_castle","pocket_mushrooms","pocket_pumpkin","pocket_gyroscope","pocket_circuit"])register({id,group:'pocket',nativeWidth:15,nativeHeight:27,draw:drawPocketScenes});
for(const id of ["portrait_fireflies","portrait_balloon","portrait_penguin","portrait_bamboo","portrait_sakura","portrait_whale","portrait_portal","portrait_coffee","portrait_prism","portrait_dancer","portrait_rose","portrait_moonrabbit"])register({id,group:'portrait',nativeWidth:15,nativeHeight:27,draw:drawPortraitScenes});
for(const id of ["scene_cafe","scene_jellies","scene_train","scene_camp","scene_seasons","scene_gears"])register({id,group:'scene',nativeWidth:15,nativeHeight:27,draw:drawStoryScene});
for(const id of ["hand_echo","hand_ironman","hand_kiriko","hand_lava","hand_mario","hand_mariorun","hand_tree","hand_rocket","hand_rog","hand_t1"])register({id,group:'handmade',draw:(mode,time,paint,size)=>{paint.fillStyle='#000000';paint.fillRect(0,0,size.w,size.h);paint.imageSmoothingEnabled=false;return drawHandmadeAnimation(mode,time,paint,size);}});
for(const id of ["tiny_train","rainy_umbrella","moon_lighthouse","little_vinyl","paper_flight","tiny_greenhouse"])register({id,group:'small-scene',draw:(mode,time,paint,size)=>{paint.fillStyle='#000000';paint.fillRect(0,0,size.w,size.h);paint.imageSmoothingEnabled=false;return drawNewScenes(mode,time,paint,size);}});
for(const id of ["rainbow","fire","rain","meteors","fireworks","heart","ripples","snake","lava","jellyfish","aurora","snow","sunset","bubbles","butterfly","invaders","pacman","hourglass","galaxy","checker","equalizer","bloom","koi","lanterns","city","mountains","rocket","fish","cat","candle","waterfall","orbit","dna","tunnel"])register({id,group:'classic',draw:drawClassicAnimation});
register({id:'wave',group:'classic',draw:(mode,time,paint,{w,h})=>{
  paint.fillStyle='#000000';paint.fillRect(0,0,w,h);
  paint.fillStyle='#ffdd57';
  for(let x=0;x<w;x++){
    const wave=Math.sin((x/Math.max(1,w))*Math.PI*6+time*2)*0.45+0.55;
    paint.fillRect(x,Math.round(wave*(h-1)),1,1);
  }
  return true;
}});
register({id:'clock',group:'information',draw:(mode,time,paint,size,options)=>{clock.draw(paint,size,options.date,options.clockFont,options.clockPalette);return true;}});
for(const id of Object.keys(temperature.modes))register({id,group:'information',draw:(mode,time,paint,size,options)=>temperature.draw(paint,size,mode,options.temperatureSample,options.thermal||{})});
for(const design of designs)register(design);
function dimensions(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>65536)throw new RangeError('Invalid animation dimensions');
 return {w:width,h:height};
}
function draw(paint,options){
 const {mode,time=0,width,height}=options;
 const entry=entries.get(mode);if(!entry)return false;
 const size=dimensions(width,height);if(!Number.isFinite(time))throw new TypeError('Invalid animation time');
 return entry.draw(mode,time,paint,size,options);
}
function render(options){
 const size=dimensions(options.width,options.height),canvas=createCanvas();canvas.width=size.w;canvas.height=size.h;
 if(!draw(canvas.getContext('2d'),options))throw new Error('Unknown animation: '+options.mode);
 const rgba=canvas.getContext('2d').getImageData().data,rgb=new Uint8Array(size.w*size.h*3);
 for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2];}return rgb;
}
return Object.freeze({register,draw,render,has:mode=>entries.has(mode),list:()=>Array.from(entries.values(),({draw,...metadata})=>metadata)});
});
