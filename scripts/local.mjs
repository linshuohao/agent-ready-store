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
    ['pnpm', ['--filter', '@store/contracts', 'dev']],
    ['pnpm', ['--filter', '@store/api', 'dev']],
    ['node', ['--watch', '--watch-preserve-output', 'apps/api/dist/main.js']],
    ['pnpm', ['--filter', '@store/mcp-app', 'dev']],
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
if (mode !== 'build' && !process.env.DATABASE_URL) {
  console.error(
    '缺少 DATABASE_URL。请按 README「本机开发」配置根目录 .env；若数据库由 Docker 提供，先运行 pnpm db:up。不要覆盖已有密钥。',
  );
  process.exit(1);
}

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
// Only local development/seed prepare compiler outputs. Production start never builds.
const prepare =
  mode === 'dev' || mode === 'db:seed'
    ? [
        ['--filter', '@store/api', 'db:generate'],
        ['--filter', '@store/contracts', 'build'],
        ['--filter', '@store/api', 'compile'],
        ...(mode === 'dev' ? [['--filter', '@store/mcp-app', 'build']] : []),
      ]
    : [];
process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));
for (const args of prepare) {
  const code = await new Promise((resolve) => {
    const child = spawn('pnpm', args, {
      cwd: root,
      env,
      stdio: 'inherit',
      detached: true,
    });
    children.push(child);
    child.on('error', (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.on('exit', (code, signal) => {
      children.splice(children.indexOf(child), 1);
      resolve(code ?? (signal ? 1 : 0));
    });
  });
  if (code || stopping) {
    stop(code || process.exitCode);
    break;
  }
}
for (const [command, args] of stopping ? [] : commands[mode]) {
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
