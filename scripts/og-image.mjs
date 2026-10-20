/** Tira um print do Painel (1200x630) para a prévia de link no LinkedIn e em outras redes (og:image). */
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await pagina.goto(`file://${resolve('painel-dist/index.html')}`);
await pagina.screenshot({ path: 'painel-dist/og.png' });
await navegador.close();
console.log('og.png gerado');
