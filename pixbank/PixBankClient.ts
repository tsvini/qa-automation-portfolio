import { APIRequestContext, APIResponse, request as pwRequest } from '@playwright/test';
import { fakerPT_BR as faker } from '@faker-js/faker';
import { PIXBANK_URL, HORARIO_COMERCIAL } from './config';

export type ClienteTeste = { nome: string; email: string; cpf: string; senha: string; token?: string };

/** Camada de serviço da API do PixBank. Cada teste cria os próprios clientes, então tudo roda em paralelo. */
export class PixBankClient {
  constructor(private readonly request: APIRequestContext) {}

  private url = (p: string) => `${PIXBANK_URL}${p}`;

  async criarCliente(saldoReais: number, senha = 'Senha@123'): Promise<ClienteTeste> {
    const nome = faker.person.fullName();
    const cliente: ClienteTeste = {
      nome, senha,
      email: `${faker.string.alphanumeric(10).toLowerCase()}@teste.pixbank.dev`,
      cpf: faker.string.numeric(11),
    };
    const r = await this.request.post(this.url('/api/teste/clientes'), {
      data: { ...cliente, saldo: Math.round(saldoReais * 100) },
    });
    if (r.status() !== 201) throw new Error(`Falha ao criar cliente de teste: ${r.status()} ${await r.text()}`);
    return cliente;
  }

  login(email: string, senha: string): Promise<APIResponse> {
    return this.request.post(this.url('/api/login'), { data: { email, senha } });
  }

  async autenticar(c: ClienteTeste): Promise<string> {
    const r = await this.login(c.email, c.senha);
    if (r.status() !== 200) throw new Error(`Login falhou para ${c.email}: ${r.status()}`);
    c.token = (await r.json()).token;
    return c.token!;
  }

  private headers(token?: string, extra: Record<string, string> = {}) {
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Relogio': HORARIO_COMERCIAL, ...extra };
  }

  conta(token?: string, relogio?: string) {
    return this.request.get(this.url('/api/conta'), { headers: this.headers(token, relogio ? { 'X-Relogio': relogio } : {}) });
  }

  pix(token: string, corpo: { chave: string; valor: number | string; descricao?: string }, opcoes: { idem?: string; relogio?: string } = {}) {
    return this.request.post(this.url('/api/pix'), {
      data: corpo,
      headers: this.headers(token, {
        ...(opcoes.idem ? { 'Idempotency-Key': opcoes.idem } : {}),
        ...(opcoes.relogio ? { 'X-Relogio': opcoes.relogio } : {}),
      }),
    });
  }

  /**
   * Dispara N Pix em paralelo, cada um na sua própria conexão HTTP.
   * (Um único contexto reaproveita a conexão e acaba enfileirando as chamadas, o que esconderia a condição de corrida.)
   */
  async pixSimultaneos(token: string, corpo: { chave: string; valor: number | string }, n: number) {
    const contextos = await Promise.all(Array.from({ length: n }, () => pwRequest.newContext()));
    try {
      const respostas = await Promise.all(contextos.map((ctx) =>
        ctx.post(this.url('/api/pix'), { data: corpo, headers: this.headers(token) })));
      return await Promise.all(respostas.map(async (r) => ({ status: r.status(), corpo: await r.json() })));
    } finally {
      await Promise.all(contextos.map((c) => c.dispose()));
    }
  }

  confirmar(token: string, id: string, senha: string) {
    return this.request.post(this.url(`/api/pix/${id}/confirmar`), { data: { senha }, headers: this.headers(token) });
  }

  comprovante(token: string, id: string) {
    return this.request.get(this.url(`/api/pix/${id}`), { headers: this.headers(token) });
  }

  extrato(token: string) {
    return this.request.get(this.url('/api/extrato'), { headers: this.headers(token) });
  }

  bruta(caminho: string, token?: string) {
    return this.request.get(this.url(caminho), { headers: this.headers(token) });
  }

  async saldo(token: string): Promise<number> {
    return (await (await this.conta(token)).json()).saldo;
  }
}
