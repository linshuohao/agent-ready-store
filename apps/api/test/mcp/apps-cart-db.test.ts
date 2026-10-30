import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import {
  cartViewOutput,
  cartTokenInput,
  handoffOutput,
  orderOutput,
} from '@store/contracts';
import { CatalogService } from '../../src/catalog/catalog.service.js';
import { CartService } from '../../src/cart/cart.service.js';
import { CartCredentials } from '../../src/cart/credentials.js';
import { seedInventory } from '../../src/infrastructure/database/database.js';
import { attachMcp } from '../../src/mcp/mcp.adapter.js';
const url = process.env.TEST_DATABASE_URL;
(url ? describe : describe.skip)(
  'Apps tool path over HTTP MCP on isolated PostgreSQL',
  () => {
    let catalog: CatalogService,
      carts: CartService,
      server: Server,
      client: Client;
    beforeAll(async () => {
      if (new URL(url!).pathname !== '/store_test')
        throw new Error('Isolated store_test required');
      vi.stubEnv('DATABASE_URL', url!);
      vi.stubEnv('CATALOG_PATH', 'references/products.json');
      vi.stubEnv('MCP_SERVICE_TOKEN', 's6-isolated-mcp-service-token');
      vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
      catalog = new CatalogService();
      carts = new CartService(
        catalog.catalog,
        catalog.db,
        new CartCredentials(randomBytes(32).toString('hex')),
      );
      await catalog.db.order.deleteMany();
      await catalog.db.cart.deleteMany();
      await catalog.db.inventory.deleteMany();
      await seedInventory(catalog.db, catalog.catalog);
      const app = express();
      app.use(express.json());
      server = app.listen(0, '127.0.0.1');
      await new Promise<void>((resolve) => server.once('listening', resolve));
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Expected test port');
      vi.stubEnv('MCP_ALLOWED_HOSTS', `127.0.0.1:${address.port}`);
      attachMcp(app, catalog, carts);
      client = new Client({ name: 'S6 isolated integration', version: '1' });
      await client.connect(
        new StreamableHTTPClientTransport(
          new URL(`http://127.0.0.1:${address.port}/mcp`),
          {
            requestInit: {
              headers: {
                Authorization: 'Bearer s6-isolated-mcp-service-token',
              },
            },
          },
        ),
      );
    });
    afterAll(async () => {
      await client?.close();
      if (server)
        await new Promise<void>((resolve, reject) =>
          server.close((e) => (e ? reject(e) : resolve())),
        );
      await catalog?.onModuleDestroy();
      vi.unstubAllEnvs();
    });
    async function call(name: string, args: Record<string, unknown>) {
      return (await client.callTool({ name, arguments: args }))
        .structuredContent as {
        ok: boolean;
        data?: unknown;
        error?: { code: string };
      };
    }
    it('preserves same-cart quote/version competition, no edit stock decrement, and completed read-only behavior', async () => {
      const stock = async () =>
        (
          await catalog.db.inventory.findUniqueOrThrow({
            where: { productId: 'P001' },
          })
        ).quantity;
      const initialStock = await stock();
      const created = await call('create_cart', {
        createRequestId: randomUUID(),
        items: [{ productId: 'P001', quantity: 1 }],
      });
      expect(created.ok).toBe(true);
      const data = z
        .object({ cart: cartViewOutput, cartAccessToken: cartTokenInput })
        .parse(created.data);
      const cap = {
        cartId: data.cart.cartId,
        cartAccessToken: data.cartAccessToken,
      };
      const attempts = await Promise.all(
        [2, 3].map((quantity) =>
          call('update_cart', {
            ...cap,
            expectedCartVersion: 1,
            items: [{ productId: 'P001', quantity }],
          }),
        ),
      );
      expect(attempts.filter((x) => x.ok)).toHaveLength(1);
      expect(attempts.find((x) => !x.ok)?.error?.code).toBe(
        'CART_VERSION_CONFLICT',
      );
      const current = z
        .object({ cart: cartViewOutput, order: orderOutput.nullable() })
        .parse((await call('get_cart', cap)).data);
      expect(current.cart.cartVersion).toBe(2);
      expect(current.cart.quote?.items[0].quantity).toBe(
        current.cart.items[0].quantity,
      );
      expect(await stock()).toBe(initialStock);
      const handoff = handoffOutput.parse(
        (await call('create_handoff', cap)).data,
      );
      expect(handoff.cart.cartId).toBe(cap.cartId);
      expect(
        Date.parse(handoff.handoff.expiresAt) -
          Date.parse(handoff.handoff.issuedAt),
      ).toBe(86400000);
      expect(
        handoffOutput.parse((await call('create_handoff', cap)).data).handoff,
      ).toEqual(handoff.handoff);
      // Simulate the already-covered checkout use case in the disposable test DB only.
      const session = randomBytes(32).toString('base64url');
      const review = await carts.review(
        cap.cartId,
        cap.cartAccessToken,
        session,
      );
      if (review.state !== 'ready') throw new Error('Expected ready fixture');
      const order = await carts.submit(
        cap.cartId,
        cap.cartAccessToken,
        session,
        { confirmation: review.confirmation },
      );
      const done = z
        .object({ cart: cartViewOutput, order: orderOutput.nullable() })
        .parse((await call('get_cart', cap)).data);
      expect(done.order?.orderId).toBe(order.orderId);
      expect(done.cart.canCheckout).toBe(false);
      expect(
        (
          await call('update_cart', {
            ...cap,
            expectedCartVersion: done.cart.cartVersion,
            items: [],
          })
        ).error?.code,
      ).toBe('CART_COMPLETED');
      expect((await call('create_handoff', cap)).error?.code).toBe(
        'CART_COMPLETED',
      );
      expect(await stock()).toBe(initialStock - current.cart.items[0].quantity);
      expect(await catalog.db.order.count()).toBe(1);
    });
  },
);
