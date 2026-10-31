import { createHash } from 'node:crypto';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { parse } from 'lossless-json';
import {
  searchInput,
  categoryPageInput,
  type ProductCategory,
  groupedSearchInput,
  type GroupedSearchResult,
  pageInput,
  productInput,
  type ProductSummary,
  type ProductDetail,
  type AvailabilityReason,
  type Page,
  type ReviewPage,
} from '@store/contracts';
import { AppError } from '../shared/app-error.js';
const rawProduct = z.object({
  id: z.string().min(1),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  price: z
    .string()
    .regex(/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i)
    .refine((v) => {
      const amount = new Decimal(v);
      return (
        amount.isFinite() &&
        amount.gte(0) &&
        amount.lte(Number.MAX_SAFE_INTEGER) &&
        amount.decimalPlaces() <= 2
      );
    })
    .transform((v) => new Decimal(v).toFixed(2)),
  stock: z.number().int().min(-2147483648).max(2147483647),
  recommendation_score: z.number(),
  margin_rate: z.number(),
  description: z.string(),
  specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  reviews: z.array(
    z.object({
      user: z.string(),
      rating: z.number(),
      content: z.string(),
      created_at: z.string(),
    }),
  ),
});
const rawCatalog = z.object({
  currency: z.literal('TWD'),
  products: z.array(rawProduct).min(1),
});
import {
  searchRevision,
  searchTerms,
  matchesSearch,
} from './search-matching.js';
export class Catalog {
  readonly revision: string;
  readonly catalogRevision: string;
  private readonly products: z.infer<typeof rawProduct>[];
  constructor(raw: string) {
    // Preserve monetary literals before binary-number conversion; other S1 facts retain their existing types.
    const decoded = JSON.parse(raw);
    const exact = parse(raw) as {
      products?: { price?: { toString(): string } }[];
    };
    if (Array.isArray(decoded?.products) && Array.isArray(exact?.products)) {
      decoded.products = decoded.products.map(
        (p: { price?: unknown }, i: number) => ({
          ...p,
          price:
            typeof p.price === 'number'
              ? exact.products![i]?.price?.toString()
              : undefined,
        }),
      );
    }
    const source = rawCatalog.parse(decoded);
    this.products = source.products;
    if (new Set(this.products.map((p) => p.id)).size !== this.products.length)
      throw new Error('Duplicate product ID');
    this.catalogRevision = createHash('sha256').update(raw).digest('hex');
    this.revision = createHash('sha256')
      .update(this.catalogRevision + searchRevision)
      .digest('hex');
  }
  categories(input: unknown): Page<ProductCategory> {
    const parsed = categoryPageInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const { offset, limit, catalogRevision } = parsed.data;
    this.checkRevision(catalogRevision);
    const values = [
      ...new Set(
        this.products.map((p) => p.category).filter((v) => v.trim().length > 0),
      ),
    ].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return {
      items: values
        .slice(offset, offset + limit)
        .map((value) => ({ value, label: value })),
      total: values.length,
      nextOffset: offset + limit < values.length ? offset + limit : null,
      catalogRevision: this.revision,
    };
  }
  initialInventory() {
    return this.products.map((p) => ({ productId: p.id, quantity: p.stock }));
  }
  private checkRevision(revision?: string) {
    if (revision !== undefined && revision !== this.revision)
      throw new AppError('CATALOG_CHANGED', 409);
  }
  private product(id: string) {
    if (!productInput.safeParse({ productId: id }).success)
      throw new AppError('VALIDATION_ERROR', 400);
    const p = this.products.find((p) => p.id === id);
    if (!p) throw new AppError('NOT_FOUND', 404);
    return p;
  }
  private summary(
    p: z.infer<typeof rawProduct>,
    stock: ReadonlyMap<string, number>,
  ): ProductSummary {
    const quantity = stock.get(p.id) ?? null;
    const reasons: AvailabilityReason[] = [];
    if (quantity === null) reasons.push('INVENTORY_UNAVAILABLE');
    else if (quantity < 0) reasons.push('INVENTORY_ANOMALY');
    else if (quantity === 0) reasons.push('SOLD_OUT');
    if (p.price === '0.00') reasons.push('PRICE_PENDING');
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      currency: 'TWD',
      price: p.price,
      imagePath: null,
      availability: {
        currentQuantity: quantity,
        reasons,
        canPurchase: reasons.length === 0,
      },
    };
  }
  search(
    input: unknown,
    stock: ReadonlyMap<string, number>,
  ): Page<ProductSummary> {
    const parsed = searchInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const q = parsed.data;
    this.checkRevision(q.catalogRevision);
    const words = searchTerms(q.q);
    const selected = this.products
      .filter(
        (p) =>
          matchesSearch([p.name, p.brand, p.category, p.description], words) &&
          (q.category === undefined || p.category === q.category) &&
          (q.brand === undefined || p.brand === q.brand) &&
          (q.minPrice === undefined || new Decimal(p.price).gte(q.minPrice)) &&
          (q.maxPrice === undefined || new Decimal(p.price).lte(q.maxPrice)) &&
          (!q.purchasableOnly ||
            this.summary(p, stock).availability.canPurchase),
      )
      .sort(
        (a, b) =>
          b.recommendation_score - a.recommendation_score ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
    return {
      items: selected
        .slice(q.offset, q.offset + q.limit)
        .map((p) => this.summary(p, stock)),
      total: selected.length,
      nextOffset:
        q.offset + q.limit < selected.length ? q.offset + q.limit : null,
      catalogRevision: this.revision,
    };
  }
  searchGrouped(
    input: unknown,
    stock: ReadonlyMap<string, number>,
  ): GroupedSearchResult {
    const parsed = groupedSearchInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const q = parsed.data;
    if (
      (q.catalogRevision !== undefined &&
        q.catalogRevision !== this.catalogRevision) ||
      (q.searchRevision !== undefined && q.searchRevision !== searchRevision)
    )
      throw new AppError('CATALOG_CHANGED', 409);
    const products = new Map<string, ProductSummary>();
    const groups: GroupedSearchResult['groups'] = q.queries.map((query) => {
      const { id, label, ...conditions } = query;
      const page = this.search(conditions, stock);
      for (const product of page.items)
        if (!products.has(product.id)) products.set(product.id, product);
      return {
        id,
        label: label ?? (query.q.trim() || '全部商品'),
        query,
        status: page.total === 0 ? 'empty' : 'ok',
        productIds: page.items.map((p) => p.id),
        total: page.total,
        nextOffset: page.nextOffset,
      };
    });
    return {
      kind: 'grouped',
      catalogRevision: this.catalogRevision,
      searchRevision,
      groups,
      products: [...products.values()],
    };
  }
  get(id: string, stock: ReadonlyMap<string, number>): ProductDetail {
    const p = this.product(id);
    return {
      ...this.summary(p, stock),
      description: p.description,
      specs: { ...p.specs },
      reviewOverview: { count: p.reviews.length },
    };
  }
  reviews(id: string, input: unknown): ReviewPage {
    const parsed = pageInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const q = parsed.data;
    this.checkRevision(q.catalogRevision);
    const p = this.product(id);
    return {
      productId: id,
      items: p.reviews.slice(q.offset, q.offset + q.limit).map((r, i) => ({
        reviewId: `${id}:${q.offset + i}`,
        user: r.user,
        rating: r.rating,
        content: r.content,
        createdAt: r.created_at,
      })),
      total: p.reviews.length,
      nextOffset:
        q.offset + q.limit < p.reviews.length ? q.offset + q.limit : null,
      catalogRevision: this.revision,
    };
  }
}
