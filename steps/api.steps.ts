import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';
import { criarUsuario } from '../api/factories';
import { contratos } from '../api/schemas';

const ID_INEXISTENTE = '0000000000000000';

Given('que existe um usuário cadastrado', async ({ usuariosApi, ctx }) => {
  ctx.usuario = criarUsuario();
  const response = await usuariosApi.cadastrar(ctx.usuario);
  expect(response.status()).toBe(201);
  ctx.usuarioId = (await response.json())._id;
});

When('cadastro um novo usuário', async ({ usuariosApi, ctx }) => {
  ctx.usuario = criarUsuario();
  ctx.response = await usuariosApi.cadastrar(ctx.usuario);
});

When('cadastro outro usuário com o mesmo email', async ({ usuariosApi, ctx }) => {
  ctx.response = await usuariosApi.cadastrar(criarUsuario({ email: ctx.usuario!.email }));
});

When('cadastro um usuário com o campo {string} igual a {string}', async ({ usuariosApi, ctx }, campo: string, valor: string) => {
  ctx.response = await usuariosApi.cadastrar(criarUsuario({ [campo]: valor }));
});

When('busco esse usuário pelo id', async ({ usuariosApi, ctx }) => {
  ctx.response = await usuariosApi.buscar(ctx.usuarioId!);
});

When('busco um usuário com id inexistente', async ({ usuariosApi, ctx }) => {
  ctx.response = await usuariosApi.buscar(ID_INEXISTENTE);
});

When('listo os usuários filtrando pelo email dele', async ({ usuariosApi, ctx }) => {
  ctx.response = await usuariosApi.listar({ email: ctx.usuario!.email });
});

When('altero o nome desse usuário para {string}', async ({ usuariosApi, ctx }, nome: string) => {
  ctx.usuario = { ...ctx.usuario!, nome };
  ctx.response = await usuariosApi.editar(ctx.usuarioId!, ctx.usuario);
});

When('excluo esse usuário', async ({ usuariosApi, ctx }) => {
  ctx.response = await usuariosApi.excluir(ctx.usuarioId!);
});

When('faço login na API com esse usuário', async ({ loginApi, ctx }) => {
  ctx.response = await loginApi.login(ctx.usuario!.email, ctx.usuario!.password);
});

When('faço login na API com a senha {string}', async ({ loginApi, ctx }, senha: string) => {
  ctx.response = await loginApi.login(ctx.usuario!.email, senha);
});

Then('a resposta tem status {int}', async ({ ctx }, status: number) => {
  expect(ctx.response!.status()).toBe(status);
});

Then('a mensagem é {string}', async ({ ctx }, mensagem: string) => {
  expect((await ctx.response!.json()).message).toBe(mensagem);
});

Then('o campo {string} retorna a mensagem {string}', async ({ ctx }, campo: string, mensagem: string) => {
  expect((await ctx.response!.json())[campo]).toBe(mensagem);
});

Then('a resposta segue o contrato de {string}', async ({ ctx }, nomeContrato: string) => {
  const schema = contratos[nomeContrato];
  expect(schema, `Contrato "${nomeContrato}" não está definido`).toBeDefined();

  const resultado = schema.safeParse(await ctx.response!.json());
  expect(
    resultado.success,
    resultado.success ? '' : `Contrato violado:\n${JSON.stringify(resultado.error.issues, null, 2)}`,
  ).toBe(true);
});

Then('o usuário retornado tem os dados cadastrados', async ({ ctx }) => {
  const body = await ctx.response!.json();
  expect(body).toMatchObject({
    nome: ctx.usuario!.nome,
    email: ctx.usuario!.email,
    administrador: ctx.usuario!.administrador,
  });
});

Then('a lista contém apenas esse usuário', async ({ ctx }) => {
  const body = await ctx.response!.json();
  expect(body.quantidade).toBe(1);
  expect(body.usuarios[0].email).toBe(ctx.usuario!.email);
});

Then('o usuário não existe mais', async ({ usuariosApi, ctx }) => {
  const response = await usuariosApi.buscar(ctx.usuarioId!);
  expect(response.status()).toBe(400);
});