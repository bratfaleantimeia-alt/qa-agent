import { google } from 'googleapis';
import fs from 'fs';
import * as dotenv from 'dotenv';
import ExcelJS from 'exceljs';

dotenv.config();

/**
 * Downloads the master spreadsheet, appends/updates a styled worksheet with the new test cases,
 * and uploads the updated file back to Google Drive.
 * * Auto-detects if the file is a Google Sheet (cloud-native) or a binary Excel file (.xlsx)
 * and uses the appropriate download/export mechanism to bypass quota and export errors.
 * * @param localFileName - Path to the local temporary file
 * @param issueKey - The Jira issue key (e.g., PROJ-123)
 * @param testCases - List of generated test cases
 */
export async function uploadToGoogleDrive(
  localFileName: string,
  issueKey: string,
  testCases: any[]
): Promise<void> {
  const driveEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const driveKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const masterFileId = process.env.GOOGLE_DRIVE_MASTER_FILE_ID;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!driveEmail || !driveKey) {
    console.log("\nℹ️ Note: Google Drive credentials are not configured in .env. Saving only locally.");
    return;
  }

  // --- STRATEGY A: Master Spreadsheet Approach (Highly Recommended) ---
  if (masterFileId) {
    console.log(`\n📤 Step 5: Accessing Master Spreadsheet on Google Drive (ID: ${masterFileId})...`);
    const tempMasterPath = `./Temp_Master_Report.xlsx`;

    try {
      const auth = new google.auth.JWT({
        email: driveEmail,
        key: driveKey,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      const drive = google.drive({ version: 'v3', auth });

      // 5.1: Fetch file metadata to auto-detect mimeType
      console.log("🕵️‍♂️ Checking master file mimeType on Google Drive...");
      const fileMetadata = await drive.files.get({
        fileId: masterFileId,
        fields: 'mimeType'
      });
      
      const mimeType = fileMetadata.data.mimeType;
      console.log(`📄 File type detected: ${mimeType}`);

      // 5.2: Download the file (using get for binary, or export for Google Sheets)
      console.log("📥 Downloading the Master Spreadsheet...");
      let downloadResponse;
      
      if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        console.log("📊 Detected native Google Sheet format. Using 'export' method to convert to XLSX...");
        downloadResponse = await drive.files.export(
          { 
            fileId: masterFileId, 
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          },
          { responseType: 'stream' }
        );
      } else {
        console.log("📁 Detected binary Excel file (.xlsx). Using standard 'get' method...");
        downloadResponse = await drive.files.get(
          { 
            fileId: masterFileId, 
            alt: 'media' 
          },
          { responseType: 'stream' }
        );
      }

      const writer = fs.createWriteStream(tempMasterPath);
      downloadResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // 5.3: Open the downloaded Master File with ExcelJS
      console.log("📂 Opening Master Spreadsheet to write test cases...");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(tempMasterPath);

      // 5.4: Add or overwrite the worksheet tab named after the Jira Issue
      let worksheet = workbook.getWorksheet(issueKey);
      if (worksheet) {
        console.log(`⚠️ Tab "${issueKey}" already exists inside the master file. Overwriting older test cases...`);
        workbook.removeWorksheet(worksheet.id);
      }
      worksheet = workbook.addWorksheet(issueKey);

      // Set columns structure and dimensions
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Test Type', key: 'type', width: 15 },
        { header: 'Test Case Title', key: 'title', width: 35 },
        { header: 'Preconditions', key: 'preconditions', width: 30 },
        { header: 'Steps to Reproduce', key: 'steps', width: 50 },
        { header: 'Expected Result', key: 'expectedResult', width: 50 }
      ];

      // Style header row (Corporate Dark Blue)
      const headerRow = worksheet.getRow(1);
      headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add data rows to the worksheet tab
      testCases.forEach((tc: any) => {
        const row = worksheet.addRow({
          id: tc.id,
          type: tc.type,
          title: tc.title,
          preconditions: tc.preconditions || 'N/A',
          steps: tc.steps,
          expectedResult: tc.expectedResult
        });
        row.alignment = { wrapText: true, vertical: 'top' };
      });

      // Write the updated file locally
      await workbook.xlsx.writeFile(tempMasterPath);

      // 5.5: Upload the updated file content back to Google Drive
      console.log("⚡ Uploading the updated spreadsheet back to Google Drive...");
      const media = {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: fs.createReadStream(tempMasterPath)
      };

      // Even if it's a native Google Sheet, uploading with matching mimeType converts it back
      const updateResponse = await drive.files.update({
        fileId: masterFileId,
        media: media,
        fields: 'id, webViewLink'
      });

      console.log(`✅ Master Spreadsheet updated successfully!`);
      console.log(`🔗 Access Link: ${updateResponse.data.webViewLink}`);

      // Clean up temporary local file
      if (fs.existsSync(tempMasterPath)) {
        fs.unlinkSync(tempMasterPath);
      }

    } catch (error) {
      console.error("❌ Error during Master Spreadsheet upload process:", error);
      if (fs.existsSync(tempMasterPath)) {
        fs.unlinkSync(tempMasterPath);
      }
    }
    return;
  }

  // --- STRATEGY B: Standalone File Upload (Fallback) ---
  if (folderId) {
    console.log(`\n📤 Step 5: Initiating standalone file upload to Google Drive folder...`);
    try {
      const auth = new google.auth.JWT({
        email: driveEmail,
        key: driveKey,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      const drive = google.drive({ version: 'v3', auth });

      const fileMetadata = {
        name: localFileName,
        parents: [folderId]
      };

      const media = {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: fs.createReadStream(localFileName)
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });

      console.log(`✅ Standalone file uploaded successfully to Google Drive!`);
      console.log(`🔗 Access Link: ${response.data.webViewLink}`);
    } catch (error: any) {
      console.error("❌ Error uploading standalone file:", error.message);
    }
  }
}