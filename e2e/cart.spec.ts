import { test, expect } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { formatMoney } from '../apps/web/src/lib/money';

async function addFirst(page: import('@playwright/test').Page) {
  await page.goto('/');
  const button = page.locator('button[data-add-cart]:enabled').first();
  const id = await button.getAttribute('data-product-id');
  await button.click();
  await expect(
    page.getByRole('status').filter({ hasText: '已加入購物車' }),
  ).toBeVisible();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(
    page.getByRole('heading', { name: '購物車', exact: true }),
  ).toBeVisible();
  return id!;
}
test('adds, refreshes, edits and removes a product with server quote', async ({
  page,
}) => {
  expect(formatMoney('90071992547409.91')).toBe('NT$ 90,071,992,547,409.91');
  const id = await addFirst(page);
  await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue('1');
  await page.reload();
  await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue('1');
  await page.getByLabel(`數量 ${id}`, { exact: true }).fill('2');
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '已儲存' }),
  ).toBeVisible();
  await expect(page.getByText('商品小計', { exact: true })).toBeVisible();
  await page.getByLabel(`數量 ${id}`, { exact: true }).fill('3');
  await expect(
    page.getByRole('status').filter({ hasText: '已儲存' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: `移除 ${id}`, exact: true }).click();
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await expect(page.getByText('購物車目前沒有商品')).toBeVisible();
  await expect(page.getByRole('button', { name: '確認購買' })).toHaveCount(0);
});
test('one page coordinates all initial add buttons while creating', async ({
  page,
}) => {
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  let creates = 0;
  await page.route('**/api/v1/carts', async (route) => {
    if (route.request().method() === 'POST') {
      creates++;
      await barrier;
    }
    await route.continue();
  });
  await page.goto('/');
  await page.locator('button[data-add-cart]:enabled').first().click();
  await expect.poll(() => creates).toBe(1);
  try {
    await expect(page.locator('button[data-add-cart]:enabled')).toHaveCount(0);
  } finally {
    release();
  }
  await expect(
    page.getByRole('status').filter({ hasText: '已加入購物車' }),
  ).toBeVisible();
  expect(creates).toBe(1);
});

test('recovers the original cart when the successful creation response is lost', async ({
  page,
}) => {
  let originalId = '';
  let originalRequest:
    { cartToken: string; createRequestId: string } | undefined;
  let attempts = 0;
  await page.route('**/api/v1/carts', async (route) => {
    attempts++;
    const input = route.request().postDataJSON();
    if (attempts === 1) {
      originalRequest = input;
      const response = await route.fetch();
      originalId = (await response.json()).data.cartId;
      await route.abort('failed');
    } else {
      expect(input.cartToken === originalRequest!.cartToken).toBe(true);
      expect(input.createRequestId).toBe(originalRequest!.createRequestId);
      await route.continue();
    }
  });
  await page.goto('/');
  await page.locator('button[data-add-cart]:enabled').first().click();
  await expect(
    page.getByText('建立結果未明，請使用原請求重試。'),
  ).toBeVisible();
  await expect(page.locator('button[data-add-cart]:enabled')).toHaveCount(0);
  await page.getByRole('button', { name: '重試原建立' }).click();
  await expect(page.getByRole('link', { name: '前往購物車' })).toHaveAttribute(
    'href',
    `/cart/${originalId}`,
  );
  expect(attempts).toBe(2);
});

test('a late add response cannot replace another cart after history navigation', async ({
  page,
}) => {
  const id = await addFirst(page);
  const aUrl = page.url();
  const b = await page.request.post('/api/v1/carts', {
    headers: { Origin: new URL(aUrl).origin },
    data: {
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [{ productId: id, quantity: 1 }],
    },
  });
  const bId = (await b.json()).data.cartId;
  await page.goto(`/cart/${bId}`);
  await page.getByRole('link', { name: '繼續選購', exact: true }).click();
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  let committed = false;
  await page.route(`**/api/v1/carts/${bId}/items`, async (route) => {
    const response = await route.fetch();
    committed = true;
    await barrier;
    await route.fulfill({ response });
  });
  await page.locator('button[data-add-cart]:enabled').first().click();
  await expect.poll(() => committed).toBe(true);
  try {
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: '購物車', exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(aUrl);
    await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue(
      '1',
    );
  } finally {
    release();
  }
  // Crossing back into the earlier document discards the old operation's UI state.
  // Only the original B write may commit; it must never replace A's visible snapshot.
  await expect(page).toHaveURL(aUrl);
  await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue('1');
  const savedB = await page.request.get(`/api/v1/carts/${bId}`);
  expect((await savedB.json()).data.items[0].quantity).toBe(2);
});
test('recovers an uncertain edit with the exact version and payload, then rejects a late original', async ({
  page,
}) => {
  const id = await addFirst(page);
  let delayed: { url: string; body: unknown } | undefined;
  await page.route('**/api/v1/carts/*/items', async (route) => {
    if (!delayed) {
      delayed = {
        url: route.request().url(),
        body: route.request().postDataJSON(),
      };
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
  await page.getByLabel(`數量 ${id}`, { exact: true }).fill('2');
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await expect(
    page.getByText('儲存結果未明，尚未確認是否完成。'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '儲存調整', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: '重試原保存', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '已儲存' }),
  ).toBeVisible();
  const late = await page.request.put(delayed!.url, {
    data: delayed!.body,
    headers: { Origin: new URL(delayed!.url).origin },
  });
  expect(late.status()).toBe(409);
  await page.reload();
  await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue('2');
});
test('keeps invalid quantity and the draft on a failed save', async ({
  page,
}) => {
  const id = await addFirst(page);
  const quantity = page.getByLabel(`數量 ${id}`, { exact: true });
  await quantity.fill('0');
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '數量' }),
  ).toBeVisible();
  await expect(quantity).toHaveValue('0');
  await quantity.fill('2');
  await page.route('**/api/v1/carts/*/items', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'TEMPORARY_UNAVAILABLE',
          message: 'test failure',
          retryable: true,
        },
        requestId: 'test',
      }),
    }),
  );
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await expect(
    page.getByText('儲存結果未明，尚未確認是否完成。'),
  ).toBeVisible();
  await expect(quantity).toHaveValue('2');
});

test('shows a real version conflict and preserves the unsaved quantity', async ({
  page,
}) => {
  const id = await addFirst(page);
  const cartId = new URL(page.url()).pathname.split('/').at(-1)!;
  const quantity = page.getByLabel(`數量 ${id}`, { exact: true });
  await quantity.fill('2');
  const changed = await page.request.put(`/api/v1/carts/${cartId}/items`, {
    data: { expectedCartVersion: 1, items: [{ productId: id, quantity: 3 }] },
    headers: { Origin: new URL(page.url()).origin },
  });
  expect(changed.status()).toBe(200);
  await page.getByRole('button', { name: '儲存調整', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '購物車已變更' }),
  ).toBeVisible();
  await expect(quantity).toHaveValue('2');
  await expect(page.getByText(`${id}：3 件`, { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: '載入最新後重新調整', exact: true })
    .click();
  await expect(quantity).toHaveValue('3');
});

test('keeps two carts isolated in one browser and after switching routes', async ({
  page,
  context,
}) => {
  const id = await addFirst(page);
  const originalUrl = page.url();
  const response = await page.request.post('/api/v1/carts', {
    headers: { Origin: new URL(originalUrl).origin },
    data: {
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [{ productId: id, quantity: 1 }],
    },
  });
  expect(response.status()).toBe(201);
  const secondId = (await response.json()).data.cartId;
  const secondPage = await context.newPage();
  await secondPage.goto(`/cart/${secondId}`);
  await secondPage.getByLabel(`數量 ${id}`, { exact: true }).fill('2');
  await secondPage
    .getByRole('button', { name: '儲存調整', exact: true })
    .click();
  await expect(
    secondPage.getByRole('status').filter({ hasText: '已儲存' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue('1');
  await page.goto(`/cart/${secondId}`);
  await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue('2');
  await page.goto(originalUrl);
  await expect(page.getByLabel(`數量 ${id}`, { exact: true })).toHaveValue('1');
  const cookies = await context.cookies();
  expect(
    cookies
      .filter((cookie) => cookie.name.startsWith('cart_'))
      .every((cookie) => cookie.httpOnly),
  ).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('cart_');
  await secondPage.close();
});

test('displays expiry without editing stale contents and keeps the cart usable with keyboard and zoom', async ({
  page,
}) => {
  const id = await addFirst(page);
  const input = page.getByLabel(`數量 ${id}`, { exact: true });
  await input.focus();
  await expect(input).toBeFocused();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.route('**/api/v1/carts/*', (route) =>
    route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'CREDENTIAL_EXPIRED',
          message: 'expired',
          retryable: false,
        },
        requestId: 'expiry-display-test',
      }),
    }),
  );
  await page.reload();
  await expect(
    page.getByRole('alert').filter({ hasText: '購物車已過期' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '儲存調整' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '重新發起購物' }),
  ).toBeVisible();
});
