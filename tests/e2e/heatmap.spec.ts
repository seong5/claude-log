import { test, expect } from '@playwright/test'
import { injectClaudeLogMock, makeDayData } from '../helpers/mock-ipc'
import { addCalendarDays, todayLocalYmd } from '../helpers/date'

const TODAY = todayLocalYmd()

test.describe('TokenHeatmap', () => {
  test('renders 활동 히트맵 section heading', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('🗓 활동 히트맵')).toBeVisible()
  })

  test('renders heatmap year range subtitle', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    const year = new Date().getFullYear()
    await expect(page.getByText(`${year}년 1월 ~ 12월 토큰 사용 기록`)).toBeVisible()
  })

  test('renders active days badge with 일 활성 text', async ({ page }) => {
    const days = [
      makeDayData({ date: '2026-01-10', tokens: 50_000 }),
      makeDayData({ date: '2026-01-11', tokens: 30_000 }),
      makeDayData({ date: '2026-01-12', tokens: 0 }),
    ]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    await expect(page.getByText('일 활성')).toBeVisible()
  })

  test('renders legend items 적음 and 많음', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('적음')).toBeVisible()
    await expect(page.getByText('많음')).toBeVisible()
  })

  test('shows tooltip with 총 토큰 on colored cell hover', async ({ page }) => {
    const days = [makeDayData({ date: addCalendarDays(TODAY, -2), tokens: 120_000, sessions: 4 })]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')

    await expect(page.getByText('🗓 활동 히트맵')).toBeVisible()

    // Find the index of the first colored cell (non-white = has token data)
    const coloredIndex = await page.evaluate((): number => {
      const cells = [...document.querySelectorAll<HTMLElement>('.hover\\:scale-125')]
      return cells.findIndex((cell) => {
        const bg = cell.style.backgroundColor
        return bg && bg !== 'rgb(255, 255, 255)' && bg !== ''
      })
    })

    expect(coloredIndex).toBeGreaterThanOrEqual(0)

    // locator.hover() auto-scrolls the element into view before hovering
    await page.locator('.hover\\:scale-125').nth(coloredIndex).hover()
    await expect(page.getByText('총 토큰')).toBeVisible({ timeout: 2000 })
  })

  test('renders month labels (1월, 3월)', async ({ page }) => {
    const days = [
      makeDayData({ date: '2026-01-15', tokens: 10_000 }),
      makeDayData({ date: '2026-03-10', tokens: 20_000 }),
    ]
    await injectClaudeLogMock(page, { days })
    await page.goto('/')
    await expect(page.getByTitle('2026년 1월')).toContainText('1월')
    await expect(page.getByTitle('2026년 3월')).toContainText('3월')
  })
})
