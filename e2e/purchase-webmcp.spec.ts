import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
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
    Object.assign(window, { purchaseTestTools: tools });
  });
});

// Disposable browser fixture: every purchase endpoint is intercepted, with no real order/stock writes.
const id = '10000000-0000-4000-8000-000000000001';
const reviewId = '20000000-0000-4000-8000-000000000001';
const line = {
  productId: 'P001',
  quantity: 1,
  name: 'Fixture',
  unitPrice: '100.00',
  lineSubtotal: '100.00',
};
const summary = {
  cartId: id,
  cartVersion: 1,
  origin: 'AGENT',
  items: [{ ...line, brand: 'Fixture', specs: {} }],
  quote: {
    currency: 'TWD',
    items: [line],
    subtotal: '100.00',
    thresholdDiscount: '0.00',
    aiDiscount: '10.00',
    shipping: '60.00',
    total: '150.00',
  },
  pricingRuleVersion: 'pricing-v1',
};
const order = {
  orderId: '30000000-0000-4000-8000-000000000001',
  cartId: id,
  createdAt: '2026-10-30T00:00:00.000Z',
  purchaseHash: 'a'.repeat(64),
  catalogRevision: 'fixture',
  snapshot: summary,
};
const status = {
  reviewId,
  cartId: id,
  channel: 'webmcp',
  state: 'pending',
  summary,
  expiresAt: '2099-01-01T00:00:00.000Z',
  order: null,
};
test('agent checkout restores only original review; UI click pays in place; reload reads completed result', async ({
  page,
}) => {
  const writes: string[] = [];
  let completed = false;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.method() === 'POST') writes.push(url.pathname);
    const base = `/api/v1/webmcp/carts/${id}/purchases/${reviewId}`;
    if (url.pathname === `/api/v1/carts/${id}/order-link`)
      return route.fulfill({
        json: {
          ok: true,
          data: {
            url: `http://localhost:3000/order-details/${order.orderId}#order-read=readonly-fixture`,
            expiresAt: status.expiresAt,
          },
          requestId: 'fixture',
        },
      });

    if (url.pathname === base)
      return route.fulfill({
        json: {
          ok: true,
          data: completed ? { ...status, state: 'completed', order } : status,
          requestId: 'fixture',
        },
      });
    if (url.pathname === `${base}/materials`)
      return route.fulfill({
        json: {
          ok: true,
          data: { payToken: 'ui-pay-only', cancelToken: 'ui-cancel-only' },
          requestId: 'fixture',
        },
      });
    if (url.pathname === `${base}/pay`) {
      completed = true;
      return route.fulfill({
        json: { ok: true, data: order, requestId: 'fixture' },
      });
    }
    return route.fulfill({
      status: 403,
      json: {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'fixture', retryable: false },
        requestId: 'fixture',
      },
    });
  });
  await page.goto(`/checkout/${id}?reviewId=${reviewId}`);
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toBeEnabled();
  expect(writes).toEqual([
    `/api/v1/webmcp/carts/${id}/purchases/${reviewId}/materials`,
  ]);
  expect(await page.content()).not.toContain('ui-pay-only');
  const toolResult = await page.evaluate(async () => {
    const tools = (
      window as unknown as {
        purchaseTestTools: Map<
          string,
          { execute: (input: unknown) => Promise<unknown> }
        >;
      }
    ).purchaseTestTools;
    return {
      names: [...tools.keys()],
      status: await tools.get('get_purchase_status')!.execute({}),
    };
  });
  expect(toolResult.names).toEqual(
    expect.arrayContaining(['get_purchase_status', 'wait_for_purchase']),
  );
  expect(toolResult.names.some((name) => /pay|submit|prepare/.test(name))).toBe(
    false,
  );
  expect(JSON.stringify(toolResult)).not.toContain('ui-pay-only');

  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  expect(page.url()).toContain(`reviewId=${reviewId}`);
  await page.getByRole('button', { name: '取得唯讀訂單詳情連結' }).click();
  await expect(
    page.getByRole('link', { name: '開啟唯讀訂單詳情' }),
  ).toHaveAttribute(
    'href',
    `http://localhost:3000/order-details/${order.orderId}#order-read=readonly-fixture`,
  );

  await page.reload();
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  expect(writes.filter((path) => path.endsWith('/pay'))).toHaveLength(1);
  expect(
    writes.some(
      (path) =>
        path.endsWith('/checkout-review') || path.endsWith('/purchases'),
    ),
  ).toBe(false);
});
test('lost payment response stays unknown across read and refresh, never automatically repeats', async ({
  page,
}) => {
  let payments = 0;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/pay')) {
      payments++;
      return route.abort('failed');
    }
    if (path.endsWith('/materials'))
      return route.fulfill({
        json: {
          ok: true,
          data: { payToken: 'ui-only', cancelToken: 'cancel-only' },
          requestId: 'fixture',
        },
      });
    return route.fulfill({
      json: { ok: true, data: status, requestId: 'fixture' },
    });
  });
  await page.goto(`/checkout/${id}?reviewId=${reviewId}`);
  await page.getByRole('button', { name: '確認購買', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText(
    '先前請求結果未知',
  );
  await expect(
    page.getByRole('button', { name: '明確重試原支付' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: '查詢原準備' }).click();
  await expect(
    page.getByRole('button', { name: '明確重試原支付' }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: '明確重試原支付' }),
  ).toBeEnabled();
  expect(payments).toBe(1);
});

test('readonly order link clears bearer fragment and exposes no cart or purchase controls', async ({
  page,
}) => {
  let exchanges = 0;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    expect(page.url()).not.toContain('#');
    if (path === '/api/v1/order-links/exchange') {
      exchanges++;
      expect(route.request().postDataJSON()).toEqual({
        orderId: order.orderId,
        orderReadToken: 'read-only-secret',
      });
    } else expect(path).toBe(`/api/v1/orders/${order.orderId}/read`);
    return route.fulfill({
      json: { ok: true, data: order, requestId: 'fixture' },
    });
  });
  await page.goto(
    `/order-details/${order.orderId}#order-read=read-only-secret`,
  );
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  expect(await page.content()).not.toContain('read-only-secret');
  await expect(
    page.getByRole('link', { name: '購物車', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '確認購買', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('order-id')).toHaveText(order.orderId);
  expect(exchanges).toBe(1);
});
