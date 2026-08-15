import type { ClipboardToolApi } from '@shared/api'

declare global {
  interface Window {
    api: ClipboardToolApi
  }
}

export const api: ClipboardToolApi = window.api
