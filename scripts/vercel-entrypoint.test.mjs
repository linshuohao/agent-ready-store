import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('compiled NestJS import completes when Vercel captures listen without invoking its callback', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import http from 'node:http';
    let captured = false;
    const original = http.Server.prototype.listen;
    http.Server.prototype.listen = function () { captured = true; return this; };
    const timeout = setTimeout(() => { console.error('Entrypoint import blocked on listen'); process.exit(1); }, 3000);
    await import('./apps/api/dist/main.js');
    if (!captured) throw new Error('Server was not captured');
    clearTimeout(timeout);
    http.Server.prototype.listen = original;
  `,
    ],
    {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
        CATALOG_PATH: 'references/products.json',
        ORDER_EXPIRY_MODE: 'request',
        MCP_SERVICE_TOKEN: 'entrypoint-test-token-long-enough',
        MCP_ALLOWED_HOSTS: 'localhost',
        WEB_ORIGIN: 'http://localhost:3000',
      },
      stdio: 'pipe',
      timeout: 5000,
    },
  );
});
