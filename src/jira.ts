import JiraClient from 'jira-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { google } from 'googleapis';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config();

const jiraHost = process.env.JIRA_HOST;
const jiraEmail = process.env.JIRA_EMAIL;
const jiraApiToken = process.env.JIRA_API_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

// Check if all necessary configurations are present
if (!jiraHost || !jiraEmail || !jiraApiToken || !geminiApiKey) {
  console.error("❌ Error: Please check your .env file! Missing configurations for Jira or Gemini.");
  process.exit(1);
}

// Initialize Jira Client
const jira = new JiraClient({
  protocol: 'https',
  host: jiraHost.replace('https://', ''),
  username: jiraEmail,
  password: jiraApiToken,
  apiVersion: '2',
  strictSSL: true
});

// Initialize Gemini API Client
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Transforms test cases into a Jira Wiki Markup Table string
 */
function generateJiraWikiTable(testCases: any[]): string {
  let wikiTable = "h3. 📋 Automatically Generated Test Cases by QA Agent\n\n";
  
  // Table headers in Jira Wiki Markup format (double pipes || for header)
  wikiTable += "||ID||Test Type||Test Case Title||Preconditions||Steps to Reproduce||Expected Result||\n";

  testCases.forEach((tc) => {
    // In Jira Wiki Markup, a new line inside the same cell is achieved using '\\'
    const cleanedPreconditions = tc.preconditions ? tc.preconditions.replace(/\n/g, ' \\\\ ') : 'N/A';
    const cleanedSteps = tc.steps ? tc.steps.replace(/\n/g, ' \\\\ ') : 'N/A';
    const cleanedResult = tc.expectedResult ? tc.expectedResult.replace(/\n/g, ' \\\\ ') : 'N/A';
    const cleanedTitle = tc.title ? tc.title.replace(/\n/g, ' \\\\ ') : 'N/A';

    // Table rows use single pipe | for cells
    wikiTable += `|${tc.id}|${tc.type}|${cleanedTitle}|${cleanedPreconditions}|${cleanedSteps}|${cleanedResult}|\n`;
  });

  wikiTable += "\n_Automatically generated using Gemini 2.5 Flash._";
  return wikiTable;
}

/**
 * Uploads a local file to Google Drive
 */
async function uploadToGoogleDrive(fileName: string) {
  const driveEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const driveKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Resolve newline characters in .env
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // If Google Drive details are not fully configured, skip upload instead of crashing
  if (!driveEmail || !driveKey) {
    console.log("\nℹ️ Note: Google Drive integration is not fully configured in .env. The file was saved only locally.");
    return;
  }

  console.log(`\n📤 Step 5: Initiating file upload to Google Drive...`);

  try {
    // Configure JWT authentication (Service Account) using an options object
    const auth = new google.auth.JWT({
      email: driveEmail,
      key: driveKey,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    // Use a flexible structure to avoid strict type resolution issues (exactOptionalPropertyTypes)
    const fileMetadata: any = {
      name: fileName
    };

    // Add parent folder ID if specified in .env
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(fileName)
    };

    // Cast the response to 'any' to avoid overload resolution issues in TypeScript
    const response: any = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log(`✅ File uploaded successfully to Google Drive!`);
    console.log(`🔗 Access Link: ${response.data.webViewLink}`);
  } catch (error) {
    console.error("❌ Error uploading to Google Drive:", error);
  }
}

async function runQAAgent() {
  try {
    // 1. Define the ticket we want to analyze (Replace with a valid issue key from your Jira board)
    const issueKey = 'QARO-59'; 
    console.log(`\n🔍 Step 1: Accessing Jira for issue ${issueKey}...`);
    
    const issue = await jira.findIssue(issueKey);
    const storyTitle = issue.fields.summary;
    const storyDescription = issue.fields.description || 'No description available.';
    
    console.log(`✅ Issue retrieved successfully!`);
    console.log(`📌 Title: ${storyTitle}`);
    
    // 2. Prepare instructions (prompt) for Gemini to return a structured JSON response
    console.log(`\n🤖 Step 2: Sending data to Gemini AI for QA analysis...`);
    
    // Configure Gemini to enforce structured JSON output
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      You are a Senior QA Engineer. Analyze the following User Story from Jira and generate detailed and structured test cases.
      Your response MUST be a valid JSON object with no other conversational text surrounding it.
      
      The strict JSON structure you MUST follow is:
      {
        "testCases": [
          {
            "id": "TC001",
            "type": "Positive",
            "title": "Short title of the test case",
            "preconditions": "Necessary preconditions (if any, otherwise leave empty)",
            "steps": "1. First step\\n2. Second step\\n3. Third step",
            "expectedResult": "Detailed expected result"
          }
        ]
      }
      
      Allowed values for 'type': 'Positive', 'Negative', 'Edge Case'.
      
      Here are the Jira issue details:
      --------------------------------------------------
      Story Title: ${storyTitle}
      Story Description: ${storyDescription}
      --------------------------------------------------
      
      Please write all generated text in English.
    `;
    
    // Call the AI model and wait for the response
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();
    
    // 3. Parse JSON data received from Gemini
    console.log(`\n📊 Step 3: Processing data received from AI...`);
    
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    
    const testData = JSON.parse(cleaned);
    
    if (!testData.testCases || !Array.isArray(testData.testCases)) {
      throw new Error("The JSON format returned by AI is invalid or does not contain the 'testCases' array.");
    }

    // 4. Generate the Excel file using exceljs
    console.log(`💾 Step 4: Generating the Excel file...`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Cases');
    
    // Define columns, connection keys, and dimensions
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Test Type', key: 'type', width: 15 },
      { header: 'Test Case Title', key: 'title', width: 35 },
      { header: 'Preconditions', key: 'preconditions', width: 30 },
      { header: 'Steps to Reproduce', key: 'steps', width: 50 },
      { header: 'Expected Result', key: 'expectedResult', width: 50 }
    ];
    
    // Style the header row for a professional look
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E78' } // Corporate Dark Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add rows of data into the table
    testData.testCases.forEach((tc: any) => {
      const row = worksheet.addRow({
        id: tc.id,
        type: tc.type,
        title: tc.title,
        preconditions: tc.preconditions || 'N/A',
        steps: tc.steps,
        expectedResult: tc.expectedResult
      });
      
      // Allow multi-line wrapping and align text to top
      row.alignment = { wrapText: true, vertical: 'top' };
    });

    // Save Excel file locally with the ticket key
    const fileName = `Test_Cases_${issueKey}.xlsx`;
    await workbook.xlsx.writeFile(fileName);
    
    console.log(`📁 The Excel file was saved locally as: ${fileName}`);
    
    // 5. Upload to Google Drive (If configured in .env)
    await uploadToGoogleDrive(fileName);
    
    // 6. Comment on Jira with the generated wiki-styled table
    console.log(`\n💬 Step 6: Adding a comment in Jira with the generated table...`);
    const wikiComment = generateJiraWikiTable(testData.testCases);
    await jira.addComment(issueKey, wikiComment);
    console.log(`✅ Comment added successfully to Jira for issue ${issueKey}!`);
    
    console.log(`\n💾 Process completed!`);
    console.log(`--------------------------------------------------`);
    
  } catch (error) {
    console.error("❌ An error occurred during agent execution:", error);
  }
}

runQAAgent();