(() => {
  'use strict';
  function initialize() {
    const $ = id => document.getElementById(id);
    const supported = new Set(['pocket_circuit','wave','portrait_portal','pocket_starwhale','ripples','waterfall','scene_cafe','scene_jellies','scene_train','scene_camp','scene_seasons','scene_gears']);
    const controls = document.querySelector('.studio-controls');
    const row = document.createElement('div'); row.className = 'ps-animation-colors';
    row.innerHTML = '<label for="animationPalette">配色</label><select id="animationPalette"></select><button type="button">自定义配色</button>';
    controls.append(row);
    const select = row.querySelector('select'), button = row.querySelector('button');
    button.setAttribute('aria-haspopup','dialog');
    for (const [value,name] of [['original','原始'],['ice','冰蓝'],['mint','薄荷'],['amber','琥珀'],['rose','樱粉'],['violet','紫晶'],['custom','自定义']]) select.add(new Option(name,value));
    let saved = {};
    try { const data=JSON.parse(localStorage.getItem('pixelStudioAnimationColors')||'{}'); if(data && typeof data==='object' && !Array.isArray(data))saved=data; } catch {}
    const dialog=document.createElement('dialog'); dialog.className='ps-settings ps-media-dialog';
    dialog.innerHTML='<header class="ps-settings-heading"><h2>自定义配色</h2><button class="ps-close" type="button" aria-label="关闭配色">×</button></header><div class="ps-settings-body"></div>';
    dialog.querySelector('h2').id='animationColorsTitle';
    dialog.setAttribute('aria-labelledby','animationColorsTitle');
    document.body.append(dialog);
    const inputs=['高光颜色','主色','阴影颜色'].map((name,i)=>{
      const line=document.createElement('div'); line.className='ps-setting-row';
      const label=document.createElement('label');label.textContent=name;label.htmlFor='animationCustomColor'+i;
      const input=document.createElement('input');input.type='color';input.id=label.htmlFor;
      line.append(label,input);dialog.querySelector('.ps-settings-body').append(line);
      input.addEventListener('input',()=>{select.value='custom';save();});return input;
    });
    function current(){return $('animationMode').value;}
    function apply(){
      window.pixelStudioAnimationPaletteKey=supported.has(current())?(select.value==='custom'?'custom:'+inputs.map(input=>input.value).join(':'):select.value):'original';
      window.pixelStudioWebRuntime.refreshPalette();
    }
    function save(){
      saved[current()]={palette:select.value,colors:inputs.map(input=>input.value)};
      try{localStorage.setItem('pixelStudioAnimationColors',JSON.stringify(saved));}catch{}
      apply();
    }
    function sync(){
      const active=supported.has(current());row.hidden=!active;controls.classList.toggle('ps-palette-controls',active);
      const state=saved[current()]||{};select.value=state.palette||'original';if(!select.value)select.value='original';
      const defaults=['#daf5ff','#78d7fa','#244959'];
      inputs.forEach((input,i)=>{input.value=/^#[0-9a-f]{6}$/i.test(state.colors?.[i])?state.colors[i]:defaults[i];});
      apply();
    }
    select.addEventListener('change',save);
    button.addEventListener('click',()=>{select.value='custom';save();if(!dialog.open)dialog.showModal();});
    dialog.querySelector('button').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>button.focus());
    $('animationMode').addEventListener('change',sync);$('mediaFile').addEventListener('change',sync);sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
