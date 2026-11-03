import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import { baseConfig } from '../../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
]);
