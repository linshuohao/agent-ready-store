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

export const cartIdInput = z.uuid();
export const cartTokenInput = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const cartItemInput = z
  .object({
    productId: z.string().min(1).max(64),
    quantity: z.number().int().positive().max(2147483647),
  })
  .strict();
export const cartItemsInput = z
  .array(cartItemInput)
  .max(100)
  .refine(
    (items) =>
      new Set(items.map((item) => item.productId)).size === items.length,
    { message: 'Duplicate product IDs' },
  );
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
