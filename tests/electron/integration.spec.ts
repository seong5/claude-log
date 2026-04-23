import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const APP_PATH = path.join(__dirname, '../../out/main/index.js')
const FIXTURE_JSONL = path.join(__dirname, '../fixtures/sample.jsonl')

test.describe('Electron integration', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(APP_PATH)) {
      throw new Error(
        `Built app not found at ${APP_PATH}. Run 'pnpm build' first.`,
      )
    }
  })

  test('app launches without crashing', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-log-test-'))
    const projectDir = path.join(tmpDir, 'test-project')
    fs.mkdirSync(projectDir, { recursive: true })
    fs.copyFileSync(FIXTURE_JSONL, path.join(projectDir, 'session.jsonl'))

    let app: Awaited<ReturnType<typeof electron.launch>> | undefined
    try {
      app = await electron.launch({
        args: [APP_PATH],
        env: {
          ...process.env,
          CLAUDE_DATA_DIR: tmpDir,
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
        },
        timeout: 30_000,
      })

      const isReady = await app.evaluate(async ({ app: electronApp }) => electronApp.isReady())
      expect(isReady).toBe(true)
    } finally {
      await app?.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test('IPC getDays returns parsed data from fixture JSONL', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-log-test-'))
    const projectDir = path.join(tmpDir, 'test-project')
    fs.mkdirSync(projectDir, { recursive: true })
    fs.copyFileSync(FIXTURE_JSONL, path.join(projectDir, 'session.jsonl'))

    let app: Awaited<ReturnType<typeof electron.launch>> | undefined
    try {
      app = await electron.launch({
        args: [APP_PATH],
        env: {
          ...process.env,
          CLAUDE_DATA_DIR: tmpDir,
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
        },
        timeout: 30_000,
      })

      // The BrowserWindow is created on ready — firstWindow waits for it
      const page = await app.firstWindow()
      await page.waitForLoadState('domcontentloaded')

      // Call real IPC via the preload bridge
      const days = await page.evaluate(() => window.claudeLog.getDays())

      expect(Array.isArray(days)).toBe(true)
      expect(days.length).toBeGreaterThan(0)

      // Fixture: 2026-04-23 has two entries
      // entry1: input=1000, output=250, cache_creation=0 → input=1000, output=250, total=1250
      // entry2: input=2000, output=500, cache_creation=500 → input=2500, output=500, total=3000
      // 2026-04-23 total: 1250 + 3000 = 4250
      const apr23 = days.find((d: { date: string }) => d.date === '2026-04-23')
      expect(apr23).toBeTruthy()
      expect(apr23?.tokens).toBe(4250)

      // Fixture: 2026-04-22 has one entry
      // entry3: input=5000, output=1200, cache_read=2000 → input=7000, output=1200, total=8200
      const apr22 = days.find((d: { date: string }) => d.date === '2026-04-22')
      expect(apr22).toBeTruthy()
      expect(apr22?.tokens).toBe(8200)
    } finally {
      await app?.close()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
