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
test('A in flight does not disable or queue B; clicked buttons stay visually quiet @ci', async ({
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
    await route.continue();
  });
  await page.goto('/');
  await page.locator('button[data-add-cart]:enabled:visible').first().click();
  await expect.poll(() => creates).toBe(1);
  try {
    const other = page.locator('button[data-add-cart]:enabled:visible').first();
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
    page.getByRole('status').filter({ hasText: '已儲存購物車' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('complementary', { name: '購物車操作狀態' }),
  ).toHaveCount(0);
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
