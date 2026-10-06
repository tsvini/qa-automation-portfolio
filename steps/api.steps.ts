import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

const API = 'https://serverest.dev';

function novoUsuario() {
  return {
    nome: 'QA Portfolio',
    email: `qa.${Date.now()}.${Math.floor(Math.random() * 10000)}@teste.com`,
    password: 'senha123',
    administrador: 'true',
  };
}

Given('que existe um usuário cadastrado', async ({ request, ctx }) => {
  ctx.usuario = novoUsuario();
  const res = await request.post(`${API}/usuarios`, { data: ctx.usuario });
  expect(res.status()).toBe(201);
});

When('cadastro um novo usuário com email único', async ({ request, ctx }) => {
  ctx.usuario = novoUsuario();
  ctx.response = await request.post(`${API}/usuarios`, { data: ctx.usuario });
});

When('cadastro outro usuário com o mesmo email', async ({ request, ctx }) => {
  ctx.response = await request.post(`${API}/usuarios`, {
    data: { ...ctx.usuario!, nome: 'Outro Nome' },
  });
});

When('faço login na API com esse usuário', async ({ request, ctx }) => {
  ctx.response = await request.post(`${API}/login`, {
    data: { email: ctx.usuario!.email, password: ctx.usuario!.password },
  });
});

Then('a resposta tem status {int}', async ({ ctx }, status: number) => {
  expect(ctx.response!.status()).toBe(status);
});

Then('a mensagem é {string}', async ({ ctx }, mensagem: string) => {
  const body = await ctx.response!.json();
  expect(body.message).toBe(mensagem);
});

Then('recebo um token de autorização', async ({ ctx }) => {
  const body = await ctx.response!.json();
  expect(body.authorization).toMatch(/^Bearer /);
});