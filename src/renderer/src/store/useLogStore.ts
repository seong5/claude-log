import { create } from 'zustand'
import type { DayData } from '../../../preload/index.d'

interface LogState {
  days: DayData[]
  loading: boolean
  init: () => Promise<void>
}

export const useLogStore = create<LogState>((set) => ({
  days: [],
  loading: true,

  init: async () => {
    const days = await window.claudeLog.getDays()
    set({ days, loading: false })

    // Subscribe to incremental updates from main process
    window.claudeLog.onUpdate((updated) => {
      set({ days: updated })
    })
  },
}))
