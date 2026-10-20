import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { PIXBANK_URL } from './pixbank/config';

const CI = !!process.env.CI;
// SO_PIXBANK=1 roda só a aplicação própria (usado na "caça aos bugs", que não precisa das suítes externas).
const SO_PIXBANK = !!process.env.SO_PIXBANK;

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
    ['json', { outputFile: 'resultados/testes.json' }],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: false,
        suiteTitle: false,
        environmentInfo: {
          Projeto: 'QA Automation Portfolio · PixBank',
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
  // Sobe o PixBank automaticamente antes dos testes (o BUG da variável de ambiente é repassado para a "caça aos bugs").
  webServer: {
    command: 'npm run pixbank',
    url: `${PIXBANK_URL}/api/saude`,
    reuseExistingServer: !CI,
    timeout: 60_000,
    env: { TZ: 'America/Sao_Paulo', BUG: process.env.BUG || '', PORT: new URL(PIXBANK_URL).port || '3000' },
  },
  projects: [
    // ---------- PixBank: aplicação própria ----------
    { name: 'pixbank-api', grep: /@pixbank.*@api|@api.*@pixbank/ },
    {
      name: 'pixbank-chromium',
      grep: /@pixbank.*@ui|@ui.*@pixbank/,
      grepInvert: ignorarLocalmente,
      // CHROMIUM_PATH permite usar um Chromium já instalado na máquina (ex.: containers sem download de browsers)
      use: { ...devices['Desktop Chrome'], ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}) },
    },
    {
      name: 'pixbank-firefox',
      grep: /@pixbank.*@ui|@ui.*@pixbank/,
      grepInvert: ignorarForaDoChromium,
      use: { ...devices['Desktop Firefox'] },
    },
    ...(CI
      ? [
          {
            name: 'pixbank-webkit',
            grep: /@pixbank.*@ui|@ui.*@pixbank/,
            grepInvert: ignorarForaDoChromium,
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
    // ---------- SauceDemo e ServeRest: suítes de referência ----------
    ...(SO_PIXBANK
      ? []
      : [
          { name: 'api', grep: /@api/, grepInvert: [/@pixbank/] },
          { name: 'chromium', grep: /@ui/, grepInvert: [/@pixbank/, ...ignorarLocalmente], use: { ...devices['Desktop Chrome'] } },
          {
            name: 'firefox',
            grep: /@ui/,
            grepInvert: [/@pixbank/, ...ignorarForaDoChromium],
            use: { ...devices['Desktop Firefox'] },
          },
          ...(CI
            ? [
                {
                  name: 'webkit',
                  grep: /@ui/,
                  grepInvert: [/@pixbank/, ...ignorarForaDoChromium],
                  use: { ...devices['Desktop Safari'] },
                },
              ]
            : []),
        ]),
  ],
});