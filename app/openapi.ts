/** Contrato da API do PixBank (OpenAPI 3.1). Os testes de contrato validam as respostas contra estes schemas. */
const erro = { type: 'object', required: ['erro', 'mensagem'], properties: { erro: { type: 'string' }, mensagem: { type: 'string' } } };
const pix = {
  type: 'object', required: ['id', 'valor', 'descricao', 'status', 'criadoEm', 'destino', 'saldoApos'],
  properties: {
    id: { type: 'string', format: 'uuid' }, valor: { type: 'integer', minimum: 1, description: 'Centavos' },
    descricao: { type: 'string' }, status: { enum: ['CONCLUIDO', 'PENDENTE_CONFIRMACAO'] },
    criadoEm: { type: 'string', format: 'date-time' }, destino: { type: 'string' }, saldoApos: { type: ['integer', 'null'] },
  },
};
export const openapi = {
  openapi: '3.1.0',
  info: { title: 'PixBank API', version: '1.0.0', description: 'Mini banco digital criado para demonstrar uma estratégia de testes completa. Valores em centavos.' },
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
    schemas: { Erro: erro, Pix: pix },
  },
  paths: {
    '/api/login': { post: { summary: 'Login', responses: { 200: { description: 'Token JWT' }, 401: { description: 'Credenciais inválidas' }, 429: { description: 'Muitas tentativas' } } } },
    '/api/conta': { get: { summary: 'Saldo e limites', security: [{ bearer: [] }] } },
    '/api/pix': { post: { summary: 'Enviar Pix (header opcional Idempotency-Key)', security: [{ bearer: [] }] } },
    '/api/pix/{id}': { get: { summary: 'Comprovante de Pix', security: [{ bearer: [] }] } },
    '/api/pix/{id}/confirmar': { post: { summary: 'Confirmar Pix acima de R$ 2.000 com a senha', security: [{ bearer: [] }] } },
    '/api/extrato': { get: { summary: 'Extrato, do mais recente ao mais antigo', security: [{ bearer: [] }] } },
  },
};
