import { create } from 'zustand'
import type { DayData, SessionData } from '../../../preload/index.d'

interface LogState {
  days: DayData[]
  loading: boolean
  error: string | null
  currentSession: SessionData | null
  recentFiveHourTokens: number
  oldestRecentEntryTime: number | null
  init: () => Promise<void>
  destroy: () => void
}

export const useLogStore = create<LogState>((set) => {
  let _unsubscribe: (() => void) | null = null
  let _currentInitId = 0

  return {
    days: [],
    loading: true,
    error: null,
    currentSession: null,
    recentFiveHourTokens: 0,
    oldestRecentEntryTime: null,

    init: async () => {
      _unsubscribe?.()
      _unsubscribe = null
      const initId = ++_currentInitId
      set({ loading: true, error: null })

      try {
        const [days, currentSession, recentFiveHourTokens, oldestRecentEntryTime] = await Promise.all([
          window.claudeLog.getDays(),
          window.claudeLog.getCurrentSession(),
          window.claudeLog.getRecentFiveHourTokens(),
          window.claudeLog.getOldestRecentEntryTime(),
        ])

        if (initId !== _currentInitId) return

        set({ days, loading: false, currentSession, recentFiveHourTokens, oldestRecentEntryTime })
      } catch (err) {
        if (initId !== _currentInitId) return
        console.error('[useLogStore] init 실패:', err)
        set({ loading: false, error: '데이터를 불러올 수 없습니다. 앱을 재시작해주세요.' })
        return
      }

      _unsubscribe = window.claudeLog.onUpdate((payload) => {
        set({
          days: payload.days,
          currentSession: payload.currentSession,
          recentFiveHourTokens: payload.recentFiveHourTokens,
          oldestRecentEntryTime: payload.oldestRecentEntryTime,
        })
      })
    },

    destroy: () => {
      _unsubscribe?.()
      _unsubscribe = null
    },
  }
})
