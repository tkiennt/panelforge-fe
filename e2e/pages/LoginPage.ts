import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successNotice: Locator;
  readonly forgotPasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#login-email, input[type="email"]').first();
    this.passwordInput = page.locator('#login-password, input[type="password"]').first();
    this.submitButton = page.locator('button[type="submit"]:has-text("Đăng nhập")').first();
    this.errorMessage = page.locator('[role="alert"]').first();
    this.successNotice = page.locator('[role="status"]').first();
    this.forgotPasswordButton = page.locator('button:has-text("Quên mật khẩu?")').first();
  }

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }
}
