import { readFileSync } from 'node:fs';
import { discoveryInput } from '@store/contracts';
import { AppError } from '../shared/app-error.js';
import { Catalog } from './catalog.js';
import { database } from '../infrastructure/database/database.js';
export class CatalogService {
  readonly catalog: Catalog;
  readonly db: ReturnType<typeof database>;
  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
    this.catalog = new Catalog(
      readFileSync(
        process.env.CATALOG_PATH ??
          new URL('../../dist/catalog-data/products.json', import.meta.url),
        'utf8',
      ),
    );
    this.db = database(process.env.DATABASE_URL);
  }
  async stock() {
    return new Map(
      (await this.db.inventory.findMany()).map((r) => [
        r.productId,
        r.quantity - r.reservedQuantity,
      ]),
    );
  }
  async search(input: unknown) {
    return this.catalog.search(input, await this.stock());
  }
  async discover(input: unknown) {
    const parsed = discoveryInput.safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 400);
    const stock = await this.stock();
    return 'queries' in parsed.data
      ? this.catalog.searchGrouped(parsed.data, stock)
      : this.catalog.search(parsed.data, stock);
  }
  async searchGrouped(input: unknown) {
    return this.catalog.searchGrouped(input, await this.stock());
  }
  async get(id: string) {
    return this.catalog.get(id, await this.stock());
  }
  reviews(id: string, input: unknown) {
    return this.catalog.reviews(id, input);
  }
  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
