import { describe, it, expect } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
const url = process.env.TEST_DATABASE_URL;
(url ? describe : describe.skip)(
  'checkout migration cutover guard on isolated PostgreSQL',
  () => {
    it('refuses old transactions without removing data and migrates an empty flow preserving negative inventory', async () => {
      if (new URL(url!).pathname !== '/store_test')
        throw Error('store_test required');
      const client = new pg.Client({ connectionString: url });
      await client.connect();
      const root = 'apps/api/prisma/migrations';
      try {
        await client.query('BEGIN');
        await client.query('CREATE SCHEMA checkout_migration_test');
        await client.query('SET LOCAL search_path TO checkout_migration_test');
        const names = readdirSync(root)
          .filter((n) => n.startsWith('2026'))
          .sort();
        for (const name of names.filter(
          (n) => n !== '202610310001_checkout_lifecycle',
        ))
          await client.query(
            readFileSync(`${root}/${name}/migration.sql`, 'utf8'),
          );
        await client.query(
          'INSERT INTO "Inventory" ("productId",quantity) VALUES ($1,-1)',
          ['P008'],
        );
        await client.query(
          'INSERT INTO "Cart" (id,items,"createdAt","createScope","createRequestId","createPayloadHash","encryptedCartToken") VALUES ($1,$2,now(),$3,$4,$5,$6)',
          [randomUUID(), '[]', 'test', randomUUID(), 'hash', 'encrypted'],
        );
        const sql = readFileSync(
          `${root}/202610310001_checkout_lifecycle/migration.sql`,
          'utf8',
        );
        await client.query('SAVEPOINT before_guard');
        await expect(client.query(sql)).rejects.toThrow(
          'CHECKOUT_CUTOVER_REQUIRES_EMPTY_TRANSACTIONS',
        );
        await client.query('ROLLBACK TO SAVEPOINT before_guard');
        expect(
          (await client.query('SELECT count(*)::int AS n FROM "Cart"')).rows[0]
            .n,
        ).toBe(1);
        // Only this disposable schema is cleaned, inside an ultimately rolled back transaction.
        await client.query('DELETE FROM "Cart"');
        await client.query(sql);
        expect(
          (
            await client.query(
              'SELECT quantity,"reservedQuantity" FROM "Inventory"',
            )
          ).rows,
        ).toEqual([{ quantity: -1, reservedQuantity: 0 }]);
        await expect(
          client.query(
            'INSERT INTO "Inventory" ("productId",quantity,"reservedQuantity") VALUES ($1,0,1)',
            ['invalid'],
          ),
        ).rejects.toThrow();
      } finally {
        await client.query('ROLLBACK');
        await client.end();
      }
    });
  },
);
