import { test, expect, type Page } from '@playwright/test';
import type { OrderView, ShoppingCartView } from '@store/contracts';
const creationGates = new WeakMap<Page, Promise<void>>();
const errors = new WeakMap<Page, string[]>();
const cartId = '10000000-0000-4000-8000-000000000001';
const orderId = '10000000-0000-4000-8000-000000000002';
async function setup(page: Page) {
  const order: OrderView = {
    orderId,
    cartId,
    sourceCartVersion: 1,
    status: 'CHECKOUT',
    effectiveStatus: 'CHECKOUT',
    createdAt: new Date().toISOString(),
    reservationExpiresAt: new Date(Date.now() + 900000).toISOString(),
    paidAt: null,
    closedAt: null,
    closeReason: null,
    createdByChannel: 'WEB',
    aiEligible: false,
    summary: {
      currency: 'TWD',
      pricingRuleVersion: 'v1',
      items: [
        {
          productId: 'P001',
          name: '測試商品',
          brand: 'Brand',
          specs: {},
          quantity: 1,
          unitPrice: '100.00',
          lineSubtotal: '100.00',
        },
      ],
      subtotal: '100.00',
      thresholdDiscount: '0.00',
      aiDiscount: '0.00',
      shipping: '100.00',
      total: '200.00',
    },
    allowedActions: { canPay: true, canCancel: true },
    navigation: {
      orderUrl: `http://localhost:3000/orders/${orderId}`,
      shareUrl: `http://localhost:3000/orders/${orderId}?view=share`,
    },
  };
  const cart: ShoppingCartView = {
    cartId,
    cartVersion: 1,
    agentCreated: false,
    items: [
      {
        productId: 'P001',
        name: '測試商品',
        quantity: 1,
        unitPrice: '100.00',
        availability: { canPurchase: true, reasons: [], currentQuantity: 10 },
      },
    ],
    issues: [],
    pendingOrders: [],
  };
  await page.addInitScript(
    (id) => localStorage.setItem('store.currentCartId', id),
    cartId,
  );
  await page.route('**/api/v1/shopping/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith('/operations')) {
      const input = route.request().postDataJSON();
      cart.items[0].quantity = input.operation.quantity;
      cart.cartVersion++;
      data = cart;
    } else if (path.endsWith('/quote')) data = order.summary;
    else if (path.endsWith('/pay')) {
      order.status = 'PAID';
      order.effectiveStatus = 'PAID';
      order.paidAt = new Date().toISOString();
      order.allowedActions = { canPay: false, canCancel: false };
      data = order;
    } else if (path.endsWith('/cancel')) {
      order.effectiveStatus = 'CANCELLED';
      order.closedAt = new Date().toISOString();
      order.closeReason = 'CANCELLED';
      order.allowedActions = { canPay: false, canCancel: false };
      data = order;
    } else if (
      path.endsWith('/orders') &&
      route.request().method() === 'POST'
    ) {
      cart.items = [];
      cart.cartVersion++;
      data = { cart, order };
    } else if (path.endsWith('/orders'))
      data = { items: [order], nextOffset: null };
    else if (path.endsWith(`/orders/${orderId}`)) data = order;
    else data = cart;
    if (path.endsWith('/orders') && route.request().method() === 'POST')
      await creationGates.get(page);
    await route.fulfill({ json: { ok: true, data } });
  });
}
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
  await setup(page);
});
test('cart separates orders and creation navigates with visible feedback', async ({
  page,
}) => {
  await page.goto(`/cart/${cartId}`);
  await expect(page.getByRole('region', { name: '所有訂單' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '待支付訂單' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: '全選商品' }).check();
  const check = page.getByRole('checkbox', { name: '選取 P001' });
  await expect(check).toBeChecked();
  expect(
    await check.evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(20);
  const alignment = await check.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const text = el.closest('label')!.lastElementChild!.getBoundingClientRect();
    return {
      gap: text.left - box.right,
      centers: Math.abs((box.top + box.bottom - text.top - text.bottom) / 2),
    };
  });
  expect(alignment.gap).toBeGreaterThanOrEqual(10);
  expect(alignment.centers).toBeLessThan(2);
  await expect(page.locator('.purchase-aside .commerce-actions')).toHaveCSS(
    'margin-top',
    '24px',
  );
  await expect(page.getByRole('button', { name: '建立待支付訂單' })).toHaveCSS(
    'background-color',
    'rgb(25, 25, 25)',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: '建立待支付訂單' }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}`));
  await expect(
    page.getByRole('status').filter({ hasText: '訂單已建立' }),
  ).toBeVisible();
});
test('payment gives animated feedback and returns focus and scroll to result', async ({
  page,
}) => {
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole('region', { name: '所有訂單' })).toHaveCount(0);
  await page.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const feedback = page.getByRole('complementary', { name: '訂單操作狀態' });
  await expect(feedback).toContainText('支付成功');
  expect(
    await feedback.evaluate((el) => getComputedStyle(el).animationName),
  ).not.toBe('none');
  await page.mouse.move(0, 0);
  await expect(feedback).toHaveCount(0, { timeout: 7000 });
  await page.getByRole('link', { name: '查看所有訂單', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\?/);
  await expect(
    page.getByRole('heading', { name: '訂單列表', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: '所有訂單' })).toContainText(
    '已支付',
  );
});
test('cancel feedback respects reduced motion and share keeps single-order scope', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: '取消這筆訂單', exact: true }).click();
  const feedback = page.getByRole('complementary', { name: '訂單操作狀態' });
  await expect(feedback).toContainText('訂單已取消');
  expect(
    await feedback.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.goto(`/orders/${orderId}?view=share`);
  await expect(page.getByRole('link', { name: '查看所有訂單' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '所有訂單' })).toHaveCount(0);
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
test('late creation never steals navigation from the order list', async ({
  page,
}) => {
  let release!: () => void;
  creationGates.set(
    page,
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  await page.goto(`/cart/${cartId}`);
  await page.getByRole('checkbox', { name: '全選商品' }).check();
  await page.getByRole('button', { name: '建立待支付訂單' }).click();
  await page
    .getByRole('banner')
    .getByRole('link', { name: '訂單列表' })
    .click();
  await expect(
    page.getByRole('heading', { name: '訂單列表', exact: true }),
  ).toBeVisible();
  release();
  await expect
    .poll(() =>
      page.evaluate(
        (id) => localStorage.getItem(`store.order.created.${id}`),
        cartId,
      ),
    )
    .toBe(orderId);
  await expect(page).toHaveURL(new RegExp(`/orders\\?cartId=${cartId}`));
});
test('unknown payment never announces success', async ({ page }) => {
  await page.route('**/shopping/orders/*/pay', (route) => route.abort());
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(
    page.getByText('原操作結果待確認，請先查詢原單。重試只操作這筆訂單。'),
  ).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: '訂單操作狀態' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toHaveCount(0);
});

test('payment after creation restarts the feedback reading window', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(`/orders/${orderId}?created=1`);
  const feedback = page.getByRole('complementary', { name: '訂單操作狀態' });
  await expect(feedback).toContainText('訂單已建立');
  await page.clock.fastForward(4500);
  await page.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(feedback).toContainText('支付成功');
  await page.mouse.move(0, 0);
  await page.clock.fastForward(1000);
  await expect(feedback).toBeVisible();
  await page.clock.fastForward(4500);
  await expect(feedback).toHaveCount(0);
});

test('quantity updates automatically without a save action', async ({
  page,
}) => {
  const writes: unknown[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/operations'))
      writes.push(request.postDataJSON());
  });
  await page.goto(`/cart/${cartId}`);
  const quantity = page.getByRole('spinbutton', {
    name: '數量 P001',
    exact: true,
  });
  await expect(quantity).toHaveValue('1');
  await expect(
    page.getByRole('button', { name: /^儲存 .* 數量$/ }),
  ).toHaveCount(0);
  await quantity.fill('2');
  await quantity.press('Tab');
  await expect.poll(() => writes.length).toBe(1);
  await expect(quantity).toBeEnabled();
  await expect(quantity).toHaveValue('2');
  await quantity.press('Enter');
  await quantity.press('Tab');
  expect(writes).toHaveLength(1);
  await quantity.fill('0');
  await quantity.press('Tab');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    '數量必須是正整數',
  );
  expect(writes).toHaveLength(1);
  await quantity.fill('3');
  await quantity.press('Enter');
  await expect.poll(() => writes.length).toBe(2);
  await expect(quantity).toHaveValue('3');
  await expect(quantity).toBeEnabled();
  await page.reload();
  await expect(quantity).toHaveValue('3');
});

test('selected checkbox has a visible contrasting mark and continue shopping opens catalog', async ({
  page,
}) => {
  await page.goto(`/cart/${cartId}`);
  const checkbox = page.getByRole('checkbox', { name: '選取 P001' });
  await checkbox.check();
  await expect(checkbox).toHaveCSS('background-color', 'rgb(25, 25, 25)');
  const mark = checkbox.locator('svg');
  await expect(mark).toBeVisible();
  const styles = await mark.evaluate((svg) => {
    const root = svg.closest('[data-slot="checkbox"]')!;
    const rect = svg.getBoundingClientRect();
    return {
      stroke: getComputedStyle(svg).stroke,
      background: getComputedStyle(root).backgroundColor,
      width: rect.width,
      height: rect.height,
    };
  });

  expect(styles.stroke).toBe('rgb(255, 255, 255)');
  expect(styles.stroke).not.toBe(styles.background);
  expect(styles.width).toBeGreaterThanOrEqual(16);
  expect(styles.height).toBeGreaterThanOrEqual(16);
  await page.goto(`/orders/${orderId}`);
  await expect(
    page.getByRole('link', { name: '繼續購物', exact: true }),
  ).toHaveAttribute('href', '/');
});
