import { test, expect, type Page } from '@playwright/test';
import type { OrderView, ShoppingCartView } from '@store/contracts';
const fixtureOrders = new WeakMap<Page, OrderView>();
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
      shareUrl: `${process.env.WEB_BASE_URL ?? 'http://127.0.0.1:3000'}/orders/${orderId}?view=share`,
    },
  };
  fixtureOrders.set(page, order);
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
    const art = el
      .closest('.cart-line-heading')!
      .querySelector('.cart-line-art')!
      .getBoundingClientRect();
    return {
      gap: art.left - box.right,
      centers: Math.abs((box.top + box.bottom - art.top - art.bottom) / 2),
    };
  });
  expect(alignment.gap).toBeGreaterThanOrEqual(10);
  expect(alignment.centers).toBeLessThan(2);
  await expect(page.getByRole('button', { name: '去結算' })).toHaveCSS(
    'background-color',
    'rgb(25, 25, 25)',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: '去結算' }).click();
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
  const controls = page.getByRole('region', { name: '金額與操作' });
  const toastBox = await feedback.boundingBox();
  expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(
    (await controls.boundingBox())!.y,
  );
  expect(
    await feedback.evaluate((el) => getComputedStyle(el).animationName),
  ).not.toBe('none');
  await page.mouse.move(0, 0);
  await expect(feedback).toHaveCount(0, { timeout: 7000 });
  await page
    .getByRole('banner')
    .getByRole('link', { name: '訂單列表', exact: true })
    .click();
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
  await expect(
    page.locator('.order-deadline-actions').getByRole('timer'),
  ).toBeVisible();
  await expect(
    page
      .locator('.order-deadline-actions')
      .getByRole('button', { name: '取消這筆訂單', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '繼續購物', exact: true }),
  ).toHaveCount(0);
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
  await page.getByRole('button', { name: '去結算' }).click();
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
    '請輸入正整數數量',
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
      inside:
        rect.left >= root.getBoundingClientRect().left &&
        rect.right <= root.getBoundingClientRect().right &&
        rect.top >= root.getBoundingClientRect().top &&
        rect.bottom <= root.getBoundingClientRect().bottom,
    };
  });

  expect(styles.inside).toBe(true);
  expect(styles.stroke).toBe('rgb(255, 255, 255)');
  expect(styles.stroke).not.toBe(styles.background);
  expect(styles.width).toBeGreaterThanOrEqual(16);
  expect(styles.height).toBeGreaterThanOrEqual(16);
  await page.goto(`/orders/${orderId}`);
  await expect(
    page.getByRole('link', { name: 'AGENT / STORE', exact: true }),
  ).toHaveAttribute('href', '/');
});

test('catalog checkbox checkmark stays centered inside its background', async ({
  page,
}) => {
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: '只看可購買商品' });
  await checkbox.check();
  await expect(checkbox.locator('svg')).toBeVisible();
  const centers = await checkbox.evaluate((el) => {
    const box = el.getBoundingClientRect(),
      mark = el.querySelector('svg')!.getBoundingClientRect();
    return {
      x: Math.abs((box.left + box.right - mark.left - mark.right) / 2),
      y: Math.abs((box.top + box.bottom - mark.top - mark.bottom) / 2),
    };
  });
  expect(centers.x).toBeLessThan(1);
  expect(centers.y).toBeLessThan(1);
});

test('narrow header keeps navigation labels on one line', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(`/cart/${cartId}`);
  for (const link of await page
    .getByRole('navigation', { name: '購物導覽' })
    .getByRole('link')
    .all()) {
    expect(
      await link.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getClientRects().length;
      }),
    ).toBe(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});
test('resume confirmation separates primary and secondary actions', async ({
  page,
}, testInfo) => {
  fixtureOrders.get(page)!.cartId = '10000000-0000-4000-8000-000000000003';
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: '接續這次購物', exact: true }).click();
  const primary = page.getByRole('button', { name: '確認接續原購物車' });
  const secondary = page.getByRole('button', { name: '保留目前購物車' });
  const first = (await primary.boundingBox())!;
  const second = (await secondary.boundingBox())!;
  expect(
    Math.max(
      second.y - first.y - first.height,
      second.x - first.x - first.width,
    ),
  ).toBeGreaterThanOrEqual(12);
  await expect(secondary).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await secondary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('confirmation.png') });
});

test('order list retry is separated from error copy', async ({
  page,
}, testInfo) => {
  await page.route('**/api/v1/shopping/carts/*/orders*', (route) =>
    route.abort(),
  );
  await page.goto(`/orders?cartId=${cartId}`);
  const error = page.getByRole('alert').filter({ hasText: '暫時無法讀取訂單' });
  await expect(error).toBeVisible();
  const retry = page.getByRole('button', { name: '重新查詢訂單' });
  const copy = (await error.boundingBox())!;
  const button = (await retry.boundingBox())!;
  expect(button.y - copy.y - copy.height).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: testInfo.outputPath('order-list-error.png') });
});

test('order detail uses header navigation and one share button beside the order number', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).sharedUrls = [];
    window.open = ((url: string) => {
      (window as any).sharedUrls.push(url);
      return null;
    }) as typeof window.open;
  });
  await page.goto(`/orders/${orderId}`);
  const header = page.getByRole('banner');
  await expect(
    header.getByRole('link', { name: '訂單列表', exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole('link', { name: '購物車', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: '查看所有訂單' })).toHaveCount(0);
  const share = page.getByRole('button', { name: '分享這筆訂單', exact: true });
  await expect(share).toHaveCount(1);
  await expect(page.locator('.order-reference-row')).toContainText(orderId);
  await expect(
    page.locator('.order-reference-row').getByRole('button'),
  ).toHaveCount(1);
  await expect(share).toBeInViewport();
  await share.click();
  expect(await page.evaluate(() => (window as any).sharedUrls)).toEqual([
    `${process.env.WEB_BASE_URL ?? 'http://127.0.0.1:3000'}/orders/${orderId}?view=share`,
  ]);
  // Query-only navigation must also update the shared header boundary.
  await page.goto(`/orders/${orderId}?view=share`);
  await expect(header.getByRole('navigation')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '分享這筆訂單', exact: true }),
  ).toHaveCount(0);
});

test('order cards show complete product previews, status and fixed amounts across list and detail', async ({
  page,
}, testInfo) => {
  const original = fixtureOrders.get(page)!;
  original.summary.items.push({
    productId: 'P009',
    name: '適合通勤與戶外使用的輕量保溫水瓶，長商品名稱展示測試',
    brand: 'Daily',
    specs: { 容量: '500 ml', 材質: '不鏽鋼' },
    quantity: 2,
    unitPrice: '350.00',
    lineSubtotal: '700.00',
  });
  original.summary.subtotal = '800.00';
  original.summary.total = '900.00';
  const list = (['CHECKOUT', 'PAID', 'CANCELLED', 'EXPIRED'] as const).map(
    (state, i) => ({
      ...structuredClone(original),
      orderId: `10000000-0000-4000-8000-00000000000${i + 2}`,
      effectiveStatus: state,
      status: state === 'PAID' ? 'PAID' : 'CHECKOUT',
      paidAt: state === 'PAID' ? new Date().toISOString() : null,
      closedAt: ['CANCELLED', 'EXPIRED'].includes(state)
        ? new Date().toISOString()
        : null,
      closeReason: ['CANCELLED', 'EXPIRED'].includes(state) ? state : null,
      allowedActions: {
        canPay: state === 'CHECKOUT',
        canCancel: state === 'CHECKOUT',
      },
    }),
  );
  await page.route('**/api/v1/shopping/carts/*/orders*', (route) =>
    route.fulfill({
      json: { ok: true, data: { items: list, nextOffset: null } },
    }),
  );
  await page.goto(`/orders?cartId=${cartId}`);
  const cards = page.locator('.order-list-item');
  await expect(cards).toHaveCount(4);
  for (const [i, label] of ['待支付', '已支付', '已取消', '已超時'].entries()) {
    await expect(cards.nth(i).locator('.order-list-status')).toHaveText(label);
    await expect(cards.nth(i).getByAltText('商品示意，非實物照片')).toHaveCount(
      2,
    );
    await expect(cards.nth(i)).toContainText('× 2 件');
    await expect(cards.nth(i).locator('.order-list-total')).toContainText(
      'NT$ 900.00',
    );
  }
  await expect(page.locator('.order-list-deadline')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('orders-list.png'),
    fullPage: true,
  });
  await cards.first().getByRole('link').click();
  const products = page.locator('.purchase-product');
  await expect(products).toHaveCount(2);
  await expect(
    products.nth(1).getByAltText('商品示意，非實物照片'),
  ).toBeVisible();
  await expect(
    products.nth(1).locator('.order-product-subtotal'),
  ).toContainText('NT$ 700.00');
  await expect(products.nth(1).getByRole('definition')).toHaveText([
    '500 ml',
    '不鏽鋼',
  ]);
  await expect(
    page.getByRole('button', { name: '確認支付', exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('order-detail.png'),
    fullPage: true,
  });
});

test('cart and order actions stay visible with one page scroll and reachable content', async ({
  page,
}, testInfo) => {
  const order = fixtureOrders.get(page)!;
  const item = order.summary.items[0];
  order.summary.items = Array.from({ length: 12 }, (_, i) => ({
    ...item,
    productId: `P${String(i + 1).padStart(3, '0')}`,
    name: `商品 ${i + 1}`,
  }));
  order.summary.subtotal = '1200.00';
  order.summary.total = '1300.00';
  await page.goto(`/orders/${orderId}`);
  const aside = page.getByRole('complementary', { name: '訂單金額與操作' });
  const dock = aside.getByRole('region', { name: '金額與操作' });
  const pay = page.getByRole('button', { name: '確認支付', exact: true });
  await expect(dock).toHaveCSS('position', 'fixed');
  if (testInfo.project.name === 'desktop')
    await expect(aside).toHaveCSS('position', 'sticky');
  await expect(pay).toBeInViewport();
  await expect(dock).toContainText('NT$ 1,300.00');
  const totalRows = aside.locator('.cart-totals > dl > div');
  await expect(totalRows.locator('dt')).toHaveText([
    '商品合計',
    '全站滿減',
    'AI 優惠',
    '運費',
    '應付金額',
  ]);
  await expect(totalRows.nth(1)).toBeVisible();
  await expect(totalRows.nth(2)).toBeVisible();
  await expect(
    aside.locator('.cart-totals > dl .amount-row-shipping'),
  ).toContainText('＋ NT$ 100.00');
  const before = await dock.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 600));
  const after = await dock.boundingBox();
  expect(Math.abs(before!.y - after!.y)).toBeLessThan(2);
  await expect(pay).toBeInViewport();
  await expect(aside).toHaveCSS('overflow-y', 'visible');
  await expect(dock.getByRole('button')).toHaveCount(1);
  await expect(dock.getByRole('link')).toHaveCount(0);
  const dockBox = await dock.boundingBox();
  expect(dockBox!.x).toBe(0);
  expect(dockBox!.width).toBe(await page.evaluate(() => window.innerWidth));
  const trigger = aside.getByRole('button', { name: '查看商品費用明細' });
  await trigger.click();
  const dialog = page.getByRole('dialog', {
    name: '商品費用明細',
    exact: true,
  });
  await expect(dialog.getByRole('listitem')).toHaveCount(12);
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  const backgroundY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(4, 4);
  await page.mouse.wheel(0, 300);
  expect(await page.evaluate(() => window.scrollY)).toBe(backgroundY);
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest('dialog')),
    ),
  ).toBe(true);
  await expect(dialog).toHaveCSS('overflow-y', 'auto');
  await dialog.getByRole('listitem').last().scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('listitem').last()).toBeInViewport();
  await dialog.locator('dl > div').last().scrollIntoViewIfNeeded();
  await expect(dialog.locator('dl > div').last()).toBeInViewport();
  await expect(
    dialog.getByRole('button', { name: '關閉明細' }),
  ).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath('fees-dialog.png'),
    fullPage: false,
  });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  const footer = page.locator('.commerce-application > footer');
  await footer.scrollIntoViewIfNeeded();
  const footerBox = await footer.boundingBox();
  expect(footerBox!.y + footerBox!.height).toBeLessThan(
    (await dock.boundingBox())!.y,
  );
  expect(
    await page.evaluate(
      () =>
        [...document.querySelectorAll('.commerce-application *')].filter(
          (el) =>
            /^(auto|scroll)$/.test(getComputedStyle(el).overflowY) &&
            el.scrollHeight > el.clientHeight,
        ).length,
    ),
  ).toBe(0);
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 1280, height: 420 });
    await expect(pay).toBeInViewport();
    await expect(dock).toHaveCSS('overflow-y', 'visible');
    await page.setViewportSize({ width: 1280, height: 800 });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('fixed-order-actions.png'),
    fullPage: false,
  });
  order.summary.items = [item];
  order.summary.subtotal = '100.00';
  order.summary.total = '200.00';
  await page.goto(`/cart/${cartId}`);
  const estimate = page.getByRole('complementary', { name: '所選商品預估' });
  const cartDock = estimate.getByRole('region', { name: '金額與操作' });
  const create = page.getByRole('button', {
    name: '去結算',
    exact: true,
  });
  await expect(cartDock).toHaveCSS('position', 'fixed');
  await expect(create).toBeInViewport();
  await expect(create).toBeDisabled();
  await expect(cartDock).toContainText('待確認');
  await page.getByRole('checkbox', { name: '全選商品' }).check();
  await expect(create).toBeEnabled();
  await expect(cartDock).toContainText('NT$ 200.00');
  await page
    .getByRole('spinbutton', { name: '數量 P001', exact: true })
    .fill('2');
  await expect(create).toBeEnabled();
  await expect(cartDock).not.toContainText('待確認');
  await page
    .getByRole('spinbutton', { name: '數量 P001', exact: true })
    .press('Escape');
  await expect(cartDock).toContainText('NT$ 200.00');
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(create).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath('fixed-cart-actions.png'),
    fullPage: false,
  });
});

test('order header opens the displayed source order list without switching the current cart', async ({
  page,
}) => {
  const sourceCartId = '10000000-0000-4000-8000-000000000099';
  fixtureOrders.get(page)!.cartId = sourceCartId;
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByTestId('order-id')).toHaveText(orderId);
  const header = page.getByRole('banner');
  const orders = header.getByRole('link', { name: '訂單列表', exact: true });
  await expect(orders).toHaveAttribute(
    'href',
    `/orders?cartId=${sourceCartId}`,
  );
  await expect(
    header.getByRole('link', { name: '購物車', exact: true }),
  ).toHaveAttribute('href', `/cart/${cartId}`);
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(cartId);
  await orders.click();
  await expect(page.getByRole('region', { name: '所有訂單' })).toContainText(
    orderId,
  );
  await expect(orders).toHaveAttribute(
    'href',
    `/orders?cartId=${sourceCartId}`,
  );
  expect(
    await page.evaluate(() => localStorage.getItem('store.currentCartId')),
  ).toBe(cartId);
});

test('order product previews expand independently without changing full totals', async ({
  page,
}) => {
  const base = fixtureOrders.get(page)!;
  const order = {
    ...base,
    summary: {
      ...base.summary,
      items: Array.from({ length: 7 }, (_, index) => ({
        ...base.summary.items[0],
        productId: `P${String(index + 1).padStart(3, '0')}`,
        name: `商品 ${index + 1}`,
      })),
    },
  };
  const sibling = {
    ...structuredClone(order),
    orderId: '10000000-0000-4000-8000-000000000003',
  };
  await page.route('**/api/v1/shopping/carts/*/orders*', (route) =>
    route.fulfill({
      json: { ok: true, data: { items: [order, sibling], nextOffset: null } },
    }),
  );
  await page.goto(`/orders?cartId=${cartId}`);
  const cards = page.locator('.order-list-item');
  await expect(cards).toHaveCount(2);
  await expect(cards.first().locator('.order-list-products > li')).toHaveCount(
    2,
  );
  const total = await cards
    .first()
    .locator('.order-list-total strong')
    .innerText();
  const expand = cards
    .first()
    .getByRole('button', { name: '展開其餘 5 項商品', exact: true });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expand.click();
  await expect(cards.first().locator('.order-list-products > li')).toHaveCount(
    7,
  );
  await expect(cards.nth(1).locator('.order-list-products > li')).toHaveCount(
    2,
  );
  await expect(cards.first().locator('.order-list-total strong')).toHaveText(
    total,
  );
  const collapse = cards
    .first()
    .getByRole('button', { name: '收起商品', exact: true });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await collapse.click();
  await expect(cards.first().locator('.order-list-products > li')).toHaveCount(
    2,
  );
});

test('shared Web links retain client navigation and modified-click browser behavior', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as any).__navigationMarker = true;
  });
  const link = page
    .getByRole('navigation', { name: '購物導覽' })
    .getByRole('link', { name: '購物車', exact: true });
  await expect(link).toHaveAttribute('href', `/cart/${cartId}`);
  const newPage = context.waitForEvent('page');
  await link.click({ modifiers: ['ControlOrMeta'] });
  const opened = await newPage;
  await expect(opened).toHaveURL(new RegExp(`/cart/${cartId}$`));
  await expect(page).toHaveURL(/\/$/);
  await opened.close();
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/cart/${cartId}$`));
  expect(await page.evaluate(() => (window as any).__navigationMarker)).toBe(
    true,
  );
});

for (const [action, heading] of [
  ['確認支付', '支付成功'],
  ['取消這筆訂單', '訂單已取消'],
] as const) {
  test(`countdown stops after ${heading} and stays stopped on reload`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const interval = window.setInterval.bind(window);
      const clear = window.clearInterval.bind(window);
      const timers = new Set<number>();
      (window as any).__countdownTimers = timers;
      window.setInterval = ((
        callback: TimerHandler,
        delay?: number,
        ...args: any[]
      ) => {
        const id = interval(callback, delay, ...args);
        if (delay === 1000) timers.add(id);
        return id;
      }) as typeof window.setInterval;
      window.clearInterval = (id) => {
        timers.delete(id!);
        clear(id);
      };
    });
    await page.goto(`/orders/${orderId}`);
    await expect
      .poll(() => page.evaluate(() => (window as any).__countdownTimers.size))
      .toBe(1);
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as any).__countdownTimers.size))
      .toBe(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => (window as any).__countdownTimers.size),
    ).toBe(0);
  });
}
