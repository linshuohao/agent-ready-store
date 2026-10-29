import { test, expect, type Page } from '@playwright/test';
import type { CartItem, CartView } from '@store/contracts';

// These tests simulate server outcomes to exercise browser recovery, without DB writes.
const cartId = '11111111-1111-4111-8111-111111111111';
const view = (items: CartItem[], version = 1): CartView => ({
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
  test(`keeps every draft item editable after conflict with ${latestItems.length ? 'replacement' : 'empty'} latest cart`, async ({
    page,
  }) => {
    let current = view([{ productId: 'P001', quantity: 1 }]);
    let writes = 0;
    let saved: { expectedCartVersion: number; items: CartItem[] } | undefined;
    await page.route('**/api/v1/carts/**', async (route) => {
      if (route.request().method() === 'PUT') {
        if (++writes === 1) {
          current = view(latestItems, 2);
          return route.fulfill({
            status: 409,
            json: failure('CART_VERSION_CONFLICT'),
          });
        }
        saved = route.request().postDataJSON();
        current = view(saved!.items, 3);
      }
      await route.fulfill({ json: success(current) });
    });
    await page.goto(`/cart/${cartId}`);
    const input = page.getByLabel('數量 P001', { exact: true });
    await input.fill('2');
    await page.getByRole('button', { name: '儲存調整', exact: true }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: '原草稿已保留' }),
    ).toBeVisible();
    await expect(input).toHaveValue('2');
    await expect(
      page.getByRole('heading', { name: '最新已儲存內容' }),
    ).toBeVisible();
    if (latestItems.length) {
      await expect(page.getByText('P003：1 件', { exact: true })).toBeVisible();
      await expect(page.getByLabel('數量 P003', { exact: true })).toHaveCount(
        0,
      );
    } else {
      await expect(
        page.getByText('最新購物車沒有商品。', { exact: true }),
      ).toBeVisible();
    }
    await input.fill('3');
    await page
      .getByRole('button', { name: '以目前草稿儲存', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: '已儲存' }),
    ).toBeVisible();
    expect(saved).toEqual({
      expectedCartVersion: 2,
      items: [{ productId: 'P001', quantity: 3 }],
    });
  });
}

test('lets the user remove an invalid draft item while retaining the conflict comparison', async ({
  page,
}) => {
  let current = view([{ productId: 'P001', quantity: 1 }]);
  let writes = 0;
  const saved: CartItem[][] = [];
  await page.route('**/api/v1/carts/**', async (route) => {
    if (route.request().method() === 'PUT') {
      saved.push(route.request().postDataJSON().items);
      if (++writes === 1) {
        current = view([{ productId: 'P003', quantity: 1 }], 2);
        return route.fulfill({
          status: 409,
          json: failure('CART_VERSION_CONFLICT'),
        });
      }
      if (writes === 2) {
        return route.fulfill({
          status: 409,
          json: {
            ...failure('CART_ITEMS_INVALID'),
            error: {
              ...failure('CART_ITEMS_INVALID').error,
              issues: [{ productId: 'P001', code: 'PRODUCT_NOT_FOUND' }],
            },
          },
        });
      }
      current = view([], 3);
    }
    await route.fulfill({ json: success(current) });
  });
  await page.goto(`/cart/${cartId}`);
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '原草稿已保留' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '以目前草稿儲存', exact: true })
    .click();
  await expect(
    page.getByText('商品已失效，請移除', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '最新已儲存內容' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '移除 P001', exact: true }).click();
  await page
    .getByRole('button', { name: '以目前草稿儲存', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: '已儲存' }),
  ).toBeVisible();
  expect(saved.at(-1)).toEqual([]);
});

test('explicitly discards the entire draft and loads newly added latest items', async ({
  page,
}) => {
  let latest = false;
  await page.route('**/api/v1/carts/**', async (route) => {
    if (route.request().method() === 'PUT') {
      latest = true;
      return route.fulfill({
        status: 409,
        json: failure('CART_VERSION_CONFLICT'),
      });
    }
    await route.fulfill({
      json: success(
        view(
          [{ productId: latest ? 'P003' : 'P001', quantity: 1 }],
          latest ? 2 : 1,
        ),
      ),
    });
  });
  await page.goto(`/cart/${cartId}`);
  await page.getByLabel('數量 P001', { exact: true }).fill('2');
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await page
    .getByRole('button', { name: '放棄草稿，載入最新', exact: true })
    .click();
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('數量 P003', { exact: true })).toHaveValue('1');
  await expect(
    page.getByRole('button', { name: '儲存調整', exact: true }),
  ).toBeVisible();
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
    let reads = 0;
    let attempts = 0;
    let original: { cartToken: string; createRequestId: string } | undefined;
    let saved: { expectedCartVersion: number; items: CartItem[] } | undefined;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/v1/carts/${cartId}{,/items}`, async (route) => {
      if (route.request().method() === 'PUT') {
        saved = route.request().postDataJSON();
        return route.fulfill({ json: success(view(saved!.items, 2)) });
      }
      // A previously inaccessible B remains in the same document's history.
      if (++reads === 1)
        return route.fulfill({ status: 403, json: failure('FORBIDDEN') });
      await route.fulfill({
        json: success(view([{ productId: 'P001', quantity: 1 }])),
      });
    });
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
    expect(saved?.items.some((item) => item.productId === 'P001')).toBe(true);
  });
}
