import { Page, Locator } from '@playwright/test';

export class CatalogPage {
  readonly page: Page;
  readonly title: Locator;
  readonly searchInput: Locator;
  readonly searchSubmitButton: Locator;
  readonly genreButtons: Locator;
  readonly seriesCards: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1:has-text("Thư Viện Tác Phẩm Xuất Bản")');
    this.searchInput = page.locator('input[placeholder*="Tìm kiếm"]').first();
    this.searchSubmitButton = page.locator('button[type="submit"]:has-text("Tìm")').first();
    this.genreButtons = page.locator('div.custom-scrollbar button');
    this.seriesCards = page.locator('div.grid button');
    this.refreshButton = page.locator('button[title="Làm mới danh mục"]').first();
  }

  async goto() {
    await this.page.goto('/catalog', { waitUntil: 'domcontentloaded' });
  }

  async search(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.searchSubmitButton.click();
  }

  async selectGenre(genreName: string) {
    await this.page.locator(`div.custom-scrollbar button:has-text("${genreName}")`).click();
  }
}
