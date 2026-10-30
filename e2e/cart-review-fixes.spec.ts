import { test, expect, type Page } from '@playwright/test';
import type { CartItem, CartView } from '@store/contracts';

// These tests simulate server outcomes to exercise browser recovery, without DB writes.
const cartId = '11111111-1111-4111-8111-111111111111';
const view = (items: CartItem[], version = 1): CartView => ({
  orderId: null,
  cartId,
  origin: 'HUMAN',
  cartVersion: version,
  items: items.map((item) => ({
    ...item,
    name: item.productId,
    unitPrice: '100.00',
    availability: { canPurchase: true, reasons: [], currentQuantity: 10 },
  })),
  quote: null,
  quoteHash: null,
  issues: [],
  canCheckout: false,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
});
const success = (data: CartView) => ({ ok: true, data, requestId: 'review' });
const failure = (code: string) => ({
  ok: false,
  error: { code, message: code, retryable: false },
  requestId: 'review',
});
const addButton = (page: Page) =>
  page.locator('button[data-add-cart]:enabled').first();

for (const latestItems of [[{ productId: 'P003', quantity: 1 }], []]) {
  test(`reload replaces the whole stale draft with ${latestItems.length ? 'replacement' : 'empty'} server cart`, async ({
    page,
  }) => {
    let current = view([{ productId: 'P001', quantity: 1 }]);
    let reads = 0,
      writes = 0;
    await page.route('**/api/v1/carts/**', async (route) => {
      if (route.request().method() === 'POST') {
        writes++;
        current = view(latestItems, 2);
        return route.fulfill({
          status: 409,
          json: failure('CART_VERSION_CONFLICT'),
        });
      }
      reads++;
      await route.fulfill({ json: success(current) });
    });
    await page.goto(`/cart/${cartId}`);
    await page.getByLabel('數量 P001', { exact: true }).fill('2');
    const before = reads;
    await page.getByRole('spinbutton').first().press('Enter');
    await expect(page.locator('#cart-error')).toContainText(
      '服務端的購物車已更新',
    );
    expect(reads).toBe(before);
    expect(writes).toBe(1);
    await expect(
      page.getByRole('heading', { name: '最新已儲存內容' }),
    ).toHaveCount(0);
    await page
      .getByRole('button', {
        name: '重新載入購物車（放棄未儲存修改）',
        exact: true,
      })
      .click();
    await expect(page.getByLabel('數量 P001', { exact: true })).toHaveCount(0);
    if (latestItems.length)
      await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue(
        '1',
      );
    else
      await expect(
        page.getByText('購物車目前沒有商品', { exact: true }),
      ).toBeVisible();
    expect(writes).toBe(1);
  });
}
test('unknown edit releases submission and reloads without replaying or comparing', async ({
  page,
}) => {
  let current = view([{ productId: 'P001', quantity: 1 }]);
  let reads = 0,
    writes = 0;
  await page.route('**/api/v1/carts/**', async (route) => {
    if (route.request().method() === 'POST') {
      writes++;
      current = view([{ productId: 'P001', quantity: 2 }], 2);
      return route.abort();
    }
    reads++;
    await route.fulfill({ json: success(current) });
  });
  await page.goto(`/cart/${cartId}`);
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  const before = reads;
  await page.getByRole('spinbutton').first().press('Enter');
  await expect(page.locator('#cart-error')).toContainText('保存結果未確認');
  await expect(page.getByLabel('數量 P001', { exact: true })).toBeDisabled();
  expect(reads).toBe(before);
  await expect(page.getByRole('button', { name: '重試原保存' })).toHaveCount(0);
  await page
    .getByRole('button', {
      name: '重新載入購物車（放棄未儲存修改）',
      exact: true,
    })
    .click();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('2');
  await expect(page.locator('#cart-error')).toHaveCount(0);
  expect(writes).toBe(1);
});

test('a late save on A cannot replace B after navigation', async ({ page }) => {
  const bId = '33333333-3333-4333-8333-333333333333';
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received = false;
  await page.route('**/api/v1/carts/**', async (route) => {
    if (route.request().method() === 'POST') {
      received = true;
      await barrier;
      return route.fulfill({
        json: success(view([{ productId: 'P001', quantity: 2 }], 2)),
      });
    }
    const b = route.request().url().endsWith(bId);
    await route.fulfill({
      json: success({
        ...view([{ productId: b ? 'P003' : 'P001', quantity: 1 }]),
        cartId: b ? bId : cartId,
      }),
    });
  });
  await page.goto(`/cart/${cartId}`);
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await page.getByRole('spinbutton').first().press('Enter');
  await expect.poll(() => received).toBe(true);
  await page.goto(`/cart/${bId}`);
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
  release();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
});

for (const outcome of ['network', 'service']) {
  test(`blocks new creation after ${outcome} uncertainty and reload until explicit restart`, async ({
    page,
  }) => {
    const inputs: {
      cartToken: string;
      createRequestId: string;
      items: CartItem[];
    }[] = [];
    await page.route('**/api/v1/carts', async (route) => {
      inputs.push(route.request().postDataJSON());
      const pending = await page.evaluate(() => Object.values(sessionStorage));
      expect(pending).toEqual(['1']);
      if (inputs.length === 1) {
        if (outcome === 'network') return route.abort('failed');
        return route.fulfill({
          status: 503,
          json: failure('TEMPORARY_UNAVAILABLE'),
        });
      }
      await route.fulfill({
        status: 201,
        json: success(view(inputs.at(-1)!.items)),
      });
    });
    await page.goto('/');
    await addButton(page).click();
    await expect(
      page.getByText('建立結果未明，請使用原請求重試。', { exact: true }),
    ).toBeVisible();
    const stored = await page.evaluate(() => [
      ...Object.values(sessionStorage),
      ...Object.values(localStorage),
    ]);
    expect(
      stored.some(
        (value) =>
          value.includes(inputs[0].cartToken) ||
          value.includes(inputs[0].createRequestId),
      ),
    ).toBe(false);
    await page.reload();
    await expect(page.getByText(/建立結果無法確認/)).toBeVisible();
    await expect(page.locator('button[data-add-cart]:enabled')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: '重試原建立', exact: true }),
    ).toHaveCount(0);
    expect(inputs).toHaveLength(1);
    await page.reload();
    await expect(page.getByText(/建立結果無法確認/)).toBeVisible();
    await page
      .getByRole('button', { name: '重新發起購物', exact: true })
      .click();
    await addButton(page).click();
    await expect(
      page.getByRole('status').filter({ hasText: '已加入購物車' }),
    ).toBeVisible();
    expect(inputs).toHaveLength(2);
    expect(inputs[0].cartToken === inputs[1].cartToken).toBe(false);
    expect(inputs[0].createRequestId === inputs[1].createRequestId).toBe(false);
    await page.reload();
    await expect(
      page.getByRole('link', { name: '購物車', exact: true }),
    ).toHaveAttribute('href', `/cart/${cartId}`);
    await expect(page.getByText(/建立結果無法確認/)).toHaveCount(0);
  });
}

test('clears the pending creation marker after explicit rejection', async ({
  page,
}) => {
  await page.route('**/api/v1/carts', (route) =>
    route.fulfill({ status: 409, json: failure('CART_ITEMS_INVALID') }),
  );
  await page.goto('/');
  await addButton(page).click();
  await expect(page.getByText(/部分商品或數量無法購買/)).toBeVisible();
  await page.reload();
  await expect(addButton(page)).toBeEnabled();
  await expect(page.getByText(/建立結果無法確認/)).toHaveCount(0);
});

for (const recover of [false, true]) {
  test(`keeps the selected cart after a late creation ${recover ? 'retry' : 'success'}`, async ({
    page,
  }) => {
    const createdId = '22222222-2222-4222-8222-222222222222';
    let attempts = 0;
    let original: { cartToken: string; createRequestId: string } | undefined;
    let saved:
      | {
          expectedCartVersion: number;
          operation: { productId: string; quantity: number };
        }
      | undefined;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      `**/api/v1/carts/${cartId}{,/operations}`,
      async (route) => {
        if (route.request().method() === 'POST') {
          saved = route.request().postDataJSON();
          return route.fulfill({
            json: success(
              view([{ productId: saved!.operation.productId, quantity: 2 }], 2),
            ),
          });
        }
        // A previously inaccessible B remains in the same document's history.
        // Strict Mode may read more than once; B stays inaccessible until creation begins.
        if (attempts === 0)
          return route.fulfill({ status: 403, json: failure('FORBIDDEN') });
        await route.fulfill({
          json: success(view([{ productId: 'P001', quantity: 1 }])),
        });
      },
    );
    await page.route('**/api/v1/carts', async (route) => {
      const input = route.request().postDataJSON();
      if (++attempts === 1) {
        original = input;
        await barrier;
        if (recover) return route.abort('failed');
      } else {
        expect(input.cartToken === original!.cartToken).toBe(true);
        expect(input.createRequestId === original!.createRequestId).toBe(true);
      }
      await route.fulfill({
        status: 201,
        json: success({ ...view(input.items), cartId: createdId }),
      });
    });
    await page.goto(`/cart/${cartId}`);
    await page
      .getByRole('button', { name: '重新發起購物', exact: true })
      .click();
    await page.getByRole('link', { name: '返回商品列表', exact: true }).click();
    await addButton(page).click();
    await expect.poll(() => attempts).toBe(1);
    await page.goBack();
    const nav = page.getByRole('link', { name: '購物車', exact: true });
    await expect(nav).toHaveAttribute('href', `/cart/${cartId}`);
    release();
    if (recover) {
      await page
        .getByRole('button', { name: '重試原建立', exact: true })
        .click();
      await expect.poll(() => attempts).toBe(2);
    }
    await expect
      .poll(() =>
        page.evaluate(() => sessionStorage.getItem('cartCreationPending')),
      )
      .toBe(null);
    await expect(nav).toHaveAttribute('href', `/cart/${cartId}`);
    expect(
      await page.evaluate(() => sessionStorage.getItem('currentCartId')),
    ).toBe(cartId);
    await page.getByRole('link', { name: /^(繼續選購|返回商品列表)$/ }).click();
    await addButton(page).click();
    await expect(
      page.getByRole('status').filter({ hasText: '已加入購物車' }),
    ).toBeVisible();
    expect(saved?.expectedCartVersion).toBe(1);
    expect(saved?.operation.productId).toBeTruthy();
  });
}
