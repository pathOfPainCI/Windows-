import { describe, it, expect } from 'vitest'
import { stepLeave } from '../src/main/leave-state'
import type { LeaveState } from '../src/main/leave-state'

const fresh = (): LeaveState => ({ hasEntered: false })

describe('stepLeave', () => {
  it('从未进入过窗口、光标在窗外时不会收起', () => {
    const r = stepLeave(fresh(), false)
    expect(r.shouldSnap).toBe(false)
    expect(r.state.hasEntered).toBe(false)
  })

  it('光标在窗口内不收起，并标记为已进入', () => {
    const r = stepLeave(fresh(), true)
    expect(r.shouldSnap).toBe(false)
    expect(r.state.hasEntered).toBe(true)
  })

  it('进入过窗口后移出，立即收起', () => {
    const s = stepLeave(fresh(), true).state
    expect(s.hasEntered).toBe(true)
    const r = stepLeave(s, false)
    expect(r.shouldSnap).toBe(true)
  })
})
