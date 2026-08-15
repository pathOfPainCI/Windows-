import { useState } from 'react'
import type { Snippet } from '@shared/types'

interface Props {
  snippet: Snippet
  groups: string[]
  onSave(s: Snippet): void
  onCancel(): void
}

export function SnippetEditor({ snippet, groups, onSave, onCancel }: Props) {
  const [group, setGroup] = useState(snippet.group)
  const [title, setTitle] = useState(snippet.title)
  const [content, setContent] = useState(snippet.content)

  return (
    <div className="editor">
      <input
        placeholder="分组"
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        list="group-options"
      />
      <datalist id="group-options">
        {groups.map((g) => <option key={g} value={g} />)}
      </datalist>
      <input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        placeholder="内容（代码片段可多行）"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="editor-actions">
        <button onClick={() => onSave({ ...snippet, group, title, content })}>保存</button>
        <button onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}
