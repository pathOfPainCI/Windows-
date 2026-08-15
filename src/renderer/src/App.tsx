import { useEffect, useMemo, useState } from 'react'
import type { HistoryEntry, Settings, Snippet } from '@shared/types'
import { api } from './api'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { ItemList } from './components/ItemList'

type Tab = 'history' | 'snippets'

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('snippets')
  const [group, setGroup] = useState<string>('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    void api.getHistory().then(setHistory)
    void api.getSnippets().then(setSnippets)
    void api.getGroups().then((g) => {
      setGroups(g)
      setGroup((cur) => cur || g[0] || '')
    })
    void api.getSettings().then(setSettings)
    return api.onHistoryChanged(setHistory)
  }, [])

  const filteredHistory = useMemo(() => {
    if (tab !== 'history') return []
    return history
  }, [tab, history])

  const filteredSnippets = useMemo(() => {
    if (tab !== 'snippets') return []
    return snippets.filter((s) => s.group === group)
  }, [tab, snippets, group])

  return (
    <div className={`app theme-${settings?.theme ?? 'dark'}`}>
      <SearchBar value={query} onChange={setQuery} />
      <div className="body">
        <Sidebar
          tab={tab}
          groups={groups}
          group={group}
          onTab={setTab}
          onGroup={setGroup}
          onAddSnippet={() => {}}
        />
        <ItemList
          entries={filteredHistory}
          snippets={filteredSnippets}
          query={query}
          onPasteText={() => {}}
          onPasteImage={() => {}}
        />
      </div>
    </div>
  )
}
