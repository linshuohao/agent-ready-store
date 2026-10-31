import { test, expect } from '@playwright/test';

test.skip(
  process.env.CHECKOUT_INTEGRATION !== '1',
  'requires the isolated shopping browser environment',
);

// Catches broken UI wiring, wrong pricing, duplicate orders, and lost cart context.
// Writes go through the browser; API reads independently check persisted outcomes.
test('browse, select, pay and resume the same cart @ci', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('searchbox', { name: '搜尋商品' }).fill('Aero');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await page.getByRole('link', { name: /查看 .*，P001$/ }).click();
  await expect(page.getByRole('heading', { name: '商品規格' })).toBeVisible();
  await page.getByRole('button', { name: '加入購物車', exact: true }).click();
  await page.getByRole('link', { name: '前往購物車', exact: true }).click();
  await expect(page).toHaveURL(/\/cart\//);
  const cartId = new URL(page.url()).pathname.split('/').at(-1)!;
  await expect(page.getByLabel('數量 P001', { exact: true })).toHaveValue('1');
  await page.getByLabel('選取 P001', { exact: true }).check();
  await page
    .getByRole('button', { name: '建立待支付訂單', exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\//);
  const orderId = new URL(page.url()).pathname.split('/').at(-1)!;
  await expect(
    page.getByRole('heading', { name: '待支付訂單', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: '訂單固定摘要' }),
  ).toContainText('P001');
  await page.getByRole('button', { name: '確認支付', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('order-id')).toHaveText(orderId);
  await expect(
    page.getByRole('heading', { name: '支付成功', exact: true }),
  ).toBeVisible();
  const ordersResponse = await page.request.get(
    `/api/v1/shopping/carts/${cartId}/orders`,
  );
  expect(ordersResponse.ok()).toBeTruthy();
  const { data } = await ordersResponse.json();
  expect(data.items).toHaveLength(1);
  expect(data.items[0]).toMatchObject({
    orderId,
    status: 'PAID',
    summary: { items: [{ productId: 'P001', quantity: 1 }], total: '1790.00' },
  });
  await page.getByRole('link', { name: '繼續購物', exact: true }).click();
  await page.getByRole('link', { name: '購物車', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/cart/${cartId}$`));
  await expect(
    page.getByText('購物車目前沒有商品', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
