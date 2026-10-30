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
  await page.route('http://s6.test/', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: hostHtml }),
  );
  await page.goto('http://s6.test/');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('status')).toContainText('最新報價');
  await expect(
    frame.getByRole('heading', { name: '同名耳機', exact: true }),
  ).toHaveCount(2);
  await frame.getByLabel('數量 · P001', { exact: true }).fill('2');
  await expect(
    frame.getByRole('button', { name: '前往商城結帳' }),
  ).toBeDisabled();
  await frame.getByRole('button', { name: '儲存調整' }).focus();
  await page.keyboard.press('Enter');
  await expect(frame.getByRole('status')).toContainText('已儲存');
  await expect(
    frame.getByText('AI 助理準備 · 版本 2', { exact: true }),
  ).toBeVisible();
  await expect(frame.getByText('NT$ 30.00', { exact: true })).toHaveCount(2);
  await frame.getByRole('button', { name: '前往商城結帳' }).click();
  await expect(frame.getByRole('status')).toContainText('若未開啟');
  const body = await frame.locator('body').innerText();
  expect(body).not.toContain('A'.repeat(43));
  const dom = await frame.locator('#root').evaluate((el) => el.innerHTML);
  expect(dom.includes('A'.repeat(43))).toBe(false);
  expect(dom).not.toContain('#handoff=');
  expect(
    await page.evaluate(() => {
      const f = (
        window as unknown as { fixture: { calls: string[]; opens: string[] } }
      ).fixture;
      return { calls: f.calls, opens: f.opens.length };
    }),
  ).toEqual({
    calls: ['get_cart', 'update_cart', 'get_cart', 'create_handoff'],
    opens: 1,
  });
  const overflow = await frame
    .locator('body')
    .evaluate((el) => el.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await frame.getByRole('button', { name: '重新載入', exact: true }).focus();
  await expect(
    frame.getByRole('button', { name: '重新載入', exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: info.outputPath('mcp-app-fixture.png'),
    fullPage: true,
  });
});
