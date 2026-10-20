import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      '.features-gen',
      'playwright-report',
      'test-results',
      'allure-results',
      'allure-report',
      'painel-dist',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // front-end do PixBank roda no navegador; k6 e scripts têm seus próprios globais
    files: ['app/web/**/*.js'],
    languageOptions: { globals: globals.browser, sourceType: 'script' },
  },
  {
    files: ['perf/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly' } },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['steps/**/*.ts', 'pages/**/*.ts', 'pixbank/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    rules: {
      // fixtures do Playwright exigem destructuring vazio: async ({}, use) => ...
      'no-empty-pattern': 'off',
      // o ctx do cenário é preenchido nos passos anteriores
      '@typescript-eslint/no-non-null-assertion': 'off',
      // no BDD, os expects ficam nos steps, fora do test()
      'playwright/no-standalone-expect': 'off',
    },
  },
);