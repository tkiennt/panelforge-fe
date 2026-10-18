import { Page, Locator } from '@playwright/test';

export class WorkspacePage {
  readonly page: Page;
  readonly title: Locator;
  readonly createStudioButton: Locator;
  readonly workspaceCards: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1:has-text("Không Gian Làm Việc"), h2:has-text("Studio")').first();
    this.createStudioButton = page.locator('button:has-text("Tạo Studio"), button:has-text("Tạo Workspace")').first();
    this.workspaceCards = page.locator('[data-testid^="workspace-card"], .cursor-pointer').filter({ hasText: /Studio|Workspace/i });
    this.logoutButton = page.locator('button:has-text("Đăng xuất")').first();
  }

  async goto() {
    await this.page.goto('/workspaces', { waitUntil: 'domcontentloaded' });
  }

  async selectWorkspace(name: string) {
    await this.page.locator(`text="${name}"`).first().click();
  }
}
