import { test, expect } from '@playwright/test';
import { shared } from './helpers/handoff';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test('rejects query-only handoff material even with an existing valid Cookie', async ({
  page,
}) => {
  const url = await shared();
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  let reviews = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/checkout-review')) reviews++;
  });
  await page.goto(url.split('#')[0] + '?handoff=invalid');
  await expect(
    page.getByText('交接連結格式有誤，請重新開啟原有效連結。'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toHaveCount(0);
  expect(reviews).toBe(0);
});
test('handles same-document hash navigation without falling back to the old Cookie', async ({
  page,
}) => {
  const url = await shared();
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    location.hash = 'handoff=invalid';
  });
  await expect(
    page.getByText('交接連結格式有誤，請重新開啟原有效連結。'),
  ).toBeVisible();
  await page.evaluate((full) => {
    location.hash = new URL(full).hash;
  }, url);
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  expect(new URL(page.url()).hash).toBe('');
});
test('a late A exchange cannot change the selected B cart', async ({
  page,
}) => {
  const a = await shared(),
    b = await shared();
  const aId = new URL(a).pathname.split('/').pop()!,
    bId = new URL(b).pathname.split('/').pop()!;
  let release: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started: () => void;
  const observed = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route('**/api/v1/handoffs/exchange', async (route) => {
    if (route.request().postDataJSON().cartId === aId) {
      started();
      await held;
    }
    await route.continue();
  });
  await page.goto(a);
  await observed;
  await page.goto(b);
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  release!();
  await page.getByRole('link', { name: '編輯原購物車', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/cart/${bId}$`));
  expect(
    await page.evaluate(() => sessionStorage.getItem('currentCartId')),
  ).toBe(bId);
});
