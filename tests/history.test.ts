import { describe, it, expect } from 'vitest'
import { isSameContent, addEntry, evict, filterHistory } from '../src/shared/history'
import type { HistoryEntry } from '../src/shared/types'

function entry(partial: Partial<HistoryEntry> & { id?: string } = {}): HistoryEntry {
  return {
    id: partial.id ?? '1',
    type: 'text',
    content: 'hello',
    sourceApp: '',
    ts: 0,
    pinned: false,
    ...partial
  }
}

describe('isSameContent', () => {
  it('文本内容相同返回 true', () => {
    expect(isSameContent(entry({ content: 'a' }), entry({ content: 'a' }))).toBe(true)
  })
  it('文本内容不同返回 false', () => {
    expect(isSameContent(entry({ content: 'a' }), entry({ content: 'b' }))).toBe(false)
  })
  it('类型不同返回 false', () => {
    expect(isSameContent(entry({ type: 'text' }), entry({ type: 'image' }))).toBe(false)
  })
})

describe('addEntry', () => {
  it('空列表插入新条目', () => {
    expect(addEntry([], entry())).toHaveLength(1)
  })
  it('与最新一条相同则去重', () => {
    const list = [entry({ content: 'a' })]
    expect(addEntry(list, entry({ content: 'a' }))).toHaveLength(1)
  })
  it('不同则插到最前', () => {
    const list = [entry({ content: 'a' })]
    const next = addEntry(list, entry({ content: 'b' }))
    expect(next).toHaveLength(2)
    expect(next[0].content).toBe('b')
  })
})

describe('evict', () => {
  it('未超上限不变', () => {
    const list = [entry({ id: '1' }), entry({ id: '2' })]
    expect(evict(list, 5)).toHaveLength(2)
  })
  it('超上限淘汰最旧', () => {
    const list = [entry({ id: '1' }), entry({ id: '2' }), entry({ id: '3' })]
    const result = evict(list, 2)
    expect(result.map((e) => e.id)).toEqual(['1', '2'])
  })
  it('置顶项不淘汰', () => {
    const list = [
      entry({ id: '1', pinned: true }),
      entry({ id: '2' }),
      entry({ id: '3' })
    ]
    const result = evict(list, 2)
    expect(result.map((e) => e.id)).toEqual(['1', '2'])
  })
})

describe('filterHistory', () => {
  const list = [
    entry({ id: '1', content: 'john@example.com', sourceApp: 'Chrome' }),
    entry({ id: '2', content: '北京市海淀区', sourceApp: 'Notepad' }),
    entry({ id: '3', type: 'image', content: '1.png', sourceApp: 'Photos' })
  ]
  it('空查询返回全部', () => {
    expect(filterHistory(list, '')).toHaveLength(3)
  })
  it('按内容匹配', () => {
    expect(filterHistory(list, 'john')).toHaveLength(1)
  })
  it('按来源匹配', () => {
    expect(filterHistory(list, 'note')).toHaveLength(1)
  })
  it('不区分大小写', () => {
    expect(filterHistory(list, 'JOHN')).toHaveLength(1)
  })
})
