import { test, expect } from '@playwright/test';
import { shared } from './helpers/handoff';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test('redeems fragment before review and preserves AGENT source through editing and explicit purchase', async ({
  page,
}) => {
  await page.goto(await shared());
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  expect(new URL(page.url()).hash).toBe('');
  const id = new URL(page.url()).pathname.split('/').pop()!;
  expect(
    await page.evaluate(() => sessionStorage.getItem('currentCartId')),
  ).toBe(id);
  const cart = (await (await page.request.get(`/api/v1/carts/${id}`)).json())
    .data;
  expect(cart.origin).toBe('AGENT');
  expect((await page.request.get(`/api/v1/carts/${id}/order`)).status()).toBe(
    404,
  );
  await page.getByRole('link', { name: '編輯原購物車', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '儲存調整', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '前往結帳', exact: true }).click();
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
});
test('confirmation expiry remains recoverable after timer or server rejection', async ({
  page,
}) => {
  await page.route('**/api/v1/carts/*/checkout-review', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (body.ok && body.data.state === 'ready')
      body.data.confirmationExpiresAt = new Date(
        Date.now() + 2000,
      ).toISOString();
    await route.fulfill({ response, json: body });
  });
  await page.goto(await shared());
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: '重新審閱', exact: true }),
  ).toBeVisible({ timeout: 6000 });
  await expect(page.getByText('購物車已過期，無法繼續購買。')).toHaveCount(0);
  await page.unroute('**/api/v1/carts/*/checkout-review');
  await page.getByRole('button', { name: '重新審閱', exact: true }).click();
  await page.route('**/api/v1/carts/*/orders', (route) =>
    route.fulfill({
      status: 409,
      json: {
        ok: false,
        error: {
          code: 'CONFIRMATION_EXPIRED',
          message: 'CONFIRMATION_EXPIRED',
          retryable: false,
        },
        requestId: 'fixture',
      },
    }),
  );
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '重新審閱', exact: true }),
  ).toBeVisible();
});
test('exchange unknown can retry in memory and malformed fragments never fall through', async ({
  page,
}) => {
  const url = await shared();
  let first = true;
  await page.route('**/api/v1/handoffs/exchange', async (route) => {
    if (first) {
      first = false;
      await route.abort();
    } else await route.continue();
  });
  await page.goto(url);
  await expect(
    page.getByRole('button', { name: '重試交接', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.getByRole('button', { name: '重試交接', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  await page.goto(url.split('#')[0] + '#handoff=invalid');
  await expect(
    page.getByText('交接連結格式有誤，請重新開啟原有效連結。'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toHaveCount(0);
});
