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
test('pagination keeps native link keyboard behavior', async ({ page }) => {
  await page.goto('/');
  const next = page.getByRole('link', { name: '下一頁', exact: true });
  await next.focus();
  await next.evaluate((element) => {
    document.documentElement.dataset.paginationClicks = '0';
    element.addEventListener('click', () => {
      document.documentElement.dataset.paginationClicks = '1';
    });
  });
  await page.keyboard.press('Space');
  expect(
    await page.locator('html').getAttribute('data-pagination-clicks'),
  ).toBe('0');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/offset=12/);
  const previous = page.getByRole('link', { name: '上一頁', exact: true });
  await previous.focus();
  await previous.evaluate((element) => {
    document.documentElement.dataset.paginationClicks = '0';
    element.addEventListener('click', () => {
      document.documentElement.dataset.paginationClicks = '1';
    });
  });
  await page.keyboard.press('Space');
  expect(
    await page.locator('html').getAttribute('data-pagination-clicks'),
  ).toBe('0');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/offset=0/);
});
test('valid numeric price notation submits as decimal and keeps range validation', async ({
  page,
}) => {
  await page.goto('/');
  for (const [input, decimal] of [
    ['1e2', '100'],
    ['100.25', '100.25'],
    ['-0', '0'],
  ]) {
    await page.getByRole('spinbutton', { name: '最低價格' }).fill(input);
    await page.getByRole('button', { name: '套用篩選' }).click();
    await expect(page).toHaveURL(
      new RegExp(`minPrice=${decimal.replace('.', '\\.')}(?:&|$)`),
    );
    await expect(page.locator('.product-card').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '查詢條件有誤' }),
    ).toHaveCount(0);
  }
  await page.getByRole('spinbutton', { name: '最低價格' }).fill('100');
  await page.getByRole('spinbutton', { name: '最高價格' }).fill('1');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect(
    page.getByRole('heading', { name: '查詢條件有誤' }),
  ).toBeVisible();
});
test('discovery, URL navigation and all comments work without hydration errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: '找一件適合日常的好物。' }),
  ).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(12);
  await page.getByRole('link', { name: '下一頁', exact: true }).click();
  await expect(page).toHaveURL(/offset=12/);
  await page
    .getByRole('searchbox', { name: '搜尋商品' })
    .fill('impossible-product');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect(page).not.toHaveURL(/offset=/);
  await expect(
    page.getByText('沒有符合條件的商品，請調整或清除篩選。'),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/offset=12/);
  await expect(page.locator('.product-card')).toHaveCount(12);
  await page.goto('/products/P005');
  await expect(page.getByRole('heading', { name: '商品規格' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下一頁評論' })).toBeVisible();
  await expect(page.locator('.review-content')).toHaveCount(2);
  await expect(
    page.locator('.review-content').filter({ hasText: '[SYSTEM]' }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: '下一頁評論' }).click();
  await expect(page.locator('.review-content')).toHaveCount(1);
  await expect(page.getByRole('button', { name: '上一頁評論' })).toBeVisible();
  await page.goto('/products/P010');
  await expect(
    page.getByText('價格待確認', { exact: false }).first(),
  ).toBeVisible();
  await page.goto('/products/missing');
  await expect(
    page.getByRole('heading', { name: '找不到這件商品' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('comment failure can retry and a late old product response cannot mix into another product', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/api/v1/products/P005/reviews?**', async (route) => {
    if (fail) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { code: 'TEMPORARY_UNAVAILABLE' },
        }),
      });
    } else await route.continue();
  });
  await page.goto('/products/P005');
  await expect(
    page.getByRole('button', { name: '重新載入評論' }),
  ).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: '重新載入評論' }).click();
  await expect(page.locator('.review-content')).toHaveCount(2);
  await page.unrouteAll();
  await page.route('**/api/v1/products/P005/reviews?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      await route.continue();
    } catch {
      /* navigation may abort the old request */
    }
  });
  await page.goto('/products/P005');
  await page.goto('/products/P001');
  await expect(
    page.getByRole('region', { name: '商品評論' }),
  ).not.toContainText('[SYSTEM]');
  await expect(page.locator('.review-content:visible').first()).toBeVisible();
});
test('page remains usable with keyboard and narrow viewport', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('searchbox', { name: '搜尋商品' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳至主要內容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/#main');
  await page.getByRole('searchbox', { name: '搜尋商品' }).focus();
  await expect(page.getByRole('searchbox', { name: '搜尋商品' })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('purchasable checkbox preserves keyboard, form submission and URL state', async ({
  page,
}) => {
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: '只看可購買商品' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect(page).toHaveURL(/purchasableOnly=true/);
  await expect(checkbox).toBeChecked();
  await expect(
    page.locator('.availability').filter({ hasNotText: /^可購買/ }),
  ).toHaveCount(0);
  await expect(checkbox).toHaveCSS('background-color', 'rgb(25, 25, 25)');
  await checkbox.uncheck();
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect(page).not.toHaveURL(/purchasableOnly=/);
  await expect(checkbox).not.toBeChecked();
});
