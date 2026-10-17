import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real UI and an isolated API + SQLite database.
 * Requires BRIO_BACKEND_DIR (path to the brio-cart-backend project); see e2e/start-api.mjs.
 * Uses the locally installed Google Chrome (channel: 'chrome'); run
 * `npx playwright install chromium` and drop `channel` if Chrome isn't installed.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5710',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'chrome',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: 'node e2e/start-api.mjs',
      url: 'http://localhost:4710/api/health',
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      command: 'npx vite --port 5710 --strictPort',
      url: 'http://localhost:5710',
      timeout: 120_000,
      reuseExistingServer: false,
      env: { BRIO_API_PROXY: 'http://localhost:4710' },
    },
  ],
});
