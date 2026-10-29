import { test, expect } from '@playwright/test';

test('explicit confirmation creates an immutable order and leaves the Cart read-only', async ({
  page,
}) => {
  await page.goto('/products/P003');
  await page
    .locator('button[data-add-cart][data-product-id="P003"]:enabled')
    .click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await page.getByRole('link', { name: '前往結帳', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '結帳', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  const id = page.url().split('/').pop()!;
  await expect(page.getByText('本次確認金額', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '確認購買', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
  const order = await page.getByTestId('order-id').textContent();
  await page.screenshot({
    path: test.info().outputPath('order.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByTestId('order-id')).toHaveText(order!);
  await page.goto(`/cart/${id}`);
  await expect(page.getByText('此購物車已完成購買。')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '儲存調整', exact: true }),
  ).toHaveCount(0);
});

async function prepared(page: import('@playwright/test').Page) {
  await page.goto('/products/P003');
  await page
    .locator('button[data-add-cart][data-product-id="P003"]:enabled')
    .click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await page.getByRole('link', { name: '前往結帳', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  return page.url().split('/').pop()!;
}
test('keeps a received success snapshot when later order reads are expired', async ({
  page,
}) => {
  await prepared(page);
  let reads = 0;
  await page.route('**/api/v1/carts/*/order', async (route) => {
    reads++;
    await route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'CREDENTIAL_EXPIRED',
          message: 'expired',
          retryable: false,
        },
        requestId: 'test',
      }),
    });
  });
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
  expect(reads).toBe(0);
  await page.reload();
  await expect(
    page.getByText('原存取權限已失效，無法再次讀取訂單；這不表示購買失敗。'),
  ).toBeVisible();
});
test('recovers a committed order after losing its response without automatically resubmitting', async ({
  page,
}) => {
  await prepared(page);
  let submits = 0;
  await page.route('**/api/v1/carts/*/orders', async (route) => {
    submits++;
    await route.fetch();
    await route.abort('failed');
  });
  await page.route('**/api/v1/carts/*/order', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'TEMPORARY_UNAVAILABLE',
          message: 'unavailable',
          retryable: true,
        },
        requestId: 'test',
      }),
    });
  });
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '確認原提交結果並重新審閱' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: '確認原提交結果並重新審閱' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '確認原提交結果並重新審閱' }).click();
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
  expect(submits).toBe(1);
});
test('requires a new explicit confirmation when another editor changes quantities', async ({
  page,
}) => {
  const id = await prepared(page),
    origin = new URL(page.url()).origin;
  const get = await page.request.get(`/api/v1/carts/${id}`);
  const cart = (await get.json()).data;
  const edit = await page.request.put(`/api/v1/carts/${id}/items`, {
    headers: { Origin: origin },
    data: {
      expectedCartVersion: cart.cartVersion,
      items: cart.items.map((i: { productId: string; quantity: number }) => ({
        productId: i.productId,
        quantity: i.quantity + 1,
      })),
    },
  });
  expect(edit.ok()).toBe(true);
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '重新審閱', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '重新審閱', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('region', { name: '購買內容變更' }),
  ).toBeVisible();
  await expect(page.getByText(/數量：1 → 2/)).toBeVisible();
  expect((await page.request.get(`/api/v1/carts/${id}/order`)).status()).toBe(
    404,
  );
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
});
