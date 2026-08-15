import { clipboard } from 'electron'
import { createHash } from 'node:crypto'
import type { HistoryEntry } from '@shared/types'
import type { Store } from './store'

function hashString(s: string): string {
  return createHash('sha1').update(s).digest('hex')
}

function hashBuffer(b: Buffer): string {
  return createHash('sha1').update(b).digest('hex')
}

export class ClipboardService {
  private lastHash: string | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(
    private store: Store,
    private onChange?: (entries: HistoryEntry[]) => void
  ) {}

  start(intervalMs = 500): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.poll(), intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async poll(): Promise<void> {
    try {
      const text = clipboard.readText()
      const img = clipboard.readImage()

      if (!img.isEmpty()) {
        const buf = img.toPNG()
        const hash = hashBuffer(buf)
        if (hash === this.lastHash) return
        this.lastHash = hash
        const filename = await this.store.saveImage(buf)
        const entries = await this.store.addHistory({ type: 'image', content: filename, sourceApp: '' })
        this.onChange?.(entries)
        return
      }

      if (text && text.trim() !== '') {
        const hash = hashString(text)
        if (hash === this.lastHash) return
        this.lastHash = hash
        const entries = await this.store.addHistory({ type: 'text', content: text, sourceApp: '' })
        this.onChange?.(entries)
      }
    } catch (err) {
      this.lastHash = null
      console.warn('[clipboard-service] poll error:', err)
    }
  }
}
