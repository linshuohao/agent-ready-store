import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test.skip(
  process.env.CHECKOUT_INTEGRATION !== '1',
  'requires isolated store_test API3003 and Next3004',
);
const root = '/api/v1/shopping';
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
async function setup(page: Page, items = [{ productId: 'P001', quantity: 1 }]) {
  const cart = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: items,
  });
  await page.goto(`/cart/${cart.cartId}`);
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('1');
  return cart;
}
test('defaults to no selection, protects drafts on focus, saves quantities and creates one pending order from full rows', async ({
  page,
}) => {
  const cart = await setup(page, [
    { productId: 'P001', quantity: 1 },
    { productId: 'P003', quantity: 1 },
  ]);
  const create = page.getByRole('button', {
    name: '建立待支付訂單',
    exact: true,
  });
  await expect(page.getByLabel('選取 P001', { exact: true })).not.toBeChecked();
  await expect(create).toBeDisabled();
  await page.getByLabel('全選商品').check();
  await expect(create).toBeEnabled();
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await expect(create).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('2');
  await expect(
    page.getByRole('button', { name: '重新載入購物車（放棄未儲存修改）' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '重新載入購物車（放棄未儲存修改）' })
    .click();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('1');
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await page.getByRole('button', { name: '儲存 P001 數量' }).click();
  await expect(page.getByLabel('選取 P001', { exact: true })).not.toBeChecked();
  await page.getByLabel('選取 P001', { exact: true }).check();
  await expect(
    page.getByRole('complementary', { name: '所選商品預估' }).getByText(/2 件/),
  ).toBeVisible();
  await create.click();
  await expect(page).toHaveURL(/\/orders\//);
  await page.getByRole('link', { name: '繼續購物', exact: true }).click();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('選取 P003', { exact: true })).not.toBeChecked();
  const orders = await (
    await page.request.get(root + `/carts/${cart.cartId}/orders`)
  ).json();
  expect(orders.data.items).toHaveLength(1);
  expect(orders.data.items[0]).toMatchObject({
    status: 'CHECKOUT',
    summary: { items: [{ productId: 'P001', quantity: 2 }] },
  });
  await page.goto(`/orders?cartId=${cart.cartId}`);
  await expect(
    page.getByRole('region', { name: '所有訂單' }).getByRole('link'),
  ).toHaveCount(1);
});
test('initialization lost response survives reload and double clicks cannot create a replacement cart', async ({
  page,
}) => {
  let original: any;
  let calls = 0;
  await page.route('**/api/v1/shopping/carts', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    calls++;
    const body = route.request().postDataJSON();
    if (!original) {
      original = body;
      await route.fetch();
      await route.abort('failed');
    } else {
      expect(body).toEqual(original);
      await route.continue();
    }
  });
  await page.goto('/products/P001');
  await page
    .getByRole('button', { name: '加入購物車', exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole('button', { name: '重試原購物車請求' }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '重試原購物車請求' }).click();
  await expect(
    page.getByRole('link', { name: '前往購物車', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '前往購物車', exact: true }).click();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('1');
  expect(calls).toBe(2);
});
test('unknown add operation recovers its original key after reload and same SKU re-add stays unselected', async ({
  page,
}) => {
  const cart = await setup(page);
  await page.getByLabel('選取 P001', { exact: true }).check();
  await page
    .getByRole('button', { name: '建立待支付訂單', exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\//);
  await page.getByRole('link', { name: '繼續購物', exact: true }).click();
  await expect(
    page.getByText('購物車目前沒有商品', { exact: true }),
  ).toBeVisible();
  let original: any;
  await page.route('**/api/v1/shopping/carts/*/operations', async (route) => {
    const body = route.request().postDataJSON();
    if (!original) {
      original = body;
      await route.fetch();
      await route.abort('failed');
    } else {
      expect(body).toEqual(original);
      await route.continue();
    }
  });
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '重試原購物車請求' }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '重試原購物車請求' }).click();
  await page.goto(`/cart/${cart.cartId}`);
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('選取 P001', { exact: true })).not.toBeChecked();
});
test('foreground refresh installs new rows without selecting them and an old response cannot roll back a saved version', async ({
  page,
}) => {
  const cart = await setup(page);
  await page.getByLabel('選取 P001', { exact: true }).check();
  await post(page, `/carts/${cart.cartId}/operations`, {
    operationRequestId: randomUUID(),
    expectedCartVersion: cart.cartVersion,
    operation: { type: 'add_item', productId: 'P003', quantity: 1 },
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('選取 P003', { exact: true })).not.toBeChecked();
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  let held = false;
  await page.route(`**/api/v1/shopping/carts/${cart.cartId}`, async (route) => {
    const response = await route.fetch();
    if (!held) {
      held = true;
      await gate;
    }
    await route.fulfill({ response });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => held).toBe(true);
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await page.getByRole('button', { name: '儲存 P001 數量' }).click();
  await expect(
    page.getByRole('button', { name: '儲存 P001 數量' }),
  ).toBeDisabled();
  await expect
    .poll(async () => {
      const result = await (
        await page.request.get(root + `/carts/${cart.cartId}`)
      ).json();
      return result.data.items.find((i: any) => i.productId === 'P001')
        .quantity;
    })
    .toBe(2);
  release();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('2');
});
test('an empty cart still lists paid orders and opening a different cart cannot overwrite the current pointer', async ({
  page,
}) => {
  const first = await setup(page);
  const created = await post(page, `/carts/${first.cartId}/orders`, {
    requestId: randomUUID(),
    expectedCartVersion: first.cartVersion,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  });
  await post(page, `/orders/${created.order.orderId}/pay`, {});
  await page.goto(`/orders?cartId=${first.cartId}`);
  await expect(
    page
      .getByRole('region', { name: '所有訂單' })
      .getByRole('link', { name: new RegExp(created.order.orderId) }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: '所有訂單' }).getByText(/已支付/),
  ).toBeVisible();
  const second = await post(page, '/carts', {
    requestId: randomUUID(),
    initialItems: [{ productId: 'P001', quantity: 1 }],
  });
  await page.goto(`/cart/${second.cartId}`);
  await expect(
    page.getByText('這不是目前購物車，未更換購物上下文。', { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(first.cartId);
});
test('recovering an unknown creation records the original order without discarding a later quantity draft', async ({
  page,
}) => {
  await setup(page, [
    { productId: 'P001', quantity: 1 },
    { productId: 'P003', quantity: 1 },
  ]);
  let lost = false;
  await page.route('**/api/v1/shopping/carts/*/orders', async (route) => {
    if (route.request().method() !== 'POST' || lost) return route.continue();
    lost = true;
    await route.fetch();
    await route.abort('failed');
  });
  await page.getByLabel('選取 P001', { exact: true }).check();
  await page
    .getByRole('button', { name: '建立待支付訂單', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '恢復原建立訂單請求' }),
  ).toBeVisible();
  await page.getByLabel('數量 P003', { exact: true }).fill('0');
  await page.getByRole('button', { name: '恢復原建立訂單請求' }).click();
  await expect(page.getByRole('link', { name: '查看新訂單' })).toBeVisible();
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('0');
  await expect(
    page.getByRole('button', { name: '重新載入購物車（放棄未儲存修改）' }),
  ).toBeVisible();
});
test('blur saves one changed row and a create version conflict offers explicit reload', async ({
  page,
}) => {
  const cart = await setup(page);
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await page.getByRole('heading', { name: '商品明細', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '儲存 P001 數量' }),
  ).toBeDisabled();
  await expect
    .poll(async () => {
      const data = await (
        await page.request.get(root + `/carts/${cart.cartId}`)
      ).json();
      return data.data.items[0].quantity;
    })
    .toBe(2);
  await page.getByLabel('選取 P001', { exact: true }).check();
  await post(page, `/carts/${cart.cartId}/operations`, {
    operationRequestId: randomUUID(),
    expectedCartVersion: 2,
    operation: { type: 'add_item', productId: 'P003', quantity: 1 },
  });
  await page
    .getByRole('button', { name: '建立待支付訂單', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '重新載入購物車（放棄未儲存修改）' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '重新載入購物車（放棄未儲存修改）' })
    .click();
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('選取 P001', { exact: true })).not.toBeChecked();
});
test('returning during a write performs deferred calibration after it finishes', async ({
  page,
}) => {
  const cart = await setup(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  let committed = false;
  await page.route('**/api/v1/shopping/carts/*/operations', async (route) => {
    const response = await route.fetch();
    committed = true;
    await gate;
    await route.fulfill({ response });
  });
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await page.getByLabel('數量 P001', { exact: true }).press('Enter');
  await expect.poll(() => committed).toBe(true);
  await post(page, `/carts/${cart.cartId}/operations`, {
    operationRequestId: randomUUID(),
    expectedCartVersion: 2,
    operation: { type: 'add_item', productId: 'P003', quantity: 1 },
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  release();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
});
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});
test('a same SKU removed and re-added externally is not selected when intermediate snapshots were unseen', async ({
  page,
}) => {
  const cart = await setup(page);
  await page.getByLabel('選取 P001', { exact: true }).check();
  const created = await post(page, `/carts/${cart.cartId}/orders`, {
    requestId: randomUUID(),
    expectedCartVersion: 1,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  });
  await post(page, `/carts/${cart.cartId}/operations`, {
    operationRequestId: randomUUID(),
    expectedCartVersion: created.cart.cartVersion,
    operation: { type: 'add_item', productId: 'P001', quantity: 1 },
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('選取 P001', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('1');
});
