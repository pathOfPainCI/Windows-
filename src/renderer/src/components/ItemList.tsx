import type { HistoryEntry, Snippet } from '@shared/types'

interface Props {
  entries: HistoryEntry[]
  snippets: Snippet[]
  query: string
  onPasteText(content: string): void
  onPasteImage(filename: string): void
}

export function ItemList({ entries, snippets, query, onPasteText, onPasteImage }: Props) {
  if (entries.length > 0) {
    return (
      <div className="list">
        {entries.map((e) => (
          <div
            key={e.id}
            className="item"
            onClick={() => (e.type === 'text' ? onPasteText(e.content) : onPasteImage(e.content))}
          >
            {e.type === 'text' ? <span>{e.content}</span> : <span>🖼 图片</span>}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="list">
      {snippets.map((s) => (
        <div key={s.id} className="item" onClick={() => onPasteText(s.content)}>
          <span className="title">{s.title}</span>
          <span className="content">{s.content}</span>
        </div>
      ))}
      {snippets.length === 0 && entries.length === 0 && (
        <div className="empty">{query ? '无匹配结果' : '点击「+ 新增」添加短语'}</div>
      )}
    </div>
  )
}
