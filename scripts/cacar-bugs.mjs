/**
 * Caça aos bugs: liga, um de cada vez, cada bug plantado no PixBank (BUG=<id>)
 * e roda as suítes do PixBank. O bug é "detectado" se pelo menos um cenário falhar.
 * Gera resultados/caca-aos-bugs.json com o placar e quais cenários pegaram cada bug.
 *
 * Uso: npm run cacar-bugs            (todos os bugs)
 *      npm run cacar-bugs -- corrida (só um)
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const fonte = readFileSync('app/bugs.ts', 'utf-8');
const catalogo = Object.fromEntries([...fonte.matchAll(/^\s+(\w+): '([^']+)',$/gm)].map((m) => [m[1], m[2]]));
const pedidos = process.argv.slice(2);
const ids = pedidos.length ? pedidos : Object.keys(catalogo);
const projetos = (process.env.PROJETOS || 'pixbank-api,pixbank-chromium').split(',');

spawnSync('npx', ['bddgen'], { stdio: 'inherit', shell: true });

const resultados = [];
ids.forEach((id, i) => {
  const porta = 3100 + i;
  const inicio = Date.now();
  const r = spawnSync('npx', ['playwright', 'test', ...projetos.map((p) => `--project=${p}`), '--reporter=json', '--retries=0'], {
    env: { ...process.env, BUG: id, SO_PIXBANK: '1', PIXBANK_URL: `http://localhost:${porta}` },
    encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024, shell: true,
  });
  let rel;
  try { rel = JSON.parse(r.stdout); } catch { rel = null; }
  const falhas = [];
  const visitar = (suite, caminho = []) => {
    for (const s of suite.suites || []) visitar(s, [...caminho, s.title]);
    for (const spec of suite.specs || []) {
      if (spec.tests.some((t) => t.results.some((x) => x.status === 'failed' || x.status === 'timedOut'))) {
        falhas.push(`${caminho.filter((c) => c && !c.endsWith('.js')).at(-1) ?? ''} › ${spec.title}`.replace(/ @[\w-]+/g, ''));
      }
    }
  };
  if (rel) for (const s of rel.suites) visitar(s);
  // Sem relatório não dá para concluir nada: conta como erro de execução, nunca como "não detectado".
  const situacao = !rel ? 'erro' : falhas.length > 0 ? 'detectado' : 'nao_detectado';
  resultados.push({ id, descricao: catalogo[id], detectado: situacao === 'detectado', situacao, cenarios: [...new Set(falhas)], segundos: Math.round((Date.now() - inicio) / 1000) });
  console.log(`${{ detectado: '✅ detectado', nao_detectado: '❌ NÃO detectado', erro: '⚠️ erro na execução' }[situacao]}  ${id.padEnd(16)} ${falhas.length} cenário(s)`);
  if (situacao === 'erro') console.log(r.stderr.slice(-2000));
});

const placar = { detectados: resultados.filter((r) => r.detectado).length, total: resultados.length, geradoEm: new Date().toISOString(), bugs: resultados };
mkdirSync('resultados', { recursive: true });
writeFileSync('resultados/caca-aos-bugs.json', JSON.stringify(placar, null, 2));
console.log(`\nPlacar: ${placar.detectados}/${placar.total} bugs detectados`);
if (placar.detectados < placar.total) process.exitCode = 1;
