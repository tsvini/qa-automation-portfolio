import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly itens: Locator;
  readonly botaoCheckout: Locator;

  constructor(private page: Page) {
    this.itens = page.getByTestId('inventory-item');
    this.botaoCheckout = page.getByTestId('checkout');
  }

  async iniciarCheckout() {
    await this.botaoCheckout.click();
  }
}