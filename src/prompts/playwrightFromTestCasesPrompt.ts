export function getPlaywrightFromTestCasesPrompt(testCases: any[], htmlContent?: string): string {
  const formattedTestCases = JSON.stringify(testCases, null, 2);
  
  // Format the real DOM HTML if it was captured from the live site
  const domContext = htmlContent 
    ? `CRITICAL REQUIREMENT - ANALYZE THE PROVIDED LIVE HTML DOM FROM THE WEBSITE:
======================================================================
${htmlContent}
======================================================================
Your job is to inspect this HTML to discover the exact real tag properties (IDs, names, classes, placeholder texts, or data-test attributes) of the input fields, buttons, and error messages that correspond to the test cases.
Do NOT guess or invent the locators. Map them directly to the real elements present in the HTML DOM above.`
    : `LOCATOR REQUIREMENT:
- Prioritize using standard HTML ID selectors to locate inputs, buttons, and error messages (e.g., page.locator('#email'), page.locator('#password'), page.locator('#login-button'), page.locator('#error-message')).`;

  return `You are a Senior Automation QA Engineer specializing in Playwright, TypeScript, and modern ESM syntax.

## We have dynamically generated the following QA test cases for a website feature:
## ${formattedTestCases}

Your task is to write automated E2E tests in Playwright (TypeScript) to cover these exact test cases.
You MUST structure your solution using the Page Object Model (POM) pattern.

You MUST return a valid JSON object with EXACTLY two fields: "pageCode" and "testCode".

Strict JSON schema to return:
{
  "pageCode": "the complete TypeScript code for the Page Object class",
  "testCode": "the complete TypeScript code for the test suite importing the Page Object class"
}

Requirements for Page Object ("pageCode"):
- CRITICAL: You MUST import expect alongside Page and Locator at the top of the file:
  import { expect, type Page, type Locator } from '@playwright/test';
- CRITICAL: The exported class MUST be named exactly 'DynamicPage'.
- Export a class named 'DynamicPage' whose constructor accepts the Playwright 'page' object.
- CRITICAL NAVIGATION RULE: The navigation method (e.g., 'navigate()') MUST navigate ONLY to the root homepage of the application using exactly:
  await this.page.goto('/');
  DO NOT navigate to '/login', because the login form is located directly on the main/home page.
- ${domContext}
- Provide clear, reusable methods wrapping actions (such as filling out inputs, clicking buttons, verifying messages).

Requirements for Test Spec ("testCode"):
- Must import: import { test, expect } from '@playwright/test';
- CRITICAL: You MUST import your Page Object class using exactly this import statement:
  import { DynamicPage } from '../pages/DynamicPage';
- DO NOT import 'LoginPage' or any other class name. Use only 'DynamicPage'.
- Write a 'test.describe' block named after the feature.
- Write individual 'test()' blocks covering each of the provided QA test cases.
- Inside each test, instantiate the DynamicPage class (e.g., const dynamicPage = new DynamicPage(page);), perform the action steps, and write clean, auto-waiting assertions (expect).

CRITICAL - Test Data Generation Requirements:
- You MUST automatically generate realistic and specific test data for every single test case!
- DO NOT use placeholders like "your_username" or "some_password".
- For Positive Tests: Generate valid, realistic credentials or input values.
- For Negative Tests: Generate invalid formats.
- For Edge Cases: Generate realistic boundary values.

Strict Formatting Requirements:
- Generate the TypeScript code for "pageCode" and "testCode" with standard line breaks and proper indentation.
- CRITICAL: In the final JSON output, write actual line breaks encoded as standard JSON newline characters (\\n).
- DO NOT double-escape the newlines (DO NOT use \\\\n). The code MUST parse directly into a beautiful multi-line string with real lines when JSON.parse() is executed in Node.js.
- Ensure all double quotes inside the TypeScript code strings are correctly escaped with a single backslash (\\\") so they do not break the JSON format.`;
}