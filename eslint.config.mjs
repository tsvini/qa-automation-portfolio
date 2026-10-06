import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      '.features-gen',
      'playwright-report',
      'test-results',
      'allure-results',
      'allure-report',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['steps/**/*.ts', 'pages/**/*.ts'],
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