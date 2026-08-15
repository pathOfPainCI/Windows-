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
