import { describe, it, expect } from 'vitest'
import {
  shouldSnap,
  snapPosition,
  restorePosition,
  isInHotZone,
  isInside,
  SNAP_THRESHOLD,
  SNAP_SLIVER,
  HOT_ZONE_WIDTH,
  HOT_ZONE_HEIGHT
} from '../src/main/edge-snap-geometry'
import type { Rect, Point } from '../src/main/edge-snap-geometry'

const workArea: Rect = { x: 0, y: 0, width: 1920, height: 1040 }
const bounds = (x: number, y: number, width = 420, height = 640): Rect => ({
  x, y, width, height
})

describe('shouldSnap', () => {
  it('窗口右上角贴近屏幕右上角时触发', () => {
    const b = bounds(1920 - 420, 0) // 右上角正好对齐
    expect(shouldSnap(b, workArea)).toBe(true)
  })
  it('阈值内偏移也触发', () => {
    const b = bounds(1920 - 420 - SNAP_THRESHOLD + 1, SNAP_THRESHOLD - 1)
    expect(shouldSnap(b, workArea)).toBe(true)
  })
  it('远离上边缘不触发', () => {
    const b = bounds(1920 - 420, 200)
    expect(shouldSnap(b, workArea)).toBe(false)
  })
  it('远离右边缘不触发', () => {
    const b = bounds(1920 - 420 - 200, 0)
    expect(shouldSnap(b, workArea)).toBe(false)
  })
})

describe('snapPosition', () => {
  it('顶部对齐、主体藏到右缘外、只留细条', () => {
    const p = snapPosition(workArea)
    expect(p.y).toBe(workArea.y)
    expect(p.x).toBe(workArea.x + workArea.width - SNAP_SLIVER)
  })
})

describe('restorePosition', () => {
  it('完整出现在屏幕右上角', () => {
    const p = restorePosition(workArea, 420)
    expect(p.y).toBe(workArea.y)
    expect(p.x).toBe(workArea.x + workArea.width - 420)
  })
})

describe('isInHotZone', () => {
  const corner: Point = { x: 1920 - 1, y: 1 }
  it('右上角内返回 true', () => {
    expect(isInHotZone(corner, workArea)).toBe(true)
  })
  it('超出热区宽度返回 false', () => {
    expect(isInHotZone({ x: 1920 - HOT_ZONE_WIDTH - 1, y: 1 }, workArea)).toBe(false)
  })
  it('超出热区高度返回 false', () => {
    expect(isInHotZone({ x: 1920 - 1, y: HOT_ZONE_HEIGHT + 1 }, workArea)).toBe(false)
  })
})

describe('isInside', () => {
  const rect: Rect = { x: 1500, y: 0, width: 420, height: 640 }
  it('矩形内部返回 true', () => {
    expect(isInside({ x: 1600, y: 300 }, rect)).toBe(true)
  })
  it('边界上的点返回 true', () => {
    expect(isInside({ x: 1500, y: 0 }, rect)).toBe(true)
    expect(isInside({ x: 1920, y: 640 }, rect)).toBe(true)
  })
  it('矩形外部返回 false', () => {
    expect(isInside({ x: 1499, y: 0 }, rect)).toBe(false)
    expect(isInside({ x: 1600, y: 641 }, rect)).toBe(false)
  })
})
