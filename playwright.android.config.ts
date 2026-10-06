import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/android-ui',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 780 },
    userAgent: `${devices['Pixel 7'].userAgent} DekiAndroid/1.0`,
    baseURL: 'http://127.0.0.1:3001',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
