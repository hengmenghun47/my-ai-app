/**
 * ==========================================================================
 * Google Apps Script for Multi-Business Ledger (Separate Google Sheets)
 * ==========================================================================
 * 
 * WHY DATA STILL WENT INTO THE OLD SPREADSHEET:
 * 1. Google Apps Script Web Apps run the version of code that is DEPLOYED in
 *    Google Cloud, not the code in this local file.
 * 2. If you use the existing Web App URL (ending in .../exec), Google executes
 *    the old script that was hardcoded to the Cafe spreadsheet!
 * 3. To make "ពូអុក Internet" store into its own spreadsheet, choose EITHER:
 *
 * --------------------------------------------------------------------------
 * METHOD 1 (RECOMMENDED - 100% SEPARATE & EASIEST):
 * Create a new Google Sheet for "ពូអុក Internet" with its own dedicated Web App!
 * --------------------------------------------------------------------------
 * 1. Open Google Sheets (https://sheet.new) and name it "ពូអុក Internet Ledger".
 * 2. In that sheet, click Extensions > Apps Script.
 * 3. Delete everything in Code.gs and paste SCRIPT 1 (below).
 * 4. Click the blue "Deploy" button > "New deployment".
 *    - Select type: "Web app" (click the gear icon if needed).
 *    - Description: "Pou Ok Internet Web App"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Click "Deploy", authorize access, and copy the Web App URL (.../exec).
 * 6. In your Income/Expense app, click Settings (</>) and paste the URL into:
 *    "ពូអុក Internet Web App URL".
 * 7. Click "Save & Connect Separate Sheets".
 * ==> DONE! All data entered under "ពូអុក Internet" will 100% go into your new sheet!
 *
 * --------------------------------------------------------------------------
 * METHOD 2 (UPDATE EXISTING MASTER WEB APP):
 * --------------------------------------------------------------------------
 * If you prefer 1 single Web App for both sheets:
 * 1. Open the original Google Sheet ("កាហ្វេចុងភូមិ") > Extensions > Apps Script.
 * 2. Replace Code.gs with SCRIPT 2 (below).
 * 3. Put your second spreadsheet ID into SPREADSHEET_ID_INTERNET.
 * 4. CRITICAL STEP: Click "Deploy" > "Manage deployments" > click pencil (Edit)
 *    > change "Version" dropdown to "New version" > click "Deploy"!
 *    (If you don't select "New version", Google keeps running the old script!)
 * ==========================================================================
 */

/* ==========================================================================
 * SCRIPT 1: DEDICATED SCRIPT FOR "ពូអុក Internet" (Or Any Standalone Sheet)
 * Paste this directly into the new sheet's Extensions > Apps Script!
 * ========================================================================== */

const TIMEZONE_PHNOM_PENH = "Asia/Phnom_Penh"; // Daun Penh, Phnom Penh, Cambodia (GMT+7)

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const lastRow = sheet.getLastRow();
    const records = [];

    if (lastRow > 1) {
      const vals = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
      for (let i = 0; i < vals.length; i++) {
        const row = vals[i];
        if (!row[1] && !row[2] && !row[4]) continue;

        let formattedTimestamp = "";
        if (row[0] instanceof Date) {
          formattedTimestamp = Utilities.formatDate(row[0], TIMEZONE_PHNOM_PENH, "yyyy-MM-dd HH:mm:ss");
        } else {
          formattedTimestamp = String(row[0] || "");
        }

        let formattedDate = "";
        if (row[1] instanceof Date) {
          formattedDate = Utilities.formatDate(row[1], TIMEZONE_PHNOM_PENH, "yyyy-MM-dd");
        } else {
          formattedDate = String(row[1] || "");
        }

        records.push({
          id: i + 1,
          timestamp: formattedTimestamp,
          date: formattedDate,
          type: String(row[2] || "Expense").trim(),
          category: String(row[3] || "Other").trim(),
          amount: parseFloat(row[4]) || 0,
          note: String(row[5] || "")
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      business: "ពូអុក Internet",
      spreadsheetId: ss.getId(),
      records: records,
      totalRecords: records.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (ex) { data = e.parameter || {}; }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getActiveSheet();

    // Auto-create column headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Date", "Type", "Category", "Amount", "Note"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#F3F4F6");
    }

    const now = new Date();
    const date = data.date || Utilities.formatDate(now, TIMEZONE_PHNOM_PENH, "yyyy-MM-dd");
    const formattedTimestamp = data.timestamp || Utilities.formatDate(now, TIMEZONE_PHNOM_PENH, "yyyy-MM-dd HH:mm:ss");
    const type = (data.type && String(data.type).toLowerCase() === "income") ? "Income" : "Expense";
    const category = String(data.category || (type === "Income" ? "Other Income" : "Other Expense")).trim();
    const amount = parseFloat(data.amount);
    const note = String(data.note || "").trim();

    if (isNaN(amount) || amount <= 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid amount." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Append entry directly to this sheet
    sheet.appendRow([
      formattedTimestamp,
      date,
      type,
      category,
      amount,
      note
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      business: "ពូអុក Internet",
      spreadsheetId: ss.getId(),
      sheet: sheet.getName(),
      message: "Saved successfully to " + ss.getName() + "!",
      record: { timestamp: formattedTimestamp, date: date, type: type, category: category, amount: amount, note: note }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
