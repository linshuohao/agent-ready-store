import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationName = '202610310001_checkout_lifecycle';
const legacyTables = ['PurchaseReview', 'Order', 'Cart'];
const knownTables = [
  ...legacyTables,
  'Inventory',
  'OrderLine',
  'CartOperation',
];
export function parseOptions(args, env) {
  const values = {};
  const flags = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (
      [
        '--dry-run',
        '--execute',
        '--writers-stopped-and-drained',
        '--authorized-local-store',
      ].includes(key)
    ) {
      if (flags.has(key)) throw Error('DUPLICATE_OPTION');
      flags.add(key);
    } else if (['--database', '--confirm-target'].includes(key)) {
      if (
        values[key] !== undefined ||
        !args[i + 1] ||
        args[i + 1].startsWith('--')
      )
        throw Error('INVALID_OPTION');
      values[key] = args[++i];
    } else throw Error('UNKNOWN_OPTION');
  }
  let target;
  try {
    target = new URL(env.CUTOVER_DATABASE_URL);
  } catch {
    throw Error('CUTOVER_DATABASE_URL_REQUIRED');
  }
  const database = flags.has('--authorized-local-store')
    ? 'store'
    : 'store_test';
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    target.pathname !== `/${database}` ||
    target.search ||
    target.hash ||
    values['--database'] !== database ||
    (database === 'store' &&
      (target.hostname !== '127.0.0.1' ||
        (target.port && target.port !== '5432')))
  )
    throw Error('ISOLATED_LOOPBACK_STORE_TEST_TARGET_REQUIRED');
  if (flags.has('--execute') && flags.has('--dry-run'))
    throw Error('CONFLICTING_EXECUTION_MODES');
  target.port ||= '5432';
  const execute = flags.has('--execute');
  if (
    execute &&
    (values['--confirm-target'] !== database ||
      !flags.has('--writers-stopped-and-drained'))
  )
    throw Error('EXECUTION_REQUIRES_EXACT_TARGET_AND_STOPPED_DRAINED_WRITERS');
  return {
    execute,
    connectionString: target.href,
    target: {
      host: target.hostname,
      port: target.port || '5432',
      database,
      schema: 'public',
    },
  };
}
export function validateSeed(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.length ||
    rows.some(
      (row) =>
        typeof row.productId !== 'string' ||
        !row.productId ||
        !Number.isInteger(row.quantity) ||
        row.quantity < -2147483648 ||
        row.quantity > 2147483647,
    ) ||
    new Set(rows.map((row) => row.productId)).size !== rows.length
  )
    throw Error('INVALID_CONTROLLED_INVENTORY_SEED');
  return [...rows].sort((a, b) => a.productId.localeCompare(b.productId));
}
export function buildPlan(snapshot, inputSeed) {
  const seed = validateSeed(inputSeed);
  const expected = new Set(seed.map((row) => row.productId));
  const actual = new Map(snapshot.inventory.map((row) => [row.productId, row]));
  const missingSku = seed
    .filter((row) => !actual.has(row.productId))
    .map((row) => row.productId);
  const extraSku = snapshot.inventory
    .filter((row) => !expected.has(row.productId))
    .map((row) => row.productId)
    .sort();
  const blockers = [];
  if (snapshot.schema !== 'legacy')
    blockers.push(
      snapshot.schema === 'lifecycle'
        ? 'NEW_LIFECYCLE_SCHEMA_NEVER_CLEAR_OR_RESEED'
        : 'UNKNOWN_OR_PARTIAL_SCHEMA',
    );
  if (missingSku.length || extraSku.length)
    blockers.push('SKU_SEED_COVERAGE_MISMATCH');
  if (snapshot.unknownDependents.length)
    blockers.push('OUT_OF_SCOPE_FOREIGN_KEY_DEPENDENCIES');
  if (snapshot.peers)
    blockers.push('OTHER_DATABASE_SESSIONS_MUST_STOP_AND_DRAIN');
  return {
    schema: snapshot.schema,
    counts: snapshot.counts,
    blockers,
    missingSku,
    extraSku,
    activePeerSessions: snapshot.peers,
    unknownDependents: snapshot.unknownDependents,
    deleteTables: snapshot.schema === 'legacy' ? legacyTables : [],
    inventoryActual: snapshot.inventory,
    inventoryReset: (snapshot.schema === 'legacy' ? seed : []).map((row) => ({
      productId: row.productId,
      beforeQuantity: actual.get(row.productId)?.quantity ?? null,
      beforeReserved: actual.get(row.productId)?.reservedQuantity ?? null,
      afterQuantity: row.quantity,
      afterReserved: 0,
    })),
    reservationMismatches: snapshot.reservationMismatches,
    preserve: ['catalog/reviews source', 'all other tables', 'database volume'],
    migration: migrationName,
  };
}
// CLI is fixed to public; the narrow namespace option permits disposable-schema verification.
function scope(namespace) {
  if (
    namespace !== 'public' &&
    !/^checkout_cutover_test_[a-f0-9]{16}$/.test(namespace)
  )
    throw Error('INVALID_CUTOVER_SCHEMA');
  return `"${namespace}"`;
}
export async function inspect(
  client,
  namespace = 'public',
  database = 'store_test',
) {
  const qualified = scope(namespace);
  const identity = (
    await client.query(
      'SELECT current_database() AS database, current_schema() AS schema',
    )
  ).rows[0];
  if (
    !['store_test', 'store'].includes(database) ||
    identity.database !== database ||
    identity.schema !== namespace
  )
    throw Error('CONNECTED_TARGET_MISMATCH');
  const { rows: columns } = await client.query(
    'SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=$1',
    [namespace],
  );
  const has = (table, column) =>
    columns.some(
      (row) => row.table_name === table && row.column_name === column,
    );
  const legacy =
    has('Cart', 'encryptedCartToken') &&
    has('Order', 'snapshot') &&
    has('PurchaseReview', 'prepareRequestId') &&
    !has('Order', 'status') &&
    !has('Inventory', 'reservedQuantity') &&
    !has('CartOperation', 'requestId') &&
    !has('OrderLine', 'orderId');
  const lifecycle =
    has('Order', 'status') &&
    has('OrderLine', 'orderId') &&
    has('CartOperation', 'requestId') &&
    has('Inventory', 'reservedQuantity') &&
    !has('PurchaseReview', 'id') &&
    !has('Cart', 'encryptedCartToken');
  const schema = legacy ? 'legacy' : lifecycle ? 'lifecycle' : 'unknown';
  const counts = {};
  for (const table of knownTables.filter((name) =>
    has(
      name,
      name === 'Inventory'
        ? 'productId'
        : name === 'OrderLine'
          ? 'orderId'
          : name === 'CartOperation'
            ? 'requestId'
            : 'id',
    ),
  ))
    counts[table] = (
      await client.query(
        `SELECT count(*)::int AS n FROM ${qualified}."${table}"`,
      )
    ).rows[0].n;
  const inventory = has('Inventory', 'productId')
    ? (
        await client.query(
          `SELECT "productId",quantity,${has('Inventory', 'reservedQuantity') ? '"reservedQuantity"' : 'NULL::int AS "reservedQuantity"'} FROM ${qualified}."Inventory" ORDER BY "productId"`,
        )
      ).rows
    : [];
  // PostgreSQL caches activity statistics within a transaction; recheck live sessions before commit.
  await client.query('SELECT pg_catalog.pg_stat_clear_snapshot()');
  const peers = (
    await client.query(
      "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'",
    )
  ).rows[0].n;
  const unknownDependents = (
    await client.query(
      `SELECT DISTINCT ns.nspname||'.'||src.relname AS name FROM pg_constraint c JOIN pg_class src ON src.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=src.relnamespace JOIN pg_class dst ON dst.oid=c.confrelid JOIN pg_namespace nd ON nd.oid=dst.relnamespace WHERE c.contype='f' AND nd.nspname=$3 AND dst.relname=ANY($1::text[]) AND NOT (ns.nspname=$3 AND src.relname=ANY($2::text[]))`,
      [legacyTables, knownTables, namespace],
    )
  ).rows.map((row) => row.name);
  const reservationMismatches = lifecycle
    ? (
        await client.query(
          `WITH expected AS (SELECT l."productId",sum(l.quantity)::bigint AS reserved FROM ${qualified}."OrderLine" l JOIN ${qualified}."Order" o ON o.id=l."orderId" WHERE o.status='CHECKOUT' AND o."closedAt" IS NULL GROUP BY l."productId") SELECT COALESCE(i."productId",e."productId") AS "productId",i."reservedQuantity" AS actual,COALESCE(e.reserved,0)::text AS expected FROM ${qualified}."Inventory" i FULL JOIN expected e ON e."productId"=i."productId" WHERE i."productId" IS NULL OR i."reservedQuantity"<>COALESCE(e.reserved,0) ORDER BY 1`,
        )
      ).rows
    : [];
  return {
    schema,
    counts,
    inventory,
    peers,
    unknownDependents,
    reservationMismatches,
  };
}
export async function cleanupLegacy(
  client,
  seed,
  namespace = 'public',
  database = 'store_test',
) {
  const qualified = scope(namespace);
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout='3s'");
    await client.query(
      `LOCK TABLE ${qualified}."PurchaseReview",${qualified}."Order",${qualified}."Cart",${qualified}."Inventory" IN EXCLUSIVE MODE NOWAIT`,
    );
    const plan = buildPlan(await inspect(client, namespace, database), seed);
    if (plan.blockers.length) throw Error(plan.blockers.join(','));
    for (const table of legacyTables)
      await client.query(`DELETE FROM ${qualified}."${table}"`);
    for (const row of seed) {
      const result = await client.query(
        `UPDATE ${qualified}."Inventory" SET quantity=$2 WHERE "productId"=$1`,
        [row.productId, row.quantity],
      );
      if (result.rowCount !== 1) throw Error('SKU_CHANGED_DURING_CUTOVER');
    }
    const after = buildPlan(await inspect(client, namespace, database), seed);
    if (after.blockers.length) throw Error(after.blockers.join(','));
    if (
      legacyTables.some((table) => after.counts[table] !== 0) ||
      after.inventoryReset.some(
        (row) => row.beforeQuantity !== row.afterQuantity,
      )
    )
      throw Error('CLEANUP_RECONCILIATION_FAILED');
    await client.query('COMMIT');
    return { before: plan, after };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
async function migrate(connectionString) {
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['--filter', '@store/api', 'db:migrate'], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: connectionString },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Prisma error output can contain a connection URL; emit only the outcome.
    child.stdout.resume();
    child.stderr.resume();
    child.once('error', () => reject(Error('PRISMA_MIGRATION_START_FAILED')));
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(Error('PRISMA_MIGRATION_FAILED_KEEP_WRITERS_STOPPED')),
    );
  });
}
export async function main(args = process.argv.slice(2), env = process.env) {
  const options = parseOptions(args, env);
  const requireApi = createRequire(
    new URL('../apps/api/package.json', import.meta.url),
  );
  const pg = requireApi('pg');
  const { Catalog } = await import(
    new URL('../apps/api/dist/catalog/catalog.js', import.meta.url)
  );
  const seed = validateSeed(
    new Catalog(
      await readFile(
        new URL('../references/products.json', import.meta.url),
        'utf8',
      ),
    ).initialInventory(),
  );
  const client = new pg.Client({
    connectionString: options.connectionString,
    application_name: 'checkout-cutover',
  });
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const plan = buildPlan(
      await inspect(client, 'public', options.target.database),
      seed,
    );
    await client.query('COMMIT');
    console.log(
      JSON.stringify({
        mode: options.execute ? 'execute' : 'dry-run',
        target: options.target,
        plan,
      }),
    );
    if (!options.execute) return plan;
    if (plan.blockers.length) throw Error(plan.blockers.join(','));
    const cleanup = await cleanupLegacy(
      client,
      seed,
      'public',
      options.target.database,
    );
    console.log(JSON.stringify({ phase: 'cleanup-committed', ...cleanup }));
    await migrate(options.connectionString);
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const after = await inspect(client, 'public', options.target.database);
    await client.query('COMMIT');
    if (
      after.schema !== 'lifecycle' ||
      after.reservationMismatches.length ||
      Object.entries(after.counts).some(
        ([table, count]) => table !== 'Inventory' && count !== 0,
      ) ||
      after.inventory.some(
        (row) =>
          row.reservedQuantity !== 0 ||
          row.quantity !==
            seed.find((item) => item.productId === row.productId)?.quantity,
      )
    )
      throw Error('MIGRATION_RECONCILIATION_FAILED_KEEP_WRITERS_STOPPED');
    console.log(
      JSON.stringify({
        phase: 'migration-reconciled',
        target: options.target,
        counts: after.counts,
        reservationMismatches: after.reservationMismatches,
      }),
    );
    return after;
  } finally {
    await client.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    const reason = /^[A-Z_,]+$/.test(error.message)
      ? error.message
      : 'DATABASE_OR_MIGRATION_ERROR';
    console.error(
      `CHECKOUT_CUTOVER_FAILED: ${reason}. Inspect the last safe phase; keep writers stopped. Never clear lifecycle data.`,
    );
    process.exitCode = 1;
  });
