import { test, expect, type Page } from '@playwright/test';
import type { CartView } from '@store/contracts';
const id = '11111111-1111-4111-8111-111111111111';
const view = (quantity = 1, version = 1): CartView => ({
  cartId: id,
  cartVersion: version,
  origin: 'HUMAN',
  orderId: null,
  items: [
    {
      productId: 'P001',
      quantity,
      name: 'Earphones',
      unitPrice: '100.00',
      availability: { canPurchase: true, reasons: [], currentQuantity: 20 },
    },
  ],
  quote: null,
  quoteHash: null,
  issues: [],
  canCheckout: false,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
});
const success = (data: CartView) => ({
  ok: true,
  data,
  requestId: 'operations',
});
const failure = (code: string) => ({
  ok: false,
  error: { code, message: code, retryable: false },
  requestId: 'operations',
});
async function tools(page: Page) {
  await page.addInitScript(() => {
    const registry = new Map();
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: (tool: any, options: any) => {
          registry.set(tool.name, tool);
          options?.signal?.addEventListener('abort', () => {
            if (registry.get(tool.name) === tool) registry.delete(tool.name);
          });
        },
      },
    });
    (window as any).cartTools = registry;
  });
}
const call = (page: Page, operation: unknown) =>
  page.evaluate(
    async ({ operation }) =>
      (window as any).cartTools.get('update_cart').execute(operation),
    { operation },
  );
const input = (page: Page) => page.getByLabel('數量 P001', { exact: true });
async function returned(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}
test('saves one set operation on Enter/blur and removes directly without a full-cart save', async ({
  page,
}) => {
  let current = view();
  const writes: any[] = [];
  await page.route('**/api/v1/carts/**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      writes.push(body);
      expect(body.expectedCartVersion).toBe(current.cartVersion);
      current =
        body.operation.type === 'remove_item'
          ? { ...view(1, 3), items: [] }
          : view(body.operation.quantity, 2);
    }
    await route.fulfill({ json: success(current) });
  });
  await page.goto(`/cart/${id}`);
  await input(page).fill('3');
  await input(page).press('Enter');
  await input(page).blur();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({
    expectedCartVersion: 1,
    operation: { type: 'set_quantity', productId: 'P001', quantity: 3 },
  });
  await expect(
    page.getByRole('button', { name: '儲存調整', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: '移除 P001', exact: true }).click();
  await expect(
    page.getByText('購物車目前沒有商品', { exact: true }),
  ).toBeVisible();
  expect(writes[1]).toEqual({
    expectedCartVersion: 2,
    operation: { type: 'remove_item', productId: 'P001' },
  });
});
test('invalid input stays local and can explicitly restore the saved quantity', async ({
  page,
}) => {
  let writes = 0;
  await page.route('**/api/v1/carts/**', (route) => {
    if (route.request().method() !== 'GET') writes++;
    return route.fulfill({ json: success(view()) });
  });
  await page.goto(`/cart/${id}`);
  await input(page).fill('0');
  await input(page).press('Tab');
  await expect(page.locator('#cart-error')).toBeVisible();
  expect(writes).toBe(0);
  await page
    .getByRole('button', { name: '恢復已儲存數量 P001', exact: true })
    .click();
  await expect(input(page)).toHaveValue('1');
});
test('blocks Human and tool conflicts only while an operation is in flight', async ({
  page,
}) => {
  await tools(page);
  let release!: () => void;
  const barrier = new Promise<void>((r) => {
    release = r;
  });
  let writes = 0;
  await page.route('**/api/v1/**carts/**', async (route) => {
    if (route.request().method() === 'POST') {
      writes++;
      await barrier;
      return route.fulfill({ json: success(view(2, 2)) });
    }
    return route.fulfill({ json: success(view()) });
  });
  await page.goto(`/cart/${id}`);
  await input(page).fill('2');
  await input(page).press('Enter');
  await expect.poll(() => writes).toBe(1);
  await expect(input(page)).toBeDisabled();
  expect(
    await call(page, {
      expectedCartVersion: 1,
      operation: { type: 'remove_item', productId: 'P001' },
    }),
  ).toMatchObject({ kind: 'failure', error: { code: 'CART_BUSY' } });
  release();
  await expect(input(page)).toBeEnabled();
  await expect(input(page)).toHaveValue('2');
  expect(writes).toBe(1);
});
for (const outcome of ['conflict', 'unknown'])
  test(`${outcome} requires an explicit fresh read and never replays the operation`, async ({
    page,
  }) => {
    let current = view();
    let writes = 0;
    await page.route('**/api/v1/carts/**', async (route) => {
      if (route.request().method() === 'POST') {
        writes++;
        current = view(4, 3);
        return outcome === 'unknown'
          ? route.abort()
          : route.fulfill({
              status: 409,
              json: failure('CART_VERSION_CONFLICT'),
            });
      }
      return route.fulfill({ json: success(current) });
    });
    await page.goto(`/cart/${id}`);
    await input(page).fill('2');
    await input(page).press('Enter');
    await expect(page.locator('#cart-error')).toBeVisible();
    await returned(page);
    await expect(input(page)).toHaveValue('2');
    await page
      .getByRole('button', {
        name: '重新載入購物車（放棄未儲存修改）',
        exact: true,
      })
      .click();
    await expect(input(page)).toHaveValue('4');
    expect(writes).toBe(1);
  });
test('refreshes clean snapshots on return but protects dirty input', async ({
  page,
}) => {
  let current = view();
  let reads = 0;
  await page.route('**/api/v1/carts/**', async (route) => {
    reads++;
    await route.fulfill({ json: success(current) });
  });
  await page.goto(`/cart/${id}`);
  await expect(input(page)).toHaveValue('1');
  current = view(3, 2);
  await returned(page);
  await expect(input(page)).toHaveValue('3');
  await input(page).fill('5');
  current = view(4, 3);
  const before = reads;
  await returned(page);
  await expect(input(page)).toHaveValue('5');
  await expect(page.locator('#cart-error')).toContainText('重新載入');
  expect(reads).toBe(before);
});
test('a background read cannot discard input typed after it started', async ({
  page,
}) => {
  let release!: () => void;
  const barrier = new Promise<void>((r) => {
    release = r;
  });
  let delay = false,
    pending = false;
  await page.route('**/api/v1/carts/**', async (route) => {
    if (delay) {
      pending = true;
      await barrier;
    }
    await route.fulfill({ json: success(view(delay ? 3 : 1, delay ? 2 : 1)) });
  });
  await page.goto(`/cart/${id}`);
  await expect(input(page)).toHaveValue('1');
  delay = true;
  await returned(page);
  await expect.poll(() => pending).toBe(true);
  await input(page).fill('5');
  release();
  await expect(page.locator('#cart-error')).toContainText('重新載入');
  await expect(input(page)).toHaveValue('5');
});
test('rejects legacy WebMCP items and accepts one operation with a fresh server version', async ({
  page,
}) => {
  await tools(page);
  let current = view();
  await page.route('**/api/v1/**carts/**', async (route) => {
    if (route.request().method() === 'POST')
      current = { ...view(2, 2), origin: 'AGENT' };
    await route.fulfill({ json: success(current) });
  });
  await page.goto(`/cart/${id}`);
  await expect(input(page)).toBeVisible();
  expect(await call(page, { expectedCartVersion: 1, items: [] })).toMatchObject(
    { error: { code: 'VALIDATION_ERROR' } },
  );
  expect(
    await call(page, {
      expectedCartVersion: 1,
      operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
    }),
  ).toMatchObject({
    kind: 'success',
    cart: { origin: 'AGENT', cartVersion: 2 },
  });
  await expect(input(page)).toHaveValue('2');
});

test('a stale read arriving after a tool conflict cannot clear the reload requirement', async ({
  page,
}) => {
  await tools(page);
  let hold = false,
    pending = false,
    release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/**carts/**', async (route) => {
    if (route.request().method() === 'POST')
      return route.fulfill({
        status: 409,
        json: failure('CART_VERSION_CONFLICT'),
      });
    if (hold) {
      pending = true;
      await barrier;
    }
    return route.fulfill({ json: success(view()) });
  });
  await page.goto(`/cart/${id}`);
  await expect(input(page)).toBeVisible();
  hold = true;
  await returned(page);
  await expect.poll(() => pending).toBe(true);
  expect(
    await call(page, {
      expectedCartVersion: 1,
      operation: { type: 'set_quantity', productId: 'P001', quantity: 2 },
    }),
  ).toMatchObject({
    kind: 'failure',
    error: { code: 'CART_VERSION_CONFLICT' },
  });
  await expect(page.locator('#cart-error')).toContainText('重新載入');
  release();
  await expect(
    page.getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    }),
  ).toBeVisible();
  await expect(input(page)).toBeDisabled();
});

test('a refresh reading the old version does not cancel a late original write or rebase the next intent', async ({
  page,
}) => {
  let current = view(),
    writes = 0;
  const sent: any[] = [];
  await page.route('**/api/v1/carts/**', async (route) => {
    if (route.request().method() === 'POST') {
      sent.push(route.request().postDataJSON());
      writes++;
      if (writes === 1) return route.abort(); // Response lost; the server may still execute it later.
      return route.fulfill({
        status: 409,
        json: failure('CART_VERSION_CONFLICT'),
      });
    }
    return route.fulfill({ json: success(current) });
  });
  await page.goto(`/cart/${id}`);
  await input(page).fill('2');
  await input(page).press('Enter');
  await expect(page.locator('#cart-error')).toContainText('保存結果未確認');
  await page
    .getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    })
    .click();
  await expect(input(page)).toHaveValue('1');
  current = view(2, 2); // The original operation finally commits after the GET.
  await input(page).fill('3');
  await input(page).press('Enter');
  await expect(page.locator('#cart-error')).toContainText(
    '服務端的購物車已更新',
  );
  expect(sent.map((body) => body.expectedCartVersion)).toEqual([1, 1]);
  expect(writes).toBe(2);
  expect(current.items[0].quantity).toBe(2);
});

test('returning during a write revalidates once it finishes, without overwriting the submitted input', async ({
  page,
}) => {
  let current = view(),
    reads = 0,
    posted = false,
    release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/carts/**', async (route) => {
    if (route.request().method() === 'POST') {
      posted = true;
      await barrier;
      current = view(2, 2);
    } else reads++;
    return route.fulfill({ json: success(current) });
  });
  await page.goto(`/cart/${id}`);
  await input(page).fill('2');
  await input(page).press('Enter');
  await expect.poll(() => posted).toBe(true);
  const before = reads;
  await returned(page);
  release();
  await expect(input(page)).toHaveValue('2');
  await expect.poll(() => reads).toBe(before + 1);
});

for (const outcome of ['conflict', 'unknown'])
  test(`catalog add ${outcome} blocks another intent until the cart is explicitly opened`, async ({
    page,
  }) => {
    await tools(page);
    let current = view(),
      writes = 0;
    await page.route('**/api/v1/carts', (route) =>
      route.fulfill({ status: 201, json: success(current) }),
    );
    await page.route('**/api/v1/carts/**', async (route) => {
      if (route.request().method() === 'POST') {
        writes++;
        current = view(writes + 1, writes + 1);
        if (writes === 1)
          return outcome === 'unknown'
            ? route.abort()
            : route.fulfill({
                status: 409,
                json: failure('CART_VERSION_CONFLICT'),
              });
      }
      return route.fulfill({ json: success(current) });
    });
    await page.goto('/products/P001');
    const add = page.getByRole('button', { name: '加入購物車', exact: true });
    await add.click();
    await expect(page.getByRole('link', { name: '前往購物車' })).toBeVisible();
    await add.click();
    await expect.poll(() => writes).toBe(1);
    await expect(add).toBeDisabled();
    expect(
      await page.evaluate(async () =>
        (window as any).cartTools
          .get('add_to_cart')
          .execute({ productId: 'P001' }),
      ),
    ).toMatchObject({ error: { code: 'CART_RELOAD_REQUIRED' } });
    expect(writes).toBe(1);
    await page
      .getByRole('link', { name: '重新載入購物車', exact: true })
      .click();
    await expect(input(page)).toHaveValue('2');
    await page
      .getByRole('link', { name: 'AGENT / STORE', exact: true })
      .click();
    await page.locator('button[data-product-id="P001"]:enabled').click();
    await expect.poll(() => writes).toBe(2);
  });
