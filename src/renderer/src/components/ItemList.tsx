import type { HistoryEntry, Snippet } from '@shared/types'
import { TextItem } from './TextItem'
import { ImageItem } from './ImageItem'

type Tab = 'history' | 'snippets'

interface Props {
  entries: HistoryEntry[]
  snippets: Snippet[]
  query: string
  tab: Tab
  onPasteText(content: string): void
  onPasteImage(filename: string): void
  onEditSnippet(s: Snippet): void
  onDeleteSnippet(id: string): void
  onDeleteHistory(id: string): void
  onPinHistory(id: string): void
  onClearHistory(): void
}

export function ItemList(props: Props) {
  const { entries, snippets, tab, query } = props
  if (tab === 'history') {
    return (
      <div className="list">
        {entries.map((e) =>
          e.type === 'text' ? (
            <TextItem key={e.id} entry={e} onPaste={props.onPasteText} onDelete={props.onDeleteHistory} onPin={props.onPinHistory} />
          ) : (
            <ImageItem key={e.id} entry={e} onPaste={props.onPasteImage} onDelete={props.onDeleteHistory} onPin={props.onPinHistory} />
          )
        )}
        {entries.length === 0 && <div className="empty">{query ? '无匹配结果' : '暂无历史，复制内容后自动记录'}</div>}
        {entries.length > 0 && (
          <button className="clear-btn" onClick={props.onClearHistory}>清空历史</button>
        )}
      </div>
    )
  }
  return (
    <div className="list">
      {snippets.map((s) => (
        <div key={s.id} className="item" onClick={() => props.onPasteText(s.content)}>
          <span className="title">{s.title}</span>
          <span className="content">{s.content}</span>
          <span className="actions">
            <button onClick={(e) => { e.stopPropagation(); props.onEditSnippet(s) }}>编辑</button>
            <button onClick={(e) => { e.stopPropagation(); props.onDeleteSnippet(s.id) }}>删除</button>
          </span>
        </div>
      ))}
      {snippets.length === 0 && <div className="empty">{query ? '无匹配结果' : '点击「+ 新增」添加短语'}</div>}
    </div>
  )
}
