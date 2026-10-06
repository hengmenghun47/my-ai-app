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
    // 1. Check if an environment variable configuration exists from Vercel deployment first
    const envUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    
    if (envUrl) {
      setScriptUrl(envUrl);
      setInputUrl(envUrl);
      fetchSheetData(envUrl);
    } else {
      // 2. Fall back to manual browser storage if environment token isn't set up yet
      const savedUrl = localStorage.getItem(STORAGE_KEY_URL);
      if (savedUrl) {
        setScriptUrl(savedUrl);
        setInputUrl(savedUrl);
        fetchSheetData(savedUrl);
      } else {
        // First visit with no configurations: Show setup prompt modal
        setIsUrlModalOpen(true);
        setTransactions(DEMO_TRANSACTIONS);
        setIsDemoMode(true);
      }
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
      console.warn('Submit error:', errMsg);
      showToast(`Submission failed: ${errMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // The rest of your return JSX rendering context goes below...
  return (
    <div>
      {/* App Component UI Elements */}
    </div>
  );
}
