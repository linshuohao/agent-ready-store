import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { database } from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
import { CatalogService } from '../../src/catalog/catalog.service.js';
const url = process.env.GROUPED_TEST_DATABASE_URL;
(url ? describe : describe.skip)(
  'grouped search real inventory projection',
  () => {
    it('reads changed available inventory without shopping writes and rolls back its fixture', async () => {
      if (new URL(url!).pathname !== '/store_test')
        throw Error('Isolated store_test required');
      const db = database(url!),
        catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
      const before = await db.inventory.findUnique({
        where: { productId: 'P001' },
      });
      const counts = [await db.cart.count(), await db.order.count()];
      const rollback = new Error('ROLLBACK_TEST_FIXTURE');
      try {
        await expect(
          db.$transaction(async (tx) => {
            await tx.inventory.upsert({
              where: { productId: 'P001' },
              create: { productId: 'P001', quantity: 10, reservedQuantity: 3 },
              update: { quantity: 10, reservedQuantity: 3 },
            });
            const service = Object.assign(
              Object.create(CatalogService.prototype),
              { catalog, db: tx },
            ) as CatalogService;
            const input = {
              queries: [
                { id: 'a', limit: 10 },
                { id: 'b', limit: 10 },
              ],
            };
            const first = await service.discover(input);
            expect(
              'products' in first &&
                first.products.find((p) => p.id === 'P001')?.availability
                  .currentQuantity,
            ).toBe(7);
            await tx.inventory.update({
              where: { productId: 'P001' },
              data: { quantity: 3 },
            });
            const second = await service.discover(input);
            expect(
              'products' in second &&
                second.products.find((p) => p.id === 'P001')?.availability,
            ).toMatchObject({ currentQuantity: 0, canPurchase: false });
            expect([await tx.cart.count(), await tx.order.count()]).toEqual(
              counts,
            );
            throw rollback;
          }),
        ).rejects.toBe(rollback);
        expect(
          await db.inventory.findUnique({ where: { productId: 'P001' } }),
        ).toEqual(before);
      } finally {
        await db.$disconnect();
      }
    });
  },
);
