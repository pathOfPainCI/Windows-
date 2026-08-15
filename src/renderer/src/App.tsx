import { useEffect, useMemo, useState } from 'react'
import type { HistoryEntry, Settings, Snippet } from '@shared/types'
import { filterHistory } from '@shared/history'
import { filterSnippets } from '@shared/snippets'
import { api } from './api'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { ItemList } from './components/ItemList'
import { SnippetEditor } from './components/SnippetEditor'
import { SettingsPanel } from './components/SettingsPanel'

type Tab = 'history' | 'snippets'

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('snippets')
  const [group, setGroup] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Snippet | null>(null)
  const [showSettings, setShowSettings] = useState(false)

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

  const visibleHistory = useMemo(
    () => filterHistory(history, tab === 'history' ? query : ''),
    [history, tab, query]
  )
  const visibleSnippets = useMemo(
    () => filterSnippets(snippets, tab === 'snippets' ? query : '').filter((s) => s.group === group),
    [snippets, tab, query, group]
  )

  async function pasteText(content: string): Promise<void> {
    await api.pasteText(content)
    if (settings?.autoHideOnPaste) await api.hideWindow()
  }
  async function pasteImage(filename: string): Promise<void> {
    await api.pasteImage(filename)
    if (settings?.autoHideOnPaste) await api.hideWindow()
  }

  async function handleSaveSnippet(s: Snippet): Promise<void> {
    if (s.id) {
      setSnippets(await api.updateSnippet(s))
    } else {
      setSnippets(await api.addSnippet({ group: s.group, title: s.title, content: s.content }))
    }
    if (!groups.includes(s.group)) setGroups(await api.addGroup(s.group))
    setEditing(null)
  }
  async function handleDeleteSnippet(id: string): Promise<void> {
    setSnippets(await api.deleteSnippet(id))
  }
  async function handleDeleteHistory(id: string): Promise<void> {
    setHistory(await api.deleteHistory(id))
  }
  async function handlePinHistory(id: string): Promise<void> {
    setHistory(await api.pinHistory(id))
  }
  async function handleClearHistory(): Promise<void> {
    setHistory(await api.clearHistory())
  }

  return (
    <div className={`app theme-${settings?.theme ?? 'dark'}`}>
      <div className="drag-bar" />
      <div className="titlebar">
        <SearchBar value={query} onChange={setQuery} />
        <button className="icon-btn" onClick={() => setShowSettings((v) => !v)}>⚙</button>
      </div>
      {showSettings && settings && (
        <SettingsPanel settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)} />
      )}
      {editing ? (
        <SnippetEditor
          snippet={editing}
          groups={groups}
          onSave={handleSaveSnippet}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="body">
          <Sidebar
            tab={tab}
            groups={groups}
            group={group}
            onTab={setTab}
            onGroup={setGroup}
            onAddSnippet={() =>
              setEditing({ id: '', group: group || groups[0] || '', title: '', content: '' })
            }
          />
          <ItemList
            entries={visibleHistory}
            snippets={visibleSnippets}
            query={query}
            tab={tab}
            onPasteText={pasteText}
            onPasteImage={pasteImage}
            onEditSnippet={setEditing}
            onDeleteSnippet={handleDeleteSnippet}
            onDeleteHistory={handleDeleteHistory}
            onPinHistory={handlePinHistory}
            onClearHistory={handleClearHistory}
          />
        </div>
      )}
    </div>
  )
}
