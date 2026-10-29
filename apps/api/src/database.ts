import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Catalog } from './catalog.js';
export function database(url: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
export async function seedInventory(db: PrismaClient, catalog: Catalog) {
  await db.$transaction(async (tx) => {
    if ((await tx.inventory.count()) !== 0)
      throw new Error('INVENTORY_NOT_EMPTY');
    await tx.inventory.createMany({ data: catalog.initialInventory() });
  });
}
