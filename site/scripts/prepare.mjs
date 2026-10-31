import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { sourceLinks } from './source-links.mjs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import MarkdownIt from 'markdown-it';
import { documents } from '../content-manifest.mjs';
import { legacyRoutes } from '../legacy-routes.mjs';
const site = path.resolve(import.meta.dirname, '..'),
  root = path.resolve(site, '..'),
  out = path.join(site, '.generated');
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
await fs.cp(path.join(site, '.vitepress'), path.join(out, '.vitepress'), {
  recursive: true,
});
await fs.copyFile(
  path.join(site, 'content-manifest.mjs'),
  path.join(out, 'content-manifest.mjs'),
);
await fs.cp(path.join(site, 'pages'), out, { recursive: true });
await fs.mkdir(path.join(out, 'public/assets'), { recursive: true });
for (const asset of ['store.png', 'product.png']) {
  const source = path.join(site, 'assets', asset);
  if (realpathSync(source) !== source) throw Error('Symlink asset: ' + asset);
  await fs.copyFile(source, path.join(out, 'public/assets', asset));
}
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
const retiredLinks = new Map();
function retiredLink(file) {
  if (retiredLinks.has(file)) return retiredLinks.get(file);
  const candidates = execFileSync(
    'git',
    ['log', '--format=%H', revision, '--', file],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean);
  for (const commit of candidates) {
    try {
      execFileSync('git', ['cat-file', '-e', commit + ':' + file], {
        cwd: root,
        stdio: 'ignore',
      });
      const url = `https://github.com/linshuohao/agent-ready-store/blob/${commit}/${file}`;
      retiredLinks.set(file, url);
      return url;
    } catch {
      /* A deletion commit has no blob; inspect the preceding file revision. */
    }
  }
  return null;
}
const mapping = new Map(
  documents.map((d) => [d.source, `/read/${d.slug}.html`]),
);
for (const doc of documents) {
  if (doc.source.startsWith('openspec/changes/archive/')) {
    const previous = doc.source.replace(
      /changes\/archive\/\d{4}-\d{2}-\d{2}-/,
      'changes/',
    );
    mapping.set(previous, `/read/${doc.slug}.html`);
  }
}
for (const [url, entry] of Object.entries(legacyRoutes))
  mapping.set(url.slice(1), entry.default);
mapping.set('openspec/specs/', '/specs.html');
mapping.set('openspec/changes/archive/', '/history.html');
const md = new MarkdownIt({ html: true });
// Preserve document markup, but render placeholders such as <id> as text.
for (const kind of ['html_inline', 'html_block'])
  md.renderer.rules[kind] = (tokens, i) =>
    tokens[i].content.replace(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g, (tag, name) =>
      [
        'a',
        'details',
        'summary',
        'br',
        'p',
        'div',
        'span',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'strong',
        'em',
        'code',
        'pre',
        'ul',
        'ol',
        'li',
        'blockquote',
        'hr',
        'sup',
        'sub',
      ].includes(name.toLowerCase())
        ? tag
        : md.utils.escapeHtml(tag),
    );
const original = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, i, options, env, self) =>
  tokens[i].info.trim() === 'mermaid'
    ? `<pre class="mermaid-source">${md.utils.escapeHtml(tokens[i].content)}</pre>`
    : original(tokens, i, options, env, self);
for (const doc of documents) {
  const source = path.resolve(root, doc.source);
  if (
    !source.startsWith(root + path.sep) ||
    doc.source.startsWith('references/')
  )
    throw Error('Forbidden source');
  if ((await fs.realpath(source)) !== source) throw Error('Symlink source');
  const raw = await fs.readFile(source, 'utf8'),
    tokens = md.parse(raw, {}),
    ids = new Map(),
    headings = [];
  for (let i = 0; i < tokens.length; i++)
    if (tokens[i].type === 'heading_open') {
      const title = tokens[i + 1].content;
      let id = title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .trim()
        .replace(/\s/g, '-');
      const n = ids.get(id) || 0;
      ids.set(id, n + 1);
      if (n) id += '-' + n;
      tokens[i].attrSet('id', id);
      if (['h2', 'h3'].includes(tokens[i].tag)) headings.push({ title, id });
    }
  const target = sourceLinks({
    root,
    doc,
    mapping,
    legacyRoutes,
    revision,
    retiredLink,
  });
  for (const t of tokens) {
    for (const c of t.children || []) {
      if (c.type === 'link_open') {
        const url = target(c.attrGet('href'));
        if (url) c.attrSet('href', url);
        else {
          c.attrSet('href', '#not-in-slice');
          c.attrSet('title', '此材料未纳入本次本地阅读范围');
        }
      }
      if (c.type === 'image')
        throw Error('Image requires explicit asset inclusion: ' + doc.source);
    }
  }
  let html = md.renderer
    .render(tokens, md.options, {})
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/g, (block) =>
      block.replace(/\n/g, '&#10;'),
    );
  html = html.replace(
    /<a\b([^>]*?)href="([^"]+)"([^>]*)>/g,
    (all, b, url, a) => {
      if (
        url.startsWith('/') ||
        url.startsWith('#') ||
        url.startsWith('https:')
      )
        return all;
      const dest = target(url);
      return dest
        ? `<a${b}href="${dest}"${a}>`
        : `<a${b}href="#not-in-slice" title="此材料未纳入本次本地阅读范围"${a}>`;
    },
  );
  // Unincluded links remain explicit scope notes, not a silent homepage fallback.
  const compatibility =
    doc.source === 'docs/product/archive/2026-10-31-REQUIREMENTS.md'
      ? '<a id="33-后续增强human-具体授权后的-agent-代提交"></a>'
      : '';
  if (compatibility)
    html = html.replace('<h3 id="33-', compatibility + '<h3 id="33-');
  const related = documents.filter((d) => d.current === doc.slug);
  const historyLinks = related.length
    ? '<details class="scope-note"><summary>追溯此规范的历史变更（' +
      related.length +
      '）</summary>' +
      related
        .map(
          (d) =>
            '<p><a href="/read/' +
            d.slug +
            '.html">' +
            md.utils.escapeHtml(d.section) +
            '</a></p>',
        )
        .join('') +
      '</details>'
    : '';
  const body = `---\ntitle: ${doc.title}\noutline: false\n---\n<ReadingTools source="${doc.source}" role="${doc.role}" current="${doc.current || ''}" historical="${doc.group === '历史记录' ? 'yes' : ''}" />\n\n<div v-pre class="source-document">${html}</div>
${historyLinks}\n\n<div id="not-in-slice" class="scope-note">此链接的目标尚未迁入文档站，或属于不分发的原件。可从文档目录继续阅读已接入材料。代码链接指向构建版本的 GitHub；历史已删除文件指向最后可定位的历史版本，可能需要仓库权限。</div>\n`;
  await fs.mkdir(path.join(out, 'read'), { recursive: true });
  await fs.writeFile(path.join(out, 'read', doc.slug + '.md'), body);
}
await fs.writeFile(
  path.join(out, 'public/build-info.json'),
  JSON.stringify(
    { revision, sources: documents.map((d) => d.source) },
    null,
    2,
  ),
);
console.log('Prepared', documents.length, 'allowlisted source documents');

const groups = [
  '产品与需求',
  '技术设计',
  'AI 工程',
  '交付与证据',
  '现行规范',
  '历史记录',
];
const esc = md.utils.escapeHtml;
const list = (items) =>
  '<ul>' +
  items
    .map(
      (d) =>
        `<li><a href="/read/${d.slug}.html">${esc(d.title)}<span aria-hidden="true">→</span></a><p>${esc(d.role)}</p></li>`,
    )
    .join('') +
  '</ul>';
async function page(name, title, intro, sections) {
  let heading = 0;
  sections = sections.replace(
    /<h2>/g,
    () => '<h2 id="catalog-' + heading++ + '">',
  );
  await fs.writeFile(
    path.join(out, name + '.md'),
    `---\nlayout: doc\noutline: false\ntitle: ${title}\n---\n<div class="hub-home library-page"><p class="kicker">AGENT / STORE · 项目文档</p><h1>${title}</h1><p class="home-lead">${intro}</p>${sections}</div>`,
  );
}
await page(
  'library',
  '从产品体验，深入设计与实现。',
  '正文来自仓库同一份文档。当前方案、正式规范和历史记录分别组织；历史批准与验收仅代表原记录时点。',
  groups
    .map(
      (g, i) =>
        `<section class="library-section"><div class="section-label"><span>0${i + 1}</span><h2>${g}</h2></div>${g === '历史记录' ? '<div><a href="/history.html">按变更与时间阅读历史归档 →</a><p>设计快照、变更提案、实施与验收、历史规格差异。</p></div>' : list(documents.filter((d) => d.group === g))}</section>`,
    )
    .join(''),
);
await page(
  'specs',
  '现行正式规范',
  '这里展示 openspec/specs 中的当前完整规范。归档 Change 中的差异只用于追溯，不能替代这里的现行契约。',
  `<section class="library-section"><div class="section-label"><h2>行为与边界</h2></div>${list(documents.filter((d) => d.group === '现行规范'))}</section>`,
);
const sections = [
  ...new Set(
    documents.filter((d) => d.group === '历史记录').map((d) => d.section),
  ),
]
  .sort()
  .reverse();
await page(
  'history',
  '历史记录与方案演进',
  '以下材料按原记录保留，包含已替代的设计及当时的 Pending 状态。判断当前行为请阅读现行规范；实施事实请结合交付状态。',
  '<div class="home-actions"><a href="/specs.html">现行规范 →</a><a href="/read/delivery-status.html">当前交付状态 →</a></div>' +
    sections
      .map(
        (g) =>
          `<section class="library-section"><div class="section-label"><h2>${esc(g)}</h2></div>${list(documents.filter((d) => d.section === g))}</section>`,
      )
      .join(''),
);
// Static legacy paths keep the incoming query and heading; no external redirect targets.
const aliases = {
  ...Object.fromEntries(
    documents.map((d) => [
      '/' + d.source.replace(/\.md$/, '.html'),
      { default: '/read/' + d.slug + '.html', preserveHash: true },
    ]),
  ),
  ...legacyRoutes,
  '/openspec/specs/index.html': { default: '/specs.html' },
  '/openspec/changes/archive/index.html': { default: '/history.html' },
};
for (const [old, entry] of Object.entries(aliases)) {
  const file = path.join(out, 'public', old);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const code = `const entry=${JSON.stringify(entry)};const incoming=new URL(location.href);const hash=decodeURIComponent(incoming.hash.slice(1));const target=new URL((entry.hashes||{})[hash]||entry.default,location.origin);for(const [key,value] of incoming.searchParams){if(['from','route','step'].includes(key))target.searchParams.set(key,value);}if(entry.preserveHash)target.hash=incoming.hash;location.replace(target.pathname+target.search+target.hash);`;
  await fs.writeFile(
    file,
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>入口已迁移</title><p>此材料已迁入文档站。<a href="${entry.default}">继续阅读</a></p><script>${code}</script></html>`,
  );
}
console.log(
  'Generated grouped catalogues and',
  Object.keys(aliases).length,
  'legacy routes',
);
