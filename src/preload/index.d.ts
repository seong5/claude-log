import { ElectronAPI } from '@electron-toolkit/preload'

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
  onUpdate: (callback: (days: DayData[]) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    claudeLog: ClaudeLogAPI
  }
}
