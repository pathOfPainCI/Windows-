# 剪贴板工具

Windows 剪贴板历史与常用短语工具。

## 功能
- 剪贴板历史：自动记录复制的文本与图片，支持搜索、置顶、一键粘贴
- 常用短语：按分类（邮箱/地址/代码片段）管理，单击即粘贴
- 全局热键 `Ctrl+Shift+V` 呼出/隐藏；常驻系统托盘

## 开发
```bash
npm install      # 首次安装（会自动 electron-rebuild 原生模块）
npm run dev      # 开发模式
npm test         # 单元测试
npm run build:win  # 打包 Windows 安装包
```

## 数据位置
`%APPDATA%\clipboard-tool\`（history.json / snippets.json / groups.json / settings.json / images/）
