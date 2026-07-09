import ExcelJS from 'exceljs';

/**
 * Generates a professionally styled and structured Excel sheet
 * @param issueKey - The Jira issue key (used to name the file)
 * @param testCases - List of test cases to write
 * @returns The generated local file name
 */
export async function generateExcelReport(issueKey: string, testCases: any[]): Promise<string> {
  console.log(`💾 Step 4: Generating the Excel file...`);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Cases');
  
  // Set column structure and dimensions
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

  // Add data rows to the worksheet
  testCases.forEach((tc: any) => {
    const row = worksheet.addRow({
      id: tc.id,
      type: tc.type,
      title: tc.title,
      preconditions: tc.preconditions || 'N/A',
      steps: tc.steps,
      expectedResult: tc.expectedResult
    });
    
    // Enable text wrapping for multi-line formatting and align to top
    row.alignment = { wrapText: true, vertical: 'top' };
  });

  const fileName = `Test_Cases_${issueKey}.xlsx`;
  await workbook.xlsx.writeFile(fileName);
  
  console.log(`📁 The Excel file was saved locally as: ${fileName}`);
  return fileName;
}