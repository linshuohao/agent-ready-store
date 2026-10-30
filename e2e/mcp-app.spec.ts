import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
let hostHtml: string;
test.beforeAll(async () => {
  const root = fileURLToPath(new URL('../apps/mcp-app/', import.meta.url));
  const require = createRequire(root + 'package.json');
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const appHtml = await readFile(
    new URL('../apps/api/dist/mcp-app/get-cart-v1.html', import.meta.url),
    'utf8',
  );
  const result = await build({
    root,
    configFile: false,
    logLevel: 'error',
    define: { __APP_HTML__: JSON.stringify(appHtml) },
    build: {
      write: false,
      minify: true,
      target: 'es2022',
      rolldownOptions: {
        input: root + 'test/host.ts',
        output: { codeSplitting: false },
      },
    },
  });
  const code = result.output
    .find((x: { type: string }) => x.type === 'chunk')
    .code.replace(/<\/script/gi, '<\\/script');
  hostHtml =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe title="Apps test fixture" style="width:100%;height:1800px;border:0" sandbox="allow-scripts allow-same-origin"></iframe><script type="module">' +
    code +
    '</script></body></html>';
});
test('official Bridge fixture supports row selection, fixed order, direct UI payment and explicit share', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('http://localhost:3999/', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/');
  const f = page.frameLocator('iframe');
  await expect(f.getByRole('status')).toContainText('最新購物車');
  await expect(
    f.getByRole('heading', { name: '同名耳機', exact: true }),
  ).toHaveCount(2);
  await f.getByLabel('數量 · P001', { exact: true }).fill('2');
  await page.keyboard.press('Enter');
  await expect(
    f.getByText('購物車 10000000-0000-4000-8000-000000000001 · 版本 2'),
  ).toBeVisible();
  await f.getByLabel('選購 P001 整行').check();
  await expect(f.getByRole('region', { name: '選中預估' })).toBeVisible();
  await f.getByRole('button', { name: '建立待支付訂單', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await expect(
    f.getByText('數量 2 · 單價 NT$ 10.00 · 小計 NT$ 20.00'),
  ).toBeVisible();
  await f.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '購買完成', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { fixture: { opens: string[] } }).fixture.opens,
    ),
  ).toEqual([]);
  await page.evaluate(() =>
    (
      window as unknown as { fixture: { remount: () => void } }
    ).fixture.remount(),
  );
  await expect(
    f.getByRole('heading', { name: '購買完成', exact: true }),
  ).toBeVisible();

  await f.getByRole('button', { name: '分享此訂單' }).click();
  await expect(f.getByRole('status')).toContainText('單訂單分享頁');
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { fixture: { opens: string[] } }).fixture.opens,
    ),
  ).toEqual([
    'http://localhost:3000/orders/20000000-0000-4000-8000-000000000001?view=share',
  ]);
  await f.getByRole('button', { name: '繼續原車購物' }).click();
  await expect(f.getByLabel('選購 P002 整行')).toBeVisible();
  await expect(f.getByLabel('選購 P001 整行')).toHaveCount(0);
  await f.getByRole('button', { name: '查詢全部訂單' }).click();
  await expect(f.getByRole('button', { name: /PAID · 200/ })).toBeVisible();
  expect(
    await f
      .locator('body')
      .evaluate((el) => el.scrollWidth > window.innerWidth),
  ).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: info.outputPath('apps-lifecycle.png'),
    fullPage: true,
  });
});
test('unknown payment only permits original action retry', async ({ page }) => {
  await page.route('http://localhost:3999/', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/');
  const f = page.frameLocator('iframe');
  await expect(f.getByRole('status')).toContainText('最新購物車');
  await f.getByLabel('選購 P001 整行').check();
  await f.getByRole('button', { name: '建立待支付訂單', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (
      window as unknown as { fixture: { controls: { failPayOnce: boolean } } }
    ).fixture.controls.failPayOnce = true;
  });
  await f.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await expect(f.getByRole('status')).toContainText('操作結果未知');
  await expect(
    f.getByRole('button', { name: '確認模擬支付', exact: true }),
  ).toBeDisabled();
  await f.getByRole('button', { name: '只讀重新載入' }).click();
  await expect(
    f.getByRole('button', { name: '確認模擬支付', exact: true }),
  ).toBeDisabled();
  await f.getByRole('button', { name: '明確重試原操作（支付）' }).click();
  await expect(
    f.getByRole('heading', { name: '購買完成', exact: true }),
  ).toBeVisible();
  const calls = await page.evaluate(
    () => (window as unknown as { fixture: { calls: string[] } }).fixture.calls,
  );
  expect(calls.filter((n) => n === 'apps_create_order')).toHaveLength(1);
  expect(calls.filter((n) => n === 'apps_pay_order')).toHaveLength(2);
  expect(
    calls.some((n) => n.includes('purchase') || n.includes('prepare')),
  ).toBe(false);
});
