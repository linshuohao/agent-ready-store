import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const {
    rows: [metrics],
  } = await client.query(`SELECT
  (SELECT count(*)::int FROM "Cart" WHERE "agentCreated") AS "validAgentCartCreations",
  count(*)::int AS "ordersCreated",
  count(*) FILTER (WHERE status='PAID')::int AS "paidOrders",
  count(*) FILTER (WHERE "closedAt" IS NOT NULL)::int AS "closedOrders",
  count(*) FILTER (WHERE status='CHECKOUT' AND "closedAt" IS NULL AND "reservationExpiresAt">now())::int AS "pendingOrders",
  count(*) FILTER (WHERE status='CHECKOUT' AND "closedAt" IS NULL AND "reservationExpiresAt"<=now())::int AS "expiredUnclosedOrders",
  COALESCE(sum(total) FILTER (WHERE status='PAID'),0)::numeric(30,2)::text AS "paidRevenue",
  COALESCE(max(extract(epoch FROM now()-"reservationExpiresAt")) FILTER (WHERE status='CHECKOUT' AND "closedAt" IS NULL AND "reservationExpiresAt"<=now()),0)::float8 AS "oldestExpiredSeconds"
 FROM "Order"`);
  const { rows: mismatches } = await client.query(`WITH expected AS (
  SELECT l."productId",sum(l.quantity)::bigint AS reserved FROM "OrderLine" l JOIN "Order" o ON o.id=l."orderId" WHERE o.status='CHECKOUT' AND o."closedAt" IS NULL GROUP BY l."productId"
 ) SELECT COALESCE(i."productId",e."productId") AS "productId",i."reservedQuantity" AS actual,COALESCE(e.reserved,0)::text AS expected
 FROM "Inventory" i FULL JOIN expected e ON e."productId"=i."productId"
 WHERE i."productId" IS NULL OR i."reservedQuantity"<>COALESCE(e.reserved,0) ORDER BY 1`);
  await client.query('COMMIT');
  process.stdout.write(
    JSON.stringify({ ...metrics, reservationMismatches: mismatches }) + '\n',
  );
} finally {
  await client.end();
}
