import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sourceLinks } from './source-links.mjs';
test('source links distinguish omitted material from mistakes and preserve URL context', async () => {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), 'docs-sources-')),
  );
  try {
    await fs.mkdir(path.join(root, 'docs'));
    await fs.writeFile(path.join(root, 'docs/omitted.md'), 'omitted');
    await fs.mkdir(path.join(root, 'apps'));
    await fs.writeFile(path.join(root, 'apps/current.ts'), 'export {};');
    const resolve = sourceLinks({
      root,
      doc: { source: 'docs/source.md', group: '技术设计' },
      mapping: new Map([['docs/target.md', '/read/target.html']]),
      legacyRoutes: {},
      revision: 'abc',
      retiredLink: () => null,
    });
    assert.equal(
      resolve('target.md?view=full#section'),
      '/read/target.html?view=full#section',
    );
    assert.equal(resolve('omitted.md'), null);
    assert.equal(resolve('../references/private.md'), null);
    assert.equal(resolve('/private/tmp/probe.png'), null);
    assert.throws(() => resolve('typo.md'), /Missing source link/);
    assert.throws(() => resolve('../apps/missing.ts'), /Missing source link/);
    assert.match(resolve('../apps/current.ts'), /blob\/abc\/apps\/current.ts$/);
    await fs.symlink(os.tmpdir(), path.join(root, 'outside'));
    assert.throws(() => resolve('../outside'), /Symlink escape/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('moved documentation sources preserve legacy routes and historical source references', async () => {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), 'docs-moved-')),
  );
  try {
    await fs.mkdir(path.join(root, 'docs/design'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs/design/README.md'), 'design');
    const resolve = sourceLinks({
      root,
      doc: { source: 'README.md', group: '交付' },
      mapping: new Map(),
      legacyRoutes: {
        '/presentation/index.html': {
          default: '/demo.html',
          hashes: { architecture: '/presentation.html?slide=architecture' },
        },
      },
      revision: 'abc',
      retiredLink: () => null,
    });
    assert.equal(
      resolve('docs/presentation/index.html#architecture'),
      '/presentation.html?slide=architecture',
    );
    assert.equal(
      resolve('presentation/index.html#architecture'),
      '/presentation.html?slide=architecture',
    );
    assert.equal(resolve('design/README.md'), null);
    assert.equal(resolve('docs/design/README.md'), null);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
