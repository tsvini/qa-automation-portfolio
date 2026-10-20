import * as allure from 'allure-js-commons';
import { Before } from './fixtures';

function definirEpic(tags: string[]) {
  if (tags.includes('@pixbank')) {
    if (tags.includes('@concorrencia')) return 'PixBank · Concorrência';
    if (tags.includes('@seguranca')) return 'PixBank · Segurança';
    if (tags.includes('@a11y')) return 'PixBank · Acessibilidade';
    if (tags.includes('@visual')) return 'PixBank · Visual';
    return tags.includes('@api') ? 'PixBank · API e regras de negócio' : 'PixBank · Interface Web';
  }
  if (tags.includes('@visual')) return 'Qualidade Visual';
  if (tags.includes('@a11y')) return 'Acessibilidade';
  if (tags.includes('@api')) return 'API · ServeRest';
  return 'Interface Web · SauceDemo';
}

Before(async ({ $testInfo, $tags }) => {
  await allure.epic(definirEpic($tags));
  await allure.feature($testInfo.titlePath[1]);
  await allure.story($testInfo.title);
  await allure.owner('Vinícius Torales');
  await allure.severity($tags.includes('@critico') ? 'critical' : 'normal');
});