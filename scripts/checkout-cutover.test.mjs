import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, validateSeed, buildPlan } from './checkout-cutover.mjs';
const connection = 'postgresql://store:secret@127.0.0.1:5432/store_test';
const seed = [
  { productId: 'P001', quantity: 3 },
  { productId: 'P008', quantity: -1 },
];
const inventory = seed.map((row) => ({ ...row, reservedQuantity: null }));
const legacy = {
  schema: 'legacy',
  counts: { PurchaseReview: 2, Order: 1, Cart: 3 },
  inventory,
  peers: 0,
  reservationMismatches: [],
  unknownDependents: [],
};
test('requires an explicit isolated target and dedicated URL, defaults to dry-run, never leaks URL credentials', () => {
  assert.equal(
    parseOptions(['--database', 'store_test'], {
      CUTOVER_DATABASE_URL: connection,
    }).execute,
    false,
  );
  assert.equal(
    parseOptions(['--database', 'store_test', '--dry-run'], {
      CUTOVER_DATABASE_URL: connection,
    }).execute,
    false,
  );
  assert.throws(() =>
    parseOptions(['--database', 'store_test', '--dry-run', '--execute'], {
      CUTOVER_DATABASE_URL: connection,
    }),
  );
  for (const url of [
    connection.replace('store_test', 'store'),
    connection.replace('127.0.0.1', 'remote.example'),
    connection + '?options=-csearch_path%3Devil',
    'mysql://localhost/store_test',
  ])
    assert.throws(() =>
      parseOptions(['--database', 'store_test'], { CUTOVER_DATABASE_URL: url }),
    );
  assert.throws(() => parseOptions([], { CUTOVER_DATABASE_URL: connection }));
  assert.throws(() =>
    parseOptions(['--database', 'store_test'], { DATABASE_URL: connection }),
  );
  assert.throws(() =>
    parseOptions(['--database', 'store_test', '--typo'], {
      CUTOVER_DATABASE_URL: connection,
    }),
  );
  try {
    parseOptions(['--database', 'store_test'], {
      CUTOVER_DATABASE_URL: 'postgresql://user:secret@remote.example/store',
    });
  } catch (error) {
    assert.doesNotMatch(error.message, /secret/);
  }
});
test('execute requires exact target plus explicit stopped-and-drained acknowledgement', () => {
  assert.throws(() =>
    parseOptions(['--database', 'store_test', '--execute'], {
      CUTOVER_DATABASE_URL: connection,
    }),
  );
  const options = parseOptions(
    [
      '--database',
      'store_test',
      '--execute',
      '--confirm-target',
      'store_test',
      '--writers-stopped-and-drained',
    ],
    { CUTOVER_DATABASE_URL: connection },
  );
  assert.equal(options.execute, true);
  assert.throws(() =>
    parseOptions(
      [
        '--database',
        'store_test',
        '--execute',
        '--confirm-target',
        'store',
        '--writers-stopped-and-drained',
      ],
      { CUTOVER_DATABASE_URL: connection },
    ),
  );
});
test('validates controlled seed IDs and signed 32-bit inventory without guessing quantities', () => {
  assert.deepEqual(validateSeed(seed), seed);
  for (const rows of [
    [seed[0], seed[0]],
    [{ productId: 'P001', quantity: 0.5 }],
    [{ productId: '', quantity: 1 }],
    [{ productId: 'P001', quantity: 2147483648 }],
    [],
  ])
    assert.throws(() => validateSeed(rows));
});
test('plans only old transactions and matched-SKU updates, retaining directory/reviews and other tables', () => {
  const plan = buildPlan(legacy, seed);
  assert.deepEqual(plan.blockers, []);
  assert.deepEqual(plan.deleteTables, ['PurchaseReview', 'Order', 'Cart']);
  assert.equal(plan.inventoryReset.length, 2);
  assert.equal(
    plan.inventoryReset.find((row) => row.productId === 'P008').afterQuantity,
    -1,
  );
  assert.deepEqual(plan.preserve, [
    'catalog/reviews source',
    'all other tables',
    'database volume',
  ]);
});
test('blocks missing/extra SKU, unknown schema/dependencies, active peers and every lifecycle schema rerun', () => {
  for (const changed of [
    { inventory: inventory.slice(1) },
    { inventory: [...inventory, { productId: 'outside', quantity: 5 }] },
    { schema: 'unknown' },
    { schema: 'lifecycle', counts: { Cart: 0, Order: 0 } },
    { schema: 'lifecycle', counts: { Cart: 4, Order: 2 } },
    { unknownDependents: ['ExternalCartLog'] },
    { peers: 1 },
  ])
    assert.ok(buildPlan({ ...legacy, ...changed }, seed).blockers.length > 0);
  assert.deepEqual(
    buildPlan({ ...legacy, schema: 'lifecycle' }, seed).deleteTables,
    [],
  );
});

test('local store requires explicit authorization flag and exact approved address and target', () => {
  const url = connection.replace('/store_test', '/store');
  const args = [
    '--database',
    'store',
    '--authorized-local-store',
    '--execute',
    '--confirm-target',
    'store',
    '--writers-stopped-and-drained',
  ];
  assert.equal(
    parseOptions(args, { CUTOVER_DATABASE_URL: url }).target.database,
    'store',
  );
  for (const candidate of [
    url.replace('5432', '5433'),
    url.replace('127.0.0.1', 'localhost'),
    url.replace(/\/store$/, '/other'),
  ])
    assert.throws(() =>
      parseOptions(args, { CUTOVER_DATABASE_URL: candidate }),
    );
  assert.throws(() =>
    parseOptions(
      args.filter((x) => x !== '--authorized-local-store'),
      { CUTOVER_DATABASE_URL: url },
    ),
  );
  assert.throws(() =>
    parseOptions(
      ['--database', 'store', '--authorized-local-store', '--execute'],
      { CUTOVER_DATABASE_URL: url },
    ),
  );
});
