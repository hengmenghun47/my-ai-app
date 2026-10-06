/**
 * ==========================================================================
 * Google Apps Script for Personal Income & Expense Tracker
 * ==========================================================================
 * Sheet ID: 1748vpezYkZU7ZflHUHgNvdefcswgm7bpAN-WS8MrumM
 *
 * TABS REQUIRED:
 * 1. "Data" (Columns: Timestamp, Date, Type, Category, Amount, Note)
 * 2. "Settings" (Column A: Income Categories, Column B: Expences Categories)
 *
 * HOW TO DEPLOY:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1748vpezYkZU7ZflHUHgNvdefcswgm7bpAN-WS8MrumM/edit
 * 2. Click Extensions > Apps Script in the top menu.
 * 3. Delete any default code in Code.gs and paste this entire code.
 * 4. Click "Deploy" (top right blue button) > "New deployment".
 * 5. Click the gear icon next to "Select type" and select "Web app".
 * 6. Set:
 *    - Description: "Income Expense Tracker API"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone"  <-- CRITICAL for web app to communicate!
 * 7. Click "Deploy", review permissions, click Advanced > Go to (unsafe), and Allow.
 * 8. Copy the "Web app URL" (ends with /exec) and paste it into your web app!
 * ==========================================================================
 */

const SPREADSHEET_ID = "1748vpezYkZU7ZflHUHgNvdefcswgm7bpAN-WS8MrumM";
const SHEET_DATA_NAME = "Data";
const SHEET_SETTINGS_NAME = "Settings";

/**
 * Handle HTTP GET Requests
 * Fetches categories from Settings and historical records from Data.
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheetsInitialized(ss);

    // Support optional GET-based transaction add (fallback)
    if (e && e.parameter && e.parameter.action === "addRecord") {
      return handleAddRecord(ss, e.parameter);
    }

    // 1. Read Categories from Settings tab
    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
    const lastRowSettings = Math.max(settingsSheet.getLastRow(), 1);
    
    let incomeCategories = [];
    let expenseCategories = [];

    if (lastRowSettings > 1) {
      const settingsValues = settingsSheet.getRange(2, 1, lastRowSettings - 1, 2).getValues();
      settingsValues.forEach(row => {
        const inc = row[0] ? String(row[0]).trim() : "";
        const exp = row[1] ? String(row[1]).trim() : "";
        if (inc && !incomeCategories.includes(inc)) incomeCategories.push(inc);
        if (exp && !expenseCategories.includes(exp)) expenseCategories.push(exp);
      });
    }

    // Default fallbacks if Settings tab is empty
    if (incomeCategories.length === 0) {
      incomeCategories = ["Salary", "Freelance", "Investments", "Bonus", "Gifts", "Other Income"];
    }
    if (expenseCategories.length === 0) {
      expenseCategories = ["Food & Dining", "Groceries", "Rent & Housing", "Utilities", "Transportation", "Shopping", "Entertainment", "Healthcare", "Education", "Personal Care", "Other Expense"];
    }

    // 2. Read Historical Records from Data tab
    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const lastRowData = dataSheet.getLastRow();
    const records = [];

    if (lastRowData > 1) {
      // Range: Row 2 to lastRow, 6 columns (Timestamp, Date, Type, Category, Amount, Note)
      const dataValues = dataSheet.getRange(2, 1, lastRowData - 1, 6).getValues();
      for (let i = 0; i < dataValues.length; i++) {
        const row = dataValues[i];
        if (!row[1] && !row[2] && !row[4]) continue; // Skip empty rows

        let formattedTimestamp = "";
        if (row[0] instanceof Date) {
          formattedTimestamp = Utilities.formatDate(row[0], Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm:ss");
        } else {
          formattedTimestamp = String(row[0] || "");
        }

        let formattedDate = "";
        if (row[1] instanceof Date) {
          formattedDate = Utilities.formatDate(row[1], Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
        } else {
          formattedDate = String(row[1] || "");
        }

        records.push({
          id: i + 1,
          rowIndex: i + 2,
          timestamp: formattedTimestamp,
          date: formattedDate,
          type: String(row[2] || "Expense").trim(),
          category: String(row[3] || "Other").trim(),
          amount: parseFloat(row[4]) || 0,
          note: String(row[5] || "")
        });
      }
    }

    const responsePayload = {
      status: "success",
      sheetId: SPREADSHEET_ID,
      categories: {
        income: incomeCategories,
        expense: expenseCategories
      },
      records: records,
      totalRecords: records.length,
      timestamp: new Date().toISOString()
    };

    return createJsonResponse(responsePayload);
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString(),
      stack: err.stack
    });
  }
}

/**
 * Handle HTTP POST Requests
 * Receives new form submissions from web app and appends to Data tab.
 */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheetsInitialized(ss);

    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    return handleAddRecord(ss, data);
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Helper to validate and add a transaction to the Data tab
 */
function handleAddRecord(ss, data) {
  const date = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
  const type = (data.type && String(data.type).toLowerCase() === "income") ? "Income" : "Expense";
  const category = String(data.category || (type === "Income" ? "Other Income" : "Other Expense")).trim();
  const amount = parseFloat(data.amount);
  const note = String(data.note || "").trim();

  if (isNaN(amount) || amount <= 0) {
    return createJsonResponse({
      status: "error",
      message: "Invalid amount. Must be a positive number."
    });
  }

  const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
  const now = new Date();
  const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm:ss");

  // Columns: Timestamp, Date, Type, Category, Amount, Note
  dataSheet.appendRow([
    now,
    date,
    type,
    category,
    amount,
    note
  ]);

  return createJsonResponse({
    status: "success",
    message: "Transaction added successfully!",
    record: {
      timestamp: formattedTimestamp,
      date: date,
      type: type,
      category: category,
      amount: amount,
      note: note
    }
  });
}

/**
 * Helper to ensure Data and Settings sheets exist with proper headers
 */
function ensureSheetsInitialized(ss) {
  // Ensure "Data" sheet
  let dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(SHEET_DATA_NAME);
  }
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow(["Timestamp", "Date", "Type", "Category", "Amount", "Note"]);
    dataSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#F3F4F6");
  }

  // Ensure "Settings" sheet
  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS_NAME);
  }
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(["Income Categories", "Expences Categories"]);
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#F3F4F6");

    const defaultIncome = ["Salary", "Freelance", "Investment", "Bonus", "Gift", "Other Income"];
    const defaultExpense = ["Food & Dining", "Groceries", "Rent & Housing", "Utilities", "Transportation", "Shopping", "Entertainment", "Healthcare", "Education", "Other Expense"];
    
    const maxLen = Math.max(defaultIncome.length, defaultExpense.length);
    for (let i = 0; i < maxLen; i++) {
      settingsSheet.appendRow([defaultIncome[i] || "", defaultExpense[i] || ""]);
    }
  }
}

/**
 * Creates JSON response output for CORS-friendly web consumption
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
