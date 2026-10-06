import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const CI = !!process.env.CI;

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.ts',
  examplesTitleFormat: '<caso>',
});

// Testes visuais só rodam no CI (Linux), onde ficam as imagens de referência.
const ignorarLocalmente = CI ? [] : [/@visual/];

// Acessibilidade analisa o HTML, que é igual em qualquer navegador:
// roda só no Chromium para não repetir a mesma análise.
const ignorarForaDoChromium = [/@a11y/, ...ignorarLocalmente];

export default defineConfig({
  testDir,
  fullyParallel: true,
  timeout: 60_000,
  retries: CI ? 1 : 0,
  workers: CI ? 4 : '50%',
  grepInvert: ignorarLocalmente,
  snapshotPathTemplate: 'snapshots/{arg}-{projectName}-{platform}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: false,
        suiteTitle: false,
        environmentInfo: {
          Projeto: 'QA Automation Portfolio',
          Autor: 'Vinícius Torales',
          Navegadores: CI ? 'Chromium, Firefox, WebKit' : 'Chromium, Firefox',
          Node: process.version,
          SO: process.platform,
        },
      },
    ],
  ],
  use: {
    baseURL: 'https://www.saucedemo.com',
    testIdAttribute: 'data-test',
    // No CI tudo é gravado para o Allure; localmente, só quando falha.
    trace: CI ? 'on' : 'retain-on-failure',
    video: CI ? 'on' : 'retain-on-failure',
    screenshot: 'on',
  },
  projects: [
    { name: 'api', grep: /@api/ },
    { name: 'chromium', grep: /@ui/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      grep: /@ui/,
      grepInvert: ignorarForaDoChromium,
      use: { ...devices['Desktop Firefox'] },
    },
    // WebKit no Windows exige DLLs extras; roda apenas no CI (Linux).
    ...(CI
      ? [
          {
            name: 'webkit',
            grep: /@ui/,
            grepInvert: ignorarForaDoChromium,
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
});