import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dist = path.resolve(import.meta.dirname, '../dist');
async function files(dir) {
  let all = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw Error('Symlink output ' + p);
    if (e.isDirectory()) all.push(...(await files(p)));
    else all.push(p);
  }
  return all;
}
export async function check(root) {
  const list = await files(root),
    errors = [];
  for (const p of list) {
    if (
      /(?:^|\/)(?:references|\.git|\.env(?:\.[^/]*)?)(?:\/|$)/.test(
        path.relative(root, p),
      )
    )
      errors.push('Forbidden output ' + p);
    if (!p.endsWith('.html')) continue;
    const html = await fs.readFile(p, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const raw = m[1].replaceAll('&amp;', '&');
      if (/^(https?:|mailto:|data:)/.test(raw)) continue;
      const url = new URL(raw, 'http://local/' + path.relative(root, p));
      let target = path.join(root, decodeURIComponent(url.pathname));
      if (url.pathname.endsWith('/')) target += 'index.html';
      if (!target.startsWith(root + path.sep)) {
        errors.push('Escaped path');
        continue;
      }
      try {
        const stat = await fs.stat(target);
        if (!stat.isFile()) throw Error('not file');
        if (url.hash && target.endsWith('.html')) {
          const body = await fs.readFile(target, 'utf8');
          const id = decodeURIComponent(url.hash.slice(1));
          if (!body.includes('id="' + id + '"'))
            errors.push(path.relative(root, p) + ' -> missing anchor ' + raw);
        }
      } catch {
        errors.push(path.relative(root, p) + ' -> missing ' + raw);
      }
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
  return list.length;
}
console.log(
  'Validated',
  await check(dist),
  'output files and local links/anchors',
);
if (process.argv.includes('--negative')) {
  const temp = await fs.mkdtemp('/tmp/docs-link-check-');
  try {
    await fs.writeFile(
      path.join(temp, 'index.html'),
      '<a href="#missing">bad</a>',
    );
    await assert.rejects(check(temp), /missing anchor/);
    await fs.writeFile(
      path.join(temp, 'index.html'),
      '<a href="missing.html">bad</a>',
    );
    await assert.rejects(check(temp), /missing/);
    await fs.writeFile(path.join(temp, '.env.local'), 'TEST_ONLY');
    await assert.rejects(check(temp), /Forbidden output/);
    await fs.rm(path.join(temp, '.env.local'));
    await fs.symlink(
      path.join(temp, 'index.html'),
      path.join(temp, 'linked.html'),
    );
    await assert.rejects(check(temp), /Symlink output/);
    console.log(
      'Broken anchors, missing targets, forbidden files and symlink counterexamples rejected',
    );
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
