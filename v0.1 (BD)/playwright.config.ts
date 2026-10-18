import { defineConfig, devices } from '@playwright/test'
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:3080'
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    baseURL: origin,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH ? {
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: JSON.parse(process.env.CHROMIUM_ARGS || '["--no-sandbox"]'),
    } : undefined,
  },
  webServer: {
    command: 'npm start',
    url: `${origin}/api/health`,
    reuseExistingServer: false,
    timeout: 60000,
    env: { API_PORT: '3080', APP_ORIGIN: origin, PAYMENT_MODE: 'mock', SEED_DEMO: 'true', NODE_ENV: 'production', COOKIE_SECURE: 'false' },
  },
})
