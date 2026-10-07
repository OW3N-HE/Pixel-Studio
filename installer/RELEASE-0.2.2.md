# Pixel Studio V0.2.2

## English

### Changes

- Reduced hidden-window previews, thumbnail rendering and UI refresh in Desktop, Web and OpenRGB. Active device output and temperature sampling continue while the interface is hidden; visible content resynchronizes on return.
- Moved temperature updates to an independent backend sampling loop with cached snapshot reads. Removed duplicate hardware requests and the blanket five-second expiry; completed failures retain diagnostics rather than presenting old readings as new samples.
- Separated the three playback lines into selected content, Preview/Output/Operation failed, and USB/DDP connection indicators plus sending FPS. Full error details are available on hover and in diagnostic logs.
- Added themed dialogs for successful and failed size reads, shortened English labels and refined portrait settings.
- Improved Web/Desktop USB reply verification and unplug-state handling. Automatic reply waiting is approximately 0.5 seconds, separate from OS port-opening and closing time.
- Updated all Logos and the help page: original geometry and size, no outer glow, retained highlight borders and a theme-tinted gray center tile.
- Removed redundant shared styles, obsolete startup fallback layouts and unused parsing helpers. Fixed startup initialization order and completed the source archive's regression-file list.

## 简体中文

### 更新内容

- 减少桌面最小化或收进托盘、网页隐藏及 OpenRGB 面板隐藏时的预览、缩略图和界面刷新；已有设备输出与温度采样继续运行，恢复可见时同步当前内容。
- 温度改为后台独立定时采样，接口读取缓存快照；减少重复硬件请求，移除统一五秒过期规则。读取失败保留诊断信息，不将旧读数冒充新采样。
- 底部三行分别显示选中内容、本地预览／输出／操作失败，以及 USB/DDP 连接状态圆点和发送 FPS；完整错误通过悬停及诊断日志查看，减少重复提示。
- 读取尺寸成功和失败均使用主题内弹窗；精简英文文案，优化竖版设置布局。
- 改善网页／桌面 USB 回复验证和拔出后的状态更新；自动回复等待约 0.5 秒，不包含系统打开和关闭串口的耗时。
- 统一各版本及帮助页 Logo：保持原有几何与尺寸，去除外泛光，保留高光边框，中间方块恢复带主题色的灰色。
- 清理冗余共享样式、旧启动回退布局及无用解析助手；修正启动初始化顺序，补齐源码归档的回归文件清单。
