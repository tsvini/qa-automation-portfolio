/**
 * Gera o Painel de Qualidade (painel-dist/index.html) a partir dos resultados do pipeline:
 *  - resultados/testes.json         relatório JSON do Playwright
 *  - resultados/caca-aos-bugs.json  placar da caça aos bugs
 *  - resultados/perf.json           resumo do k6
 *  - resultados/historico.json      execuções anteriores (baixado do próprio Pages)
 * Página estática, sem dependências: abre em qualquer lugar e carrega instantâneo.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ler = (f, padrao) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : padrao);
const testes = ler('resultados/testes.json', null);
const bugs = ler('resultados/caca-aos-bugs.json', null);
const perf = ler('resultados/perf.json', null);
const historico = ler('resultados/historico.json', []);
const REPO = process.env.GITHUB_REPOSITORY || 'tsvini/qa-automation-portfolio';
const EXECUCAO = process.env.GITHUB_RUN_ID ? `https://github.com/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}` : `https://github.com/${REPO}/actions`;

// ---------- testes por camada ----------
const CAMADAS = [
  ['api', 'API e regras de negócio', 'Valores-limite, limites diário e noturno, antifraude, idempotência, contrato'],
  ['seguranca', 'Segurança', 'Autenticação, BOLA, força bruta, injeção, cabeçalhos'],
  ['concorrencia', 'Concorrência', '20 Pix simultâneos disputando o mesmo saldo'],
  ['ui', 'Interface web', 'Fluxos completos em Chromium, Firefox e WebKit'],
  ['a11y', 'Acessibilidade', 'WCAG 2.1 AA com axe-core'],
  ['visual', 'Regressão visual', 'Comparação pixel a pixel com a referência'],
  ['referencia', 'Suítes de referência', 'SauceDemo (UI) e ServeRest (API)'],
];
const camadaDe = (tags) => {
  if (!tags.includes('@pixbank')) return 'referencia';
  for (const t of ['concorrencia', 'seguranca', 'a11y', 'visual']) if (tags.includes(`@${t}`)) return t;
  return tags.includes('@api') ? 'api' : 'ui';
};
const contagem = Object.fromEntries(CAMADAS.map(([id]) => [id, { ok: 0, falha: 0, instavel: 0, total: 0 }]));
let duracaoMs = 0;
if (testes) {
  duracaoMs = testes.stats?.duration || 0;
  const visitar = (suite) => {
    for (const s of suite.suites || []) visitar(s);
    for (const spec of suite.specs || []) {
      const tags = [...(spec.tags || []).map((t) => (t.startsWith('@') ? t : `@${t}`)), ...(spec.title.match(/@[\w-]+/g) || [])];
      for (const t of spec.tests) {
        if (t.status === 'skipped') continue;
        const c = contagem[camadaDe(tags)];
        c.total++;
        if (t.status === 'expected') c.ok++;
        else if (t.status === 'flaky') { c.ok++; c.instavel++; } else c.falha++;
      }
    }
  };
  for (const s of testes.suites) visitar(s);
}
const soma = Object.values(contagem).reduce((a, c) => ({ ok: a.ok + c.ok, total: a.total + c.total, falha: a.falha + c.falha }), { ok: 0, total: 0, falha: 0 });

// ---------- histórico ----------
const agora = new Date();
const registro = {
  data: agora.toISOString(), aprovados: soma.ok, total: soma.total, duracaoS: Math.round(duracaoMs / 1000),
  bugs: bugs ? `${bugs.detectados}/${bugs.total}` : null, p95Pix: perf?.p95?.pix ?? null,
};
const novoHistorico = [...historico, registro].slice(-60);

// ---------- HTML ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const dataBR = (d) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

function sparkline(valores, largura = 560, altura = 64) {
  const v = valores.filter((x) => x !== null && x !== undefined);
  if (v.length < 2) return '<p class="sub">O gráfico aparece a partir da segunda execução.</p>';
  const min = Math.min(...v), max = Math.max(...v), faixa = max - min || 1;
  const pts = v.map((y, i) => `${(i / (v.length - 1)) * largura},${altura - 6 - ((y - min) / faixa) * (altura - 12)}`).join(' ');
  return `<svg viewBox="0 0 ${largura} ${altura}" class="spark" role="img" aria-label="Tendência"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

const linhasCamadas = CAMADAS.map(([id, nome, desc]) => {
  const c = contagem[id];
  const estado = !c.total ? 'neutro' : c.falha ? 'ruim' : 'bom';
  return `<tr><td><strong>${nome}</strong><div class="sub">${desc}</div></td>
    <td class="num"><span class="pill ${estado}">${c.total ? `${c.ok}/${c.total}` : '—'}</span>${c.instavel ? `<div class="sub">${c.instavel} instável(is)</div>` : ''}</td></tr>`;
}).join('');

const linhasBugs = (bugs?.bugs || []).map((b) => `<tr>
  <td><code>${esc(b.id)}</code><div class="sub">${esc(b.descricao)}</div></td>
  <td class="num"><span class="pill ${b.detectado ? 'bom' : 'ruim'}">${b.detectado ? 'detectado' : b.situacao === 'erro' ? 'erro' : 'escapou'}</span></td>
  <td class="quem">${b.cenarios.slice(0, 3).map((c) => `<div>${esc(c)}</div>`).join('') || '<div class="sub">nenhum cenário falhou</div>'}${b.cenarios.length > 3 ? `<div class="sub">+${b.cenarios.length - 3} cenário(s)</div>` : ''}</td></tr>`).join('');

const barrasPerf = perf ? Object.entries(perf.p95).map(([rota, ms]) => {
  const meta = perf.metas[rota];
  return `<div class="perf"><div class="perf-topo"><span>${{ conta: 'Consultar saldo', pix: 'Enviar Pix', extrato: 'Abrir extrato' }[rota] || rota}</span><span><strong>${ms} ms</strong> <span class="sub">meta ${meta} ms</span></span></div>
    <div class="trilho"><span style="width:${Math.min(100, (ms / meta) * 100)}%" class="${ms <= meta ? 'bom' : 'ruim'}"></span></div></div>`;
}).join('') : '<p class="sub">Sem dados de performance nesta execução.</p>';

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Painel de Qualidade · PixBank</title>
<meta name="description" content="Painel de qualidade ao vivo do PixBank: testes em todas as camadas, caça aos bugs e performance.">
<meta property="og:title" content="Painel de Qualidade · PixBank">
<meta property="og:description" content="${soma.ok}/${soma.total} cenários aprovados · bugs plantados detectados ${bugs ? `${bugs.detectados}/${bugs.total}` : '—'} · Pix sob carga ${perf ? perf.p95.pix : '—'} ms (p95)">
<meta property="og:image" content="https://tsvini.github.io/qa-automation-portfolio/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="https://tsvini.github.io/qa-automation-portfolio/">
<meta name="twitter:card" content="summary_large_image">
<style>
:root{--fundo:#0b0f17;--cartao:#121826;--borda:#232b3d;--texto:#e8ecf3;--suave:#93a0b8;--verde:#32d6a5;--azul:#4f8cff;--vermelho:#ff6b6b;--amarelo:#ffd166}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1000px 500px at 85% -10%,#1b2a44 0,transparent 60%),var(--fundo);color:var(--texto);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1080px;margin:0 auto;padding:36px 16px 72px}a{color:var(--azul)}
.topo{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:28px}
.marca{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px;color:var(--suave);letter-spacing:.4px;text-transform:uppercase}
.logo{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--verde),var(--azul))}
h1{font-size:34px;line-height:1.15;margin:10px 0 6px;letter-spacing:-.6px}h2{font-size:13px;color:var(--suave);text-transform:uppercase;letter-spacing:.7px;margin:0 0 14px}
.sub{color:var(--suave);font-size:13px}.links{display:flex;gap:10px;flex-wrap:wrap}
.botao{display:inline-block;padding:10px 14px;border-radius:10px;border:1px solid var(--borda);background:var(--cartao);color:var(--texto);text-decoration:none;font-weight:600;font-size:14px}
.botao.prim{background:var(--verde);color:#062a20;border-color:transparent}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:14px}
.cartao{background:var(--cartao);border:1px solid var(--borda);border-radius:16px;padding:20px;margin-bottom:14px}
.kpi .valor{font-size:36px;font-weight:800;letter-spacing:-.8px;margin:2px 0}.kpi .valor small{font-size:16px;color:var(--suave);font-weight:600}
.verde{color:var(--verde)}.vermelho{color:var(--vermelho)}
.grade{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}@media(max-width:820px){.grade{grid-template-columns:1fr}}
table{width:100%;border-collapse:collapse}td{padding:12px 0;border-bottom:1px solid var(--borda);vertical-align:top}tr:last-child td{border:0}
td.num{text-align:right;white-space:nowrap;padding-left:12px}td.quem{font-size:13px;padding-left:16px;color:var(--texto)}
.pill{display:inline-block;padding:3px 10px;border-radius:99px;font-weight:700;font-size:13px}
.pill.bom{background:#123d33;color:var(--verde)}.pill.ruim{background:#3d1717;color:var(--vermelho)}.pill.neutro{background:var(--borda);color:var(--suave)}
code{background:#0b0f17;border:1px solid var(--borda);padding:1px 6px;border-radius:6px;font-size:13px}
.perf{margin-bottom:16px}.perf-topo{display:flex;justify-content:space-between;margin-bottom:6px}.trilho{height:10px;background:#0b0f17;border-radius:99px;overflow:hidden}
.trilho span{display:block;height:100%;border-radius:99px}.trilho .bom{background:linear-gradient(90deg,var(--verde),var(--azul))}.trilho .ruim{background:var(--vermelho)}
.spark{width:100%;height:64px;color:var(--verde)}.spark.azul{color:var(--azul)}
.destaque{border-color:#1f5e4c;background:linear-gradient(180deg,#10241f,var(--cartao))}
footer{color:var(--suave);font-size:13px;margin-top:28px}
</style></head><body><main>
<header class="topo">
  <div><div class="marca"><span class="logo" aria-hidden="true"></span>Quality Lab · PixBank</div>
  <h1>Painel de Qualidade</h1><div class="sub">Atualizado em ${dataBR(agora)} · execução diária e a cada mudança no código</div></div>
  <nav class="links"><a class="botao prim" href="allure/">Relatório completo (Allure)</a><a class="botao" href="https://github.com/${REPO}">Código no GitHub</a><a class="botao" href="${EXECUCAO}">Execução no CI</a></nav>
</header>

<section class="kpis" aria-label="Indicadores">
  <article class="cartao kpi"><h2>Cenários aprovados</h2><div class="valor ${soma.falha ? 'vermelho' : 'verde'}">${soma.ok}<small> / ${soma.total}</small></div><div class="sub">${pct(soma.ok, soma.total)}% · ${Math.round(duracaoMs / 1000)} s de execução</div></article>
  <article class="cartao kpi destaque"><h2>Bugs plantados detectados</h2><div class="valor ${bugs && bugs.detectados === bugs.total ? 'verde' : 'vermelho'}">${bugs ? `${bugs.detectados}<small> / ${bugs.total}</small>` : '—'}</div><div class="sub">Cada bug é ligado sozinho e a suíte precisa falhar</div></article>
  <article class="cartao kpi"><h2>Enviar Pix sob carga (p95)</h2><div class="valor ${perf && perf.aprovado ? 'verde' : 'vermelho'}">${perf ? `${perf.p95.pix}<small> ms</small>` : '—'}</div><div class="sub">${perf ? `${perf.usuariosVirtuais} usuários simultâneos · ${perf.porSegundo} req/s · erro ${(perf.taxaDeErro * 100).toFixed(2)}%` : ''}</div></article>
</section>

<div class="grade">
  <article class="cartao"><h2>Testes por camada</h2><table>${linhasCamadas}</table></article>
  <div>
    <article class="cartao"><h2>Performance (k6)</h2>${barrasPerf}</article>
    <article class="cartao"><h2>Tendência · cenários aprovados (%)</h2>${sparkline(novoHistorico.map((h) => pct(h.aprovados, h.total)))}
      <h2 style="margin-top:16px">Tendência · duração da suíte (s)</h2><div class="azul">${sparkline(novoHistorico.map((h) => h.duracaoS)).replace('class="spark"', 'class="spark azul"')}</div>
      <div class="sub">${novoHistorico.length} execução(ões) registradas</div></article>
  </div>
</div>

<article class="cartao"><h2>Caça aos bugs · os testes pegam bugs de verdade?</h2>
  <p class="sub" style="margin-top:-6px">O PixBank tem bugs plantados que ficam desligados. O pipeline liga um de cada vez e roda a suíte inteira: se nenhum teste falhar, o bug "escapou" e o pipeline reprova.</p>
  <table>${linhasBugs || '<tr><td class="sub">Sem dados nesta execução.</td></tr>'}</table></article>

<footer>Feito por <a href="https://www.linkedin.com/in/vinicius-torales/">Vinícius Torales</a> · Playwright · Cucumber (BDD) · TypeScript · k6 · axe-core · GitHub Actions</footer>
</main></body></html>`;

mkdirSync('painel-dist', { recursive: true });
writeFileSync('painel-dist/index.html', html);
writeFileSync('painel-dist/historico.json', JSON.stringify(novoHistorico, null, 2));
console.log(`Painel gerado: ${soma.ok}/${soma.total} cenários, bugs ${registro.bugs ?? '—'}, p95 Pix ${registro.p95Pix ?? '—'} ms`);
