(() => {
  'use strict';
  // Resolve persisted language before DOMContentLoaded listeners build the UI.
  // Microtasks may run between those listeners, so deferred refresh is too late.
  const storageKey = 'pixelStudioWebLanguage';
  let preference = window.pixelStudioDesktop?.languagePreference || 'auto';
  try {
    const saved = localStorage.getItem(storageKey);
    if (['auto', 'en', 'zh-CN'].includes(saved)) preference = saved;
  } catch {}
  function resolveLanguage() {
    if (preference !== 'auto') return preference;
    const system = window.pixelStudioDesktop?.systemLanguage || navigator.languages?.[0] || navigator.language || 'en';
    return /^zh(?:-|$)/i.test(system) ? 'zh-CN' : 'en';
  }
  let language = resolveLanguage();
  function updateDocumentLanguage() {
    if (document.documentElement.lang !== language) document.documentElement.lang = language;
    if (document.documentElement.getAttribute('data-language-preference') !== preference) {
      document.documentElement.setAttribute('data-language-preference', preference);
    }
    if (document.title !== 'Pixel Studio') document.title = 'Pixel Studio';
  }
  updateDocumentLanguage();
  const catalog = {"秋日小路":"Autumn Lane","雪夜石灯":"Snow Lantern","极简 · 三点一线":"Minimal · three marks","低细节 · 大块面":"Bold · big shapes","高细节 · 写实":"Detailed · painterly","几何 · 对称":"Geometric · symmetric","剪影 · 逆光":"Silhouette · backlit","抽象 · 光带":"Abstract · light bands",
    '关于 Pixel Studio':'About Pixel Studio','关于':'About','关闭':'Close',
    '打开设置':'Open settings','选择文件':'Choose file','尚未选择文件':'No file selected',
    '高级设置与连接诊断':'Advanced settings and diagnostics','自动限制帧率':'Automatically limit frame rate',
    '稳定优先':'Prioritize stability','USB 协议':'USB protocol','波特率':'Baud rate',
    'HTTP 路径':'HTTP path','连接操作':'Connection actions','测试色':'Test color','预览操作':'Preview actions',
    '新增':'New','手绘作品':'Hand-drawn','手绘':'Hand-drawn',
    '设置':'Settings','语言':'Language','主题':'Theme','界面设置':'Interface settings',
    'WLED 输出设置':'WLED output settings','输出方式':'Output','USB 端口':'USB port','IP 地址':'IP address',
    '选择串口':'Select port','读取屏幕尺寸':'Read matrix size','屏幕尺寸':'Matrix size','快捷尺寸':'Size presets',
    '宽':'W','高':'H','圆角预览':'Rounded preview','排列':'Pixel order','帧率':'FPS','颜色还原':'Color matching',
    '亮度':'Brightness','速度':'Speed','样式':'Style','配色':'Colors','原始':'Original','原始配色':'Original',
    '自定义':'Custom','自定义配色':'Custom colors','高光颜色':'Highlight color','主色':'Main color','阴影颜色':'Shadow color',
    '冰蓝':'Ice blue','薄荷':'Mint','琥珀':'Amber','樱粉':'Rose','紫晶':'Amethyst','深蓝':'Deep blue','灰色':'Gray','深色':'Dark','浅色':'Light',
    '圆角像素':'Rounded pixels','经典点阵':'Classic dots','七段数码':'Seven-segment',
    '小时':'Hours','分钟':'Minutes','分隔线':'Separator','动态时钟 · 自定义配色':'Clock · Custom colors',
    '全部':'All','收藏':'Favorites','自然':'Nature','氛围':'Ambient','趣味':'Fun','时钟':'Clock','信息':'Information',
    '随机播放':'Shuffle','秒':'s','没有符合条件的动画':'No matching animations',
    '搜索':'Search',
    '导入媒体':'Import media','媒体':'Media','本地媒体':'Local media','图片 / 视频':'Image / video','画面适配':'Scaling',
    '正在播放视频':'Playing video','正在播放图片':'Playing image',
    '拉伸到屏幕':'Stretch to fill','拉伸':'Stretch to fill','保持比例，居中补边':'Fit with borders',
    '保持比例':'Keep aspect ratio','保留 WLED 调色':'Keep WLED colors',
    '选择本地图片或视频，在当前像素屏尺寸下预览和播放。':'Choose a local image or video to preview and play on your pixel matrix.',
    '关闭设置':'Close settings','关闭媒体导入':'Close media import','关闭配色':'Close colors','播放':'Play','停止播放':'Stop',
    '向所选设备发送动画':'Send animation to the selected device','发送帧率':'Output frame rate','动画速度倍数':'Animation speed multiplier',
    '随机播放间隔，秒':'Shuffle interval in seconds','逐行，从左到右':'Rows, left to right',
    '悬浮微光':'Floating Glow','装甲巡航':'Armored Patrol','樱花小夜':'Cherry Blossom Night','熔岩桶 · 暖意冒泡':'Bubbling Lava','变身时刻':'Transformation Time','原画跑酷':'Pixel Runner','圣诞树 · 小小灯会':'Twinkling Tree','手绘火箭 · 星间航行':'Hand-drawn Rocket','红色扫描':'Red Scan','白光呼吸':'White Pulse','害羞眨眼':'Shy Blink','草莓小盆栽':'Strawberry Planter','星海小鲸':'Starry Whale',
    '晚风风铃':'Evening Wind Chime','星星小团子':'Little Star Dumpling','勇气踏步':'Brave Steps',
    '林间小狐狸':'Woodland Fox','水豚泡温泉':'Capybara Hot Spring','猫头鹰守夜':'Night Watch Owl',
    '六角龙小池':'Axolotl Pond','雨后小蜗牛':'Snail After the Rain','蜂蜜小花园':'Honey Garden',
    '星光摩天轮':'Starlight Ferris Wheel','雪山缆车':'Snowy Cable Car','麦田小风车':'Wheatfield Windmill',
    '屋顶观星台':'Rooftop Observatory','深海小潜艇':'Deep Sea Submarine','浮岛小城堡':'Floating Island Castle',
    '蘑菇夜光林':'Glowing Mushroom Forest','南瓜小夜灯':'Pumpkin Nightlight','霓虹陀螺':'Neon Gyroscope',
    '星际电路':'Interstellar Circuit','萤火夜花园':'Firefly Garden','热气球旅行':'Balloon Journey',
    '企鹅踏雪':'Penguin in the Snow','听雨竹林':'Rainy Bamboo','樱花小溪':'Cherry Blossom Stream','星海蓝鲸':'Cosmic Blue Whale',
    '霓虹时空门':'Neon Portal','咖啡小憩':'Coffee Break','棱彩流光':'Prismatic Lights','像素小舞者':'Pixel Dancer',
    '夜色玫瑰':'Night Rose','月下小兔':'Moonlit Rabbit','动态时钟':'Digital Clock','简单波浪':'Simple Waves',
    '流动彩虹':'Flowing Rainbow','像素火焰':'Pixel Fire','绿色数字雨':'Digital Rain','流星夜空':'Meteor Night',
    '像素烟花':'Pixel Fireworks','心跳爱心':'Heartbeat','水波涟漪':'Water Ripples','彩色贪吃蛇':'Rainbow Snake',
    '熔岩灯':'Lava Lamp','像素水母':'Pixel Jellyfish','北境极光':'Northern Lights','像素飘雪':'Pixel Snow',
    '海面日落':'Ocean Sunset','气泡上升':'Rising Bubbles','彩翼蝴蝶':'Butterfly','太空来客':'Space Visitors',
    '豆豆追逐':'Pixel Chase','像素沙漏':'Pixel Hourglass','旋转星云':'Spinning Nebula','跳动棋盘':'Dancing Checkerboard',
    '节奏光柱':'Rhythm Bars','像素花开':'Pixel Bloom','仅本地预览':'Local preview','尚未发送':'Not sending',
    '锦鲤游弋':'Koi Pond','天灯夜游':'Sky Lanterns','雨夜城市':'Rainy City','远山流云':'Mountain Clouds',
    '火箭旅行':'Rocket Voyage','海底鱼群':'Underwater Shoal','像素猫咪':'Pixel Cat','烛光摇曳':'Candlelight',
    '蓝色瀑布':'Blue Waterfall','行星轨道':'Planetary Orbits','双螺旋':'Double Helix','彩虹隧道':'Rainbow Tunnel',
    '黄昏小列车':'Sunset Train','雨天小红伞':'Rainy Red Umbrella','月光灯塔':'Moonlit Lighthouse',
    '像素唱片机':'Pixel Turntable','纸飞机旅行':'Paper Plane Journey','口袋温室':'Pocket Greenhouse',
    '已停止':'Stopped','已切换到':'Selected: ','正在本地预览':'Previewing locally','持续发送中':'Sending',
    '正在发送':'Sending','开始发送':'Start output','发送':'Sending','取消收藏：':'Remove favorite: ','收藏：':'Favorite: ',
    '匹配网页颜色（推荐）':'Match web colors (recommended)','开始发送时读取设备颜色配置':'Read device color configuration when starting output',
    '静态图片已发送完成':'Still image sent',
    'DDP 需要本地服务：请启动 Start-Pixel-DDP.cmd 并从服务页面播放；USB 请在设置中选择 USB 输出。':'DDP needs the local bridge. Start Start-Pixel-DDP.cmd and play from its page, or select USB output in Settings.',
    'USB 已打开，但尚未收到 WLED 握手响应。请查看设置中的连接诊断，并确认串口、波特率和固件。':'USB is open, but WLED has not responded. Check the serial port, baud rate, firmware and connection diagnostics in Settings.',
    '当前浏览器不支持 Web Serial，请使用桌面版 Chrome 或 Edge':'Web Serial is unavailable. Use desktop Chrome or Edge.',
    '当前浏览器不支持 Web Serial':'Web Serial is unavailable in this browser',
    'HTTP 地址不合法':'Invalid HTTP address','请先连接串口再发送':'Connect a serial port before sending',
    '请先选择图片/视频文件':'Select an image or video first','请先选择文件':'Select a file first',
    'HTTP + JSON 单帧数据过大，先降分辨率再测试':'The HTTP / JSON frame is too large. Reduce the resolution and try again.',
    'DDP 服务就绪，点击开始发送进入实时模式':'DDP is ready. Press Play to start realtime output',
    'WLED 长连接就绪':'WLED WebSocket ready','WLED HTTP 就绪':'WLED HTTP ready',
    '已断开':'Disconnected','已连接（baud ':'Connected (baud ',
    '设备可达，颜色配置已读取':'Device reachable; color settings loaded','，长连接就绪':'; WebSocket ready',
    '测试颜色已发送到整屏':'Test color sent to the entire matrix',
    '视频已就绪，可点击开始发送':'Video ready. Press Play to send',
    '图片已就绪，可点击开始发送':'Image ready. Press Play to send','图片读取失败':'Unable to read the image',
    '已切换到文件模式，请选择图片或视频':'Media mode selected. Choose an image or video',
    '媒体模式：请选择图片或视频':'Media mode: choose an image or video',
    '切换到媒体模式':'Switching to media mode','动画预览中':'Previewing animations',
    '图片已就绪':'Image ready','视频已就绪':'Video ready',
    '正在本地预览，点击开始发送可控制 WLED':'Previewing locally. Press Play to send to WLED',
    '预览已清空':'Preview cleared','已使用设备尺寸 ':'Using device matrix size ',
    '发送失败：':'Output failed: ','连接失败：':'Connection failed: ',
    '连接测试失败：':'Connection test failed: ','发送测试色失败：':'Test color failed: ',
    '后台停止失败：':'Unable to stop background playback: ',
    'DDP 后台播放已停止':'DDP background playback stopped',
    'DDP 后台 · 已无缝切换至 ':'DDP background · Selected: ',
    'DDP 后台 · 目标 ':'DDP background · Target ',
    '高速控制已连接 · DDP 后台 60 FPS · 动画与亮度支持无缝更新':'Connected · DDP background 60 FPS · Live animation and brightness changes',
    '设备地址已改变，请重新开始':'The device address changed. Start output again',
    '此浏览器未提供 Web Serial。USB 输出请在支持该功能的桌面 Chrome 或 Edge 中打开。':'Web Serial is unavailable here. Open in a supported desktop Chrome or Edge browser for USB output.'
  };
  Object.assign(catalog, {
    '跟随系统':'Follow system',
    '播放控制':'Playback controls','动画分类':'Animation category','搜索动画':'Search animations',
    '收起设置':'Collapse settings','网页主题':'Page theme','发送测试颜色':'Send test colors',
    '连接所选通道':'Connect','断开':'Disconnect','串口诊断':'Serial diagnostics',
    '清空预览':'Clear preview','运行日志':'Diagnostic log','红色':'Red','绿色':'Green','蓝色':'Blue','白色':'White','黑屏':'Black',
    '尚未连接':'Not connected','我的图片 / 视频':'My image / video',
    '像素预览外观':'Pixel preview appearance','像素外观':'Pixel appearance','CAD 圆角':'CAD rounded pixels',
    '原始像素':'Square pixels','仅影响预览，不改变发送数据':'Preview only; output data is unchanged',
    '参考手绘 CAD：开孔 6.325 mm，中心距 7.125 mm，圆角 R0.8 mm':'CAD reference: 6.325 mm aperture, 7.125 mm pitch, R0.8 mm corners',
    '选择图片或视频文件后，可以预览并发送到 WLED。':'Choose an image or video to preview and send to WLED.',
    '已取消选择串口':'Port selection cancelled',
    '未填写 WLED 地址':'Enter a WLED address', '请输入有效的 WLED 地址':'Enter a valid WLED address',
    'WebSocket 未连接':'WebSocket is not connected','串口未连接':'Serial port is not connected',
    '请先连接串口并点击「串口诊断」，收到 WLED 回包后才能发送。':'Connect a serial port and run Serial diagnostics. Output requires a WLED response.',
    '串口诊断正在进行，请稍候。':'Serial diagnostics are running. Please wait.',
    'Adalight 帧必须为 1–65535 个 RGB 像素。':'An Adalight frame must contain 1 to 65535 RGB pixels.',
    'WLED 错误 ':'WLED error ', 'WLED WebSocket 错误 ':'WLED WebSocket error ',
    'WebSocket 连接超时':'WebSocket connection timed out','WebSocket 无法连接':'Unable to connect to WebSocket',
    'WebSocket 连接已关闭':'WebSocket connection closed','WebSocket 连接中断':'WebSocket connection interrupted',
    '上一条设备命令尚未完成':'The previous device command is still pending',
    '设备接收缓慢，已停止积压':'The device is receiving slowly. Output stopped to prevent a backlog.',
    'WLED 响应超时':'WLED response timed out',
    '请双击 Start-Pixel-DDP.cmd 打开本地 DDP 高速入口':'Run Start-Pixel-DDP.cmd and open the local DDP page',
    '请双击 Start-Pixel-DDP.cmd，从本地高速入口打开 DDP 模式':'Run Start-Pixel-DDP.cmd and open DDP mode from the local page',
    'DDP 需要本地服务：请双击 Start-Pixel-DDP.cmd，从 127.0.0.1:8766 打开':'DDP requires the local bridge. Run Start-Pixel-DDP.cmd and open 127.0.0.1:8766',
    '本地 DDP 服务错误 ':'Local DDP bridge error ',
    '设备为 ':'Device matrix: ', '，请点击“读取设备尺寸”后再发送':'. Click Read matrix size before sending',
    'HTTP 模式不支持 raw-bin，请切回串口 + raw-bin':'HTTP does not support raw-bin. Use serial output with raw-bin.',
    '无法生成动态帧':'Unable to generate an animation frame',
    '上一帧尚未结束，请稍后再试':'The previous frame is still pending. Try again shortly.',
    '二进制串口协议不能用于 IP 控制':'Binary serial protocols cannot be used for IP control',
    '设备未报告二维矩阵尺寸，请手动输入':'The device did not report matrix dimensions. Enter them manually.',
    ' · 实际发送 ':' · Actual ', ' 帧/s · ':' FPS · ', ' ms/帧 · ':' ms/frame · ',
    ' · 调度跳帧 ':' · Skipped ', ' · 正在采样':' · Sampling', ' · 设备 ':' · Device ',
    '尚未诊断。先确认固件命令通道，再判断像素输出。':'Not tested yet. Verify the firmware command channel before checking pixel output.',
    '原生 USB CDC':'Native USB CDC',' · 写入 ':' · Writing ',
    ' 像素。此处是电脑写入速率，不是屏幕实测帧率。':' pixels. This is the host write rate, not measured display FPS.',
    '静态画面续传已停止：':'Still-image streaming stopped: ', '串口读取中断：':'Serial read interrupted: ',
    '已连接 Espressif 原生 USB。':'Espressif native USB connected.', '串口已打开。':'Serial port opened.',
    ' 请点击串口诊断；打开端口不等于 WLED 已响应。':' Run Serial diagnostics; an open port does not confirm a WLED response.',
    '先把控制方式切换到串口。IP / DDP 无需此诊断。':'Select serial output first. IP / DDP does not need this test.',
    '请先连接 ESP32 的串口。':'Connect the ESP32 serial port first.',
    '请先停止播放，再运行只读诊断，避免查询和像素数据混在一起。':'Stop playback before running read-only diagnostics to avoid mixing queries with pixel data.',
    '只读诊断中：先查询 WLED 版本，必要时再查询 JSON 状态。不会改灯光、波特率或固件。':'Running read-only diagnostics: querying the WLED version, then JSON state if needed. Lights, baud rate and firmware are unchanged.',
    '已收到 ':'Received ', ' 回包，串口命令通道可用。':' response. The serial command channel is available. ',
    '检测到 Espressif 原生 USB CDC；吞吐仍需实测。':'Espressif native USB CDC detected; throughput still needs measurement. ',
    'UART 安全帧率上限约 ':'Estimated safe UART limit: ', ' FPS。':' FPS. ',
    ' 选择 Adalight 后可开始发送；回包不代表像素输出已验证。':' Select Adalight to send. A response does not verify pixel output.',
    '收到 ':'Received ', ' 字节，但不是有效 WLED 回包。':' bytes, but no valid WLED response.',
    '查询超时，没有收到 WLED 回包。':'Query timed out without a WLED response.',
    ' 尚不能确认串口控制可用。请核对端口、固件的 USB CDC / UART 编译选项及串口引脚占用；提高波特率不能解决接口未启用。':' Serial control is unconfirmed. Check the port, firmware USB CDC / UART build options and pin conflicts. A higher baud rate cannot enable an inactive interface.',
    '诊断失败：':'Diagnostics failed: ',
    'Adalight RGB（WLED 原生，先诊断）':'Adalight RGB (WLED native; run diagnostics first)',
    'WLED JSON（兼容模式）':'WLED JSON (compatibility mode)',
    '串口实验室 · Adalight / USB CDC':'Serial lab · Adalight / USB CDC',
    '先停止播放，再连接 ESP32 串口并运行诊断。只有收到 WLED 回包，才会开放 Adalight 发送。':'Stop playback, connect the ESP32 serial port and run diagnostics. Adalight output requires a WLED response.',
    '点击“选择 USB / Adalight”后，由 Chrome 或 Edge 显示系统串口选择窗口；网页不会保存或替别人决定 COM 端口。':'Use Select port to choose your controller in the browser serial-port dialog.',
    'UART 两端波特率必须一致，115200 对 15 × 27 RGB 理论约 9 FPS。PixelStudio-C3-USB-60 定制固件的原生 USB CDC 支持 60 FPS；网络 DDP 同样支持 60 FPS。':'UART baud rates must match. At 115200 baud, a 15 × 27 RGB matrix is limited to about 9 FPS. Native USB CDC with PixelStudio-C3-USB-60 firmware and network DDP support 60 FPS.',
    'Adalight 没有设备端逐帧确认。颜色与走线受 WLED 实时接收设置影响，请保留现有电流限制；不要同时运行 IP/DDP 播放。':'Adalight has no per-frame device acknowledgement. WLED realtime settings affect colors and pixel order. Keep current limits and do not run IP/DDP output simultaneously.',
    'IP / HTTP 无需串口连接。USB / Adalight 请使用支持 Web Serial 的桌面版 Chrome 或 Edge，并由用户亲自选择设备。':'IP / HTTP does not need a serial connection. For USB / Adalight, use desktop Chrome or Edge with Web Serial and select the device yourself.'
  });
  Object.assign(catalog,{"雨窗咖啡":"Rainy Window Cafe","水母花园":"Jellyfish Garden","星际列车":"Star Train","月夜露营":"Moonlit Camp","四季小树":"Four Seasons Tree","机械花园":"Mechanical Garden"});
  Object.assign(catalog,{
    '正在加载视频…':'Loading video…',
    '正在加载图片…':'Loading image…',
    '视频读取失败，请重新选择文件。':'Unable to read the video. Please choose a file again.',
    '图片读取失败，请重新选择文件。':'Unable to read the image. Please choose a file again.',
    '请选择图片或视频文件。':'Please choose an image or video file.'
  });
  const keys=Object.keys(catalog).sort((a,b)=>b.length-a.length);
  const pattern=new RegExp(keys.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  function translate(text){return text.replace(pattern,match=>catalog[match]);}
  window.pixelStudioFormatNotice = (text, kind = '') => {
    const source = String(text);
    if (language !== 'en') return source;
    const rendered = translate(source);
    if (!/\p{Script=Han}/u.test(rendered)) return rendered;
    // Device/OS messages are not controlled by our translation catalog.
    console.warn('[Pixel Studio diagnostic]', source);
    const prefix = rendered.split(/[:：]/, 1)[0];
    const context = !/\p{Script=Han}/u.test(prefix) && /failed|error|stopped|interrupted/i.test(prefix) ? prefix + '. ' : '';
    return context + (kind === 'err' || kind === 'error'
      ? 'The operation could not be completed. See the diagnostic console for the original details.'
      : 'Additional status details are available in the diagnostic console.');
  };
  function initialize(){
    const select=document.getElementById('webLanguage');if(!select)return;
    const originals=new WeakMap(),attributes=new WeakMap();
    const excluded='script,style,#log,#serialDiagnostic,[data-update-ui]';
    function update(){
      updateDocumentLanguage();
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const node=walker.currentNode;if(node.parentElement?.closest(excluded))continue;
        let record=originals.get(node);
        if(!record || node.nodeValue!==record.rendered)record={source:node.nodeValue};
        const value=language==='en'?translate(record.source):record.source;
        record.rendered=value;originals.set(node,record);if(node.nodeValue!==value)node.nodeValue=value;
      }
      document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(node=>{
        if(node.closest(excluded))return;
        const records=attributes.get(node)||{};
        for(const key of ['placeholder','aria-label','title']){
          if(!node.hasAttribute(key))continue;
          const current=node.getAttribute(key);let record=records[key];
          if(!record || current!==record.rendered)record={source:current};
          const value=language==='en'?translate(record.source):record.source;
          record.rendered=value;records[key]=record;if(current!==value)node.setAttribute(key,value);
        }attributes.set(node,records);
      });
    }
    select.value=preference;
    let scheduled=false;
    const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;observer.disconnect();update();observe();});});
    function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});}
    function notify(){window.dispatchEvent(new CustomEvent('pixel-studio-language-change',{detail:{language}}));}
    select.addEventListener('change',()=>{
      preference=['en','zh-CN'].includes(select.value)?select.value:'auto';
      language=resolveLanguage();select.value=preference;
      try{localStorage.setItem(storageKey,preference);}catch{}
      observer.disconnect();update();observe();notify();
    },{capture:true});
    window.addEventListener('languagechange',()=>{
      if(preference!=='auto')return;
      const next=resolveLanguage();if(next===language)return;
      language=next;observer.disconnect();update();observe();notify();
    });
    update();observe();
    notify();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
