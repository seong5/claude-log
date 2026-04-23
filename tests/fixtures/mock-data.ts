export interface DayData {
  date: string
  tokens: number
  inputTokens: number
  outputTokens: number
  sessions: number
  modelBreakdown: Record<string, number>
}

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

export interface OAuthUsageData {
  sessionUsagePercent: number
  sessionResetSeconds: number
  weeklyAllModelsPercent: number
  weeklyAllModelsResetLabel: string
  weeklySonnetPercent: number
  planName: string
}

export function makeDayData(overrides: Partial<DayData> = {}): DayData {
  return {
    date: '2026-04-23',
    tokens: 50_000,
    inputTokens: 40_000,
    outputTokens: 10_000,
    sessions: 3,
    modelBreakdown: { 'claude-sonnet-4.5': 50_000 },
    ...overrides,
  }
}

export function makeSessionData(overrides: Partial<SessionData> = {}): SessionData {
  return {
    sessionId: 'test-session-abc123',
    tokens: 75_000,
    inputTokens: 60_000,
    outputTokens: 15_000,
    blockTokens: 30_000,
    firstTimestamp: '2026-04-23T09:00:00.000Z',
    blockStartTimestamp: '2026-04-23T09:00:00.000Z',
    blockEndTimestamp: '2026-04-23T14:00:00.000Z',
    lastTimestamp: '2026-04-23T11:30:00.000Z',
    ...overrides,
  }
}

export function makeOAuthUsageData(overrides: Partial<OAuthUsageData> = {}): OAuthUsageData {
  return {
    sessionUsagePercent: 45,
    sessionResetSeconds: 7200,
    weeklyAllModelsPercent: 62,
    weeklyAllModelsResetLabel: '토 오전 9:00',
    weeklySonnetPercent: 55,
    planName: 'Pro',
    ...overrides,
  }
}

export function makeWeekOfDays(today: string, count = 7): DayData[] {
  const result: DayData[] = []
  const base = new Date(today + 'T00:00:00')
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const tokens = i === 0 ? 0 : 10_000 + i * 5_000
    result.push(
      makeDayData({
        date: `${yyyy}-${mm}-${dd}`,
        tokens,
        inputTokens: Math.floor(tokens * 0.8),
        outputTokens: Math.floor(tokens * 0.2),
        sessions: tokens > 0 ? 2 : 0,
      }),
    )
  }
  return result
}
