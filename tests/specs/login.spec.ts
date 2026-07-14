import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe("Swag Labs - Login Flows with POM", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test("should successfully login with valid credentials", async () => {
    await loginPage.navigate();
    await loginPage.login('standard_user', 'secret_sauce');
    await expect(loginPage.page).toHaveURL(/.*inventory.html/);
  });

  test("should display error message for locked out user", async () => {
    await loginPage.navigate();
    await loginPage.login('locked_out_user', 'secret_sauce');
    await expect(loginPage.errorMessageContainer).toBeVisible();
    await expect(loginPage.errorMessageContainer).toHaveText('Epic sadface: Sorry, this user has been locked out.');
  });

  test("should display error message for invalid credentials", async () => {
    await loginPage.navigate();
    await loginPage.login('invalid_user', 'wrong_password');
    await expect(loginPage.errorMessageContainer).toBeVisible();
    await expect(loginPage.errorMessageContainer).toHaveText('Epic sadface: Username and password do not match any user in this service');
  });
});