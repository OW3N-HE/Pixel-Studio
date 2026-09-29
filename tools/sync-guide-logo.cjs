'use strict';

// Explicit maintenance command. The application's runtime SVG is authoritative.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const match = source.match(/outerHTML = `(<svg class="brand-mark"[\s\S]*?<\/svg>)`/);
if (!match) throw new Error('Runtime application logo not found; guide unchanged.');
const svg = match[1]
  .replace('class="brand-mark"', 'xmlns="http://www.w3.org/2000/svg"')
  .replace('class="logo-halo"', 'fill="none" stroke="#83d5f2"')
  .replace('class="logo-back"', 'fill="#0c161d"')
  .replace('class="logo-tile"', 'fill="#83d5f2"')
  .replace('class="logo-center"', 'fill="#12212b"')
  .replace('class="logo-white"', 'fill="#ffffff"');
if (/class="logo-/.test(svg)) throw new Error('Unmapped logo styling; guide unchanged.');
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
console.log('Updated guide header and favicon from the application runtime SVG.');
