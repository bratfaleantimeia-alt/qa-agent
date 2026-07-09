import JiraClient from 'jira-client';
import * as dotenv from 'dotenv';

dotenv.config();

const jiraHost = process.env.JIRA_HOST;
const jiraEmail = process.env.JIRA_EMAIL;
const jiraApiToken = process.env.JIRA_API_TOKEN;

// Initial check for Jira configurations
if (!jiraHost || !jiraEmail || !jiraApiToken) {
  console.error("❌ Error: Missing Jira configurations in .env!");
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

/**
 * Interface representing simplified Jira ticket data
 */
export interface JiraIssueData {
  title: string;
  description: string;
}

/**
 * Fetches Jira ticket details (Summary & Description)
 * @param issueKey - The Jira issue key (e.g., PROJ-123)
 */
export async function fetchJiraIssue(issueKey: string): Promise<JiraIssueData> {
  console.log(`\n🔍 Step 1: Accessing Jira for issue ${issueKey}...`);
  const issue = await jira.findIssue(issueKey);
  
  return {
    title: issue.fields.summary,
    description: issue.fields.description || 'No description available.'
  };
}

/**
 * Transforms test cases into Jira Wiki Markup Table format
 */
function generateJiraWikiTable(testCases: any[]): string {
  let wikiTable = "h3. 📋 Automatically Generated Test Cases by QA Agent\n\n";
  wikiTable += "||ID||Test Type||Test Case Title||Preconditions||Steps to Reproduce||Expected Result||\n";

  testCases.forEach((tc) => {
    const cleanedPreconditions = tc.preconditions ? tc.preconditions.replace(/\n/g, ' \\\\ ') : 'N/A';
    const cleanedSteps = tc.steps ? tc.steps.replace(/\n/g, ' \\\\ ') : 'N/A';
    const cleanedResult = tc.expectedResult ? tc.expectedResult.replace(/\n/g, ' \\\\ ') : 'N/A';
    const cleanedTitle = tc.title ? tc.title.replace(/\n/g, ' \\\\ ') : 'N/A';

    wikiTable += `|${tc.id}|${tc.type}|${cleanedTitle}|${cleanedPreconditions}|${cleanedSteps}|${cleanedResult}|\n`;
  });

  wikiTable += "\n_Automatically generated using Gemini 2.5 Flash._";
  return wikiTable;
}

/**
 * Adds a comment containing the formatted test cases table directly to the Jira ticket
 * @param issueKey - The Jira issue key
 * @param testCases - Array of test cases received from the AI
 */
export async function addJiraComment(issueKey: string, testCases: any[]): Promise<void> {
  console.log(`\n💬 Step 6: Adding a comment in Jira with the generated table...`);
  const wikiComment = generateJiraWikiTable(testCases);
  await jira.addComment(issueKey, wikiComment);
  console.log(`✅ Comment added successfully to Jira for issue ${issueKey}!`);
}