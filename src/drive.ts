import JiraClient from 'jira-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { google } from 'googleapis';
import fs from 'fs';

// Încărcăm variabilele de mediu din fișierul .env
dotenv.config();

const jiraHost = process.env.JIRA_HOST;
const jiraEmail = process.env.JIRA_EMAIL;
const jiraApiToken = process.env.JIRA_API_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

// Verificăm dacă avem toate configurările necesare
if (!jiraHost || !jiraEmail || !jiraApiToken || !geminiApiKey) {
  console.error("❌ Eroare: Te rog verifică fișierul .env! Lipsesc configurări pentru Jira sau Gemini.");
  process.exit(1);
}

// Inițializăm clientul Jira
const jira = new JiraClient({
  protocol: 'https',
  host: jiraHost.replace('https://', ''),
  username: jiraEmail,
  password: jiraApiToken,
  apiVersion: '2',
  strictSSL: true
});

// Inițializăm clientul Gemini API
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Funcție pentru a încărca un fișier local în Google Drive
 */
async function incarcaInGoogleDrive(numeFisier: string) {
  const driveEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const driveKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // rezolvă caracterele de linie nouă din .env
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Dacă nu sunt configurate datele de Google Drive, doar sărim peste acest pas fără să crăpăm aplicația
  if (!driveEmail || !driveKey) {
    console.log("\nℹ️ Notă: Integrarea cu Google Drive nu este configurată complet în .env. Fișierul a rămas doar local.");
    return;
  }

  console.log(`\n📤 Pasul 5: Se inițiază încărcarea fișierului în Google Drive...`);

  try {
    // Configurare autentificare prin JWT (Service Account) folosind un singur obiect de opțiuni
    const auth = new google.auth.JWT({
      email: driveEmail,
      key: driveKey,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    // Folosim o structură flexibilă pentru a evita erorile stricte de tipuri (exactOptionalPropertyTypes)
    const fileMetadata: any = {
      name: numeFisier
    };

    // Adăugăm folderul părinte doar dacă acesta este definit în .env
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(numeFisier)
    };

    // Castăm răspunsul la 'any' pentru a evita problemele de rezoluție a supraîncărcărilor din TypeScript
    const response: any = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log(`✅ Fișierul a fost încărcat cu succes în Google Drive!`);
    console.log(`🔗 Link acces: ${response.data.webViewLink}`);
  } catch (error) {
    console.error("❌ Eroare la încărcarea în Google Drive:", error);
  }
}

async function ruleazaAgentQA() {
  try {
    // 1. Definim tichetul pe care vrem să îl analizăm (înlocuiește cu un ID valid din Jira-ul tău)
    const issueKey = 'QARO-59'; 
    console.log(`\n🔍 Pasul 1: Se accesează Jira pentru tichetul ${issueKey}...`);
    
    const issue = await jira.findIssue(issueKey);
    const titluStory = issue.fields.summary;
    const descriereStory = issue.fields.description || 'Fără descriere disponibilă.';
    
    console.log(`✅ Tichet preluat cu succes!`);
    console.log(`📌 Titlu: ${titluStory}`);
    
    // 2. Pregătim instrucțiunile (prompt-ul) pentru Gemini ca să ne returneze JSON structurat
    console.log(`\n🤖 Pasul 2: Se trimit datele către Gemini AI pentru analiză QA...`);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });
    
    const prompt = `
      Ești un Senior QA Engineer. Analizează următorul User Story din Jira și generează cazuri de testare detaliate și structurate.
      Răspunsul tău TREBUIE să fie un obiect JSON valid, fără alte texte explicative pe lângă el.
      
      Structura JSON pe care trebuie să o respecți cu strictețe este:
      {
        "testCases": [
          {
            "id": "TC001",
            "tip": "Pozitiv",
            "titlu": "Titlu scurt al cazului de testare",
            "preconditii": "Precondiții necesare (dacă există, altfel lasă gol)",
            "pasi": "1. Primul pas\\n2. Al doilea pas\\n3. Al treilea pas",
            "rezultatAsteptat": "Rezultatul așteptat detaliat"
          }
        ]
      }
      
      Valori permise pentru 'tip': 'Pozitiv', 'Negativ', 'Edge Case'.
      
      Iată detaliile tichetului de Jira:
      --------------------------------------------------
      Titlu Story: ${titluStory}
      Descriere Story: ${descriereStory}
      --------------------------------------------------
      
      Te rog să scrii textele în limba engleză.
    `;
    
    // Apelăm modelul de AI și așteptăm răspunsul
    const rezultat = await model.generateContent(prompt);
    const raspunsAI = rezultat.response.text();
    
    // 3. Parsăm JSON-ul primit de la Gemini
    console.log(`\n📊 Pasul 3: Se procesează datele primite de la AI...`);
    
    let curatat = raspunsAI.trim();
    if (curatat.startsWith('```')) {
      curatat = curatat.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    
    const dateTestare = JSON.parse(curatat);
    
    if (!dateTestare.testCases || !Array.isArray(dateTestare.testCases)) {
      throw new Error("Formatul JSON returnat de AI este invalid sau nu conține array-ul 'testCases'.");
    }

    // 4. Generăm fișierul Excel folosind exceljs
    console.log(`💾 Pasul 4: Se generează fișierul Excel...`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cazuri de Testare');
    
    // Definim coloanele, cheile de legătură și dimensiunile
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Tip Test', key: 'tip', width: 15 },
      { header: 'Titlu Caz de Testare', key: 'titlu', width: 35 },
      { header: 'Precondiții', key: 'preconditii', width: 30 },
      { header: 'Pași de Reproducere', key: 'pasi', width: 50 },
      { header: 'Rezultat Așteptat', key: 'rezultatAsteptat', width: 50 }
    ];
    
    // Stilăm capul de tabel (Header-ul) pentru un aspect profesional
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E78' } // Albastru închis corporate
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Adăugăm rândurile cu date în tabel
    dateTestare.testCases.forEach((tc: any) => {
      const rand = worksheet.addRow({
        id: tc.id,
        tip: tc.tip,
        titlu: tc.titlu,
        preconditii: tc.preconditii || 'N/A',
        pasi: tc.pasi,
        rezultatAsteptat: tc.rezultatAsteptat
      });
      
      // Permitem textului să se așeze pe mai multe linii (wrap text) și îl aliniem sus
      rand.alignment = { wrapText: true, vertical: 'top' };
    });

    // Salvăm fișierul local cu numele tichetului
    const numeFisier = `Cazuri_Testare_${issueKey}.xlsx`;
    await workbook.xlsx.writeFile(numeFisier);
    
    console.log(`📁 Fișierul Excel a fost salvat local ca: ${numeFisier}`);
    
    // 5. Încărcăm în Google Drive (dacă este configurat în .env)
    await incarcaInGoogleDrive(numeFisier);
    
    console.log(`\n💾 Proces încheiat!`);
    console.log(`--------------------------------------------------`);
    
  } catch (error) {
    console.error("❌ A apărut o eroare în timpul rulării agentului:", error);
  }
}

ruleazaAgentQA();