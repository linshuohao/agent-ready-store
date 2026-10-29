import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const { rows } = await client.query(
    'SELECT count(*)::text AS count FROM "Cart" WHERE origin = $1',
    ['AGENT'],
  );
  await client.query('COMMIT');
  process.stdout.write(
    JSON.stringify({
      validAgentCartCreations: rows[0].count,
      meaning:
        '有效创建车数，不是独立顾客或独立购买意图数；包含后续过期、删空及成交车。',
    }) + '\n',
  );
} finally {
  await client.end();
}
