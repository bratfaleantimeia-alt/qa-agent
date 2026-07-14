import { expect, type Page, type Locator } from '@playwright/test';

export class DynamicPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessageContainer: Locator;
  readonly appLogo: Locator;
  readonly loginCredentialsDisplay: Locator;
  readonly loginPasswordDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    // The HTML shows <div class="error-message-container"></div>.
    // Swag Labs typically adds an <h3 data-test="error"> inside this container when an error occurs.
    this.errorMessageContainer = page.locator('.error-message-container');
    this.appLogo = page.locator('.login_logo');
    this.loginCredentialsDisplay = page.locator('[data-test="login-credentials"]');
    this.loginPasswordDisplay = page.locator('[data-test="login-password"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/');
  }

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async getErrorMessageText(): Promise<string | null> {
    // Check for the specific error H3 element inside the container first, as per Swag Labs common DOM.
    const errorH3 = this.errorMessageContainer.locator('h3[data-test="error"]');
    if (await errorH3.isVisible()) {
      return await errorH3.textContent();
    }
    // Fallback if the error message is directly in the container or not in H3, though less common for Swag Labs.
    if (await this.errorMessageContainer.isVisible()) {
        return await this.errorMessageContainer.textContent();
    }
    return null;
  }

  async getPasswordInputFieldType(): Promise<string | null> {
    // This method is included for completeness but not directly used for Swag Labs as
    // 'Show/Hide' functionality is not present in the provided HTML.
    return await this.passwordInput.getAttribute('type');
  }
}