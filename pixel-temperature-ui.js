(function () {
  'use strict';
  function initialize() {
    const engine = window.PixelStudioTemperature;
    const mode = document.getElementById('animationMode');
    const clock = document.getElementById('clockStyling');
    const controls = document.querySelector('.studio-controls');
    if (!engine || !mode || !clock || !controls) return;
    const storageKey = 'pixelStudioTemperaturePreferences.v1';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    const defaults = () => ({font:'segment', cpuBrand:'amd', gpuBrand:'nvidia', custom:false, sampleSeconds:1});
    const active = () => Object.hasOwn(engine.modes, mode.value);
    function preferences() {
      const item = saved[mode.value];
      return item && typeof item === 'object' && !Array.isArray(item) ? item : (saved[mode.value] = defaults());
    }
    const seconds = () => [0.5,1,1.5,2,2.5,3].includes(Number(preferences().sampleSeconds)) ? Number(preferences().sampleSeconds) : 1;
    const language = () => document.documentElement.lang || navigator.language || 'en';
    const local = (en, cn) => /^zh/i.test(language()) ? cn : en;
    const text = key => engine.text(key, language());
    const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    function make(tag, className = '') { const node = document.createElement(tag); node.className = className; return node; }
    function select(parent, items, id) {
      const node = make('select'); node.id = id;
      for (const [value,label] of items) node.add(new Option(label,value));
      parent.append(node); return node;
    }
    Object.defineProperty(window, 'pixelStudioTemperatureSettings', {configurable:true, get:() => active() ? preferences() : {}});
    window.pixelStudioTemperatureSample = null;
    const persist = () => {
      try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { }
      window.pixelStudioWebRuntime?.refreshPalette();
    };
    const row = make('div'); row.id = 'thermalStyling'; row.hidden = true;
    row.setAttribute('data-update-ui',''); clock.after(row);
    function field(id) {
      const box = make('div','ps-setting-row'), label = make('label','ps-setting-label'), body = make('div','ps-setting-field');
      label.htmlFor = id; box.append(label,body); row.append(box); return {label,body};
    }
    const fonts = field('thermalFont'), colors = field('thermalCpuColor');
    const clockFont = document.getElementById('clockFont');
    const font = select(fonts.body, [...clockFont.options].map(option => [option.value,option.textContent]), 'thermalFont');
    const fixedFont = new Option('', 'fixed'); font.add(fixedFont);
    colors.body.classList.add('thermal-colors');
    const cpu = select(colors.body, [['amd','CPU AMD'],['intel','CPU Intel']], 'thermalCpuColor');
    const gpu = select(colors.body, [['nvidia','GPU NVIDIA'],['amd','GPU AMD'],['intel','GPU Intel']], 'thermalGpuColor');
    const custom = make('button','ps-custom-colors'); custom.type = 'button'; colors.body.append(custom);
    custom.setAttribute('aria-haspopup','dialog');

    // Sampling has separate controls and never overwrites animation speed.
    const sampling = make('div','thermal-sampling'); sampling.hidden = true; sampling.setAttribute('data-update-ui','');
    const sampleLabel = make('label'), sampleRange = make('input'), sampleNumber = make('input');
    sampleRange.type = 'range'; sampleRange.id = 'thermalSampleSeconds'; sampleLabel.htmlFor = sampleRange.id;
    sampleNumber.type = 'number'; sampleNumber.id = 'thermalSampleSecondsNumber';
    for (const input of [sampleRange,sampleNumber]) { input.min = '0.5'; input.max = '3'; input.step = '0.5'; }
    const sampleValue = make('span','thermal-sample-value'), sampleUnit = make('span','thermal-sample-unit');
    sampleUnit.textContent = 's'; sampleUnit.setAttribute('aria-hidden','true');
    sampleValue.append(sampleNumber,sampleUnit);
    sampling.append(sampleLabel,sampleRange,sampleValue); controls.querySelector('.adjustments').append(sampling);
    const speedRow = document.getElementById('animationSpeed').closest('.speed-control');
    const status = make('output','thermal-status'); status.hidden = true; status.setAttribute('data-update-ui',''); status.setAttribute('aria-live','polite');
    const playbackMessages = document.querySelector('.ps-playback-messages');
    if (playbackMessages?.querySelector('.ps-playback-feedback')) status.classList.add('ps-playback-source');
    (playbackMessages || controls.parentElement).append(status);

    const dialog = make('dialog','ps-settings ps-media-dialog'); dialog.id = 'thermalColorsDialog'; dialog.setAttribute('data-update-ui','');
    dialog.setAttribute('aria-labelledby','thermalColorsTitle');
    const header = make('header','ps-settings-heading'), title = make('h2'), close = make('button','ps-close');
    title.id = 'thermalColorsTitle'; close.type = 'button'; close.textContent = '\u00d7';
    header.append(title,close);
    const body = make('div','ps-settings-body');
    const enabledLabel = make('label','ps-check thermal-enable'), enabled = make('input'), enabledText = make('span');
    enabled.type = 'checkbox'; enabledLabel.append(enabled,enabledText); body.append(enabledLabel);
    const hint = make('p','ps-help'); body.append(hint);
    const inputs = {}, labels = {};
    for (const key of ['cpu','gpu','divider']) {
      const line = make('div','ps-setting-row'), label = make('label','ps-setting-label'), input = make('input');
      input.type = 'color'; input.id = 'thermalCustom' + key; label.htmlFor = input.id;
      const fieldBody = make('div','ps-setting-field'); fieldBody.append(input); line.append(label,fieldBody); body.append(line);
      inputs[key] = input; labels[key] = label;
    }
    const actions = make('div','thermal-actions'), reset = make('button'), cancel = make('button'), done = make('button');
    reset.type = cancel.type = done.type = 'button'; actions.append(reset,cancel,done); body.append(actions);
    dialog.append(header,body); document.body.append(dialog);
    let dialogMode = '', lastStatus = 'loading';
    function syncEnabled() { for (const input of Object.values(inputs)) input.disabled = !enabled.checked; }
    enabled.addEventListener('change',syncEnabled);
    custom.addEventListener('click', () => {
      dialogMode = mode.value;
      const prefs = preferences(); enabled.checked = prefs.custom === true;
      const palette = engine.palette({...prefs,custom:true});
      for (const key of Object.keys(inputs)) inputs[key].value = palette[key];
      syncEnabled(); dialog.showModal();
    });
    done.addEventListener('click', () => {
      if (Object.hasOwn(engine.modes,dialogMode)) {
        const item = saved[dialogMode] || defaults(); item.custom = enabled.checked;
        for (const key of Object.keys(inputs)) item[key] = inputs[key].value;
        saved[dialogMode] = item; persist();
      }
      dialog.close(); refresh();
    });
    reset.addEventListener('click', () => {
      const palette = engine.palette({...saved[dialogMode],custom:false});
      for (const key of Object.keys(inputs)) inputs[key].value = palette[key];
      enabled.checked = false; syncEnabled();
    });
    for (const button of [cancel,close]) button.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => custom.focus());
    font.addEventListener('change', () => { if (mode.value === 'thermal_digits') { preferences().font = font.value; persist(); } });
    for (const [node,key] of [[cpu,'cpuBrand'],[gpu,'gpuBrand']]) node.addEventListener('change', () => {
      preferences()[key] = node.value; persist(); refresh();
    });

    // Only own temperature titles; do not rewrite arbitrary page text.
    const titleNodes = [];
    for (const id of Object.keys(engine.modes)) {
      const option = [...mode.options].find(item => item.value === id);
      const button = document.querySelector(`.animation-card[data-mode="${id}"]`);
      const label = button?.querySelector('.animation-title');
      for (const node of [option,label]) if (node) { node.setAttribute('data-update-ui',''); titleNodes.push([node,id]); }
    }
    function refresh() {
      const isActive = active(); row.hidden = sampling.hidden = !isActive;
      controls.classList.toggle('ps-thermal-controls',isActive);
      controls.classList.toggle('ps-clock-controls',isActive || mode.value === 'clock');
      if (speedRow) speedRow.hidden = isActive;
      setText(fonts.label,local('Style','样式')); setText(colors.label,local('Colors','配色'));
      setText(sampleLabel,local('Sampling','采样'));
      setText(sampleUnit,local('s','秒'));
      for (const input of [sampleRange,sampleNumber]) input.setAttribute('aria-label',local('Sampling interval in seconds','温度采样间隔，秒'));
      for (const option of font.options) setText(option,option.value === 'fixed' ? local('Fixed pixels','固定点阵') : [...clockFont.options].find(item => item.value === option.value)?.textContent || text(option.value));
      const customLabel = local('Custom','自定义');
      setText(custom,customLabel); custom.setAttribute('aria-label',customLabel); custom.title = customLabel;
      setText(title,text('custom')); close.setAttribute('aria-label',text('close'));
      setText(enabledText,local('Enable custom colors','启用自定义配色'));
      setText(hint,local('When disabled, CPU and GPU use the selected brand colors. Saved custom colors are kept. Apply saves changes; Cancel leaves them unchanged.','未勾选时使用 CPU / GPU 品牌配色，并保留已保存的自定义颜色。点击应用才保存，取消不作更改。'));
      setText(reset,text('reset')); setText(cancel,local('Cancel','取消')); setText(done,local('Apply','应用'));
      for (const key of Object.keys(labels)) setText(labels[key],text(key+'Color'));
      cpu.setAttribute('aria-label',text('cpuColor')); gpu.setAttribute('aria-label',text('gpuColor'));
      if (isActive) {
        const prefs = preferences(), large = mode.value === 'thermal_digits';
        if (large) fixedFont.remove(); else if (!fixedFont.parentNode) font.add(fixedFont);
        font.disabled = !large; font.value = large ? prefs.font || 'segment' : 'fixed';
        cpu.value = prefs.cpuBrand || 'amd'; gpu.value = prefs.gpuBrand || 'nvidia';
        cpu.disabled = gpu.disabled = prefs.custom === true;
        custom.setAttribute('aria-pressed',String(prefs.custom === true));
        sampleRange.value = sampleNumber.value = String(seconds());
      }
      const sample = window.pixelStudioTemperatureSample;
      let message = lastStatus === 'ready' ? '' : text(['loading','missing','stale','unsupported'].includes(lastStatus) ? lastStatus : 'unavailable');
      if (lastStatus === 'partial') {
        message = !sample?.cpu
          ? local('CPU temperature unavailable; GPU is available.','CPU 温度不可用，GPU 已读取。')
          : local('GPU temperature unavailable; CPU is available.','GPU 温度不可用，CPU 已读取。');
        if (!sample?.cpu && sample?.diagnostics?.serviceState === 'starting')
          message = local('Reconnecting the temperature service; GPU readings remain available. CPU will resume when the service is ready.','正在重新连接温度服务，暂时保留 GPU 读数；服务就绪后恢复 CPU 温度。');
        else if (!sample?.cpu && sample?.diagnostics?.elevated === false)
          message += local(' The sampler is not elevated; CPU driver access may require administrator permission.',' 采集器未提升权限；CPU 驱动访问可能需要管理员权限。');
      }
      status.classList.toggle('err', !['ready','loading'].includes(lastStatus));
      status.hidden = !isActive || !message; setText(status,message);
      for (const [node,id] of titleNodes) setText(node,text(id));
    }
    let busy = false, timer = null, disposed = false, generation = 0, controller = null;
    function schedule() { clearTimeout(timer); if (!disposed && (window.pixelStudioDesktop?.ddpRequest || document.querySelector('meta[name="pixel-bridge-token"]')?.content)) timer = setTimeout(poll,(active() ? seconds() : 1)*1000); }
    async function poll() {
      if (disposed || busy) return;
      busy = true; const requestGeneration = generation;
      try {
        let sample;
        if (window.pixelStudioDesktop?.ddpRequest) {
          const response = await window.pixelStudioDesktop.ddpRequest('/api/temperature',{timeout:18000});
          if (response.status !== 200) throw new Error('Temperature request failed');
          sample = JSON.parse(response.body);
        } else {
          const token = document.querySelector('meta[name="pixel-bridge-token"]')?.content;
          if (!token || !/^https?:$/.test(location.protocol)) { lastStatus = 'missing'; return; }
          controller = new AbortController();
          const timeout = setTimeout(() => controller?.abort(),18000);
          try {
            const response = await fetch('/api/temperature',{headers:{'X-Pixel-Token':token},cache:'no-store',signal:controller.signal});
            if (!response.ok) throw new Error('Temperature request failed');
            sample = await response.json();
          } finally { clearTimeout(timeout); controller = null; }
        }
        if (disposed || requestGeneration !== generation) return;
        window.pixelStudioTemperatureSample = sample; lastStatus = sample.status;
        window.pixelStudioWebRuntime?.refreshPalette();
      } catch {
        if (!disposed && requestGeneration === generation) { window.pixelStudioTemperatureSample = null; lastStatus = 'unavailable'; }
      } finally { busy = false; if (!disposed) { refresh(); schedule(); } }
    }
    for (const input of [sampleRange,sampleNumber]) input.addEventListener('change', () => {
      if (!active()) return;
      preferences().sampleSeconds = Math.max(0.5,Math.min(3,Math.round((Number(input.value)||1)*2)/2));
      persist(); refresh(); schedule();
    });
    mode.addEventListener('change', () => { refresh(); if (active() && !window.pixelStudioTemperatureSample) void poll(); });
    window.addEventListener('pixel-studio-language-change',refresh);
    window.addEventListener('pagehide', () => { disposed = true; generation++; clearTimeout(timer); controller?.abort(); });
    refresh(); void poll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
