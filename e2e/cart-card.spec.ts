import { test, expect } from '@playwright/test';

// UI-only transport fixture: transaction persistence is covered by cart-lifecycle.
test('cart cards show artwork and support bounded quantity controls and draft recovery', async ({
  page,
}, testInfo) => {
  const cartId = '11111111-1111-4111-8111-111111111111';
  const cart = {
    cartId,
    cartVersion: 1,
    agentCreated: false,
    items: [
      {
        productId: 'P001',
        name: 'Aero 無線耳機',
        quantity: 1,
        unitPrice: '1290.00',
        availability: { canPurchase: true, currentQuantity: 3, reasons: [] },
      },
    ],
    issues: [],
    pendingOrders: [],
  };
  const quantities: number[] = [];
  await page.route('**/api/v1/shopping/**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      expect(body.expectedCartVersion).toBe(cart.cartVersion);
      expect(body.operation.type).toBe('set_quantity');
      quantities.push(body.operation.quantity);
      cart.items[0].quantity = body.operation.quantity;
      cart.cartVersion++;
    }
    await route.fulfill({ json: { ok: true, data: cart } });
  });
  await page.goto(`/cart/${cartId}`);
  const input = page.getByRole('spinbutton', {
    name: '數量 P001',
    exact: true,
  });
  const minus = page.getByRole('button', { name: '減少 P001 數量' });
  const plus = page.getByRole('button', { name: '增加 P001 數量' });
  await expect(input).toHaveValue('1');
  await expect(page.locator('.cart-line-subtotal')).not.toContainText('優惠');
  await expect(page.locator('.cart-line-subtotal').first()).toContainText(
    'NT$ 1,290.00',
  );
  await expect(page.locator('.cart-line-price')).toContainText(
    '單價 NT$ 1,290.00',
  );
  await expect(page.getByAltText('商品示意，非實物照片')).toBeVisible();
  await expect(minus).toBeDisabled();
  await plus.click();
  await expect(input).toHaveValue('2');
  await expect(page.locator('.cart-line-subtotal')).toContainText(
    'NT$ 2,580.00',
  );
  await expect(plus).toBeEnabled();
  await plus.click();
  await expect(input).toHaveValue('3');
  await expect(plus).toBeDisabled();
  await minus.click();
  await expect(input).toHaveValue('2');
  await input.fill('0');
  await expect(page.locator('.cart-line-subtotal')).toContainText('更新後顯示');
  await input.press('Enter');
  await expect(
    page.getByText('請輸入正整數數量。', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /還原|恢復已儲存/ }),
  ).toHaveCount(0);
  await input.press('Escape');
  await expect(input).toHaveValue('2');
  await input.fill('1');
  await input.press('Tab');
  await expect(input).toHaveValue('1');
  await expect(minus).toBeDisabled();
  expect(quantities).toEqual([2, 3, 2, 1]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('cart-card.png'),
    fullPage: true,
  });
});

test('cart fee panel lists each selected line before totals without repeating unit prices', async ({
  page,
}, testInfo) => {
  const cartId = '11111111-1111-4111-8111-111111111112';
  const cart = {
    cartId,
    cartVersion: 1,
    agentCreated: false,
    items: [
      {
        productId: 'P001',
        name: '耳機',
        quantity: 2,
        unitPrice: '1290.00',
        availability: { canPurchase: true, currentQuantity: 10, reasons: [] },
      },
      {
        productId: 'P009',
        name: '保溫瓶',
        quantity: 1,
        unitPrice: '780.00',
        availability: { canPurchase: true, currentQuantity: 10, reasons: [] },
      },
    ],
    issues: [],
    pendingOrders: [],
  };
  await page.route('**/api/v1/shopping/**', async (route) => {
    if (route.request().url().endsWith('/quote')) {
      const selected = route
        .request()
        .postDataJSON()
        .selectedItems.map((item: { productId: string }) => item.productId);
      const items = cart.items
        .filter((item) => selected.includes(item.productId))
        .map((item) => ({
          productId: item.productId,
          name: item.name,
          brand: 'Brand',
          specs: {},
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineSubtotal: item.productId === 'P001' ? '2580.00' : '780.00',
        }));
      const both = items.length === 2;
      return route.fulfill({
        json: {
          ok: true,
          data: {
            currency: 'TWD',
            pricingRuleVersion: 'v1',
            items,
            subtotal: both ? '3360.00' : '780.00',
            thresholdDiscount: '100.00',
            aiDiscount: '0.00',
            shipping: '0.00',
            total: both ? '3260.00' : '680.00',
            issues: [],
          },
        },
      });
    }
    await route.fulfill({ json: { ok: true, data: cart } });
  });
  await page.goto(`/cart/${cartId}`);
  await page.getByRole('checkbox', { name: '全選商品' }).check();
  const panel = page.getByRole('complementary', { name: '所選商品預估' });
  await expect(panel.locator('.amount-row-discount').first()).toContainText(
    '− NT$ 100.00',
  );
  await expect(
    panel.locator('.cart-totals > dl .amount-row-zero'),
  ).toContainText('NT$ 0.00');
  await expect(
    panel.locator('.cart-totals > dl .amount-row-shipping'),
  ).toContainText('免運');
  const hierarchy = await panel.evaluate((el) => ({
    base: parseFloat(
      getComputedStyle(el.querySelector('.amount-row-base dd')!).fontSize,
    ),
    final: parseFloat(
      getComputedStyle(el.querySelector('.amount-row-final dd')!).fontSize,
    ),
  }));
  expect(hierarchy.final).toBeGreaterThan(hierarchy.base);
  await expect(
    panel.locator('.cart-totals > dl .amount-row-shipping'),
  ).toHaveCSS('border-bottom-width', '0px');
  await expect(panel.locator('.cart-totals > dl .amount-row-final')).toHaveCSS(
    'border-top-width',
    '2px',
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath('amount-hierarchy.png'),
    fullPage: false,
  });
  await panel.getByRole('button', { name: '查看商品費用明細' }).click();
  const dialog = page.getByRole('dialog', {
    name: '商品費用明細',
    exact: true,
  });
  const rows = dialog
    .getByRole('list', { name: '商品費用明細' })
    .getByRole('listitem');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('耳機');
  await expect(rows.nth(0)).toContainText('× 2 件');
  await expect(rows.nth(0)).toContainText('NT$ 2,580.00');
  await expect(rows.nth(1)).toContainText('NT$ 780.00');
  await expect(dialog).not.toContainText('NT$ 1,290.00');
  await expect(dialog.locator('.amount-row-discount').first()).toContainText(
    '− NT$ 100.00',
  );
  await expect(dialog.locator('.amount-row-shipping')).toContainText('免運');
  await expect(dialog.locator('dl > div').first()).toContainText('商品合計');
  await expect(dialog.locator('dl > div').first()).toContainText(
    'NT$ 3,360.00',
  );
  await expect(dialog.locator('dl > div').last()).toContainText('NT$ 3,260.00');
  const positions = await dialog.evaluate((el) => ({
    list: el.querySelector('ul')!.getBoundingClientRect().bottom,
    totals: el.querySelector('dl')!.getBoundingClientRect().top,
  }));
  expect(positions.list).toBeLessThanOrEqual(positions.totals);
  await expect(panel).toHaveCSS('overflow-y', 'visible');
  await dialog.getByRole('button', { name: '關閉明細' }).click();
  await page
    .getByRole('checkbox', { name: '選取 P001', exact: true })
    .uncheck();
  await panel.getByRole('button', { name: '查看商品費用明細' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('保溫瓶');
  await expect(page.locator('.cart-line-subtotal')).toHaveCount(2);
});
