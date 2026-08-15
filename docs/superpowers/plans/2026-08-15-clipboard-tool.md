# 剪贴板历史与常用短语工具 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Windows 上构建一个常驻的 Electron + React 剪贴板历史与常用短语工具：自动记录文本/图片、按分类管理短语、搜索、一键粘贴、全局热键显隐。

**Architecture:** Electron 双进程。主进程负责剪贴板轮询、一键粘贴注入（nut.js）、JSON 持久化、托盘与全局热键；渲染进程（React）是无边框浮窗 UI。纯逻辑（去重/淘汰/过滤/存储）与 OS 胶水分离，前者用 Vitest 做 TDD，后者手动验证。

**Tech Stack:** Electron 33 · React 18 · Vite 5 / electron-vite 2 · TypeScript 5 · Vitest 2 · @nut-tree-fork/nut-js 4 · electron-builder 25

**Spec:** [docs/superpowers/specs/2026-08-15-clipboard-tool-design.md](../specs/2026-08-15-clipboard-tool-design.md)

## Global Constraints

- 平台仅 Windows；所有路径用 `path.join`，不用硬编码 `/`。
- Node/Electron 版本：Electron `^33`，Node 22 运行时。
- 数据目录：`%APPDATA%\clipboard-tool\`（代码中用 `app.getPath('appData')` 拼接，测试注入临时目录）。
- 历史上限默认 **200** 条（`historyLimit`），置顶项不淘汰，连续重复去重。
- 默认全局热键 `Ctrl+Shift+V`，默认置顶 `alwaysOnTop=true`，默认「粘贴后不自动收起」`autoHideOnPaste=false`，默认主题 `dark`。
- 默认分类 `['邮箱','地址','代码片段']`。
- 复制/命名规则：所有中文 UI 文案直接写在组件里；代码注释用中文；提交信息用 `feat:`/`fix:`/`test:`/`chore:` 前缀。
- 原生模块 `@nut-tree-fork/nut-js` 必须用 `@electron/rebuild` 针对 Electron ABI 重编译，且在主进程构建配置里 `external`。
- 每一步提交到 git（本计划 Task 0 会先 `git init`）。

---

## 文件结构总览

```
剪切板工具/
├── package.json
├── electron.vite.config.ts
├── electron-builder.yml
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── shared/
│   │   ├── types.ts          # 共享类型 + 默认值
│   │   ├── api.ts            # preload 暴露的 API 类型
│   │   ├── history.ts        # 纯函数：去重/淘汰/过滤历史
│   │   └── snippets.ts       # 纯函数：过滤/分组短语
│   ├── main/
│   │   ├── index.ts          # 主进程入口：创建窗口/托盘/热键/服务
│   │   ├── store.ts          # JSON + 图片持久化（可注入目录）
│   │   ├── clipboard-service.ts # 剪贴板轮询监听
│   │   ├── paste-service.ts     # 写剪贴板 + nut.js 注入 Ctrl+V
│   │   ├── tray.ts           # 系统托盘
│   │   ├── global-shortcut.ts   # 全局热键
│   │   ├── ipc.ts            # ipcMain 处理器
│   │   └── window.ts         # 浮窗创建（无边框/置顶/透明）
│   ├── preload/
│   │   └── index.ts          # contextBridge 暴露 window.api
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── styles.css
│           ├── api.ts        # 对 window.api 的类型化封装
│           └── components/
│               ├── SearchBar.tsx
│               ├── Sidebar.tsx
│               ├── ItemList.tsx
│               ├── TextItem.tsx
│               ├── ImageItem.tsx
│               ├── SnippetEditor.tsx
│               └── SettingsPanel.tsx
└── tests/
    ├── history.test.ts
    ├── snippets.test.ts
    └── store.test.ts
```

---

### Task 0: 项目脚手架 + git 初始化

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `vitest.config.ts`, `.gitignore`, `electron-builder.yml`
- Create: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/src/main.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`

**Interfaces:**
- Produces: 可运行的 `npm run dev` 空窗口；目录结构；git 仓库。

- [ ] **Step 1: 初始化 git 并写入 package.json**

```bash
cd "c:/Users/Administrator/Desktop/剪切板工具"
git init
```

写入 `package.json`：

```json
{
  "name": "clipboard-tool",
  "version": "0.1.0",
  "description": "剪贴板历史与常用短语工具",
  "main": "./out/main/index.js",
  "author": "local",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "test": "vitest run",
    "rebuild": "electron-rebuild -f -w @nut-tree-fork/nut-js",
    "build:win": "electron-vite build && electron-builder --win",
    "postinstall": "electron-rebuild -f -w @nut-tree-fork/nut-js"
  },
  "devDependencies": {
    "@electron/rebuild": "^3.7.0",
    "@types/node": "^22.10.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8",
    "electron-vite": "^2.3.0",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  },
  "dependencies": {
    "@nut-tree-fork/nut-js": "^4.2.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
npm install
```

预期：安装成功。若 `postinstall` 的 `electron-rebuild` 因 nut-js 原生模块报错，先执行 `npm run rebuild`；仍失败则记录报错继续（nut-js 只在 Task 4 用到）。

- [ ] **Step 3: 写入构建与 TS 配置文件**

`electron.vite.config.ts`：

```typescript
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const sharedAlias = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: { rollupOptions: { external: ['@nut-tree-fork/nut-js'] } }
  },
  preload: { resolve: { alias: sharedAlias } },
  renderer: {
    resolve: { alias: { ...sharedAlias, '@renderer': resolve('src/renderer/src') } },
    plugins: [react()]
  }
})
```

`tsconfig.json`：

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "paths": { "@shared/*": ["./src/shared/*"] },
    "noEmit": true
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "electron.vite.config.ts"]
}
```

`tsconfig.web.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["node"],
    "paths": { "@shared/*": ["./src/shared/*"], "@renderer/*": ["./src/renderer/src/*"] },
    "noEmit": true
  },
  "include": ["src/renderer/src/**/*", "src/shared/**/*"]
}
```

`vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: { alias: { '@shared': resolve('src/shared') } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
})
```

`.gitignore`：

```
node_modules/
out/
dist/
*.log
.DS_Store
```

`electron-builder.yml`：

```yaml
appId: com.local.clipboard-tool
productName: 剪贴板工具
directories:
  output: dist
files:
  - out/**
win:
  target: nsis
```

- [ ] **Step 4: 写入最小可运行入口**

`src/main/index.ts`：

```typescript
import { app, BrowserWindow } from 'electron'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 420,
    height: 600,
    webPreferences: { preload: require('path').join(__dirname, '../preload/index.js') }
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(require('path').join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

`src/preload/index.ts`：

```typescript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', { ping: () => 'pong' })
```

`src/renderer/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'" />
    <title>剪贴板工具</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/renderer/src/main.tsx`：

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`src/renderer/src/App.tsx`：

```tsx
export default function App() {
  return <div className="app">剪贴板工具</div>
}
```

`src/renderer/src/styles.css`：

```css
html, body, #root { height: 100%; margin: 0; }
.app { padding: 16px; font-family: "Segoe UI", "Microsoft YaHei", sans-serif; }
```

- [ ] **Step 5: 运行验证空窗口**

Run: `npm run dev`
Expected: 弹出标题为「剪贴板工具」的窗口，显示文字「剪贴板工具」，无报错。关闭后退出。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: scaffold electron-vite react project"
```

---

### Task 1: 共享类型 + 历史/短语纯函数（TDD）

**Files:**
- Create: `src/shared/types.ts`, `src/shared/api.ts`, `src/shared/history.ts`, `src/shared/snippets.ts`
- Test: `tests/history.test.ts`, `tests/snippets.test.ts`

**Interfaces:**
- Produces:
  - `HistoryEntry { id, type: 'text'|'image', content, sourceApp, ts, pinned }`
  - `Snippet { id, group, title, content }`
  - `Settings { hotkey, alwaysOnTop, historyLimit, autoHideOnPaste, theme }`
  - `DEFAULT_SETTINGS`, `DEFAULT_GROUPS`
  - `isSameContent(a, b)`, `addEntry(list, entry)`, `evict(list, limit)`, `filterHistory(list, query)`
  - `filterSnippets(list, query)`, `groupSnippets(list)`

- [ ] **Step 1: 写共享类型**

`src/shared/types.ts`：

```typescript
export type EntryType = 'text' | 'image'

export interface HistoryEntry {
  id: string
  type: EntryType
  content: string
  sourceApp: string
  ts: number
  pinned: boolean
}

export interface Snippet {
  id: string
  group: string
  title: string
  content: string
}

export type Theme = 'light' | 'dark'

export interface Settings {
  hotkey: string
  alwaysOnTop: boolean
  historyLimit: number
  autoHideOnPaste: boolean
  theme: Theme
}

export const DEFAULT_SETTINGS: Settings = {
  hotkey: 'Ctrl+Shift+V',
  alwaysOnTop: true,
  historyLimit: 200,
  autoHideOnPaste: false,
  theme: 'dark'
}

export const DEFAULT_GROUPS = ['邮箱', '地址', '代码片段']
```

`src/shared/api.ts`：

```typescript
import type { HistoryEntry, Snippet, Settings } from './types'

export interface PasteResult {
  ok: boolean
  copiedOnly: boolean
}

export interface GroupMutationResult {
  groups: string[]
  snippets: Snippet[]
}

export interface ClipboardToolApi {
  getHistory(): Promise<HistoryEntry[]>
  getSnippets(): Promise<Snippet[]>
  getGroups(): Promise<string[]>
  getSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
  addSnippet(s: Omit<Snippet, 'id'>): Promise<Snippet[]>
  updateSnippet(s: Snippet): Promise<Snippet[]>
  deleteSnippet(id: string): Promise<Snippet[]>
  addGroup(name: string): Promise<string[]>
  renameGroup(oldName: string, newName: string): Promise<GroupMutationResult>
  deleteGroup(name: string): Promise<GroupMutationResult>
  deleteHistory(id: string): Promise<HistoryEntry[]>
  pinHistory(id: string): Promise<HistoryEntry[]>
  clearHistory(): Promise<HistoryEntry[]>
  pasteText(content: string): Promise<PasteResult>
  pasteImage(filename: string): Promise<PasteResult>
  getImageDataUrl(filename: string): Promise<string>
  hideWindow(): Promise<void>
  onHistoryChanged(cb: (entries: HistoryEntry[]) => void): () => void
}
```

- [ ] **Step 2: 写失败测试**

`tests/history.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { isSameContent, addEntry, evict, filterHistory } from '../src/shared/history'
import type { HistoryEntry } from '../src/shared/types'

function entry(partial: Partial<HistoryEntry> & { id?: string } = {}): HistoryEntry {
  return {
    id: partial.id ?? '1',
    type: 'text',
    content: 'hello',
    sourceApp: '',
    ts: 0,
    pinned: false,
    ...partial
  }
}

describe('isSameContent', () => {
  it('文本内容相同返回 true', () => {
    expect(isSameContent(entry({ content: 'a' }), entry({ content: 'a' }))).toBe(true)
  })
  it('文本内容不同返回 false', () => {
    expect(isSameContent(entry({ content: 'a' }), entry({ content: 'b' }))).toBe(false)
  })
  it('类型不同返回 false', () => {
    expect(isSameContent(entry({ type: 'text' }), entry({ type: 'image' }))).toBe(false)
  })
})

describe('addEntry', () => {
  it('空列表插入新条目', () => {
    expect(addEntry([], entry())).toHaveLength(1)
  })
  it('与最新一条相同则去重', () => {
    const list = [entry({ content: 'a' })]
    expect(addEntry(list, entry({ content: 'a' }))).toHaveLength(1)
  })
  it('不同则插到最前', () => {
    const list = [entry({ content: 'a' })]
    const next = addEntry(list, entry({ content: 'b' }))
    expect(next).toHaveLength(2)
    expect(next[0].content).toBe('b')
  })
})

describe('evict', () => {
  it('未超上限不变', () => {
    const list = [entry({ id: '1' }), entry({ id: '2' })]
    expect(evict(list, 5)).toHaveLength(2)
  })
  it('超上限淘汰最旧', () => {
    const list = [entry({ id: '1' }), entry({ id: '2' }), entry({ id: '3' })]
    const result = evict(list, 2)
    expect(result.map((e) => e.id)).toEqual(['1', '2'])
  })
  it('置顶项不淘汰', () => {
    const list = [
      entry({ id: '1', pinned: true }),
      entry({ id: '2' }),
      entry({ id: '3' })
    ]
    const result = evict(list, 2)
    expect(result.map((e) => e.id)).toEqual(['1', '2'])
  })
})

describe('filterHistory', () => {
  const list = [
    entry({ id: '1', content: 'john@example.com', sourceApp: 'Chrome' }),
    entry({ id: '2', content: '北京市海淀区', sourceApp: 'Notepad' }),
    entry({ id: '3', type: 'image', content: '1.png', sourceApp: 'Photos' })
  ]
  it('空查询返回全部', () => {
    expect(filterHistory(list, '')).toHaveLength(3)
  })
  it('按内容匹配', () => {
    expect(filterHistory(list, 'john')).toHaveLength(1)
  })
  it('按来源匹配', () => {
    expect(filterHistory(list, 'note')).toHaveLength(1)
  })
  it('不区分大小写', () => {
    expect(filterHistory(list, 'JOHN')).toHaveLength(1)
  })
})
```

`tests/snippets.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { filterSnippets, groupSnippets } from '../src/shared/snippets'
import type { Snippet } from '../src/shared/types'

const snippets: Snippet[] = [
  { id: '1', group: '邮箱', title: '工作', content: 'a@b.com' },
  { id: '2', group: '邮箱', title: '私人', content: 'c@d.com' },
  { id: '3', group: '地址', title: '公司', content: '北京市' }
]

describe('filterSnippets', () => {
  it('空查询返回全部', () => {
    expect(filterSnippets(snippets, '')).toHaveLength(3)
  })
  it('按标题匹配', () => {
    expect(filterSnippets(snippets, '工作')).toHaveLength(1)
  })
  it('按内容匹配', () => {
    expect(filterSnippets(snippets, 'c@d')).toHaveLength(1)
  })
})

describe('groupSnippets', () => {
  it('按 group 分组', () => {
    const map = groupSnippets(snippets)
    expect(map.get('邮箱')).toHaveLength(2)
    expect(map.get('地址')).toHaveLength(1)
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，报 `Cannot find module '../src/shared/history'`。

- [ ] **Step 4: 实现纯函数**

`src/shared/history.ts`：

```typescript
import type { HistoryEntry } from './types'

export function isSameContent(
  a: Pick<HistoryEntry, 'type' | 'content'>,
  b: Pick<HistoryEntry, 'type' | 'content'>
): boolean {
  return a.type === b.type && a.content === b.content
}

export function addEntry(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  if (list.length > 0 && isSameContent(list[0], entry)) {
    return list
  }
  return [entry, ...list]
}

export function evict(list: HistoryEntry[], limit: number): HistoryEntry[] {
  if (list.length <= limit) return list
  const pinned = list.filter((e) => e.pinned)
  const unpinned = list.filter((e) => !e.pinned)
  if (pinned.length > limit) return pinned.slice(0, limit)
  return [...pinned, ...unpinned.slice(0, limit - pinned.length)]
}

export function filterHistory(list: HistoryEntry[], query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter((e) => {
    const content = e.type === 'text' ? e.content : ''
    return content.toLowerCase().includes(q) || e.sourceApp.toLowerCase().includes(q)
  })
}
```

`src/shared/snippets.ts`：

```typescript
import type { Snippet } from './types'

export function filterSnippets(list: Snippet[], query: string): Snippet[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
  )
}

export function groupSnippets(list: Snippet[]): Map<string, Snippet[]> {
  const map = new Map<string, Snippet[]>()
  for (const s of list) {
    const arr = map.get(s.group) ?? []
    arr.push(s)
    map.set(s.group, arr)
  }
  return map
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test`
Expected: PASS，全部通过。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: add shared types and pure history/snippet logic"
```

---

### Task 2: Store 持久化（TDD）

**Files:**
- Create: `src/main/store.ts`
- Test: `tests/store.test.ts`

**Interfaces:**
- Consumes: `HistoryEntry`, `Snippet`, `Settings`, `DEFAULT_SETTINGS`, `DEFAULT_GROUPS`（Task 1）；`addEntry`, `evict`（Task 1）
- Produces: `class Store`，方法 `init/getHistory/addHistory/removeHistory/pinHistory/clearHistory/getSnippets/addSnippet/updateSnippet/deleteSnippet/getGroups/addGroup/renameGroup/deleteGroup/getSettings/saveSettings/saveImage/loadImage/deleteImage`。构造签名 `new Store(baseDir: string)`。

- [ ] **Step 1: 写失败测试（用临时目录）**

`tests/store.test.ts`：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Store } from '../src/main/store'
import { DEFAULT_GROUPS, DEFAULT_SETTINGS } from '../src/shared/types'

let dir: string
let store: Store

beforeEach(async () => {
  dir = join(tmpdir(), `clipboard-test-${Math.random().toString(36).slice(2)}`)
  store = new Store(dir)
  await store.init()
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('history', () => {
  it('初始为空', () => {
    expect(store.getHistory()).toEqual([])
  })
  it('addHistory 插入并持久化', async () => {
    await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    expect(store.getHistory()).toHaveLength(1)
    const reloaded = new Store(dir)
    await reloaded.init()
    expect(reloaded.getHistory()).toHaveLength(1)
  })
  it('连续重复去重', async () => {
    await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    expect(store.getHistory()).toHaveLength(1)
  })
  it('removeHistory 删除指定条目', async () => {
    const [list] = [await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })]
    await store.removeHistory(list[0].id)
    expect(store.getHistory()).toHaveLength(0)
  })
  it('pinHistory 切换置顶', async () => {
    const list = await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    await store.pinHistory(list[0].id)
    expect(store.getHistory()[0].pinned).toBe(true)
  })
})

describe('snippets', () => {
  it('addSnippet 新增', async () => {
    await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    expect(store.getSnippets()).toHaveLength(1)
  })
  it('updateSnippet 修改', async () => {
    const list = await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    await store.updateSnippet({ ...list[0], title: 'b' })
    expect(store.getSnippets()[0].title).toBe('b')
  })
  it('deleteSnippet 删除', async () => {
    const list = await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    await store.deleteSnippet(list[0].id)
    expect(store.getSnippets()).toHaveLength(0)
  })
})

describe('groups', () => {
  it('默认分组', () => {
    expect(store.getGroups()).toEqual(DEFAULT_GROUPS)
  })
  it('addGroup 新增分组', async () => {
    await store.addGroup('测试')
    expect(store.getGroups()).toContain('测试')
  })
  it('deleteGroup 删除分组及其短语', async () => {
    await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    await store.deleteGroup('邮箱')
    expect(store.getGroups()).not.toContain('邮箱')
    expect(store.getSnippets()).toHaveLength(0)
  })
})

describe('settings', () => {
  it('默认设置', () => {
    expect(store.getSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('saveSettings 持久化', async () => {
    await store.saveSettings({ ...DEFAULT_SETTINGS, historyLimit: 50 })
    const reloaded = new Store(dir)
    await reloaded.init()
    expect(reloaded.getSettings().historyLimit).toBe(50)
  })
})

describe('corruption recovery', () => {
  it('损坏的 history.json 回退为空', async () => {
    await fs.writeFile(join(dir, 'history.json'), '{broken', 'utf-8')
    const s = new Store(dir)
    await s.init()
    expect(s.getHistory()).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，报 `Cannot find module '../src/main/store'`。

- [ ] **Step 3: 实现 Store**

`src/main/store.ts`：

```typescript
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { HistoryEntry, Settings, Snippet } from '@shared/types'
import { DEFAULT_GROUPS, DEFAULT_SETTINGS } from '@shared/types'
import { addEntry, evict } from '@shared/history'

type NewHistoryEntry = Pick<HistoryEntry, 'type' | 'content' | 'sourceApp'> & { ts?: number }
type NewSnippet = Omit<Snippet, 'id'>

export interface GroupMutationResult {
  groups: string[]
  snippets: Snippet[]
}

export class Store {
  private history: HistoryEntry[] = []
  private snippets: Snippet[] = []
  private groups: string[] = [...DEFAULT_GROUPS]
  private settings: Settings = { ...DEFAULT_SETTINGS }

  constructor(private baseDir: string) {}

  async init(): Promise<void> {
    await fs.mkdir(join(this.baseDir, 'images'), { recursive: true })
    this.history = await this.readJson<HistoryEntry[]>('history.json', [])
    this.snippets = await this.readJson<Snippet[]>('snippets.json', [])
    this.groups = await this.readJson<string[]>('groups.json', [...DEFAULT_GROUPS])
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.readJson<Partial<Settings>>('settings.json', {}))
    }
  }

  private file(name: string): string {
    return join(this.baseDir, name)
  }

  private async readJson<T>(name: string, fallback: T): Promise<T> {
    try {
      const raw = await fs.readFile(this.file(name), 'utf-8')
      return JSON.parse(raw) as T
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        try {
          await fs.rename(this.file(name), `${this.file(name)}.bak`)
        } catch {
          /* 备份失败可忽略 */
        }
      }
      return fallback
    }
  }

  private async writeJson(name: string, data: unknown): Promise<void> {
    await fs.writeFile(this.file(name), JSON.stringify(data, null, 2), 'utf-8')
  }

  // —— 历史 ——
  getHistory(): HistoryEntry[] {
    return this.history
  }

  async addHistory(entry: NewHistoryEntry): Promise<HistoryEntry[]> {
    const full: HistoryEntry = {
      id: randomUUID(),
      ts: entry.ts ?? Date.now(),
      pinned: false,
      type: entry.type,
      content: entry.content,
      sourceApp: entry.sourceApp
    }
    this.history = evict(addEntry(this.history, full), this.settings.historyLimit)
    await this.writeJson('history.json', this.history)
    return this.history
  }

  async removeHistory(id: string): Promise<HistoryEntry[]> {
    const target = this.history.find((e) => e.id === id)
    this.history = this.history.filter((e) => e.id !== id)
    await this.writeJson('history.json', this.history)
    if (target?.type === 'image') await this.deleteImage(target.content)
    return this.history
  }

  async pinHistory(id: string): Promise<HistoryEntry[]> {
    this.history = this.history.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e))
    await this.writeJson('history.json', this.history)
    return this.history
  }

  async clearHistory(): Promise<HistoryEntry[]> {
    for (const e of this.history) {
      if (e.type === 'image') await this.deleteImage(e.content)
    }
    this.history = []
    await this.writeJson('history.json', this.history)
    return this.history
  }

  // —— 短语 ——
  getSnippets(): Snippet[] {
    return this.snippets
  }

  async addSnippet(s: NewSnippet): Promise<Snippet[]> {
    this.snippets = [{ id: randomUUID(), ...s }, ...this.snippets]
    await this.writeJson('snippets.json', this.snippets)
    return this.snippets
  }

  async updateSnippet(s: Snippet): Promise<Snippet[]> {
    this.snippets = this.snippets.map((x) => (x.id === s.id ? s : x))
    await this.writeJson('snippets.json', this.snippets)
    return this.snippets
  }

  async deleteSnippet(id: string): Promise<Snippet[]> {
    this.snippets = this.snippets.filter((s) => s.id !== id)
    await this.writeJson('snippets.json', this.snippets)
    return this.snippets
  }

  // —— 分组 ——
  getGroups(): string[] {
    return this.groups
  }

  async addGroup(name: string): Promise<string[]> {
    if (!this.groups.includes(name)) {
      this.groups = [...this.groups, name]
      await this.writeJson('groups.json', this.groups)
    }
    return this.groups
  }

  async renameGroup(oldName: string, newName: string): Promise<GroupMutationResult> {
    this.groups = this.groups.map((g) => (g === oldName ? newName : g))
    this.snippets = this.snippets.map((s) => (s.group === oldName ? { ...s, group: newName } : s))
    await this.writeJson('groups.json', this.groups)
    await this.writeJson('snippets.json', this.snippets)
    return { groups: this.groups, snippets: this.snippets }
  }

  async deleteGroup(name: string): Promise<GroupMutationResult> {
    this.groups = this.groups.filter((g) => g !== name)
    this.snippets = this.snippets.filter((s) => s.group !== name)
    await this.writeJson('groups.json', this.groups)
    await this.writeJson('snippets.json', this.snippets)
    return { groups: this.groups, snippets: this.snippets }
  }

  // —— 设置 ——
  getSettings(): Settings {
    return this.settings
  }

  async saveSettings(s: Settings): Promise<void> {
    this.settings = s
    await this.writeJson('settings.json', s)
  }

  // —— 图片 ——
  async saveImage(buffer: Buffer): Promise<string> {
    const name = `${Date.now()}-${randomUUID()}.png`
    await fs.writeFile(join(this.baseDir, 'images', name), buffer)
    return name
  }

  async loadImage(filename: string): Promise<Buffer> {
    return fs.readFile(join(this.baseDir, 'images', filename))
  }

  async deleteImage(filename: string): Promise<void> {
    try {
      await fs.unlink(join(this.baseDir, 'images', filename))
    } catch {
      /* 文件不存在可忽略 */
    }
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add JSON store with corruption recovery"
```

---

### Task 3: 剪贴板监听服务

**Files:**
- Create: `src/main/clipboard-service.ts`

**Interfaces:**
- Consumes: `Store`（Task 2）
- Produces: `class ClipboardService`，`new ClipboardService(store, onChange?)`，方法 `start(intervalMs?)` / `stop()`；变化时调用 `onChange(entries)` 并 `store.addHistory(...)`。

- [ ] **Step 1: 实现 ClipboardService**

`src/main/clipboard-service.ts`：

```typescript
import { clipboard } from 'electron'
import { createHash } from 'node:crypto'
import type { HistoryEntry } from '@shared/types'
import type { Store } from './store'

function hashString(s: string): string {
  return createHash('sha1').update(s).digest('hex')
}

function hashBuffer(b: Buffer): string {
  return createHash('sha1').update(b).digest('hex')
}

export class ClipboardService {
  private lastHash: string | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(
    private store: Store,
    private onChange?: (entries: HistoryEntry[]) => void
  ) {}

  start(intervalMs = 500): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.poll(), intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async poll(): Promise<void> {
    const text = clipboard.readText()
    const img = clipboard.readImage()

    if (!img.isEmpty()) {
      const buf = img.toPNG()
      const hash = hashBuffer(buf)
      if (hash === this.lastHash) return
      this.lastHash = hash
      const filename = await this.store.saveImage(buf)
      const entries = await this.store.addHistory({ type: 'image', content: filename, sourceApp: '' })
      this.onChange?.(entries)
      return
    }

    if (text && text.trim() !== '') {
      const hash = hashString(text)
      if (hash === this.lastHash) return
      this.lastHash = hash
      const entries = await this.store.addHistory({ type: 'text', content: text, sourceApp: '' })
      this.onChange?.(entries)
    }
  }
}
```

- [ ] **Step 2: 手动验证**

Run: `npm run dev`，在应用运行时复制一段文本（如「测试文本」），观察 `%APPDATA%\clipboard-tool\history.json` 是否新增条目；再次复制相同文本，确认不重复。再复制一张图片，确认 `images/` 生成 PNG 且 history 新增 `type:image`。

> 注：`sourceApp` 在 MVP 记录为空字符串（获取前台窗口标题需额外原生依赖，留待后续增强，数据字段已按 spec 预留）。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: add clipboard polling service"
```

---

### Task 4: 一键粘贴服务（nut.js 注入）

**Files:**
- Create: `src/main/paste-service.ts`

**Interfaces:**
- Consumes: `Store`（Task 2）
- Produces: `class PasteService`，`new PasteService(store)`，方法 `pasteText(content): Promise<PasteResult>`、`pasteImage(filename): Promise<PasteResult>`。`PasteResult = { ok, copiedOnly }`。

- [ ] **Step 1: 实现 PasteService**

`src/main/paste-service.ts`：

```typescript
import { clipboard, nativeImage } from 'electron'
import { keyboard, Key } from '@nut-tree-fork/nut-js'
import type { PasteResult } from '@shared/api'
import type { Store } from './store'

export class PasteService {
  constructor(private store: Store) {}

  async pasteText(content: string): Promise<PasteResult> {
    clipboard.writeText(content)
    return this.inject()
  }

  async pasteImage(filename: string): Promise<PasteResult> {
    try {
      const buf = await this.store.loadImage(filename)
      const img = nativeImage.createFromBuffer(buf)
      if (img.isEmpty()) return { ok: false, copiedOnly: true }
      clipboard.writeImage(img)
      return this.inject()
    } catch {
      return { ok: false, copiedOnly: true }
    }
  }

  private async inject(): Promise<PasteResult> {
    try {
      await keyboard.pressKey(Key.LeftControl, Key.V)
      await keyboard.releaseKey(Key.LeftControl, Key.V)
      return { ok: true, copiedOnly: false }
    } catch {
      return { ok: false, copiedOnly: true }
    }
  }
}
```

- [ ] **Step 2: 确认原生模块已针对 Electron 重编译**

Run: `npm run rebuild`
Expected: nut-js 原生模块重编译成功，无 ABI 报错。

- [ ] **Step 3: 手动验证**

在 `src/main/index.ts` 临时加入调用后 `npm run dev`，复制文本后触发 `pasteText`，确认内容被粘贴到记事本。验证后移除临时调用。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: add paste service with nut-js injection"
```

---

### Task 5: 窗口 + 托盘 + 全局热键

**Files:**
- Create: `src/main/window.ts`, `src/main/tray.ts`, `src/main/global-shortcut.ts`

**Interfaces:**
- Consumes: `Settings`（Task 1）
- Produces:
  - `createMainWindow(): BrowserWindow`（无边框、置顶、透明、可拖拽）
  - `class TrayManager`，`new TrayManager(win, callbacks)`，`build()`；回调 `{ toggleWindow, setAlwaysOnTop, quit }`
  - `registerHotkey(accelerator, onTrigger): boolean`，`unregisterHotkey()`

- [ ] **Step 1: 实现浮窗**

`src/main/window.ts`：

```typescript
import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 320,
    minHeight: 400,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
```

- [ ] **Step 2: 实现托盘**

`src/main/tray.ts`：

```typescript
import { Tray, Menu, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'

export interface TrayCallbacks {
  toggleWindow(): void
  setAlwaysOnTop(value: boolean): void
  quit(): void
}

export class TrayManager {
  private tray: Tray | null = null

  constructor(
    private win: BrowserWindow,
    private cb: TrayCallbacks
  ) {}

  build(): void {
    const icon = nativeImage.createEmpty()
    this.tray = new Tray(icon)
    this.tray.setToolTip('剪贴板工具')
    const menu = Menu.buildFromTemplate([
      { label: '显示/隐藏', click: () => this.cb.toggleWindow() },
      {
        label: '窗口置顶',
        type: 'checkbox',
        checked: true,
        click: (item) => this.cb.setAlwaysOnTop(item.checked)
      },
      { type: 'separator' },
      { label: '退出', click: () => this.cb.quit() }
    ])
    this.tray.setContextMenu(menu)
    this.tray.on('click', () => this.cb.toggleWindow())
  }
}
```

> 注：`nativeImage.createEmpty()` 作为占位图标；正式图标后续可替换为 `.ico`/`.png`。

- [ ] **Step 3: 实现全局热键**

`src/main/global-shortcut.ts`：

```typescript
import { globalShortcut } from 'electron'

export function registerHotkey(accelerator: string, onTrigger: () => void): boolean {
  const ok = globalShortcut.register(accelerator, onTrigger)
  if (!ok) {
    console.warn(`[global-shortcut] 注册失败（可能被占用）: ${accelerator}`)
  }
  return ok
}

export function unregisterHotkey(): void {
  globalShortcut.unregisterAll()
}
```

- [ ] **Step 4: 手动验证**

`npm run dev`，确认：窗口无边框、置顶；托盘图标出现且菜单可用；按 `Ctrl+Shift+V` 可切换显示/隐藏（先临时接线，Task 6 正式接入）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add floating window, tray and global hotkey"
```

---

### Task 6: IPC + preload 接线

**Files:**
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`, `src/preload/index.ts`

**Interfaces:**
- Consumes: `Store`, `ClipboardService`, `PasteService`, `TrayManager`, `registerHotkey`（Task 2–5）
- Produces: `registerIpc(...)` 注册全部 `ipcMain.handle`；`window.api` 完整实现 `ClipboardToolApi`。

- [ ] **Step 1: 实现 IPC 处理器**

`src/main/ipc.ts`：

```typescript
import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { Settings, Snippet } from '@shared/types'
import type { ClipboardToolApi } from '@shared/api'
import type { Store } from './store'
import type { PasteService } from './paste-service'

export function registerIpc(
  store: Store,
  pasteService: PasteService,
  win: BrowserWindow
): void {
  const handle = (channel: string, fn: (...args: never[]) => unknown): void => {
    ipcMain.handle(channel, (_event, ...args) => fn(...(args as never[])))
  }

  handle('getHistory', () => store.getHistory())
  handle('getSnippets', () => store.getSnippets())
  handle('getGroups', () => store.getGroups())
  handle('getSettings', () => store.getSettings())
  handle('saveSettings', (s: Settings) => store.saveSettings(s))
  handle('addSnippet', (s: Omit<Snippet, 'id'>) => store.addSnippet(s))
  handle('updateSnippet', (s: Snippet) => store.updateSnippet(s))
  handle('deleteSnippet', (id: string) => store.deleteSnippet(id))
  handle('addGroup', (name: string) => store.addGroup(name))
  handle('renameGroup', (o: string, n: string) => store.renameGroup(o, n))
  handle('deleteGroup', (name: string) => store.deleteGroup(name))
  handle('deleteHistory', (id: string) => store.removeHistory(id))
  handle('pinHistory', (id: string) => store.pinHistory(id))
  handle('clearHistory', () => store.clearHistory())
  handle('pasteText', (content: string) => pasteService.pasteText(content))
  handle('pasteImage', (filename: string) => pasteService.pasteImage(filename))
  handle('getImageDataUrl', async (filename: string) => {
    const buf = await store.loadImage(filename)
    return `data:image/png;base64,${buf.toString('base64')}`
  })
  handle('hideWindow', () => win.hide())
}
```

> 注：剪贴板变化推送不在 ipc.ts 里做，而是由 `index.ts` 在构造 `ClipboardService` 时通过构造函数注入 `onChange` 回调（见 Step 2），职责更清晰。

- [ ] **Step 2: 重写主进程入口**

`src/main/index.ts`：

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { Store } from './store'
import { ClipboardService } from './clipboard-service'
import { PasteService } from './paste-service'
import { createMainWindow } from './window'
import { TrayManager } from './tray'
import { registerHotkey, unregisterHotkey } from './global-shortcut'
import { registerIpc } from './ipc'
import type { HistoryEntry } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

let win: BrowserWindow | null = null

app.whenReady().then(async () => {
  const store = new Store(join(app.getPath('appData'), 'clipboard-tool'))
  await store.init()
  const settings = store.getSettings()

  win = createMainWindow()

  const pasteService = new PasteService(store)
  const clipboardService = new ClipboardService(store, (entries: HistoryEntry[]) => {
    if (win && !win.isDestroyed()) win.webContents.send('history-changed', entries)
  })
  clipboardService.start(500)

  registerIpc(store, pasteService, win)

  const tray = new TrayManager(win, {
    toggleWindow: () => {
      if (win && !win.isDestroyed()) {
        win.isVisible() ? win.hide() : win.show()
      }
    },
    setAlwaysOnTop: (v) => {
      win?.setAlwaysOnTop(v)
      void store.saveSettings({ ...store.getSettings(), alwaysOnTop: v })
    },
    quit: () => app.quit()
  })
  tray.build()

  registerHotkey(settings.hotkey, () => {
    if (win && !win.isDestroyed()) {
      win.isVisible() ? win.hide() : win.show()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      win = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  unregisterHotkey()
  app.quit()
})

app.on('will-quit', () => {
  unregisterHotkey()
})
```

- [ ] **Step 3: 实现 preload**

`src/preload/index.ts`：

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { ClipboardToolApi } from '@shared/api'
import type { HistoryEntry } from '@shared/types'

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

const api: ClipboardToolApi = {
  getHistory: () => invoke('getHistory') as Promise<HistoryEntry[]>,
  getSnippets: () => invoke('getSnippets') as Promise<unknown[]> as never,
  getGroups: () => invoke('getGroups') as Promise<string[]>,
  getSettings: () => invoke('getSettings') as never,
  saveSettings: (s) => invoke('saveSettings', s) as Promise<void>,
  addSnippet: (s) => invoke('addSnippet', s) as never,
  updateSnippet: (s) => invoke('updateSnippet', s) as never,
  deleteSnippet: (id) => invoke('deleteSnippet', id) as never,
  addGroup: (name) => invoke('addGroup', name) as Promise<string[]>,
  renameGroup: (o, n) => invoke('renameGroup', o, n) as never,
  deleteGroup: (name) => invoke('deleteGroup', name) as never,
  deleteHistory: (id) => invoke('deleteHistory', id) as never,
  pinHistory: (id) => invoke('pinHistory', id) as never,
  clearHistory: () => invoke('clearHistory') as never,
  pasteText: (content) => invoke('pasteText', content) as never,
  pasteImage: (filename) => invoke('pasteImage', filename) as never,
  getImageDataUrl: (filename) => invoke('getImageDataUrl', filename) as Promise<string>,
  hideWindow: () => invoke('hideWindow') as Promise<void>,
  onHistoryChanged: (cb) => {
    const listener = (_e: unknown, entries: HistoryEntry[]) => cb(entries)
    ipcRenderer.on('history-changed', listener)
    return () => ipcRenderer.removeListener('history-changed', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
```

> 注：上述 `as never` 是为绕过 TS 对 `invoke` 泛型推断的临时写法；实现时用明确的类型断言保持 `ClipboardToolApi` 类型完整（见 Task 7 的 `renderer/api.ts`，它会作为权威类型，preload 只需与之一致）。若 TS 报类型不匹配，用 `as ClipboardToolApi` 结尾即可。

- [ ] **Step 4: 手动验证**

`npm run dev`，在 DevTools 控制台执行 `await window.api.getHistory()`、`await window.api.getSnippets()`，确认返回正确数据；复制文本后确认渲染进程收到 `history-changed`（控制台监听验证）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: wire IPC and preload API"
```

---

### Task 7: 渲染层状态与整体布局

**Files:**
- Create: `src/renderer/src/api.ts`
- Modify: `src/renderer/src/App.tsx`, `src/renderer/src/main.tsx`, `src/renderer/src/styles.css`
- Create: `src/renderer/src/components/Sidebar.tsx`, `SearchBar.tsx`, `ItemList.tsx`

**Interfaces:**
- Consumes: `ClipboardToolApi`、`HistoryEntry`、`Snippet`（Task 1）
- Produces: `window.api` 的类型声明（`src/renderer/src/api.ts` 导出的 `api`）；`App` 维护 `history/snippets/groups/settings/tab/group/query` 状态，向下传 props。

- [ ] **Step 1: 渲染层 API 封装与类型声明**

`src/renderer/src/api.ts`：

```typescript
import type { ClipboardToolApi } from '@shared/api'

declare global {
  interface Window {
    api: ClipboardToolApi
  }
}

export const api: ClipboardToolApi = window.api
```

- [ ] **Step 2: 实现 App 骨架**

`src/renderer/src/App.tsx`：

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { HistoryEntry, Settings, Snippet } from '@shared/types'
import { api } from './api'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { ItemList } from './components/ItemList'

type Tab = 'history' | 'snippets'

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('snippets')
  const [group, setGroup] = useState<string>('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    void api.getHistory().then(setHistory)
    void api.getSnippets().then(setSnippets)
    void api.getGroups().then((g) => {
      setGroups(g)
      setGroup((cur) => cur || g[0] || '')
    })
    void api.getSettings().then(setSettings)
    return api.onHistoryChanged(setHistory)
  }, [])

  const filteredHistory = useMemo(() => {
    if (tab !== 'history') return []
    return history
  }, [tab, history])

  const filteredSnippets = useMemo(() => {
    if (tab !== 'snippets') return []
    return snippets.filter((s) => s.group === group)
  }, [tab, snippets, group])

  return (
    <div className={`app theme-${settings?.theme ?? 'dark'}`}>
      <SearchBar value={query} onChange={setQuery} />
      <div className="body">
        <Sidebar
          tab={tab}
          groups={groups}
          group={group}
          onTab={setTab}
          onGroup={setGroup}
          onAddSnippet={() => {}}
        />
        <ItemList
          entries={filteredHistory}
          snippets={filteredSnippets}
          query={query}
          onPasteText={() => {}}
          onPasteImage={() => {}}
        />
      </div>
    </div>
  )
}
```

> 注：本任务只搭骨架，`query` 过滤逻辑与交互回调在 Task 8 补齐；`ItemList` 的 props 以 Task 8 定义为准，此处先保持接口一致。

- [ ] **Step 3: 实现基础布局样式**

`src/renderer/src/styles.css`：

```css
:root {
  --bg: rgba(30, 30, 30, 0.92);
  --bg-elevated: rgba(50, 50, 50, 0.8);
  --fg: #e8e8e8;
  --fg-dim: #9a9a9a;
  --accent: #4f8cff;
  --border: rgba(255, 255, 255, 0.08);
}
.theme-light {
  --bg: rgba(250, 250, 250, 0.95);
  --bg-elevated: rgba(255, 255, 255, 0.9);
  --fg: #1a1a1a;
  --fg-dim: #6a6a6a;
  --border: rgba(0, 0, 0, 0.08);
}
html, body, #root { height: 100%; margin: 0; }
* { box-sizing: border-box; }
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--fg);
  background: var(--bg);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  user-select: none;
}
.body { flex: 1; display: flex; min-height: 0; }
```

- [ ] **Step 4: 实现 Sidebar / SearchBar / ItemList 骨架组件**

`src/renderer/src/components/SearchBar.tsx`：

```tsx
interface Props {
  value: string
  onChange(v: string): void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="searchbar">
      <input
        placeholder="搜索…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
```

`src/renderer/src/components/Sidebar.tsx`：

```tsx
type Tab = 'history' | 'snippets'

interface Props {
  tab: Tab
  groups: string[]
  group: string
  onTab(t: Tab): void
  onGroup(g: string): void
  onAddSnippet(): void
}

export function Sidebar({ tab, groups, group, onTab, onGroup, onAddSnippet }: Props) {
  return (
    <nav className="sidebar">
      <div className="nav-section">
        <button className={tab === 'snippets' ? 'active' : ''} onClick={() => onTab('snippets')}>
          短语
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => onTab('history')}>
          历史
        </button>
      </div>
      {tab === 'snippets' && (
        <div className="nav-groups">
          {groups.map((g) => (
            <button key={g} className={group === g ? 'active' : ''} onClick={() => onGroup(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      <button className="add-btn" onClick={onAddSnippet}>
        + 新增
      </button>
    </nav>
  )
}
```

`src/renderer/src/components/ItemList.tsx`：

```tsx
import type { HistoryEntry, Snippet } from '@shared/types'

interface Props {
  entries: HistoryEntry[]
  snippets: Snippet[]
  query: string
  onPasteText(content: string): void
  onPasteImage(filename: string): void
}

export function ItemList({ entries, snippets, query, onPasteText, onPasteImage }: Props) {
  if (entries.length > 0) {
    return (
      <div className="list">
        {entries.map((e) => (
          <div
            key={e.id}
            className="item"
            onClick={() => (e.type === 'text' ? onPasteText(e.content) : onPasteImage(e.content))}
          >
            {e.type === 'text' ? <span>{e.content}</span> : <span>🖼 图片</span>}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="list">
      {snippets.map((s) => (
        <div key={s.id} className="item" onClick={() => onPasteText(s.content)}>
          <span className="title">{s.title}</span>
          <span className="content">{s.content}</span>
        </div>
      ))}
      {snippets.length === 0 && entries.length === 0 && (
        <div className="empty">{query ? '无匹配结果' : '点击「+ 新增」添加短语'}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 手动验证**

`npm run dev`，确认：左侧短语/历史切换、分组列表、右侧条目渲染；搜索框可输入。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: add renderer layout and list components"
```

---

### Task 8: 渲染层交互（粘贴/搜索/增删改）

**Files:**
- Modify: `src/renderer/src/App.tsx`, `src/renderer/src/components/ItemList.tsx`, `src/renderer/src/components/SearchBar.tsx`
- Create: `src/renderer/src/components/TextItem.tsx`, `ImageItem.tsx`, `SnippetEditor.tsx`, `SettingsPanel.tsx`

**Interfaces:**
- Consumes: Task 7 的组件与 `api`
- Produces: 完整交互：单击粘贴、搜索过滤、短语增删改、历史删除/置顶/清空、设置面板。

- [ ] **Step 1: 在 App 中实现搜索过滤与粘贴回调**

`src/renderer/src/App.tsx`（替换 Task 7 版本）：

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { HistoryEntry, Settings, Snippet } from '@shared/types'
import { filterHistory } from '@shared/history'
import { filterSnippets } from '@shared/snippets'
import { api } from './api'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { ItemList } from './components/ItemList'
import { SnippetEditor } from './components/SnippetEditor'
import { SettingsPanel } from './components/SettingsPanel'

type Tab = 'history' | 'snippets'

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('snippets')
  const [group, setGroup] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Snippet | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    void api.getHistory().then(setHistory)
    void api.getSnippets().then(setSnippets)
    void api.getGroups().then((g) => {
      setGroups(g)
      setGroup((cur) => cur || g[0] || '')
    })
    void api.getSettings().then(setSettings)
    return api.onHistoryChanged(setHistory)
  }, [])

  const visibleHistory = useMemo(
    () => filterHistory(history, tab === 'history' ? query : ''),
    [history, tab, query]
  )
  const visibleSnippets = useMemo(
    () => filterSnippets(snippets, tab === 'snippets' ? query : '').filter((s) => s.group === group),
    [snippets, tab, query, group]
  )

  async function pasteText(content: string): Promise<void> {
    await api.pasteText(content)
    if (settings?.autoHideOnPaste) await api.hideWindow()
  }
  async function pasteImage(filename: string): Promise<void> {
    await api.pasteImage(filename)
    if (settings?.autoHideOnPaste) await api.hideWindow()
  }

  async function handleAddSnippet(s: Omit<Snippet, 'id'>): Promise<void> {
    setSnippets(await api.addSnippet(s))
    if (!groups.includes(s.group)) setGroups(await api.getGroups())
  }
  async function handleUpdateSnippet(s: Snippet): Promise<void> {
    setSnippets(await api.updateSnippet(s))
    setEditing(null)
  }
  async function handleDeleteSnippet(id: string): Promise<void> {
    setSnippets(await api.deleteSnippet(id))
  }
  async function handleDeleteHistory(id: string): Promise<void> {
    setHistory(await api.deleteHistory(id))
  }
  async function handlePinHistory(id: string): Promise<void> {
    setHistory(await api.pinHistory(id))
  }
  async function handleClearHistory(): Promise<void> {
    setHistory(await api.clearHistory())
  }

  return (
    <div className={`app theme-${settings?.theme ?? 'dark'}`}>
      <div className="titlebar">
        <SearchBar value={query} onChange={setQuery} />
        <button className="icon-btn" onClick={() => setShowSettings((v) => !v)}>⚙</button>
      </div>
      {showSettings && settings && (
        <SettingsPanel settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)} />
      )}
      {editing ? (
        <SnippetEditor
          snippet={editing}
          groups={groups}
          onSave={handleUpdateSnippet}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="body">
          <Sidebar
            tab={tab}
            groups={groups}
            group={group}
            onTab={setTab}
            onGroup={setGroup}
            onAddSnippet={() =>
              setEditing({ id: '', group: group || groups[0] || '', title: '', content: '' })
            }
          />
          <ItemList
            entries={visibleHistory}
            snippets={visibleSnippets}
            query={query}
            tab={tab}
            onPasteText={pasteText}
            onPasteImage={pasteImage}
            onEditSnippet={setEditing}
            onDeleteSnippet={handleDeleteSnippet}
            onDeleteHistory={handleDeleteHistory}
            onPinHistory={handlePinHistory}
            onClearHistory={handleClearHistory}
          />
        </div>
      )}
    </div>
  )
}
```

> 注：`filterHistory`/`filterSnippets` 从 `src/shared/` 纯函数模块复用（`src/shared/history.ts`、`src/shared/snippets.ts`）。这两个模块不依赖 Node/Electron，可安全在渲染层 import。

- [ ] **Step 2: 实现 ItemList 的完整交互与子组件**

`src/renderer/src/components/ItemList.tsx`：

```tsx
import type { HistoryEntry, Snippet } from '@shared/types'
import { TextItem } from './TextItem'
import { ImageItem } from './ImageItem'

type Tab = 'history' | 'snippets'

interface Props {
  entries: HistoryEntry[]
  snippets: Snippet[]
  query: string
  tab: Tab
  onPasteText(content: string): void
  onPasteImage(filename: string): void
  onEditSnippet(s: Snippet): void
  onDeleteSnippet(id: string): void
  onDeleteHistory(id: string): void
  onPinHistory(id: string): void
  onClearHistory(): void
}

export function ItemList(props: Props) {
  const { entries, snippets, tab, query } = props
  if (tab === 'history') {
    return (
      <div className="list">
        {entries.map((e) =>
          e.type === 'text' ? (
            <TextItem key={e.id} entry={e} onPaste={props.onPasteText} onDelete={props.onDeleteHistory} onPin={props.onPinHistory} />
          ) : (
            <ImageItem key={e.id} entry={e} onPaste={props.onPasteImage} onDelete={props.onDeleteHistory} onPin={props.onPinHistory} />
          )
        )}
        {entries.length === 0 && <div className="empty">{query ? '无匹配结果' : '暂无历史，复制内容后自动记录'}</div>}
        {entries.length > 0 && (
          <button className="clear-btn" onClick={props.onClearHistory}>清空历史</button>
        )}
      </div>
    )
  }
  return (
    <div className="list">
      {snippets.map((s) => (
        <div key={s.id} className="item" onClick={() => props.onPasteText(s.content)}>
          <span className="title">{s.title}</span>
          <span className="content">{s.content}</span>
          <span className="actions">
            <button onClick={(e) => { e.stopPropagation(); props.onEditSnippet(s) }}>编辑</button>
            <button onClick={(e) => { e.stopPropagation(); props.onDeleteSnippet(s.id) }}>删除</button>
          </span>
        </div>
      ))}
      {snippets.length === 0 && <div className="empty">{query ? '无匹配结果' : '点击「+ 新增」添加短语'}</div>}
    </div>
  )
}
```

`src/renderer/src/components/TextItem.tsx`：

```tsx
import type { HistoryEntry } from '@shared/types'

interface Props {
  entry: HistoryEntry
  onPaste(content: string): void
  onDelete(id: string): void
  onPin(id: string): void
}

export function TextItem({ entry, onPaste, onDelete, onPin }: Props) {
  return (
    <div className={`item ${entry.pinned ? 'pinned' : ''}`} onClick={() => onPaste(entry.content)}>
      <span className="content">{entry.content}</span>
      <span className="actions">
        <button onClick={(e) => { e.stopPropagation(); onPin(entry.id) }}>{entry.pinned ? '取消置顶' : '置顶'}</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}>删除</button>
      </span>
    </div>
  )
}
```

`src/renderer/src/components/ImageItem.tsx`：

```tsx
import { useEffect, useState } from 'react'
import type { HistoryEntry } from '@shared/types'
import { api } from '../api'

interface Props {
  entry: HistoryEntry
  onPaste(filename: string): void
  onDelete(id: string): void
  onPin(id: string): void
}

export function ImageItem({ entry, onPaste, onDelete, onPin }: Props) {
  const [src, setSrc] = useState<string>('')
  useEffect(() => {
    void api.getImageDataUrl(entry.content).then(setSrc)
  }, [entry.content])
  return (
    <div className={`item image ${entry.pinned ? 'pinned' : ''}`} onClick={() => onPaste(entry.content)}>
      <img className="thumb" src={src} alt="" />
      <span className="actions">
        <button onClick={(e) => { e.stopPropagation(); onPin(entry.id) }}>{entry.pinned ? '取消置顶' : '置顶'}</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}>删除</button>
      </span>
    </div>
  )
}
```

- [ ] **Step 3: 实现短语编辑器与设置面板**

`src/renderer/src/components/SnippetEditor.tsx`：

```tsx
import { useState } from 'react'
import type { Snippet } from '@shared/types'

interface Props {
  snippet: Snippet
  groups: string[]
  onSave(s: Snippet): void
  onCancel(): void
}

export function SnippetEditor({ snippet, groups, onSave, onCancel }: Props) {
  const [group, setGroup] = useState(snippet.group)
  const [title, setTitle] = useState(snippet.title)
  const [content, setContent] = useState(snippet.content)

  return (
    <div className="editor">
      <input
        placeholder="分组"
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        list="group-options"
      />
      <datalist id="group-options">
        {groups.map((g) => <option key={g} value={g} />)}
      </datalist>
      <input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        placeholder="内容（代码片段可多行）"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="editor-actions">
        <button onClick={() => onSave({ ...snippet, group, title, content })}>保存</button>
        <button onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}
```

`src/renderer/src/components/SettingsPanel.tsx`：

```tsx
import { useState } from 'react'
import type { Settings } from '@shared/types'
import { api } from '../api'

interface Props {
  settings: Settings
  onSave(s: Settings): void
  onClose(): void
}

export function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [hotkey, setHotkey] = useState(settings.hotkey)
  const [autoHideOnPaste, setAutoHide] = useState(settings.autoHideOnPaste)

  async function save(): Promise<void> {
    const next = { ...settings, hotkey, autoHideOnPaste }
    await api.saveSettings(next)
    onSave(next)
    onClose()
  }

  return (
    <div className="settings">
      <label>全局热键 <input value={hotkey} onChange={(e) => setHotkey(e.target.value)} /></label>
      <label>
        <input type="checkbox" checked={autoHideOnPaste} onChange={(e) => setAutoHide(e.target.checked)} />
        粘贴后自动收起
      </label>
      <div className="editor-actions">
        <button onClick={save}>保存</button>
        <button onClick={onClose}>取消</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 补齐样式**

在 `src/renderer/src/styles.css` 追加：

```css
.titlebar { display: flex; gap: 8px; padding: 8px; align-items: center; }
.searchbar { flex: 1; }
.searchbar input {
  width: 100%; padding: 6px 10px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--bg-elevated); color: var(--fg); outline: none;
}
.icon-btn { background: none; border: none; color: var(--fg); cursor: pointer; }
.sidebar { width: 120px; padding: 8px; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid var(--border); }
.sidebar button, .add-btn {
  text-align: left; padding: 6px 8px; border: none; border-radius: 6px;
  background: none; color: var(--fg-dim); cursor: pointer;
}
.sidebar button.active, .sidebar button:hover { background: var(--bg-elevated); color: var(--fg); }
.add-btn { margin-top: auto; color: var(--accent); }
.list { flex: 1; overflow-y: auto; padding: 8px; }
.item { padding: 8px 10px; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.item:hover { background: var(--bg-elevated); }
.item.pinned { border: 1px solid var(--accent); }
.item .title { font-weight: 600; }
.item .content { color: var(--fg-dim); word-break: break-all; white-space: pre-wrap; }
.item .actions { display: none; gap: 6px; }
.item:hover .actions { display: flex; }
.item .actions button { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 12px; }
.item.image .thumb { max-height: 80px; border-radius: 6px; object-fit: contain; }
.empty { color: var(--fg-dim); text-align: center; padding: 24px; }
.clear-btn { margin: 8px auto; display: block; background: none; border: 1px solid var(--border); color: var(--fg-dim); border-radius: 6px; padding: 6px 12px; cursor: pointer; }
.editor, .settings { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.editor input, .editor textarea, .settings input {
  padding: 8px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-elevated); color: var(--fg); outline: none;
}
.editor textarea { min-height: 120px; resize: vertical; font-family: Consolas, monospace; }
.editor-actions { display: flex; gap: 8px; }
.editor-actions button { padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; background: var(--accent); color: #fff; }
.settings label { display: flex; align-items: center; gap: 8px; color: var(--fg-dim); }
```

- [ ] **Step 5: 手动验证完整流程**

`npm run dev`，验证：新增/编辑/删除短语；单击短语粘贴到记事本；复制文本/图片后历史出现；历史搜索、置顶、删除、清空；设置面板保存热键与「粘贴后自动收起」。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: add renderer interactions and editors"
```

---

### Task 9: 拖拽、贴边吸附与收尾

**Files:**
- Modify: `src/main/index.ts`, `src/renderer/src/styles.css`
- Create: `README.md`

**Interfaces:**
- Consumes: Task 6 的 `win`
- Produces: 拖拽移动窗口；透明/贴边可调；README。

- [ ] **Step 1: 增加无边框窗口拖拽**

在 `src/main/index.ts` 中 `win = createMainWindow()` 之后添加：

```typescript
// 无边框窗口拖拽：渲染层设置 -webkit-app-region: drag 的标题栏区域可拖动
```

在 `src/renderer/src/styles.css` 的 `.titlebar` 追加 `-webkit-app-region: drag;`，并在 `.titlebar .icon-btn`、`.searchbar input` 追加 `-webkit-app-region: no-drag;`：

```css
.titlebar { -webkit-app-region: drag; }
.titlebar .icon-btn, .titlebar input { -webkit-app-region: no-drag; }
```

- [ ] **Step 2: 手动验证拖拽与置顶**

`npm run dev`，确认可拖动标题栏移动窗口；托盘「窗口置顶」开关生效。

- [ ] **Step 3: 写 README**

`README.md`：

```markdown
# 剪贴板工具

Windows 剪贴板历史与常用短语工具。

## 功能
- 剪贴板历史：自动记录复制的文本与图片，支持搜索、置顶、一键粘贴
- 常用短语：按分类（邮箱/地址/代码片段）管理，单击即粘贴
- 全局热键 `Ctrl+Shift+V` 呼出/隐藏；常驻系统托盘

## 开发
\`\`\`bash
npm install      # 首次安装（会自动 electron-rebuild 原生模块）
npm run dev      # 开发模式
npm test         # 单元测试
npm run build:win  # 打包 Windows 安装包
\`\`\`

## 数据位置
`%APPDATA%\clipboard-tool\`（history.json / snippets.json / groups.json / settings.json / images/）
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: window drag and readme"
```

---

### Task 10: 打包与最终验证

**Files:**
- Modify: `package.json`, `electron-builder.yml`

**Interfaces:**
- Consumes: 全部前置任务
- Produces: `dist/` 下可安装的 Windows 安装包。

- [ ] **Step 1: 补充打包配置**

`electron-builder.yml` 增加图标与原生依赖说明（图标文件 `build/icon.ico` 需自行准备，MVP 可省略）：

```yaml
appId: com.local.clipboard-tool
productName: 剪贴板工具
directories:
  output: dist
files:
  - out/**
asarUnpack:
  - "**/node_modules/@nut-tree-fork/**"
win:
  target: nsis
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 2: 打包**

Run: `npm run build:win`
Expected: 在 `dist/` 生成 `剪贴板工具 Setup x.y.z.exe`。若 nut-js 原生模块未被打进包，检查 `asarUnpack` 与 `npm run rebuild`。

- [ ] **Step 3: 最终手动验收清单**

对照 spec 逐项验收：
- [ ] 复制文本 → 历史立即出现，可搜索、单击粘贴
- [ ] 复制图片 → 历史出现缩略图，单击粘贴到支持图片的目标
- [ ] 新增/编辑/删除短语与分组
- [ ] 全局热键 `Ctrl+Shift+V` 显隐
- [ ] 托盘菜单（显隐/置顶/退出）
- [ ] 连续复制相同内容不重复；超过 200 条淘汰最旧；置顶项不淘汰
- [ ] 无边框可拖拽、置顶、深浅主题

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: package config and finalize"
```

---

## 自审记录

- **Spec 覆盖**：spec 的 5.1 监听→Task 3；5.2 历史→Task 7/8；5.3 短语→Task 7/8；5.4 粘贴→Task 4/8；5.5 搜索→Task 1/8；5.6 热键→Task 5/6；5.7 托盘→Task 5/6；数据模型→Task 1/2；错误处理→Task 2 损坏恢复 + Task 3/4 降级；测试→Task 1/2 单测 + Task 3–10 手动。
- **明确裁剪（MVP 简化，已标注在对应任务）**：`sourceApp` 记录为空串（获取前台窗口标题需额外原生依赖）；托盘用空占位图标；贴边自动吸附未实现（仅无边框拖拽，spec 中「贴边吸附」降级为手动拖拽，后续可加）。
- **类型一致性**：`HistoryEntry/Snippet/Settings/PasteResult/GroupMutationResult` 在 Task 1 定义，后续任务统一引用，无改名。`ClipboardService` 的 `onChange` 回调统一走构造函数注入（Task 6 Step 2 为准，Task 6 Step 1 的私有赋值写法已注明废弃）。
