/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Tag,
  FileText,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Settings,
  Download,
  Copy,
  Check,
  Code2,
  X
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
const DEFAULT_APPS_SCRIPT_URL =
  (import.meta.env as { VITE_APPS_SCRIPT_URL?: string }).VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbyXTZlHhPAtOQR9UxT7olv_Y0aP_uXsLBs8hFcl1HUuJl_e7UTZe0HTcK9_Qv926qqR/exec';

const DEFAULT_CATEGORIES: CategoriesState = {
  income: [
    'Salary (ប្រាក់ខែ)',
    'Freelance (ការងារក្រៅ)',
    'Business (អាជីវកម្ម)',
    'Investments',
    'Bonus',
    'Gifts',
    'Other Income'
  ],
  expense: [
    'Food & Dining (ម្ហូបអាហារ)',
    'Groceries (ផ្សារ)',
    'Coffee & Drinks (កាហ្វេ)',
    'Rent & Housing (ថ្លៃផ្ទះ)',
    'Utilities (ទឹក/ភ្លើង/Wifi)',
    'Transportation (ការធ្វើដំណើរ)',
    'Shopping (ទិញឥវ៉ាន់)',
    'Entertainment (កម្សាន្ត)',
    'Healthcare (សុខភាព)',
    'Education (ការសិក្សា)',
    'Other Expense'
  ]
};

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-10-06', type: 'Expense', category: 'Coffee & Drinks (កាហ្វេ)', amount: 2.5, note: 'Amazon Cafe latte', timestamp: '2026-10-06 08:30:00' },
  { id: '2', date: '2026-10-05', type: 'Expense', category: 'Food & Dining (ម្ហូបអាហារ)', amount: 12.5, note: 'Dinner with friends', timestamp: '2026-10-05 19:40:00' },
  { id: '3', date: '2026-10-04', type: 'Income', category: 'Freelance (ការងារក្រៅ)', amount: 350.0, note: 'Website design project', timestamp: '2026-10-04 15:10:00' },
  { id: '4', date: '2026-10-03', type: 'Expense', category: 'Groceries (ផ្សារ)', amount: 18.0, note: 'Supermarket groceries', timestamp: '2026-10-03 11:20:00' },
  { id: '5', date: '2026-10-02', type: 'Expense', category: 'Rent & Housing (ថ្លៃផ្ទះ)', amount: 250.0, note: 'Monthly room lease', timestamp: '2026-10-02 09:00:00' },
  { id: '6', date: '2026-10-01', type: 'Income', category: 'Salary (ប្រាក់ខែ)', amount: 1200.0, note: 'October payroll', timestamp: '2026-10-01 08:00:00' }
];

export default function App() {
  // Config & State
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_APPS_SCRIPT_URL;
  });
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_APPS_SCRIPT_URL;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Data
  const [categories, setCategories] = useState<CategoriesState>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form State
  const [txType, setTxType] = useState<'Expense' | 'Income'>('Expense');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState<string>('');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txNote, setTxNote] = useState<string>('');

  // Filter & Search
  const [filterType, setFilterType] = useState<'All' | 'Expense' | 'Income'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);

  // On Mount: Load data from Google Sheet
  useEffect(() => {
    const urlToUse = scriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (urlToUse) {
      fetchSheetData(urlToUse);
    } else {
      setIsDemoMode(true);
      setTransactions(DEMO_TRANSACTIONS);
    }
  }, []);

  // Sync Category when Type changes
  useEffect(() => {
    const list = txType === 'Income' ? categories.income : categories.expense;
    if (list.length > 0 && (!txCategory || !list.includes(txCategory))) {
      setTxCategory(list[0]);
    }
  }, [txType, categories]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Format currency value cleanly in $ USD
  const formatMoney = (val: number) => {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch Data from Google Apps Script
  const fetchSheetData = async (targetUrl = scriptUrl) => {
    if (!targetUrl) {
      setIsUrlModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
        showToast('Google Sheet synced successfully!', 'success');
      } else {
        throw new Error(data.message || 'Sheet returned error response');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Sync notice:', msg);
      showToast(`Sync Notice: ${msg}`, 'error');
      if (transactions.length === 0) {
        setTransactions(DEMO_TRANSACTIONS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter an amount greater than 0', 'error');
      return;
    }

    const newRecord: Transaction = {
      id: Date.now().toString(),
      date: txDate,
      type: txType,
      category: txCategory || (txType === 'Income' ? 'Other Income' : 'Other Expense'),
      amount: parsedAmount,
      note: txNote.trim(), // Pure note text without any currency signs
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    setIsSubmitting(true);

    if (isDemoMode || !scriptUrl) {
      setTimeout(() => {
        setTransactions((prev) => [newRecord, ...prev]);
        setTxAmount('');
        setTxNote('');
        setIsSubmitting(false);
        showToast('Saved locally in Demo Mode.', 'success');
      }, 350);
      return;
    }

    try {
      // Send with text/plain to avoid CORS preflight OPTIONS rejection in Google Apps Script
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          date: newRecord.date,
          type: newRecord.type,
          category: newRecord.category,
          amount: newRecord.amount,
          note: newRecord.note // Exact note without any "$" sign
        }),
        redirect: 'follow'
      });

      const res = await response.json();
      if (res.status === 'success') {
        setTransactions((prev) => [newRecord, ...prev]);
        setTxAmount('');
        setTxNote('');
        showToast('Saved directly to your Google Sheet!', 'success');
      } else {
        throw new Error(res.message || 'Failed to save');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Submission notice:', msg);
      setTransactions((prev) => [newRecord, ...prev]);
      setTxAmount('');
      setTxNote('');
      showToast(`Saved locally. Sheet sync notice: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Script URL
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

  // Metrics
  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let countInc = 0;
    let countExp = 0;

    transactions.forEach((t) => {
      const val = Number(t.amount) || 0;
      if (t.type === 'Income') {
        income += val;
        countInc++;
      } else {
        expense += val;
        countExp++;
      }
    });

    const net = income - expense;
    return { income, expense, net, countInc, countExp };
  }, [transactions]);

  // Category breakdown for expenses
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'Expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });

    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Filtered transactions
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      const matchType = filterType === 'All' || t.type === filterType;
      const matchSearch =
        !searchQuery ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.date.includes(searchQuery);
      return matchType && matchSearch;
    });
  }, [transactions, filterType, searchQuery]);

  // Export to CSV
  const exportCSV = () => {
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
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Income_Expense_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded CSV ledger file!', 'success');
  };

  // Apps Script Code
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

        let dateStr = row[1] instanceof Date 
          ? Utilities.formatDate(row[1], Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd") 
          : String(row[1] || "");

        records.push({
          id: i + 1,
          timestamp: String(row[0] || ""),
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
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid amount." })).setMimeType(ContentService.MimeType.JSON);
    }

    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const now = new Date();
    dataSheet.appendRow([now, date, type, category, amount, note]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Row added successfully"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureSheetsInitialized(ss) {
  let dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!dataSheet) dataSheet = ss.insertSheet(SHEET_DATA_NAME);
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow(["Timestamp", "Date", "Type", "Category", "Amount", "Note"]);
  }

  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS_NAME);
  if (!settingsSheet) settingsSheet = ss.insertSheet(SHEET_SETTINGS_NAME);
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(["Income Categories", "Expences Categories"]);
  }
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setHasCopiedCode(true);
    showToast('Apps Script code copied to clipboard!', 'success');
    setTimeout(() => setHasCopiedCode(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] font-sans antialiased selection:bg-emerald-100 flex flex-col">
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-medium border animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-1 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP CLEAN NAVIGATION */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900">LedgerSheet</span>
                {isDemoMode ? (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.2 rounded-md">
                    Demo
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sheet Synced
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Connected to Google Sheet: <span className="font-mono text-slate-600 font-semibold">{GOOGLE_SHEET_ID.substring(0, 6)}...</span>
              </p>
            </div>
          </div>

          {/* Controls: Actions & Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync Button */}
            <button
              onClick={() => fetchSheetData()}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Sync with Google Sheet"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Setup / Settings Drawer Trigger */}
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Google Apps Script Setup"
            >
              <Code2 className="w-4 h-4" />
            </button>

            {/* URL Modal */}
            <button
              onClick={() => setIsUrlModalOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Configure Web App URL"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* 1. BALANCE HERO CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* Total Balance */}
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Net Balance · សមតុល្យសរុប
              </span>
              <div
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  metrics.net >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {metrics.net < 0 ? '-' : ''}
                {formatMoney(Math.abs(metrics.net))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Based on {transactions.length} transactions in your Google Sheet
              </p>
            </div>

            {/* Income & Expense Mini-Cards */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Income */}
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 min-w-[140px] sm:min-w-[160px]">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                  <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                  <span>Income · ចំណូល</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-700">
                  +{formatMoney(metrics.income)}
                </div>
                <div className="text-[11px] text-emerald-600/80 mt-0.5">{metrics.countInc} entries</div>
              </div>

              {/* Expense */}
              <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 min-w-[140px] sm:min-w-[160px]">
                <div className="flex items-center gap-1.5 text-rose-700 text-xs font-semibold mb-1">
                  <div className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <span>Expense · ចំណាយ</span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-rose-700">
                  -{formatMoney(metrics.expense)}
                </div>
                <div className="text-[11px] text-rose-600/80 mt-0.5">{metrics.countExp} entries</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MAIN WORKSPACE: FORM + EXPENSES BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* NEW TRANSACTION FORM (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-base text-slate-900">Add Transaction</h2>
                <p className="text-xs text-slate-400">បញ្ចូលចំណូល ឬ ចំណាយ</p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                $ USD
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTxType('Expense')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txType === 'Expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Expense (ចំណាយ)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('Income')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    txType === 'Income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Income (ចំណូល)
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Amount · ចំនួនទឹកប្រាក់ ($)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-base">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 text-base font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                  />
                </div>
                {/* Quick amount chips */}
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <span className="text-[11px] text-slate-400">Quick:</span>
                  {[5, 10, 20, 50, 100].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setTxAmount(q.toString())}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                    >
                      +${q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Date · កាលបរិច្ឆេទ
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Category · ប្រភេទ
                  </label>
                  <select
                    required
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 truncate"
                  >
                    {(txType === 'Income' ? categories.income : categories.expense).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note / Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Note / Description · ចំណាំ
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch with team, Fuel, Internet..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Google Sheet...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Save {txType === 'Income' ? 'Income' : 'Expense'} Entry</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* SPENDING BREAKDOWN & RATIO (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Cash Ratio Progress */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Cash Flow Ratio</h3>
                <span className="text-xs text-slate-400">ចំណូល vs ចំណាយ</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-700">Income (+{formatMoney(metrics.income)})</span>
                    <span className="text-slate-400">
                      {metrics.income + metrics.expense > 0
                        ? Math.round((metrics.income / (metrics.income + metrics.expense)) * 100)
                        : 50}
                      %
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          metrics.income + metrics.expense > 0
                            ? Math.round((metrics.income / (metrics.income + metrics.expense)) * 100)
                            : 50
                        }%`
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-700">Expenses (-{formatMoney(metrics.expense)})</span>
                    <span className="text-slate-400">
                      {metrics.income + metrics.expense > 0
                        ? Math.round((metrics.expense / (metrics.income + metrics.expense)) * 100)
                        : 50}
                      %
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          metrics.income + metrics.expense > 0
                            ? Math.round((metrics.expense / (metrics.income + metrics.expense)) * 100)
                            : 50
                        }%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Categories Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Top Expense Categories · ការចំណាយតាមប្រភេទ</h3>
                <span className="text-xs text-slate-400">Ranked</span>
              </div>

              <div className="space-y-3">
                {categoryStats.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No expense data yet.</div>
                ) : (
                  categoryStats.slice(0, 5).map((cat) => {
                    const pct = metrics.expense > 0 ? Math.round((cat.total / metrics.expense) * 100) : 0;
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{cat.name}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatMoney(cat.total)} <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-700 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. TRANSACTION HISTORY TABLE */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-base text-slate-900">Transaction History · ប្រវត្តិប្រតិបត្តិការ</h2>
              <p className="text-xs text-slate-400">Synced directly with Google Sheet "Data" tab</p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              {/* Type filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                {(['All', 'Expense', 'Income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Export */}
              <button
                onClick={exportCSV}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by note, category, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                  <th className="pb-2.5 px-3">Date</th>
                  <th className="pb-2.5 px-3">Type</th>
                  <th className="pb-2.5 px-3">Category</th>
                  <th className="pb-2.5 px-3">Note</th>
                  <th className="pb-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No transactions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((tx) => {
                    const isInc = tx.type === 'Income';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`font-semibold ${isInc ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isInc ? '↑ Income' : '↓ Expense'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{tx.category}</td>
                        <td className="py-3.5 px-3 text-slate-500 max-w-xs truncate">{tx.note || '—'}</td>
                        <td
                          className={`py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isInc ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {isInc ? '+' : '-'}
                          {formatMoney(Number(tx.amount))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Google Sheet ID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{GOOGLE_SHEET_ID}</code>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
            >
              Apps Script Code & Setup
            </button>
            <a
              href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline inline-flex items-center gap-1"
            >
              Open Google Sheet
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* MODAL: URL CONFIGURATION */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Google Apps Script URL</h3>
              <button onClick={() => setIsUrlModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Enter the Web App URL deployed from your Google Sheet (ends with{' '}
              <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">/exec</code>).
            </p>

            <form onSubmit={handleSaveUrl} className="space-y-4">
              <div>
                <input
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDemoMode(true);
                    setIsUrlModalOpen(false);
                    showToast('Using Demo Mode', 'info');
                  }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Demo Mode
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPS SCRIPT SETUP GUIDE */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Google Apps Script Setup</h3>
                <p className="text-xs text-slate-400">Step-by-step instructions for your sheet</p>
              </div>
              <button onClick={() => setIsScriptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs text-slate-600">
              <ol className="list-decimal list-inside space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <li>
                  Open your Google Sheet:{' '}
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 underline font-semibold"
                  >
                    Open Sheet
                  </a>
                </li>
                <li>
                  Click <strong>Extensions &gt; Apps Script</strong>.
                </li>
                <li>
                  Paste the script below into <code>Code.gs</code>.
                </li>
                <li>
                  Click <strong>Deploy &gt; New deployment</strong> &gt; Select <strong>Web app</strong>.
                </li>
                <li>
                  Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong> (required!).
                </li>
                <li>Click <strong>Deploy</strong>, grant permissions, and copy the Web App URL.</li>
              </ol>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800">Apps Script Backend Code:</span>
                  <button
                    onClick={copyScript}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {hasCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed select-all">
                  {appsScriptCode}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
