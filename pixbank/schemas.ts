import { z } from 'zod';

const erro = z.object({ erro: z.string(), mensagem: z.string() }).strict();
const pix = z.object({
  id: z.uuid(),
  valor: z.number().int().positive(),
  descricao: z.string(),
  status: z.enum(['CONCLUIDO', 'PENDENTE_CONFIRMACAO']),
  criadoEm: z.iso.datetime(),
  destino: z.string(),
  saldoApos: z.number().int().nonnegative().nullable(),
}).strict();
const conta = z.object({
  nome: z.string(), email: z.email(), saldo: z.number().int().nonnegative(),
  limiteDiario: z.number().int(), usadoHoje: z.number().int().nonnegative(), limiteRestante: z.number().int().nonnegative(),
  periodoNoturno: z.boolean(), limiteNoturnoPorPix: z.number().int(),
}).strict();
const itemExtrato = z.object({
  id: z.uuid(), tipo: z.enum(['ENVIADO', 'RECEBIDO']), valor: z.number().int().positive(), descricao: z.string(),
  status: z.enum(['CONCLUIDO', 'PENDENTE_CONFIRMACAO']), contraparte: z.string(), criadoEm: z.iso.datetime(),
}).strict();

export const contratosPixBank = { erro, pix, conta, extrato: z.array(itemExtrato) } as const;
export type ContratoPixBank = keyof typeof contratosPixBank;
