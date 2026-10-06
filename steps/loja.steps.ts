import { expect } from '@playwright/test';
import { When, Then } from './fixtures';

When('vou para o carrinho', async ({ inventoryPage }) => {
  await inventoryPage.irParaCarrinho();
});

When('inicio o checkout', async ({ cartPage }) => {
  await cartPage.iniciarCheckout();
});

When(
  'preencho os dados de entrega com nome {string}, sobrenome {string} e CEP {string}',
  async ({ checkoutPage }, nome: string, sobrenome: string, cep: string) => {
    await checkoutPage.preencherDados(nome, sobrenome, cep);
  },
);

When('finalizo a compra', async ({ checkoutPage }) => {
  await checkoutPage.finalizar();
});

When('removo o produto {string} do carrinho', async ({ inventoryPage }, produto: string) => {
  await inventoryPage.removerDoCarrinho(produto);
});

When('ordeno os produtos por {string}', async ({ inventoryPage }, criterio: string) => {
  await inventoryPage.ordenarPor(criterio);
});

Then('vejo a confirmação {string}', async ({ checkoutPage }, mensagem: string) => {
  await expect(checkoutPage.confirmacao).toHaveText(mensagem);
});

Then('o subtotal é {string}', async ({ checkoutPage }, subtotal: string) => {
  await expect(checkoutPage.subtotal).toHaveText(subtotal);
});

Then('vejo o erro de checkout {string}', async ({ checkoutPage }, mensagem: string) => {
  await expect(checkoutPage.erro).toHaveText(mensagem);
});

Then('o carrinho fica vazio', async ({ inventoryPage }) => {
  await expect(inventoryPage.badgeCarrinho).toHaveCount(0);
});

Then('os produtos ficam ordenados por {string}', async ({ inventoryPage }, criterio: string) => {
  if (criterio.includes('preço')) {
    const precos = await inventoryPage.precos();
    const esperado = [...precos].sort((a, b) => a - b);
    if (criterio === 'maior preço') esperado.reverse();
    expect(precos).toEqual(esperado);
  } else {
    const nomes = await inventoryPage.nomes();
    const esperado = [...nomes].sort((a, b) => a.localeCompare(b));
    if (criterio === 'nome Z-A') esperado.reverse();
    expect(nomes).toEqual(esperado);
  }
});