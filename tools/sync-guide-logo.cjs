'use strict';

// Explicit maintenance command. Copy geometry, never redesign the approved mark.
const fs = require('node:fs');
const path = require('node:path');
const {themes,brandTheme,iconViewport} = require('../desktop/icons.cjs');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const match = source.match(/(<svg class="brand-mark"[\s\S]*?<\/svg>)/);
if (!match) throw new Error('Runtime application logo not found; guide unchanged.');
function palette(theme) {
  const [accent,back,center,tile,highlight,shadow] = themes[theme];
  return '.logo-halo{fill:none;stroke:#'+accent+'}.logo-halo>rect:last-child{fill:#'+back+'}.logo-back{fill:#'+back+'}.logo-tile{fill:#'+tile+'}.logo-center{fill:#'+center+'}.logo-white{fill:#fff}.logo-tile>rect:nth-child(-n+3){fill:#'+highlight+'}.logo-tile>rect:is(:nth-child(7),:nth-child(8)){fill:#'+shadow+'}';
}
const viewport = iconViewport();
const svg = match[1]
  .replace('class="brand-mark"', 'xmlns="http://www.w3.org/2000/svg"')
  .replace(/viewBox="[^"]*"/, 'viewBox="'+[viewport.start,viewport.start,viewport.size,viewport.size].join(' ')+'"')
  .replace(/>/, '><style>'+palette(brandTheme)+'</style>');
const roles = new Set(['logo-halo','logo-back','logo-tile','logo-center','logo-white']);
if ([...svg.matchAll(/class="([^"]+)"/g)].some(([,role])=>!roles.has(role))) {
  throw new Error('Unmapped logo styling; guide unchanged.');
}
const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
const guidePath = path.join(root, 'installer', 'GETTING-STARTED.html');
let guide = fs.readFileSync(guidePath, 'utf8');
const favicon = /<link rel="icon"[^>]*>/g;
const brand = /(<div class="brand">)<img\b[^>]*>/g;
if ([...guide.matchAll(favicon)].length !== 1 || [...guide.matchAll(brand)].length !== 1) {
  throw new Error('Guide logo targets changed; guide unchanged.');
}
guide = guide.replace(favicon, `<link rel="icon" type="image/svg+xml" href="${uri}">`)
  .replace(brand, `$1<img src="${uri}" width="44" height="44" alt="" aria-hidden="true">`);
fs.writeFileSync(guidePath, guide, 'utf8');
console.log('Updated guide header and favicon from the runtime geometry and fixed blue palette.');
