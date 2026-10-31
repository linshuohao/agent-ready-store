import { build } from 'vite';
import tailwind from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { appTools } from './resources.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
const output = fileURLToPath(new URL('../api/dist/mcp-app/', import.meta.url));
const watch = process.argv.includes('--watch');
const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const url = new URL(origin);
if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
  throw new Error('WEB_ORIGIN must be an HTTP origin');
await build({
  root,
  configFile: false,
  css: { postcss: { plugins: [tailwind()] } },
  logLevel: 'warn',
  define: { __CHECKOUT_ORIGIN__: JSON.stringify(origin) },
  plugins: [
    {
      name: 'inline-mcp-resources',
      generateBundle(_options, bundle) {
        const entries = Object.values(bundle);
        const chunks = entries.filter((entry) => entry.type === 'chunk');
        if (chunks.length !== 1) throw new Error('Expected one Apps script');
        const code = chunks[0].code.replace(/<\/script/gi, '<\\/script');
        const css = entries
          .filter(
            (entry) =>
              entry.type === 'asset' && entry.fileName.endsWith('.css'),
          )
          .map((entry) => entry.source)
          .join('\n')
          .replace(/<\/style/gi, '<\\/style');
        for (const filename of Object.keys(bundle)) delete bundle[filename];
        for (const tool of appTools) {
          this.emitFile({
            type: 'asset',
            fileName: tool.replaceAll('_', '-') + '-v7.html',
            source: `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent-Ready Store</title><style>${css}</style></head><body data-entry-tool="${tool}"><div id="root"></div><script type="module">${code}</script></body></html>`,
          });
        }
      },
      writeBundle() {
        console.log(`Built ${appTools.length} static MCP Apps resources`);
      },
    },
  ],
  build: {
    outDir: output,
    emptyOutDir: true,
    watch: watch ? {} : null,
    target: 'es2022',
    minify: !watch,
    rolldownOptions: {
      // Apps is entirely client-side; React Server Component boundary directives are inert here.
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          warning.message.includes('use client')
        )
          return;
        warn(warning);
      },
      input: root + 'src/main.tsx',
      output: { codeSplitting: false },
    },
  },
});
