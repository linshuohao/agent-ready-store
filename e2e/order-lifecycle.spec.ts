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

test('opening own order without a pointer resumes the original cart; another cart requires explicit confirmation', async ({
  page,
}) => {
  const { order, cart } = await create(page);
  await page.evaluate(() => localStorage.removeItem('store.currentCartId'));
  await page.goto(`/orders/${order.orderId}`);
  await expect(
    page.getByRole('link', { name: '繼續購物', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(cart.cartId);
  const another = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: [],
  });
  await page.evaluate(
    (id) => localStorage.setItem('store.currentCartId', id),
    another.cartId,
  );
  await page.goto(`/orders/${order.orderId}`);
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(another.cartId);
  await page.getByRole('button', { name: '接續這次購物', exact: true }).click();
  await page
    .getByRole('button', { name: '保留目前購物車', exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(another.cartId);
  await page.getByRole('button', { name: '接續這次購物', exact: true }).click();
  await page
    .getByRole('button', { name: '確認接續原購物車', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/cart/${cart.cartId}$`));
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(cart.cartId);
  await post(page, `/orders/${order.orderId}/cancel`, {});
});
test('shared order allows payment but never exposes cart, sibling or cancel controls or changes current pointer', async ({
  page,
}) => {
  const { order } = await create(page);
  const another = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: [],
  });
  await page.evaluate(
    (id) => localStorage.setItem('store.currentCartId', id),
    another.cartId,
  );
  await page.goto(`/orders/${order.orderId}?view=share`);
  await expect(
    page.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /購物車|繼續購物|訂單 / }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /取消|接續/ })).toHaveCount(0);
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(another.cartId);
  await page.evaluate(() => localStorage.removeItem('store.currentCartId'));
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBeNull();
});
test('late payment for A survives navigation to B and an older query cannot replace committed payment', async ({
  page,
}) => {
  const { order, cart } = await create(page);
  const b = await post(page, `/carts/${cart.cartId}/orders`, {
    requestId: randomUUID(),
    expectedCartVersion: cart.cartVersion,
    selectedItems: [{ productId: 'P003', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let received!: () => void;
  const started = new Promise<void>((r) => (received = r));
  await page.route(`**/shopping/orders/${order.orderId}/pay`, async (route) => {
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  await page.goto(`/orders/${order.orderId}`);
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await started;
  await page
    .getByRole('link', { name: `訂單 ${b.order.orderId}`, exact: true })
    .click();
  await expect(page.getByTestId('order-id')).toHaveText(b.order.orderId);
  release();
  await page
    .getByRole('link', { name: `訂單 ${order.orderId}`, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await page.route(`**/shopping/orders/${order.orderId}`, (route) =>
    route.fulfill({ json: { ok: true, data: order } }),
  );
  await page.getByRole('button', { name: '重新查詢訂單', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await post(page, `/orders/${b.order.orderId}/cancel`, {});
});

test('late creation keeps its original order link without replacing a newly selected cart or navigating', async ({
  page,
}) => {
  const a = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: [{ productId: 'P001', quantity: 1 }],
  });
  const b = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: [],
  });
  await page.goto(`/cart/${a.cartId}`);
  await page.getByLabel('選取 P001', { exact: true }).check();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let result: any;
  let received!: () => void;
  const started = new Promise<void>((r) => (received = r));
  await page.route(`**/shopping/carts/${a.cartId}/orders`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    result = (await response.json()).data;
    received();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByRole('button', { name: '建立待支付訂單', exact: true })
    .click();
  await started;
  await page.getByRole('link', { name: 'AGENT / STORE', exact: true }).click();
  await page.evaluate(
    (id) => localStorage.setItem('store.currentCartId', id),
    b.cartId,
  );
  release();
  await expect
    .poll(() =>
      page.evaluate(
        (id) => localStorage.getItem(`store.order.created.${id}`),
        a.cartId,
      ),
    )
    .toBeTruthy();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(b.cartId);
  await page.goto(`/cart/${a.cartId}`);
  await expect(
    page.getByRole('link', { name: '查看新訂單', exact: true }),
  ).toHaveAttribute('href', `/orders/${result.order.orderId}`);
  await post(page, `/orders/${result.order.orderId}/cancel`, {});
});
test('deadline and a later pending read do not erase delayed successful payment', async ({
  page,
}) => {
  const { order } = await create(page);
  await page.clock.install({ time: new Date() });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let received!: () => void;
  const started = new Promise<void>((r) => (received = r));
  await page.route(`**/shopping/orders/${order.orderId}/pay`, async (route) => {
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  await page.goto(`/orders/${order.orderId}`);
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await started;
  await page.route(`**/shopping/orders/${order.orderId}`, (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: {
          ...order,
          effectiveStatus: 'EXPIRED',
          allowedActions: { canPay: false, canCancel: false },
        },
      },
    }),
  );
  await page.clock.setFixedTime(new Date(Date.now() + 16 * 60 * 1000));
  await page.clock.runFor(1000);
  await expect(
    page.getByRole('heading', { name: '支付期限已到', exact: true }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
});
test('contradictory terminal response preserves confirmed payment and rereads authority without looping', async ({
  page,
}) => {
  const { order } = await create(page);
  await page.goto(`/orders/${order.orderId}`);
  await page.getByRole('button', { name: '確認模擬支付', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  let reads = 0;
  await page.route(`**/shopping/orders/${order.orderId}`, (route) => {
    reads++;
    return route.fulfill({
      json: {
        ok: true,
        data: {
          ...order,
          effectiveStatus: 'CANCELLED',
          closedAt: new Date().toISOString(),
          closeReason: 'CANCELLED',
          allowedActions: { canPay: false, canCancel: false },
        },
      },
    });
  });
  await page.getByRole('button', { name: '重新查詢訂單', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    '不一致',
  );
  await expect.poll(() => reads).toBe(2);
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /確認模擬支付|取消這筆/ }),
  ).toHaveCount(0);
});

test('returning to cart before a delayed creation completes receives the original order link', async ({
  page,
}) => {
  const a = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: [{ productId: 'P001', quantity: 1 }],
  });
  await page.goto(`/cart/${a.cartId}`);
  await page.getByLabel('選取 P001', { exact: true }).check();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let received!: () => void;
  const started = new Promise<void>((r) => (received = r));
  let orderId = '';
  await page.route(`**/shopping/carts/${a.cartId}/orders`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    orderId = (await response.json()).data.order.orderId;
    received();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByRole('button', { name: '建立待支付訂單', exact: true })
    .click();
  await started;
  await page.getByRole('link', { name: 'AGENT / STORE', exact: true }).click();
  await page.getByRole('link', { name: '購物車', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '恢復原建立訂單請求', exact: true }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole('link', { name: '查看新訂單', exact: true }),
  ).toHaveAttribute('href', `/orders/${orderId}`);
  await expect(
    page.getByRole('button', { name: '恢復原建立訂單請求', exact: true }),
  ).toHaveCount(0);
  await post(page, `/orders/${orderId}/cancel`, {});
});
