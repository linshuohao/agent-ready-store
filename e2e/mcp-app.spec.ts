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
    new URL('../apps/api/dist/mcp-app/get-cart-v4.html', import.meta.url),
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
async function openFixture(page: import('@playwright/test').Page, query = '') {
  await page.route('http://localhost:3999/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/' + query);
  return page.frameLocator('iframe');
}
test('Apps consumes the shared Web cart page and accessible controls', async ({
  page,
}) => {
  const f = await openFixture(page);
  await expect(f.locator('.commerce-page.cart-page')).toBeVisible();
  await expect(
    f.locator('.cart-selection [data-slot="checkbox"]').first(),
  ).toBeVisible();
  await expect(
    f.getByRole('heading', { name: '購物車', exact: true }),
  ).toBeVisible();
  await expect(f.getByRole('navigation', { name: '購物導覽' })).toBeVisible();
  await f.getByRole('checkbox', { name: '選取 P001', exact: true }).check();
  const indicator = f.locator('[data-slot="checkbox-indicator"]').nth(1);
  const icon = await indicator.locator('svg').boundingBox();
  const box = await indicator.locator('..').boundingBox();
  expect(icon!.x).toBeGreaterThanOrEqual(box!.x);
  expect(icon!.x + icon!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
});
test('shared cart, original order payment, remount, explicit share and continued shopping via Bridge', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const f = await openFixture(page);
  await f.getByRole('spinbutton', { name: '數量 P001', exact: true }).fill('2');
  await f
    .getByRole('spinbutton', { name: '數量 P001', exact: true })
    .press('Enter');
  await expect(
    f.getByRole('checkbox', { name: '選取 P001', exact: true }),
  ).toBeEnabled();
  await f.getByRole('checkbox', { name: '選取 P001', exact: true }).check();
  await expect(f.locator('.cart-totals')).toBeVisible();
  await f.getByRole('button', { name: '建立待支付訂單', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await expect(f.getByTestId('order-id')).toHaveText(
    '20000000-0000-4000-8000-000000000001',
  );
  await expect(f.locator('.purchase-product')).toContainText('2 件');
  await f.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as any).fixture.remount();
  });
  await expect(
    f.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await f.getByRole('link', { name: '查看所有訂單', exact: true }).click();
  await f.getByRole('link', { name: /訂單 20000000/ }).click();
  await expect(
    f.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await f.getByRole('button', { name: '分享這筆訂單', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).fixture.opens.length))
    .toBe(1);
  const calls = await page.evaluate(
    () => (window as any).fixture.calls as string[],
  );
  expect(calls.filter((n) => n === 'apps_pay_order')).toHaveLength(1);
  expect(calls.filter((n) => n === 'apps_create_order')).toHaveLength(1);
  await f.getByRole('link', { name: '繼續購物', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '找一件適合日常的好物。', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('shared original payment recovery survives a lost Bridge response without automatic retry', async ({
  page,
}) => {
  const f = await openFixture(page);
  await f.getByRole('checkbox', { name: '選取 P001', exact: true }).check();
  await f.getByRole('button', { name: '建立待支付訂單', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as any).fixture.controls.failPayOnce = true;
  });
  await f.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(
    f.getByRole('button', { name: '重試原單支付', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as any).fixture.calls.filter(
          (n: string) => n === 'apps_pay_order',
        ).length,
    ),
  ).toBe(1);
  await f.getByRole('button', { name: '重試原單支付', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as any).fixture.calls.filter(
          (n: string) => n === 'apps_create_order',
        ).length,
    ),
  ).toBe(1);
});
test('shared product details and reviews use the same artwork, controls and layout', async ({
  page,
}) => {
  const f = await openFixture(page, '?product');
  await expect(f.locator('.detail')).toBeVisible();
  await expect(
    f.getByRole('img', { name: 'P001 商品示意，非實物照片' }),
  ).toBeVisible();
  await expect(
    f.getByRole('heading', { name: '商品規格', exact: true }),
  ).toBeVisible();
  await expect(
    f.getByRole('button', { name: '加入購物車', exact: true }),
  ).toBeVisible();
  await expect(f.getByText('尚無評論。', { exact: true })).toBeVisible();
});
test('shared cart keeps the quantity draft after conflict until explicit reload', async ({
  page,
}) => {
  const f = await openFixture(page);
  await expect(
    f.getByRole('spinbutton', { name: '數量 P001', exact: true }),
  ).toHaveValue('1');
  await page.evaluate(() => {
    (window as any).fixture.controls.conflictOnce = true;
  });
  await f.getByRole('spinbutton', { name: '數量 P001', exact: true }).fill('2');
  await f
    .getByRole('spinbutton', { name: '數量 P001', exact: true })
    .press('Enter');
  await expect(
    f.getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    f.getByRole('spinbutton', { name: '數量 P001', exact: true }),
  ).toHaveValue('2');
  await f
    .getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    })
    .click();
  await expect(
    f.getByRole('spinbutton', { name: '數量 P001', exact: true }),
  ).toHaveValue('1');
});

test('same-route product retry issues a fresh Bridge read', async ({
  page,
}) => {
  const f = await openFixture(page, '?product&failDiscovery');
  await expect(
    f.getByRole('heading', { name: '暫時無法載入商品', exact: true }),
  ).toBeVisible();
  await f.getByRole('link', { name: '重試', exact: true }).click();
  await expect(
    f.getByRole('heading', { name: 'Aero 耳機', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as any).fixture.calls.filter((n: string) => n === 'get_product')
          .length,
    ),
  ).toBe(2);
});
test('external cart delivery preserves the current unsaved draft', async ({
  page,
}) => {
  const f = await openFixture(page);
  await f.getByRole('spinbutton', { name: '數量 P001', exact: true }).fill('2');
  await page.evaluate(async () => {
    await (window as any).fixture.deliverCart(
      '10000000-0000-4000-8000-000000000009',
    );
  });
  await expect(
    f.getByRole('button', { name: '查看收到的結果', exact: true }),
  ).toBeVisible();
  await expect(
    f.getByRole('spinbutton', { name: '數量 P001', exact: true }),
  ).toHaveValue('2');
  expect(
    await page.evaluate(
      () =>
        (window as any).fixture.calls.filter(
          (n: string) => n === 'update_cart_item',
        ).length,
    ),
  ).toBe(0);
});
