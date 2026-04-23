import { test, expect } from '@playwright/test'
import { injectClaudeLogMock, makeOAuthUsageData, makeWeekOfDays } from '../helpers/mock-ipc'

const TODAY = '2026-04-23'

test.describe('Dashboard layout', () => {
  test('renders app header with Claude Log title', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('Claude Log')).toBeVisible()
  })

  test('renders Beta badge', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('Beta')).toBeVisible()
  })

  test('renders CLAUDE-LOG hero heading', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('CLAUDE-LOG ✨')).toBeVisible()
  })

  test('renders 이번 달 and 최근 7일 hero cards', async ({ page }) => {
    await injectClaudeLogMock(page, { days: makeWeekOfDays(TODAY, 30) })
    await page.goto('/')
    await expect(page.getByText('이번 달').first()).toBeVisible()
    await expect(page.getByText('최근 7일').first()).toBeVisible()
  })

  test('renders all four main sections after data loads', async ({ page }) => {
    await injectClaudeLogMock(page, { days: makeWeekOfDays(TODAY, 30) })
    await page.goto('/')
    await expect(page.getByText('🗓 활동 히트맵')).toBeVisible()
    await expect(page.getByText('📊 요약 통계')).toBeVisible()
    await expect(page.getByText('📊 플랜 사용 한도')).toBeVisible()
  })

  test('shows OAuth connected badge when auth succeeds', async ({ page }) => {
    await injectClaudeLogMock(page, { oauthUsage: makeOAuthUsageData() })
    await page.goto('/')
    await expect(page.getByText('연결됨')).toBeVisible()
  })

  test('shows OAuth disconnected badge when auth fails', async ({ page }) => {
    await injectClaudeLogMock(page, { oauthUsageError: 'OAuth 토큰을 찾을 수 없습니다.' })
    await page.goto('/')
    await expect(page.getByText('연결 안됨')).toBeVisible()
  })

  test('shows loading state while data is being fetched', async ({ page }) => {
    // Inject a slow getDays to observe loading state
    await page.addInitScript(() => {
      // @ts-ignore
      window.claudeLog = {
        getDays: () => new Promise((resolve) => setTimeout(() => resolve([]), 2000)),
        getCurrentSession: () => Promise.resolve(null),
        getRecentFiveHourTokens: () => Promise.resolve(0),
        getOldestRecentEntryTime: () => Promise.resolve(null),
        getAdminWeekUsage: () => Promise.reject(new Error('not mocked')),
        getOAuthUsage: () => Promise.reject(new Error('not connected')),
        onUpdate: () => () => {},
      }
    })
    await page.goto('/')
    await expect(page.getByText('JSONL 파일 파싱 중…')).toBeVisible()
  })
})
