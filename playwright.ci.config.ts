import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

// Never run the writing browser suite against the developer's demo database.
if (
  !process.env.DATABASE_URL ||
  new URL(process.env.DATABASE_URL).pathname !== '/store_e2e_test'
) {
  throw new Error('Browser CI requires a disposable store_e2e_test database');
}
const api = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3003';
const web = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:3004';
process.env.CHECKOUT_INTEGRATION = '1';
process.env.WEB_BASE_URL = web;

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'shopping-smoke.spec.ts',
    'cart-lifecycle.spec.ts',
    'order-lifecycle.spec.ts',
  ],
  grep: /@ci/,
  forbidOnly: true,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: 'test-results/browser',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: web,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: `${api}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        HOST: '127.0.0.1',
        PORT: new URL(api).port,
        WEB_ORIGIN: new URL(web).origin,
        CATALOG_PATH: resolve('references/products.json'),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `pnpm --filter @store/web start --hostname 127.0.0.1 --port ${new URL(web).port}`,
      url: web,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_INTERNAL_URL: api },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
