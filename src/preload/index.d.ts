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
  onUpdate: (callback: (days: DayData[]) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    claudeLog: ClaudeLogAPI
  }
}
