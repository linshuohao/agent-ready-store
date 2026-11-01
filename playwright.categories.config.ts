import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './category-e2e',
  testMatch: 'category-discovery.spec.ts',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4310',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node category-e2e/category-fixture.mjs',
      url: 'http://127.0.0.1:4312/api/v1/health',
      reuseExistingServer: false,
    },
    {
      command: 'pnpm --filter @store/web dev --port 4310 --hostname 127.0.0.1',
      url: 'http://127.0.0.1:4310',
      env: { API_INTERNAL_URL: 'http://127.0.0.1:4312' },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
});
