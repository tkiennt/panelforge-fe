import { Page, Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly logo: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly heroSection: Locator;
  readonly navFeaturesLink: Locator;
  readonly navWorkflowLink: Locator;
  readonly navShowcaseLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator('span:has-text("PanelForge")').first();
    this.loginButton = page.locator('button[aria-label="Đăng nhập"]').first();
    this.registerButton = page.locator('button[aria-label="Tạo tài khoản"]').first();
    this.heroSection = page.locator('#hero-section');
    this.navFeaturesLink = page.locator('a[href="#block-features"]');
    this.navWorkflowLink = page.locator('a[href="#block-workflow"]');
    this.navShowcaseLink = page.locator('a[href="#block-showcase"]');
  }

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async openLoginModal() {
    await this.loginButton.click();
    await this.page.waitForSelector('[role="dialog"], form', { state: 'visible' });
  }

  async openRegisterModal() {
    await this.registerButton.click();
    await this.page.waitForSelector('[role="dialog"], form', { state: 'visible' });
  }
}
