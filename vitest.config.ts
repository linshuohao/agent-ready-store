import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'apps/api/test/**/*.test.ts',
      'apps/web/test/**/*.test.ts',
      'apps/mcp-app/test/**/*.test.ts',
      'packages/commerce-ui/test/**/*.test.ts',
      'packages/contracts/test/**/*.test.ts',
    ],
    testTimeout: 15000,
  },
});
