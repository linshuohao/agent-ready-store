import { z } from 'zod';
export const serviceName = 'Agent-Ready Store';
export const pageInput = z
  .object({
    offset: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .default(0),
    limit: z.number().int().min(1).max(50).default(12),
    catalogRevision: z.string().max(128).optional(),
  })
  .strict();
export const categoryPageInput = pageInput
  .extend({ limit: z.number().int().min(1).max(100).default(50) })
  .refine(
    (value) => value.offset === 0 || value.catalogRevision !== undefined,
    {
      message: 'catalogRevision required for continuation',
    },
  );
export interface ProductCategory {
  value: string;
  label: string;
}
export const searchInput = pageInput
  .extend({
    q: z.string().max(200).default(''),
    category: z.string().max(200).optional(),
    brand: z.string().max(200).optional(),
    minPrice: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    maxPrice: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    purchasableOnly: z.boolean().default(false),
    sort: z.literal('recommendation').default('recommendation'),
  })
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
    { message: 'minPrice exceeds maxPrice' },
  );
const { catalogRevision: _singleRevision, ...targetFields } = searchInput.shape;
void _singleRevision;
export const searchTargetInput = z
  .object({
    ...targetFields,
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
    label: z.string().min(1).max(80).optional(),
    limit: z.number().int().min(1).max(10).default(4),
  })
  .strict()
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
  );
export const groupedSearchInput = z
  .object({
    queries: z.array(searchTargetInput).min(1).max(5),
    catalogRevision: z.string().min(1).max(128).optional(),
    searchRevision: z.string().min(1).max(128).optional(),
  })
  .strict()
  .refine((v) => new Set(v.queries.map((q) => q.id)).size === v.queries.length)
  .refine(
    (v) =>
      !v.queries.some((q) => q.offset > 0) ||
      (v.catalogRevision !== undefined && v.searchRevision !== undefined),
  );
export const discoveryInput = z.union([searchInput, groupedSearchInput]);
export type SearchTarget = z.output<typeof searchTargetInput>;
export type GroupedSearchInput = z.input<typeof groupedSearchInput>;
export type SearchGroup = { id: string; label: string; query: SearchTarget } & (
  | {
      status: 'ok' | 'empty';
      productIds: string[];
      total: number;
      nextOffset: number | null;
    }
  | { status: 'error'; code: string; retryable: boolean }
);
export interface GroupedSearchResult {
  kind: 'grouped';
  catalogRevision: string;
  searchRevision: string;
  groups: SearchGroup[];
  products: ProductSummary[];
}
export const productInput = z
  .object({ productId: z.string().min(1).max(64) })
  .strict();
export type SearchInput = z.input<typeof searchInput>;
export type AvailabilityReason =
  'SOLD_OUT' | 'INVENTORY_ANOMALY' | 'PRICE_PENDING' | 'INVENTORY_UNAVAILABLE';
export interface ProductSummary {
  id: string;
  name: string;
  brand: string;
  category: string;
  currency: 'TWD';
  price: string;
  imagePath: null;
  availability: {
    canPurchase: boolean;
    reasons: AvailabilityReason[];
    currentQuantity: number | null;
  };
}
export interface ProductDetail extends ProductSummary {
  description: string;
  specs: Record<string, string | number | boolean>;
  reviewOverview: { count: number };
}
export interface Review {
  reviewId: string;
  user: string;
  rating: number;
  content: string;
  createdAt: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  nextOffset: number | null;
  catalogRevision: string;
}
export interface ReviewPage extends Page<Review> {
  productId: string;
}
export type Result<T> =
  | { ok: true; data: T; requestId: string }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        retryable: boolean;
        issues?: CartIssue[];
        currentCartVersion?: number;
      };
      requestId: string;
    };

import {
  cartIdInput,
  cartTokenInput,
  cartItemInput,
  cartItemsInput,
  cartOperationInput,
} from './cart-input.js';
export * from './cart-input.js';
export const cartCreateInput = z
  .object({
    createRequestId: z.uuid(),
    cartToken: cartTokenInput,
    items: cartItemsInput,
  })
  .strict();
export const cartReplaceInput = z
  .object({
    expectedCartVersion: z.number().int().positive().max(2147483646),
    items: cartItemsInput,
  })
  .strict();
export const cartOperateInput = z
  .object({
    expectedCartVersion: cartReplaceInput.shape.expectedCartVersion,
    operation: cartOperationInput,
  })
  .strict();
export type CartOperation = z.infer<typeof cartOperationInput>;
export const cartOperationSchema = z.toJSONSchema(cartOperationInput, {
  io: 'input',
});
export type CartItem = z.infer<typeof cartItemInput>;
export type CartOrigin = 'HUMAN' | 'AGENT';
export interface PriceLine extends CartItem {
  name: string;
  unitPrice: string;
}
export interface Quote {
  currency: 'TWD';
  items: (PriceLine & { lineSubtotal: string })[];
  subtotal: string;
  thresholdDiscount: string;
  aiDiscount: string;
  shipping: string;
  total: string;
}
export interface CartIssue {
  productId: string;
  code: string;
}
export interface CartView {
  orderId: string | null;
  cartId: string;
  origin: CartOrigin;
  cartVersion: number;
  items: (CartItem & {
    name: string | null;
    unitPrice: string | null;
    availability: ProductSummary['availability'] | null;
  })[];
  quote: Quote | null;
  quoteHash: string | null;
  issues: CartIssue[];
  canCheckout: boolean;
  expiresAt: string;
}

const moneyOutput = z.string().regex(/^\d+\.\d{2}$/);
const availabilityOutput = z
  .object({
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
  })
  .strict();
const quoteOutput = z
  .object({
    currency: z.literal('TWD'),
    items: z
      .array(
        cartItemInput.extend({
          name: z.string(),
          unitPrice: moneyOutput,
          lineSubtotal: moneyOutput,
        }),
      )
      .max(100),
    subtotal: moneyOutput,
    thresholdDiscount: moneyOutput,
    aiDiscount: moneyOutput,
    shipping: moneyOutput,
    total: moneyOutput,
  })
  .strict();
export const cartViewOutput: z.ZodType<CartView> = z
  .object({
    orderId: z.uuid().nullable(),
    cartId: cartIdInput,
    origin: z.enum(['HUMAN', 'AGENT']),
    cartVersion: z.number().int().positive(),
    items: z
      .array(
        cartItemInput.extend({
          name: z.string().nullable(),
          unitPrice: moneyOutput.nullable(),
          availability: availabilityOutput.nullable(),
        }),
      )
      .max(100),
    quote: quoteOutput.nullable(),
    quoteHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    issues: z
      .array(z.object({ productId: z.string(), code: z.string() }).strict())
      .max(500),
    canCheckout: z.boolean(),
    expiresAt: z.iso.datetime(),
  })
  .strict();
export const cartResultOutput = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      data: cartViewOutput,
      requestId: z.string(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
          retryable: z.boolean(),
          issues: z
            .array(z.object({ productId: z.string(), code: z.string() }))
            .optional(),
          currentCartVersion: z.number().int().positive().optional(),
        })
        .strict(),
      requestId: z.string(),
    })
    .strict(),
]);

export const checkoutReviewInput = z.object({}).strict();
export const orderSubmitInput = z
  .object({ confirmation: z.string().min(1).max(4096) })
  .strict();
const purchaseLineOutput = cartItemInput
  .extend({
    name: z.string(),
    brand: z.string(),
    specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    unitPrice: moneyOutput,
    lineSubtotal: moneyOutput,
  })
  .strict();
export const purchaseSummaryOutput = z
  .object({
    cartId: cartIdInput,
    cartVersion: z.number().int().positive(),
    origin: z.enum(['HUMAN', 'AGENT']),
    items: z.array(purchaseLineOutput).min(1).max(100),
    quote: quoteOutput,
    pricingRuleVersion: z.literal('pricing-v1'),
  })
  .strict();
export type PurchaseSummary = z.infer<typeof purchaseSummaryOutput>;
export const orderOutput = z
  .object({
    orderId: z.uuid(),
    cartId: cartIdInput,
    createdAt: z.iso.datetime(),
    purchaseHash: z.string().regex(/^[a-f0-9]{64}$/),
    catalogRevision: z.string(),
    snapshot: purchaseSummaryOutput,
  })
  .strict();
export type OrderResult = z.infer<typeof orderOutput>;
export const checkoutReviewOutput = z.discriminatedUnion('state', [
  z
    .object({
      state: z.literal('ready'),
      summary: purchaseSummaryOutput,
      purchaseHash: z.string(),
      confirmation: z.string(),
      confirmationExpiresAt: z.iso.datetime(),
    })
    .strict(),
  z.object({ state: z.literal('blocked'), cart: cartViewOutput }).strict(),
  z.object({ state: z.literal('success'), order: orderOutput }).strict(),
]);
export type CheckoutReview = z.infer<typeof checkoutReviewOutput>;
export const checkoutErrorOutput = z
  .object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    issues: z
      .array(z.object({ productId: z.string(), code: z.string() }))
      .optional(),
    currentCartVersion: z.number().optional(),
  })
  .strict();
export const orderResultOutput = z.discriminatedUnion('ok', [
  z
    .object({ ok: z.literal(true), data: orderOutput, requestId: z.string() })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: checkoutErrorOutput,
      requestId: z.string(),
    })
    .strict(),
]);
export const checkoutResultOutput = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      data: checkoutReviewOutput,
      requestId: z.string(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: checkoutErrorOutput,
      requestId: z.string(),
    })
    .strict(),
]);

// Service adapters own source and capability issuance; callers cannot override them.
export const agentCreateInput = z
  .object({
    createRequestId: z.uuid(),
    items: cartItemsInput.refine((items) => items.length > 0, {
      message: 'Agent cart must not be empty',
    }),
  })
  .strict();
export const cartCapabilityInput = z
  .object({ cartId: cartIdInput, cartAccessToken: cartTokenInput })
  .strict();
export const agentUpdateInput = cartCapabilityInput
  .extend({
    expectedCartVersion: cartReplaceInput.shape.expectedCartVersion,
    items: cartItemsInput,
  })
  .strict();
export const handoffOutput = z
  .object({
    cart: cartViewOutput,
    handoff: z
      .object({
        url: z.url(),
        issuedAt: z.iso.datetime(),
        expiresAt: z.iso.datetime(),
      })
      .strict(),
    requiresHumanConfirmation: z.literal(true),
  })
  .strict();
export const exchangeResultOutput = cartResultOutput;

export const purchasePrepareInput = z
  .object({
    prepareRequestId: z.uuid(),
    expectedCartVersion: cartReplaceInput.shape.expectedCartVersion,
  })
  .strict();
export const purchasePayInput = z
  .object({ payToken: z.string().min(1).max(4096) })
  .strict();
export const purchaseCancelInput = z
  .object({ cancelToken: z.string().min(1).max(4096) })
  .strict();
export const purchaseStatusOutput = z
  .object({
    reviewId: z.uuid().nullable(),
    cartId: cartIdInput,
    channel: z.enum(['apps', 'webmcp']),
    state: z.enum([
      'pending',
      'stale',
      'expired',
      'cancelled',
      'blocked',
      'completed',
    ]),
    summary: purchaseSummaryOutput,
    expiresAt: z.iso.datetime(),
    order: orderOutput.nullable(),
  })
  .strict();
export type PurchaseStatus = z.infer<typeof purchaseStatusOutput>;
export const purchaseMaterialsOutput = z
  .object({ payToken: z.string(), cancelToken: z.string() })
  .strict();
export type PurchaseMaterials = z.infer<typeof purchaseMaterialsOutput>;
export const purchaseResultOutput = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      data: purchaseStatusOutput,
      requestId: z.string(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: checkoutErrorOutput,
      requestId: z.string(),
    })
    .strict(),
]);
export const purchaseMaterialsResultOutput = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      data: purchaseMaterialsOutput,
      requestId: z.string(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: checkoutErrorOutput,
      requestId: z.string(),
    })
    .strict(),
]);

// New lifecycle contracts are breaking; old exports only serve UI consumers pending Tasks 5–7.
export * from './lifecycle.js';

export const productSummaryOutput = z
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

const groupBase = {
  id: z.string(),
  label: z.string(),
  query: searchTargetInput,
};
export const groupedSearchOutput = z
  .object({
    kind: z.literal('grouped'),
    catalogRevision: z.string().min(1).max(128),
    searchRevision: z.string().min(1).max(128),
    products: z.array(productSummaryOutput).max(50),
    groups: z
      .array(
        z.discriminatedUnion('status', [
          z
            .object({
              ...groupBase,
              status: z.literal('ok'),
              productIds: z.array(z.string()).max(10),
              total: z.number().int().positive(),
              nextOffset: z.number().int().nonnegative().nullable(),
            })
            .strict(),
          z
            .object({
              ...groupBase,
              status: z.literal('empty'),
              productIds: z.array(z.string()).length(0),
              total: z.literal(0),
              nextOffset: z.null(),
            })
            .strict(),
          z
            .object({
              ...groupBase,
              status: z.literal('error'),
              code: z.string(),
              retryable: z.boolean(),
            })
            .strict(),
        ]),
      )
      .min(1)
      .max(5),
  })
  .strict()
  .refine((data) => {
    const ids = new Set(data.products.map((p) => p.id));
    const referenced = new Set(
      data.groups.flatMap((g) => (g.status === 'error' ? [] : g.productIds)),
    );
    return (
      ids.size === data.products.length &&
      ids.size === referenced.size &&
      [...referenced].every((id) => ids.has(id)) &&
      new Set(data.groups.map((g) => g.id)).size === data.groups.length &&
      data.groups.every(
        (g) =>
          g.id === g.query.id &&
          (g.status === 'error' ||
            new Set(g.productIds).size === g.productIds.length),
      )
    );
  });
