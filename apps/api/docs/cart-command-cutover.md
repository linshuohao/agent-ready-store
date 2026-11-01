# Cart command cutover operations

This is an operational companion to the approved [Change design](../../../openspec/changes/cart-command-state-isolation/design.md), not a second contract. No production cutover or rollback has been performed by this implementation.

## Implementation map

- `CartService.add` serializes initialization identity resolution with a PostgreSQL transaction advisory lock. `Cart.initializationId` is unique; the first valid add creates the cart and operation fact atomically. Existing carts retain nullable legacy initialization facts. Explicit cart IDs never create replacements.
- Cart row locks serialize increments, version-protected absolute edits, and order cleanup. Orders use explicit purchase quantities, retain diagnostic `sourceCartVersion`, and clean whole matching SKU rows once. The `cart-command-v2` fingerprint includes trusted channel and original add identity; replay cannot change identity or re-clean later additions.
- `GET /api/v1/shopping/request-result` and MCP `get_request_result` read persisted success facts. They alone receive the new expiry-maintenance exemption; authentication, Host/Origin rules, validation and no-store remain. `not_found` is only a current observation.
- MCP `add_cart_item` is fixed to MCP; app-only `apps_add_cart_item` uses the same factory fixed to APPS. Web/WebMCP have separate trusted add routes. Legacy initialization and order payloads fail strict validation.

## Authorized deployment procedure (not yet executed)

1. Obtain deployment authorization and stop admitting all shopping writes across Web, WebMCP, MCP and Apps on every instance. Keep historical read-only reconciliation available. Do not infer drain completion from missing database success records.
2. Drain already-admitted requests; confirm no old application instance or old worker can accept another write. Record infrastructure evidence of this condition before interpreting an old unknown attempt as unfinished.
3. Back up persistent business data and deploy `20261101000000_cart_initialization_identity` with `pnpm --filter @store/api db:migrate`. This migration is additive except making legacy fields nullable; it does not clear orders, carts or deduplication records.
4. Deploy the matching API and clients, including Apps resource version v9. Require MCP schema rediscovery. Probe strict rejection of legacy writes, shared-identity first adds, explicit-quantity order creation and read-only result lookup before reopening writes.
5. Validate reservation ownership and the two same-SKU transaction orders. Keep unresolved historical requests query-only; a new intent requires an explicit user action after drain is known.

## Rollback boundary

Stop and drain new writes before any rollback. Retain all orders, reservations, operation facts and initialization mappings. Do not revert directly to the old server: new carts have null legacy fields and new clients send quantity without cart version. Roll back clients and server as a coordinated compatible release, preserving v2 result lookup and successful facts; do not drop the new column, invent replacement keys, or replay legacy payloads. If compatibility cannot be established, keep writes stopped and escalate rather than deleting data.

## Verification entry points

Run database-mutating suites serially with `--no-file-parallelism` and an isolated `TEST_DATABASE_URL` ending in `/store_test`. `command-isolation-db.test.ts` covers identity races, explicit quantities, transaction ordering and read-only/late-commit reconciliation; `lifecycle-db.test.ts` retains real rollback, stock, quota, payment and expiry checks. `lifecycle-http.test.ts` and `lifecycle-mcp.test.ts` require an isolated API on port 3003 and verify maintenance bypass against actual expired reservations. They are protocol integration evidence, not real ChatGPT Host acceptance.
