import type { Page } from '@playwright/test'
import {
  makeDayData,
  makeSessionData,
  makeOAuthUsageData,
  makeWeekOfDays,
  type DayData,
  type SessionData,
  type OAuthUsageData,
} from '../fixtures/mock-data'
import { todayLocalYmd } from './date'

export interface MockIpcOptions {
  days?: DayData[]
  currentSession?: SessionData | null
  recentFiveHourTokens?: number
  oldestRecentEntryTime?: number | null
  oauthUsage?: OAuthUsageData
  oauthUsageError?: string
}

export async function injectClaudeLogMock(page: Page, opts: MockIpcOptions = {}): Promise<void> {
  const days = opts.days ?? makeWeekOfDays(todayLocalYmd(), 30)
  const currentSession =
    opts.currentSession !== undefined ? opts.currentSession : makeSessionData()
  const recentFiveHourTokens = opts.recentFiveHourTokens ?? 30_000
  const oldestRecentEntryTime =
    opts.oldestRecentEntryTime !== undefined ? opts.oldestRecentEntryTime : Date.now() - 3_600_000
  const oauthUsage = opts.oauthUsage ?? makeOAuthUsageData()
  const oauthUsageError = opts.oauthUsageError ?? null

  // Data must be serializable — functions are stringified and re-evaluated in the browser context
  await page.addInitScript(
    ({
      _days,
      _currentSession,
      _recentFiveHourTokens,
      _oldestRecentEntryTime,
      _oauthUsage,
      _oauthUsageError,
    }) => {
      // @ts-ignore — injected into browser context before page scripts run
      window.claudeLog = {
        getDays: () => Promise.resolve(_days),
        getCurrentSession: () => Promise.resolve(_currentSession),
        getRecentFiveHourTokens: () => Promise.resolve(_recentFiveHourTokens),
        getOldestRecentEntryTime: () => Promise.resolve(_oldestRecentEntryTime),
        getAdminWeekUsage: () => Promise.reject(new Error('Admin API not mocked')),
        getOAuthUsage: () =>
          _oauthUsageError
            ? Promise.reject(new Error(_oauthUsageError))
            : Promise.resolve(_oauthUsage),
        onUpdate: (_cb: unknown) => () => {},
      }
    },
    {
      _days: days,
      _currentSession: currentSession,
      _recentFiveHourTokens: recentFiveHourTokens,
      _oldestRecentEntryTime: oldestRecentEntryTime,
      _oauthUsage: oauthUsage,
      _oauthUsageError: oauthUsageError,
    },
  )
}

export { makeDayData, makeSessionData, makeOAuthUsageData, makeWeekOfDays }
