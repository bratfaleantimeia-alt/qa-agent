import { fetchJiraIssue, addJiraComment } from './services/jiraService.js';
import { generateTestCases } from './services/geminiService.js';
import { generateExcelReport } from './services/excelService.js';
import { uploadToGoogleDrive } from './services/driveService.js';

/**
 * Main function that orchestrates and runs the QA Agent from end to end.
 */
async function runQAAgent() {
  try {
    // 1. Define the Jira ticket we want to analyze
    const issueKey = 'ZR-597'; 
    
    // 2. Fetch details from Jira (SUMMARY & DESCRIPTION)
    const issueData = await fetchJiraIssue(issueKey);
    console.log(`✅ Issue retrieved successfully! Title: "${issueData.title}"`);
    
    // 3. Generate structured test cases using Gemini LLM
    const testCases = await generateTestCases(issueData.title, issueData.description);
    console.log(`✅ Successfully generated ${testCases.length} test cases using Gemini AI!`);
    
    // 4. Export the generated test cases into an Excel spreadsheet
    const excelFile = await generateExcelReport(issueKey, testCases);
        
    // 5. Upload/Append the test cases to Google Drive (Master Spreadsheet or folder)
    await uploadToGoogleDrive(excelFile, issueKey, testCases);
    
    // 6. Add the formatted wiki table comment directly to the Jira ticket
    // await addJiraComment(issueKey, testCases);
    
    console.log(`\n💾 Process completed successfully!`);
    console.log(`--------------------------------------------------`);
    
  } catch (error) {
    console.error("❌ An error occurred during agent execution:", error);
  }
}

// Start the QA Agent
runQAAgent();