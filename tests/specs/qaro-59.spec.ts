import { test, expect } from '@playwright/test';
import { DynamicPage } from '../pages/DynamicPage.js';

test.describe('Login Feature Tests - Swag Labs Specific Implementations', () => {
  let dynamicPage: DynamicPage;

  test.beforeEach(async ({ page }) => {
    dynamicPage = new DynamicPage(page);
    await dynamicPage.navigate();
  });

  // Data for Swag Labs credentials, as provided in the HTML comments.
  const VALID_USERNAME = 'standard_user';
  // const LOCKED_OUT_USERNAME = 'locked_out_user'; // For specific lockout test, but not used for generic tests.
  const VALID_PASSWORD = 'secret_sauce';

  // TC001: Verify presence of all required UI elements on Login Form
  test('TC001 - Verify presence of required UI elements on Login Form', async () => {
    // Note: The Swag Labs HTML does not include a 'Show/Hide' toggle icon,
    // a 'Forgot Password?' link, or a dedicated global notification area for security errors
    // as described in the original generic test case. This test verifies only the elements
    // that are actually present in the provided HTML DOM.
    await expect(dynamicPage.usernameInput).toBeVisible();
    await expect(dynamicPage.passwordInput).toBeVisible();
    await expect(dynamicPage.loginButton).toBeVisible();
    // Verify the error message container is present, though likely empty initially.
    await expect(dynamicPage.errorMessageContainer).toBeEmpty();
    // Also verifying other non-interactive but present UI elements mentioned in the DOM.
    await expect(dynamicPage.appLogo).toHaveText('Swag Labs');
    await expect(dynamicPage.loginCredentialsDisplay).toBeVisible();
    await expect(dynamicPage.loginPasswordDisplay).toBeVisible();
  });

  // TC002: Verify email field accepts valid RFC 5322 format (Adapted to 'Username' field behavior for Swag Labs)
  test('TC002 - Verify username field accepts valid input format on blur', async () => {
    // Swag Labs' "username" field does not implement RFC 5322 email validation, as it expects simple usernames.
    // This test verifies that a standard valid username does not trigger an immediate client-side error on blur.
    await dynamicPage.fillUsername(VALID_USERNAME);
    await dynamicPage.passwordInput.focus(); // Trigger blur event on the username input
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // Expect no general error message to appear immediately.
  });

  // TC003: Verify email field rejects invalid format (missing '@' symbol) (Adapted to 'Username' field)
  test('TC003 - Verify username field handles invalid format (missing "@" symbol)', async () => {
    // Swag Labs does not have client-side validation for email formats on blur.
    const invalidUsername = 'invalidusername.com';
    await dynamicPage.fillUsername(invalidUsername);
    await dynamicPage.passwordInput.focus(); // Trigger blur on username
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur, as expected for Swag Labs.

    // Attempting to log in with this username will result in a generic authentication error.
    await dynamicPage.fillPassword(VALID_PASSWORD);
    await dynamicPage.clickLogin();
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC004: Verify email field rejects invalid format (no domain part) (Adapted to 'Username' field)
  test('TC004 - Verify username field handles invalid format (no domain part)', async () => {
    // Swag Labs does not have client-side validation for email formats.
    const invalidUsername = 'user@';
    await dynamicPage.fillUsername(invalidUsername);
    await dynamicPage.passwordInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.

    await dynamicPage.fillPassword(VALID_PASSWORD);
    await dynamicPage.clickLogin();
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC005: Verify email field rejects invalid characters in local part (Adapted to 'Username' field)
  test('TC005 - Verify username field handles invalid characters', async () => {
    // Swag Labs treats any non-matching string as an invalid credential.
    const invalidUsername = 'user!name';
    await dynamicPage.fillUsername(invalidUsername);
    await dynamicPage.passwordInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.

    await dynamicPage.fillPassword(VALID_PASSWORD);
    await dynamicPage.clickLogin();
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC006: Verify username field accepts maximum allowed length (simulated for general input acceptance)
  test('TC006 - Verify username field accepts typical long input length', async () => {
    // Swag Labs does not have a stated max length for usernames; it simply checks against a few fixed strings.
    // This test verifies that a long string can be entered without triggering client-side validation errors on blur.
    const longUsername = 'a'.repeat(50) + VALID_USERNAME.slice(0, 10) + 'b'.repeat(50); // total ~110 chars
    await dynamicPage.fillUsername(longUsername);
    await dynamicPage.passwordInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.
    await expect(dynamicPage.usernameInput).toHaveValue(longUsername); // Ensure the value was retained.
  });

  // TC007: Verify username field rejects input exceeding maximum allowed length (simulated)
  test('TC007 - Verify username field handles extremely long input length', async () => {
    // Swag Labs does not have a stated max length for usernames; it's generally backend-checked.
    // This test ensures an extremely long string can be typed, but will not result in a valid login.
    const extremelyLongUsername = 'a'.repeat(255); // A length typically exceeding email max.
    await dynamicPage.fillUsername(extremelyLongUsername);
    await dynamicPage.passwordInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.
    await expect(dynamicPage.usernameInput).toHaveValue(extremelyLongUsername); // Ensure the value was retained.

    await dynamicPage.fillPassword(VALID_PASSWORD);
    await dynamicPage.clickLogin();
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC008: Verify leading and trailing whitespaces are trimmed automatically from username input
  test('TC008 - Verify whitespaces are trimmed from username for login', async () => {
    // Swag Labs is expected to handle valid usernames with surrounding spaces by trimming them.
    await dynamicPage.login(`  ${VALID_USERNAME}  `, VALID_PASSWORD);
    await expect(dynamicPage.page).toHaveURL(/.*inventory.html/); // Successful login implies trimming occurred.
  });

  // TC009: Verify password field accepts full UTF-8 character set including space and special symbols
  test('TC009 - Verify password field accepts complex characters', async () => {
    // Swag Labs only accepts 'secret_sauce'. Complex passwords will fail authentication.
    // This test verifies if the input field itself *accepts* the input without client-side error on blur.
    const complexPassword = 'P@ssw0rd W!th Sp@ce & UTF-8 chars £€😂';
    await dynamicPage.fillPassword(complexPassword);
    await dynamicPage.usernameInput.focus(); // Trigger blur on password
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.
    await expect(dynamicPage.passwordInput).toHaveValue(complexPassword); // Ensure value is retained.

    // Attempting login with an incorrect password (even a complex one) will result in a generic error.
    await dynamicPage.login(VALID_USERNAME, complexPassword);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC010: Verify password field accepts minimum allowed length (8 characters - simulated)
  test('TC010 - Verify password field accepts minimum length input on blur', async () => {
    // Swag Labs only accepts 'secret_sauce'. This tests input field acceptance, not password validation rules.
    const minLengthPassword = 'Passwor8'; // 8 characters
    await dynamicPage.fillPassword(minLengthPassword);
    await dynamicPage.usernameInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.
    await expect(dynamicPage.passwordInput).toHaveValue(minLengthPassword);

    await dynamicPage.login(VALID_USERNAME, minLengthPassword);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC011: Verify password field accepts maximum allowed length (128 characters - simulated)
  test('TC011 - Verify password field accepts maximum length input on blur', async () => {
    // Swag Labs only accepts 'secret_sauce'. This tests input field acceptance, not password validation rules.
    const maxLengthPassword = 'A'.repeat(128);
    await dynamicPage.fillPassword(maxLengthPassword);
    await dynamicPage.usernameInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.
    await expect(dynamicPage.passwordInput).toHaveValue(maxLengthPassword);

    await dynamicPage.login(VALID_USERNAME, maxLengthPassword);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC012: Verify password field rejects input less than minimum allowed length (7 characters - simulated)
  test('TC012 - Verify password field handles input less than minimum length', async () => {
    // Swag Labs does not have client-side min/max length validation.
    const shortPassword = 'ShortP7'; // 7 characters
    await dynamicPage.fillPassword(shortPassword);
    await dynamicPage.usernameInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.
    await expect(dynamicPage.passwordInput).toHaveValue(shortPassword);

    await dynamicPage.login(VALID_USERNAME, shortPassword);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC013: Verify password field rejects input exceeding maximum allowed length (129 characters - simulated)
  test('TC013 - Verify password field handles input exceeding maximum length', async () => {
    // Swag Labs does not have client-side min/max length validation.
    const tooLongPassword = 'B'.repeat(129);
    await dynamicPage.fillPassword(tooLongPassword);
    await dynamicPage.usernameInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error on blur.
    await expect(dynamicPage.passwordInput).toHaveValue(tooLongPassword);

    await dynamicPage.login(VALID_USERNAME, tooLongPassword);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC014: Verify inline error for empty email and password fields on Login button click
  test('TC014 - Verify error for empty username and password on Login', async () => {
    await dynamicPage.clickLogin();
    // Swag Labs prioritizes the 'Username is required' message if both are empty.
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username is required');
  });

  // TC015: Verify inline error for empty email field only
  test('TC015 - Verify error for empty username field only on Login', async () => {
    await dynamicPage.fillPassword(VALID_PASSWORD);
    await dynamicPage.clickLogin();
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username is required');
  });

  // TC016: Verify inline error for empty password field only
  test('TC016 - Verify error for empty password field only on Login', async () => {
    await dynamicPage.fillUsername(VALID_USERNAME);
    await dynamicPage.clickLogin();
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Password is required');
  });

  // TC017: Verify inline error for malformed email on blur (Adapted to Username field)
  test('TC017 - Verify no error for malformed username on blur', async () => {
    // Swag Labs does not have client-side format validation that triggers on blur.
    await dynamicPage.fillUsername('john.doe#domain.com');
    await dynamicPage.passwordInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error message on blur.
  });

  // TC018: Verify inline error for password less than 8 characters on blur
  test('TC018 - Verify no error for short password on blur', async () => {
    // Swag Labs does not have client-side length validation that triggers on blur.
    await dynamicPage.fillPassword('Pass123'); // 7 characters
    await dynamicPage.usernameInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error message on blur.
  });

  // TC019: Verify inline error for password more than 128 characters on blur
  test('TC019 - Verify no error for long password on blur', async () => {
    // Swag Labs does not have client-side length validation that triggers on blur.
    await dynamicPage.fillPassword('A'.repeat(129));
    await dynamicPage.usernameInput.focus(); // Trigger blur
    await expect(dynamicPage.errorMessageContainer).toBeEmpty(); // No error message on blur.
  });

  // TC020: Verify successful login with valid credentials
  test('TC020 - Verify successful login with valid credentials', async () => {
    await dynamicPage.login(VALID_USERNAME, VALID_PASSWORD);
    await expect(dynamicPage.page).toHaveURL(/.*inventory.html/); // Redirect to inventory page on success.
  });

  // TC021: Verify generic error message for incorrect password for an existing user (User Enumeration protection)
  test('TC021 - Verify generic error for incorrect password (Swag Labs behavior)', async () => {
    // Swag Labs provides a sufficiently generic error message to prevent user enumeration.
    await dynamicPage.login(VALID_USERNAME, 'IncorrectPass123!');
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC022: Verify generic error message for unregistered email (User Enumeration protection)
  test('TC022 - Verify generic error for unregistered username (Swag Labs behavior)', async () => {
    // Swag Labs provides the same generic error message for unregistered usernames and incorrect passwords,
    // which effectively prevents user enumeration.
    await dynamicPage.login('nonexistent_user', VALID_PASSWORD);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC023: Verify account lockout after 5 consecutive failed login attempts for the same email (Rate Limiting)
  test('TC023 - Account lockout/Rate Limiting (Not applicable for Swag Labs demo)', async () => {
    // The Swag Labs demo application does not implement account lockout or rate limiting as described.
    // It will continuously return the generic error message for failed attempts.
    test.info().annotations.push({ type: 'skipped', description: 'Account lockout/rate limiting not implemented in Swag Labs demo.' });
    // The following code demonstrates the attempts, but will not yield the expected lockout message.
    for (let i = 0; i < 5; i++) {
      await dynamicPage.login(VALID_USERNAME, 'wrong_pass_' + i);
      await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
      await dynamicPage.navigate(); // Re-navigate to reset the form for the next attempt.
    }
    // Even after 5 attempts, the message remains the same.
    await dynamicPage.login(VALID_USERNAME, 'wrong_pass_final');
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
  });

  // TC024: Verify login attempts are blocked during account lockout period
  test('TC024 - Blocked login during lockout (Not applicable for Swag Labs demo)', async () => {
    // As the Swag Labs demo does not implement account lockout, this test cannot be fully performed as described.
    // It will continue to allow login attempts and return the generic authentication error.
    test.info().annotations.push({ type: 'skipped', description: 'Login blocking during lockout not implemented in Swag Labs demo.' });
    // Attempting a login during a simulated (but non-existent) lockout period.
    await dynamicPage.login(VALID_USERNAME, VALID_PASSWORD); // Even a correct pass would fail if locked.
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
    // Note: No specific lockout banner is expected in Swag Labs.
  });

  // TC025: Verify system blocks SQL Injection patterns in Username field
  test('TC025 - Verify SQL Injection patterns in Username field (Swag Labs behavior)', async () => {
    // Swag Labs' simple authentication mechanism will treat SQL injection strings as invalid usernames.
    const sqlInjectionUsername = "'admin' OR '1'='1'--";
    await dynamicPage.login(sqlInjectionUsername, VALID_PASSWORD);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
    // Expectation: No specific SQL injection blocking message; just a generic authentication failure.
  });

  // TC026: Verify system blocks XSS patterns in Username field
  test('TC026 - Verify XSS patterns in Username field (Swag Labs behavior)', async () => {
    // Swag Labs' simple authentication mechanism will treat XSS strings as invalid usernames.
    const xssUsername = '<script>alert("XSS")</script>';
    await dynamicPage.login(xssUsername, VALID_PASSWORD);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
    // Expectation: No specific XSS blocking message; just a generic authentication failure.
  });

  // TC027: Verify system blocks SQL Injection patterns in Password field
  test('TC027 - Verify SQL Injection patterns in Password field (Swag Labs behavior)', async () => {
    // Swag Labs' simple authentication mechanism will treat SQL injection strings as invalid passwords.
    const sqlInjectionPassword = "'password' OR '1'='1'--";
    await dynamicPage.login(VALID_USERNAME, sqlInjectionPassword);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
    // Expectation: No specific SQL injection blocking message; just a generic authentication failure.
  });

  // TC028: Verify system blocks XSS patterns in Password field
  test('TC028 - Verify XSS patterns in Password field (Swag Labs behavior)', async () => {
    // Swag Labs' simple authentication mechanism will treat XSS strings as invalid passwords.
    const xssPassword = '<script>alert("XSS")</script>';
    await dynamicPage.login(VALID_USERNAME, xssPassword);
    await expect(dynamicPage.getErrorMessageText()).resolves.toBe('Epic sadface: Username and password do not match any user in this service');
    // Expectation: No specific XSS blocking message; just a generic authentication failure.
  });

  // TC029: Verify failed login attempts log masked email and IP in security audit logs
  test('TC029 - Verify audit logs (Not testable via E2E)', async ({ page }) => {
    // This test requires access to backend security audit logs, which is outside the scope of E2E testing.
    // Playwright E2E tests interact with the UI and cannot directly verify server-side logs.
    test.info().annotations.push({ type: 'skipped', description: 'Requires backend access to verify security audit logs.' });
    test.skip();
  });

  // TC030: Verify password field content is initially hidden
  test('TC030 - Verify password field content is initially hidden (Not applicable for Swag Labs DOM)', async () => {
    // The provided Swag Labs HTML does not feature a 'Show/Hide' toggle functionality.
    // The password input field is always of type 'password'.
    await dynamicPage.fillPassword('Password123');
    await expect(dynamicPage.passwordInput).toHaveAttribute('type', 'password');
    // The original test case expected a 'Show' toggle icon to be visible, which is not present in the DOM.
  });

  // TC031: Verify password field content becomes visible after clicking 'Show' toggle
  test('TC031 - Verify password field content becomes visible (Not applicable for Swag Labs DOM)', async ({ page }) => {
    // The provided Swag Labs HTML does not feature a 'Show/Hide' toggle functionality.
    test.info().annotations.push({ type: 'skipped', description: 'Show/Hide password toggle is not present in the provided DOM.' });
    test.skip();
  });

  // TC032: Verify password field content becomes hidden after clicking 'Hide' toggle
  test('TC032 - Verify password field content becomes hidden (Not applicable for Swag Labs DOM)', async ({ page }) => {
    // The provided Swag Labs HTML does not feature a 'Show/Hide' toggle functionality.
    test.info().annotations.push({ type: 'skipped', description: 'Show/Hide password toggle is not present in the provided DOM.' });
    test.skip();
  });

  // TC033: Verify 'Forgot Password?' link navigates to the correct page
  test('TC033 - Verify "Forgot Password?" link (Not applicable for Swag Labs DOM)', async ({ page }) => {
    // The provided Swag Labs HTML does not feature a 'Forgot Password?' link.
    test.info().annotations.push({ type: 'skipped', description: 'Forgot Password link is not present in the provided DOM.' });
    test.skip();
  });
});