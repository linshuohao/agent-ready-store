import { readFileSync } from 'node:fs';
import { Catalog } from './catalog.js';
import { database } from '../infrastructure/database/database.js';
export class CatalogService {
  readonly catalog: Catalog;
  readonly db: ReturnType<typeof database>;
  constructor() {
    if (!process.env.DATABASE_URL || !process.env.CATALOG_PATH)
      throw new Error('DATABASE_URL and CATALOG_PATH required');
    this.catalog = new Catalog(readFileSync(process.env.CATALOG_PATH, 'utf8'));
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
