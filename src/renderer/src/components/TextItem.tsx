import type { HistoryEntry } from '@shared/types'

interface Props {
  entry: HistoryEntry
  onPaste(content: string): void
  onDelete(id: string): void
  onPin(id: string): void
}

export function TextItem({ entry, onPaste, onDelete, onPin }: Props) {
  return (
    <div className={`item ${entry.pinned ? 'pinned' : ''}`} onClick={() => onPaste(entry.content)}>
      <span className="content">{entry.content}</span>
      <span className="actions">
        <button onClick={(e) => { e.stopPropagation(); onPin(entry.id) }}>{entry.pinned ? '取消置顶' : '置顶'}</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}>删除</button>
      </span>
    </div>
  )
}
