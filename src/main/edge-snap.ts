import { screen } from 'electron'
import type { BrowserWindow } from 'electron'
import {
  shouldSnap,
  snapPosition,
  restorePosition,
  isInHotZone,
  isInside
} from './edge-snap-geometry'
import type { Rect, Point } from './edge-snap-geometry'
import { stepLeave } from './leave-state'
import type { LeaveState } from './leave-state'

// 轮询光标位置的间隔（ms）
const POLL_INTERVAL = 50
// 弹出后短暂抑制吸附，避免 setPosition 触发的 moved 事件立刻再次收起
const SUPPRESS_MS = 500

// 贴边吸附：窗口拖到屏幕右上角时自动收起，光标移到右上角时自动弹出，
// 光标移开窗口后自动再次收起。
export class EdgeSnapManager {
  private snapped = false
  private suppressing = false
  // 收起状态下光标是否已在热区内（边沿触发用）
  private cursorInHotZone = false
  // 光标移出后自动收起的状态机（展开态用）
  private leaveState: LeaveState = { hasEntered: false }
  private workArea: Rect | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(private win: BrowserWindow) {}

  start(): void {
    // 用 moved（拖拽/移动结束后触发一次），而不是 move（拖动过程中连续触发）。
    // move 期间系统仍在主导拖拽，此时 setPosition 会被覆盖，吸附不生效。
    this.win.on('moved', () => this.onMoved())
    this.win.on('closed', () => this.stop())
    this.startPolling()
  }

  isSnapped(): boolean {
    return this.snapped
  }

  // 供热键/托盘调用：收起时先弹出，而不是直接隐藏
  restore(): void {
    if (this.snapped) this.doRestore()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private onMoved(): void {
    if (this.snapped || this.suppressing) return
    const bounds = this.win.getBounds()
    const workArea = screen.getDisplayMatching(bounds).workArea
    if (shouldSnap(bounds, workArea)) this.snap(workArea)
  }

  private startPolling(): void {
    this.stop()
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL)
  }

  private poll(): void {
    if (!this.win.isVisible() || this.win.isDestroyed()) {
      this.leaveState = { hasEntered: false }
      return
    }
    const cursor = screen.getCursorScreenPoint()
    if (this.snapped) this.pollWhileSnapped(cursor)
    else this.pollWhileVisible(cursor)
  }

  private pollWhileSnapped(cursor: Point): void {
    const workArea = this.workArea
    if (!workArea) return
    const inHot = isInHotZone(cursor, workArea)
    // 边沿触发：只有光标从「热区外」重新进入「热区内」才弹出，避免吸附后立刻弹出
    if (inHot && !this.cursorInHotZone) {
      this.doRestore()
    } else {
      this.cursorInHotZone = inHot
    }
  }

  private pollWhileVisible(cursor: Point): void {
    const inside = isInside(cursor, this.win.getBounds())
    const step = stepLeave(this.leaveState, inside)
    this.leaveState = step.state
    if (step.shouldSnap) this.snapToDock()
  }

  // 光标移开后无条件缩回右上角（无需贴边判断）
  private snapToDock(): void {
    if (this.snapped) return
    const bounds = this.win.getBounds()
    const workArea = screen.getDisplayMatching(bounds).workArea
    this.snap(workArea)
  }

  private snap(workArea: Rect): void {
    this.snapped = true
    this.workArea = workArea
    // 拖拽松手/移开时光标可能就在角落，记录为「已在热区内」，避免一吸附就立刻弹出
    const cursor = screen.getCursorScreenPoint()
    this.cursorInHotZone = isInHotZone(cursor, workArea)
    this.leaveState = { hasEntered: false }
    const p = snapPosition(workArea)
    this.win.setPosition(p.x, p.y)
    console.log('[edge-snap] 吸附到右上角')
  }

  private doRestore(): void {
    const workArea = this.workArea
    if (!workArea) return
    this.snapped = false
    this.suppressing = true
    this.cursorInHotZone = true
    this.leaveState = { hasEntered: false }
    const width = this.win.getBounds().width
    const p = restorePosition(workArea, width)
    this.win.setPosition(p.x, p.y)
    console.log('[edge-snap] 弹出')
    setTimeout(() => {
      this.suppressing = false
    }, SUPPRESS_MS)
  }
}
