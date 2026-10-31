import { test, expect } from '@playwright/test';
const pageErrors = new WeakMap<import('@playwright/test').Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});
test.skip(
  process.env.CHECKOUT_INTEGRATION !== '1',
  'isolated lifecycle API/Web required',
);
test('add feedback follows the viewport, dismisses and clears on navigation', async ({
  page,
}) => {
  await page.goto('/');
  const add = page.locator('button[data-add-cart]:enabled:visible').last();
  await expect(add).toBeVisible();
  await add.scrollIntoViewIfNeeded();
  await add.click();
  const feedback = page.getByRole('complementary', { name: '購物車操作狀態' });
  await expect(feedback).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(feedback).toBeInViewport();
  // Leaving the notification allows its five-second reading window to expire.
  await page.mouse.move(0, 0);
  await expect(feedback).toHaveCount(0, { timeout: 7000 });
  await add.click();
  await expect(feedback).toBeVisible();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(
    page.getByRole('heading', { name: '購物車', exact: true }),
  ).toBeVisible();
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

test('one page locks cart writes but only the clicked button shows progress', async ({
  page,
}) => {
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  let creates = 0;
  await page.route('**/api/v1/shopping/carts', async (route) => {
    if (route.request().method() === 'POST') {
      creates++;
      await barrier;
    }
    await route.continue();
  });
  await page.goto('/');
  await page.locator('button[data-add-cart]:enabled:visible').first().click();
  await expect.poll(() => creates).toBe(1);
  try {
    await expect(
      page.locator('button[data-add-cart]:enabled:visible'),
    ).toHaveCount(0);
    await expect(
      page.locator('button[data-add-cart]').filter({ hasText: '處理中…' }),
    ).toHaveCount(1);
    const sibling = page.locator('button[data-add-cart]').nth(1);
    await expect(sibling).toHaveText('加入購物車');
    await expect(sibling).toHaveCSS('opacity', '1');
  } finally {
    release();
  }
  await expect(
    page.getByRole('status').filter({ hasText: '已儲存購物車' }),
  ).toBeVisible();
  expect(creates).toBe(1);
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
