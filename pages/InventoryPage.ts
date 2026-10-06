import { Page, Locator } from '@playwright/test';

export class InventoryPage {
  readonly titulo: Locator;
  readonly badgeCarrinho: Locator;

  constructor(private page: Page) {
    this.titulo = page.getByTestId('title');
    this.badgeCarrinho = page.getByTestId('shopping-cart-badge');
  }

  async adicionarAoCarrinho(produto: string) {
    await this.page.getByTestId(`add-to-cart-${produto}`).click();
  }
}