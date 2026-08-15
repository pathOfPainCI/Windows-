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
