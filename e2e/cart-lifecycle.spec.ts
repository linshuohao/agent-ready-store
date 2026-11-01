import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test.skip(
  process.env.CHECKOUT_INTEGRATION !== '1',
  'requires isolated lifecycle API/Web',
);
const root = '/api/v1/shopping';
const testCarts = new WeakMap<Page, Set<string>>();
async function post(page: Page, path: string, body: unknown) {
  const response = await page.request.post(root + path, {
    headers: { origin: new URL(process.env.WEB_BASE_URL!).origin },
    data: body,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data;
}
async function setup(page: Page, items = [{ productId: 'P001', quantity: 1 }]) {
  const initializationId = randomUUID();
  let cart: any;
  for (const item of items)
    cart = await post(page, '/carts/add', {
      initializationId,
      operationRequestId: randomUUID(),
      ...item,
    });
  testCarts.get(page)!.add(cart.cartId);
  await page.goto(`/cart/${cart.cartId}`);
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue(
    String(items[0].quantity),
  );
  return cart;
}
const select = (page: Page, id = 'P001') =>
  page.getByLabel(`選取 ${id}`, { exact: true });
const quantity = (page: Page, id = 'P001') =>
  page.getByLabel(`數量 ${id}`, { exact: true });
const create = (page: Page) =>
  page.getByRole('button', { name: '去結算', exact: true });
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((r) => {
    release = r;
  });
  return { promise, release };
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  testCarts.set(page, new Set());
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (e) => messages.push(e.message));
});
test.afterEach(async ({ page }) => {
  const current = await page
    .evaluate(() => localStorage.getItem('store.currentCartId'))
    .catch(() => null);
  if (current) testCarts.get(page)!.add(current);
  for (const cartId of testCarts.get(page) ?? []) {
    const response = await page.request.get(root + `/carts/${cartId}/orders`);
    const body = await response.json();
    for (const order of body.data?.items ?? [])
      if (order.status === 'CHECKOUT' && order.effectiveStatus === 'CHECKOUT')
        await post(page, `/orders/${order.orderId}/cancel`, {});
  }
  expect(errors.get(page)).toEqual([]);
});

test('explicit purchase quantity survives failed blur save and unrelated external add @ci', async ({
  page,
}) => {
  const cart = await setup(page, [{ productId: 'P001', quantity: 5 }]);
  await select(page).check();
  await quantity(page).fill('2');
  await page.route('**/carts/*/operations', (route) =>
    route.fulfill({
      status: 409,
      json: { ok: false, error: { code: 'CART_VERSION_CONFLICT' } },
    }),
  );
  await quantity(page).press('Tab');
  await expect(
    page.getByRole('alert').filter({ hasText: '購物車已更新' }),
  ).toBeVisible();
  await post(page, '/carts/add', {
    cartId: cart.cartId,
    operationRequestId: randomUUID(),
    productId: 'P003',
    quantity: 1,
  });
  await create(page).click();
  await expect(page).toHaveURL(/\/orders\//);
  const result = await (
    await page.request.get(root + `/carts/${cart.cartId}/orders`)
  ).json();
  expect(result.data.items[0].summary.items).toMatchObject([
    { productId: 'P001', quantity: 2 },
  ]);
  expect(result.data.items[0].summary.items).toHaveLength(1);
});

test('first add lost response reload is readonly and query discovers original cart @ci', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/shopping/carts/add', async (route) => {
    calls++;
    await route.fetch();
    await route.abort('failed');
  });
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '查詢結果', exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: '查詢結果', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車', exact: true }).click();
  await expect(quantity(page)).toHaveValue('1');
  expect(calls).toBe(1);
});

test('two tabs share a first-add identity and commit both independent additions to one cart @ci', async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  await Promise.all([
    page.goto('/products/P001'),
    second.goto('/products/P003'),
  ]);
  const barrier = gate();
  const inputs: any[] = [];
  await context.route('**/shopping/carts/add', async (route) => {
    inputs.push(route.request().postDataJSON());
    await barrier.promise;
    await route.continue();
  });
  await Promise.all([
    page.getByRole('button', { name: '加入購物車', exact: true }).click(),
    second.getByRole('button', { name: '加入購物車', exact: true }).click(),
  ]);
  await expect.poll(() => inputs.length).toBe(2);
  expect(inputs[0].initializationId).toBe(inputs[1].initializationId);
  expect(inputs[0].operationRequestId).not.toBe(inputs[1].operationRequestId);
  barrier.release();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('store.currentCartId')),
    )
    .not.toBeNull();
  await expect
    .poll(async () => {
      const id = await page.evaluate(() =>
        localStorage.getItem('store.currentCartId'),
      );
      const result = await (
        await page.request.get(root + `/carts/${id}`)
      ).json();
      return result.data.items.length;
    })
    .toBe(2);
  await second.close();
});

test('A submitted then B selected clears only A, while a new B draft survives @ci', async ({
  page,
}) => {
  await setup(page, [
    { productId: 'P001', quantity: 1 },
    { productId: 'P003', quantity: 1 },
  ]);
  const barrier = gate();
  let sent = false;
  await page.route('**/shopping/carts/*/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    sent = true;
    await barrier.promise;
    await route.fulfill({ response });
  });
  await select(page).check();
  await create(page).click();
  await expect.poll(() => sent).toBe(true);
  await select(page, 'P003').check();
  await quantity(page, 'P003').fill('3');
  barrier.release();
  await expect(page.getByRole('link', { name: '查看新訂單' })).toBeVisible();
  await expect(select(page, 'P003')).toBeChecked();
  await expect(quantity(page, 'P003')).toHaveValue('3');
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).not.toContainText('P001 本次購買量');
});

test('A canceled and reselected at the same quantity survives its old order success @ci', async ({
  page,
}) => {
  await setup(page);
  const barrier = gate();
  let sent = false;
  await page.route('**/shopping/carts/*/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    sent = true;
    await barrier.promise;
    await route.fulfill({ response });
  });
  await select(page).check();
  await create(page).click();
  await expect.poll(() => sent).toBe(true);
  await select(page).uncheck();
  await select(page).check();
  barrier.release();
  await expect(page.getByRole('link', { name: '查看新訂單' })).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('P001 本次購買量 1');
});

test('local remove cancels selection even on failure and re-add never selects it @ci', async ({
  page,
}) => {
  const cart = await setup(page);
  await select(page).check();
  await page.route('**/shopping/carts/*/operations', (route) =>
    route.abort('failed'),
  );
  await page.getByRole('button', { name: '移除 P001', exact: true }).click();
  await expect(select(page)).not.toBeChecked();
  await post(page, '/carts/add', {
    cartId: cart.cartId,
    operationRequestId: randomUUID(),
    productId: 'P001',
    quantity: 1,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(quantity(page)).toHaveValue('2');
  await expect(select(page)).not.toBeChecked();
});

test('external removal preserves the independent purchase list and can still buy its explicit quantity', async ({
  page,
}) => {
  const cart = await setup(page);
  await select(page).check();
  await post(page, `/carts/${cart.cartId}/operations`, {
    operationRequestId: randomUUID(),
    expectedCartVersion: cart.cartVersion,
    operation: { type: 'remove_item', productId: 'P001' },
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(quantity(page)).toHaveCount(0);
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('目前不在購物車');
  await create(page).click();
  await expect(page).toHaveURL(/\/orders\//);
});

test('unknown order query performs no new order write and keeps an unrelated invalid draft', async ({
  page,
}) => {
  await setup(page, [
    { productId: 'P001', quantity: 1 },
    { productId: 'P003', quantity: 1 },
  ]);
  let writes = 0;
  await page.route('**/shopping/carts/*/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    writes++;
    await route.fetch();
    await route.abort('failed');
  });
  await select(page).check();
  await create(page).click();
  await expect(
    page.getByRole('button', { name: '查詢結果', exact: true }),
  ).toBeVisible();
  await quantity(page, 'P003').fill('0');
  await page.getByRole('button', { name: '查詢結果', exact: true }).click();
  await expect(page.getByRole('link', { name: '查看新訂單' })).toBeVisible();
  await expect(quantity(page, 'P003')).toHaveValue('0');
  expect(writes).toBe(1);
});

test('not_found only queries; explicit continue preserves original frozen order payload', async ({
  page,
}) => {
  await setup(page);
  let original: any;
  let calls = 0;
  await page.route('**/shopping/carts/*/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    calls++;
    if (calls === 1) {
      original = route.request().postDataJSON();
      await route.abort('failed');
    } else {
      expect(route.request().postDataJSON()).toEqual(original);
      await route.continue();
    }
  });
  await select(page).check();
  await create(page).click();
  await page.getByRole('button', { name: '查詢結果', exact: true }).click();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: '繼續原購買', exact: true }).click();
  await expect(page.getByRole('link', { name: '查看新訂單' })).toBeVisible();
  expect(calls).toBe(2);
});

test('draft keeps its original base version after a newer snapshot and restore synchronizes purchase quantity @ci', async ({
  page,
}) => {
  const cart = await setup(page);
  await select(page).check();
  await quantity(page).fill('2');
  await post(page, '/carts/add', {
    cartId: cart.cartId,
    operationRequestId: randomUUID(),
    productId: 'P003',
    quantity: 1,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(quantity(page, 'P003')).toHaveValue('1');
  let sent: any;
  page.on('request', (request) => {
    if (request.url().endsWith('/operations')) sent = request.postDataJSON();
  });
  await quantity(page).press('Tab');
  await expect.poll(() => sent?.expectedCartVersion).toBe(cart.cartVersion);
  await expect(
    page.getByRole('alert').filter({ hasText: '購物車已更新' }),
  ).toBeVisible();
  await page.getByLabel('數量 P001', { exact: true }).press('Escape');
  await expect(quantity(page)).toHaveValue('1');
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('P001 本次購買量 1');
});

test('unknown success query consumes original selection only and an independent new purchase remains possible @ci', async ({
  page,
}) => {
  await setup(page, [
    { productId: 'P001', quantity: 1 },
    { productId: 'P003', quantity: 1 },
  ]);
  await page.route('**/shopping/carts/*/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fetch();
    await route.abort('failed');
  });
  await select(page).check();
  await create(page).click();
  await expect(
    page.getByRole('button', { name: '另建新的待支付訂單' }),
  ).toBeEnabled();
  await select(page, 'P003').check();
  await page.getByRole('button', { name: '查詢結果', exact: true }).click();
  await expect(page.getByRole('link', { name: '查看新訂單' })).toBeVisible();
  await expect(select(page)).not.toBeChecked();
  await expect(select(page, 'P003')).toBeChecked();
});

test('same purchase list rejects a late older quote after a newer query @ci', async ({
  page,
}) => {
  const cart = await setup(page);
  const barrier = gate();
  let calls = 0;
  await page.route('**/shopping/carts/*/quote', async (route) => {
    calls++;
    const response = await route.fetch();
    if (calls === 1) {
      const body = await response.json();
      body.data.total = '999999.00';
      await barrier.promise;
      await route.fulfill({ json: body });
    } else await route.fulfill({ response });
  });
  await select(page).check();
  await expect.poll(() => calls).toBe(1);
  await post(page, '/carts/add', {
    cartId: cart.cartId,
    operationRequestId: randomUUID(),
    productId: 'P003',
    quantity: 1,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => calls).toBe(2);
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('優惠');
  barrier.release();
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).not.toContainText('999,999');
});

test('completed purchase clears only its old draft so a later same SKU add uses saved quantity @ci', async ({
  page,
}) => {
  const cart = await setup(page, [
    { productId: 'P001', quantity: 2 },
    { productId: 'P003', quantity: 1 },
  ]);
  await select(page).check();
  await quantity(page).fill('5');
  const barrier = gate();
  let submitted = false;
  await page.route('**/shopping/carts/*/operations', (route) =>
    route.fulfill({
      status: 409,
      json: { ok: false, error: { code: 'CART_VERSION_CONFLICT' } },
    }),
  );
  await page.route('**/shopping/carts/*/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    submitted = true;
    await barrier.promise;
    await route.fulfill({ response });
  });
  await create(page).click();
  await expect.poll(() => submitted).toBe(true);
  await select(page, 'P003').check();
  await expect(select(page, 'P003')).toBeChecked();
  barrier.release();
  await expect(page.getByRole('link', { name: '查看新訂單' })).toBeVisible();
  await post(page, '/carts/add', {
    cartId: cart.cartId,
    operationRequestId: randomUUID(),
    productId: 'P001',
    quantity: 1,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(quantity(page)).toHaveValue('1');
  await select(page).check();
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('P001 本次購買量 1');
});

test('quote failures and unknown results leave loading and can be retried without old errors replacing success @ci', async ({
  page,
}) => {
  await setup(page);
  let calls = 0;
  await page.route('**/shopping/carts/*/quote', async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({
        status: 409,
        json: { ok: false, error: { code: 'CART_ITEMS_INVALID' } },
      });
    else if (calls === 2) await route.abort('failed');
    else await route.continue();
  });
  await select(page).check();
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('商品或數量目前無法購買');
  await page.getByRole('button', { name: '重新查詢預估' }).click();
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('預估結果暫未確認');
  await page.getByRole('button', { name: '重新查詢預估' }).click();
  await expect(page.locator('.cart-totals')).toBeVisible();
  await quantity(page).fill('0');
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }),
  ).toContainText('有效正整數');
  await expect(create(page)).toBeDisabled();
});
