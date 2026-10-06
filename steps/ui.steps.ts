import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('que estou na página de login', async ({ loginPage }) => {
  await loginPage.abrir();
});

Given('que estou logado como {string}', async ({ loginPage }, usuario: string) => {
  await loginPage.abrir();
  await loginPage.login(usuario, 'secret_sauce');
});

When('faço login com o usuário {string} e a senha {string}', async ({ loginPage }, usuario: string, senha: string) => {
  await loginPage.login(usuario, senha);
});

When('adiciono o produto {string} ao carrinho', async ({ inventoryPage }, produto: string) => {
  await inventoryPage.adicionarAoCarrinho(produto);
});

Then('vejo a página de produtos', async ({ inventoryPage }) => {
  await expect(inventoryPage.titulo).toHaveText('Products');
});

Then('vejo a mensagem de erro {string}', async ({ loginPage }, mensagem: string) => {
  await expect(loginPage.erro).toHaveText(mensagem);
});

Then('o carrinho mostra {int} item/itens', async ({ inventoryPage }, quantidade: number) => {
  await expect(inventoryPage.badgeCarrinho).toHaveText(String(quantidade));
});