import { create } from 'zustand'
import type { DayData } from '../../../preload/index.d'

interface LogState {
  days: DayData[]
  loading: boolean
  init: () => Promise<void>
  destroy: () => void
}

let _unsubscribe: (() => void) | null = null

export const useLogStore = create<LogState>((set) => ({
  days: [],
  loading: true,

  init: async () => {
    // 중복 구독 방지
    _unsubscribe?.()

    const days = await window.claudeLog.getDays()
    set({ days, loading: false })

    _unsubscribe = window.claudeLog.onUpdate((updated) => {
      set({ days: updated })
    })
  },

  destroy: () => {
    _unsubscribe?.()
    _unsubscribe = null
  },
}))
