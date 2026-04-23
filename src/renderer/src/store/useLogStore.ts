import { create } from 'zustand'
import type { DayData, SessionData } from '../../../preload/index.d'

interface LogState {
  days: DayData[]
  loading: boolean
  currentSession: SessionData | null
  recentFiveHourTokens: number
  oldestRecentEntryTime: number | null
  init: () => Promise<void>
  destroy: () => void
}

export const useLogStore = create<LogState>((set) => {
  let _unsubscribe: (() => void) | null = null

  return {
    days: [],
    loading: true,
    currentSession: null,
    recentFiveHourTokens: 0,
    oldestRecentEntryTime: null,

    init: async () => {
      _unsubscribe?.()

      const [days, currentSession, recentFiveHourTokens, oldestRecentEntryTime] = await Promise.all([
        window.claudeLog.getDays(),
        window.claudeLog.getCurrentSession(),
        window.claudeLog.getRecentFiveHourTokens(),
        window.claudeLog.getOldestRecentEntryTime(),
      ])
      set({ days, loading: false, currentSession, recentFiveHourTokens, oldestRecentEntryTime })

      _unsubscribe = window.claudeLog.onUpdate(async (updated) => {
        const [currentSession, recentFiveHourTokens, oldestRecentEntryTime] = await Promise.all([
          window.claudeLog.getCurrentSession(),
          window.claudeLog.getRecentFiveHourTokens(),
          window.claudeLog.getOldestRecentEntryTime(),
        ])
        set({ days: updated, currentSession, recentFiveHourTokens, oldestRecentEntryTime })
      })
    },

    destroy: () => {
      _unsubscribe?.()
      _unsubscribe = null
    },
  }
})
