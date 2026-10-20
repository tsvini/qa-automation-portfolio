/**
 * Bugs plantados de propósito, para provar que a suíte de testes os detecta.
 * Cada execução do pipeline "caça aos bugs" liga UM bug (BUG=<id>) e espera que algum teste falhe.
 * Sem a variável BUG, o PixBank funciona corretamente.
 */
export const BUGS = {
  arredondamento: 'Converte reais para centavos truncando (R$ 19,99 vira 1998 centavos)',
  limite_diario: 'O limite diário ignora os Pix já feitos no dia',
  saldo_exato: 'Rejeita um Pix com valor exatamente igual ao saldo',
  idempotencia: 'Ignora a Idempotency-Key e debita duas vezes o mesmo Pix',
  corrida: 'Sem trava por conta: Pix simultâneos gastam o mesmo saldo',
  bola: 'Qualquer usuário consegue ver o comprovante de Pix de outra conta',
  noturno: 'Não aplica o limite noturno (20h às 6h)',
  autopix: 'Permite fazer Pix para a própria conta',
  ui_saldo: 'A tela mostra o saldo em centavos como se fossem reais',
  a11y_rotulo: 'O campo de valor do Pix fica sem rótulo acessível',
} as const;

export type BugId = keyof typeof BUGS;

const ativo = (process.env.BUG || '').trim() as BugId | '';
if (ativo && !(ativo in BUGS)) throw new Error(`BUG desconhecido: ${ativo}`);

export const bug = (id: BugId): boolean => ativo === id;
export const bugAtivo = (): BugId | null => (ativo || null);
