import { z } from 'zod';
import {
  getOrCreateCartInput,
  shoppingCartViewOutput,
  orderViewOutput,
  searchInput,
  pageInput,
  cartIdInput,
} from '@store/contracts';
import type { Transport, Storage } from '@store/commerce-ui/transport';
export interface Bridge {
  call(name: string, args: Record<string, unknown>): Promise<unknown>;
  open(url: string): Promise<{ isError?: boolean }>;
}
const envelope = z.object({
  structuredContent: z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data: z.unknown() }),
    z.object({
      ok: z.literal(false),
      error: z.object({
        code: z.string(),
        issues: z
          .array(z.object({ productId: z.string(), code: z.string() }))
          .optional(),
      }),
    }),
  ]),
  isError: z.boolean().optional(),
});
const product = z
  .object({
    id: z.string(),
    name: z.string(),
    brand: z.string(),
    category: z.string(),
    currency: z.literal('TWD'),
    price: z.string().regex(/^\d+\.\d{2}$/),
    imagePath: z.null(),
    availability: z.object({
      canPurchase: z.boolean(),
      reasons: z.array(
        z.enum([
          'SOLD_OUT',
          'INVENTORY_ANOMALY',
          'PRICE_PENDING',
          'INVENTORY_UNAVAILABLE',
        ]),
      ),
      currentQuantity: z.number().int().nullable(),
    }),
  })
  .strict();
const detail = product.extend({
  description: z.string(),
  specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  reviewOverview: z.object({ count: z.number().int().nonnegative() }),
});
const catalog = z.object({
  items: z.array(product),
  total: z.number().int().nonnegative(),
  nextOffset: z.number().int().nullable(),
  catalogRevision: z.string(),
});
const reviews = z.object({
  productId: z.string(),
  items: z.array(
    z.object({
      reviewId: z.string(),
      user: z.string(),
      rating: z.number(),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
  total: z.number().int().nonnegative(),
  nextOffset: z.number().int().nullable(),
  catalogRevision: z.string(),
});
function query(params: URLSearchParams) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of params) {
    if (key in data) throw Error('VALIDATION_ERROR');
    data[key] = ['offset', 'limit', 'minPrice', 'maxPrice'].includes(key)
      ? Number(value)
      : ['purchasableOnly', 'pendingOnly'].includes(key)
        ? value === 'true'
          ? true
          : value === 'false'
            ? false
            : value
        : value;
  }
  return data;
}
/** Protocol translation only: all shopping state and interactions live in commerce-ui. */
export function bridgeTransport(bridge: Bridge): Transport {
  return async (path, body) => {
    if (!path.startsWith('/api/v1/')) throw Error('INVALID_PATH');
    const url = new URL(path, 'http://adapter.invalid'),
      parts = url.pathname.split('/').slice(3).map(decodeURIComponent);
    const args =
      body === undefined ? {} : z.record(z.string(), z.unknown()).parse(body);
    let name: string, input: Record<string, unknown>;
    let output: z.ZodType | undefined;
    if (parts[0] === 'products') {
      if (body !== undefined) throw Error('INVALID_METHOD');
      if (parts.length === 1) {
        name = 'search_products';
        input = searchInput.parse(query(url.searchParams));
        output = catalog;
      } else if (parts.length === 2) {
        name = 'get_product';
        input = { productId: parts[1] };
        output = detail.refine((p) => p.id === parts[1]);
      } else if (parts.length === 3 && parts[2] === 'reviews') {
        name = 'list_product_reviews';
        input = {
          productId: parts[1],
          ...pageInput.parse(query(url.searchParams)),
        };
        output = reviews.refine((p) => p.productId === parts[1]);
      } else throw Error('INVALID_PATH');
    } else if (parts[0] === 'shopping' && parts[1] === 'carts') {
      const cartId = parts[2];
      if (parts.length === 2 && body !== undefined) {
        name = 'apps_get_or_create_cart';
        input = args;
      } else if (parts.length === 3 && body === undefined) {
        name = 'get_cart';
        input = { cartId };
      } else if (
        parts.length === 4 &&
        parts[3] === 'operations' &&
        body !== undefined
      ) {
        const operation = z
          .object({
            type: z.enum(['add_item', 'set_quantity', 'remove_item']),
            productId: z.string(),
            quantity: z.number().optional(),
          })
          .parse(args.operation);
        name =
          operation.type === 'add_item'
            ? 'add_cart_item'
            : operation.type === 'set_quantity'
              ? 'update_cart_item'
              : 'remove_cart_item';
        input = {
          cartId,
          operationRequestId: args.operationRequestId,
          expectedCartVersion: args.expectedCartVersion,
          productId: operation.productId,
          ...(operation.type === 'remove_item'
            ? {}
            : { quantity: operation.quantity }),
        };
      } else if (
        parts.length === 4 &&
        parts[3] === 'quote' &&
        body !== undefined
      ) {
        name = 'quote_selection';
        input = { cartId, ...args };
      } else if (parts.length === 4 && parts[3] === 'orders') {
        if (body !== undefined) {
          name = 'apps_create_order';
          input = { cartId, ...args };
        } else {
          name = 'list_orders';
          input = { cartId, ...query(url.searchParams) };
        }
      } else throw Error('INVALID_PATH');
    } else if (parts[0] === 'shopping' && parts[1] === 'orders') {
      if (parts.length === 3 && body === undefined) {
        name = 'get_order';
        input = { orderId: parts[2] };
      } else if (
        parts.length === 4 &&
        body !== undefined &&
        ['pay', 'cancel'].includes(parts[3])
      ) {
        name = parts[3] === 'pay' ? 'apps_pay_order' : 'cancel_order';
        input = { orderId: parts[2] };
      } else throw Error('INVALID_PATH');
    } else throw Error('INVALID_PATH');
    const result = envelope.parse(await bridge.call(name, input));
    if (result.isError && result.structuredContent.ok)
      throw Error('INVALID_RESULT');
    const content = result.structuredContent;
    if (content.ok && output) output.parse(content.data);
    return Response.json(
      { ...content, requestId: 'bridge' },
      {
        status: content.ok
          ? 200
          : ['UNKNOWN', 'TEMPORARY_UNAVAILABLE', 'INTERNAL_ERROR'].includes(
                content.error.code,
              )
            ? 503
            : 400,
      },
    );
  };
}
export function validateShare(
  url: string,
  origin: string,
  expectedOrderId?: string,
) {
  const u = new URL(url);
  if (
    u.origin !== origin ||
    u.username ||
    u.password ||
    u.hash ||
    !/^\/orders\/[0-9a-f-]{36}$/i.test(u.pathname) ||
    u.search !== '?view=share' ||
    (expectedOrderId !== undefined &&
      u.pathname !== `/orders/${expectedOrderId}`)
  )
    throw Error('UNSAFE_LINK');
  return u.href;
}
/** Validated tool delivery only selects a shared route; it never writes or pays. */
export function toolRoute(name: string, input: unknown, raw: unknown): string {
  const args = z.record(z.string(), z.unknown()).parse(input ?? {});
  const result = envelope.parse(raw);
  if (!result.structuredContent.ok || result.isError)
    throw Error('TOOL_FAILED');
  const data = result.structuredContent.data;
  if (name === 'search_products') {
    catalog.parse(data);
    searchInput.parse(args);
    return (
      '/?' +
      new URLSearchParams(
        Object.entries(args).map(([k, v]) => [k, String(v)]),
      ).toString()
    );
  }
  if (name === 'get_product') {
    const p = detail.parse(data);
    if (args.productId !== undefined && p.id !== args.productId)
      throw Error('WRONG_ENTITY');
    return '/products/' + encodeURIComponent(p.id);
  }
  if (['create_order', 'apps_create_order'].includes(name)) {
    const r = z
      .object({ order: orderViewOutput, cart: shoppingCartViewOutput })
      .parse(data);
    if (
      (args.cartId !== undefined && r.cart.cartId !== args.cartId) ||
      r.order.cartId !== r.cart.cartId
    )
      throw Error('WRONG_ENTITY');
    return '/orders/' + r.order.orderId;
  }
  if (['get_order', 'cancel_order'].includes(name)) {
    const order = orderViewOutput.parse(data);
    if (
      (args.orderId !== undefined && order.orderId !== args.orderId) ||
      (args.cartId && args.cartId !== order.cartId)
    )
      throw Error('WRONG_ENTITY');
    return '/orders/' + order.orderId;
  }
  if (name === 'list_orders') {
    const id = cartIdInput.parse(args.cartId);
    z.object({
      items: z.array(orderViewOutput.refine((o) => o.cartId === id)),
      nextOffset: z.number().int().nullable(),
    }).parse(data);
    return '/orders?cartId=' + id;
  }
  if (
    [
      'get_cart',
      'get_or_create_cart',
      'apps_get_or_create_cart',
      'add_cart_item',
      'update_cart_item',
      'remove_cart_item',
    ].includes(name)
  ) {
    const cart = shoppingCartViewOutput.parse(data);
    if (args.cartId && args.cartId !== cart.cartId) throw Error('WRONG_ENTITY');
    return '/cart/' + cart.cartId;
  }
  throw Error('INVALID_TOOL');
}
/** Preserve pre-refactor recovery materials; never silently replace an unknown write. */
export function migrateRecovery(
  storage: Storage,
  route: string,
  originalTarget?: string,
) {
  const current = storage.getItem('store.apps.currentCartId');
  if (current && !storage.getItem('store.currentCartId'))
    storage.setItem('store.currentCartId', cartIdInput.parse(current));
  const target = originalTarget ?? route.split('?')[0].split('/')[2];
  if (!target) return;
  const raw = storage.getItem('store.apps.pending.' + target);
  if (!raw) return;
  const p = z
    .object({
      name: z.string(),
      args: z.record(z.string(), z.unknown()),
      target: z.string(),
    })
    .parse(JSON.parse(raw));
  if (p.target !== target) throw Error('LOCAL_RECOVERY_INVALID');
  const a = p.args;
  let key: string, value: unknown;
  if (p.name === 'apps_get_or_create_cart') {
    const input = getOrCreateCartInput.parse(a);
    if ('cartId' in input) throw Error('LOCAL_RECOVERY_INVALID');
    key = 'store.cart.initialize';
    value = { kind: 'initialize', input };
  } else if (['apps_pay_order', 'cancel_order'].includes(p.name)) {
    if (a.orderId !== target) throw Error('LOCAL_RECOVERY_INVALID');
    key = 'store.order.pending.' + target;
    value = {
      orderId: target,
      action: p.name === 'apps_pay_order' ? 'pay' : 'cancel',
    };
  } else if (p.name === 'apps_create_order') {
    if (a.cartId !== target) throw Error('LOCAL_RECOVERY_INVALID');
    const input = { ...a };
    delete input.cartId;
    key = 'store.order.create.' + target;
    value = { input };
  } else if (
    ['add_cart_item', 'update_cart_item', 'remove_cart_item'].includes(p.name)
  ) {
    if (a.cartId !== target) throw Error('LOCAL_RECOVERY_INVALID');
    key = 'store.cart.pending.' + target;
    value = {
      kind: 'operate',
      cartId: target,
      input: {
        operationRequestId: a.operationRequestId,
        expectedCartVersion: a.expectedCartVersion,
        operation: {
          type:
            p.name === 'add_cart_item'
              ? 'add_item'
              : p.name === 'update_cart_item'
                ? 'set_quantity'
                : 'remove_item',
          productId: a.productId,
          ...(p.name === 'remove_cart_item' ? {} : { quantity: a.quantity }),
        },
      },
    };
  } else throw Error('LOCAL_RECOVERY_INVALID');
  if (storage.getItem(key) && storage.getItem(key) !== JSON.stringify(value))
    throw Error('LOCAL_RECOVERY_INVALID');
  storage.setItem(key, JSON.stringify(value));
  storage.removeItem('store.apps.pending.' + target);
}

export function toolDeliveryContext(
  name: string,
  input: unknown,
  raw: unknown,
  storage: Storage,
  callId?: string | number,
) {
  let route = toolRoute(name, input, raw);
  const args = z.record(z.string(), z.unknown()).parse(input ?? {});
  const target = ['search_products', 'get_product'].includes(name)
    ? `catalog:${name}:${JSON.stringify(input ?? (name === 'get_product' ? { productId: route.split('/')[2] } : {}))}`
    : String(args.cartId ?? args.orderId ?? route.split('/')[2]);
  migrateRecovery(storage, route, target);
  const prefix =
    callId === undefined
      ? null
      : `${name}.${typeof callId}:${callId}.${target}`;
  const key = prefix ? 'store.apps.route.' + prefix : null;
  if (prefix) {
    const saved = storage.getItem(key!);
    const created = storage.getItem('store.apps.created.' + prefix);
    const cart = storage.getItem('store.apps.cart.' + prefix);
    if (saved) {
      validateRoute(saved);
      route = saved;
    } else if (created) route = '/orders/' + cartIdInput.parse(created);
    else if (cart) route = '/cart/' + cartIdInput.parse(cart);
  }
  migrateRecovery(storage, route);
  return { route, key };
}
function validateRoute(route: string) {
  const u = new URL(route, 'http://adapter.invalid');
  if (
    u.origin !== 'http://adapter.invalid' ||
    !route.startsWith('/') ||
    route.startsWith('//') ||
    u.hash ||
    u.username ||
    u.password
  )
    throw Error('INVALID_ROUTE');
  const parts = u.pathname.split('/');
  if (u.pathname === '/') return;
  if (parts[1] === 'products' && parts.length === 3 && parts[2]) return;
  if (
    parts[1] === 'cart' &&
    (parts.length === 2 ||
      (parts.length === 3 && cartIdInput.safeParse(parts[2]).success))
  )
    return;
  if (
    parts[1] === 'orders' &&
    (parts.length === 2 ||
      (parts.length === 3 && cartIdInput.safeParse(parts[2]).success))
  )
    return;
  throw Error('INVALID_ROUTE');
}
