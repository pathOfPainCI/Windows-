import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { Settings, Snippet } from '@shared/types'
import type { Store } from './store'
import type { PasteService } from './paste-service'

export function registerIpc(
  store: Store,
  pasteService: PasteService,
  win: BrowserWindow
): void {
  // IPC 边界：ipcMain.handle 的 rest 参数是无类型的 any[]，因此 handle 的 fn 也以 any[] 接收。
  // 各处理器的入参/返回值类型在箭头函数上显式声明，保持与共享 ClipboardToolApi 契约一致。
  const handle = (channel: string, fn: (...args: any[]) => unknown): void => {
    ipcMain.handle(channel, (_event, ...args) => fn(...args))
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
