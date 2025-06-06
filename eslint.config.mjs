import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,cjs,mjs,ts,cts,mts}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      js,
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      'eol-last': ['error', 'always'],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...tseslint.configs.recommended,
  },
  {
    rules: {
      ...prettier.rules,
    },
  },
]);
