import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Server-only deployment asset. The repository owner authorized cloud access.
const target = new URL('../dist/catalog-data/', import.meta.url);
mkdirSync(target, { recursive: true });
copyFileSync(
  new URL('../../../references/products.json', import.meta.url),
  fileURLToPath(new URL('products.json', target)),
);
