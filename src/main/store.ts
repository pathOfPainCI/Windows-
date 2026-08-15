import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { HistoryEntry, Settings, Snippet } from '@shared/types'
import { DEFAULT_GROUPS, DEFAULT_SETTINGS } from '@shared/types'
import { addEntry, evict } from '@shared/history'

type NewHistoryEntry = Pick<HistoryEntry, 'type' | 'content' | 'sourceApp'> & { ts?: number }
type NewSnippet = Omit<Snippet, 'id'>

export interface GroupMutationResult {
  groups: string[]
  snippets: Snippet[]
}

export class Store {
  private history: HistoryEntry[] = []
  private snippets: Snippet[] = []
  private groups: string[] = [...DEFAULT_GROUPS]
  private settings: Settings = { ...DEFAULT_SETTINGS }

  constructor(private baseDir: string) {}

  async init(): Promise<void> {
    await fs.mkdir(join(this.baseDir, 'images'), { recursive: true })
    this.history = await this.readJson<HistoryEntry[]>('history.json', [])
    this.snippets = await this.readJson<Snippet[]>('snippets.json', [])
    this.groups = await this.readJson<string[]>('groups.json', [...DEFAULT_GROUPS])
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.readJson<Partial<Settings>>('settings.json', {}))
    }
  }

  private file(name: string): string {
    return join(this.baseDir, name)
  }

  private async readJson<T>(name: string, fallback: T): Promise<T> {
    try {
      const raw = await fs.readFile(this.file(name), 'utf-8')
      return JSON.parse(raw) as T
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        try {
          await fs.rename(this.file(name), `${this.file(name)}.bak`)
        } catch {
          /* 备份失败可忽略 */
        }
      }
      return fallback
    }
  }

  private async writeJson(name: string, data: unknown): Promise<void> {
    await fs.writeFile(this.file(name), JSON.stringify(data, null, 2), 'utf-8')
  }

  // —— 历史 ——
  getHistory(): HistoryEntry[] {
    return this.history
  }

  async addHistory(entry: NewHistoryEntry): Promise<HistoryEntry[]> {
    const full: HistoryEntry = {
      id: randomUUID(),
      ts: entry.ts ?? Date.now(),
      pinned: false,
      type: entry.type,
      content: entry.content,
      sourceApp: entry.sourceApp
    }
    this.history = evict(addEntry(this.history, full), this.settings.historyLimit)
    await this.writeJson('history.json', this.history)
    return this.history
  }

  async removeHistory(id: string): Promise<HistoryEntry[]> {
    const target = this.history.find((e) => e.id === id)
    this.history = this.history.filter((e) => e.id !== id)
    await this.writeJson('history.json', this.history)
    if (target?.type === 'image') await this.deleteImage(target.content)
    return this.history
  }

  async pinHistory(id: string): Promise<HistoryEntry[]> {
    this.history = this.history.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e))
    await this.writeJson('history.json', this.history)
    return this.history
  }

  async clearHistory(): Promise<HistoryEntry[]> {
    for (const e of this.history) {
      if (e.type === 'image') await this.deleteImage(e.content)
    }
    this.history = []
    await this.writeJson('history.json', this.history)
    return this.history
  }

  // —— 短语 ——
  getSnippets(): Snippet[] {
    return this.snippets
  }

  async addSnippet(s: NewSnippet): Promise<Snippet[]> {
    this.snippets = [{ id: randomUUID(), ...s }, ...this.snippets]
    await this.writeJson('snippets.json', this.snippets)
    return this.snippets
  }

  async updateSnippet(s: Snippet): Promise<Snippet[]> {
    this.snippets = this.snippets.map((x) => (x.id === s.id ? s : x))
    await this.writeJson('snippets.json', this.snippets)
    return this.snippets
  }

  async deleteSnippet(id: string): Promise<Snippet[]> {
    this.snippets = this.snippets.filter((s) => s.id !== id)
    await this.writeJson('snippets.json', this.snippets)
    return this.snippets
  }

  // —— 分组 ——
  getGroups(): string[] {
    return this.groups
  }

  async addGroup(name: string): Promise<string[]> {
    if (!this.groups.includes(name)) {
      this.groups = [...this.groups, name]
      await this.writeJson('groups.json', this.groups)
    }
    return this.groups
  }

  async renameGroup(oldName: string, newName: string): Promise<GroupMutationResult> {
    this.groups = this.groups.map((g) => (g === oldName ? newName : g))
    this.snippets = this.snippets.map((s) => (s.group === oldName ? { ...s, group: newName } : s))
    await this.writeJson('groups.json', this.groups)
    await this.writeJson('snippets.json', this.snippets)
    return { groups: this.groups, snippets: this.snippets }
  }

  async deleteGroup(name: string): Promise<GroupMutationResult> {
    this.groups = this.groups.filter((g) => g !== name)
    this.snippets = this.snippets.filter((s) => s.group !== name)
    await this.writeJson('groups.json', this.groups)
    await this.writeJson('snippets.json', this.snippets)
    return { groups: this.groups, snippets: this.snippets }
  }

  // —— 设置 ——
  getSettings(): Settings {
    return this.settings
  }

  async saveSettings(s: Settings): Promise<void> {
    this.settings = s
    await this.writeJson('settings.json', s)
  }

  // —— 图片 ——
  async saveImage(buffer: Buffer): Promise<string> {
    const name = `${Date.now()}-${randomUUID()}.png`
    await fs.writeFile(join(this.baseDir, 'images', name), buffer)
    return name
  }

  async loadImage(filename: string): Promise<Buffer> {
    return fs.readFile(join(this.baseDir, 'images', filename))
  }

  async deleteImage(filename: string): Promise<void> {
    try {
      await fs.unlink(join(this.baseDir, 'images', filename))
    } catch {
      /* 文件不存在可忽略 */
    }
  }
}
