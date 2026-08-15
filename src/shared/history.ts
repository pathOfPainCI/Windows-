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
