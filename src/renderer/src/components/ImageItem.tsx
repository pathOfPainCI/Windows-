import { useEffect, useState } from 'react'
import type { HistoryEntry } from '@shared/types'
import { api } from '../api'

interface Props {
  entry: HistoryEntry
  onPaste(filename: string): void
  onDelete(id: string): void
  onPin(id: string): void
}

export function ImageItem({ entry, onPaste, onDelete, onPin }: Props) {
  const [src, setSrc] = useState<string>('')
  useEffect(() => {
    void api.getImageDataUrl(entry.content).then(setSrc)
  }, [entry.content])
  return (
    <div className={`item image ${entry.pinned ? 'pinned' : ''}`} onClick={() => onPaste(entry.content)}>
      <img className="thumb" src={src} alt="" />
      <span className="actions">
        <button onClick={(e) => { e.stopPropagation(); onPin(entry.id) }}>{entry.pinned ? '取消置顶' : '置顶'}</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}>删除</button>
      </span>
    </div>
  )
}
