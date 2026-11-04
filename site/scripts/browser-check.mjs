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
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error('Browser error:', e.stack);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.error('Browser console:', message.text());
      if (!message.text().startsWith('Failed to load resource:'))
        errors.push(message.text());
    }
  });
  // SSR headings are visible before Vue finishes hydrating. Interact only once
  // the app is mounted so refresh/back checks exercise the live navigation.
  async function waitForApp() {
    await page.waitForFunction(
      () => !!document.querySelector('#app')?.__vue_app__,
    );
  }
  async function visit(url) {
    await page.goto(url);
    await waitForApp();
  }
  async function refresh() {
    await page.reload();
    await waitForApp();
  }
  await visit(base + '/presentation.html?slide=search');
  for (const id of [
    'architecture',
    'workflow',
    'authorization',
    'architecture',
  ]) {
    await page.locator('#showcase-menu > a[href$="slide=' + id + '"]').click();
    await expect(page).toHaveURL(base + '/presentation.html?slide=' + id);
    await expect(
      page.locator('.presentation-screens [aria-current=step]'),
    ).toHaveText(data.slides.find((s) => s.id === id).nav);
    await expect(page.locator('h1')).toHaveText(
      data.slides.find((s) => s.id === id).title.replace(/<br\s*\/?\s*>/gi, ''),
    );
  }
  await page.goBack();
  await expect(
    page.locator('.presentation-screens [aria-current=step]'),
  ).toHaveText(data.slides.find((s) => s.id === 'authorization').nav);
  await page.goForward();
  await expect(
    page.locator('.presentation-screens [aria-current=step]'),
  ).toHaveText(data.slides.find((s) => s.id === 'architecture').nav);
  const demos = JSON.parse(
    await fs.readFile(
      path.join(site, '.vitepress/theme/demo-data.json'),
      'utf8',
    ),
  );
  async function assertDemo(mode, step) {
    await expect(
      page.locator('.demo-route-options [aria-pressed=true]'),
    ).toHaveText(
      {
        web: '网页购物',
        explore: 'Agent 先比较再购买',
        quick: 'Agent 按约束直接生单',
      }[mode],
    );
    await expect(page.locator('.step-nav [aria-current=step]')).toHaveText(
      `${step + 1}. ${demos[mode].steps[step].name}`,
    );
  }
  await visit(base + '/demo.html?route=web&step=0');
  await assertDemo('web', 0);
  for (const mode of ['web', 'explore', 'quick', 'web']) {
    await page
      .locator('.demo-route-options button')
      .nth(['web', 'explore', 'quick'].indexOf(mode))
      .click();
    await assertDemo(mode, 0);
    for (let step = 1; step < demos[mode].steps.length; step++) {
      await page.locator('.step-nav button').nth(step).click();
      await assertDemo(mode, step);
      await refresh();
      await assertDemo(mode, step);
      await page.locator('.step-nav button').nth(step).click();
      await page.goBack();
      await assertDemo(mode, step - 1);
      await page.goForward();
      await assertDemo(mode, step);
    }
  }
  await page
    .getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('link', { name: '项目展示', exact: true })
    .click();
  await assertDemo('web', 0);
  await visit(base + '/presentation.html?slide=authorization');
  const visited = [];
  for (const chapter of data.chapters) {
    await page
      .locator('#showcase-menu > a[href$="slide=' + chapter.ids[0] + '"]')
      .click();
    for (const id of chapter.ids) {
      await page
        .locator('.presentation-screens a[href$="slide=' + id + '"]')
        .click();
      await expect(
        page.locator('.presentation-screens [aria-current=step]'),
      ).toHaveText(data.slides.find((s) => s.id === id).nav);
      await refresh();
      await expect(
        page.locator('.presentation-screens [aria-current=step]'),
      ).toHaveText(data.slides.find((s) => s.id === id).nav);
      visited.push(id);
    }
  }
  for (const id of visited.slice(0, -1).reverse()) {
    await page.goBack();
    await expect(
      page.locator('.presentation-screens [aria-current=step]'),
    ).toHaveText(data.slides.find((s) => s.id === id).nav);
  }
  for (const id of visited.slice(1)) {
    await page.goForward();
    await expect(
      page.locator('.presentation-screens [aria-current=step]'),
    ).toHaveText(data.slides.find((s) => s.id === id).nav);
  }
  let checkedDocuments = 0;
  for (const doc of documents) {
    const catalog =
      doc.group === '历史记录'
        ? '/history.html'
        : doc.group === '现行规范'
          ? '/specs.html'
          : '/library.html';
    await visit(base + catalog);
    await page
      .locator('.library-section a[href="/read/' + doc.slug + '.html"]')
      .click();
    await expect(page).toHaveURL(base + '/read/' + doc.slug + '.html');
    await page.waitForFunction(
      () => !document.querySelector('.mermaid-source:not(.diagram-error)'),
    );
    await expect(page.locator('.diagram-error')).toHaveCount(0);
    if (doc.group === '历史记录')
      await expect(page.locator('.history-notice')).toBeVisible();
    const heading = await page
      .locator('.source-document h1, .source-document h2')
      .first()
      .textContent();
    await refresh();
    await expect(
      page.locator('.source-document h1, .source-document h2').first(),
    ).toHaveText(heading);
    if (['checkout', 'decisions', 'requirements'].includes(doc.slug)) {
      const toc = page.locator('.reading-toc a').last();
      const hash = await toc.getAttribute('href');
      await toc.click();
      await expect
        .poll(() => decodeURIComponent(new URL(page.url()).hash))
        .toBe(hash);
      await page.goBack();
      await expect(page).toHaveURL(base + '/read/' + doc.slug + '.html');
      await page.goForward();
      await expect
        .poll(() => decodeURIComponent(new URL(page.url()).hash))
        .toBe(hash);
      await page.goBack();
    }
    await page.goBack();
    await expect(page).toHaveURL(base + catalog);
    await expect(page.locator('.library-section').first()).toBeVisible();
    await page.goForward();
    await expect(
      page.locator('.source-document h1, .source-document h2').first(),
    ).toHaveText(heading);
    checkedDocuments++;
    if (checkedDocuments % 25 === 0)
      console.log(
        `Navigation checked: ${checkedDocuments}/${documents.length} documents`,
      );
  }
  await visit(base + '/');
  await page.getByRole('link', { name: '开始产品 Demo →' }).click();
  await page.locator('.step-nav button').last().click();
  await page.getByRole('button', { name: '继续：Agent 购物 →' }).click();
  await page.locator('.step-nav button').last().click();
  await page.getByRole('button', { name: '继续：直接生单 →' }).click();
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
  await refresh();
  await page.locator('.reading-rail .return-demo').click();
  await expect(
    page.locator('.presentation-screens [aria-current=step]'),
  ).toHaveText(data.slides.at(-1).nav);
  for (const id of ['authorization', 'architecture', 'workflow']) {
    await visit(base + '/presentation.html?slide=' + id);
    await page
      .locator('.presentation-evidence a[href^="/read/"]')
      .first()
      .scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => scrollY);
    await page
      .locator('.presentation-evidence a[href^="/read/"]')
      .first()
      .click();
    await page
      .locator('.VPSidebar')
      .getByRole('link', { name: '完整文档', exact: true })
      .click();
    await refresh();
    await page.locator('.reading-rail .return-demo').click();
    await expect(
      page.locator('.presentation-screens [aria-current=step]'),
    ).toHaveText(data.slides.find((s) => s.id === id).nav);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(y);
  }
  for (const [url, entry] of Object.entries(legacyRoutes)) {
    for (const [hash, target] of Object.entries(entry.hashes || {})) {
      await visit(base + url + '?from=quick-1#' + hash);
      await page.waitForURL(
        (u) =>
          u.pathname === new URL(target, base).pathname &&
          u.searchParams.get('from') === 'quick-1' &&
          [...new URL(target, base).searchParams].every(
            ([key, value]) => u.searchParams.get(key) === value,
          ) &&
          u.hash === new URL(target, base).hash,
      );
    }
  }
  await visit(base + '/presentation.html?slide=architecture');
  await page.locator('.presentation-controls button').last().click();
  await page.goBack();
  await expect(
    page.locator('.presentation-screens [aria-current=step]'),
  ).toHaveText(data.slides.find((s) => s.id === 'architecture').nav);
  await page.goForward();
  await expect(
    page.locator('.presentation-screens [aria-current=step]'),
  ).toHaveText(data.slides.find((s) => s.id === 'frontend').nav);
  // Exercise the migrated route and both clipboard outcomes in a real browser.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await visit(base + '/');
  await page
    .getByRole('button', { name: '复制 MCP 地址', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('https://agent-ready-store-api.vercel.app/mcp');
  await visit(base + '/demo.html?route=explore&step=1');
  await expect(page.locator('.step-nav [aria-current=step]')).toContainText(
    '明确加购',
  );
  const prompt = await page.locator('.copy-text textarea').inputValue();
  await page.getByRole('button', { name: '复制这段指令', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(prompt);
  await refresh();
  await expect(page.locator('.step-nav [aria-current=step]')).toContainText(
    '明确加购',
  );
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await page.goBack();
  await expect(page.locator('.step-nav [aria-current=step]')).toContainText(
    '明确加购',
  );
  await page.goForward();
  await expect(page.locator('.step-nav [aria-current=step]')).toContainText(
    '明确购买',
  );
  await page.locator('.reading-bridge a').click();
  await refresh();
  await page.locator('.reading-rail .return-demo').click();
  await expect(page.locator('.step-nav [aria-current=step]')).toContainText(
    '明确购买',
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: async () => {
        throw new DOMException('Denied', 'NotAllowedError');
      },
      configurable: true,
    }),
  );
  await page.getByRole('button', { name: '复制这段指令', exact: true }).click();
  await expect(page.locator('.copy-text [role=status]')).toContainText(
    '请手动复制',
  );
  await expect(page.locator('.copy-text textarea')).toBeFocused();
  const selected = await page
    .locator('.copy-text textarea')
    .evaluate((el) => el.selectionEnd - el.selectionStart === el.value.length);
  if (!selected) throw Error('Clipboard fallback did not select the prompt');
  await visit(base + '/demo.html?route=unknown&step=99');
  await expect(page.locator('.step-nav [aria-current=step]')).toContainText(
    '浏览商品',
  );
  await page
    .getByRole('group', { name: '演示路线' })
    .getByRole('button', { name: 'Agent 按约束直接生单' })
    .click();
  await expect(page).toHaveURL(/route=quick&step=0/);
  await refresh();
  await expect(
    page.getByRole('button', { name: 'Agent 按约束直接生单' }),
  ).toHaveAttribute('aria-pressed', 'true');
  for (const width of [1440, 1024, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [
      '/',
      '/demo.html?route=explore&step=0',
      '/demo.html?route=quick&step=0',
      '/library.html',
      '/history.html',
      '/read/checkout.html',
      ...data.slides.map((s) => '/presentation.html?slide=' + s.id),
    ]) {
      await visit(base + url);
      if (url.includes('presentation'))
        await expect(page.locator('.presentation-page')).toBeVisible();
      if (url.includes('presentation') || url.includes('demo.html')) {
        await expect(page.locator('.presentation-chapters')).toHaveCount(0);
        if (url.includes('presentation')) {
          const colors = await page
            .locator('.presentation-screens [aria-current]')
            .evaluate((el) => {
              const style = getComputedStyle(el);
              return [style.color, style.backgroundColor];
            });
          if (colors[0] === colors[1])
            throw Error('Current screen label is invisible');
        }
        if (width === 390) {
          await expect(page.locator('#showcase-menu')).toBeHidden();
          await page.getByRole('button', { name: /展示目录/ }).click();
          await expect(page.locator('#showcase-menu')).toBeVisible();
          if (url.includes('presentation')) {
            await page.locator('.presentation-screens a').first().click();
            await expect(page.locator('#showcase-menu')).toBeHidden();
          }
        }
      }
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error('Page overflow: ' + width + ' ' + url);
      if (
        ['/library.html', '/history.html', '/read/checkout.html'].includes(
          url,
        ) &&
        width >= 768
      ) {
        await expect(page.locator('.reading-rail')).toBeVisible();
        await expect(page.locator('.reading-mobile-tools')).toBeHidden();
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await visit(base + '/');
  await page.getByRole('button', { name: 'mobile navigation' }).click();
  await page
    .locator('.VPNavScreen')
    .getByRole('link', { name: '文档目录', exact: true })
    .click();
  await expect(page).toHaveURL(base + '/library.html');
  await expect(
    page.getByRole('button', { name: 'mobile navigation' }),
  ).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: '文档导航', exact: true }).click();
  await page
    .locator('.VPSidebar')
    .getByRole('link', { name: '交易核心设计', exact: true })
    .click();
  await expect(page).toHaveURL(base + '/read/checkout.html');
  await expect(page.locator('.VPSidebar')).not.toHaveClass(/open/);
  await page.locator('.reading-mobile-tools summary').click();
  await page.locator('.reading-mobile-tools nav a').last().click();
  await expect(
    page.locator('.reading-mobile-tools details'),
  ).not.toHaveAttribute('open');
  await refresh();
  await expect(
    page.locator('.source-document h1, .source-document h2').first(),
  ).toBeAttached();
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
