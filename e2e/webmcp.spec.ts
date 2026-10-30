import { test, expect } from '@playwright/test';
import { randomUUID, randomBytes } from 'node:crypto';

// Registration double for protocol/coordination tests only; real Host is verified separately.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: (tool: any, options: any) => {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener('abort', () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name);
          });
        },
      },
    });
    (window as any).s5Tools = tools;
  });
});
const call = (page: any, name: string, args: unknown = {}) =>
  page.evaluate(
    async ({ name, args }: any) => {
      const tool = (window as any).s5Tools.get(name);
      if (!tool) throw new Error('Missing tool ' + name);
      return tool.execute(args);
    },
    { name, args },
  );
test('registered tool upgrades a Human cart and blocks unsaved draft overwrite', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await expect(page.getByRole('link', { name: '前往購物車' })).toBeVisible();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(
    page.getByRole('heading', { name: '購物車', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).s5Tools.has('update_cart')))
    .toBe(true);
  const original = await call(page, 'get_cart');
  expect(original.cart.origin).toBe('HUMAN');
  const args = {
    expectedCartVersion: original.cart.cartVersion,
    items: original.cart.items.map((x: any) => ({
      productId: x.productId,
      quantity: x.quantity,
    })),
  };
  const upgraded = await call(page, 'update_cart', args);
  expect(upgraded.cart.origin).toBe('AGENT');
  await expect(page.getByText('AI 優惠', { exact: true })).toBeVisible();
  const input = page.getByRole('spinbutton').first();
  await input.fill('2');
  const blocked = await call(page, 'update_cart', {
    ...args,
    expectedCartVersion: upgraded.cart.cartVersion,
  });
  expect(blocked.error.code).toBe('UNSAVED_DRAFT');
  await expect(input).toHaveValue('2');
  const toolNames = await page.evaluate(() => [
    ...(window as any).s5Tools.keys(),
  ]);
  expect(toolNames).not.toContain('submit_order');
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await page.getByRole('link', { name: '前往結帳', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => [...(window as any).s5Tools.keys()]))
    .toEqual(['get_cart']);
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('AI 優惠', { exact: true })).toBeVisible();
});
test('tool creates an Agent cart, reads product and comments, and search navigates without stale tools', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await expect
    .poll(() => page.evaluate(() => (window as any).s5Tools.has('add_to_cart')))
    .toBe(true);
  const detail = await call(page, 'get_product');
  expect(detail.ok).toBe(true);
  const reviews = await call(page, 'list_product_reviews', {
    offset: 0,
    limit: 2,
  });
  expect(reviews.ok).toBe(true);
  const added = await call(page, 'add_to_cart', { productId: 'P001' });
  expect(added.cart.origin).toBe('AGENT');
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).s5Tools.has('search_products')),
    )
    .toBe(true);
  const search = await call(page, 'search_products', { q: '耳機' });
  expect(search.ok).toBe(true);
  await expect(page).toHaveURL(/q=/);
  await expect(page.locator('button[data-product-id="P001"]')).toHaveCount(1);
  await expect(page.locator('button[data-product-id="P001"]')).toBeVisible();
  expect(
    await page.evaluate(() => [...(window as any).s5Tools.keys()]),
  ).not.toContain('get_product');
});

test('a newer Human save turns an unknown conversion into conflict and releases the write lock', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).s5Tools.has('update_cart')))
    .toBe(true);
  const original = await call(page, 'get_cart');
  const items = original.cart.items.map((x: any) => ({
    productId: x.productId,
    quantity: x.quantity,
  }));
  await page.route('**/api/v1/webmcp/carts/*/items', async (route) => {
    // The pending tool request never commits; another writer advances the same cart.
    const response = await page.request.put(
      `/api/v1/carts/${original.cart.cartId}/items`,
      {
        headers: { Origin: 'http://localhost:3000' },
        data: { expectedCartVersion: 1, items },
      },
    );
    expect(response.ok()).toBe(true);
    await route.abort();
  });
  const conflict = await call(page, 'update_cart', {
    expectedCartVersion: 1,
    items,
  });
  expect(conflict.kind).toBe('conflict');
  expect(conflict.cart).toMatchObject({ origin: 'HUMAN', cartVersion: 2 });
  await expect(
    page.getByRole('button', { name: '以目前草稿儲存', exact: true }),
  ).toBeEnabled();
  await page.unroute('**/api/v1/webmcp/carts/*/items');
  const upgraded = await call(page, 'update_cart', {
    expectedCartVersion: 2,
    items,
  });
  expect(upgraded).toMatchObject({
    kind: 'success',
    cart: { origin: 'AGENT', cartVersion: 3 },
  });
});

test('unconfirmed creation retries the original intent once and survives service response loss', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await expect
    .poll(() => page.evaluate(() => (window as any).s5Tools.has('add_to_cart')))
    .toBe(true);
  let original: any;
  await page.route('**/api/v1/webmcp/carts', async (route) => {
    const response = await route.fetch();
    original = (await response.json()).data;
    await route.abort();
  });
  expect((await call(page, 'add_to_cart', { productId: 'P001' })).kind).toBe(
    'unknown',
  );
  expect(
    (await call(page, 'add_to_cart', { productId: 'P003' })).error.code,
  ).toBe('CART_BUSY');
  await page.unroute('**/api/v1/webmcp/carts');
  const recovered = await call(page, 'retry_cart_operation');
  expect(recovered).toMatchObject({
    kind: 'success',
    cart: { cartId: original.cartId, origin: 'AGENT', cartVersion: 1 },
  });
});

test('unsupported browser keeps ordinary Web shopping available', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, 'modelContext', {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto('/products/P001');
  await expect(
    page.getByText('此瀏覽器無法使用 WebMCP 工具，可繼續使用一般購物操作。'),
  ).toBeVisible();
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await expect(page.getByRole('link', { name: '前往購物車' })).toBeVisible();
});

test('pending A recovery cannot update B or replace B page content', async ({
  page,
}) => {
  const response = await page.request.post('/api/v1/carts', {
    headers: { Origin: 'http://localhost:3000' },
    data: {
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [{ productId: 'P003', quantity: 1 }],
    },
  });
  const b = (await response.json()).data;
  await page.goto(`/cart/${b.cartId}`);
  await expect(page.getByLabel('數量 P003', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'AGENT / STORE', exact: true }).click();
  await page
    .getByRole('link', { name: '查看 Aero 無線藍牙耳機，P001', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Aero 無線藍牙耳機',
      exact: true,
    }),
  ).toBeVisible();
  // A failed read allows the existing explicit restart UI; B itself remains valid.
  await page.route(
    `**/api/v1/carts/${b.cartId}`,
    (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'FORBIDDEN', retryable: false },
          requestId: 'test',
        }),
      }),
    { times: 1 },
  );
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('button', { name: '重新發起購物', exact: true }).click();
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).s5Tools.has('update_cart')))
    .toBe(true);
  const a = await call(page, 'get_cart');
  await page.route('**/api/v1/webmcp/carts/*/items', (route) => route.abort());
  expect(
    (
      await call(page, 'update_cart', {
        expectedCartVersion: 1,
        items: [{ productId: 'P001', quantity: 2 }],
      })
    ).kind,
  ).toBe('unknown');
  await page.unroute('**/api/v1/webmcp/carts/*/items');
  // Browser history returns to B within the same document/provider lifetime.
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page.getByLabel('數量 P003', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).s5Tools.has('retry_cart_operation')),
    )
    .toBe(true);
  const result = await call(page, 'retry_cart_operation');
  expect(result).toMatchObject({
    kind: 'failure',
    error: { code: 'STALE_CONTEXT' },
  });
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveCount(0);
  const saved = await page.request.get(`/api/v1/carts/${a.cart.cartId}`);
  expect((await saved.json()).data).toMatchObject({
    cartVersion: 1,
    origin: 'HUMAN',
  });
});

test('a tool conflict retains the tool intent as draft alongside the latest saved quantities', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).s5Tools.has('update_cart')))
    .toBe(true);
  const a = await call(page, 'get_cart');
  await page.request.put(`/api/v1/carts/${a.cart.cartId}/items`, {
    headers: { Origin: 'http://localhost:3000' },
    data: {
      expectedCartVersion: 1,
      items: [{ productId: 'P001', quantity: 3 }],
    },
  });
  expect(
    (
      await call(page, 'update_cart', {
        expectedCartVersion: 1,
        items: [{ productId: 'P001', quantity: 2 }],
      })
    ).kind,
  ).toBe('conflict');
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('2');
  await expect(page.getByText('P001：3 件', { exact: true })).toBeVisible();
});

test('Human retry preserves the pending tool draft after another writer advances the cart', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).s5Tools.has('update_cart')))
    .toBe(true);
  const a = await call(page, 'get_cart');
  await page.route('**/api/v1/webmcp/carts/*/items', (route) => route.abort());
  expect(
    (
      await call(page, 'update_cart', {
        expectedCartVersion: 1,
        items: [{ productId: 'P001', quantity: 2 }],
      })
    ).kind,
  ).toBe('unknown');
  await page.unroute('**/api/v1/webmcp/carts/*/items');
  await page.request.put(`/api/v1/carts/${a.cart.cartId}/items`, {
    headers: { Origin: 'http://localhost:3000' },
    data: {
      expectedCartVersion: 1,
      items: [{ productId: 'P001', quantity: 3 }],
    },
  });
  await page.getByRole('button', { name: '重試原保存', exact: true }).click();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('2');
  await expect(page.getByText('P001：3 件', { exact: true })).toBeVisible();
});
