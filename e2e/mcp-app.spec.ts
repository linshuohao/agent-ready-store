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
    new URL('../apps/api/dist/mcp-app/get-cart-v3.html', import.meta.url),
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
  await expect(f.getByLabel('選購 P001 整行')).toBeVisible();
  await expect(f.getByRole('button', { name: '只讀重新載入' })).toHaveCount(0);
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
  const checkout = f.getByRole('button', {
    name: '建立待支付訂單',
    exact: true,
  });
  const quoteBox = await f.locator('.cart-totals').boundingBox();
  const actionBox = await checkout.boundingBox();
  expect(actionBox!.y - (quoteBox!.y + quoteBox!.height)).toBe(24);
  const noteBox = await f.locator('.commerce-action-note').boundingBox();
  expect(noteBox!.y - (actionBox!.y + actionBox!.height)).toBe(12);
  await checkout.click();
  await expect(
    f.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await expect(
    f.getByText('數量 2 · 單價 NT$ 10.00 · 小計 NT$ 20.00'),
  ).toBeVisible();
  const pay = f.getByRole('button', { name: '確認支付', exact: true });
  const cancel = f.getByRole('button', { name: '取消原訂單', exact: true });
  const payBox = await pay.boundingBox();
  const cancelBox = await cancel.boundingBox();
  expect(cancelBox!.y - (payBox!.y + payBox!.height)).toBe(12);
  expect(await pay.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
    'rgb(25, 25, 25)',
  );
  expect(
    await cancel.evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe('rgb(255, 255, 255)');
  await pay.click();
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
  await expect(f.getByRole('link', { name: /PAID · 200/ })).toBeVisible();
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
  await expect(f.getByLabel('選購 P001 整行')).toBeVisible();
  await expect(f.getByRole('button', { name: '只讀重新載入' })).toHaveCount(0);
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
  await f.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(f.getByRole('status')).toContainText('操作結果未知');
  await expect(
    f.getByRole('button', { name: '確認支付', exact: true }),
  ).toBeDisabled();
  await f.getByRole('button', { name: '查詢原操作結果' }).click();
  await expect(
    f.getByRole('button', { name: '確認支付', exact: true }),
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
test('pending orders are links with spaced order navigation', async ({
  page,
}, info) => {
  await page.route('http://localhost:3999/', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/');
  const f = page.frameLocator('iframe');
  await f.getByLabel('選購 P001 整行').check();
  await f.getByRole('button', { name: '建立待支付訂單', exact: true }).click();
  await f.getByRole('button', { name: '繼續原車購物' }).click();
  const link = f.getByRole('link', { name: /待支付 200/ });
  await expect(link).toBeVisible();
  const a = (await link.boundingBox())!;
  const b = (await f
    .getByRole('button', { name: '查詢全部訂單' })
    .boundingBox())!;
  expect(b.y - a.y - a.height).toBeGreaterThanOrEqual(12);
  await page.screenshot({
    path: info.outputPath('apps-order-links.png'),
    fullPage: true,
  });
  await link.click();
  await expect(
    f.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
});

test('product card embeds artwork without routine refresh clutter', async ({
  page,
}) => {
  await page.route('http://localhost:3999/?product', (route) =>
    route.fulfill({ contentType: 'text/html', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/?product');
  const f = page.frameLocator('iframe');
  await expect(
    f.getByRole('img', { name: 'P001 商品示意，非實物照片' }),
  ).toBeVisible();
  await expect(f.locator('.product-art svg')).toBeVisible();
  expect(
    await f
      .locator('.product-card')
      .evaluate(
        (el) =>
          el.getBoundingClientRect().bottom -
          el.lastElementChild!.getBoundingClientRect().bottom,
      ),
  ).toBeLessThan(40);
  await expect(f.getByRole('status')).toHaveCount(0);
  await expect(f.getByRole('button', { name: '只讀重新載入' })).toHaveCount(0);
});
test('cart conflict opens a dialog and explicit refresh restores server quantity', async ({
  page,
}, info) => {
  await page.route('http://localhost:3999/', (route) =>
    route.fulfill({ contentType: 'text/html', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/');
  const f = page.frameLocator('iframe');
  await expect(f.getByLabel('數量 · P001', { exact: true })).toHaveValue('1');
  await page.evaluate(() => {
    (window as any).fixture.controls.conflictOnce = true;
  });
  await f.getByLabel('數量 · P001', { exact: true }).fill('2');
  await page.keyboard.press('Enter');
  const dialog = f.getByRole('dialog', { name: '資料需要重新確認' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('放棄尚未儲存');
  await dialog.getByRole('button', { name: '稍後處理' }).click();
  await expect(dialog).not.toBeVisible();
  await f.getByRole('button', { name: '處理資料更新' }).click();
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: info.outputPath('conflict-dialog.png') });
  await dialog.getByRole('button', { name: '刷新資料' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(f.getByLabel('數量 · P001', { exact: true })).toHaveValue('1');
  await expect(f.getByRole('status')).toHaveCount(0);
});
