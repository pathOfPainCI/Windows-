type Tab = 'history' | 'snippets'

interface Props {
  tab: Tab
  groups: string[]
  group: string
  onTab(t: Tab): void
  onGroup(g: string): void
  onAddSnippet(): void
}

export function Sidebar({ tab, groups, group, onTab, onGroup, onAddSnippet }: Props) {
  return (
    <nav className="sidebar">
      <div className="nav-section">
        <button className={tab === 'snippets' ? 'active' : ''} onClick={() => onTab('snippets')}>
          短语
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => onTab('history')}>
          历史
        </button>
      </div>
      {tab === 'snippets' && (
        <div className="nav-groups">
          {groups.map((g) => (
            <button key={g} className={group === g ? 'active' : ''} onClick={() => onGroup(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      <button className="add-btn" onClick={onAddSnippet}>
        + 新增
      </button>
    </nav>
  )
}
