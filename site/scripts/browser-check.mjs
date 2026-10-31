import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { documents } from '../content-manifest.mjs';
import { legacyRoutes } from '../legacy-routes.mjs';
const require = createRequire(import.meta.url);
// Normally resolved from the root development dependencies; override for an isolated worktree.
const { chromium, expect } = require(
  process.env.DOCS_PLAYWRIGHT_MODULE || '@playwright/test',
);
const site = fileURLToPath(new URL('..', import.meta.url));
const data = JSON.parse(
  await fs.readFile(
    path.join(site, '.vitepress/theme/presentation-data.json'),
    'utf8',
  ),
);
const port = Number(process.env.DOCS_TEST_PORT || 4187),
  base = `http://localhost:${port}`;
const server = spawn(
  process.execPath,
  [
    path.join(site, 'node_modules/vitepress/bin/vitepress.js'),
    'preview',
    path.join(site, '.generated'),
    '--port',
    String(port),
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
let browser;
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    if (log.includes(base + '/')) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw Error('Preview did not start: ' + log);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.DOCS_BROWSER_CHANNEL
      ? { channel: process.env.DOCS_BROWSER_CHANNEL }
      : {}),
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const doc of documents) {
    await page.goto(base + '/read/' + doc.slug + '.html');
    await page.waitForFunction(
      () => !document.querySelector('.mermaid-source:not(.diagram-error)'),
    );
    await expect(page.locator('.diagram-error')).toHaveCount(0);
    if (doc.group === '历史记录')
      await expect(page.locator('.history-notice')).toBeVisible();
  }
  await page.goto(base + '/');
  await page.getByRole('link', { name: '开始产品 Demo →' }).click();
  await page.locator('.step-nav button').last().click();
  await page.getByRole('button', { name: '继续：Agent 购物 →' }).click();
  await page.locator('.step-nav button').last().click();
  await page.locator('.step-actions a').click();
  for (const [i, slide] of data.slides.entries()) {
    await expect(
      page.locator('.presentation-screens [aria-current=step]'),
    ).toHaveText(slide.nav);
    if (i < data.slides.length - 1)
      await page.locator('.presentation-controls button').last().click();
  }
  await page.locator('.presentation-controls a').click();
  await page.reload();
  await page.locator('.reading-rail .return-demo').click();
  await expect(
    page.locator('.presentation-screens [aria-current=step]'),
  ).toHaveText(data.slides.at(-1).nav);
  for (const id of ['authorization', 'architecture', 'workflow']) {
    await page.goto(base + '/presentation.html?slide=' + id);
    await page
      .locator('.presentation-evidence a[href^="/read/"]')
      .first()
      .scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => scrollY);
    await page
      .locator('.presentation-evidence a[href^="/read/"]')
      .first()
      .click();
    await page.locator('.reading-rail .rail-shortcuts a').first().click();
    await page.reload();
    await page.locator('.reading-rail .return-demo').click();
    await expect(
      page.locator('.presentation-screens [aria-current=step]'),
    ).toHaveText(data.slides.find((s) => s.id === id).nav);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(y);
  }
  for (const [url, entry] of Object.entries(legacyRoutes)) {
    for (const [hash, target] of Object.entries(entry.hashes || {})) {
      await page.goto(base + url + '?from=quick-1#' + hash);
      await page.waitForURL(
        (u) =>
          u.pathname === new URL(target, base).pathname &&
          u.searchParams.get('from') === 'quick-1',
      );
    }
  }
  for (const width of [1440, 1024, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [
      '/library.html',
      '/history.html',
      '/read/checkout.html',
      ...data.slides.map((s) => '/presentation.html?slide=' + s.id),
    ]) {
      await page.goto(base + url);
      if (url.includes('presentation'))
        await expect(page.locator('.presentation-page')).toBeVisible();
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error('Page overflow: ' + width + ' ' + url);
      if (!url.includes('presentation') && width >= 768) {
        await expect(page.locator('.reading-rail')).toBeVisible();
        await expect(page.locator('.reading-mobile-tools')).toBeHidden();
      }
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    `Browser audit passed: ${documents.length} documents, ${data.slides.length} screens, legacy routes, refresh/return and four viewport widths.`,
  );
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
}
