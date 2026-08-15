import { describe, it, expect } from 'vitest'
import { filterSnippets, groupSnippets } from '../src/shared/snippets'
import type { Snippet } from '../src/shared/types'

const snippets: Snippet[] = [
  { id: '1', group: '邮箱', title: '工作', content: 'a@b.com' },
  { id: '2', group: '邮箱', title: '私人', content: 'c@d.com' },
  { id: '3', group: '地址', title: '公司', content: '北京市' }
]

describe('filterSnippets', () => {
  it('空查询返回全部', () => {
    expect(filterSnippets(snippets, '')).toHaveLength(3)
  })
  it('按标题匹配', () => {
    expect(filterSnippets(snippets, '工作')).toHaveLength(1)
  })
  it('按内容匹配', () => {
    expect(filterSnippets(snippets, 'c@d')).toHaveLength(1)
  })
})

describe('groupSnippets', () => {
  it('按 group 分组', () => {
    const map = groupSnippets(snippets)
    expect(map.get('邮箱')).toHaveLength(2)
    expect(map.get('地址')).toHaveLength(1)
  })
})
