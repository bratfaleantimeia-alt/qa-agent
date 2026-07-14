import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { getQAPrompt } from '../prompts/testCasesPrompt.js'; 
import { getPlaywrightFromTestCasesPrompt } from '../prompts/playwrightFromTestCasesPrompt.js'; 
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error("❌ Error: Missing GEMINI_API_KEY in .env!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Sends Jira ticket details to Google Gemini and returns structured test cases
 */
export async function generateTestCases(storyTitle: string, storyDescription: string): Promise<any[]> {
  console.log(`\n🤖 Step 2: Sending data to Gemini AI for QA analysis...`);
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });
  
  const prompt = getQAPrompt(storyTitle, storyDescription);
  const result = await model.generateContent(prompt);
  const aiResponse = result.response.text();
  
  console.log(`\n📊 Step 3: Processing data received from AI...`);
  
  let cleaned = aiResponse.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }
  
  const testData = JSON.parse(cleaned);
  
  if (!testData.testCases || !Array.isArray(testData.testCases)) {
    throw new Error("The JSON format returned by AI is invalid.");
  }
  
  return testData.testCases;
}

/**
 * Launches a headless browser, retrieves the live DOM, cleans it, and uses Gemini to write E2E tests.
 */
export async function generateAutomationTests(testCases: any[], issueKey: string): Promise<void> {
  let liveHtmlContent = '';

  const targetUrl = process.env.BASE_URL;

  if (targetUrl) {
    console.log(`\n🕵️‍♂️ Live Discovery: Launching headless browser to extract DOM from ${targetUrl}...`);
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(targetUrl);
      await page.waitForLoadState('networkidle');

      // Extract raw HTML, but clean it dynamically to optimize AI tokens
      liveHtmlContent = await page.evaluate(() => {
        const bodyClone = document.body.cloneNode(true) as HTMLElement;
        // Remove heavy elements, styles and scripts that do not contain locators
        const unneeded = bodyClone.querySelectorAll('script, style, svg, iframe, noscript, link, path');
        unneeded.forEach(el => el.remove());
        return bodyClone.innerHTML.trim();
      });

      await browser.close();
      console.log(`✅ Extracted cleaned live DOM successfully (${liveHtmlContent.length} characters)`);
    } catch (err: any) {
      console.error(`⚠️ Could not extract DOM live from ${targetUrl}: ${err.message}. Falling back to default locator strategy.`);
    }
  } else {
    console.log(`\nℹ️ Note: BASE_URL is not configured in .env. AI will use standard locator prediction.`);
  }

  console.log(`\n🤖 Dynamic Step: Requesting Playwright POM + Specs from AI...`);

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          pageCode: { type: SchemaType.STRING },
          testCode: { type: SchemaType.STRING }
        },
        required: ["pageCode", "testCode"]
      }
    }
  });

  const prompt = getPlaywrightFromTestCasesPrompt(testCases, liveHtmlContent || undefined);
  const result = await model.generateContent(prompt);
  let rawResponse = result.response.text().trim();

  if (rawResponse.startsWith('```')) {
    rawResponse = rawResponse.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }

  const automationCode = JSON.parse(rawResponse);

  if (!automationCode.pageCode || !automationCode.testCode) {
    throw new Error("Invalid automation structure received from Gemini.");
  }

  const projectRoot = process.cwd();
  const pagesFolder = path.join(projectRoot, 'tests', 'pages');
  const specsFolder = path.join(projectRoot, 'tests', 'specs');

  if (!fs.existsSync(pagesFolder)) {
    fs.mkdirSync(pagesFolder, { recursive: true });
  }
  if (!fs.existsSync(specsFolder)) {
    fs.mkdirSync(specsFolder, { recursive: true });
  }

  const pagePath = path.join(pagesFolder, 'DynamicPage.ts');
  fs.writeFileSync(pagePath, automationCode.pageCode, 'utf-8');

  const specPath = path.join(specsFolder, `${issueKey.toLowerCase()}.spec.ts`);
  fs.writeFileSync(specPath, automationCode.testCode, 'utf-8');

  console.log(`✅ Automation E2E Code written successfully!`);
  console.log(`📁 Page Object Model: ${pagePath}`);
  console.log(`📁 Automated Spec:   ${specPath}`);
}