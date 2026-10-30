import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test.skip(
  process.env.CHECKOUT_INTEGRATION !== '1',
  'isolated store_test API3003 / Next3004 required',
);
const root = '/api/v1/shopping';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
});
async function post(page: Page, path: string, body: unknown) {
  const response = await page.request.post(root + path, {
    headers: { origin: new URL(process.env.WEB_BASE_URL!).origin },
    data: body,
  });
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  expect(result.ok).toBe(true);
  return result.data;
}
async function create(page: Page) {
  const cart = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: [
      { productId: 'P001', quantity: 1 },
      { productId: 'P003', quantity: 1 },
    ],
  });
  const result = await post(page, `/carts/${cart.cartId}/orders`, {
    requestId: randomUUID(),
    expectedCartVersion: cart.cartVersion,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  });
  await page.goto('/');
  await page.evaluate(
    (id) => localStorage.setItem('store.currentCartId', id),
    cart.cartId,
  );
  return result;
}
test('fixed order summary pays the original order and continues shopping in the same cart', async ({
  page,
}, testInfo) => {
  const { order, cart } = await create(page);
  await page.goto(`/orders/${order.orderId}`);
  await expect(
    page.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  await expect(
    page.getByRole('region', { name: '訂單固定摘要' }),
  ).toContainText(order.summary.items[0].name);
  await page.screenshot({
    path: `/private/tmp/order-page-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  const paid = (
    await (await page.request.get(root + `/orders/${order.orderId}`)).json()
  ).data;
  expect(paid.status).toBe('PAID');
  expect(paid.summary).toEqual(order.summary);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '繼續購物', exact: true }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(cart.cartId);
});
test('cancellation closes only the chosen order and keeps sibling navigation', async ({
  page,
}) => {
  const { order, cart } = await create(page);
  const second = await post(page, `/carts/${cart.cartId}/orders`, {
    requestId: randomUUID(),
    expectedCartVersion: cart.cartVersion,
    selectedItems: [{ productId: 'P003', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  });
  await page.goto(`/orders/${order.orderId}`);
  await page.getByRole('button', { name: '取消這筆訂單', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '訂單已取消', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '確認模擬支付', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('link', { name: `訂單 ${second.order.orderId}`, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '取消這筆訂單', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '訂單已取消', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '繼續購物', exact: true }).click();
  await expect(
    page.getByText('購物車目前沒有商品', { exact: true }),
  ).toBeVisible();
});
test('legacy routes never resolve cart IDs into orders or use old write endpoints', async ({
  page,
}) => {
  const { order, cart } = await create(page);
  const writes: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname.startsWith('/api/'))
      writes.push(r.url());
  });
  for (const path of [
    `/checkout/${cart.cartId}?reviewId=old`,
    `/order-details/${order.orderId}#order-read=old`,
    `/orders/${cart.cartId}`,
  ]) {
    await page.goto(path);
    await expect(page.getByText(/請從購物車進入新的訂單流程/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: '確認模擬支付', exact: true }),
    ).toHaveCount(0);
  }
  expect(writes).toEqual([]);
  await post(page, `/orders/${order.orderId}/cancel`, {});
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('lost payment response is recovered by reading the same paid order after refresh', async ({
  page,
}) => {
  const { order } = await create(page);
  let payments = 0;
  await page.route(`**/shopping/orders/${order.orderId}/pay`, async (route) => {
    payments++;
    await route.fetch();
    await route.abort('failed');
  });
  await page.goto(`/orders/${order.orderId}`);
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  expect(payments).toBe(1);
});
test('unavailable reads remain retryable and storage failure prevents writes', async ({
  page,
}) => {
  const { order } = await create(page);
  await page.route(`**/shopping/orders/${order.orderId}`, (route) =>
    route.fulfill({
      status: 503,
      json: { ok: false, error: { code: 'TEMPORARY_UNAVAILABLE' } },
    }),
  );
  await page.goto(`/orders/${order.orderId}`);
  await expect(page.getByText(/暫時無法確認訂單結果/)).toBeVisible();
  await page.unroute(`**/shopping/orders/${order.orderId}`);
  await page.getByRole('button', { name: '重新查詢訂單', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('storage disabled');
    };
  });
  let payments = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/pay')) payments++;
  });
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    '本次未送出',
  );
  expect(payments).toBe(0);
  await post(page, `/orders/${order.orderId}/cancel`, {});
});
test('local deadline disables new payment without inventing committed closure', async ({
  page,
}) => {
  const { order } = await create(page);
  await page.clock.install({ time: new Date() });
  await page.goto(`/orders/${order.orderId}`);
  await expect(
    page.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(16 * 60 * 1000);
  await expect(
    page.getByRole('heading', { name: '支付期限已到', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '確認模擬支付', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/期限已到不代表關閉已提交/)).toBeVisible();
  await post(page, `/orders/${order.orderId}/cancel`, {});
  await page.getByRole('button', { name: '重新查詢訂單', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '訂單已取消', exact: true }),
  ).toBeVisible();
});

test('unknown cancellation survives reload and offers only the original action', async ({
  page,
}) => {
  const { order } = await create(page);
  await page.route(`**/shopping/orders/${order.orderId}/cancel`, (route) =>
    route.abort('failed'),
  );
  await page.goto(`/orders/${order.orderId}`);
  await page.getByRole('button', { name: '取消這筆訂單', exact: true }).click();
  await expect(page.getByText(/原操作結果待確認/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: '重試原單取消', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /模擬支付/ })).toHaveCount(0);
  await page.unroute(`**/shopping/orders/${order.orderId}/cancel`);
  await page.getByRole('button', { name: '重試原單取消', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '訂單已取消', exact: true }),
  ).toBeVisible();
});
test('a later not-found read cannot hide a confirmed paid snapshot', async ({
  page,
}) => {
  const { order } = await create(page);
  await page.goto(`/orders/${order.orderId}`);
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await page.route(`**/shopping/orders/${order.orderId}`, (route) =>
    route.fulfill({
      status: 404,
      json: { ok: false, error: { code: 'ORDER_NOT_FOUND' } },
    }),
  );
  await page.getByRole('button', { name: '重新查詢訂單', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('保留');
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  await page.unroute(`**/shopping/orders/${order.orderId}`);
  await page.getByRole('button', { name: '重新查詢訂單', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
});
