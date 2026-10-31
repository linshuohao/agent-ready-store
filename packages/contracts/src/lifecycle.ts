import { z } from 'zod';
import { cartItemsInput, cartOperationInput } from './cart-input.js';
const id = z.uuid();
const version = z.number().int().positive().max(2147483646);
const productId = z.string().min(1).max(64);
const quantity = z.number().int().positive().max(2147483647);
const money = z.string().regex(/^(0|[1-9]\d{0,17})\.\d{2}$/);
const specs = z.record(
  z.string().min(1).max(128),
  z.union([z.string().max(1024), z.number().finite(), z.boolean()]),
);
export const shoppingChannel = z.enum(['WEB', 'MCP', 'WEBMCP', 'APPS']);
export type ShoppingChannel = z.infer<typeof shoppingChannel>;
export const getOrCreateCartInput = z.union([
  z.object({ cartId: id }).strict(),
  z.object({ requestId: id, initialItems: cartItemsInput }).strict(),
]);
export const persistentCartOperationInput = z
  .object({
    operationRequestId: id,
    expectedCartVersion: version,
    operation: cartOperationInput,
  })
  .strict();
export const selectedItemsInput = z
  .array(z.object({ productId, expectedQuantity: quantity }).strict())
  .min(1)
  .max(100)
  .refine(
    (items) => new Set(items.map((i) => i.productId)).size === items.length,
    'Duplicate product IDs',
  );
export const selectionConstraintsInput = z
  .object({
    currency: z.literal('TWD'),
    maxTotal: money.optional(),
    items: z
      .array(
        z
          .object({
            productId,
            maxUnitPrice: money.optional(),
            specs: specs.optional(),
          })
          .strict(),
      )
      .max(100)
      .refine(
        (items) => new Set(items.map((i) => i.productId)).size === items.length,
        'Duplicate constraints',
      )
      .optional(),
  })
  .strict();
export const quoteSelectionInput = z
  .object({
    selectedItems: selectedItemsInput,
    constraints: selectionConstraintsInput,
  })
  .strict()
  .refine(
    (input) =>
      input.constraints.items?.every((c) =>
        input.selectedItems.some((i) => i.productId === c.productId),
      ) ?? true,
    'Constraint outside selection',
  );
export const createOrderInput = z
  .object({
    requestId: id,
    expectedCartVersion: version,
    selectedItems: selectedItemsInput,
    constraints: selectionConstraintsInput,
  })
  .strict()
  .refine(
    (input) =>
      input.constraints.items?.every((c) =>
        input.selectedItems.some((i) => i.productId === c.productId),
      ) ?? true,
    'Constraint outside selection',
  );
export const listOrdersInput = z
  .object({
    offset: z.number().int().min(0).max(2147483647).default(0),
    limit: z.number().int().min(1).max(100).default(20),
    pendingOnly: z.boolean().default(false),
  })
  .strict();
export const orderTargetInput = z
  .object({ orderId: id, cartId: id.optional() })
  .strict();
export const orderSummaryOutput = z
  .object({
    currency: z.literal('TWD'),
    pricingRuleVersion: z.string(),
    items: z
      .array(
        z
          .object({
            productId,
            name: z.string(),
            brand: z.string(),
            specs,
            quantity,
            unitPrice: money,
            lineSubtotal: money,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    subtotal: money,
    thresholdDiscount: money,
    aiDiscount: money,
    shipping: money,
    total: money,
  })
  .strict();
// A stock shortage blocks creation without invalidating the current estimate.
export const selectionQuoteOutput = orderSummaryOutput.extend({
  issues: z
    .array(
      z
        .object({ productId, code: z.enum(['INSUFFICIENT_STOCK', 'SOLD_OUT']) })
        .strict(),
    )
    .optional(),
});
export type SelectionQuote = z.infer<typeof selectionQuoteOutput>;
export const orderViewOutput = z
  .object({
    orderId: id,
    cartId: id,
    sourceCartVersion: version,
    status: z.enum(['CHECKOUT', 'PAID']),
    effectiveStatus: z.enum(['CHECKOUT', 'PAID', 'CANCELLED', 'EXPIRED']),
    createdAt: z.iso.datetime(),
    reservationExpiresAt: z.iso.datetime(),
    paidAt: z.iso.datetime().nullable(),
    closedAt: z.iso.datetime().nullable(),
    closeReason: z.enum(['CANCELLED', 'EXPIRED']).nullable(),
    createdByChannel: shoppingChannel,
    aiEligible: z.boolean(),
    summary: orderSummaryOutput,
    allowedActions: z
      .object({ canPay: z.boolean(), canCancel: z.boolean() })
      .strict(),
    navigation: z
      .object({ orderUrl: z.string().url(), shareUrl: z.string().url() })
      .strict(),
  })
  .strict()
  .superRefine((o, ctx) => {
    const paid = o.status === 'PAID',
      closed = o.closedAt !== null;
    if (
      paid !== (o.paidAt !== null) ||
      (paid && closed) ||
      closed !== (o.closeReason !== null) ||
      paid !== (o.effectiveStatus === 'PAID') ||
      (o.effectiveStatus === 'CANCELLED' && !closed) ||
      o.aiEligible !== (o.createdByChannel !== 'WEB') ||
      (closed && o.effectiveStatus !== o.closeReason) ||
      (o.effectiveStatus !== 'CHECKOUT' &&
        (o.allowedActions.canPay || o.allowedActions.canCancel))
    )
      ctx.addIssue({ code: 'custom', message: 'Inconsistent order state' });
  });
export type OrderView = z.infer<typeof orderViewOutput>;
export type OrderSummary = z.infer<typeof orderSummaryOutput>;
export const shoppingCartViewOutput = z
  .object({
    cartId: id,
    cartVersion: z.number().int().positive(),
    agentCreated: z.boolean(),
    items: z
      .array(
        z
          .object({
            productId: z.string(),
            quantity: z.number().int().positive(),
            name: z.string().nullable(),
            unitPrice: money.nullable(),
            availability: z
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
              .strict()
              .nullable(),
          })
          .strict(),
      )
      .max(100),
    issues: z.array(
      z.object({ productId: z.string(), code: z.string() }).strict(),
    ),
    pendingOrders: z.array(orderViewOutput),
  })
  .strict()
  .refine(
    (cart) =>
      cart.pendingOrders.every(
        (o) => o.cartId === cart.cartId && o.effectiveStatus === 'CHECKOUT',
      ),
    'Invalid pending order association',
  );
export type ShoppingCartView = z.infer<typeof shoppingCartViewOutput>;
export const lifecycleErrorCode = z.enum([
  'VALIDATION_ERROR',
  'CART_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'CART_ITEM_NOT_FOUND',
  'CART_VERSION_CONFLICT',
  'REQUEST_CONFLICT',
  'CART_ITEMS_INVALID',
  'SELECTION_CHANGED',
  'BUDGET_EXCEEDED',
  'SPEC_MISMATCH',
  'PENDING_ORDER_LIMIT',
  'ORDER_CART_MISMATCH',
  'INVENTORY_INCONSISTENT',
  'AMOUNT_OUT_OF_RANGE',
  'TEMPORARY_UNAVAILABLE',
  'CHECKOUT_FLOW_REPLACED',
]);

export const lifecycleErrorOutput = z
  .object({
    code: lifecycleErrorCode,
    message: z.string(),
    retryable: z.boolean(),
    issues: z
      .array(z.object({ productId: z.string(), code: z.string() }).strict())
      .optional(),
    currentCartVersion: z.number().int().positive().optional(),
    pendingOrderIds: z.array(id).optional(),
    pendingOrders: z
      .array(z.object({ orderId: id, orderUrl: z.string().url() }).strict())
      .optional(),
  })
  .strict();
