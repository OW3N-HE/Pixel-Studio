'use strict';
// DOM stand-ins only: no browser, network, installer or user configuration.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const source = fs.readFileSync(path.join(__dirname, '..', 'pixel-studio-web-ui.js'), 'utf8');
const names = new Set(['selectReleaseNotes', 'appendReleaseInline', 'renderReleaseNotes', 'resolutionHint']);
const functions = new Map();
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && names.has(node.id.name)) {
    functions.set(node.id.name, source.slice(node.start, node.end));
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(acorn.parse(source, {ecmaVersion:'latest'}));
assert.equal(functions.size, names.size);
class Element {
  constructor(name) { this.localName = name; this.children = []; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  set textContent(text) { this.children = [{textContent:String(text)}]; }
  get textContent() { return this.children.map(node => node.textContent).join(''); }
  set innerHTML(_value) { throw new Error('Remote notes must not use innerHTML'); }
}
const context = vm.createContext({URL, document:{
  createElement: name => new Element(name),
  createTextNode: text => ({textContent:String(text)})
}});
vm.runInContext([...functions.values()].join('\n'), context);
const select = (text, english) => context.selectReleaseNotes(text, english);
const notes = [
  '# Pixel Studio V0.2.0',
  '## 简体中文',
  '- 预览持续播放',
  '```text',
  '## English',
  'This heading is code, not a language boundary.',
  '```',
  '## English',
  '- Continuous preview',
  '1. **Read notes** before `installing`.',
  '## Shared links',
  '[Release](https://github.com/OW3N-HE/Pixel-Studio/releases)'
].join('\n');
assert(select(notes, true).includes('Continuous preview'));
assert(!select(notes, true).includes('预览持续播放'));
assert(!select(notes, true).includes('This heading is code'));
assert(select(notes, false).includes('This heading is code'));
assert(!select(notes, false).includes('Continuous preview'));
assert(select(notes, true).includes('Shared links'));
assert(select(notes, false).includes('Shared links'));
assert.equal(select('Unlabelled notes', false), 'Unlabelled notes');
assert.equal(select('## 简体中文\nOnly one language', true), '## 简体中文\nOnly one language');
const container = new Element('div');
const flatten = node => [node, ...(node.children || []).flatMap(flatten)];
context.renderReleaseNotes(container, notes, true);
let nodes = flatten(container);
for (const tag of ['h3', 'h4', 'ul', 'ol', 'li', 'strong', 'code', 'a']) {
  assert(nodes.some(node => node.localName === tag), 'Missing safe Markdown element: ' + tag);
}
const link = nodes.find(node => node.localName === 'a');
assert.equal(link.rel, 'noopener noreferrer');
assert.equal(link.target, '_blank');
const first = container.children[0];
context.renderReleaseNotes(container, notes, true);
assert.equal(container.children[0], first, 'Progress updates must not rebuild unchanged notes');
context.renderReleaseNotes(container, notes, false);
assert(container.textContent.includes('预览持续播放'));
assert(!container.textContent.includes('Continuous preview'));
assert(flatten(container).some(node => node.localName === 'pre'));
const hostile = '<img src=x onerror=alert(1)>\n<script>alert(1)</script>\n\n'
  + '[Unsafe](javascript:alert%281%29) [Local](file:///C:/private) [Credentials](https://user:pass@example.com/)';
context.renderReleaseNotes(container, hostile, true);
nodes = flatten(container);
assert(!nodes.some(node => ['img', 'script', 'iframe', 'a'].includes(node.localName)));
assert(container.textContent.includes('<script>'), 'Untrusted HTML must remain literal text');
const long = '## English\n' + 'Complete notes. '.repeat(1000) + '\nEND-OF-NOTES';
context.renderReleaseNotes(container, long, true);
assert(container.textContent.endsWith('END-OF-NOTES'));
assert(!/release\.body\.slice\(/.test(source), 'Do not truncate fetched release notes');
const limits = {maxAxis:512, maxPixels:4096}, frame = {w:15, h:27};
for (const english of [false, true]) {
  const normal = context.resolutionHint(limits, frame, false, english);
  const invalid = context.resolutionHint(limits, frame, true, english);
  assert(normal.includes('512') && normal.includes('4096'));
  assert(invalid.includes('15') && invalid.includes('27'));
  assert(!invalid.includes('4096'), 'Invalid hint replaces, rather than follows, the normal limits');
  assert(!/[\r\n]/.test(normal + invalid), 'Dimension hint remains on one line');
}
console.log('PASS: bilingual selection, code fences, safe Markdown, unchanged-content cache, complete long notes and inline dimension hints. No real UI tested.');
