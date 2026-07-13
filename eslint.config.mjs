import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

const sourceFiles = ['**/*.{js,cjs,mjs,ts,cts,mts,tsx}'];
const typescriptFiles = ['**/*.{ts,cts,mts,tsx}'];

export default defineConfig([
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,cjs,mjs}'],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: typescriptFiles,
  })),
  {
    files: typescriptFiles,
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: sourceFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'eol-last': ['error', 'always'],
    },
  },
  {
    files: sourceFiles,
    rules: {
      ...prettier.rules,
    },
  },
]);
