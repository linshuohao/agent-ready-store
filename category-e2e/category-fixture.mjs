// Isolated browser fixture. Uses real Catalog/MCP code, never a database or cart.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { Catalog } from '../apps/api/dist/catalog/catalog.js';
import { attachMcp } from '../apps/api/dist/mcp/mcp.adapter.js';
import { decodeQuery } from '../apps/api/dist/catalog/http-query.js';
import { result } from '../apps/api/dist/shared/result.js';
const require = createRequire(
  new URL('../apps/api/package.json', import.meta.url),
);
const express = require('express');
const app = express();
app.use(express.json());
const raw = JSON.parse(
  readFileSync(new URL('../references/products.json', import.meta.url), 'utf8'),
);
const normal = new Catalog(JSON.stringify(raw));
const large = new Catalog(
  JSON.stringify({
    ...raw,
    products: [
      ...raw.products,
      ...Array.from({ length: 55 }, (_, i) => ({
        ...raw.products[0],
        id: `fixture-${i}`,
        category: `Fixture ${String(i).padStart(2, '0')}`,
      })),
      { ...raw.products[0], id: 'fixture-space', category: ' Space ' },
    ],
  }),
);
const stock = new Map(raw.products.map((p) => [p.id, p.stock]));
let mode = 'normal';
let categoryCalls = 0;
const current = () => (mode === 'normal' ? normal : large);
app.post('/__fixture', (req, res) => {
  mode = req.body.mode;
  categoryCalls = 0;
  res.json({ ok: true });
});
app.get('/api/v1/catalog/categories', async (req, res) => {
  categoryCalls++;
  if (mode === 'initial-error' && categoryCalls === 1)
    return res.status(503).json({
      ok: false,
      error: { code: 'TEMPORARY_UNAVAILABLE', retryable: true },
      requestId: 'fixture',
    });
  res.json(await result(() => current().categories(decodeQuery(req.query))));
});
app.get('/api/v1/products', async (req, res) =>
  res.json(await result(() => current().search(decodeQuery(req.query), stock))),
);
app.get('/api/v1/products/:id', async (req, res) =>
  res.json(await result(() => current().get(req.params.id, stock))),
);
app.get('/api/v1/health', (_req, res) => res.json({ ok: true }));
process.env.MCP_SERVICE_TOKEN = 'isolated-category-host-token-12345';
process.env.MCP_ALLOWED_HOSTS = '127.0.0.1:4312';
process.env.WEB_ORIGIN = 'http://127.0.0.1:4310';
attachMcp(
  app,
  {
    categories: (input) => current().categories(input),
    discover: (input) =>
      input.queries
        ? current().searchGrouped(input, stock)
        : current().search(input, stock),
    get: (id) => current().get(id, stock),
    reviews: (id, input) => current().reviews(id, input),
  },
  {},
);
app.listen(4312, '127.0.0.1', () =>
  console.log('Isolated category fixture listening on 4312; no database'),
);
