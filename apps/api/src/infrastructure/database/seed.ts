import { readFileSync } from 'node:fs';
import { database, seedInventory } from './database.js';
import { Catalog } from '../../catalog/catalog.js';
if (!process.env.DATABASE_URL || !process.env.CATALOG_PATH)
  throw new Error('DATABASE_URL and CATALOG_PATH required');
const db = database(process.env.DATABASE_URL);
try {
  await seedInventory(
    db,
    new Catalog(readFileSync(process.env.CATALOG_PATH, 'utf8')),
  );
  console.log('Inventory initialized');
} finally {
  await db.$disconnect();
}
