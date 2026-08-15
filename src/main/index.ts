import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { Store } from './store'
import { ClipboardService } from './clipboard-service'
import { PasteService } from './paste-service'
import { createMainWindow } from './window'
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
