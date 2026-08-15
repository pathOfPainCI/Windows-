import { contextBridge, ipcRenderer } from 'electron'
import type { ClipboardToolApi } from '@shared/api'
import type { HistoryEntry } from '@shared/types'

const api: ClipboardToolApi = {
  getHistory: () => ipcRenderer.invoke('getHistory'),
  getSnippets: () => ipcRenderer.invoke('getSnippets'),
  getGroups: () => ipcRenderer.invoke('getGroups'),
  getSettings: () => ipcRenderer.invoke('getSettings'),
  saveSettings: (s) => ipcRenderer.invoke('saveSettings', s),
  addSnippet: (s) => ipcRenderer.invoke('addSnippet', s),
  updateSnippet: (s) => ipcRenderer.invoke('updateSnippet', s),
  deleteSnippet: (id) => ipcRenderer.invoke('deleteSnippet', id),
  addGroup: (name) => ipcRenderer.invoke('addGroup', name),
  renameGroup: (o, n) => ipcRenderer.invoke('renameGroup', o, n),
  deleteGroup: (name) => ipcRenderer.invoke('deleteGroup', name),
  deleteHistory: (id) => ipcRenderer.invoke('deleteHistory', id),
  pinHistory: (id) => ipcRenderer.invoke('pinHistory', id),
  clearHistory: () => ipcRenderer.invoke('clearHistory'),
  pasteText: (content) => ipcRenderer.invoke('pasteText', content),
  pasteImage: (filename) => ipcRenderer.invoke('pasteImage', filename),
  getImageDataUrl: (filename) => ipcRenderer.invoke('getImageDataUrl', filename),
  hideWindow: () => ipcRenderer.invoke('hideWindow'),
  onHistoryChanged: (cb) => {
    const listener = (_event: unknown, entries: HistoryEntry[]): void => cb(entries)
    ipcRenderer.on('history-changed', listener)
    return () => ipcRenderer.removeListener('history-changed', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
