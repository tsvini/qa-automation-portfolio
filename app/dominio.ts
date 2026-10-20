import { randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { bug } from './bugs';

export const LIMITE_DIARIO = 500_000; // R$ 5.000,00
export const LIMITE_NOTURNO = 100_000; // R$ 1.000,00 por Pix entre 20h e 6h
export const ANTIFRAUDE = 200_000; // acima de R$ 2.000,00 o Pix exige confirmação com senha

export class ErroNegocio extends Error {
  constructor(public status: number, public codigo: string, mensagem: string) { super(mensagem); }
}

export type Cliente = { id: number; nome: string; email: string; cpf: string; senha_hash: string; saldo: number };
export type Pix = {
  id: string; origem: number; destino: number; valor: number; descricao: string; status: 'CONCLUIDO' | 'PENDENTE_CONFIRMACAO';
  criado_em: string; idem_chave: string | null; idem_hash: string | null; saldo_apos: number | null;
};

export const hashSenha = (senha: string, sal = 'pixbank') => scryptSync(senha, sal, 32).toString('hex');
export const confereSenha = (senha: string, hash: string) =>
  timingSafeEqual(Buffer.from(hashSenha(senha)), Buffer.from(hash));

/** Converte "19,99", "19.99" ou 19.99 em centavos. */
export function paraCentavos(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) throw new ErroNegocio(422, 'VALOR_INVALIDO', 'Valor inválido');
  const c = bug('arredondamento') ? Math.trunc(n * 100) : Math.round(n * 100);
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) throw new ErroNegocio(422, 'VALOR_INVALIDO', 'Use no máximo 2 casas decimais');
  if (c <= 0) throw new ErroNegocio(422, 'VALOR_INVALIDO', 'O valor precisa ser maior que zero');
  return c;
}

export const cliente = (id: number) => db.prepare('SELECT * FROM clientes WHERE id = ?').get(id) as Cliente | undefined;
export const clientePorEmail = (email: string) =>
  db.prepare('SELECT * FROM clientes WHERE email = ?').get(email.toLowerCase()) as Cliente | undefined;

export function clientePorChave(chave: string): Cliente | undefined {
  const c = chave.trim().toLowerCase();
  const so = c.replace(/\D/g, '');
  return db.prepare('SELECT * FROM clientes WHERE email = ? OR cpf = ?').get(c, so) as Cliente | undefined;
}

const inicioDoDia = (agora: Date) => { const d = new Date(agora); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const ehNoturno = (agora: Date) => agora.getHours() >= 20 || agora.getHours() < 6;

export function usadoHoje(origem: number, agora: Date): number {
  const r = db.prepare("SELECT COALESCE(SUM(valor),0) AS t FROM pix WHERE origem = ? AND status = 'CONCLUIDO' AND criado_em >= ?")
    .get(origem, inicioDoDia(agora)) as { t: number };
  return r.t;
}

export function resumoConta(c: Cliente, agora: Date) {
  const usado = usadoHoje(c.id, agora);
  return {
    nome: c.nome, email: c.email, saldo: c.saldo,
    limiteDiario: LIMITE_DIARIO, usadoHoje: usado, limiteRestante: Math.max(0, LIMITE_DIARIO - usado),
    periodoNoturno: ehNoturno(agora), limiteNoturnoPorPix: LIMITE_NOTURNO,
  };
}

// Uma fila por conta: dois Pix da mesma conta nunca são processados ao mesmo tempo.
const filas = new Map<number, Promise<unknown>>();
function comTrava<T>(conta: number, fn: () => Promise<T>): Promise<T> {
  if (bug('corrida')) return fn();
  const anterior = filas.get(conta) || Promise.resolve();
  const atual = anterior.then(fn, fn);
  filas.set(conta, atual.catch(() => undefined));
  return atual;
}

/** Consulta de antifraude (simula a latência de um serviço externo). */
const consultaAntifraude = () => new Promise((r) => setTimeout(r, 15));

export type PedidoPix = { chave: string; valor: unknown; descricao?: string; idemChave?: string };

export function enviarPix(origemId: number, p: PedidoPix, agora: Date): Promise<{ pix: Pix; repetido: boolean }> {
  return comTrava(origemId, async () => {
    const idemHash = createHash('sha256').update(JSON.stringify([p.chave, String(p.valor), p.descricao || ''])).digest('hex');
    if (p.idemChave && !bug('idempotencia')) {
      const ja = db.prepare('SELECT * FROM pix WHERE origem = ? AND idem_chave = ?').get(origemId, p.idemChave) as Pix | undefined;
      if (ja) {
        if (ja.idem_hash !== idemHash) throw new ErroNegocio(422, 'IDEMPOTENCIA_CONFLITO', 'Essa chave de idempotência já foi usada com outros dados');
        return { pix: ja, repetido: true };
      }
    }
    const valor = paraCentavos(p.valor);
    const origem = cliente(origemId)!;
    const destino = clientePorChave(p.chave || '');
    if (!destino) throw new ErroNegocio(404, 'CHAVE_NAO_ENCONTRADA', 'Chave Pix não encontrada');
    if (destino.id === origem.id && !bug('autopix')) throw new ErroNegocio(422, 'PIX_PARA_SI_MESMO', 'Não é possível fazer Pix para a própria conta');
    const descricao = String(p.descricao || '').slice(0, 140);

    const saldo = cliente(origemId)!.saldo;
    // A consulta ao antifraude acontece entre ler o saldo e debitar. Sem a trava por conta,
    // vários Pix simultâneos leem o mesmo saldo aqui e todos passam na validação.
    await consultaAntifraude();

    if (bug('saldo_exato') ? valor >= saldo : valor > saldo) throw new ErroNegocio(422, 'SALDO_INSUFICIENTE', 'Saldo insuficiente');
    const usado = bug('limite_diario') ? 0 : usadoHoje(origemId, agora);
    if (usado + valor > LIMITE_DIARIO) throw new ErroNegocio(422, 'LIMITE_DIARIO', 'Limite diário de Pix excedido');
    if (ehNoturno(agora) && valor > LIMITE_NOTURNO && !bug('noturno'))
      throw new ErroNegocio(422, 'LIMITE_NOTURNO', 'Entre 20h e 6h, cada Pix pode ter no máximo R$ 1.000,00');

    const pix: Pix = {
      id: randomUUID(), origem: origemId, destino: destino.id, valor, descricao,
      status: valor > ANTIFRAUDE ? 'PENDENTE_CONFIRMACAO' : 'CONCLUIDO', criado_em: agora.toISOString(),
      idem_chave: bug('idempotencia') ? null : (p.idemChave || null), idem_hash: idemHash, saldo_apos: null,
    };
    if (pix.status === 'CONCLUIDO') pix.saldo_apos = efetivar(origemId, destino.id, valor, saldo);
    db.prepare('INSERT INTO pix (id, origem, destino, valor, descricao, status, criado_em, idem_chave, idem_hash, saldo_apos) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(pix.id, pix.origem, pix.destino, pix.valor, pix.descricao, pix.status, pix.criado_em, pix.idem_chave, pix.idem_hash, pix.saldo_apos);
    return { pix, repetido: false };
  });
}

function efetivar(origem: number, destino: number, valor: number, saldoLido: number): number {
  const novo = saldoLido - valor; // usa o saldo lido: é aqui que a corrida aparece sem a trava
  db.prepare('UPDATE clientes SET saldo = ? WHERE id = ?').run(bug('corrida') ? novo : cliente(origem)!.saldo - valor, origem);
  db.prepare('UPDATE clientes SET saldo = saldo + ? WHERE id = ?').run(valor, destino);
  return cliente(origem)!.saldo;
}

export function confirmarPix(origemId: number, id: string, senha: string, agora: Date): Promise<Pix> {
  return comTrava(origemId, async () => {
    const pix = db.prepare('SELECT * FROM pix WHERE id = ? AND origem = ?').get(id, origemId) as Pix | undefined;
    if (!pix) throw new ErroNegocio(404, 'PIX_NAO_ENCONTRADO', 'Pix não encontrado');
    if (pix.status !== 'PENDENTE_CONFIRMACAO') throw new ErroNegocio(409, 'PIX_JA_CONFIRMADO', 'Esse Pix não está aguardando confirmação');
    if (!confereSenha(senha || '', cliente(origemId)!.senha_hash)) throw new ErroNegocio(401, 'SENHA_INCORRETA', 'Senha incorreta');
    const saldo = cliente(origemId)!.saldo;
    if (pix.valor > saldo) throw new ErroNegocio(422, 'SALDO_INSUFICIENTE', 'Saldo insuficiente');
    if (usadoHoje(origemId, agora) + pix.valor > LIMITE_DIARIO) throw new ErroNegocio(422, 'LIMITE_DIARIO', 'Limite diário de Pix excedido');
    const apos = efetivar(origemId, pix.destino, pix.valor, saldo);
    db.prepare("UPDATE pix SET status = 'CONCLUIDO', saldo_apos = ?, criado_em = ? WHERE id = ?").run(apos, agora.toISOString(), id);
    return db.prepare('SELECT * FROM pix WHERE id = ?').get(id) as Pix;
  });
}

export function extrato(clienteId: number) {
  const linhas = db.prepare(`
    SELECT p.*, o.nome AS nome_origem, d.nome AS nome_destino FROM pix p
    JOIN clientes o ON o.id = p.origem JOIN clientes d ON d.id = p.destino
    WHERE (p.origem = ? OR (p.destino = ? AND p.status = 'CONCLUIDO'))
    ORDER BY p.criado_em DESC, p.rowid DESC`).all(clienteId, clienteId) as (Pix & { nome_origem: string; nome_destino: string })[];
  return linhas.map((l) => ({
    id: l.id, tipo: l.origem === clienteId ? 'ENVIADO' : 'RECEBIDO', valor: l.valor, descricao: l.descricao, status: l.status,
    contraparte: l.origem === clienteId ? l.nome_destino : l.nome_origem, criadoEm: l.criado_em,
  }));
}

export const CLIENTES_INICIAIS = [
  { nome: 'Ana Souza', email: 'ana@pixbank.dev', cpf: '11122233344', senha: 'Senha@123', saldo: 1_000_000 },
  { nome: 'Bruno Lima', email: 'bruno@pixbank.dev', cpf: '55566677788', senha: 'Senha@123', saldo: 250_000 },
  { nome: 'Carla Dias', email: 'carla@pixbank.dev', cpf: '99988877766', senha: 'Senha@123', saldo: 0 },
];

export function resetar() {
  db.exec('DELETE FROM pix; DELETE FROM clientes;');
  const ins = db.prepare('INSERT INTO clientes (nome, email, cpf, senha_hash, saldo) VALUES (?,?,?,?,?)');
  for (const c of CLIENTES_INICIAIS) ins.run(c.nome, c.email, c.cpf, hashSenha(c.senha), c.saldo);
}

/** Cria um cliente novo (usado pelos testes para ter massa isolada). */
export function criarCliente(nome: string, email: string, cpf: string, senha: string, saldo: number) {
  const r = db.prepare('INSERT INTO clientes (nome, email, cpf, senha_hash, saldo) VALUES (?,?,?,?,?)')
    .run(nome, email.toLowerCase(), cpf.replace(/\D/g, ''), hashSenha(senha), saldo);
  return cliente(Number(r.lastInsertRowid))!;
}
