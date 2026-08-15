import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Store } from '../src/main/store'
import { DEFAULT_GROUPS, DEFAULT_SETTINGS } from '../src/shared/types'

let dir: string
let store: Store

beforeEach(async () => {
  dir = join(tmpdir(), `clipboard-test-${Math.random().toString(36).slice(2)}`)
  store = new Store(dir)
  await store.init()
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('history', () => {
  it('初始为空', () => {
    expect(store.getHistory()).toEqual([])
  })
  it('addHistory 插入并持久化', async () => {
    await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    expect(store.getHistory()).toHaveLength(1)
    const reloaded = new Store(dir)
    await reloaded.init()
    expect(reloaded.getHistory()).toHaveLength(1)
  })
  it('连续重复去重', async () => {
    await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    expect(store.getHistory()).toHaveLength(1)
  })
  it('removeHistory 删除指定条目', async () => {
    const [list] = [await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })]
    await store.removeHistory(list[0].id)
    expect(store.getHistory()).toHaveLength(0)
  })
  it('pinHistory 切换置顶', async () => {
    const list = await store.addHistory({ type: 'text', content: 'a', sourceApp: '' })
    await store.pinHistory(list[0].id)
    expect(store.getHistory()[0].pinned).toBe(true)
  })
})

describe('snippets', () => {
  it('addSnippet 新增', async () => {
    await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    expect(store.getSnippets()).toHaveLength(1)
  })
  it('updateSnippet 修改', async () => {
    const list = await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    await store.updateSnippet({ ...list[0], title: 'b' })
    expect(store.getSnippets()[0].title).toBe('b')
  })
  it('deleteSnippet 删除', async () => {
    const list = await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    await store.deleteSnippet(list[0].id)
    expect(store.getSnippets()).toHaveLength(0)
  })
})

describe('groups', () => {
  it('默认分组', () => {
    expect(store.getGroups()).toEqual(DEFAULT_GROUPS)
  })
  it('addGroup 新增分组', async () => {
    await store.addGroup('测试')
    expect(store.getGroups()).toContain('测试')
  })
  it('deleteGroup 删除分组及其短语', async () => {
    await store.addSnippet({ group: '邮箱', title: 'a', content: 'a@b.com' })
    await store.deleteGroup('邮箱')
    expect(store.getGroups()).not.toContain('邮箱')
    expect(store.getSnippets()).toHaveLength(0)
  })
})

describe('settings', () => {
  it('默认设置', () => {
    expect(store.getSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('saveSettings 持久化', async () => {
    await store.saveSettings({ ...DEFAULT_SETTINGS, historyLimit: 50 })
    const reloaded = new Store(dir)
    await reloaded.init()
    expect(reloaded.getSettings().historyLimit).toBe(50)
  })
})

describe('corruption recovery', () => {
  it('损坏的 history.json 回退为空', async () => {
    await fs.writeFile(join(dir, 'history.json'), '{broken', 'utf-8')
    const s = new Store(dir)
    await s.init()
    expect(s.getHistory()).toEqual([])
  })
})
