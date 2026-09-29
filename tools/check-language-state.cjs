'use strict';
// Pure in-memory regression checks. No browser, device, network, or user profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const languageSource = fs.readFileSync(path.join(root, 'pixel-studio-web-language.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'pixel-studio-web-ui.js'), 'utf8');
const acorn = require(require.resolve('acorn', { paths: [path.join(root, 'firmware/wled-usb-pixel')] }));
const functions = new Map();
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration') functions.set(node.id.name, uiSource.slice(node.start, node.end));
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(acorn.parse(uiSource, { ecmaVersion: 'latest' }));
class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, listener) { const values = this.listeners.get(name) || []; values.push(listener); this.listeners.set(name, values); }
  dispatchEvent(event) { for (const listener of this.listeners.get(event.type) || []) listener(event); }
}
class Element extends Target {
  constructor(owned = false) { super(); this.owned = owned; this.attrs = new Map(); this.value = ''; }
  closest() { return this.owned ? this : null; }
  hasAttribute(key) { return this.attrs.has(key); }
  getAttribute(key) { return this.attrs.get(key); }
  setAttribute(key, value) { this.attrs.set(key, value); }
}
function scenario(saved, desktop, systemLanguage = 'zh-CN') {
  const select = new Element(), regular = new Element(), owned = new Element(true);
  regular.setAttribute('title', '打开设置'); owned.setAttribute('title', '关闭设置');
  const nodes = [{ nodeValue: '检查连接：草莓小盆栽', parentElement: regular }, { nodeValue: '软件更新', parentElement: owned }];
  const document = new Target();
  Object.assign(document, { documentElement: Object.assign(new Element(), { lang: 'zh-CN' }), title: '', body: {}, readyState: 'loading',
    getElementById: id => id === 'webLanguage' ? select : null,
    querySelectorAll: () => [regular, owned],
    createTreeWalker: () => { let index = -1; return { nextNode() { return ++index < nodes.length; }, get currentNode() { return nodes[index]; } }; }
  });
  const window = new Target(); if (desktop) window.pixelStudioDesktop = { edition: true, systemLanguage };
  const storage = new Map(saved ? [['pixelStudioWebLanguage', saved]] : []);
  const context = vm.createContext({ document, window, navigator: { languages: [systemLanguage], language: systemLanguage }, NodeFilter: { SHOW_TEXT: 4 }, queueMicrotask,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    MutationObserver: class { observe() {} disconnect() {} }
  });
  vm.runInContext(languageSource, context);
  const expected = saved === 'en' || saved === 'zh-CN' ? saved : /^zh(?:-|$)/i.test(systemLanguage) ? 'zh-CN' : 'en';
  assert.equal(document.documentElement.lang, expected, 'Language must be available before any DOMContentLoaded listener');
  select.value = document.documentElement.lang === 'en' ? 'en' : 'zh-CN';
  const state = { document, language: select, VERSION: '0.1.11', updateState: 'idle', remoteVersion: '', releaseNotes: '', installerUrl: '',
    packageSelect: { value: 'installer', options: [{}, {}, {}] }, packages: {}, nativeUpdateState: 'idle', downloadOpened: false,
    renderNativeUpdate() {} };
  for (const key of ['packageLabel', 'updateLegend', 'updateSummary', 'updateButton', 'updateStatus', 'updateNotes', 'updateDetails', 'releaseLink', 'installerButton', 'installerStatus']) state[key] = { style: {} };
  const updateContext = vm.createContext(state);
  vm.runInContext(functions.get('renderUpdate'), updateContext);
  const render = () => vm.runInContext('renderUpdate()', updateContext);
  render(); // Models the UI microtask before the language initializer.
  assert.equal(state.updateLegend.textContent, expected === 'en' ? 'Software updates' : '软件更新');
  let notifications = 0;
  window.addEventListener('pixel-studio-language-change', () => { notifications++; render(); });
  document.dispatchEvent({ type: 'DOMContentLoaded' });
  assert.equal(notifications, 1);
  assert.equal(owned.getAttribute('title'), '关闭设置', 'Owned UI attributes must not be translated independently');
  function change(value) { select.value = value; select.dispatchEvent({ type: 'change' }); }
  change('en');
  assert.equal(regular.getAttribute('title'), 'Open settings');
  assert.ok(nodes[0].nodeValue.includes('Strawberry Planter'));
  state.updateState = 'checking'; render();
  assert.equal(state.updateStatus.textContent, 'Checking GitHub...');
  change('zh-CN');
  assert.equal(state.updateStatus.textContent, '正在检查 GitHub...');
  state.updateState = 'newer'; state.remoteVersion = '99.0.0'; render();
  assert.ok(state.updateStatus.textContent.startsWith('发现新版本：99.0.0'));
  change('en');
  assert.ok(state.updateStatus.textContent.startsWith('New version: 99.0.0'));
  for (const value of ['idle', 'checking', 'empty', 'failed', 'limited', 'timeout', 'invalid', 'latest', 'ahead', 'newer']) {
    state.updateState = value; render();
    assert.ok(!/[\u4e00-\u9fff]/.test(state.updateLegend.textContent + state.updateStatus.textContent + state.installerStatus.textContent), 'Mixed update language: ' + value);
  }
  assert.equal(document.title, 'Pixel Studio');
  change('zh-CN');
  assert.equal(document.title, 'Pixel Studio');
  assert.equal(regular.getAttribute('title'), '打开设置');
  assert.equal(nodes[0].nodeValue, '检查连接：草莓小盆栽');
  console.log('PASS ' + (desktop ? 'desktop' : 'web') + ' / saved=' + (saved || 'default') + ' / system=' + systemLanguage + ': startup, 10 update states, in-flight switch, titles, owned attributes, round trip');
}
for (const desktop of [false, true]) for (const language of ['en', 'zh-CN', null]) scenario(language, desktop);
for (const desktop of [false, true]) for (const language of ['auto', null]) scenario(language, desktop, 'en-US');
