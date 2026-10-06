import { APIResponse } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';

type Usuario = { nome: string; email: string; password: string; administrador: string };
type Ctx = { usuario?: Usuario; response?: APIResponse };

export const test = base.extend<{ ctx: Ctx; loginPage: LoginPage; inventoryPage: InventoryPage }>({
  ctx: async ({}, use) => use({}),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
});

export const { Given, When, Then } = createBdd(test);