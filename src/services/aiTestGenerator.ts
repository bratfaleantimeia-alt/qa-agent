import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPlaywrightPrompt } from '../prompts/playwrightPromptPOM.js';
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
 * Connects to Gemini, asks for the split Playwright POM + Test code, 
 * and writes them directly into separate files under tests/pages/ and tests/specs/.
 */
async function generatePlaywrightTestFiles() {
  console.log("🤖 Connected to Gemini AI. Generating split POM test architecture...");

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = getPlaywrightPrompt();
    const result = await model.generateContent(prompt);
    let rawResponse = result.response.text().trim();

    // Clean up markdown block wrappers if present
    if (rawResponse.startsWith('```')) {
      rawResponse = rawResponse.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const testFilesData = JSON.parse(rawResponse);

    if (!testFilesData.loginPageCode || !testFilesData.loginTestCode) {
      throw new Error("Invalid JSON structure returned by Gemini.");
    }

    // Paths for the new structure
    const testsFolder = path.join(process.cwd(), 'tests');
    const pagesFolder = path.join(testsFolder, 'pages');
    const specsFolder = path.join(testsFolder, 'specs');

    // Create directories recursively
    if (!fs.existsSync(pagesFolder)) {
      fs.mkdirSync(pagesFolder, { recursive: true });
    }
    if (!fs.existsSync(specsFolder)) {
      fs.mkdirSync(specsFolder, { recursive: true });
    }

    const pageFilePath = path.join(pagesFolder, 'LoginPage.ts');
    const testFilePath = path.join(specsFolder, 'login.spec.ts');

    // Save File 1: LoginPage POM
    fs.writeFileSync(pageFilePath, testFilesData.loginPageCode, 'utf-8');
    
    // Save File 2: Login Test Spec
    fs.writeFileSync(testFilePath, testFilesData.loginTestCode, 'utf-8');

    console.log(`\n✅ Playwright architecture successfully generated!`);
    console.log(`📁 Page Object Model (POM): ${pageFilePath}`);
    console.log(`📁 Test Spec File:         ${testFilePath}`);
    console.log(`\n---------------------------------------------------------`);
    console.log(`Run this command to execute the test visually:`);
    console.log(`👉 npx playwright test --ui`);
    console.log(`---------------------------------------------------------`);

  } catch (error) {
    console.error("❌ Error generating Playwright test files:", error);
  }
}

// Execute generator
generatePlaywrightTestFiles();