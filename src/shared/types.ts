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
