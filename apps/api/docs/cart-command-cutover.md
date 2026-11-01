# Cart command cutover operations

This is an operational companion to the approved [Change design](../../../openspec/changes/archive/2026-11-01-cart-command-state-isolation/design.md), not a second contract. The Demo release was deployed on 2026-11-01 using the Human-approved simplified procedure below. No rollback was performed.

## Implementation map

- `CartService.add` serializes initialization identity resolution with a PostgreSQL transaction advisory lock. `Cart.initializationId` is unique; the first valid add creates the cart and operation fact atomically. Existing carts retain nullable legacy initialization facts. Explicit cart IDs never create replacements.
- Cart row locks serialize increments, version-protected absolute edits, and order cleanup. Orders use explicit purchase quantities, retain diagnostic `sourceCartVersion`, and clean whole matching SKU rows once. The `cart-command-v2` fingerprint includes trusted channel and original add identity; replay cannot change identity or re-clean later additions.
- `GET /api/v1/shopping/request-result` and MCP `get_request_result` read persisted success facts. They alone receive the new expiry-maintenance exemption; authentication, Host/Origin rules, validation and no-store remain. `not_found` is only a current observation.
- MCP `add_cart_item` is fixed to MCP; app-only `apps_add_cart_item` uses the same factory fixed to APPS. Web/WebMCP have separate trusted add routes. Legacy initialization and order payloads fail strict validation.

## Executed Demo procedure (2026-11-01)

Human explicitly accepted a simplified release for this Demo, superseding the stop/drain prerequisite for this release only. Temporary request failures and refreshing stale pages were accepted; no strict drain or atomic traffic switch was performed or claimed.

1. Preserve business data in a Neon backup branch without compute and a restricted local pg_dump backup.
2. Run `pnpm --filter @store/api db:migrate` against the existing database. The initialization migration completed without reset, seed or deletion of historical facts.
3. Merge PR #9 as `78e3d76`; Vercel Git integration builds the API, Web and documentation projects independently. All three Production deployments reached READY before the remote acceptance probes.
4. Verify the new MCP schemas/v9 resources, shared-identity concurrent adds, explicit-quantity orders, legacy payload rejection, read-only lookup and replay preserving later additions. Cancel the test order to release its reservation.
5. Keep unresolved historical attempts query-only. Real Host schema refresh, Apps presentation and recovery remain pending; SDK/HTTP checks do not satisfy that acceptance.

Deployment IDs, CI, test identities and results are maintained in the [deployment record](../../../docs/engineering/DEPLOYMENT.md#本次发布与验证2026-11-01); outstanding Host acceptance is maintained in [delivery status](../../../docs/engineering/DELIVERY_STATUS.md#购物车命令隔离已部署2026-11-01).

## Original strict cutover procedure (not executed in this release)

1. Obtain deployment authorization and stop admitting all shopping writes across Web, WebMCP, MCP and Apps on every instance. Keep historical read-only reconciliation available. Do not infer drain completion from missing database success records.
2. Drain already-admitted requests; confirm no old application instance or old worker can accept another write. Record infrastructure evidence of this condition before interpreting an old unknown attempt as unfinished.
3. Back up persistent business data and deploy `20261101000000_cart_initialization_identity` with `pnpm --filter @store/api db:migrate`. This migration is additive except making legacy fields nullable; it does not clear orders, carts or deduplication records.
4. Deploy the matching API and clients, including Apps resource version v9. Require MCP schema rediscovery. Probe strict rejection of legacy writes, shared-identity first adds, explicit-quantity order creation and read-only result lookup before reopening writes.
5. Validate reservation ownership and the two same-SKU transaction orders. Keep unresolved historical requests query-only; a new intent requires an explicit user action after drain is known.

## Rollback boundary

Stop and drain new writes before any rollback. Retain all orders, reservations, operation facts and initialization mappings. Do not revert directly to the old server: new carts have null legacy fields and new clients send quantity without cart version. Roll back clients and server as a coordinated compatible release, preserving v2 result lookup and successful facts; do not drop the new column, invent replacement keys, or replay legacy payloads. If compatibility cannot be established, keep writes stopped and escalate rather than deleting data.

## Verification entry points

Run database-mutating suites serially with `--no-file-parallelism` and an isolated `TEST_DATABASE_URL` ending in `/store_test`. `command-isolation-db.test.ts` covers identity races, explicit quantities, transaction ordering and read-only/late-commit reconciliation; `lifecycle-db.test.ts` retains real rollback, stock, quota, payment and expiry checks. `lifecycle-http.test.ts` and `lifecycle-mcp.test.ts` require an isolated API on port 3003 and verify maintenance bypass against actual expired reservations. They are protocol integration evidence, not real ChatGPT Host acceptance.
