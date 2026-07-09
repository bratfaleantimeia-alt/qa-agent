import { GoogleGenerativeAI } from '@google/generative-ai';
import { getQAPrompt } from '../prompts/testCasesPrompt.js'; // Import modular prompt template
import * as dotenv from 'dotenv';

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error("❌ Error: Missing GEMINI_API_KEY in .env!");
  process.exit(1);
}

// Initialize Gemini API client
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Sends Jira ticket details to Google Gemini and returns structured test cases
 * @param storyTitle - The title of the User Story
 * @param storyDescription - The description of the User Story
 */
export async function generateTestCases(storyTitle: string, storyDescription: string): Promise<any[]> {
  console.log(`\n🤖 Step 2: Sending data to Gemini AI for QA analysis...`);
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });
  
  // Get modularized prompt
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
    throw new Error("The JSON format returned by AI is invalid or does not contain the 'testCases' array.");
  }
  
  return testData.testCases;
}