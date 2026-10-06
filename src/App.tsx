/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  PlusCircle,
  RefreshCw,
  Settings as SettingsIcon,
  ExternalLink,
  Check,
  Copy,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  PieChart,
  BarChart3,
  Search,
  Code2,
  X,
  ChevronRight,
  Database
} from 'lucide-react';

interface Transaction {
  id: string | number;
  timestamp?: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  note: string;
}

interface CategoriesState {
  income: string[];
  expense: string[];
}

const GOOGLE_SHEET_ID = '1748vpezYkZU7ZflHUHgNvdefcswgm7bpAN-WS8MrumM';
const STORAGE_KEY_URL = 'ledger_google_apps_script_url';

const DEFAULT_CATEGORIES: CategoriesState = {
  income: ['Salary', 'Freelance', 'Investments', 'Bonus', 'Gifts', 'Other Income'],
  expense: [
    'Food & Dining',
    'Groceries',
    'Rent & Housing',
    'Utilities',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Education',
    'Personal Care',
    'Other Expense'
  ]
};

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-10-01', type: 'Income', category: 'Salary', amount: 4800.0, note: 'Primary monthly salary', timestamp: '2026-10-01 09:00:00' },
  { id: '2', date: '2026-10-02', type: 'Expense', category: 'Rent & Housing', amount: 1650.0, note: 'Apartment monthly lease', timestamp: '2026-10-02 11:15:00' },
  { id: '3', date: '2026-10-03', type: 'Expense', category: 'Groceries', amount: 194.5, note: 'Organic supermarket run', timestamp: '2026-10-03 14:20:00' },
  { id: '4', date: '2026-10-04', type: 'Expense', category: 'Utilities', amount: 125.8, note: 'Electric & high-speed internet', timestamp: '2026-10-04 16:45:00' },
  { id: '5', date: '2026-10-04', type: 'Income', category: 'Freelance', amount: 920.0, note: 'Design sprint consulting fee', timestamp: '2026-10-04 18:00:00' },
  { id: '6', date: '2026-10-05', type: 'Expense', category: 'Food & Dining', amount: 68.4, note: 'Dinner with colleagues', timestamp: '2026-10-05 20:30:00' },
  { id: '7', date: '2026-10-06', type: 'Expense', category: 'Transportation', amount: 45.0, note: 'Monthly transit card top-up', timestamp: '2026-10-06 08:30:00' }
];

export default function App() {
  // Config & State
  const [scriptUrl, setScriptUrl] = useState<string>('');
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Data
  const [categories, setCategories] = useState<CategoriesState>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Form State
  const [txType, setTxType] = useState<'Expense' | 'Income'>('Expense');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState<string>('');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txNote, setTxNote] = useState<string>('');

  // Dashboard Filters & View
  const [filterType, setFilterType] = useState<'All' | 'Expense' | 'Income'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartMode, setChartMode] = useState<'comparison' | 'category'>('comparison');
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);

  // Initialize
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEY_URL);
    if (savedUrl) {
      setScriptUrl(savedUrl);
      setInputUrl(savedUrl);
      fetchSheetData(savedUrl);
    } else {
      // First visit: Show URL modal
      setIsUrlModalOpen(true);
      // Pre-load demo data so user has immediate preview context
      setTransactions(DEMO_TRANSACTIONS);
      setIsDemoMode(true);
    }
  }, []);

  // Sync Category selection when Type changes
  useEffect(() => {
    const activeList = txType === 'Income' ? categories.income : categories.expense;
    if (activeList.length > 0 && (!txCategory || !activeList.includes(txCategory))) {
      setTxCategory(activeList[0]);
    }
  }, [txType, categories]);

  // Show Toast
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Fetch Data from Google Apps Script
  const fetchSheetData = async (targetUrl = scriptUrl) => {
    if (!targetUrl) {
      setIsUrlModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        if (data.categories) {
          setCategories({
            income: data.categories.income?.length ? data.categories.income : DEFAULT_CATEGORIES.income,
            expense: data.categories.expense?.length ? data.categories.expense : DEFAULT_CATEGORIES.expense
          });
        }
        if (Array.isArray(data.records)) {
          setTransactions(data.records.reverse()); // Latest first
        }
        setIsDemoMode(false);
        showToast('Successfully synchronized with Google Sheet!', 'success');
      } else {
        throw new Error(data.message || 'Error parsing Google Sheet response');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Fetch error:', errMsg);
      showToast(
        `Sync Notice: ${errMsg}. Check deployment permissions (must be "Anyone").`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    const newRecord: Transaction = {
      id: Date.now().toString(),
      date: txDate,
      type: txType,
      category: txCategory || (txType === 'Income' ? 'Other Income' : 'Other Expense'),
      amount: parsedAmount,
      note: txNote.trim(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    setIsSubmitting(true);

    if (isDemoMode || !scriptUrl) {
      // Local simulation
      setTimeout(() => {
        setTransactions((prev) => [newRecord, ...prev]);
        setTxAmount('');
        setTxNote('');
        setIsSubmitting(false);
        showToast('Transaction saved in Demo Mode.', 'success');
      }, 400);
      return;
    }

    try {
      // Send with text/plain to avoid CORS preflight OPTIONS rejection in Google Apps Script
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          date: newRecord.date,
          type: newRecord.type,
          category: newRecord.category,
          amount: newRecord.amount,
          note: newRecord.note
        }),
        redirect: 'follow'
      });

      const res = await response.json();
      if (res.status === 'success') {
        setTransactions((prev) => [newRecord, ...prev]);
        setTxAmount('');
        setTxNote('');
        showToast('Transaction saved directly to Google Sheet "Data" tab!', 'success');
      } else {
        throw new Error(res.message || 'Failed to append row');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Submission failed:', errMsg);
      // Optimistic record locally with notice
      setTransactions((prev) => [newRecord, ...prev]);
      setTxAmount('');
      setTxNote('');
      showToast(`Saved locally, but Google Sheet sync failed: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Config URL
  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = inputUrl.trim();
    if (!cleanUrl.startsWith('https://script.google.com/')) {
      showToast('URL must start with https://script.google.com/macros/s/...', 'error');
      return;
    }
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    setScriptUrl(cleanUrl);
    setIsUrlModalOpen(false);
    setIsDemoMode(false);
    fetchSheetData(cleanUrl);
  };

  const handleUseDemo = () => {
    setIsDemoMode(true);
    setTransactions(DEMO_TRANSACTIONS);
    setIsUrlModalOpen(false);
    showToast('Demo Mode enabled. You can connect your Google Sheet anytime.', 'info');
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'Income') {
        income += amt;
        incomeCount++;
      } else {
        expense += amt;
        expenseCount++;
      }
    });

    const net = income - expense;
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    return {
      income,
      expense,
      net,
      incomeCount,
      expenseCount,
      savingsRate
    };
  }, [transactions]);

  // Category Breakdown for Chart
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'Expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });

    const sorted = Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return sorted;
  }, [transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = filterType === 'All' || tx.type === filterType;
      const matchesQuery =
        !searchQuery ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.date.includes(searchQuery);
      return matchesType && matchesQuery;
    });
  }, [transactions, filterType, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      showToast('No records to export', 'info');
      return;
    }
    const headers = ['Timestamp', 'Date', 'Type', 'Category', 'Amount', 'Note'];
    const rows = transactions.map((t) => [
      `"${t.timestamp || ''}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${t.category}"`,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Income_Expense_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV file successfully!', 'success');
  };

  // Google Apps Script source code
  const appsScriptCode = `/**
 * Google Apps Script Backend for Personal Income & Expense Tracker
 * Sheet ID: ${GOOGLE_SHEET_ID}
 */
const SPREADSHEET_ID = "${GOOGLE_SHEET_ID}";
const SHEET_DATA_NAME = "Data";
const SHEET_SETTINGS_NAME = "Settings";

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheetsInitialized(ss);

    // 1. Read Categories from Settings tab
    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
    const lastRowSettings = Math.max(settingsSheet.getLastRow(), 1);
    let incomeCategories = [];
    let expenseCategories = [];

    if (lastRowSettings > 1) {
      const vals = settingsSheet.getRange(2, 1, lastRowSettings - 1, 2).getValues();
      vals.forEach(row => {
        const inc = row[0] ? String(row[0]).trim() : "";
        const exp = row[1] ? String(row[1]).trim() : "";
        if (inc && !incomeCategories.includes(inc)) incomeCategories.push(inc);
        if (exp && !expenseCategories.includes(exp)) expenseCategories.push(exp);
      });
    }

    if (incomeCategories.length === 0) {
      incomeCategories = ["Salary", "Freelance", "Investments", "Bonus", "Gifts", "Other Income"];
    }
    if (expenseCategories.length === 0) {
      expenseCategories = ["Food & Dining", "Groceries", "Rent & Housing", "Utilities", "Transportation", "Shopping", "Entertainment", "Healthcare", "Education", "Other Expense"];
    }

    // 2. Read Historical Records from Data tab
    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const lastRowData = dataSheet.getLastRow();
    const records = [];

    if (lastRowData > 1) {
      const dataValues = dataSheet.getRange(2, 1, lastRowData - 1, 6).getValues();
      for (let i = 0; i < dataValues.length; i++) {
        const row = dataValues[i];
        if (!row[1] && !row[2] && !row[4]) continue;

        let timestampStr = row[0] instanceof Date 
          ? Utilities.formatDate(row[0], Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm:ss")
          : String(row[0] || "");

        let dateStr = row[1] instanceof Date
          ? Utilities.formatDate(row[1], Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd")
          : String(row[1] || "");

        records.push({
          id: i + 1,
          timestamp: timestampStr,
          date: dateStr,
          type: String(row[2] || "Expense").trim(),
          category: String(row[3] || "Other").trim(),
          amount: parseFloat(row[4]) || 0,
          note: String(row[5] || "")
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      categories: { income: incomeCategories, expense: expenseCategories },
      records: records
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
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheetsInitialized(ss);

    let data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(err) { data = e.parameter || {}; }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const date = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
    const type = (data.type && String(data.type).toLowerCase() === "income") ? "Income" : "Expense";
    const category = String(data.category || (type === "Income" ? "Other Income" : "Other Expense")).trim();
    const amount = parseFloat(data.amount);
    const note = String(data.note || "").trim();

    if (isNaN(amount) || amount <= 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Invalid amount. Must be positive."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const now = new Date();
    dataSheet.appendRow([now, date, type, category, amount, note]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Row added to Data tab successfully",
      record: { date, type, category, amount, note }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureSheetsInitialized(ss) {
  let dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!dataSheet) dataSheet = ss.insertSheet(SHEET_DATA_NAME);
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow(["Timestamp", "Date", "Type", "Category", "Amount", "Note"]);
    dataSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#F3F4F6");
  }

  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
  if (!settingsSheet) settingsSheet = ss.insertSheet(SHEET_SETTINGS_NAME);
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(["Income Categories", "Expences Categories"]);
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#F3F4F6");
    const defaults = [
      ["Salary", "Food & Dining"],
      ["Freelance", "Groceries"],
      ["Investments", "Rent & Housing"],
      ["Bonus", "Utilities"],
      ["Gifts", "Transportation"],
      ["Other Income", "Entertainment"],
      ["", "Shopping"],
      ["", "Healthcare"],
      ["", "Other Expense"]
    ];
    defaults.forEach(row => settingsSheet.appendRow(row));
  }
}`;

  const copyAppsScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setHasCopiedCode(true);
    showToast('Apps Script code copied to clipboard!', 'success');
    setTimeout(() => setHasCopiedCode(false), 3000);
  };

  const downloadStandaloneHtml = () => {
    const element = document.createElement('a');
    element.setAttribute('href', '/standalone-tracker.html');
    element.setAttribute('download', 'Income_Expense_Tracker.html');
    element.click();
    showToast('Downloaded standalone single HTML tracker file!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 flex flex-col">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-800'
              : 'bg-slate-900 text-slate-100 border-slate-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP NAVIGATION / HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                  LedgerSheet
                </h1>
                {isDemoMode ? (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    Demo Mode
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sheet Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Connected to Google Sheet ID <code className="font-mono text-slate-600 font-semibold">{GOOGLE_SHEET_ID.substring(0, 8)}...</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Button */}
            <button
              onClick={() => fetchSheetData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh and sync data from Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* Apps Script Code Modal */}
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="View Google Apps Script Code & Setup Steps"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Apps Script</span>
            </button>

            {/* Connection Config Button */}
            <button
              onClick={() => setIsUrlModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Configure Web App URL"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Sheet URL</span>
            </button>

            {/* Open Google Sheet Link */}
            <a
              href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              title="Open Google Sheet in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Google Sheet</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* DEMO NOTICE CALLOUT */}
        {isDemoMode && (
          <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                You are previewing sample data. To read and save directly to your Google Sheet,
                enter your deployed <strong>Google Apps Script Web App URL</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="px-2.5 py-1 font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                View Apps Script Setup
              </button>
              <button
                onClick={() => setIsUrlModalOpen(true)}
                className="px-2.5 py-1 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Connect URL
              </button>
            </div>
          </div>
        )}

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total Income */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Income</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              ${metrics.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <span>{metrics.incomeCount} income records</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 font-medium">Credits</span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              ${metrics.expense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <span>{metrics.expenseCount} expense records</span>
              <span aria-hidden="true">·</span>
              <span className="text-rose-600 font-medium">Debits</span>
            </div>
          </div>

          {/* Net Balance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Net Balance</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-bold ${
                metrics.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {metrics.net < 0 ? '-' : ''}$
              {Math.abs(metrics.net).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <span>Savings margin: {metrics.savingsRate}%</span>
              <span aria-hidden="true">·</span>
              <span>{metrics.net >= 0 ? 'Surplus' : 'Deficit'}</span>
            </div>
          </div>
        </div>

        {/* WORKSPACE TWO COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: TRANSACTION FORM */}
          <section className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-base text-slate-900">New Transaction</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Appends directly to "Data" tab in Google Sheets
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                <Database className="w-3 h-3" />
                <span>Live Sheet</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTxType('Expense')}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      txType === 'Expense'
                        ? 'bg-white text-rose-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('Income')}
                    className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      txType === 'Income'
                        ? 'bg-white text-emerald-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Income
                  </button>
                </div>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tx-date-input" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Date
                  </label>
                  <input
                    id="tx-date-input"
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="tx-amount-input" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm font-semibold">
                      $
                    </span>
                    <input
                      id="tx-amount-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Amount Helpers */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-[11px] text-slate-400">Quick:</span>
                {[10, 25, 50, 100, 500].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setTxAmount(quick.toString())}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                  >
                    +${quick}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="tx-category-select" className="block text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Category
                  </label>
                  <span className="text-[11px] text-slate-400">
                    From "Settings" tab (Col {txType === 'Income' ? 'A' : 'B'})
                  </span>
                </div>
                <select
                  id="tx-category-select"
                  required
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {(txType === 'Income' ? categories.income : categories.expense).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note / Description */}
              <div>
                <label htmlFor="tx-note-input" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Note / Description
                </label>
                <input
                  id="tx-note-input"
                  type="text"
                  placeholder="e.g. Weekly organic groceries, Client retainer, Rent..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Writing to Google Sheet...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Add {txType} Entry</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* RIGHT COLUMN: CHARTS & HISTORICAL RECORDS */}
          <section className="lg:col-span-7 space-y-6">
            {/* Visual Analytics Chart Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-base text-slate-900">Visual Summary</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time visualization of your sheet balance and categories
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setChartMode('comparison')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      chartMode === 'comparison'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Income vs Expenses
                  </button>
                  <button
                    onClick={() => setChartMode('category')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      chartMode === 'category'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    By Category
                  </button>
                </div>
              </div>

              {/* Chart Graphics */}
              {chartMode === 'comparison' ? (
                <div className="space-y-5 py-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-emerald-700 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Income
                      </span>
                      <span className="text-slate-900 font-semibold font-mono">
                        ${metrics.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            metrics.income + metrics.expense > 0
                              ? Math.min(
                                  100,
                                  Math.round((metrics.income / (metrics.income + metrics.expense)) * 100)
                                )
                              : 50
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-rose-700 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Expenses
                      </span>
                      <span className="text-slate-900 font-semibold font-mono">
                        ${metrics.expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            metrics.income + metrics.expense > 0
                              ? Math.min(
                                  100,
                                  Math.round((metrics.expense / (metrics.income + metrics.expense)) * 100)
                                )
                              : 50
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Net Flow Status:</span>
                    <span
                      className={`font-semibold ${
                        metrics.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {metrics.net >= 0 ? 'Positive Cash Flow (Saved ' : 'Overbudget Deficit ('}
                      {metrics.savingsRate}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-1">
                  {categoryBreakdown.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No expenses recorded yet.
                    </div>
                  ) : (
                    categoryBreakdown.slice(0, 6).map((cat) => {
                      const pct = metrics.expense > 0 ? Math.round((cat.total / metrics.expense) * 100) : 0;
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700">{cat.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">{pct}%</span>
                              <span className="font-semibold text-slate-900 font-mono">
                                ${cat.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-700 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Historical Transactions Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-base text-slate-900">Historical Records</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Synced from Google Sheet "Data" tab ({filteredTransactions.length} of {transactions.length})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['All', 'Expense', 'Income'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                          filterType === t
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t === 'All' ? 'All' : t === 'Expense' ? 'Expenses' : 'Income'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Export to CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by category, note, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Note</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No transactions found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.slice(0, 15).map((tx) => {
                        const isInc = tx.type === 'Income';
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 text-slate-600 whitespace-nowrap font-mono">
                              {tx.date}
                            </td>
                            <td className="py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  isInc ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {isInc ? '↑ Income' : '↓ Expense'}
                              </span>
                            </td>
                            <td className="py-3 text-slate-800 font-medium whitespace-nowrap">
                              {tx.category}
                            </td>
                            <td className="py-3 text-slate-500 max-w-xs truncate">
                              {tx.note || '—'}
                            </td>
                            <td
                              className={`py-3 text-right font-mono font-semibold whitespace-nowrap ${
                                isInc ? 'text-emerald-600' : 'text-slate-900'
                              }`}
                            >
                              {isInc ? '+' : '-'}${Number(tx.amount).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Google Sheet ID:</span>
            <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
              {GOOGLE_SHEET_ID}
            </code>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={downloadStandaloneHtml}
              className="text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Standalone HTML File
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Apps Script Deployment Guide
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL 1: GOOGLE APPS SCRIPT WEB APP URL CONFIGURATION */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Connect Google Sheet</h3>
                  <p className="text-xs text-slate-500">Enter your Apps Script Web App URL</p>
                </div>
              </div>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              To fetch categories and record new transactions directly to your Google Sheet (
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                {GOOGLE_SHEET_ID}
              </code>
              ), deploy the backend script and paste the generated Web App URL below.
            </p>

            <form onSubmit={handleSaveUrl} className="space-y-4">
              <div>
                <label htmlFor="modal-script-url-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Google Apps Script Web App URL
                </label>
                <input
                  id="modal-script-url-input"
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  The URL generated when deploying as a Web App (ends with <code className="text-slate-600 font-semibold">/exec</code>).
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <div className="font-semibold flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Key Deployment Setting:
                </div>
                In the Google Apps Script deployment settings, set <strong>"Who has access"</strong> to <strong>"Anyone"</strong>. This permits the web app to query the API without CORS authorization blocks.
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Try Demo Mode First
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUrlModalOpen(false);
                      setIsGuideModalOpen(true);
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Get Script Code
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Save & Connect
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPS SCRIPT GUIDE & CODE VIEWER */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Google Apps Script Code & Deployment</h3>
                  <p className="text-xs text-slate-500">Step-by-step instructions for your sheet</p>
                </div>
              </div>
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs text-slate-600">
              <div className="space-y-2">
                <div className="font-semibold text-slate-900 text-sm">Deployment Steps:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <li>
                    Open your sheet:{' '}
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 underline font-semibold"
                    >
                      Open Sheet in new tab
                    </a>
                  </li>
                  <li>In the top menu, click <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Erase any template code in the editor, and paste the script below.</li>
                  <li>Click <strong>Deploy &gt; New deployment</strong> (top-right blue button).</li>
                  <li>Click the gear icon next to <em>Select type</em> and pick <strong>Web app</strong>.</li>
                  <li>
                    Set <strong>Execute as</strong> to <strong>Me</strong>, and <strong>Who has access</strong> to <strong>Anyone</strong> (critical!).
                  </li>
                  <li>Click <strong>Deploy</strong>, grant permissions (Advanced &gt; Go to Untitled project).</li>
                  <li>Copy the <strong>Web app URL</strong> (ends with <code>/exec</code>) and paste it into this app!</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-900">Google Apps Script Code (Code.gs):</span>
                  <button
                    onClick={copyAppsScript}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                  >
                    {hasCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed select-all">
                  {appsScriptCode}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-800">Sheet Tabs Structure:</div>
                <p>
                  <strong>“Data” Tab:</strong> Columns: <code className="font-mono">Timestamp, Date, Type, Category, Amount, Note</code>
                </p>
                <p>
                  <strong>“Settings” Tab:</strong> Column A: <code className="font-mono">Income Categories</code>, Column B: <code className="font-mono">Expences Categories</code>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsGuideModalOpen(false);
                  setIsUrlModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Enter Web App URL</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
