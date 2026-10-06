import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/regression',
  timeout: 45000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3101', channel: 'chrome' },
  webServer: {
    command: 'pnpm start',
    env: { PORT: '3101' },
    url: 'http://127.0.0.1:3101/health',
  },
});
