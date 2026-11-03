import 'reflect-metadata';
import { afterEach, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CatalogController } from '../../src/catalog/catalog.controller.js';
import { CatalogService } from '../../src/catalog/catalog.service.js';
import { CartController } from '../../src/cart/cart.controller.js';
import { CartService } from '../../src/cart/cart.service.js';
import { AppError } from '../../src/shared/app-error.js';

let app: INestApplication | undefined;
afterEach(async () => {
  await app?.close();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it('keeps HTTP status, result envelopes and no-store across both controllers', async () => {
  vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const module = await Test.createTestingModule({
    controllers: [CatalogController, CartController],
    providers: [
      {
        provide: CatalogService,
        useValue: {
          search: () => ({ items: [], total: 0 }),
          searchGrouped: () => ({ kind: 'grouped', groups: [] }),
          categories: () => {
            throw new Error('secret-password');
          },
          get: () => {
            throw new AppError('NOT_FOUND', 404);
          },
        },
      },
      {
        provide: CartService,
        useValue: {
          add: () => ({ cartId: 'created' }),
          get: () => {
            throw new AppError('CART_CONFLICT', 409, { currentCartVersion: 2 });
          },
        },
      },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  for (const [path, method, status, expected] of [
    ['/products', 'GET', 200, { ok: true, data: { items: [], total: 0 } }],
    [
      '/products/search',
      'POST',
      200,
      { ok: true, data: { kind: 'grouped', groups: [] } },
    ],
    [
      '/shopping/carts/add',
      'POST',
      200,
      { ok: true, data: { cartId: 'created' } },
    ],
    ['/products/P001', 'GET', 404, { ok: false, error: { code: 'NOT_FOUND' } }],
    [
      '/shopping/carts/example',
      'GET',
      409,
      { ok: false, error: { code: 'CART_CONFLICT', currentCartVersion: 2 } },
    ],
    [
      '/catalog/categories',
      'GET',
      503,
      { ok: false, error: { code: 'TEMPORARY_UNAVAILABLE', retryable: true } },
    ],
    [
      '/carts',
      'POST',
      410,
      { ok: false, error: { code: 'CHECKOUT_FLOW_REPLACED' } },
    ],
  ] as const) {
    const response = await fetch(`${base}/api/v1${path}`, {
      method,
      ...(method === 'POST'
        ? {
            headers: {
              origin: 'http://localhost:3000',
              'content-type': 'application/json',
            },
            body: '{}',
          }
        : {}),
    });
    expect(response.status, path).toBe(status);
    expect(response.headers.get('cache-control'), path).toBe('no-store');
    const body = await response.json();
    expect(body).toMatchObject({ ...expected, requestId: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain('secret-password');
  }
  const denied = await fetch(`${base}/api/v1/shopping/carts/add`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://evil.example',
    },
    body: '{}',
  });
  expect(denied.status).toBe(403);
  expect(await denied.json()).toMatchObject({
    ok: false,
    error: { code: 'FORBIDDEN' },
  });
  expect(log).toHaveBeenCalledTimes(1);
});

it('applies route admission before services and preserves guard error precedence and pipe transforms', async () => {
  vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
  const carts = {
    add: vi.fn(() => ({})),
    listOrders: vi.fn((_id, query) => query),
    payOrder: vi.fn(() => ({})),
  };
  const catalog = { searchGrouped: vi.fn(() => ({})), get: vi.fn(() => ({})) };
  const module = await Test.createTestingModule({
    controllers: [CatalogController, CartController],
    providers: [
      { provide: CartService, useValue: carts },
      { provide: CatalogService, useValue: catalog },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  for (const [path, method, headers, body, status] of [
    [
      '/shopping/carts/add?extra=1',
      'POST',
      { origin: 'https://evil.invalid' },
      '{}',
      400,
    ],
    [
      '/products/search?extra=1',
      'POST',
      { origin: 'https://evil.invalid' },
      '{}',
      403,
    ],
    [
      '/products/search?extra=1',
      'POST',
      { origin: 'http://localhost:3000' },
      '{}',
      400,
    ],
    [
      '/shopping/carts/add',
      'POST',
      { origin: 'http://localhost:3000', 'x-cart-token': 'old' },
      '{}',
      400,
    ],
    [
      '/shopping/carts/add',
      'POST',
      { origin: 'http://localhost:3000', 'content-type': 'text/plain' },
      '{}',
      403,
    ],
    ['/shopping/carts/id/orders?offset=no', 'GET', {}, undefined, 400],
    [
      '/shopping/orders/id/pay',
      'POST',
      { origin: 'http://localhost:3000' },
      '{"cartId":"bad"}',
      400,
    ],
    ['/products/P001?productId=P002', 'GET', {}, undefined, 400],
    [
      '/carts?extra=1',
      'POST',
      { origin: 'https://evil.invalid', 'x-cart-token': 'old' },
      '{}',
      410,
    ],
  ] as const) {
    const response = await fetch(`${base}/api/v1${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });
    expect(response.status, path).toBe(status);
    expect(response.headers.get('cache-control'), path).toBe('no-store');
    expect(await response.json()).toMatchObject({
      ok: false,
      requestId: expect.any(String),
    });
  }
  expect(carts.add).not.toHaveBeenCalled();
  expect(carts.listOrders).not.toHaveBeenCalled();
  expect(carts.payOrder).not.toHaveBeenCalled();
  expect(catalog.searchGrouped).not.toHaveBeenCalled();
  expect(catalog.get).not.toHaveBeenCalled();
  const response = await fetch(
    `${base}/api/v1/shopping/carts/id/orders?offset=2&limit=3&pendingOnly=false`,
  );
  expect(response.status).toBe(200);
  expect(carts.listOrders).toHaveBeenCalledWith('id', {
    offset: 2,
    limit: 3,
    pendingOnly: false,
  });
});
