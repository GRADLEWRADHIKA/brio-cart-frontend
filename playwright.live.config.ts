import { defineConfig, devices } from '@playwright/test';

/** Read-only smoke checks against the live site: no sign-ins, no orders. */
export default defineConfig({
  testDir: './e2e-live',
  timeout: 60_000,
  expect: { timeout: 15_000 }, // the live server is far away and small; allow for slower first loads
  workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.LIVE_URL ?? 'https://briocart.thegradlew.info', channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
});
