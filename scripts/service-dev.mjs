import { spawnSync, spawn } from 'node:child_process';
const app = process.argv[2];
for (const name of [
  'contracts',
  ...(app === 'api' ? ['api', 'mcp-app'] : []),
]) {
  const build = spawnSync('pnpm', ['--filter', `@store/${name}`, 'build'], {
    stdio: 'inherit',
  });
  if (build.status) process.exit(build.status);
}
const jobs =
  app === 'api'
    ? [
        ['--filter', '@store/contracts', 'dev'],
        [
          '--filter',
          '@store/api',
          'exec',
          'tsc',
          '-p',
          'tsconfig.build.json',
          '--watch',
          '--preserveWatchOutput',
        ],
        [
          '--filter',
          '@store/api',
          'exec',
          'node',
          '--watch',
          '--watch-preserve-output',
          'dist/main.js',
        ],
      ]
    : [['--filter', '@store/web', 'dev', '--hostname', '0.0.0.0']];
const children = jobs.map((args) => spawn('pnpm', args, { stdio: 'inherit' }));
const stop = () => children.forEach((child) => child.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach((child) =>
  child.on('exit', (code) => {
    stop();
    if (code) process.exitCode = code;
  }),
);
