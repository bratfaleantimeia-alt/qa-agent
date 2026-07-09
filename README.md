🤖 QA Agent - Technical Manual and Step-by-Step Configuration Guide

Welcome to the official documentation for the QA Agent project! This document serves as a development journal, installation guide, and technical manual. The project has evolved from a single monolithic script to a modern, clean, and easy-to-maintain modular architecture.

📋 Table of Contents

1. About the Project: How it Works
2. Modular Architecture (File Structure)
3. Installing the Project from Scratch
4. Quick Run Guide
5. How We Generated API Keys and Secrets (Step-by-Step)
    A. Atlassian Jira (API Token)
    B. Google Gemini (API Key)
    C. Google Drive (Service Account)
6. Configuring the .env File
7. Troubleshooting and Common Errors


1. About the Project: How it Works
The QA Agent is an intelligent assistant developed in Node.js with TypeScript, designed to fully automate the repetitive workflow of a Software QA Engineer:
[Jira Ticket] ➔ [Gemini AI Analysis] ➔ [Generate Excel File] ➔ [Upload to Google Drive] ➔ [Comment Table on Jira]

    Fetch Data: The agent connects to your Jira instance to read the summary (title) and description of a specified ticket.

    AI Analysis: It sends this data to Google Gemini 2.5 Flash using an optimized, modularized prompt template.

    Structured Generation: Gemini analyzes the requirements and returns a complete list of test cases (Happy Path, Negative, and Edge Cases) in a strict JSON format.

    Excel Export: The received data is professionally styled and saved locally as an Excel spreadsheet (.xlsx).

    Cloud Storage (Master Spreadsheet): The agent automatically downloads your shared Master Excel Spreadsheet, appends or updates a tab (worksheet) named after the Jira ticket (e.g., PROJ-123), and uploads the file back to Google Drive.

    Jira Synchronization: The agent goes back to Jira and adds a comment containing the generated test cases formatted as a native Jira Wiki Markup table for immediate visibility.

2. Modular Architecture (File Structure)
To ensure the codebase remains maintainable and clean, we separated the application into isolated services, each adhering to the Single Responsibility Principle:
qa-agent/
├── prompts/
│   └── testCasesPrompt.ts     # Modular template for the prompt sent to the AI
├── src/
│   ├── services/
│   │   ├── jiraService.ts     # Handles reading tickets and posting comments on Jira
│   │   ├── geminiService.ts   # Handles interactions with the Google Gemini LLM
│   │   ├── excelService.ts    # Generates and styles the Excel (.xlsx) file
│   │   └── driveService.ts    # Connects to and uploads files to Google Drive
│   └── orchestrator.ts        # The main orchestrator that coordinates the overall flow
├── .env                       # Local secured file with API keys (ignored by Git)
├── .env.example               # Configuration template for other developers
├── .gitignore                 # Exclusion rules for sensitive or generated files
├── package.json               # Node.js project configuration and quick scripts
└── tsconfig.json              # TypeScript compiler configuration


3. Installing the Project from Scratch
If you need to set up the project on a new or clean machine, run these commands in your terminal:

3.1 Initialize the folder and Git repository
mkdir qa-agent
cd qa-agent
git init

3.2 Initialize the Node.js project
npm init -y

3.3 Install TypeScript and development utilities
npm install -D typescript @types/node tsx
npx tsc --init

3.4 Install production dependencies for the agent
npm install jira-client @google/generative-ai exceljs googleapis dotenv
npm install -D @types/jira-client


4. Quick Run Guide
To avoid having to write long commands or deal with TypeScript compilation issues manually, we added a smart shortcut in the package.json file.
Configuration in package.json:
"scripts": {
  "start": "tsx"
}

Run command:
Now, you can run the main orchestrator file or any individual script dynamically by passing it as a parameter with npm start:
npm start src/index.ts

Tip: You can also run other files separately for testing (e.g., npm start src/services/excelService.ts).

5. How We Generated API Keys and Secrets (Step-by-Step)
For the agent to communicate securely with all external platforms, we need credentials. Here is how to obtain them step-by-step:

    A. Atlassian Jira (API Token)
Jira uses e-mail and a unique security token for API authentication (not your normal account password).
    A.1 Go to the Atlassian Security Portal: id.atlassian.com/manage-profile/security/api-tokens.
    A.2 Log in with your corporate or personal Jira account.
    A.3 Click on the blue "Create API token" button.
    A.4 Give it a descriptive label (e.g., qa-agent-token) and click "Create".
    IMPORTANT: Copy the generated token immediately (you will not be able to view it again) and save it in .env as JIRA_API_TOKEN.

    B. Google Gemini (API Key)
The API key gives our assistant access to its intelligent "brain."
    B.1 Go to Google AI Studio: aistudio.google.com.
    B.2 Log in with any standard Google / Gmail account.
    B.3 Click "Get API key" in the left sidebar, or click on the "Create API key" button directly.
    B.4 Select or create a project and confirm the key generation.
    B.5 Copy the long key provided and save it in .env as GEMINI_API_KEY.

    C. Google Drive (Service Account & Master Sheet)
Google has a robust security system. Since transferring file ownership to personal @gmail.com accounts triggers security restrictions (Consent is required), the Master Spreadsheet method is the official, easiest way to use Google Drive.

    C.1 Creating the Project:
Go to the Google Cloud Console: console.cloud.google.com.
Create a new project by clicking on the project selector dropdown in the top-left corner ➔ "New Project" (e.g., QA-Agent-Drive).
    C.2 Enabling the Google Drive API:
Search for "Google Drive API" in the search bar at the top of the page.
Select the result and click the blue "Enable" button.
    C.3 Creating the Service Account:
Go to the left navigation menu ➔ IAM & Admin ➔ Service Accounts.
Click "Create Service Account" at the top.
Enter a name (e.g., drive-uploader). The platform will automatically generate an email address like: name@project.iam.gserviceaccount.com. Copy this email address!
Click "Done" directly (there is no need to assign project-level roles).
    C.4 Generating the JSON Key File:
In the Service Accounts list, click on the email address you just created.
Go to the "Keys" tab.
Click "Add Key" ➔ "Create new key".
Choose JSON format and click "Create".
A .json file will automatically download to your computer. Open it in VS Code:
        Copy the value of "client_email" and paste it in .env as GOOGLE_SERVICE_ACCOUNT_EMAIL.
        Copy the value of "private_key" (the long string starting with -----BEGIN PRIVATE KEY-----) and paste it in .env as GOOGLE_PRIVATE_KEY.
    C.5 Creating and Sharing the Master Spreadsheet:
Open your Google Drive in a browser and create an empty Excel file on your computer named QA_Master_Reports.xlsx.
Upload this file to Google Drive (e.g., inside your TestCasesAI folder).
Right-click on QA_Master_Reports.xlsx ➔ Share ➔ Invite your Service Account email address as an Editor ➔ Click Send.
Open the file in Google Drive. Copy its File ID from the browser's URL (it is the long string of letters and numbers in the URL between /d/ and /edit).
Paste this ID in your .env file under GOOGLE_DRIVE_MASTER_FILE_ID.

6. Configuring the .env File
Create a file named exactly .env in the root of your project and fill it out following this template (ensure this file is ignored by Git!):

# 🎫 Jira Credentials
JIRA_HOST=[https://your-company.atlassian.net](https://your-company.atlassian.net)
JIRA_EMAIL=your-email-address@company.com
JIRA_API_TOKEN=your_generated_jira_api_token

# 🤖 Gemini AI Credentials
GEMINI_API_KEY=your_generated_gemini_api_key

# 📂 Google Drive Credentials (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=robot-name@project-name.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"

# 📊 Master Spreadsheet Configuration (Highly Recommended)
GOOGLE_DRIVE_MASTER_FILE_ID=your_shared_master_excel_file_id

# 📁 Folder Fallback (Used only for standalone file uploads, prone to quota/consent issues)
GOOGLE_DRIVE_FOLDER_ID=your_shared_google_drive_folder_id


7. Troubleshooting and Common Errors
Error: Cannot find module ... imported from ...
Cause: TypeScript with modern Node.js (ESM) requires all local imports to explicitly include the .js extension at the end of the file path, even if your physical file is a .ts file.
Solution: Check the imports in index.ts. They should be written exactly like this:
import { fetchJiraIssue } from './services/jiraService.js'; // Notice the .js extension!


Error: GaxiosError: Insufficient permissions for the specified parent
Cause: The Service Account is trying to upload a file to a folder in your Google Drive, but the folder is private and has not been shared with the service account.
Solution: Open your Google Drive, right-click the folder, click on Share, and invite the service account email (GOOGLE_SERVICE_ACCOUNT_EMAIL) as an Editor.

Error: Service Accounts do not have storage quota
Cause: Business or personal Google Drive quotas might restrict storage allocations for standalone virtual service accounts if the parent folder permissions are not configured correctly.
Solution: Ensure the target folder is owned by your main personal/business Google account (which has storage available) and that the Service Account is simply uploading to it as an Editor.



6. Configuring the .env File

Create a file named exactly .env in the root of your project and fill it out following this template:

# 🎫 Jira Credentials
JIRA_HOST=[https://your-company.atlassian.net](https://your-company.atlassian.net)
JIRA_EMAIL=your-email-address@company.com
JIRA_API_TOKEN=your_generated_jira_api_token

# 🤖 Gemini AI Credentials
GEMINI_API_KEY=your_generated_gemini_api_key

# 📂 Google Drive Credentials (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=robot-name@project-name.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"

# 📊 Master Spreadsheet Configuration (Highly Recommended)
GOOGLE_DRIVE_MASTER_FILE_ID=your_shared_master_excel_file_id

# 📁 Folder Fallback (Used only for standalone file uploads, prone to quota/consent issues)
GOOGLE_DRIVE_FOLDER_ID=your_shared_google_drive_folder_id


7. Troubleshooting and Common Errors

Error: Consent is required to transfer ownership of a file to another user

Cause: Google prevents service accounts from pushing standalone files and forcing ownership transfers onto personal @gmail.com accounts without user interaction.

Solution: Switch to the Master Spreadsheet strategy! Share a master file with the Service Account as an Editor and define GOOGLE_DRIVE_MASTER_FILE_ID in your .env. No ownership transfer is required.

Error: Only files with binary content can be downloaded. Use Export with Docs Editors files.

Cause: The Master Spreadsheet configured via GOOGLE_DRIVE_MASTER_FILE_ID is a native cloud-based Google Sheet instead of a binary Excel file (.xlsx).

Solution: No manual change needed! The driveService.ts code has been programmatically updated to auto-detect native Google Sheets and download them using Google's drive.files.export method automatically.

Error: Cannot find module ... imported from ...

Cause: Node.js (ESM) requires relative imports inside TypeScript files to end with an explicit .js extension.

Solution: Ensure your imports in index.ts look like this:

import { fetchJiraIssue } from './services/jiraService.js';

