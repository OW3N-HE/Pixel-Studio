(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const make = (tag, className = '', text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function initialize() {
    const api = window.pixelStudioWebRuntime;
    if (!api) return;
    document.body.classList.add('ps-web');
    const stage = document.querySelector('.preview-stage');
    const frame = make('div', 'ps-preview-frame');
    stage.append(frame);
    frame.append($('preview'));

    // A single native dialog owns opening, closing, focus and Escape handling.
    const dialog = make('dialog', 'ps-settings');
    dialog.id = 'studioSettings';
    dialog.setAttribute('aria-labelledby', 'studioSettingsTitle');
    const heading = make('header', 'ps-settings-heading');
    const title = make('h2', '', '设置'); title.id = 'studioSettingsTitle';
    const close = make('button', 'ps-close', '\u00d7'); close.type = 'button';
    close.setAttribute('aria-label', '关闭设置');
    const body = make('div', 'ps-settings-body');
    heading.append(title, close); dialog.append(heading, body); document.body.append(dialog);
    const oldGear = $('webSettingsToggle');
    const gear = oldGear.cloneNode(true); oldGear.replaceWith(gear);
    gear.setAttribute('aria-controls', dialog.id);
    gear.setAttribute('aria-haspopup', 'dialog');
    gear.setAttribute('aria-expanded', 'false');
    gear.addEventListener('click', () => {
      if (dialog.open) return;
      dialog.showModal(); body.scrollTop = 0; gear.setAttribute('aria-expanded', 'true');
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { gear.setAttribute('aria-expanded', 'false'); gear.focus(); });
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
    });
    const group = name => {
      const node = make('fieldset', 'ps-settings-group');
      node.append(make('legend', '', name)); body.append(node); return node;
    };
    function row(parent, text, nodes, className = '') {
      const line = make('div', 'ps-setting-row');
      const label = make('label', 'ps-setting-label', text);
      const field = make('div', 'ps-setting-field ' + className);
      nodes.filter(Boolean).forEach(node => field.append(node));
      const first = field.querySelector('input:not([type=checkbox]),select,button');
      if (first?.id) label.htmlFor = first.id;
      line.append(label, field); parent.append(line);
    }
    // Move actual controls to preserve their existing transport handlers.
    const appearance = document.querySelector('.pixel-appearance');
    const appearanceButtons = appearance ? [...appearance.querySelectorAll('button')] : [];
    const interfaceGroup = group('界面设置');
    const language = make('select'); language.id = 'webLanguage';
    language.append(new Option('简体中文', 'zh-CN'), new Option('English', 'en'));
    row(interfaceGroup, '语言', [language]);
    row(interfaceGroup, '主题', [$('webTheme')]);
    const aboutButton = make('button', 'ps-about-button', '关于 Pixel Studio');
    aboutButton.type = 'button';

    const aboutDialog = make('dialog', 'ps-settings ps-media-dialog');
    aboutDialog.setAttribute('aria-labelledby', 'pixelStudioAboutTitle');
    const aboutHeading = make('header', 'ps-settings-heading');
    const aboutTitle = make('h2', '', 'Pixel Studio'); aboutTitle.id = 'pixelStudioAboutTitle';
    const aboutClose = make('button', 'ps-close', '\u00d7'); aboutClose.type = 'button';
    aboutClose.setAttribute('aria-label', '关闭');
    aboutHeading.append(aboutTitle, aboutClose);
    const aboutBody = make('div', 'ps-settings-body ps-about-body');
    aboutDialog.append(aboutHeading, aboutBody); document.body.append(aboutDialog);
    aboutButton.addEventListener('click', () => {
      const english = document.documentElement.lang === 'en';
      aboutBody.replaceChildren(
        make('p', '', english ? 'Version 0.1.3 · Web edition' : '版本 0.1.3 · 网页版'),
        make('p', '', english ? 'Small pixels. Endless imagination.' : '方寸像素，无限想象。'),
        make('p', '', english ? 'A pixel animation studio for WLED. The web app and OpenRGB plugin share an animation library, with live previews, custom palettes and USB / Adalight or DDP output.' : '为 WLED 打造的像素动画工作室。网页版与 OpenRGB 插件共享动画库，支持实时预览、自定义配色，以及 USB / Adalight 和 DDP 输出。'),
        make('h3', '', english ? 'Authors & collaborators' : '作者与协作成员'),
        (() => {
          const authors = make('p', '', 'GPT-5.3 Codex Spark · GPT-5.6 Sol · GPT-6 Sol · GPT-6 Astra');
          authors.append(make('br'), document.createTextNode('OWEN'));
          return authors;
        })(),
        make('p', '', english ? 'Created through AI and human collaboration: AI collaborators contribute to design and development; OWEN guides the product, visual direction and device feedback.' : '由 AI 与人类共同创作：AI 协作成员参与设计和开发；OWEN 主导产品方向、视觉取舍与设备体验反馈。'),
        make('p', '', english ? 'Special thanks: David Wang' : '特别鸣谢：David Wang'),
        make('p', '', english ? 'Independent project. Thanks to the WLED, OpenRGB, Qt and Node.js communities. Not an official WLED or OpenRGB release.' : '独立项目，感谢 WLED、OpenRGB、Qt 与 Node.js 社区。本项目不是 WLED 或 OpenRGB 的官方发行版。')
      );
      if (!aboutDialog.open) aboutDialog.showModal();
    });
    aboutClose.addEventListener('click', () => aboutDialog.close());
    aboutDialog.addEventListener('close', () => aboutButton.focus());
    const output = group('WLED 输出设置');
    output.classList.add('ps-output-settings');
    const outputMode = $('controlMode');
    const savedMode = outputMode.value;
    outputMode.replaceChildren(new Option('USB / Adalight', 'serial'), new Option('DDP', 'ddp'));
    outputMode.value = savedMode === 'ddp' ? 'ddp' : 'serial';
    $('protocol').value = 'adalight';
    outputMode.dispatchEvent(new Event('change', { bubbles:true }));
    $('runtimeNotice').hidden = true;
    row(output, '输出方式', [$('controlMode')]);
    const portStatus = make('input'); portStatus.id = 'webPortStatus'; portStatus.readOnly = true;
    portStatus.value = '尚未连接'; $('quickSerialBtn').textContent = '选择串口';
    row(output, 'USB 端口', [portStatus, $('quickSerialBtn')], 'ps-input-action');
    $('readDeviceSizeBtn').textContent = '读取屏幕尺寸';
    row(output, 'IP 地址', [$('wledHost'), $('readDeviceSizeBtn')], 'ps-input-action');
    const size = make('div', 'ps-size-fields');
    for (const [name, id] of [['宽', 'matrixW'], ['高', 'matrixH']]) {
      const label = make('label', '', name); label.htmlFor = id; size.append(label, $(id));
    }
    const rounded = make('input'); rounded.type = 'checkbox';
    rounded.checked = $('preview').classList.contains('cad-pixels');
    const roundedLabel = make('label', 'ps-check');
    roundedLabel.append(rounded, document.createTextNode('圆角预览')); size.append(roundedLabel);
    row(output, '屏幕尺寸', [size]);
    row(output, '快捷尺寸', [...document.querySelectorAll('.presets button')], 'ps-presets');
    row(output, '排列', [$('mapping')]);
    const fpsRange = make('input'); fpsRange.type = 'range';
    fpsRange.min = '1'; fpsRange.max = '60'; fpsRange.step = '1'; fpsRange.value = $('fps').value;
    fpsRange.setAttribute('aria-label', '发送帧率');
    row(output, '帧率', [fpsRange, $('fps'), make('span', 'ps-unit', 'FPS')], 'ps-fps');
    fpsRange.addEventListener('input', () => { $('fps').value = fpsRange.value; $('fps').dispatchEvent(new Event('change', { bubbles:true })); });
    $('fps').addEventListener('input', () => { fpsRange.value = $('fps').value; });
    $('deviceInfo').classList.add('ps-help'); output.append($('deviceInfo'));
    if (!('serial' in navigator)) output.append(make('p', 'ps-help ps-warning', '此浏览器未提供 Web Serial。USB 输出请在支持该功能的桌面 Chrome 或 Edge 中打开。'));
    const media = group('本地媒体');
    row(media, '图片 / 视频', [$('mediaFile')]); row(media, '画面适配', [$('scaleMode')]);
    const mediaDialog = make('dialog', 'ps-settings ps-media-dialog');
    mediaDialog.setAttribute('aria-labelledby', 'mediaDialogTitle');
    const mediaHeading = make('header', 'ps-settings-heading');
    const mediaTitle = make('h2', '', '导入媒体'); mediaTitle.id = 'mediaDialogTitle';
    const mediaClose = make('button', 'ps-close', '\u00d7'); mediaClose.type = 'button';
    mediaClose.setAttribute('aria-label', '关闭媒体导入');
    mediaHeading.append(mediaTitle, mediaClose);
    const mediaBody = make('div', 'ps-settings-body');
    mediaBody.append(make('p', 'ps-media-description', '选择本地图片或视频，在当前像素屏尺寸下预览和播放。'), media);
    mediaDialog.append(mediaHeading, mediaBody); document.body.append(mediaDialog);
    const importButton = make('button', 'ps-import-button', '导入媒体'); importButton.type = 'button';
    importButton.setAttribute('aria-haspopup', 'dialog');
    const headerActions = make('div', 'ps-header-actions');
    gear.before(headerActions); headerActions.append(importButton, gear);
    importButton.addEventListener('click', () => { if (!mediaDialog.open) mediaDialog.showModal(); });
    mediaClose.addEventListener('click', () => mediaDialog.close());
    mediaDialog.addEventListener('close', () => importButton.focus());
    const advanced = make('details', 'ps-advanced');
    advanced.hidden = true;
    advanced.append(make('summary', '', '高级设置与连接诊断')); body.append(advanced);
    row(output, '颜色还原', [$('colorMode')]); row(output, 'Gamma', [$('colorGamma')]);
    output.append($('deviceInfo'));
    const safe = make('label', 'ps-check'); safe.append($('safeMode'), document.createTextNode('自动限制帧率'));
    row(advanced, '稳定优先', [safe]); row(advanced, 'USB 协议', [$('protocol')]);
    row(advanced, '波特率', [$('baudRate')]); row(advanced, 'HTTP 路径', [$('httpPath')]);
    row(advanced, '连接操作', ['connectBtn','disconnectBtn','testHttpBtn','testSerialBtn'].map($), 'ps-buttons');
    if ($('serialDiagnostic')) advanced.append($('serialDiagnostic'));
    row(advanced, '测试色', ['testRedBtn','testGreenBtn','testBlueBtn','testWhiteBtn','testBlackBtn'].map($), 'ps-buttons');
    row(advanced, '预览操作', [$('previewOnlyBtn'), $('clearPreviewBtn')], 'ps-buttons');
    advanced.append($('log'));
    const updateArea = make('fieldset', 'ps-settings-group');
    updateArea.setAttribute('data-update-ui', '');
    const updateButton = make('button', 'ps-about-button'); updateButton.type = 'button';
    const updateStatus = make('p', 'ps-help'); updateStatus.setAttribute('role', 'status');
    const updateNotes = make('p', 'ps-help'); updateNotes.style.whiteSpace = 'pre-wrap';
    const releaseLink = make('a');
    releaseLink.href = 'https://github.com/OW3N-HE/Pixel-Studio/releases';
    releaseLink.target = '_blank'; releaseLink.rel = 'noopener noreferrer';
    releaseLink.style.color = 'inherit';
    let updateState = 'idle', remoteVersion = '', releaseNotes = '';
    function renderUpdate() {
      const en = language.value === 'en';
      updateButton.textContent = en ? 'Check for updates' : '检查更新';
      const messages = {
        idle: en ? 'Current version: 0.1.3. Updates are installed manually.' : '当前版本：0.1.3。更新需手动安装。',
        checking: en ? 'Checking GitHub...' : '正在检查 GitHub...',
        empty: en ? 'No stable release has been published yet.' : '尚未发布正式版本。',
        failed: en ? 'Unable to check. Check your connection or GitHub rate limits, then retry.' : '检查失败，请检查网络或稍后重试（可能触发 GitHub 请求限额）。',
        invalid: en ? 'The release version is not supported. Please check the release page.' : '发布版本号格式无法识别，请查看发布页面。',
        latest: en ? 'You are up to date (0.1.3).' : '当前已是最新版本（0.1.3）。',
        newer: en ? `New version: ${remoteVersion}. Back up your files before replacing them; firmware is not updated automatically.` : `发现新版本：${remoteVersion}。替换前请备份文件；不会自动更新固件。`
      };
      updateStatus.textContent = messages[updateState];
      updateNotes.textContent = releaseNotes;
      updateNotes.hidden = !releaseNotes;
      releaseLink.textContent = en ? 'Open official releases / download' : '打开官方发布页 / 下载';
      updateButton.disabled = updateState === 'checking';
    }
    updateButton.addEventListener('click', async () => {
      if (updateState === 'checking') return;
      updateState = 'checking'; releaseNotes = ''; renderUpdate();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('https://api.github.com/repos/OW3N-HE/Pixel-Studio/releases/latest', {
          signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (response.status === 404) updateState = 'empty';
        else {
          if (!response.ok) throw new Error('HTTP error');
          const release = await response.json();
          const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(release.tag_name || '');
          if (!match || release.draft || release.prerelease) updateState = 'invalid';
          else {
            remoteVersion = match.slice(1).join('.');
            const parts = match.slice(1).map(Number), current = [0, 1, 3];
            const differing = parts.findIndex((part, i) => part !== current[i]);
            updateState = differing >= 0 && parts[differing] > current[differing] ? 'newer' : 'latest';
            releaseNotes = typeof release.body === 'string' ? release.body.slice(0, 6000) : '';
          }
        }
      } catch { updateState = 'failed'; }
      finally { clearTimeout(timeout); renderUpdate(); }
    });
    language.addEventListener('change', renderUpdate);
    updateArea.append(updateButton, updateStatus, updateNotes, releaseLink);
    body.append(updateArea, aboutButton);
    queueMicrotask(renderUpdate);
    // Retain IDs used by the renderer even when their old presentation is gone.
    const retained = make('div'); retained.hidden = true;
    ['pixelCount','screenResolution'].forEach(id => { if ($(id)) retained.append($(id)); });
    document.body.append(retained);
    document.querySelector('.right-column').remove(); appearance?.remove();
    rounded.addEventListener('change', () => { appearanceButtons[rounded.checked ? 0 : 1]?.click(); updateRim(); });

    const gallery = $('animationGallery');
    const well = make('div', 'ps-library-well'); gallery.before(well); well.append(gallery);
    const empty = make('p', 'ps-empty', '没有符合条件的动画'); empty.hidden = true; well.append(empty);
    const category = $('libraryCategory'); category.add(new Option('收藏', 'favorites'), 1);
    let saved = []; try { saved = JSON.parse(localStorage.getItem('pixel-studio-favorites') || '[]'); } catch {}
    const favorites = new Set(Array.isArray(saved) ? saved : []);
    const cards = [...gallery.querySelectorAll('.animation-card')].map(button => {
      const mode = button.dataset.mode, name = button.querySelector('.animation-title').textContent.trim();
      if (favorites.has(name)) { favorites.delete(name); favorites.add(mode); }
      const tile = make('article', 'ps-animation-tile'); button.before(tile); tile.append(button);
      const heart = make('button', 'ps-favorite'); heart.type = 'button';
      heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
      tile.append(heart);
      heart.addEventListener('click', () => {
        if (favorites.has(mode)) favorites.delete(mode); else favorites.add(mode);
        try { localStorage.setItem('pixel-studio-favorites', JSON.stringify([...favorites])); } catch {}
        syncGallery();
      });
      return { button, tile, heart, mode, name };
    });
    function syncGallery() {
      const search = $('librarySearch').value.trim().toLocaleLowerCase();
      for (const item of cards) {
        const favorite = favorites.has(item.mode);
        item.heart.setAttribute('aria-pressed', String(favorite));
        item.heart.setAttribute('aria-label', (favorite ? '取消收藏：' : '收藏：') + item.name);
        item.tile.hidden = category.value === 'favorites' ? !favorite || !item.name.toLocaleLowerCase().includes(search) : item.button.hidden;
      }
      empty.hidden = cards.some(item => !item.tile.hidden);
    }
    category.addEventListener('change', event => {
      if (category.value !== 'favorites') return;
      event.stopImmediatePropagation(); document.querySelector('[data-filter="all"]').click(); syncGallery(); gallery.scrollTop = 0;
    }, true);
    category.addEventListener('change', () => { syncGallery(); gallery.scrollTop = 0; });
    $('librarySearch').addEventListener('input', syncGallery);
    $('animationMode').addEventListener('change', syncGallery); syncGallery();
    $('randomAnimationBtn').hidden = true;
    const shuffle = make('label', 'ps-shuffle'), shuffleCheck = make('input'); shuffleCheck.type = 'checkbox';
    shuffle.append(shuffleCheck, document.createTextNode('随机播放'));
    const interval = make('input'); interval.type = 'number'; interval.min = '3'; interval.max = '3600'; interval.step = '1'; interval.value = '20'; interval.disabled = true;
    interval.setAttribute('aria-label', '随机播放间隔，秒');
    const shuffleGroup = make('div', 'ps-shuffle-group'); shuffleGroup.append(shuffle, interval, make('span', 'ps-unit', '秒'));
    document.querySelector('.library-toolbar').append(shuffleGroup);
    let shuffleTimer;
    function scheduleShuffle() {
      clearInterval(shuffleTimer); interval.disabled = !shuffleCheck.checked;
      if (!shuffleCheck.checked) return;
      const seconds = Math.max(3, Math.min(3600, Number(interval.value) || 20)); interval.value = String(seconds);
      shuffleTimer = setInterval(() => {
        if (!api.playing) return;
        const choices = cards.filter(item => !item.tile.hidden && item.mode !== $('animationMode').value);
        if (choices.length) choices[Math.floor(Math.random() * choices.length)].button.click();
      }, seconds * 1000);
    }
    shuffleCheck.addEventListener('change', scheduleShuffle); interval.addEventListener('change', scheduleShuffle);
    const speedNumber = make('input'); speedNumber.id = 'animationSpeedNumber'; speedNumber.type = 'number';
    for (const key of ['min','max','step','value']) speedNumber[key] = $('animationSpeed')[key];
    speedNumber.setAttribute('aria-label', '动画速度倍数'); $('animationSpeedValue').hidden = true;
    document.querySelector('.speed-control').append(speedNumber);
    document.querySelector('label[for="animationSpeed"]').textContent = '速度';
    document.querySelector('label[for="brightness"]').textContent = '亮度';
    speedNumber.addEventListener('input', () => {
      if (!speedNumber.validity.valid || !speedNumber.value) return;
      $('animationSpeed').value = speedNumber.value; $('animationSpeed').dispatchEvent(new Event('input', { bubbles:true }));
    });
    $('animationSpeed').addEventListener('input', () => { speedNumber.value = Number($('animationSpeed').value).toFixed(2); });
    const clock = $('clockStyling'), font = $('clockFont'), palette = $('clockPalette');
    clock.replaceChildren(); row(clock, '样式', [font]); row(clock, '配色', [palette]);
    const fontNames = { rounded:'圆角像素', classic:'经典点阵', segment:'七段数码' };
    const paletteNames = { ice:'冰蓝', mint:'薄荷', amber:'琥珀', rose:'樱粉', violet:'紫晶' };
    [...font.options].forEach(option => { option.textContent = fontNames[option.value] || option.textContent; });
    [...palette.options].forEach(option => { option.textContent = paletteNames[option.value] || option.textContent; });
    const custom = make('button', 'ps-custom-colors', '自定义配色'); custom.type = 'button';
    palette.parentElement.append(custom);
    const colorsDialog = make('dialog', 'ps-settings ps-media-dialog');
    colorsDialog.setAttribute('aria-labelledby', 'clockColorsTitle');
    const colorsHeading = make('header', 'ps-settings-heading');
    const colorsTitle = make('h2', '', '动态时钟 · 自定义配色'); colorsTitle.id = 'clockColorsTitle';
    const colorsClose = make('button', 'ps-close', '\u00d7'); colorsClose.type = 'button';
    colorsClose.setAttribute('aria-label', '关闭配色');
    colorsHeading.append(colorsTitle, colorsClose);
    const colorsBody = make('div', 'ps-settings-body');
    colorsDialog.append(colorsHeading, colorsBody); document.body.append(colorsDialog);
    let customColors = ['#e5f5ff','#6ad3f5','#356e88'];
    try {
      const saved = JSON.parse(localStorage.getItem('pixelStudioClockCustomColors') || 'null');
      if (Array.isArray(saved) && saved.length === 3 && saved.every(value => /^#[0-9a-f]{6}$/i.test(value))) customColors = saved;
    } catch {}
    const customOption = new Option('自定义', 'custom:' + customColors.join(':')); palette.add(customOption);
    ['小时','分钟','分隔线'].forEach((name, index) => {
      const input = make('input'); input.type = 'color'; input.value = customColors[index]; input.id = 'clockCustomColor' + index;
      row(colorsBody, name, [input]);
      input.addEventListener('input', () => {
        customColors[index] = input.value;
        customOption.value = 'custom:' + customColors.join(':'); palette.value = customOption.value;
        try { localStorage.setItem('pixelStudioClockCustomColors', JSON.stringify(customColors)); } catch {}
        palette.dispatchEvent(new Event('change', { bubbles:true }));
      });
    });
    custom.addEventListener('click', () => { if (!colorsDialog.open) colorsDialog.showModal(); });
    colorsClose.addEventListener('click', () => colorsDialog.close());
    colorsDialog.addEventListener('close', () => custom.focus());
    const controls = document.querySelector('.studio-controls');
    function syncControlLayout() {
      controls.classList.toggle('ps-clock-controls', $('animationMode').value === 'clock');
    }
    $('animationMode').addEventListener('change', syncControlLayout);
    $('mediaFile').addEventListener('change', syncControlLayout);
    syncControlLayout();
    speedNumber.value = Number($('animationSpeed').value).toFixed(2);
    speedNumber.addEventListener('blur', () => { speedNumber.value = Number($('animationSpeed').value).toFixed(2); });
    const footer = make('div', 'ps-playback-bar'), toggle = make('button', 'ps-play-toggle'); toggle.type = 'button';
    const messages = make('div', 'ps-playback-messages'); messages.append($('status'), $('runtimeNotice'));
    footer.append(toggle, messages, $('streamStats')); controls.after(footer);
    $('startBtn').hidden = true; $('stopBtn').hidden = true;
    document.querySelector('.playback-actions').hidden = true;
    document.querySelector('.now-playing').hidden = true; $('progress').hidden = true;
    let lastPlaying;
    function syncPlayback() {
      const playing = api.playing;
      if (lastPlaying !== playing) {
        lastPlaying = playing;
        toggle.innerHTML = playing ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 3 15 9-15 9Z"/></svg>';
        toggle.setAttribute('aria-label', playing ? '停止播放' : '播放');
        toggle.title = playing ? '停止播放' : '向所选设备发送动画';
        toggle.classList.toggle('is-playing', playing); frame.classList.toggle('is-playing', playing);
      }
      const english = document.documentElement.lang === 'en';
      const status = api.serialConnected ? (english ? 'USB connected' : 'USB 已连接') : (english ? 'Not connected' : '尚未连接');
      if (portStatus.value !== status) portStatus.value = status;
    }
    toggle.addEventListener('click', () => { (api.playing ? $('stopBtn') : $('startBtn')).click(); syncPlayback(); });
    syncPlayback();
    const stateTimer = setInterval(syncPlayback, 200);
    window.addEventListener('pagehide', () => { clearInterval(stateTimer); clearInterval(shuffleTimer); });
    function updateRim() {
      const pitch = $('preview').getBoundingClientRect().width / Math.max(1, Number($('matrixW').value));
      const cad = $('preview').classList.contains('cad-pixels');
      const inset = cad ? pitch * 0.4 / 7.125 : 0;
      const radius = cad ? pitch * 0.8 / 7.125 + 2 * inset : 0;
      frame.style.setProperty('--rim-inset', inset + 'px'); frame.style.setProperty('--rim-radius', radius + 'px');
    }
    const studio = document.querySelector('.studio-stage');
    function resizePreview() {
      if (window.innerWidth > 760) {
        const ratio = Math.max(1, Number($('matrixW').value)) / Math.max(1, Number($('matrixH').value));
        const column = Math.max(120, Math.min(studio.clientWidth * 0.44, Math.max(1, stage.clientHeight - 12) * ratio + 16));
        studio.style.setProperty('--preview-column', column + 'px');
        stage.style.paddingTop = '4px';
      } else { studio.style.removeProperty('--preview-column'); stage.style.paddingTop = ''; }
      api.resizePreview();
      frame.style.transform = '';
      if (window.innerWidth > 760) {
        const preview = $('preview');
        const width = Math.max(1, Number($('matrixW').value));
        const height = Math.max(1, Number($('matrixH').value));
        const library = document.querySelector('.library-card').getBoundingClientRect();
        const insetRatio = preview.classList.contains('cad-pixels') ? 0.4 / 7.125 : 0;
        const pitch = Math.max(0.1, Math.min((stage.clientWidth - 8) / (width + 2 * insetRatio), (library.height - 8) / (height + 2 * insetRatio)));
        preview.style.width = (pitch * width) + 'px';
        preview.style.height = (pitch * height) + 'px';
        updateRim();
        const top = $('libraryCategory').getBoundingClientRect().top;
        frame.style.transform = 'translateY(' + (top + 4 - frame.getBoundingClientRect().top) + 'px)';
      } else updateRim();
    }
    const resize = new ResizeObserver(resizePreview); resize.observe(studio); resize.observe(well);
    $('matrixW').addEventListener('change', resizePreview); $('matrixH').addEventListener('change', resizePreview);
    resizePreview();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once:true });
  else initialize();
})();
