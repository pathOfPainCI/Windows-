import { clipboard, nativeImage } from 'electron'
import { keyboard, Key } from '@nut-tree-fork/nut-js'
import type { PasteResult } from '@shared/api'
import type { Store } from './store'

export class PasteService {
  constructor(
    private store: Store,
    private onClipboardWritten?: () => void
  ) {}

  async pasteText(content: string): Promise<PasteResult> {
    clipboard.writeText(content)
    this.onClipboardWritten?.()
    return this.inject()
  }

  async pasteImage(filename: string): Promise<PasteResult> {
    try {
      const buf = await this.store.loadImage(filename)
      const img = nativeImage.createFromBuffer(buf)
      if (img.isEmpty()) return { ok: false, copiedOnly: true }
      clipboard.writeImage(img)
      this.onClipboardWritten?.()
      return this.inject()
    } catch {
      return { ok: false, copiedOnly: true }
    }
  }

  private async inject(): Promise<PasteResult> {
    try {
      await keyboard.pressKey(Key.LeftControl, Key.V)
      await keyboard.releaseKey(Key.LeftControl, Key.V)
      return { ok: true, copiedOnly: false }
    } catch {
      return { ok: false, copiedOnly: true }
    }
  }
}
