import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';
import { contratosPixBank, ContratoPixBank } from '../pixbank/schemas';

const centavos = (reais: string) => Math.round(Number(reais.replace(/\./g, '').replace(',', '.')) * 100);
const normaliza = (t: string | null) => (t || '').replace(/\s+/g, ' ').trim();
const ultima = (pix: { respostas: import('@playwright/test').APIResponse[] }) => {
  const r = pix.respostas.at(-1);
  if (!r) throw new Error('Nenhuma chamada ao PixBank foi feita neste cenário');
  return r;
};

// ---------- massa de dados ----------
Given('que {string} é cliente do PixBank com saldo de R$ {}', async ({ pixbank, pix }, apelido: string, saldo: string) => {
  const c = await pixbank.criarCliente(centavos(saldo) / 100);
  await pixbank.autenticar(c);
  pix.clientes[apelido] = c;
});

Given('que {string} já enviou hoje Pix de {string}, {string} e {string} para {string}', async ({ pixbank, pix }, de: string, a: string, b: string, c: string, para: string) => {
  for (const v of [a, b, c]) {
    const r = await pixbank.pix(pix.clientes[de].token!, { chave: pix.clientes[para].email, valor: v });
    expect(r.status(), `Pix de preparação de ${v}`).toBe(201);
  }
});

Given('que {string} enviou um Pix de {string} para {string}', async ({ pixbank, pix }, de: string, valor: string, para: string) => {
  const r = await pixbank.pix(pix.clientes[de].token!, { chave: pix.clientes[para].email, valor });
  expect(r.status()).toBe(201);
  pix.pixId = (await r.json()).id;
});

// ---------- ações na API ----------
When('{string} envia um Pix de {string} para {string}', async ({ pixbank, pix }, de: string, valor: string, para: string) => {
  const r = await pixbank.pix(pix.clientes[de].token!, { chave: pix.clientes[para].email, valor });
  pix.respostas.push(r);
  if (r.ok()) pix.pixId = (await r.json()).id;
});

When('{string} envia um Pix de {string} para {string} com a descrição {string}', async ({ pixbank, pix }, de: string, valor: string, para: string, descricao: string) => {
  pix.respostas.push(await pixbank.pix(pix.clientes[de].token!, { chave: pix.clientes[para].email, valor, descricao }));
});

When('{string} envia um Pix de {string} para a chave {string}', async ({ pixbank, pix }, de: string, valor: string, chave: string) => {
  pix.respostas.push(await pixbank.pix(pix.clientes[de].token!, { chave, valor }));
});

When('{string} envia às {int}h um Pix de {string} para {string}', async ({ pixbank, pix }, de: string, hora: number, valor: string, para: string) => {
  const relogio = `2026-01-15T${String(hora).padStart(2, '0')}:00:00-03:00`;
  pix.respostas.push(await pixbank.pix(pix.clientes[de].token!, { chave: pix.clientes[para].email, valor }, { relogio }));
});

When('{string} envia um Pix de {string} para {string} com a chave de idempotência {string}', async ({ pixbank, pix }, de: string, valor: string, para: string, chave: string) => {
  // Chave única por execução, para cenários em paralelo não colidirem.
  pix.idem ??= `${chave}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  pix.respostas.push(await pixbank.pix(pix.clientes[de].token!, { chave: pix.clientes[para].email, valor }, { idem: pix.idem }));
});

When('{string} confirma o Pix com a senha {string}', async ({ pixbank, pix }, quem: string, senha: string) => {
  pix.respostas.push(await pixbank.confirmar(pix.clientes[quem].token!, pix.pixId!, senha));
});

When('{string} confirma o Pix com a senha correta', async ({ pixbank, pix }, quem: string) => {
  const c = pix.clientes[quem];
  pix.respostas.push(await pixbank.confirmar(c.token!, pix.pixId!, c.senha));
});

When('{string} consulta o extrato', async ({ pixbank, pix }, quem: string) => {
  pix.respostas.push(await pixbank.extrato(pix.clientes[quem].token!));
});

When('{string} dispara {int} Pix de {string} para {string} ao mesmo tempo', async ({ pixbank, pix }, de: string, n: number, valor: string, para: string) => {
  pix.simultaneos = await pixbank.pixSimultaneos(pix.clientes[de].token!, { chave: pix.clientes[para].email, valor }, n);
});

When('acesso {string} com o token {string}', async ({ pixbank, pix }, caminho: string, tipo: string) => {
  const valido = Object.values(pix.clientes)[0]?.token || '';
  const token = { nenhum: undefined, inventado: 'abc.def.ghi', adulterado: `${valido.slice(0, -4)}AAAA` }[tipo as 'nenhum'];
  pix.respostas.push(await pixbank.bruta(caminho, token));
});

When('{string} tenta abrir o comprovante desse Pix', async ({ pixbank, pix }, quem: string) => {
  pix.respostas.push(await pixbank.comprovante(pix.clientes[quem].token!, pix.pixId!));
});

When('{string} erra a senha {int} vezes', async ({ pixbank, pix }, quem: string, n: number) => {
  for (let i = 0; i < n; i++) {
    const r = await pixbank.login(pix.clientes[quem].email, `errada-${i}`);
    expect(r.status()).toBe(401);
  }
});

When('{string} tenta entrar com a senha correta', async ({ pixbank, pix }, quem: string) => {
  const c = pix.clientes[quem];
  pix.respostas.push(await pixbank.login(c.email, c.senha));
});

// ---------- verificações da API ----------
Then('o PixBank responde {int}', async ({ pix }, status: number) => {
  const r = ultima(pix);
  expect(r.status(), await r.text()).toBe(status);
});

Then('o resultado do Pix é {string}', async ({ pix }, esperado: string) => {
  const r = ultima(pix);
  const corpo = await r.json();
  // Pix aceito traz o status; Pix recusado traz o código do erro. Checar o código evita passar pelo motivo errado.
  expect(r.ok() ? corpo.status : corpo.erro, JSON.stringify(corpo)).toBe(esperado);
});

Then('o erro do PixBank é {string}', async ({ pix }, codigo: string) => {
  expect((await ultima(pix).json()).erro).toBe(codigo);
});

Then('a resposta do PixBank segue o contrato de {string}', async ({ pix }, nome: string) => {
  const r = contratosPixBank[nome as ContratoPixBank].safeParse(await ultima(pix).json());
  expect(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2)).toBe(true);
});

Then('o saldo de {string} é R$ {}', async ({ pixbank, pix }, quem: string, valor: string) => {
  expect(await pixbank.saldo(pix.clientes[quem].token!)).toBe(centavos(valor));
});

Then('o Pix registrado tem {int} centavos', async ({ pix }, valor: number) => {
  expect((await ultima(pix).json()).valor).toBe(valor);
});

Then('o Pix fica {string}', async ({ pix }, status: string) => {
  expect((await ultima(pix).json()).status).toBe(status);
});

Then('as duas respostas trazem o mesmo Pix', async ({ pix }) => {
  const [a, b] = await Promise.all(pix.respostas.slice(-2).map((r) => r.json()));
  expect(b.id).toBe(a.id);
});

Then('o extrato de {string} começa por {string} e depois {string}', async ({ pix }, _quem: string, primeiro: string, segundo: string) => {
  const itens = (await ultima(pix).json()) as { descricao: string }[];
  expect(itens.map((i) => i.descricao).slice(0, 2)).toEqual([primeiro, segundo]);
});

Then('exatamente {int} Pix é aceito e os outros {int} são recusados por saldo', async ({ pix }, aceitos: number, recusados: number) => {
  const r = pix.simultaneos!;
  const resumo = r.map((x) => x.status).join(', ');
  expect(r.filter((x) => x.status === 201), `status recebidos: ${resumo}`).toHaveLength(aceitos);
  expect(r.filter((x) => x.corpo.erro === 'SALDO_INSUFICIENTE'), `status recebidos: ${resumo}`).toHaveLength(recusados);
});

Then('a resposta tem os cabeçalhos de segurança', async ({ pix }) => {
  const h = ultima(pix).headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['content-security-policy']).toContain("default-src 'self'");
  expect(h['referrer-policy']).toBe('no-referrer');
});

// ---------- interface web ----------
When('abro o app do PixBank', async ({ pixbankPage }) => {
  await pixbankPage.abrir();
});

When('{string} entra no app do PixBank', async ({ pixbankPage, pix }, quem: string) => {
  const c = pix.clientes[quem];
  await pixbankPage.abrir();
  await pixbankPage.entrar(c.email, c.senha);
});

When('{string} tenta entrar no app com a senha {string}', async ({ pixbankPage, pix }, quem: string, senha: string) => {
  await pixbankPage.abrir();
  await pixbankPage.entrar(pix.clientes[quem].email, senha);
});

When('envia pelo app um Pix de {string} para {string} com a descrição {string}', async ({ pixbankPage, pix }, valor: string, para: string, descricao: string) => {
  await pixbankPage.enviarPix(pix.clientes[para].email, valor, descricao);
});

When('confirma o Pix no app com a senha correta', async ({ pixbankPage, pix }) => {
  await pixbankPage.confirmarComSenha(Object.values(pix.clientes).at(-1)!.senha);
});

Then('o app mostra o saldo {string}', async ({ pixbankPage }, valor: string) => {
  await expect.poll(async () => normaliza(await pixbankPage.saldo.textContent())).toBe(valor);
});

Then('o app mostra o erro de login {string}', async ({ pixbankPage }, mensagem: string) => {
  await expect(pixbankPage.erroLogin()).toHaveText(mensagem);
});

Then('o app confirma o Pix de {string}', async ({ pixbankPage }, valor: string) => {
  await expect.poll(async () => normaliza(await pixbankPage.resultado.textContent())).toContain(`Pix de ${valor} enviado`);
});

Then('o primeiro item do extrato é {string}', async ({ pixbankPage }, valor: string) => {
  await expect.poll(async () => normaliza(await pixbankPage.itensExtrato.first().getByTestId('valor-extrato').textContent())).toBe(valor);
});
