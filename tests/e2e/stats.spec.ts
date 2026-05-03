import { test, expect } from '@playwright/test'
import { addCalendarDays, todayLocalYmd } from '../helpers/date'
import { injectClaudeLogMock, makeDayData } from '../helpers/mock-ipc'

const TODAY = todayLocalYmd()

test.describe('StatsPanel', () => {
  test('renders all four stat cards', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('연속 사용일')).toBeVisible()
    await expect(page.getByText('올해 누적')).toBeVisible()
    await expect(page.getByText('오늘 세션')).toBeVisible()
    await expect(page.getByText('주력 모델')).toBeVisible()
  })

  test('shows correct streak count for consecutive days', async ({ page }) => {
    // 3 consecutive calendar days before today with usage; today has no tokens (heatmap order)
    const days = [
      makeDayData({ date: addCalendarDays(TODAY, -3), tokens: 50_000 }),
      makeDayData({ date: addCalendarDays(TODAY, -2), tokens: 30_000 }),
      makeDayData({ date: addCalendarDays(TODAY, -1), tokens: 40_000 }),
      makeDayData({ date: TODAY, tokens: 0, sessions: 0 }),
    ]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    // "3일" appears in streak value (large) and potentially in sub text → use first()
    await expect(page.getByText('3일').first()).toBeVisible()
  })

  test('shows today session count', async ({ page }) => {
    const days = [makeDayData({ date: TODAY, tokens: 45_000, sessions: 2 })]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    await expect(page.getByText('2회').first()).toBeVisible()
  })

  test('shows top model name in 주력 모델 card', async ({ page }) => {
    // Model name with dot so extractVersion regex (\d+\.\d+) can match "4.5"
    const days = [
      makeDayData({
        date: TODAY,
        tokens: 100_000,
        modelBreakdown: { 'claude-sonnet-4.5': 100_000 },
      }),
    ]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    // shortModelName("claude-sonnet-4.5") → "Sonnet 4.5" (appears in card + model breakdown)
    await expect(page.getByText('Sonnet 4.5').first()).toBeVisible()
  })

  test('renders model breakdown progress bars', async ({ page }) => {
    const days = [
      makeDayData({
        date: TODAY,
        tokens: 100_000,
        modelBreakdown: { 'claude-opus-4.5': 60_000, 'claude-sonnet-4.5': 40_000 },
      }),
    ]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    // 모델별 사용량 section
    await expect(page.getByText('모델별 사용량')).toBeVisible()
    // Progress bars exist
    await expect(page.locator('[role="progressbar"]').first()).toBeVisible()
  })

  test('shows 이번 달 token total in hero card', async ({ page }) => {
    const days = [makeDayData({ date: TODAY, tokens: 1_000_000 })]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    await expect(page.getByText('이번 달').first()).toBeVisible()
    // 1M total → formatTokensShort(1000000) = "1.0M" (appears in hero card + 올해 누적 stat)
    await expect(page.getByText('1.0M').first()).toBeVisible()
  })

  test('shows peak day section when data exists', async ({ page }) => {
    const days = [makeDayData({ date: TODAY, tokens: 80_000 })]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    await expect(page.getByText('📈 최고 사용일')).toBeVisible()
  })
})
