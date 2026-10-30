import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
if (existsSync('.env')) process.loadEnvFile('.env');
const mode = process.argv[2];
const env = {
  ...process.env,
  HOST: process.env.HOST ?? '127.0.0.1',
  PORT: process.env.API_PUBLIC_PORT ?? '3002',
  CATALOG_PATH: resolve(
    root,
    process.env.CATALOG_PATH ?? 'references/products.json',
  ),
  API_INTERNAL_URL:
    process.env.API_INTERNAL_URL ??
    `http://127.0.0.1:${process.env.API_PUBLIC_PORT ?? '3002'}`,
};
const commands = {
  build: [['pnpm', ['build:apps']]],
  dev: [
    ['node', ['scripts/service-dev.mjs', 'api']],
    [
      'pnpm',
      [
        '--filter',
        '@store/web',
        'dev',
        '--hostname',
        '127.0.0.1',
        '--port',
        process.env.WEB_PORT ?? '3000',
      ],
    ],
  ],
  start: [
    ['pnpm', ['--filter', '@store/api', 'start']],
    [
      'pnpm',
      [
        '--filter',
        '@store/web',
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        process.env.WEB_PORT ?? '3000',
      ],
    ],
  ],
  'db:generate': [['pnpm', ['--filter', '@store/api', 'db:generate']]],
  'db:migrate': [['pnpm', ['--filter', '@store/api', 'db:migrate']]],
  'db:seed': [['pnpm', ['--filter', '@store/api', 'db:seed']]],
};
if (!Object.hasOwn(commands, mode))
  throw new Error(`Unknown local command: ${mode}`);
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}
for (const [command, args] of commands[mode]) {
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    detached: true,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code, signal) => stop(code ?? (signal ? 1 : 0)));
}
process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));
