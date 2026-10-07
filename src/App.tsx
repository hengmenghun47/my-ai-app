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
  Clock,
  Tag,
  FileText,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Download,
  Copy,
  Check,
  Code2,
  X,
  Calculator,
  RotateCcw,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Transaction {
  id: string | number;
  timestamp?: string;
  date: string;
  time?: string;
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
const TIMEZONE_DAUN_PENH = 'Asia/Phnom_Penh'; // Daun Penh, Phnom Penh, Cambodia (GMT+7)

const DEFAULT_APPS_SCRIPT_URL =
  (import.meta.env as { VITE_APPS_SCRIPT_URL?: string }).VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbyXTZlHhPAtOQR9UxT7olv_Y0aP_uXsLBs8hFcl1HUuJl_e7UTZe0HTcK9_Qv926qqR/exec';

const DEFAULT_CATEGORIES: CategoriesState = {
  income: [
    'Salary',
    'Freelance',
    'Business',
    'Investments',
    'Bonus',
    'Gifts',
    'Other Income'
  ],
  expense: [
    'Transportation',
    'Health & Wellness',
    'Housing & Utilities',
    'Food & Dining',
    'Groceries',
    'Coffee & Drinks',
    'Shopping',
    'Entertainment',
    'Education',
    'Other Expense'
  ]
};

// Default demonstration records matching the user's reference interface
const DEFAULT_DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-10-07', time: '10:15:30', timestamp: '2026-10-07 10:15:30', type: 'Expense', category: 'Transportation', amount: 125.0, note: 'Vehicle fuel and maintenance' },
  { id: '2', date: '2026-10-07', time: '09:20:10', timestamp: '2026-10-07 09:20:10', type: 'Expense', category: 'Health & Wellness', amount: 10.0, note: 'Pharmacy supplies' },
  { id: '3', date: '2026-10-06', time: '18:45:00', timestamp: '2026-10-06 18:45:00', type: 'Income', category: 'Salary', amount: 500.0, note: 'First half salary' },
  { id: '4', date: '2026-10-05', time: '14:30:20', timestamp: '2026-10-05 14:30:20', type: 'Income', category: 'Freelance', amount: 200.0, note: 'Website design project' },
  { id: '5', date: '2026-10-04', time: '11:10:00', timestamp: '2026-10-04 11:10:00', type: 'Income', category: 'Bonus', amount: 50.0, note: 'Performance reward' },
  { id: '6', date: '2026-10-03', time: '16:00:15', timestamp: '2026-10-03 16:00:15', type: 'Income', category: 'Investments', amount: 10.0, note: 'Dividend return' },
  { id: '7', date: '2026-10-02', time: '08:00:00', timestamp: '2026-10-02 08:00:00', type: 'Expense', category: 'Housing & Utilities', amount: 0.0, note: 'Meter check' }
];

export interface DaunPenhDateTimeInfo {
  dateYMD: string; // "2026-10-07"
  timeHMS: string; // "10:15:30"
  time12: string; // "10:15:30 AM"
  dayMonthYear: string; // "07-Oct-2026"
  timestampFull: string; // "2026-10-07 10:15:30"
}

// Calculates exact live time in Daun Penh (GMT+7)
export function getDaunPenhNow(targetDate?: Date): DaunPenhDateTimeInfo {
  const d = targetDate || new Date();
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_DAUN_PENH,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = dtf.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = partMap.year || '2026';
  const month = partMap.month || '10';
  const day = partMap.day || '07';
  const hour24 = parseInt(partMap.hour || '0', 10);
  const minute = partMap.minute || '00';
  const second = partMap.second || '00';

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIndex = parseInt(month, 10) - 1;
  const monthName = monthNames[mIndex] || month;

  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  const hour12Str = String(hour12).padStart(2, '0');

  const dateYMD = `${year}-${month}-${day}`;
  const timeHMS = `${partMap.hour}:${minute}:${second}`;
  const time12 = `${hour12Str}:${minute}:${second} ${ampm}`;
  const dayMonthYear = `${day}-${monthName}-${year}`;
  const timestampFull = `${dateYMD} ${timeHMS}`;

  return { dateYMD, timeHMS, time12, dayMonthYear, timestampFull };
}

// Formats date into Day-Month-Year (e.g. 07-Oct-2026) and time
function formatToDaunPenhDisplay(dateStr?: string, timestampStr?: string, timeStr?: string): {
  dayMonthYear: string;
  actualTime: string;
} {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (timestampStr && timestampStr.trim()) {
    const s = timestampStr.trim().replace(' ', 'T');
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const [, yr, mo, da, hr, mn, sc] = match;
      const mName = monthNames[parseInt(mo, 10) - 1] || mo;
      const h24 = parseInt(hr, 10);
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = String(h24 % 12 || 12).padStart(2, '0');
      return {
        dayMonthYear: `${da}-${mName}-${yr}`,
        actualTime: `${h12}:${mn}:${sc || '00'} ${ampm}`
      };
    }
  }

  if (dateStr && dateStr.trim()) {
    const dMatch = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dMatch) {
      const [, yr, mo, da] = dMatch;
      const mName = monthNames[parseInt(mo, 10) - 1] || mo;
      const dayMonthYear = `${da}-${mName}-${yr}`;

      if (timeStr && timeStr.trim()) {
        const tMatch = timeStr.trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
        if (tMatch) {
          const [, hr, mn, sc] = tMatch;
          const h24 = parseInt(hr, 10);
          const ampm = h24 >= 12 ? 'PM' : 'AM';
          const h12 = String(h24 % 12 || 12).padStart(2, '0');
          return {
            dayMonthYear,
            actualTime: `${h12}:${mn}:${sc || '00'} ${ampm}`
          };
        }
      }
      return { dayMonthYear, actualTime: timeStr || '' };
    }
  }

  return {
    dayMonthYear: dateStr || '—',
    actualTime: timeStr || timestampStr || ''
  };
}

// Formats amounts in USD ($)
function formatMoney(val: number): string {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function App() {
  // Script URL & Config
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_APPS_SCRIPT_URL;
  });
  const [inputUrl, setInputUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_APPS_SCRIPT_URL;
  });
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Live Daun Penh (GMT+7) Time
  const [liveDaunPenh, setLiveDaunPenh] = useState<DaunPenhDateTimeInfo>(() => getDaunPenhNow());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDaunPenh(getDaunPenhNow());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data
  const [categories, setCategories] = useState<CategoriesState>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_DEMO_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form State
  const [txType, setTxType] = useState<'Expense' | 'Income'>('Expense');
  const [txDate, setTxDate] = useState<string>(() => getDaunPenhNow().dateYMD);
  const [txCategory, setTxCategory] = useState<string>('Transportation');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txNote, setTxNote] = useState<string>('');

  // Search & Filter for main history table
  const [filterType, setFilterType] = useState<'All' | 'Expense' | 'Income'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);

  // =========================================================================
  // DATE RANGE CALCULATOR STATE ("Calculate income or expense from ... to ...")
  // =========================================================================
  const [calcStartDate, setCalcStartDate] = useState<string>(() => {
    const now = getDaunPenhNow();
    const [yr, mo] = now.dateYMD.split('-');
    return `${yr}-${mo}-01`; // Start of current month
  });
  const [calcEndDate, setCalcEndDate] = useState<string>(() => getDaunPenhNow().dateYMD);
  const [calcTypeFilter, setCalcTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationSummary, setCalculationSummary] = useState<string>('Showing data for current month');

  // Sync Category when Type changes
  useEffect(() => {
    const list = txType === 'Income' ? categories.income : categories.expense;
    if (list.length > 0 && (!txCategory || !list.includes(txCategory))) {
      setTxCategory(list[0]);
    }
  }, [txType, categories]);

  // Initial Fetch from Google Sheet
  useEffect(() => {
    const urlToUse = scriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (urlToUse) {
      fetchSheetData(urlToUse);
    } else {
      setIsDemoMode(true);
      setTransactions(DEFAULT_DEMO_TRANSACTIONS);
    }
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Fetch from Google Apps Script
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
        if (Array.isArray(data.records) && data.records.length > 0) {
          setTransactions(data.records.reverse());
        }
        setIsDemoMode(false);
        showToast('Google Sheet data synced successfully!', 'success');
      } else {
        throw new Error(data.message || 'Sheet returned error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Sync notice:', msg);
      if (transactions.length === 0) {
        setTransactions(DEFAULT_DEMO_TRANSACTIONS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Form Submit: Auto-captures time via Daun Penh (GMT+7)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(txAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter an amount greater than 0', 'error');
      return;
    }

    const cleanNote = txNote.trim(); // Pure note text without any "$"
    const dpNow = getDaunPenhNow();
    const capturedDate = txDate || dpNow.dateYMD;
    const capturedTime = dpNow.timeHMS;
    const capturedTimestamp = `${capturedDate} ${capturedTime}`;

    const newRecord: Transaction = {
      id: Date.now().toString(),
      date: capturedDate,
      time: capturedTime,
      timestamp: capturedTimestamp,
      type: txType,
      category: txCategory || (txType === 'Income' ? 'Other Income' : 'Other Expense'),
      amount: parsedAmount,
      note: cleanNote
    };

    setIsSubmitting(true);

    if (isDemoMode || !scriptUrl) {
      setTimeout(() => {
        setTransactions((prev) => [newRecord, ...prev]);
        setTxAmount('');
        setTxNote('');
        setIsSubmitting(false);
        showToast(`Saved locally (Auto-captured at ${dpNow.time12} GMT+7)`, 'success');
      }, 300);
      return;
    }

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          date: newRecord.date,
          time: newRecord.time,
          timestamp: newRecord.timestamp,
          type: newRecord.type,
          category: newRecord.category,
          amount: newRecord.amount,
          note: cleanNote
        }),
        redirect: 'follow'
      });

      const res = await response.json();
      if (res.status === 'success') {
        setTransactions((prev) => [newRecord, ...prev]);
        setTxAmount('');
        setTxNote('');
        showToast(`Saved to Google Sheet at ${dpNow.time12} (Daun Penh GMT+7)!`, 'success');
      } else {
        throw new Error(res.message || 'Failed to save');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Submission fallback:', msg);
      setTransactions((prev) => [newRecord, ...prev]);
      setTxAmount('');
      setTxNote('');
      showToast(`Saved locally. Sheet notice: ${msg}`, 'error');
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

  // Overall Metrics
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
    const totalCashFlow = income + expense;
    const incomeRatio = totalCashFlow > 0 ? Math.round((income / totalCashFlow) * 100) : 50;
    const expenseRatio = totalCashFlow > 0 ? Math.round((expense / totalCashFlow) * 100) : 50;

    return {
      income,
      expense,
      net,
      countInc,
      countExp,
      totalCount: transactions.length,
      incomeRatio,
      expenseRatio
    };
  }, [transactions]);

  // Overall Top Expense Categories Ranked
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

  // Filtered List for main table
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      const matchType = filterType === 'All' || t.type === filterType;
      const formatted = formatToDaunPenhDisplay(t.date, t.timestamp, t.time);
      const matchSearch =
        !searchQuery ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.date.includes(searchQuery) ||
        formatted.dayMonthYear.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatted.actualTime.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [transactions, filterType, searchQuery]);

  // =========================================================================
  // DATE RANGE CALCULATOR COMPUTATIONS (from ... to ...)
  // =========================================================================
  const rangeFilteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const isAfterStart = !calcStartDate || t.date >= calcStartDate;
      const isBeforeEnd = !calcEndDate || t.date <= calcEndDate;
      const matchesType = calcTypeFilter === 'All' || t.type === calcTypeFilter;
      return isAfterStart && isBeforeEnd && matchesType;
    });
  }, [transactions, calcStartDate, calcEndDate, calcTypeFilter]);

  const rangeMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let countInc = 0;
    let countExp = 0;

    rangeFilteredTransactions.forEach((t) => {
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
    const totalFlow = income + expense;
    const incomeRatio = totalFlow > 0 ? Math.round((income / totalFlow) * 100) : 0;
    const expenseRatio = totalFlow > 0 ? Math.round((expense / totalFlow) * 100) : 0;

    // Expense Categories in this specific range
    const expCatMap: Record<string, number> = {};
    rangeFilteredTransactions
      .filter((t) => t.type === 'Expense')
      .forEach((t) => {
        const amt = Number(t.amount) || 0;
        expCatMap[t.category] = (expCatMap[t.category] || 0) + amt;
      });

    const topExpenseCategories = Object.entries(expCatMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // Income Categories in this specific range
    const incCatMap: Record<string, number> = {};
    rangeFilteredTransactions
      .filter((t) => t.type === 'Income')
      .forEach((t) => {
        const amt = Number(t.amount) || 0;
        incCatMap[t.category] = (incCatMap[t.category] || 0) + amt;
      });

    const topIncomeCategories = Object.entries(incCatMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    return {
      income,
      expense,
      net,
      countInc,
      countExp,
      totalCount: rangeFilteredTransactions.length,
      incomeRatio,
      expenseRatio,
      topExpenseCategories,
      topIncomeCategories
    };
  }, [rangeFilteredTransactions]);

  // Track calculated summary for the user
  const [lastCalculatedInfo, setLastCalculatedInfo] = useState<{
    fromText: string;
    toText: string;
    income: number;
    expense: number;
    net: number;
    count: number;
    countInc: number;
    countExp: number;
    calculatedAt: string;
  } | null>(null);

  // Handle Calculate button click
  const handleCalculateData = () => {
    setIsCalculating(true);
    const dpNow = getDaunPenhNow();
    setTimeout(() => {
      setIsCalculating(false);
      const fromText = calcStartDate ? formatToDaunPenhDisplay(calcStartDate).dayMonthYear : 'Beginning of Records';
      const toText = calcEndDate ? formatToDaunPenhDisplay(calcEndDate).dayMonthYear : 'Today';
      
      setLastCalculatedInfo({
        fromText,
        toText,
        income: rangeMetrics.income,
        expense: rangeMetrics.expense,
        net: rangeMetrics.net,
        count: rangeMetrics.totalCount,
        countInc: rangeMetrics.countInc,
        countExp: rangeMetrics.countExp,
        calculatedAt: dpNow.time12
      });

      setCalculationSummary(`Calculated data from ${fromText} to ${toText}`);
      showToast(`Calculation complete: Net ${formatMoney(rangeMetrics.net)} (Income: +${formatMoney(rangeMetrics.income)}, Expenses: -${formatMoney(rangeMetrics.expense)})`, 'success');
    }, 280);
  };

  // Quick Preset Handlers
  const applyRangePreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'this_year' | 'all') => {
    const now = getDaunPenhNow();
    const todayYMD = now.dateYMD;

    let newStart = '';
    let newEnd = todayYMD;

    if (preset === 'today') {
      newStart = todayYMD;
      newEnd = todayYMD;
    } else if (preset === 'this_week') {
      const curr = new Date();
      const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1))); // Monday
      newStart = firstDay.toISOString().split('T')[0];
      newEnd = todayYMD;
    } else if (preset === 'this_month') {
      const [yr, mo] = todayYMD.split('-');
      newStart = `${yr}-${mo}-01`;
      newEnd = todayYMD;
    } else if (preset === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      newStart = d.toISOString().split('T')[0];
      newEnd = todayYMD;
    } else if (preset === 'this_year') {
      const [yr] = todayYMD.split('-');
      newStart = `${yr}-01-01`;
      newEnd = todayYMD;
    } else if (preset === 'all') {
      newStart = '';
      newEnd = '';
    }

    setCalcStartDate(newStart);
    setCalcEndDate(newEnd);

    // Auto-calculate for user convenience on preset click
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      const fromText = newStart ? formatToDaunPenhDisplay(newStart).dayMonthYear : 'All Time';
      const toText = newEnd ? formatToDaunPenhDisplay(newEnd).dayMonthYear : 'Today';
      setCalculationSummary(`Calculated: ${fromText} to ${toText}`);
    }, 200);
  };

  // CSV Export for main ledger
  const exportCSV = () => {
    if (transactions.length === 0) {
      showToast('No records to export', 'info');
      return;
    }
    const headers = ['Timestamp', 'Date (Day Month Year)', 'Actual Time (Daun Penh GMT+7)', 'Type', 'Category', 'Amount', 'Note'];
    const rows = transactions.map((t) => {
      const dt = formatToDaunPenhDisplay(t.date, t.timestamp, t.time);
      return [
        `"${t.timestamp || ''}"`,
        `"${dt.dayMonthYear}"`,
        `"${dt.actualTime}"`,
        `"${t.type}"`,
        `"${t.category}"`,
        t.amount,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Income_Expense_DaunPenh_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded CSV Ledger!', 'success');
  };

  // Export Range CSV
  const exportRangeCSV = () => {
    if (rangeFilteredTransactions.length === 0) {
      showToast('No records in this date range to export', 'info');
      return;
    }
    const headers = ['Timestamp', 'Date (Day Month Year)', 'Actual Time', 'Type', 'Category', 'Amount', 'Note'];
    const rows = rangeFilteredTransactions.map((t) => {
      const dt = formatToDaunPenhDisplay(t.date, t.timestamp, t.time);
      return [
        `"${t.timestamp || ''}"`,
        `"${dt.dayMonthYear}"`,
        `"${dt.actualTime}"`,
        `"${t.type}"`,
        `"${t.category}"`,
        t.amount,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Calculation_${calcStartDate || 'start'}_to_${calcEndDate || 'end'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded Date Range Report!', 'success');
  };

  // Apps Script Code
  const appsScriptCode = `/**
 * Google Apps Script for Personal Income & Expense Tracker
 * Sheet ID: ${GOOGLE_SHEET_ID}
 * Timezone: Asia/Phnom_Penh (Daun Penh, GMT+7)
 */

const SPREADSHEET_ID = "${GOOGLE_SHEET_ID}";
const SHEET_DATA_NAME = "Data";
const SHEET_SETTINGS_NAME = "Settings";
const TIMEZONE = "Asia/Phnom_Penh"; // Daun Penh, Phnom Penh, Cambodia (GMT+7)

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    ensureSheetsInitialized(ss);

    // Read Settings
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

    if (incomeCategories.length === 0) incomeCategories = ["Salary", "Freelance", "Investments", "Bonus", "Gifts", "Other Income"];
    if (expenseCategories.length === 0) expenseCategories = ["Transportation", "Health & Wellness", "Housing & Utilities", "Food & Dining", "Groceries", "Coffee & Drinks", "Shopping", "Entertainment", "Healthcare", "Education", "Other Expense"];

    // Read Data Records
    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const lastRowData = dataSheet.getLastRow();
    const records = [];

    if (lastRowData > 1) {
      const vals = dataSheet.getRange(2, 1, lastRowData - 1, 6).getValues();
      for (let i = 0; i < vals.length; i++) {
        const row = vals[i];
        if (!row[1] && !row[2] && !row[4]) continue;

        let formattedTimestamp = "";
        if (row[0] instanceof Date) {
          formattedTimestamp = Utilities.formatDate(row[0], TIMEZONE, "yyyy-MM-dd HH:mm:ss");
        } else {
          formattedTimestamp = String(row[0] || "");
        }

        let formattedDate = "";
        if (row[1] instanceof Date) {
          formattedDate = Utilities.formatDate(row[1], TIMEZONE, "yyyy-MM-dd");
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
      sheetId: SPREADSHEET_ID,
      categories: { income: incomeCategories, expense: expenseCategories },
      records: records,
      totalRecords: records.length
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
      try { data = JSON.parse(e.postData.contents); } catch (ex) { data = e.parameter || {}; }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const now = new Date();
    const date = data.date || Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
    const type = (data.type && String(data.type).toLowerCase() === "income") ? "Income" : "Expense";
    const category = String(data.category || (type === "Income" ? "Other Income" : "Other Expense")).trim();
    const amount = parseFloat(data.amount);
    const note = String(data.note || "").trim(); // Pure note without any "$" sign

    if (isNaN(amount) || amount <= 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid amount." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
    const formattedTimestamp = data.timestamp || Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    // Columns: Timestamp, Date, Type, Category, Amount, Note
    dataSheet.appendRow([
      formattedTimestamp,
      date,
      type,
      category,
      amount,
      note
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Row appended successfully in Daun Penh (GMT+7) time",
      record: { timestamp: formattedTimestamp, date: date, type: type, category: category, amount: amount, note: note }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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
    const dInc = ["Salary", "Freelance", "Investments", "Bonus", "Gifts", "Other Income"];
    const dExp = ["Transportation", "Health & Wellness", "Housing & Utilities", "Food & Dining", "Groceries", "Coffee & Drinks", "Shopping", "Entertainment", "Healthcare", "Education", "Other Expense"];
    const max = Math.max(dInc.length, dExp.length);
    for (let i = 0; i < max; i++) {
      settingsSheet.appendRow([dInc[i] || "", dExp[i] || ""]);
    }
  }
}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-emerald-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-80 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  Income & Expense Tracker
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.2 rounded-md border ${
                    isDemoMode
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  Google Sheet Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Sheet ID: <code className="font-mono text-slate-600 font-semibold">{GOOGLE_SHEET_ID}</code>
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Sync Button */}
            <button
              onClick={() => fetchSheetData()}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Sync Sheet"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Apps Script Settings */}
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Settings & Code"
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">

        {/* 1. TOP NET BALANCE HERO CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                NET BALANCE · សមតុល្យសរុប
              </span>
              <div
                className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                  metrics.net >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {metrics.net < 0 ? '-' : ''}
                {formatMoney(Math.abs(metrics.net))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                <span>Based on {metrics.totalCount} transactions in your Google Sheet</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-mono font-medium">Daun Penh {liveDaunPenh.time12}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Income Card */}
              <div className="bg-[#ecfdf5] border border-emerald-200/80 rounded-2xl p-4 min-w-[150px] sm:min-w-[170px]">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                  <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                  <span>Income · ចំណូល</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-700">
                  +{formatMoney(metrics.income)}
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  {metrics.countInc} entries
                </div>
              </div>

              {/* Expense Card */}
              <div className="bg-[#fff1f2] border border-rose-200/80 rounded-2xl p-4 min-w-[150px] sm:min-w-[170px]">
                <div className="flex items-center gap-1.5 text-rose-700 text-xs font-semibold mb-1">
                  <div className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <span>Expense · ចំណាយ</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-700">
                  -{formatMoney(metrics.expense)}
                </div>
                <div className="text-xs text-rose-600 mt-0.5">
                  {metrics.countExp} entries
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE SECTION: ADD TRANSACTION (LEFT) & RATIO / CATEGORIES (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ADD TRANSACTION CARD (5 cols) */}
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
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    txType === 'Expense'
                      ? 'bg-[#e11d48] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Expense (ចំណាយ)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('Income')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    txType === 'Income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
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
                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
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

              {/* Date & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-500">
                      Date · កាលបរិច្ឆេទ
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-slate-800"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{formatToDaunPenhDisplay(txDate).dayMonthYear}</span>
                    <span className="text-emerald-700 font-mono font-medium">Time: Auto (GMT+7)</span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Category · ប្រភេទ
                  </label>
                  <select
                    required
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 truncate"
                  >
                    {(txType === 'Income' ? categories.income : categories.expense).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note / Description (NO $ SIGN!) */}
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
                className="w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Saving to Google Sheet...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>Save {txType === 'Income' ? 'Income' : 'Expense'} Entry</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* CASH FLOW RATIO & TOP CATEGORIES (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Cash Flow Ratio Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Cash Flow Ratio</h3>
                <span className="text-xs text-slate-400">ចំណូល vs ចំណាយ</span>
              </div>

              <div className="space-y-4">
                {/* Income Ratio */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-700">Income (+{formatMoney(metrics.income)})</span>
                    <span className="text-slate-400 font-mono">{metrics.incomeRatio}%</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10b981] rounded-full transition-all duration-500"
                      style={{ width: `${metrics.incomeRatio}%` }}
                    />
                  </div>
                </div>

                {/* Expense Ratio */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-700">Expenses (-{formatMoney(metrics.expense)})</span>
                    <span className="text-slate-400 font-mono">{metrics.expenseRatio}%</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f43f5e] rounded-full transition-all duration-500"
                      style={{ width: `${metrics.expenseRatio}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Expense Categories Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">
                  Top Expense Categories · ការចំណាយតាមប្រភេទ
                </h3>
                <span className="text-xs text-slate-400">Ranked</span>
              </div>

              <div className="space-y-4">
                {categoryStats.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No expenses recorded yet.</div>
                ) : (
                  categoryStats.slice(0, 5).map((cat) => {
                    const pct = metrics.expense > 0 ? Math.round((cat.total / metrics.expense) * 100) : 0;
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{cat.name}</span>
                          <span className="font-mono text-slate-900">
                            <span className="font-bold">{formatMoney(cat.total)}</span>{' '}
                            <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1e293b] rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
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
              <h2 className="font-bold text-base text-slate-900">
                Transaction History · ប្រវត្តិប្រតិបត្តិការ
              </h2>
              <p className="text-xs text-slate-400">
                Synced directly with Google Sheet "Data" tab
              </p>
            </div>

            {/* Filter buttons & Export icon */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                {(['All', 'Expense', 'Income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === t
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Download CSV */}
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
                    const dt = formatToDaunPenhDisplay(tx.date, tx.timestamp, tx.time);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        {/* Date with Day-Month-Year and Time */}
                        <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{dt.dayMonthYear}</div>
                          {dt.actualTime && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span>{dt.actualTime}</span>
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isInc ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isInc ? '↑ Income' : '↓ Expense'}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {tx.category}
                        </td>

                        {/* Note (NO $ sign!) */}
                        <td className="py-3.5 px-3 text-slate-500 max-w-xs truncate">
                          {tx.note || '—'}
                        </td>

                        {/* Amount */}
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

        {/* ================================================================= */}
        {/* 4. DATE RANGE CALCULATOR WITH EXPLICIT "CALCULATE" BUTTON */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>Calculate by Selected Date</span>
                  <span className="text-xs font-normal text-slate-400">· គណនាតាមកាលបរិច្ឆេទ</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select your date range and type to view calculated income, expenses, and net balance
                </p>
              </div>
            </div>

            {/* Quick Export button for Date Range */}
            <button
              onClick={exportRangeCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
              title="Download Range Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Range CSV</span>
            </button>
          </div>

          {/* DATE RANGE FILTER CONTROLS */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
              {/* From Date (4 cols) */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  From Date · ចាប់ពីកាលបរិច្ឆេទ
                </label>
                <input
                  type="date"
                  value={calcStartDate}
                  onChange={(e) => setCalcStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-slate-800"
                />
                {calcStartDate && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {formatToDaunPenhDisplay(calcStartDate).dayMonthYear}
                  </p>
                )}
              </div>

              {/* To Date (4 cols) */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  To Date · ដល់កាលបរិច្ឆេទ
                </label>
                <input
                  type="date"
                  value={calcEndDate}
                  onChange={(e) => setCalcEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-slate-800"
                />
                {calcEndDate && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {formatToDaunPenhDisplay(calcEndDate).dayMonthYear}
                  </p>
                )}
              </div>

              {/* Resized Type Switcher (4 cols - spacious with ample room for All / Income / Expense) */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Type · ប្រភេទ
                </label>
                <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs">
                  {(['All', 'Income', 'Expense'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCalcTypeFilter(t)}
                      className={`flex-1 py-2 px-3 rounded-lg text-center transition-all cursor-pointer text-xs font-semibold whitespace-nowrap ${
                        calcTypeFilter === t
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Presets Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/70 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyRangePreset('today')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200/80 border border-slate-200 rounded-lg text-[11px] text-slate-700 transition-colors cursor-pointer font-medium"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('this_week')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200/80 border border-slate-200 rounded-lg text-[11px] text-slate-700 transition-colors cursor-pointer font-medium"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('this_month')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200/80 border border-slate-200 rounded-lg text-[11px] text-slate-700 transition-colors cursor-pointer font-medium"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('last_30_days')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200/80 border border-slate-200 rounded-lg text-[11px] text-slate-700 transition-colors cursor-pointer font-medium"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('this_year')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200/80 border border-slate-200 rounded-lg text-[11px] text-slate-700 transition-colors cursor-pointer font-medium"
                >
                  This Year
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('all')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200/80 border border-slate-200 rounded-lg text-[11px] text-slate-700 transition-colors cursor-pointer font-medium"
                >
                  All Time
                </button>
              </div>

              {/* Reset to All */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyRangePreset('all')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Range</span>
                </button>
              </div>
            </div>
          </div>

          {/* CALCULATION STATUS & RESULTS BANNER */}
          <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                  {calcTypeFilter === 'Income' && (
                    <span>
                      Total Income Earned: <strong className="text-emerald-700">+{formatMoney(rangeMetrics.income)}</strong>
                    </span>
                  )}
                  {calcTypeFilter === 'Expense' && (
                    <span>
                      Total Expenses Spent: <strong className="text-rose-700">-{formatMoney(rangeMetrics.expense)}</strong>
                    </span>
                  )}
                  {calcTypeFilter === 'All' && (
                    <span>
                      Calculated Net Balance: <strong className={rangeMetrics.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{rangeMetrics.net >= 0 ? '+' : '-'}{formatMoney(Math.abs(rangeMetrics.net))}</strong>
                    </span>
                  )}
                  <span className="text-[10px] font-normal text-slate-500 font-mono">
                    ({calcStartDate ? formatToDaunPenhDisplay(calcStartDate).dayMonthYear : 'Beginning'} → {calcEndDate ? formatToDaunPenhDisplay(calcEndDate).dayMonthYear : 'Today'})
                  </span>
                </p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  {calcTypeFilter === 'Income' && (
                    <span>Found <strong>{rangeMetrics.countInc}</strong> income transactions earned in this period</span>
                  )}
                  {calcTypeFilter === 'Expense' && (
                    <span>Found <strong>{rangeMetrics.countExp}</strong> expense transactions spent in this period</span>
                  )}
                  {calcTypeFilter === 'All' && (
                    <span>Found <strong>{rangeMetrics.totalCount}</strong> transactions: <strong>+{formatMoney(rangeMetrics.income)}</strong> earned ({rangeMetrics.countInc} entries) and <strong>-{formatMoney(rangeMetrics.expense)}</strong> spent ({rangeMetrics.countExp} entries)</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="text-[11px] font-mono text-emerald-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                Daun Penh (GMT+7)
              </span>
            </div>
          </div>

          {/* DYNAMIC CALCULATED RESULTS CARDS */}
          {calcTypeFilter === 'Income' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hero Total Earned */}
              <div className="bg-[#ecfdf5] border-2 border-emerald-400 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-emerald-800">
                  <span className="font-bold uppercase tracking-wider">Total Amount Earned · ចំណូលសរុប</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200 font-mono text-emerald-800">
                    {rangeMetrics.countInc} entries
                  </span>
                </div>
                <div className="my-2 text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">
                  +{formatMoney(rangeMetrics.income)}
                </div>
                <p className="text-[11px] text-emerald-800">
                  Total money earned between {calcStartDate ? formatToDaunPenhDisplay(calcStartDate).dayMonthYear : 'beginning'} and {calcEndDate ? formatToDaunPenhDisplay(calcEndDate).dayMonthYear : 'today'}
                </p>
              </div>

              {/* Average per Income Record */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Average per Income Record</span>
                  <span className="text-slate-400 font-mono">Avg</span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  +{formatMoney(rangeMetrics.countInc > 0 ? rangeMetrics.income / rangeMetrics.countInc : 0)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Average amount across {rangeMetrics.countInc} income entries
                </p>
              </div>

              {/* Top Income Source */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Top Income Source</span>
                  <span className="text-emerald-600 font-semibold text-[11px]">Rank 1</span>
                </div>
                <div className="my-2 text-xl sm:text-2xl font-black text-emerald-700 truncate">
                  {rangeMetrics.topIncomeCategories[0]?.name || 'No records'}
                </div>
                <p className="text-[11px] text-slate-500">
                  {rangeMetrics.topIncomeCategories[0]
                    ? `+${formatMoney(rangeMetrics.topIncomeCategories[0].total)} (${Math.round((rangeMetrics.topIncomeCategories[0].total / (rangeMetrics.income || 1)) * 100)}% of income)`
                    : 'No income categories in this range'}
                </p>
              </div>
            </div>
          )}

          {calcTypeFilter === 'Expense' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hero Total Spent */}
              <div className="bg-[#fff1f2] border-2 border-rose-400 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-rose-800">
                  <span className="font-bold uppercase tracking-wider">Total Amount Spent · ការចំណាយសរុប</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded-md border border-rose-200 font-mono text-rose-800">
                    {rangeMetrics.countExp} entries
                  </span>
                </div>
                <div className="my-2 text-3xl sm:text-4xl font-black text-rose-700 tracking-tight">
                  -{formatMoney(rangeMetrics.expense)}
                </div>
                <p className="text-[11px] text-rose-800">
                  Total money spent between {calcStartDate ? formatToDaunPenhDisplay(calcStartDate).dayMonthYear : 'beginning'} and {calcEndDate ? formatToDaunPenhDisplay(calcEndDate).dayMonthYear : 'today'}
                </p>
              </div>

              {/* Average per Expense Record */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Average per Expense Record</span>
                  <span className="text-slate-400 font-mono">Avg</span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  -{formatMoney(rangeMetrics.countExp > 0 ? rangeMetrics.expense / rangeMetrics.countExp : 0)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Average amount across {rangeMetrics.countExp} expense entries
                </p>
              </div>

              {/* Top Expense Category */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Top Spending Category</span>
                  <span className="text-rose-600 font-semibold text-[11px]">Rank 1</span>
                </div>
                <div className="my-2 text-xl sm:text-2xl font-black text-rose-700 truncate">
                  {rangeMetrics.topExpenseCategories[0]?.name || 'No records'}
                </div>
                <p className="text-[11px] text-slate-500">
                  {rangeMetrics.topExpenseCategories[0]
                    ? `-${formatMoney(rangeMetrics.topExpenseCategories[0].total)} (${Math.round((rangeMetrics.topExpenseCategories[0].total / (rangeMetrics.expense || 1)) * 100)}% of expenses)`
                    : 'No expense categories in this range'}
                </p>
              </div>
            </div>
          )}

          {calcTypeFilter === 'All' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Selected Range Net Balance */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Calculated Net Balance</span>
                  <span className="font-mono">{rangeMetrics.totalCount} entries</span>
                </div>
                <div className="my-2">
                  <div
                    className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      rangeMetrics.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {rangeMetrics.net < 0 ? '-' : ''}
                    {formatMoney(Math.abs(rangeMetrics.net))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Net cash flow for the selected date range
                </p>
              </div>

              {/* Selected Range Income */}
              <div className="bg-[#ecfdf5] border border-emerald-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-emerald-800">
                  <span className="font-semibold uppercase tracking-wider">Total Earned (Income)</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {rangeMetrics.countInc} entries
                  </span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-emerald-700">
                  +{formatMoney(rangeMetrics.income)}
                </div>
                <p className="text-[11px] text-emerald-700">
                  {rangeMetrics.incomeRatio}% of cash flow in this period
                </p>
              </div>

              {/* Selected Range Expenses */}
              <div className="bg-[#fff1f2] border border-rose-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-rose-800">
                  <span className="font-semibold uppercase tracking-wider">Total Spent (Expenses)</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded-md border border-rose-200">
                    {rangeMetrics.countExp} entries
                  </span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-rose-700">
                  -{formatMoney(rangeMetrics.expense)}
                </div>
                <p className="text-[11px] text-rose-700">
                  {rangeMetrics.expenseRatio}% of cash flow in this period
                </p>
              </div>
            </div>
          )}

          {/* CATEGORIES BREAKDOWN & TRANSACTIONS IN SELECTED RANGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
            
            {/* Top Categories in this Range (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  {calcTypeFilter === 'Income'
                    ? 'Income by Category in Range · ចំណូល'
                    : calcTypeFilter === 'Expense'
                    ? 'Spending by Category in Range · ចំណាយ'
                    : 'Categories Breakdown in Range'}
                </h4>
                <span className="text-[11px] text-slate-400">Ranked</span>
              </div>

              {calcTypeFilter === 'Income' ? (
                rangeMetrics.topIncomeCategories.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No income records in this date range.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rangeMetrics.topIncomeCategories.map((cat) => {
                      const pct = rangeMetrics.income > 0 ? Math.round((cat.total / rangeMetrics.income) * 100) : 0;
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{cat.name}</span>
                            <span className="font-mono text-emerald-700">
                              <strong>+{formatMoney(cat.total)}</strong>{' '}
                              <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                rangeMetrics.topExpenseCategories.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No expense records in this date range.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rangeMetrics.topExpenseCategories.map((cat) => {
                      const pct = rangeMetrics.expense > 0 ? Math.round((cat.total / rangeMetrics.expense) * 100) : 0;
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{cat.name}</span>
                            <span className="font-mono text-rose-700">
                              <strong>-{formatMoney(cat.total)}</strong>{' '}
                              <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Transactions in Range Table (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Calculated Transactions List ({rangeFilteredTransactions.length})
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  {calcStartDate || 'All'} → {calcEndDate || 'Today'}
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                      <th className="pb-2 px-2">Date</th>
                      <th className="pb-2 px-2">Type</th>
                      <th className="pb-2 px-2">Category</th>
                      <th className="pb-2 px-2">Note</th>
                      <th className="pb-2 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rangeFilteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No transactions found for the selected date range.
                        </td>
                      </tr>
                    ) : (
                      rangeFilteredTransactions.map((tx) => {
                        const isInc = tx.type === 'Income';
                        const dt = formatToDaunPenhDisplay(tx.date, tx.timestamp, tx.time);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-2 font-mono text-slate-600 whitespace-nowrap">
                              {dt.dayMonthYear}
                            </td>
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              <span className={`font-semibold ${isInc ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isInc ? '↑' : '↓'} {tx.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 font-medium text-slate-800 whitespace-nowrap">
                              {tx.category}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 max-w-[150px] truncate">
                              {tx.note || '—'}
                            </td>
                            <td
                              className={`py-2.5 px-2 text-right font-mono font-bold whitespace-nowrap ${
                                isInc ? 'text-emerald-600' : 'text-slate-900'
                              }`}
                            >
                              {isInc ? '+' : '-'}{formatMoney(Number(tx.amount))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* MODAL: APPS SCRIPT CODE & SETTINGS */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Google Apps Script & Web App URL</h3>
                  <p className="text-xs text-slate-500">Configured with Daun Penh (GMT+7) timezone</p>
                </div>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Web App URL</h4>
                <p className="text-slate-500 mb-3 text-xs">
                  Paste the deployment URL from Google Apps Script below:
                </p>
                <form onSubmit={handleSaveUrl} className="space-y-3">
                  <input
                    type="url"
                    required
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Must end with <code className="font-bold text-slate-600">/exec</code>
                    </span>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Save & Re-sync
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">How to Deploy in 4 Easy Steps:</h4>
                <ol className="list-decimal pl-5 space-y-2 text-slate-600 leading-relaxed">
                  <li>
                    Open your Google Sheet:{' '}
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 font-semibold underline"
                    >
                      Open Google Sheet ↗
                    </a>
                  </li>
                  <li>Click <strong>Extensions &gt; Apps Script</strong> in the Google Sheet top menu.</li>
                  <li>Paste the code below, replacing all existing code in <code>Code.gs</code>.</li>
                  <li>
                    Click blue <strong>Deploy &gt; New deployment</strong>, select <strong>Web app</strong>, set{' '}
                    <strong>Who has access: Anyone</strong>, click Deploy, and copy the Web App URL!
                  </li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">Google Apps Script Code (Code.gs)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(appsScriptCode);
                      setHasCopiedCode(true);
                      setTimeout(() => setHasCopiedCode(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs text-slate-700 transition-colors cursor-pointer"
                  >
                    {hasCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-56">
                  {appsScriptCode}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
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
