import { APIResponse } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { UsuariosClient } from '../api/clients/UsuariosClient';
import { LoginClient } from '../api/clients/LoginClient';
import { Usuario } from '../api/factories';

type Ctx = { usuario?: Usuario; usuarioId?: string; response?: APIResponse };

type Fixtures = {
  ctx: Ctx;
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  usuariosApi: UsuariosClient;
  loginApi: LoginClient;
};

export const test = base.extend<Fixtures>({
  ctx: async ({}, use) => use({}),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  usuariosApi: async ({ request }, use) => {
    const client = new UsuariosClient(request);
    await use(client);
    await client.limparCriados();
  },
  loginApi: async ({ request }, use) => use(new LoginClient(request)),
});

export const { Given, When, Then, Before, After } = createBdd(test);