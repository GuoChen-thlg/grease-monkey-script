# 1.1.0

- 新增 `#/devtools` 远程调试页支持，日志来源于 WebSocket 实时数据（React fiber 树 / EventTarget 拦截缓存）。
- 新增悬浮筛选面板在 `#/devtools` 下的支持（类型/级别/关键词过滤、复制、日志预览）。
- 新增关键词双向同步：浮层面板 ↔ PageSpy 原生输入框。
- 新增日志级别双向同步：浮层面板（多选） ↔ PageSpy Select 组件（单选）。
- 新增工具栏"复制日志"按钮（`#/devtools`），读取当前筛选条件复制日志。
- 新增面板显隐状态持久化：首次使用自动弹出，后续恢复上次状态。
- 修复 `copyText` 行数统计不准确的问题（标题行/分隔空行导致多算）。
- 优化日志级别按钮激活态视觉区分度（`border-color` + 提亮 `lv-log` 背景）。
- 新增 `EventTarget.prototype.dispatchEvent` 拦截，缓存 PageSpy 分发的 console 事件。

# 1.0.0

- 浮动筛选面板（类型/级别/关键词），支持 GM_setClipboard 复制。
- 左侧面板内联日志展示（替换暂无数据），支持点击详情查看。
- 浮动筛选面板内直接展示日志列表，不再替换原生左侧面板。
- 固定 `ps-toggle-btn` 显示位置，避免拖动面板后按钮位置错乱。
- 支持 PageSpy replay 页中的 console 日志 `deflate` 压缩字符串格式，解压后再渲染/搜索/复制。
- 筛选状态持久化，使用 `GM_getValue` / `GM_setValue` 保存类型、级别和关键词；关闭按钮改为隐藏面板，可通过固定 toggle 按钮重新打开；筛选器仅在 `#/replay` 路由下生效，离开回放页自动清理。
- 网络请求（Network）数据解压展示；搜索高亮覆盖完整消息；超长日志默认折叠，可点击展开；`@match` 全局匹配。
