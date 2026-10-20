/**
 * Teste de carga do PixBank com k6.
 * 30 usuários virtuais por 40 s consultando saldo, enviando Pix e abrindo o extrato.
 * O pipeline reprova se a API ficar lenta (p95) ou começar a errar.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.PIXBANK_URL || 'http://localhost:3000';
const VUS = 30;
const JSON_H = { 'Content-Type': 'application/json' };

export const options = {
  scenarios: {
    rotina_do_cliente: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: VUS },
        { duration: '25s', target: VUS },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{rota:conta}': ['p(95)<150'],
    'http_req_duration{rota:pix}': ['p(95)<300'],
    'http_req_duration{rota:extrato}': ['p(95)<200'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  const clientes = [];
  const rodada = String(Date.now()).slice(-6);
  for (let i = 0; i < VUS + 1; i++) {
    const email = `carga${i}-${rodada}@teste.pixbank.dev`;
    const cpf = `${rodada}${String(i).padStart(5, '0')}`;
    http.post(`${BASE}/api/teste/clientes`, JSON.stringify({ nome: `Carga ${i}`, email, cpf, senha: 'Senha@123', saldo: 100_000_00 }), { headers: JSON_H });
    const token = http.post(`${BASE}/api/login`, JSON.stringify({ email, senha: 'Senha@123' }), { headers: JSON_H }).json('token');
    clientes.push({ email, token });
  }
  return { clientes };
}

export default function ({ clientes }) {
  const eu = clientes[(__VU - 1) % VUS];
  const destino = clientes[VUS];
  const auth = { headers: { ...JSON_H, Authorization: `Bearer ${eu.token}`, 'X-Relogio': '2026-01-15T14:00:00-03:00' } };

  const conta = http.get(`${BASE}/api/conta`, { ...auth, tags: { rota: 'conta' } });
  check(conta, { 'conta 200': (r) => r.status === 200 });

  const pix = http.post(`${BASE}/api/pix`, JSON.stringify({ chave: destino.email, valor: '0,01', descricao: 'carga' }), { ...auth, tags: { rota: 'pix' } });
  check(pix, { 'pix 201': (r) => r.status === 201 });

  const extrato = http.get(`${BASE}/api/extrato`, { ...auth, tags: { rota: 'extrato' } });
  check(extrato, { 'extrato 200': (r) => r.status === 200 });

  sleep(0.5);
}

export function handleSummary(dados) {
  const p95 = (m) => Math.round((dados.metrics[m]?.values?.['p(95)'] ?? 0) * 10) / 10;
  const resumo = {
    geradoEm: new Date().toISOString(),
    usuariosVirtuais: VUS,
    requisicoes: dados.metrics.http_reqs.values.count,
    porSegundo: Math.round(dados.metrics.http_reqs.values.rate * 10) / 10,
    taxaDeErro: dados.metrics.http_req_failed.values.rate,
    p95: { conta: p95('http_req_duration{rota:conta}'), pix: p95('http_req_duration{rota:pix}'), extrato: p95('http_req_duration{rota:extrato}') },
    metas: { conta: 150, pix: 300, extrato: 200 },
    aprovado: !Object.values(dados.metrics).some((m) => m.thresholds && Object.values(m.thresholds).some((t) => !t.ok)),
  };
  return { 'resultados/perf.json': JSON.stringify(resumo, null, 2), stdout: `\nPixBank sob carga: ${resumo.requisicoes} requisições, p95 Pix ${resumo.p95.pix} ms, erro ${(resumo.taxaDeErro * 100).toFixed(2)}%\n` };
}
