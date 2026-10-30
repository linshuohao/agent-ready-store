import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import {
  cleanupLegacy,
  inspect,
  buildPlan,
  validateSeed,
  parseOptions,
} from './checkout-cutover.mjs';

const databaseUrl = process.env.TEST_DATABASE_URL;
test(
  'controlled cutover SQL in disposable store_test schemas, preserving current public lifecycle data',
  { skip: !databaseUrl },
  async (t) => {
    parseOptions(['--database', 'store_test'], {
      CUTOVER_DATABASE_URL: databaseUrl,
    });
    const requireApi = createRequire(
      new URL('../apps/api/package.json', import.meta.url),
    );
    const pg = requireApi('pg');
    const { Catalog } = await import('../apps/api/dist/catalog/catalog.js');
    const seed = validateSeed(
      new Catalog(
        await readFile(
          new URL('../references/products.json', import.meta.url),
          'utf8',
        ),
      ).initialInventory(),
    );
    const client = new pg.Client({
      connectionString: databaseUrl,
      application_name: 'checkout-cutover-schema-test',
    });
    await client.connect();
    const publicSnapshot = async () =>
      (
        await client.query(
          `SELECT (SELECT count(*)::int FROM public."Cart") AS carts,(SELECT count(*)::int FROM public."Order") AS orders,(SELECT count(*)::int FROM public."CartOperation") AS operations,(SELECT count(*)::int FROM public."OrderLine") AS lines,(SELECT md5(jsonb_agg(to_jsonb(i) ORDER BY "productId")::text) FROM public."Inventory" i) AS inventory`,
        )
      ).rows[0];
    const beforePublic = await publicSnapshot();
    const root = new URL('../apps/api/prisma/migrations/', import.meta.url);
    const migrationName = '202610310001_checkout_lifecycle';
    const migrations = (await readdir(root))
      .filter((name) => /^2026/.test(name))
      .sort();
    async function fixture(work) {
      const namespace = `checkout_cutover_test_${randomBytes(8).toString('hex')}`;
      await client.query(`CREATE SCHEMA "${namespace}"`);
      try {
        await client.query(`SET search_path TO "${namespace}"`);
        for (const name of migrations.filter((name) => name !== migrationName))
          await client.query(
            await readFile(new URL(`${name}/migration.sql`, root), 'utf8'),
          );
        for (const row of seed)
          await client.query(
            'INSERT INTO "Inventory" ("productId",quantity) VALUES ($1,$2)',
            [row.productId, row.quantity + 1],
          );
        const cartId = randomUUID();
        await client.query(
          'INSERT INTO "Cart" (id,items,"createdAt","createScope","createRequestId","createPayloadHash","encryptedCartToken") VALUES ($1,$2,now(),$3,$4,$5,$6)',
          [cartId, '[]', 'test', randomUUID(), 'hash', 'encrypted'],
        );
        await client.query(
          'INSERT INTO "Order" (id,"cartId","createdAt","cartVersion","purchaseHash","catalogRevision","pricingRuleVersion",origin,snapshot) VALUES ($1,$2,now(),1,$3,$4,$5,$6,$7)',
          [randomUUID(), cartId, 'hash', 'catalog', 'v1', 'AGENT', '{}'],
        );
        await client.query(
          'INSERT INTO "PurchaseReview" (id,"cartId","prepareScope","prepareRequestId","requestHash",channel,"actorScope","cartVersion","purchaseHash","checkoutEpoch",summary,"createdAt","expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,0,$9,now(),now()+interval \'1 hour\')',
          [
            randomUUID(),
            cartId,
            'prepare',
            randomUUID(),
            'hash',
            'apps',
            'actor',
            'purchase',
            '{}',
          ],
        );
        await client.query(
          'CREATE TABLE "OutsideSentinel" (marker text PRIMARY KEY)',
        );
        await client.query('INSERT INTO "OutsideSentinel" VALUES ($1)', [
          'preserve-me',
        ]);
        await work(namespace, cartId);
        assert.deepEqual(
          (await client.query('SELECT marker FROM "OutsideSentinel"')).rows,
          [{ marker: 'preserve-me' }],
        );
      } finally {
        await client.query('ROLLBACK');
        await client.query('SET search_path TO public');
        await client.query(`DROP SCHEMA "${namespace}" CASCADE`);
      }
    }
    try {
      await t.test(
        'injected inventory failure rolls back all old deletions, then reruns cleanly and preserves controlled negative stock',
        async () =>
          fixture(async (namespace) => {
            const before = await inspect(client, namespace);
            assert.equal(buildPlan(before, seed).blockers.length, 0);
            await client.query(
              `CREATE FUNCTION fail_inventory_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected inventory failure'; END $$`,
            );
            await client.query(
              'CREATE TRIGGER fail_inventory_update BEFORE UPDATE ON "Inventory" FOR EACH ROW EXECUTE FUNCTION fail_inventory_update()',
            );
            await assert.rejects(
              cleanupLegacy(client, seed, namespace),
              /injected inventory failure/,
            );
            const afterFailure = await inspect(client, namespace);
            assert.deepEqual(afterFailure.counts, before.counts);
            assert.deepEqual(afterFailure.inventory, before.inventory);
            await client.query(
              'DROP TRIGGER fail_inventory_update ON "Inventory"',
            );
            const cleaned = await cleanupLegacy(client, seed, namespace);
            for (const table of ['PurchaseReview', 'Order', 'Cart'])
              assert.equal(cleaned.after.counts[table], 0);
            assert.equal(
              cleaned.after.inventoryActual.find(
                (row) => row.productId === 'P008',
              ).quantity,
              -1,
            );
            const repeated = await cleanupLegacy(client, seed, namespace);
            assert.deepEqual(
              repeated.after.inventoryActual,
              cleaned.after.inventoryActual,
            );
            await client.query(
              await readFile(
                new URL(`${migrationName}/migration.sql`, root),
                'utf8',
              ),
            );
            const afterMigration = await inspect(client, namespace);
            assert.equal(afterMigration.schema, 'lifecycle');
            assert.deepEqual(afterMigration.reservationMismatches, []);
            assert.ok(
              afterMigration.inventory.every(
                (row) => row.reservedQuantity === 0,
              ),
            );
            assert.ok(
              buildPlan(afterMigration, seed).blockers.includes(
                'NEW_LIFECYCLE_SCHEMA_NEVER_CLEAR_OR_RESEED',
              ),
            );
            await client.query(
              'INSERT INTO "Cart" (id,items,"createdAt","createRequestId","createPayloadHash") VALUES ($1,$2,now(),$3,$4)',
              [randomUUID(), '[]', randomUUID(), 'new-lifecycle-hash'],
            );
            assert.equal((await inspect(client, namespace)).counts.Cart, 1);
            await assert.rejects(cleanupLegacy(client, seed, namespace));
            assert.deepEqual(
              (await inspect(client, namespace)).inventory,
              afterMigration.inventory,
            );
            assert.equal((await inspect(client, namespace)).counts.Cart, 1);
          }),
      );
      await t.test(
        'SKU mismatch and out-of-scope foreign-key dependencies prevent any deletion or reset',
        async () =>
          fixture(async (namespace, cartId) => {
            await client.query(
              'INSERT INTO "Inventory" ("productId",quantity) VALUES ($1,9)',
              ['outside'],
            );
            const before = await inspect(client, namespace);
            await assert.rejects(
              cleanupLegacy(client, seed, namespace),
              /SKU_SEED_COVERAGE_MISMATCH/,
            );
            assert.deepEqual(
              (await inspect(client, namespace)).counts,
              before.counts,
            );
            await client.query('DELETE FROM "Inventory" WHERE "productId"=$1', [
              'outside',
            ]);
            await client.query(
              'CREATE TABLE "ExternalCartLog" ("cartId" uuid REFERENCES "Cart"(id))',
            );
            await client.query('INSERT INTO "ExternalCartLog" VALUES ($1)', [
              cartId,
            ]);
            await assert.rejects(
              cleanupLegacy(client, seed, namespace),
              /OUT_OF_SCOPE_FOREIGN_KEY_DEPENDENCIES/,
            );
            assert.equal((await inspect(client, namespace)).counts.Cart, 1);
          }),
      );
      await t.test(
        'a peer reconnecting after the initial check and waiting on the cleanup lock forces rollback',
        async () =>
          fixture(async (namespace, cartId) => {
            const before = await inspect(client, namespace);
            assert.deepEqual(buildPlan(before, seed).blockers, []);
            const peer = new pg.Client({
              connectionString: databaseUrl,
              application_name: 'old-writer-reconnected',
            });
            let connected = false;
            let waiting;
            // All SQL still runs on real PostgreSQL. Coordinate the reconnect only after the first real UPDATE,
            // after cleanup has cached its initial statistics view and deleted old transaction rows.
            const coordinatedClient = {
              async query(sql, values) {
                const result = await client.query(sql, values);
                if (!connected && sql.startsWith('UPDATE ')) {
                  await peer.connect();
                  connected = true;
                  waiting = peer.query(
                    `SELECT id FROM "${namespace}"."Cart" WHERE id=$1 FOR UPDATE`,
                    [cartId],
                  );
                  let blocked = false;
                  for (let attempt = 0; attempt < 100; attempt++) {
                    const locks = await client.query(
                      'SELECT 1 FROM pg_locks WHERE pid=$1 AND NOT granted',
                      [peer.processID],
                    );
                    if (locks.rowCount) {
                      blocked = true;
                      break;
                    }
                    await delay(10);
                  }
                  assert.ok(
                    blocked,
                    'reconnected peer must be waiting on the real cleanup table lock',
                  );
                }
                return result;
              },
            };
            try {
              await assert.rejects(
                cleanupLegacy(coordinatedClient, seed, namespace),
                /OTHER_DATABASE_SESSIONS_MUST_STOP_AND_DRAIN/,
              );
              assert.deepEqual((await waiting).rows, [{ id: cartId }]);
              const after = await inspect(client, namespace);
              assert.deepEqual(after.counts, before.counts);
              assert.deepEqual(after.inventory, before.inventory);
            } finally {
              if (waiting) await waiting;
              if (connected) await peer.end();
            }
          }),
      );
      await t.test(
        'another live database session blocks the clean-up even with otherwise valid legacy tables',
        async () =>
          fixture(async (namespace) => {
            const peer = new pg.Client({ connectionString: databaseUrl });
            await peer.connect();
            try {
              await assert.rejects(
                cleanupLegacy(client, seed, namespace),
                /OTHER_DATABASE_SESSIONS_MUST_STOP_AND_DRAIN/,
              );
            } finally {
              await peer.end();
            }
            assert.equal((await inspect(client, namespace)).counts.Cart, 1);
          }),
      );
    } finally {
      await client.query('SET search_path TO public');
      assert.deepEqual(await publicSnapshot(), beforePublic);
      await client.end();
    }
  },
);
