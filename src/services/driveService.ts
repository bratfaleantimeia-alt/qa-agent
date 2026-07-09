import { google } from 'googleapis';
import fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Uploads the generated Excel file to the specified Google Drive folder
 * @param fileName - Name of the local Excel file
 */
export async function uploadToGoogleDrive(fileName: string): Promise<void> {
  const driveEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const driveKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Skip Google Drive upload if credentials are missing, without blocking the agent
  if (!driveEmail || !driveKey) {
    console.log("\nℹ️ Note: Google Drive integration is not fully configured in .env. The file was saved only locally.");
    return;
  }

  console.log(`\n📤 Step 5: Initiating file upload to Google Drive...`);

  try {
    const auth = new google.auth.JWT({
      email: driveEmail,
      key: driveKey,
       scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata: any = {
      name: fileName
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(fileName)
    };

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