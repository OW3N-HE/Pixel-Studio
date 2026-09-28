'use strict';
// Builds an isolated, sanitized test source tree. Does not publish or mark it reviewed.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const version = require('../desktop/package.json').version;
const targetName = process.argv[2] || `installer-test-${version}`;
if (!/^[a-zA-Z0-9.-]+$/.test(targetName)) throw new Error('Invalid staging directory name');
const out = path.join(root, 'release-staging', targetName);
if (fs.existsSync(out)) throw new Error('Test staging already exists; refusing to overwrite.');
const acorn = require(require.resolve('acorn', {paths: [path.join(root, 'firmware/wled-usb-pixel')]}));
const blocked = name => /^hand_/.test(name) || ['pocket_chii_blush','pocket_chiikawa_ref','pocket_chiikawa','invaders','pacman'].includes(name);
function sanitize(source) {
  const edits = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.id.name === 'handmadeSource') {
      edits.push([node.init.start, node.init.end, '{}']); return;
    }
    if (node.type === 'FunctionDeclaration' && node.id.name === 'drawHandmadeAnimation') {
      edits.push([node.start, node.end, 'function drawHandmadeAnimation() {}']); return;
    }
    if (node.type === 'ObjectExpression' && node.properties.some(p => blocked(p.key?.name || p.key?.value || ''))) {
      edits.push([node.start, node.end, '{' + node.properties.filter(p => !blocked(p.key?.name || p.key?.value || '')).map(p => source.slice(p.start,p.end)).join(',\n') + '}']); return;
    }
    if (node.type === 'SwitchCase' && blocked(node.test?.value || '')) { edits.push([node.start,node.end,'']); return; }
    if (node.type === 'IfStatement' && node.test.type === 'BinaryExpression' && node.test.left?.name === 'mode' && blocked(node.test.right?.value || '')) {
      if (node.alternate) throw new Error('Unexpected excluded animation else branch');
      edits.push([node.start,node.end,'']); return;
    }
    for (const [key,value] of Object.entries(node)) {
      if (key === 'start' || key === 'end') continue;
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(acorn.parse(source, {ecmaVersion:'latest'}));
  for (const [a,b,value] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,a)+value+source.slice(b);
  return source;
}
const files = ['index.html','pixel-circuit-palette.cjs','pixel-ddp-bridge.cjs','pixel-headless-renderer.cjs','pixel-stream-worker.cjs','pixel-studio-web-language.js','pixel-studio-web-palettes.js','pixel-studio-web-ui.css','pixel-studio-web-ui.js','Start-Pixel-DDP.cmd','Start-Pixel-DDP.ps1','Start-Pixel-Studio.cmd','openrgb-plugin/Build-Plugin.ps1','openrgb-plugin/CMakeLists.txt','openrgb-plugin/plugin.json','openrgb-plugin/pixel-studio-host.cjs','openrgb-plugin/THIRD-PARTY.md','openrgb-plugin/NATIVE-USB.md'];
for (const dir of ['openrgb-plugin/src','openrgb-plugin/compat']) {
  for (const name of fs.readdirSync(path.join(root,dir))) if (/\.(cpp|h)$/.test(name)) files.push(dir+'/'+name);
}
for (const file of files) {
  let content = fs.readFileSync(path.join(root,file),'utf8');
  if (file === 'index.html') {
    content = content.replace(/<option\b([^>]*)>[\s\S]*?<\/option>/g, (all,attrs) => blocked(/value="([^"]+)"/.exec(attrs)?.[1] || '') ? '' : all);
    content = content.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g, (all,start,code,end) => code.trim() ? start+sanitize(code)+end : all);
  }
  content = content.replace(/192\.168\.31\.(?:119|29)/g,'192.168.1.100');
  if (file === 'openrgb-plugin/CMakeLists.txt') content = content.replace('PIXEL_STUDIO_PROJECT_ROOT="${PIXEL_STUDIO_PROJECT_ROOT}"','PIXEL_STUDIO_PROJECT_ROOT=""');
  const target = path.join(out,'app',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,content);
}
fs.copyFileSync(path.join(root,'release-staging/public-source/LICENSE'),path.join(out,'LICENSE'));
fs.copyFileSync(path.join(out,'LICENSE'),path.join(out,'app/LICENSE'));
fs.copyFileSync(path.join(__dirname,'GETTING-STARTED.html'),path.join(out,'app/GETTING-STARTED.html'));
console.log('Prepared isolated TEST sources: '+out);
