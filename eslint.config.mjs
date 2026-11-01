import js from '@eslint/js';
import ts from 'typescript-eslint';
export const baseConfig = ts.config(
  {
    ignores: [
      '**/dist/**',
      '**/generated/**',
      '**/.next/**',
      '**/node_modules/**',
      '.pnpm-store/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
);

export default baseConfig;
