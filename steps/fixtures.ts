import { APIResponse } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { UsuariosClient } from '../api/clients/UsuariosClient';
import { LoginClient } from '../api/clients/LoginClient';
import { Usuario } from '../api/factories';
import { PixBankClient, ClienteTeste } from '../pixbank/PixBankClient';
import { PixBankPage } from '../pixbank/PixBankPage';

type Ctx = { usuario?: Usuario; usuarioId?: string; response?: APIResponse };

/** Estado de um cenário do PixBank: clientes criados, respostas e o último Pix. */
export type PixCtx = {
  clientes: Record<string, ClienteTeste>;
  respostas: APIResponse[];
  pixId?: string;
  idem?: string;
  simultaneos?: { status: number; corpo: { erro?: string } }[];
};

type Fixtures = {
  ctx: Ctx;
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  usuariosApi: UsuariosClient;
  loginApi: LoginClient;
  pixbank: PixBankClient;
  pixbankPage: PixBankPage;
  pix: PixCtx;
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
  pixbank: async ({ request }, use) => use(new PixBankClient(request)),
  pixbankPage: async ({ page }, use) => use(new PixBankPage(page)),
  pix: async ({}, use) => use({ clientes: {}, respostas: [] }),
});

export const { Given, When, Then, Before, After } = createBdd(test);