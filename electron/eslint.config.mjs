import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';

/**
 * Main process: strict TypeScript via `tsc -b` only. Typed ESLint on all of `src/main` hits hundreds
 * of `any`/INI false positives; the main bundle is still fully typechecked.
 */
const nodeTsGlobs = ['electron.vite.config.ts', 'src/preload/**/*.ts', 'src/shared/**/*.ts'];

const sharedRules = {
  '@typescript-eslint/ban-ts-comment': [
    'error',
    {
      'ts-ignore': true,
      'ts-nocheck': true,
      'ts-check': true,
      minimumDescriptionLength: 10,
    },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': [
    'error',
    { checksVoidReturn: { attributes: false } },
  ],
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-unnecessary-condition': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/no-deprecated': 'off',
  'no-console': ['error', { allow: ['warn', 'error'] }],
  'no-debugger': 'error',
  eqeqeq: ['error', 'always'],
  curly: ['error', 'all'],
};

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

export default tseslint.config(
  {
    ignores: [
      'dist',
      'out',
      'node_modules',
      'eslint.config.mjs',
      'notarize.cjs',
      'src/main/**',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
  },
  {
    files: nodeTsGlobs,
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: sharedRules,
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-hooks/incompatible-library': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'off',
      ...reactRefresh.configs.vite.rules,
      ...sharedRules,
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },
);
