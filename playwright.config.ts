import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ...(isCI ? [['github'] as ['github']] : [['list'] as ['list']]),
  ],

  projects: [
    {
      name: 'renderer',
      testMatch: 'tests/e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
      },
    },
    {
      name: 'electron',
      testMatch: 'tests/electron/**/*.spec.ts',
      use: {
        trace: 'on-first-retry',
      },
    },
  ],

  webServer: {
    command: 'pnpm vite:dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 30_000,
  },
})
