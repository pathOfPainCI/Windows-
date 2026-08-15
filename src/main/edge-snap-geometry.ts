// 贴边吸附的纯几何计算，独立于 Electron，便于单元测试。
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

// 窗口右上角距屏幕右上角小于该值（px）时触发吸附
export const SNAP_THRESHOLD = 30
// 吸附后留在屏幕内的细条宽度（px），作为「已收起」的视觉提示
export const SNAP_SLIVER = 4
// 收起状态下，光标进入屏幕右上角该矩形区域即弹出
export const HOT_ZONE_WIDTH = 40
export const HOT_ZONE_HEIGHT = 64

// 窗口是否贴到屏幕右上角（顶部与右缘都进入阈值内）
export function shouldSnap(bounds: Rect, workArea: Rect): boolean {
  const nearTop = bounds.y <= workArea.y + SNAP_THRESHOLD
  const nearRight = bounds.x + bounds.width >= workArea.x + workArea.width - SNAP_THRESHOLD
  return nearTop && nearRight
}

// 收起位置：顶部对齐屏幕顶部，主体藏到右边缘外，只留 SNAP_SLIVER 细条
export function snapPosition(workArea: Rect): Point {
  return { x: workArea.x + workArea.width - SNAP_SLIVER, y: workArea.y }
}

// 弹出位置：完整出现在屏幕右上角
export function restorePosition(workArea: Rect, width: number): Point {
  return { x: workArea.x + workArea.width - width, y: workArea.y }
}

// 光标是否进入屏幕右上角热区
export function isInHotZone(point: Point, workArea: Rect): boolean {
  const inX = point.x >= workArea.x + workArea.width - HOT_ZONE_WIDTH
  const inY = point.y <= workArea.y + HOT_ZONE_HEIGHT
  return inX && inY
}

// 光标是否在某个矩形内（含边界）
export function isInside(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}
