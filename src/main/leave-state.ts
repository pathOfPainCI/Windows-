// 光标移出窗口后自动收起的状态机（纯逻辑，无 Electron 依赖，便于单元测试）。

export interface LeaveState {
  // 光标是否进入过窗口。只有进入过之后，移出才会触发收起，
  // 避免热键/托盘唤出窗口时（光标离得很远、从未进入过）被立即误收起。
  hasEntered: boolean
}

export interface LeaveStep {
  state: LeaveState
  shouldSnap: boolean
}

// 处理一次轮询：inside 表示光标当前是否在窗口内。
// 返回新状态与「是否应收起」。光标进入过窗口、随后移出即立即收起（零延迟）。
export function stepLeave(state: LeaveState, inside: boolean): LeaveStep {
  if (inside) {
    return { state: { hasEntered: true }, shouldSnap: false }
  }
  if (!state.hasEntered) {
    return { state: { hasEntered: false }, shouldSnap: false }
  }
  // 已进入过且现在移出 → 立即收起
  return { state, shouldSnap: true }
}
