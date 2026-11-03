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
