import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'fs';
import { Then } from './fixtures';

const violacoesConhecidas: string[] = JSON.parse(
  readFileSync('a11y/violacoes-conhecidas.json', 'utf-8'),
);

Then('a tela corresponde à referência {string}', async ({ page }, nome: string) => {
  await expect(page).toHaveScreenshot(`${nome}.png`, { fullPage: true });
});

Then('a tela difere da referência {string}', async ({ page }, nome: string) => {
  let diferencaDetectada = false;
  try {
    await expect(page).toHaveScreenshot(`${nome}.png`, { fullPage: true, timeout: 5000 });
  } catch {
    diferencaDetectada = true; // o print da diferença fica anexado no relatório
  }
  expect(diferencaDetectada, 'O teste visual deveria ter detectado o bug do visual_user').toBe(true);
});

Then('a página não tem novas violações de acessibilidade', async ({ page, $testInfo }) => {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const resumo = resultado.violations.length
    ? resultado.violations
        .map((v) => `• ${v.id} [${v.impact}] ${v.help} (${v.nodes.length} elemento(s))\n  ${v.helpUrl}`)
        .join('\n\n')
    : 'Nenhuma violação encontrada.';

  await $testInfo.attach('Relatório de acessibilidade', { body: resumo, contentType: 'text/plain' });

  const novas = resultado.violations
    .map((v) => v.id)
    .filter((id) => !violacoesConhecidas.includes(id));

  expect(novas, `Novas violações de acessibilidade:\n${resumo}`).toEqual([]);
});