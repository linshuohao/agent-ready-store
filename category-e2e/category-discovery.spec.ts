import { test, expect } from '@playwright/test';
const pageErrors = new WeakMap<import('@playwright/test').Page, string[]>();
test.beforeEach(async ({ request, page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await request.post('http://127.0.0.1:4312/__fixture', {
    data: { mode: 'large' },
  });
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});
test('select preserves exact values, constraints, URL navigation and clears pagination', async ({
  page,
}) => {
  await page.goto('/?offset=12&category=missing&brand=Brand&maxPrice=200');
  const select = page.getByRole('combobox', { name: '商品分類' });
  await expect(select).toHaveValue('missing');
  await expect(select).toContainText('尚未出現在已載入分類');
  await select.focus();
  await expect(select).toBeFocused();
  await select.selectOption(' Space ');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('category'))
    .toBe(' Space ');
  expect(new URL(page.url()).searchParams.get('brand')).toBe('Brand');
  expect(new URL(page.url()).searchParams.get('maxPrice')).toBe('200');
  expect(new URL(page.url()).searchParams.has('offset')).toBe(false);
  await select.selectOption('');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has('category'))
    .toBe(false);
  await page.goBack();
  await expect(select).toHaveValue(' Space ');
  await page.goForward();
  await expect(select).toHaveValue('');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('first load failure retries without losing the URL condition', async ({
  page,
  request,
}) => {
  await request.post('http://127.0.0.1:4312/__fixture', {
    data: { mode: 'initial-error' },
  });
  await page.goto('/?category=missing');
  await expect(
    page.getByRole('alert').filter({ hasText: '暫時無法載入分類' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '重新載入分類' }).click();
  await expect(
    page.getByRole('button', { name: '載入更多分類' }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: '商品分類' })).toHaveValue(
    'missing',
  );
});
test('continuation failure and catalog change never mix versions or clear selected value', async ({
  page,
}) => {
  await page.goto('/?category=Fixture+54');
  const select = page.getByRole('combobox', { name: '商品分類' });
  let attempt = 0;
  await page.route('**/api/v1/catalog/categories?**', async (route) => {
    attempt++;
    if (attempt <= 2)
      await route.fulfill({
        status: attempt === 1 ? 503 : 409,
        json: {
          ok: false,
          error: {
            code: attempt === 1 ? 'TEMPORARY_UNAVAILABLE' : 'CATALOG_CHANGED',
          },
        },
      });
    else await route.continue();
  });
  await page.getByRole('button', { name: '載入更多分類' }).click();
  await expect(select).toHaveValue('Fixture 54');
  await page.getByRole('button', { name: '重新載入分類' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '分類目錄已更新' }),
  ).toBeVisible();
  await expect(select.locator('option')).toHaveCount(2);
  await page.getByRole('button', { name: '重新載入分類' }).click();
  await page.getByRole('button', { name: '載入更多分類' }).click();
  await expect(select).not.toContainText('尚未出現在已載入分類');
  await expect(select).toHaveValue('Fixture 54');
  await expect(page.getByRole('button', { name: '載入更多分類' })).toHaveCount(
    0,
  );
});
test('a late continuation response cannot overwrite a newly navigated form', async ({
  page,
}) => {
  await page.goto('/');
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/catalog/categories?offset=**', async (route) => {
    await delayed;
    await route.fulfill({
      json: {
        ok: true,
        requestId: 'old',
        data: {
          items: [{ value: 'LATE', label: 'LATE' }],
          total: 51,
          nextOffset: null,
          catalogRevision: 'old',
        },
      },
    });
  });
  await page.getByRole('button', { name: '載入更多分類' }).click();
  await page.getByRole('searchbox', { name: '搜尋商品' }).fill('new');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect(page).toHaveURL(/q=new/);
  const settled = page.waitForResponse((response) =>
    response.url().includes('/catalog/categories?offset='),
  );
  release();
  await settled;
  await expect(
    page.getByRole('combobox', { name: '商品分類' }),
  ).not.toContainText('LATE');
});

test('an unknown whitespace-only URL category is retained until explicitly cleared', async ({
  page,
}) => {
  await page.goto('/?category=%20%20');
  const select = page.getByRole('combobox', { name: '商品分類' });
  await expect(select).toHaveValue('  ');
  await page.getByRole('spinbutton', { name: '最高價格' }).fill('200');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('category'))
    .toBe('  ');
  await select.selectOption('');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has('category'))
    .toBe(false);
});

test('native category selection works with keyboard', async ({ page }) => {
  await page.goto('/');
  const select = page.getByRole('combobox', { name: '商品分類' });
  await select.focus();
  await expect(select).toBeFocused();
  await page.keyboard.press('f');
  await page.keyboard.press('Tab');
  await expect(select).toHaveValue('Fixture 00');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('category'))
    .toBe('Fixture 00');
});
