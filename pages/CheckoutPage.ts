import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly nome: Locator;
  readonly sobrenome: Locator;
  readonly cep: Locator;
  readonly botaoContinuar: Locator;
  readonly botaoFinalizar: Locator;
  readonly subtotal: Locator;
  readonly confirmacao: Locator;
  readonly erro: Locator;

  constructor(private page: Page) {
    this.nome = page.getByTestId('firstName');
    this.sobrenome = page.getByTestId('lastName');
    this.cep = page.getByTestId('postalCode');
    this.botaoContinuar = page.getByTestId('continue');
    this.botaoFinalizar = page.getByTestId('finish');
    this.subtotal = page.getByTestId('subtotal-label');
    this.confirmacao = page.getByTestId('complete-header');
    this.erro = page.getByTestId('error');
  }

  async preencherDados(nome: string, sobrenome: string, cep: string) {
    await this.nome.fill(nome);
    await this.sobrenome.fill(sobrenome);
    await this.cep.fill(cep);
    await this.botaoContinuar.click();
  }

  async finalizar() {
    await this.botaoFinalizar.click();
  }
}