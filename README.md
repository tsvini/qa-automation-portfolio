![Testes](https://github.com/tsvini/qa-automation-portfolio/actions/workflows/tests.yml/badge.svg)

# QA Automation Portfolio

Projeto de automação de testes com **Playwright + Cucumber (BDD)** em TypeScript, cobrindo testes de UI e de API, rodando no GitHub Actions a cada push.

## O que é testado

- **UI:** login (válido e inválido) e carrinho no [SauceDemo](https://www.saucedemo.com)
- **API:** cadastro de usuário, email duplicado e login na [ServeRest](https://serverest.dev)

## Stack

Playwright · playwright-bdd · Cucumber/Gherkin (pt-BR) · TypeScript · Page Objects · GitHub Actions

## Como rodar

```bash
npm install
npx playwright install chromium
npm test          # tudo
npm run test:ui   # só UI
npm run test:api  # só API
npm run report    # abre o relatório
```

## Estrutura

- `features/`: cenários em Gherkin
- `steps/`: implementação dos passos e fixtures
- `pages/`: Page Objects
- `.github/workflows/`: pipeline de CI

## Autor

Vinícius Torales, QA Automation Engineer
[LinkedIn](https://www.linkedin.com/in/vinicius-torales/)