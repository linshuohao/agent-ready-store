import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test.skip(
  process.env.CHECKOUT_INTEGRATION !== '1',
  'isolated lifecycle API3003/Web3004 required',
);
// Registration double verifies client coordination, not a real WebMCP Host acceptance.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: (tool: any, options: any) => {
          tools.set(tool.name, tool);
          options.signal.addEventListener('abort', () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name);
          });
        },
      },
    });
    (window as any).s5Tools = tools;
  });
});
async function call(page: Page, name: string, args: unknown = {}) {
  await expect
    .poll(() => page.evaluate((n) => (window as any).s5Tools.has(n), name))
    .toBe(true);
  return page.evaluate(
    ({ name, args }) => (window as any).s5Tools.get(name).execute(args),
    { name, args },
  );
}
async function initialize(page: Page, stayOnPage = true) {
  return call(page, 'get_or_create_cart', {
    requestId: randomUUID(),
    initialItems: [{ productId: 'P001', quantity: 1 }],
    stayOnPage,
  });
}
test('registration and queries do not write; explicit preparation creates an AI order and human UI pays that order', async ({
  page,
}) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/'))
      writes.push(r.url());
  });
  await page.goto('/products/P001');
  await call(page, 'get_product');
  expect(await call(page, 'get_cart')).toMatchObject({
    error: { code: 'NO_CURRENT_CART' },
  });
  expect(writes).toEqual([]);
  const created = await initialize(page);
  expect(created.kind).toBe('success');
  await expect(page).toHaveURL(/\/products\/P001$/);
  const result = await call(page, 'create_order', {
    cartId: created.data.cartId,
    requestId: randomUUID(),
    expectedCartVersion: created.data.cartVersion,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  });
  expect(result).toMatchObject({
    kind: 'success',
    data: {
      order: {
        createdByChannel: 'WEBMCP',
        aiEligible: true,
        status: 'CHECKOUT',
      },
    },
  });
  await expect(page).toHaveURL(
    new RegExp(`/orders/${result.data.order.orderId}$`),
  );
  const tools = await page.evaluate(() => [...(window as any).s5Tools.keys()]);
  expect(tools.some((n) => /pay|submit|prepare_checkout/.test(n))).toBe(false);
  await page.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  expect((await call(page, 'get_order')).data).toMatchObject({
    orderId: result.data.order.orderId,
    status: 'PAID',
  });
});
test('add intent displays cart, protects drafts and retains original operation keys after response loss', async ({
  page,
}) => {
  await page.goto('/products/P001');
  const init = await initialize(page, false);
  await expect(page).toHaveURL(new RegExp(`/cart/${init.data.cartId}$`));
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  const input = {
    cartId: init.data.cartId,
    operationRequestId: randomUUID(),
    expectedCartVersion: 1,
    productId: 'P001',
    quantity: 3,
  };
  expect(await call(page, 'update_cart_item', input)).toMatchObject({
    kind: 'failure',
    error: { code: 'UNSAVED_DRAFT' },
  });
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: '還原數量 P001' }).click();
  let lost = true;
  await page.route('**/shopping/carts/*/operations', async (route) => {
    if (lost) {
      lost = false;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  expect(await call(page, 'update_cart_item', input)).toMatchObject({
    kind: 'unknown',
  });
  await page.reload();
  expect(await call(page, 'update_cart_item', input)).toMatchObject({
    kind: 'success',
    data: { items: [{ quantity: 3 }] },
  });
});
test('a stale page handle cannot write and a late creation never pulls navigation back', async ({
  page,
}) => {
  await page.goto('/products/P001');
  const init = await initialize(page);
  await page.evaluate(() => {
    (window as any).oldTool = (window as any).s5Tools.get('create_order');
  });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let received!: () => void;
  const started = new Promise<void>((r) => (received = r));
  await page.route('**/shopping/webmcp/carts/*/orders', async (route) => {
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  const input = {
    cartId: init.data.cartId,
    requestId: randomUUID(),
    expectedCartVersion: 1,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  };
  const creating = call(page, 'create_order', input);
  await started;
  await page.getByRole('link', { name: 'AGENT / STORE', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  release();
  const result = await creating;
  expect(result.kind).toBe('success');
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate((args) => (window as any).oldTool.execute(args), input),
  ).toMatchObject({ error: { code: 'STALE_CONTEXT' } });
  await call(page, 'cancel_order', { orderId: result.data.order.orderId });
});
test('ordinary Web order on a WebMCP-created cart does not inherit AI eligibility', async ({
  page,
}) => {
  await page.goto('/products/P001');
  const init = await initialize(page, false);
  await page.getByLabel('選取 P001', { exact: true }).check();
  await page
    .getByRole('button', { name: '建立待支付訂單', exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(
    page.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  const result = await call(page, 'get_order');
  expect(result.data).toMatchObject({
    createdByChannel: 'WEB',
    aiEligible: false,
    cartId: init.data.cartId,
  });
  await page.getByRole('button', { name: '取消這筆訂單', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '訂單已取消', exact: true }),
  ).toBeVisible();
});

test('lost WebMCP creation resumes the original channel and request after reload', async ({
  page,
}) => {
  await page.goto('/products/P001');
  const init = await initialize(page, false);
  await expect(page).toHaveURL(new RegExp(`/cart/${init.data.cartId}$`));
  let originalOrderId = '';
  await page.route('**/shopping/webmcp/carts/*/orders', async (route) => {
    const response = await route.fetch();
    originalOrderId = (await response.json()).data.order.orderId;
    await route.abort('failed');
  });
  const input = {
    cartId: init.data.cartId,
    requestId: randomUUID(),
    expectedCartVersion: 1,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  };
  expect(await call(page, 'create_order', input)).toMatchObject({
    kind: 'unknown',
  });
  await page.unroute('**/shopping/webmcp/carts/*/orders');
  await page.reload();
  const recovered = await call(page, 'create_order', input);
  expect(recovered).toMatchObject({
    kind: 'success',
    data: { order: { orderId: originalOrderId, createdByChannel: 'WEBMCP' } },
  });
  await expect(page).toHaveURL(new RegExp(`/orders/${originalOrderId}$`));
  await page.getByRole('button', { name: '取消這筆訂單', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '訂單已取消', exact: true }),
  ).toBeVisible();
});

test('a late creation does not replace a newer catalog query on the same pathname', async ({
  page,
}) => {
  await page.goto('/');
  const init = await initialize(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let received!: () => void;
  const started = new Promise<void>((r) => (received = r));
  await page.route('**/shopping/webmcp/carts/*/orders', async (route) => {
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  const creating = call(page, 'create_order', {
    cartId: init.data.cartId,
    requestId: randomUUID(),
    expectedCartVersion: 1,
    selectedItems: [{ productId: 'P001', expectedQuantity: 1 }],
    constraints: { currency: 'TWD' },
  });
  await started;
  expect((await call(page, 'search_products', { q: 'Aero' })).ok).toBe(true);
  await expect(page).toHaveURL(/q=Aero/);
  release();
  const result = await creating;
  expect(result.kind).toBe('success');
  await expect(page).toHaveURL(/q=Aero/);
  await call(page, 'cancel_order', { orderId: result.data.order.orderId });
  await expect(page).toHaveURL(/q=Aero/);
});
