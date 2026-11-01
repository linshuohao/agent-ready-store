import { test, expect } from '@playwright/test';
const pageErrors = new WeakMap<import('@playwright/test').Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  // UI transport fixture: these tests never write to the developer's cart database.
  await page.route('**/api/v1/shopping/**', async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        data: {
          cartId: '11111111-1111-4111-8111-111111111111',
          cartVersion: 1,
          agentCreated: false,
          items: [
            {
              productId: 'P001',
              name: '耳機',
              quantity: 1,
              unitPrice: '1290.00',
              availability: {
                canPurchase: true,
                currentQuantity: 10,
                reasons: [],
              },
            },
          ],
          issues: [],
          pendingOrders: [],
        },
      },
    });
  });
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});
test('A in flight does not disable or queue B; only clicked buttons show progress @ci', async ({
  page,
}) => {
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  let creates = 0;
  await page.route('**/api/v1/shopping/carts/add', async (route) => {
    if (route.request().method() === 'POST') {
      creates++;
      if (creates === 1) await barrier;
    }
    await route.fallback();
  });
  await page.goto('/');
  await page.locator('button[data-add-cart]:enabled:visible').first().click();
  await expect.poll(() => creates).toBe(1);
  try {
    const other = page.locator('button[data-add-cart]:enabled:visible').first();
    await expect(
      page.locator('button[data-add-cart][aria-busy="true"]'),
    ).toHaveText('處理中…');
    await expect(other).toBeEnabled();
    await other.click();
    await expect.poll(() => creates).toBe(2);
    await expect(
      page.locator('button[data-add-cart][aria-busy="true"]'),
    ).toHaveCount(1);
    const sibling = page.locator('button[data-add-cart]').nth(1);
    await expect(sibling).toHaveText('加入購物車');
    await expect(sibling).toHaveCSS('opacity', '1');
  } finally {
    release();
  }
  await expect(
    page.locator('button[data-add-cart][aria-busy="true"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: '已加入購物車' }),
  ).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: '購物車操作狀態' }),
  ).toBeInViewport();
  expect(creates).toBe(2);
});

test('empty cart browsing creates nothing and header remains keyboard reachable', async ({
  page,
}) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/v1/shopping'))
      writes.push(r.url());
  });
  await page.goto('/cart');
  const cart = page
    .getByRole('banner')
    .getByRole('link', { name: '購物車', exact: true });
  await expect(cart).toBeVisible();
  await page.goto('/');
  await page.mouse.wheel(0, 1200);
  await expect(cart).toBeInViewport();
  await cart.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/cart$/);
  expect(writes).toEqual([]);
});

test('add feedback floats without shifting cards, dismisses and clears on navigation', async ({
  page,
}) => {
  await page.goto('/');
  const add = page.locator('button[data-add-cart]:enabled:visible').last();
  await add.scrollIntoViewIfNeeded();
  const before = await add.boundingBox();
  await add.click();
  const feedback = page.getByRole('complementary', { name: '購物車操作狀態' });
  await expect(feedback).toBeInViewport();
  await expect(add).toHaveText('加入購物車');
  expect(await add.boundingBox()).toEqual(before);
  await page.mouse.move(0, 0);
  await expect(feedback).toHaveCount(0, { timeout: 7000 });
  await add.click();
  await expect(feedback).toBeVisible();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(page).toHaveURL(/\/cart\//);
  await expect(feedback).toHaveCount(0);
  await page.goBack();
  await expect(feedback).toHaveCount(0);
});

test('feedback respects reduced motion and pauses dismissal for keyboard use', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('button[data-add-cart]:enabled:visible').first().click();
  const feedback = page.getByRole('complementary', { name: '購物車操作狀態' });
  await expect(feedback).toBeVisible();
  expect(
    await feedback.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.getByRole('link', { name: '前往購物車' }).focus();
  await page.clock.install();
  await page.clock.fastForward(6000);
  await expect(feedback).toBeVisible();
  await page.getByRole('button', { name: '關閉加入購物車提示' }).click();
  await expect(feedback).toHaveCount(0);
});
