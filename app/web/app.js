'use strict';
const $ = (s) => document.querySelector(s);
const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
let token = sessionStorage.getItem('token');
let bug = null;

async function api(caminho, opcoes = {}) {
  const r = await fetch(caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opcoes.headers || {}) },
  });
  const corpo = r.status === 204 ? null : await r.json().catch(() => null);
  if (r.status === 401 && caminho !== '/api/login') { sair(); }
  return { status: r.status, corpo };
}

function mostrar(tela) {
  $('#tela-login').hidden = tela !== 'login';
  $('#tela-conta').hidden = tela !== 'conta';
}

async function carregarConta() {
  const { status, corpo } = await api('/api/conta');
  if (status !== 200) return;
  $('#ola').textContent = `Olá, ${corpo.nome.split(' ')[0]}`;
  $('#saldo').textContent = bug === 'ui_saldo' ? brl(corpo.saldo * 100) : brl(corpo.saldo);
  $('#limite-restante').textContent = brl(corpo.limiteRestante);
  const pct = Math.round((corpo.usadoHoje / corpo.limiteDiario) * 100);
  $('#barra-limite').setAttribute('aria-valuenow', String(pct));
  $('#barra-limite span').style.width = `${pct}%`;
  $('#noturno').hidden = !corpo.periodoNoturno;
  const { corpo: itens } = await api('/api/extrato');
  const lista = $('#extrato');
  lista.replaceChildren(...(itens || []).map((m) => {
    const li = document.createElement('li');
    li.dataset.test = 'item-extrato';
    const esq = document.createElement('div');
    const quem = document.createElement('div'); quem.className = 'quem';
    quem.textContent = `${m.tipo === 'ENVIADO' ? 'Pix enviado para' : 'Pix recebido de'} ${m.contraparte}`;
    if (m.status !== 'CONCLUIDO') { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'aguardando confirmação'; quem.append(t); }
    const det = document.createElement('div'); det.className = 'det';
    det.textContent = [new Date(m.criadoEm).toLocaleString('pt-BR'), m.descricao].filter(Boolean).join(' · ');
    esq.append(quem, det);
    const mov = document.createElement('div');
    mov.className = `mov ${m.tipo === 'ENVIADO' ? 'saida' : 'entrada'}`;
    mov.dataset.test = 'valor-extrato';
    mov.textContent = `${m.tipo === 'ENVIADO' ? '−' : '+'} ${brl(m.valor)}`;
    li.append(esq, mov);
    return li;
  }));
  $('#extrato-vazio').hidden = (itens || []).length > 0;
}

function sair() {
  token = null; sessionStorage.removeItem('token'); mostrar('login');
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#erro-login').textContent = '';
  const { status, corpo } = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: $('#email').value, senha: $('#senha').value }) });
  if (status !== 200) { $('#erro-login').textContent = corpo?.mensagem || 'Não foi possível entrar'; return; }
  token = corpo.token; sessionStorage.setItem('token', token);
  mostrar('conta'); carregarConta();
});

$('#sair').addEventListener('click', sair);

let pendente = null;
$('#form-pix').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = $('#resultado'); res.className = ''; res.textContent = 'Enviando…';
  const corpo = { chave: $('#chave').value, valor: $('#valor').value, descricao: $('#descricao').value };
  const r = await api('/api/pix', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Idempotency-Key': crypto.randomUUID() } });
  if (r.status >= 400) { res.className = 'falha'; res.textContent = r.corpo?.mensagem || 'Não foi possível enviar o Pix'; return; }
  if (r.corpo.status === 'PENDENTE_CONFIRMACAO') {
    pendente = r.corpo; $('#valor-confirmar').textContent = brl(r.corpo.valor);
    $('#senha-confirmar').value = ''; $('#erro-confirmar').textContent = '';
    $('#dialogo-confirmar').showModal(); res.textContent = '';
  } else {
    res.className = 'ok'; res.textContent = `Pix de ${brl(r.corpo.valor)} enviado para ${r.corpo.destino}`;
    e.target.reset();
  }
  carregarConta();
});

$('#form-confirmar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await api(`/api/pix/${pendente.id}/confirmar`, { method: 'POST', body: JSON.stringify({ senha: $('#senha-confirmar').value }) });
  if (r.status !== 200) { $('#erro-confirmar').textContent = r.corpo?.mensagem || 'Não foi possível confirmar'; return; }
  $('#dialogo-confirmar').close();
  const res = $('#resultado'); res.className = 'ok';
  res.textContent = `Pix de ${brl(r.corpo.valor)} enviado para ${r.corpo.destino}`;
  $('#form-pix').reset(); carregarConta();
});
$('#cancelar-confirmar').addEventListener('click', () => $('#dialogo-confirmar').close());

(async () => {
  const { corpo } = await api('/api/saude');
  bug = corpo?.bug || null;
  if (bug === 'a11y_rotulo') { $('#rotulo-valor').remove(); $('#valor').removeAttribute('placeholder'); }
  if (token) { mostrar('conta'); carregarConta(); } else mostrar('login');
})();
