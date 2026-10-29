import { test, expect } from '@playwright/test';
const cartId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const quote = {
  currency: 'TWD',
  items: [
    {
      productId: 'P003',
      name: '行動電源',
      quantity: 1,
      unitPrice: '690.00',
      lineSubtotal: '690.00',
    },
  ],
  subtotal: '690.00',
  thresholdDiscount: '0.00',
  aiDiscount: '0.00',
  shipping: '100.00',
  total: '790.00',
};
const order = {
  orderId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  cartId,
  createdAt: '2026-10-30T00:00:00.000Z',
  purchaseHash: 'a'.repeat(64),
  catalogRevision: 'fixture',
  snapshot: {
    cartId,
    cartVersion: 1,
    origin: 'HUMAN',
    pricingRuleVersion: 'pricing-v1',
    quote,
    items: [
      { ...quote.items[0], brand: 'Voltri', specs: { 容量: '10000mAh' } },
    ],
  },
};

test('keeps the cart in the pinned header and allows an empty cart without creating one', async ({
  page,
}) => {
  let creates = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/v1/carts')
      creates++;
  });
  await page.goto('/cart');
  const cart = page
    .getByRole('banner')
    .getByRole('link', { name: '購物車', exact: true });
  await expect(cart).toBeVisible();
  await expect(
    page.getByText('購物車目前沒有商品', { exact: true }),
  ).toBeVisible();
  await page.goto('/');
  await page.mouse.wheel(0, 1200);
  await expect(cart).toBeInViewport();
  const rect = await page.getByRole('banner').boundingBox();
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y).toBeLessThan(2);
  await cart.click();
  await expect(page).toHaveURL(/\/cart$/);
  expect(creates).toBe(0);
});

test('starts a new shopping journey directly from the order and keeps the new cart empty', async ({
  page,
}) => {
  await page.route(`**/api/v1/carts/${cartId}/order`, (r) =>
    r.fulfill({ json: { ok: true, data: order, requestId: 'layout-test' } }),
  );
  await page.addInitScript(
    (id) => sessionStorage.setItem('currentCartId', id),
    cartId,
  );
  await page.goto(`/orders/${cartId}`);
  const origin = new URL(page.url()).origin;
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('order-layout.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: '開始新的購物', exact: true }).click();
  await expect(page).toHaveURL(origin + '/');
  await page
    .getByRole('banner')
    .getByRole('link', { name: '購物車', exact: true })
    .click();
  await expect(
    page.getByText('購物車目前沒有商品', { exact: true }),
  ).toBeVisible();
});

test('separates purchase details, totals and actions without horizontal overflow', async ({
  page,
}) => {
  let submissions = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/orders')) submissions++;
  });
  await page.route(`**/api/v1/carts/${cartId}/checkout-review`, (r) =>
    r.fulfill({
      json: {
        ok: true,
        data: {
          state: 'ready',
          summary: order.snapshot,
          purchaseHash: order.purchaseHash,
          confirmation: 'layout-confirmation',
          confirmationExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
        requestId: 'layout-review',
      },
    }),
  );
  await page.goto(`/checkout/${cartId}`);
  await expect(
    page.getByRole('banner').getByRole('link', { name: '購物車', exact: true }),
  ).toHaveAttribute('href', `/cart/${cartId}`);
  const primary = page.getByRole('button', { name: '確認購買', exact: true });
  await expect(primary).toBeVisible();
  await primary.focus();
  await expect(primary).toBeFocused();
  const totals = await page
      .getByRole('region', { name: '本次確認金額', exact: true })
      .boundingBox(),
    action = await primary.boundingBox();
  expect(action!.y - (totals!.y + totals!.height)).toBeGreaterThanOrEqual(16);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('link', { name: '編輯原購物車', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '繼續選購', exact: true }),
  ).toBeVisible();
  expect(submissions).toBe(0);
  await page.screenshot({
    path: test.info().outputPath('checkout-layout.png'),
    fullPage: true,
  });
});
