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
