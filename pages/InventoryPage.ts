import { Page, Locator } from '@playwright/test';

export const OPCOES_ORDENACAO: Record<string, string> = {
  'nome A-Z': 'az',
  'nome Z-A': 'za',
  'menor preço': 'lohi',
  'maior preço': 'hilo',
};

export class InventoryPage {
  readonly titulo: Locator;
  readonly badgeCarrinho: Locator;
  readonly linkCarrinho: Locator;
  readonly ordenacao: Locator;
  readonly nomesProdutos: Locator;
  readonly precosProdutos: Locator;

  constructor(private page: Page) {
    this.titulo = page.getByTestId('title');
    this.badgeCarrinho = page.getByTestId('shopping-cart-badge');
    this.linkCarrinho = page.getByTestId('shopping-cart-link');
    this.ordenacao = page.getByTestId('product-sort-container');
    this.nomesProdutos = page.getByTestId('inventory-item-name');
    this.precosProdutos = page.getByTestId('inventory-item-price');
  }

  async adicionarAoCarrinho(produto: string) {
    await this.page.getByTestId(`add-to-cart-${produto}`).click();
  }

  async removerDoCarrinho(produto: string) {
    await this.page.getByTestId(`remove-${produto}`).click();
  }

  async irParaCarrinho() {
    await this.linkCarrinho.click();
  }

  async ordenarPor(criterio: string) {
    await this.ordenacao.selectOption(OPCOES_ORDENACAO[criterio]);
  }

  async nomes(): Promise<string[]> {
    return this.nomesProdutos.allTextContents();
  }

  async precos(): Promise<number[]> {
    const textos = await this.precosProdutos.allTextContents();
    return textos.map((texto) => parseFloat(texto.replace('$', '')));
  }
}