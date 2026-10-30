import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  realpath,
  mkdir,
  copyFile,
  writeFile,
  readFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

async function fixture(t, mode, fail = '') {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'store-local-test-')),
  );
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'bin'));
  await mkdir(join(root, 'apps/api/dist'), { recursive: true });
  await copyFile(
    new URL('./local.mjs', import.meta.url),
    join(root, 'scripts/local.mjs'),
  );
  await writeFile(
    join(root, 'apps/api/dist/main.js'),
    'setInterval(() => {}, 1000);',
  );
  await writeFile(join(root, '.env'), 'WEB_PORT=4310\nAPI_PUBLIC_PORT=4312\n');
  await writeFile(
    join(root, 'bin/pnpm'),
    `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify({args, pid: process.pid, catalog: process.env.CATALOG_PATH}) + '\\n');
if (args.includes(process.env.FAIL_COMMAND)) process.exit(7);
if (args.includes('dev') || args.includes('start')) setInterval(() => {}, 1000);
`,
    { mode: 0o755 },
  );
  const log = join(root, 'calls.jsonl');
  const child = spawn(process.execPath, ['scripts/local.mjs', mode], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${join(root, 'bin')}:${process.env.PATH}`,
      CALL_LOG: log,
      FAIL_COMMAND: fail,
    },
    stdio: 'ignore',
  });
  const exited = new Promise((resolve) =>
    child.on('exit', (code) => resolve(code)),
  );
  t.after(async () => {
    if (child.exitCode === null) child.kill('SIGTERM');
    await exited;
    await rm(root, { recursive: true, force: true });
  });
  async function calls() {
    try {
      return (await readFile(log, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(JSON.parse);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }
  return { child, exited, calls, root };
}

test('failed initialization exits nonzero without seed or watchers', async (t) => {
  const f = await fixture(t, 'db:seed', 'db:generate');
  assert.equal(await f.exited, 7);
  assert.deepEqual(
    (await f.calls()).map((call) => call.args.at(-1)),
    ['db:generate'],
  );
});

test('seed prepares only API prerequisites and resolves catalog from root', async (t) => {
  const f = await fixture(t, 'db:seed');
  assert.equal(await f.exited, 0);
  const calls = await f.calls();
  assert.deepEqual(
    calls.map((call) => call.args.slice(-2)),
    [
      ['@store/api', 'db:generate'],
      ['@store/contracts', 'build'],
      ['@store/api', 'compile'],
      ['@store/api', 'db:seed'],
    ],
  );
  assert(
    calls.every(
      (call) => call.catalog === join(f.root, 'references/products.json'),
    ),
  );
});

test('production start does not build or migrate and termination stops children', async (t) => {
  const f = await fixture(t, 'start');
  let calls = [];
  for (let i = 0; i < 100; i++) {
    calls = await f.calls();
    if (calls.length === 2) break;
    await delay(20);
  }
  assert.equal(calls.length, 2);
  assert(calls.every((call) => call.args.includes('start')));
  f.child.kill('SIGTERM');
  assert.equal(await f.exited, 143);
  for (const { pid } of calls)
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
});
