import { build } from 'vite';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { appTools } from './resources.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
const output = fileURLToPath(new URL('../api/dist/mcp-app/', import.meta.url));
const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const url = new URL(origin);
if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
  throw new Error('WEB_ORIGIN must be an HTTP origin');
const result = await build({
  root,
  configFile: false,
  logLevel: 'warn',
  define: { __CHECKOUT_ORIGIN__: JSON.stringify(origin) },
  build: {
    write: false,
    target: 'es2022',
    minify: true,
    rolldownOptions: {
      input: root + 'src/main.tsx',
      output: { codeSplitting: false },
    },
  },
});
const chunks = result.output.filter((x) => x.type === 'chunk');
if (chunks.length !== 1) throw new Error('Expected one Apps script');
const code = chunks[0].code.replace(/<\/script/gi, '<\\/script');
const css = result.output
  .filter((x) => x.type === 'asset' && x.fileName.endsWith('.css'))
  .map((x) => x.source)
  .join('\n')
  .replace(/<\/style/gi, '<\\/style');
await mkdir(output, { recursive: true });
for (const tool of appTools) {
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent-Ready Store</title><style>${css}</style></head><body data-entry-tool="${tool}"><div id="root"></div><script type="module">${code}</script></body></html>`;
  await writeFile(output + tool.replaceAll('_', '-') + '-v1.html', html);
}
// Generated probe is obsolete; retain no diagnostic UI in the delivered resources.
await rm(new URL('../api/dist/s6-host-probe.html', import.meta.url), {
  force: true,
});
console.log(`Built ${appTools.length} static MCP Apps resources`);
