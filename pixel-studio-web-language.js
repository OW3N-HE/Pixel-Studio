(() => {
  'use strict';
  const catalog = {
    '关于 Pixel Studio':'About Pixel Studio','关于':'About','关闭':'Close',
    '新增':'New','手绘作品':'Hand-drawn',
    '设置':'Settings','语言':'Language','主题':'Theme','界面设置':'Interface settings',
    'WLED 输出设置':'WLED output settings','输出方式':'Output','USB 端口':'USB port','IP 地址':'IP address',
    '选择串口':'Select port','读取屏幕尺寸':'Read matrix size','屏幕尺寸':'Matrix size','快捷尺寸':'Size presets',
    '宽':'W','高':'H','圆角预览':'Rounded preview','排列':'Pixel order','帧率':'FPS','颜色还原':'Color matching',
    '亮度':'Brightness','速度':'Speed','样式':'Style','配色':'Colors','原始':'Original','原始配色':'Original',
    '自定义':'Custom','自定义配色':'Custom colors','高光颜色':'Highlight color','主色':'Main color','阴影颜色':'Shadow color',
    '冰蓝':'Ice blue','薄荷':'Mint','琥珀':'Amber','樱粉':'Rose','紫晶':'Amethyst',
    '圆角像素':'Rounded pixels','经典点阵':'Classic dots','七段数码':'Seven-segment',
    '小时':'Hours','分钟':'Minutes','分隔线':'Separator','动态时钟 · 自定义配色':'Clock · Custom colors',
    '全部':'All','收藏':'Favorites','自然':'Nature','氛围':'Ambient','趣味':'Fun','时钟':'Clock','信息':'Information',
    '随机播放':'Shuffle','秒':'s','没有符合条件的动画':'No matching animations',
    '搜索动画、时钟或手绘角色':'Search animations, clocks or characters',
    '导入媒体':'Import media','本地媒体':'Local media','图片 / 视频':'Image / video','画面适配':'Scaling',
    '选择本地图片或视频，在当前像素屏尺寸下预览和播放。':'Choose a local image or video to preview and play on your pixel matrix.',
    '关闭设置':'Close settings','关闭媒体导入':'Close media import','关闭配色':'Close colors','播放':'Play','停止播放':'Stop',
    '向所选设备发送动画':'Send animation to the selected device','发送帧率':'Output frame rate','动画速度倍数':'Animation speed multiplier',
    '随机播放间隔，秒':'Shuffle interval in seconds','逐行，从左到右':'Rows, left to right',
    '吉伊 · 害羞眨眼':'Chiikawa · Shy Blink','草莓小盆栽':'Strawberry Planter','星海小鲸':'Starry Whale',
    '晚风风铃':'Evening Wind Chime','星星小团子':'Little Star Dumpling','吉伊 · 勇气踏步':'Chiikawa · Brave Steps',
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
    '已停止':'Stopped','已切换到':'Selected: ','正在本地预览':'Previewing locally','持续发送中':'Sending',
    '开始发送':'Starting output','发送':'Sending','取消收藏：':'Remove favorite: ','收藏：':'Favorite: ',
    '匹配网页颜色（推荐）':'Match web colors (recommended)','开始发送时读取设备颜色配置':'Read device color configuration when starting output',
    '此浏览器未提供 Web Serial。USB 输出请在支持该功能的桌面 Chrome 或 Edge 中打开。':'Web Serial is unavailable here. Open in a supported desktop Chrome or Edge browser for USB output.'
  };
  const keys=Object.keys(catalog).sort((a,b)=>b.length-a.length);
  const pattern=new RegExp(keys.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  function translate(text){return text.replace(pattern,match=>catalog[match]);}
  function initialize(){
    const select=document.getElementById('webLanguage');if(!select)return;
    let language='zh-CN';try{language=localStorage.getItem('pixelStudioWebLanguage')==='en'?'en':'zh-CN';}catch{}
    const originals=new WeakMap(),attributes=new WeakMap();
    function update(){
      document.documentElement.lang=language;
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const node=walker.currentNode;if(node.parentElement?.closest('script,style,#log,#serialDiagnostic,[data-update-ui]'))continue;
        let record=originals.get(node);
        if(!record || node.nodeValue!==record.rendered)record={source:node.nodeValue};
        const value=language==='en'?translate(record.source):record.source;
        record.rendered=value;originals.set(node,record);if(node.nodeValue!==value)node.nodeValue=value;
      }
      document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(node=>{
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
    select.value=language;
    let scheduled=false;
    const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;observer.disconnect();update();observe();});});
    function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});}
    select.addEventListener('change',()=>{language=select.value;try{localStorage.setItem('pixelStudioWebLanguage',language);}catch{}update();});
    update();observe();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
