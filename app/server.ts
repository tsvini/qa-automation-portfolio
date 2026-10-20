import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { bug, bugAtivo, BUGS } from './bugs';
import {
  ErroNegocio, cliente, clientePorEmail, confereSenha, confirmarPix, criarCliente, enviarPix, extrato, resetar, resumoConta, type Pix,
} from './dominio';
import { db } from './db';
import { openapi } from './openapi';

const SEGREDO = process.env.JWT_SECRET || 'pixbank-segredo-local';
const MODO_TESTE = process.env.MODO_TESTE !== '0';

// ---------- token (HMAC-SHA256, formato JWT) ----------
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
function assinar(sub: number): string {
  const corpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${corpo}.${createHmac('sha256', SEGREDO).update(corpo).digest('base64url')}`;
}
function verificar(token: string): number | null {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const esperado = createHmac('sha256', SEGREDO).update(`${h}.${p}`).digest('base64url');
  if (s.length !== esperado.length || !timingSafeEqual(Buffer.from(s), Buffer.from(esperado))) return null;
  try {
    const dados = JSON.parse(Buffer.from(p, 'base64url').toString());
    return dados.exp > Date.now() / 1000 ? Number(dados.sub) : null;
  } catch { return null; }
}

// ---------- proteção contra força bruta no login ----------
const tentativas = new Map<string, { n: number; ate: number }>();

export function construirApp() {
  const app = Fastify({ logger: false, bodyLimit: 16 * 1024 });

  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
    return payload;
  });

  app.setErrorHandler((err: Error & { statusCode?: number; validation?: unknown }, _req, reply) => {
    if (err instanceof ErroNegocio) return reply.status(err.status).send({ erro: err.codigo, mensagem: err.message });
    if (err.validation) return reply.status(400).send({ erro: 'REQUISICAO_INVALIDA', mensagem: err.message });
    if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ erro: 'REQUISICAO_INVALIDA', mensagem: err.message });
    app.log.error(err);
    return reply.status(500).send({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno' });
  });

  // Relógio controlável nos testes (para validar regras de horário de forma determinística).
  const agora = (req: { headers: Record<string, unknown> }) => {
    const h = req.headers['x-relogio'];
    if (MODO_TESTE && typeof h === 'string' && !Number.isNaN(Date.parse(h))) return new Date(h);
    return new Date();
  };

  const autenticado = async (req: { headers: Record<string, unknown>; clienteId?: number }) => {
    const auth = String(req.headers.authorization || '');
    const id = auth.startsWith('Bearer ') ? verificar(auth.slice(7)) : null;
    if (!id || !cliente(id)) throw new ErroNegocio(401, 'NAO_AUTENTICADO', 'Faça login para continuar');
    req.clienteId = id;
  };

  app.get('/api/saude', async () => ({ status: 'ok', bug: bugAtivo() }));
  app.get('/api/openapi.json', async () => openapi);

  app.post('/api/login', {
    schema: { body: { type: 'object', required: ['email', 'senha'], properties: { email: { type: 'string', maxLength: 120 }, senha: { type: 'string', maxLength: 120 } } } },
  }, async (req, reply) => {
    const { email, senha } = req.body as { email: string; senha: string };
    const chave = email.toLowerCase();
    const t = tentativas.get(chave);
    if (t && t.n >= 5 && t.ate > Date.now()) return reply.status(429).send({ erro: 'MUITAS_TENTATIVAS', mensagem: 'Muitas tentativas. Tente de novo em 1 minuto.' });
    const c = clientePorEmail(email);
    if (!c || !confereSenha(senha, c.senha_hash)) {
      const n = (t && t.ate > Date.now() ? t.n : 0) + 1;
      tentativas.set(chave, { n, ate: Date.now() + 60_000 });
      return reply.status(401).send({ erro: 'CREDENCIAIS_INVALIDAS', mensagem: 'E-mail ou senha incorretos' });
    }
    tentativas.delete(chave);
    return { token: assinar(c.id), nome: c.nome };
  });

  app.register(async (priv) => {
    priv.addHook('preHandler', autenticado);

    priv.get('/api/conta', async (req) => resumoConta(cliente((req as unknown as { clienteId: number }).clienteId)!, agora(req)));

    priv.post('/api/pix', {
      schema: {
        body: {
          type: 'object', required: ['chave', 'valor'], additionalProperties: false,
          properties: { chave: { type: 'string', minLength: 1, maxLength: 120 }, valor: { anyOf: [{ type: 'number' }, { type: 'string', maxLength: 20 }] }, descricao: { type: 'string', maxLength: 140 } },
        },
      },
    }, async (req, reply) => {
      const id = (req as unknown as { clienteId: number }).clienteId;
      const idem = req.headers['idempotency-key'];
      const r = await enviarPix(id, { ...(req.body as object), idemChave: typeof idem === 'string' ? idem : undefined } as never, agora(req));
      return reply.status(r.repetido ? 200 : 201).send(publico(r.pix));
    });

    priv.post('/api/pix/:id/confirmar', {
      schema: { body: { type: 'object', required: ['senha'], properties: { senha: { type: 'string', maxLength: 120 } } } },
    }, async (req) => {
      const id = (req as unknown as { clienteId: number }).clienteId;
      return publico(await confirmarPix(id, (req.params as { id: string }).id, (req.body as { senha: string }).senha, agora(req)));
    });

    priv.get('/api/pix/:id', async (req) => {
      const id = (req as unknown as { clienteId: number }).clienteId;
      const pix = db.prepare('SELECT * FROM pix WHERE id = ?').get((req.params as { id: string }).id) as Pix | undefined;
      // Responde 404 (e não 403) para não revelar que o Pix existe.
      if (!pix || (!bug('bola') && pix.origem !== id && pix.destino !== id)) throw new ErroNegocio(404, 'PIX_NAO_ENCONTRADO', 'Pix não encontrado');
      return publico(pix);
    });

    priv.get('/api/extrato', async (req) => extrato((req as unknown as { clienteId: number }).clienteId));
  });

  // Rotas só para testes: massa de dados isolada e reset do banco.
  if (MODO_TESTE) {
    app.post('/api/teste/reset', async () => { resetar(); tentativas.clear(); return { ok: true }; });
    app.post('/api/teste/clientes', async (req, reply) => {
      const b = req.body as { nome: string; email: string; cpf: string; senha: string; saldo: number };
      const c = criarCliente(b.nome, b.email, b.cpf, b.senha, b.saldo);
      return reply.status(201).send({ id: c.id, email: c.email, cpf: c.cpf, saldo: c.saldo });
    });
    app.get('/api/teste/bugs', async () => ({ ativo: bugAtivo(), catalogo: BUGS }));
  }

  app.register(fastifyStatic, { root: path.join(__dirname, 'web'), index: 'index.html' });
  return app;
}

const publico = (p: Pix) => ({
  id: p.id, valor: p.valor, descricao: p.descricao, status: p.status, criadoEm: p.criado_em,
  destino: cliente(p.destino)?.nome, saldoApos: p.saldo_apos,
});

if (require.main === module) {
  resetar();
  const porta = Number(process.env.PORT || 3000);
  construirApp().listen({ port: porta, host: '0.0.0.0' }).then(() => {
    console.log(`PixBank rodando em http://localhost:${porta}${bugAtivo() ? ` (BUG ativo: ${bugAtivo()})` : ''}`);
  });
}
