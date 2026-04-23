import { test, expect } from '@playwright/test'
import { injectClaudeLogMock, makeOAuthUsageData } from '../helpers/mock-ipc'

test.describe('UsagePanel - OAuth', () => {
  test('renders 플랜 사용 한도 heading', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('📊 플랜 사용 한도')).toBeVisible()
  })

  test('shows Pro plan name by default', async ({ page }) => {
    await injectClaudeLogMock(page, { oauthUsage: makeOAuthUsageData({ planName: 'Pro' }) })
    await page.goto('/')
    // Plan name appears in the usage panel Badge
    const usagePanel = page.locator('text=📊 플랜 사용 한도').locator('../..')
    await expect(usagePanel.getByText('Pro')).toBeVisible()
  })

  test('shows Max plan name', async ({ page }) => {
    await injectClaudeLogMock(page, { oauthUsage: makeOAuthUsageData({ planName: 'Max (Extra)' }) })
    await page.goto('/')
    await expect(page.getByText('Max (Extra)')).toBeVisible()
  })

  test('shows session usage percentage', async ({ page }) => {
    await injectClaudeLogMock(page, { oauthUsage: makeOAuthUsageData({ sessionUsagePercent: 45 }) })
    await page.goto('/')
    await expect(page.getByText('45% 사용').first()).toBeVisible()
  })

  test('shows 현재 세션 and 전체 모델 labels', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    await expect(page.getByText('현재 세션').first()).toBeVisible()
    await expect(page.getByText('전체 모델')).toBeVisible()
  })

  test('shows reset countdown when sessionResetSeconds > 0', async ({ page }) => {
    await injectClaudeLogMock(page, {
      oauthUsage: makeOAuthUsageData({ sessionResetSeconds: 7200 }),
    })
    await page.goto('/')
    // 7200s = 2 hours 0 minutes
    await expect(page.getByText('2시간 0분 후 초기화')).toBeVisible()
  })

  test('shows error message when OAuth fetch fails', async ({ page }) => {
    const errMsg = 'OAuth 토큰을 찾을 수 없습니다. claude login 후 다시 시도하세요.'
    await injectClaudeLogMock(page, { oauthUsageError: errMsg })
    await page.goto('/')
    await expect(page.getByText(errMsg, { exact: false })).toBeVisible()
  })

  test('refresh button is present and clickable', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    const refreshBtn = page.locator('button[title="새로고침"]')
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()
  })

  test('? button toggles plan info tooltip', async ({ page }) => {
    await injectClaudeLogMock(page)
    await page.goto('/')
    const infoBtn = page.getByRole('button', { name: '플랜 데이터 안내 보기' })
    await expect(infoBtn).toBeVisible()
    await infoBtn.click()
    await expect(page.getByText('Oauth usage api 기반 데이터입니다.')).toBeVisible()
  })
})
