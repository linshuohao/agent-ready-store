import { test, expect } from '@playwright/test';

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
const call = async (page: any, name: string, args: unknown = {}) => {
  await expect
    .poll(() =>
      page.evaluate((name: string) => (window as any).s5Tools.has(name), name),
    )
    .toBe(true);
  return page.evaluate(
    async ({ name, args }: any) => {
      const tool = (window as any).s5Tools.get(name);
      if (!tool) throw new Error('Missing tool ' + name);
      return tool.execute(args);
    },
    { name, args },
  );
};
test('future tool version returns server conflict and offers a fresh reload', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(page.getByRole('spinbutton').first()).toBeVisible();
  const original = await call(page, 'get_cart');
  const result = await call(page, 'update_cart', {
    expectedCartVersion: original.cart.cartVersion + 1,
    operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
  });
  expect(result).toMatchObject({
    kind: 'failure',
    error: { code: 'CART_VERSION_CONFLICT' },
  });
  await expect(page.locator('#cart-error')).toContainText(
    '服務端的購物車已更新',
  );
  await page
    .getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    })
    .click();
  const input = page.getByRole('spinbutton').first();
  await expect(input).toHaveValue('1');
  await input.fill('2');
  await page.getByRole('spinbutton').first().press('Enter');
  await expect(
    page.getByText('已儲存，內容與報價已更新。', { exact: true }),
  ).toBeVisible();
  expect((await call(page, 'get_cart')).cart.origin).toBe('HUMAN');
});
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
    operation: { type: 'set_quantity', productId: 'P001', quantity: 1 },
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
  await page.getByRole('spinbutton').first().press('Enter');
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

test('unknown tool edit does not inspect or replay and Human reload gets server state', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(page.getByRole('spinbutton').first()).toBeVisible();
  const original = await call(page, 'get_cart');
  let writes = 0;
  await page.route('**/api/v1/webmcp/carts/*/operations', async (route) => {
    writes++;
    await route.fetch();
    await route.abort();
  });
  expect(
    (
      await call(page, 'update_cart', {
        expectedCartVersion: original.cart.cartVersion,
        operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
      })
    ).kind,
  ).toBe('unknown');
  await expect(page.locator('#cart-error')).toContainText('保存結果未確認');
  await expect(page.getByRole('spinbutton').first()).toBeDisabled();
  expect(
    await page.evaluate(() => [...(window as any).s5Tools.keys()]),
  ).not.toContain('retry_cart_operation');
  await page
    .getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    })
    .click();
  await expect(page.getByRole('spinbutton').first()).toHaveValue('2');
  await expect(page.getByText('AI 優惠', { exact: true })).toBeVisible();
  expect(writes).toBe(1);
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
  const recovered = await call(page, 'retry_cart_creation');
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

test('tool conflict requires reload and never presents a merged draft', async ({
  page,
}) => {
  await page.goto('/products/P001');
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(page.getByRole('spinbutton').first()).toBeVisible();
  const original = await call(page, 'get_cart');
  await page.request.put(`/api/v1/carts/${original.cart.cartId}/items`, {
    headers: { Origin: 'http://localhost:3000' },
    data: {
      expectedCartVersion: 1,
      items: [{ productId: 'P001', quantity: 3 }],
    },
  });
  expect(
    await call(page, 'update_cart', {
      expectedCartVersion: 1,
      operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
    }),
  ).toMatchObject({
    kind: 'failure',
    error: { code: 'CART_VERSION_CONFLICT' },
  });
  await expect(
    page.getByRole('heading', { name: '最新已儲存內容' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    })
    .click();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('3');
  expect((await call(page, 'get_cart')).cart.origin).toBe('HUMAN');
});
