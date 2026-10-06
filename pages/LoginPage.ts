import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly usuario: Locator;
  readonly senha: Locator;
  readonly botaoLogin: Locator;
  readonly erro: Locator;

  constructor(private page: Page) {
    this.usuario = page.getByTestId('username');
    this.senha = page.getByTestId('password');
    this.botaoLogin = page.getByTestId('login-button');
    this.erro = page.getByTestId('error');
  }

  async abrir() {
    await this.page.goto('/');
  }

  async login(usuario: string, senha: string) {
    await this.usuario.fill(usuario);
    await this.senha.fill(senha);
    await this.botaoLogin.click();
  }
}