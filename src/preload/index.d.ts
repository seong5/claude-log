import { ElectronAPI } from '@electron-toolkit/preload'

export interface SessionData {
  sessionId: string
  tokens: number
  inputTokens: number
  outputTokens: number
  blockTokens: number
  firstTimestamp: string
  blockStartTimestamp: string
  blockEndTimestamp: string
  lastTimestamp: string
}

export interface DayData {
  date: string
  tokens: number
  inputTokens: number
  outputTokens: number
  sessions: number
  modelBreakdown: Record<string, number>
}

export interface ClaudeLogAPI {
  getDays: () => Promise<DayData[]>
  getCurrentSession: () => Promise<SessionData | null>
  getRecentFiveHourTokens: () => Promise<number>
  getOldestRecentEntryTime: () => Promise<number | null>
  getAdminWeekUsage: () => Promise<AdminWeekUsageData>
  getOAuthUsage: () => Promise<OAuthUsageData>
  onUpdate: (callback: (days: DayData[]) => void) => () => void
}

export interface AdminWeekUsageData {
  startingAt: string
  endingAt: string
  buckets: number
  totalTokens: number
  uncachedInputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  currentSessionTokens: number
  currentSessionPct: number
  currentSessionWindowLabel: string
}

export interface OAuthUsageData {
  sessionUsagePercent: number
  sessionResetSeconds: number
  weeklyAllModelsPercent: number
  weeklyAllModelsResetLabel: string
  weeklySonnetPercent: number
  planName: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    claudeLog: ClaudeLogAPI
  }
}
