import { randomBytes, randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

const origin = 'http://localhost:3004';
test.skip(
  process.env.PURCHASE_INTEGRATION !== '1' ||
    process.env.WEB_BASE_URL !== origin,
  'Explicit disposable store_test integration only; never run against the normal shop.',
);

test('isolated real HTTP and PostgreSQL purchase via WebMCP preparation and UI confirmation', async ({
  page,
  context,
  browser,
}, testInfo) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const tools = new Map<
      string,
      { execute: (input: unknown) => Promise<unknown> }
    >();
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool: (
          tool: { name: string; execute: (input: unknown) => Promise<unknown> },
          options: { signal: AbortSignal },
        ) => {
          tools.set(tool.name, tool);
          options.signal.addEventListener('abort', () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name);
          });
        },
      },
    });
    Object.assign(window, { integrationTools: tools });
  });
  const created = await context.request.post(`${origin}/api/v1/webmcp/carts`, {
    headers: { Origin: origin },
    data: {
      createRequestId: randomUUID(),
      cartToken: randomBytes(32).toString('base64url'),
      items: [{ productId: 'P001', quantity: 1 }],
    },
  });
  expect(created.ok()).toBe(true);
  const creation = await created.json();
  expect(creation.ok).toBe(true);
  const cart = creation.data;
  expect(cart.origin).toBe('AGENT');
  const payments: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname.endsWith('/pay')
    )
      payments.push(request.url());
  });
  await page.goto(`${origin}/cart/${cart.cartId}`);
  await expect(
    page.getByRole('heading', { name: '購物車', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { integrationTools: Map<string, unknown> }
        ).integrationTools.has('prepare_checkout'),
      ),
    )
    .toBe(true);
  const prepared = (await page.evaluate(
    async (input) => {
      const tools = (
        window as unknown as {
          integrationTools: Map<
            string,
            { execute: (input: unknown) => Promise<unknown> }
          >;
        }
      ).integrationTools;
      return tools.get('prepare_checkout')!.execute(input);
    },
    { prepareRequestId: randomUUID(), expectedCartVersion: cart.cartVersion },
  )) as { kind: string; data: { reviewId: string; state: string } };
  expect(prepared.kind).toBe('success');
  expect(prepared.data.state).toBe('pending');
  expect(prepared.data.reviewId).toBeTruthy();
  await expect(page).toHaveURL(
    `${origin}/checkout/${cart.cartId}?reviewId=${prepared.data.reviewId}`,
  );
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  const statusPath = `${origin}/api/v1/webmcp/carts/${cart.cartId}/purchases/${prepared.data.reviewId}`;
  const before = await context.request.get(statusPath);
  expect((await before.json()).data).toMatchObject({
    state: 'pending',
    order: null,
  });
  expect(payments).toHaveLength(0);

  // Explicit test-only simulated Human click, restricted above to the disposable integration service.
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '購買成功', exact: true }),
  ).toBeVisible();
  const orderId = await page.getByTestId('order-id').innerText();
  expect(orderId).toMatch(/^[a-f0-9-]{36}$/);
  expect(payments).toHaveLength(1);
  await expect(page).toHaveURL(
    `${origin}/checkout/${cart.cartId}?reviewId=${prepared.data.reviewId}`,
  );
  const after = await context.request.get(statusPath);
  expect((await after.json()).data).toMatchObject({
    state: 'completed',
    order: { orderId },
  });
  if (testInfo.project.name === 'desktop')
    await page.screenshot({
      path: '/private/tmp/purchase-integrated-completed.png',
      fullPage: true,
    });
  await page.reload();
  await expect(page.getByTestId('order-id')).toHaveText(orderId);
  expect(payments).toHaveLength(1);
  await page.getByRole('button', { name: '取得唯讀訂單詳情連結' }).click();
  const detail = page.getByRole('link', { name: '開啟唯讀訂單詳情' });
  await expect(detail).toBeVisible();
  const href = await detail.getAttribute('href');
  expect(new URL(href!).origin).toBe(origin);
  expect(new URL(href!).pathname).toBe(`/order-details/${orderId}`);
  expect(new URL(href!).hash.startsWith('#order-read=')).toBe(true);

  const reader = await browser.newContext();
  try {
    const detailPage = await reader.newPage();
    await detailPage.goto(href!);
    await expect(detailPage.getByTestId('order-id')).toHaveText(orderId);
    await expect(detailPage).toHaveURL(`${origin}/order-details/${orderId}`);
    await expect(
      detailPage.getByRole('link', { name: '購物車', exact: true }),
    ).toHaveCount(0);
    await expect(
      detailPage.getByRole('button', { name: '確認購買', exact: true }),
    ).toHaveCount(0);
    await detailPage.reload();
    await expect(detailPage.getByTestId('order-id')).toHaveText(orderId);
    expect(
      (await reader.cookies()).some(
        (cookie) => cookie.name === `order_read_${orderId}` && cookie.httpOnly,
      ),
    ).toBe(true);
  } finally {
    await reader.close();
  }
  expect(payments).toHaveLength(1);
});
