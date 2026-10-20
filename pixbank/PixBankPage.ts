import { expect, Locator, Page } from '@playwright/test';
import { PIXBANK_URL } from './config';

/** Page Object do app web do PixBank. */
export class PixBankPage {
  readonly saldo: Locator;
  readonly resultado: Locator;
  readonly itensExtrato: Locator;

  constructor(private readonly page: Page) {
    this.saldo = page.getByTestId('saldo');
    this.resultado = page.getByTestId('resultado-pix');
    this.itensExtrato = page.getByTestId('item-extrato');
  }

  async abrir() {
    await this.page.goto(PIXBANK_URL);
  }

  async entrar(email: string, senha: string) {
    const login = this.page.getByRole('region', { name: 'Entrar na sua conta' });
    await login.getByLabel('E-mail').fill(email);
    await login.getByLabel('Senha').fill(senha);
    await login.getByRole('button', { name: 'Entrar' }).click();
  }

  async enviarPix(chave: string, valor: string, descricao = '') {
    await this.page.getByTestId('chave').fill(chave);
    await this.page.getByTestId('valor').fill(valor);
    if (descricao) await this.page.getByTestId('descricao').fill(descricao);
    await this.page.getByRole('button', { name: 'Enviar Pix' }).click();
  }

  async confirmarComSenha(senha: string) {
    const dialogo = this.page.getByRole('dialog', { name: 'Confirme o Pix' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel('Senha').fill(senha);
    await dialogo.getByRole('button', { name: 'Confirmar' }).click();
  }

  erroLogin() {
    return this.page.getByTestId('erro-login');
  }
}
