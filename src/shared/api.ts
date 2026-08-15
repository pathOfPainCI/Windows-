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
