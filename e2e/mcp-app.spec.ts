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
test('official SDK fixture renders and edits the same cart in narrow and wide containers', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('http://localhost:3999/', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('status')).toContainText('最新報價');
  await expect(
    frame.getByRole('heading', { name: '同名耳機', exact: true }),
  ).toHaveCount(2);
  await frame.getByLabel('數量 · P001', { exact: true }).fill('2');
  await expect(
    frame.getByRole('button', { name: '核對並準備購買' }),
  ).toBeDisabled();
  await frame.getByRole('button', { name: '儲存調整' }).focus();
  await page.keyboard.press('Enter');
  await expect(frame.getByRole('status')).toContainText('已儲存');
  await expect(
    frame.getByText('AI 助理準備 · 版本 2', { exact: true }),
  ).toBeVisible();
  await expect(frame.getByText('NT$ 30.00', { exact: true })).toHaveCount(2);
  await frame.getByRole('button', { name: '核對並準備購買' }).click();
  await expect(
    frame.getByRole('heading', { name: '確認購買', exact: true }),
  ).toBeVisible();
  await expect(
    frame.getByRole('button', { name: '確認支付', exact: true }),
  ).toBeEnabled();
  const body = await frame.locator('body').innerText();
  expect(body).not.toContain('A'.repeat(43));
  const dom = await frame.locator('#root').evaluate((el) => el.innerHTML);
  expect(dom.includes('A'.repeat(43))).toBe(false);
  expect(dom).not.toContain('#handoff=');
  expect(dom).not.toContain('fixture-pay');
  expect(dom).not.toContain('fixture-cancel');
  expect(
    await page.evaluate(() => {
      const f = (
        window as unknown as { fixture: { calls: string[]; opens: string[] } }
      ).fixture;
      return { calls: f.calls, opens: f.opens.length };
    }),
  ).toEqual({
    calls: ['get_cart', 'update_cart', 'get_cart', 'prepare_checkout'],
    opens: 0,
  });
  const overflow = await frame
    .locator('body')
    .evaluate((el) => el.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await frame.getByRole('button', { name: '確認支付', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    frame.getByRole('heading', { name: '購買完成', exact: true }),
  ).toBeVisible();
  await expect(
    frame.getByRole('button', { name: '確認支付', exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { fixture: { opens: string[] } }).fixture.opens
          .length,
    ),
  ).toBe(0);
  await frame.getByRole('button', { name: '開啟唯讀訂單詳情' }).click();
  await expect(frame.getByRole('status')).toContainText('已請求開啟唯讀');
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { fixture: { opens: string[] } }).fixture.opens
          .length,
    ),
  ).toBe(1);
  expect(await frame.locator('#root').innerHTML()).not.toContain(
    'fixture-order',
  );
  expect(errors).toEqual([]);
  await page.screenshot({
    path: info.outputPath('mcp-app-fixture.png'),
    fullPage: true,
  });
});

test('unknown fixture payment requires readonly status and explicit original-review retry', async ({
  page,
}) => {
  await page.route('http://localhost:3999/', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostHtml }),
  );
  await page.goto('http://localhost:3999/');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('status')).toContainText('最新報價');
  await frame.getByRole('button', { name: '核對並準備購買' }).click();
  await expect(
    frame.getByRole('button', { name: '確認支付', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    (
      window as unknown as { fixture: { controls: { failPayOnce: boolean } } }
    ).fixture.controls.failPayOnce = true;
  });
  await frame.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(frame.getByRole('status')).toContainText('操作結果未知');
  await expect(
    frame.getByRole('button', { name: '確認支付', exact: true }),
  ).toBeDisabled();
  await frame.getByRole('button', { name: '查詢原準備狀態' }).click();
  await expect(
    frame.getByRole('button', { name: '明確重試原購買' }),
  ).toBeEnabled();
  await expect(
    frame.getByRole('button', { name: '確認支付', exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as { fixture: { calls: string[] } }
        ).fixture.calls.filter((x) => x === 'pay_purchase').length,
    ),
  ).toBe(1);
  await frame.getByRole('button', { name: '明確重試原購買' }).click();
  await expect(
    frame.getByRole('heading', { name: '購買完成', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as { fixture: { calls: string[] } }
        ).fixture.calls.filter((x) => x === 'prepare_checkout').length,
    ),
  ).toBe(1);
});
