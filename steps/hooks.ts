import * as allure from 'allure-js-commons';
import { Before } from './fixtures';

Before(async ({ $testInfo, $tags }) => {
  const epic = $tags.includes('@api') ? 'API · ServeRest' : 'Interface Web · SauceDemo';
  const funcionalidade = $testInfo.titlePath[1];

  await allure.epic(epic);
  await allure.feature(funcionalidade);
  await allure.story($testInfo.title);
  await allure.owner('Vinícius Torales');
  await allure.severity($tags.includes('@critico') ? 'critical' : 'normal');
});