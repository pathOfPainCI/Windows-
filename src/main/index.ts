import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { Store } from './store'
import { ClipboardService } from './clipboard-service'
import { PasteService } from './paste-service'
import { createMainWindow } from './window'
import { EdgeSnapManager } from './edge-snap'
import { TrayManager } from './tray'
import { registerHotkey, unregisterHotkey } from './global-shortcut'
import { registerIpc } from './ipc'
import type { HistoryEntry } from '@shared/types'

let win: BrowserWindow | null = null

app.whenReady().then(async () => {
  const store = new Store(join(app.getPath('appData'), 'clipboard-tool'))
  await store.init()
  const settings = store.getSettings()

  win = createMainWindow()

  const edgeSnap = new EdgeSnapManager(win)
  edgeSnap.start()

  // 无边框窗口拖拽：渲染层设置 -webkit-app-region: drag 的标题栏区域可拖动

  const toggleWindow = (): void => {
    if (!win || win.isDestroyed()) return
    // 收起状态下先弹出，而不是直接隐藏
    if (edgeSnap.isSnapped()) {
      edgeSnap.restore()
      return
    }
    win.isVisible() ? win.hide() : win.show()
  }

  const clipboardService = new ClipboardService(store, (entries: HistoryEntry[]) => {
    if (win && !win.isDestroyed()) win.webContents.send('history-changed', entries)
  })
  const pasteService = new PasteService(store, () => clipboardService.markAsSeen())
  clipboardService.start(500)

  registerIpc(store, pasteService, win)

  const tray = new TrayManager(win, {
    toggleWindow,
    setAlwaysOnTop: (v) => {
      win?.setAlwaysOnTop(v)
      void store.saveSettings({ ...store.getSettings(), alwaysOnTop: v })
    },
    quit: () => app.quit()
  })
  tray.build()

  registerHotkey(settings.hotkey, toggleWindow)

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
