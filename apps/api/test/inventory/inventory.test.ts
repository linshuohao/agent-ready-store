import { describe, it, expect, afterAll, beforeEach, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  database,
  seedInventory,
} from '../../src/infrastructure/database/database.js';
import { Catalog } from '../../src/catalog/catalog.js';
// Only the isolated Compose db-test can be used by this destructive integration suite.
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite('real PostgreSQL inventory initialization', () => {
  let db: ReturnType<typeof database>;
  beforeAll(() => {
    if (!url || new URL(url).pathname !== '/store_test')
      throw new Error('Isolated store_test database required');
    db = database(url);
  });
  const catalog = new Catalog(readFileSync('references/products.json', 'utf8'));
  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_seed ON "Inventory"',
    );
    await db.inventory.deleteMany();
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS fail_seed ON "Inventory"',
    );
    await db.$executeRawUnsafe('DROP FUNCTION IF EXISTS reject_seed()');
    await db.$disconnect();
  });
  it('keeps original negative/zero quantities and refuses to overwrite or repair an existing inventory', async () => {
    await seedInventory(db, catalog);
    expect(await db.inventory.count()).toBe(30);
    expect(
      (await db.inventory.findUniqueOrThrow({ where: { productId: 'P008' } }))
        .quantity,
    ).toBe(-1);
    await db.inventory.update({
      where: { productId: 'P001' },
      data: { quantity: 7 },
    });
    await db.inventory.delete({ where: { productId: 'P002' } });
    await expect(seedInventory(db, catalog)).rejects.toThrow(
      'INVENTORY_NOT_EMPTY',
    );
    expect(
      (await db.inventory.findUniqueOrThrow({ where: { productId: 'P001' } }))
        .quantity,
    ).toBe(7);
    expect(
      await db.inventory.findUnique({ where: { productId: 'P002' } }),
    ).toBeNull();
    const second = database(url!);
    expect(
      (
        await second.inventory.findUniqueOrThrow({
          where: { productId: 'P001' },
        })
      ).quantity,
    ).toBe(7);
    await second.$disconnect();
  });
  it('rolls back all inserted rows on a real database failure, then allows an empty-database retry', async () => {
    await db.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION reject_seed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."productId"='P010' THEN RAISE EXCEPTION 'seed failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER fail_seed BEFORE INSERT ON "Inventory" FOR EACH ROW EXECUTE FUNCTION reject_seed()',
    );
    await expect(seedInventory(db, catalog)).rejects.toThrow();
    expect(await db.inventory.count()).toBe(0);
    await db.$executeRawUnsafe('DROP TRIGGER fail_seed ON "Inventory"');
    await seedInventory(db, catalog);
    expect(await db.inventory.count()).toBe(30);
  });
  it('allows exactly one complete initialization when two seed commands race', async () => {
    const results = await Promise.allSettled([
      seedInventory(db, catalog),
      seedInventory(db, catalog),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.inventory.count()).toBe(30);
  });
});
