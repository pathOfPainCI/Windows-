import { useState } from 'react'
import type { Settings } from '@shared/types'
import { api } from '../api'

interface Props {
  settings: Settings
  onSave(s: Settings): void
  onClose(): void
}

export function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [hotkey, setHotkey] = useState(settings.hotkey)
  const [autoHideOnPaste, setAutoHide] = useState(settings.autoHideOnPaste)

  async function save(): Promise<void> {
    const next = { ...settings, hotkey, autoHideOnPaste }
    await api.saveSettings(next)
    onSave(next)
    onClose()
  }

  return (
    <div className="settings">
      <label>全局热键 <input value={hotkey} onChange={(e) => setHotkey(e.target.value)} /></label>
      <label>
        <input type="checkbox" checked={autoHideOnPaste} onChange={(e) => setAutoHide(e.target.checked)} />
        粘贴后自动收起
      </label>
      <div className="editor-actions">
        <button onClick={save}>保存</button>
        <button onClick={onClose}>取消</button>
      </div>
    </div>
  )
}
