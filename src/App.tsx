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
  Sparkles,
  Moon,
  Sun,
  Coffee,
  Wifi,
  Store,
  Monitor,
  AlertTriangle,
  Link2,
  CheckCircle2
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

export type BusinessType = 'កាហ្វេចុងភូមិ' | 'ពូអុក Internet';

export const BUSINESS_CONFIG: Record<
  BusinessType,
  {
    name: BusinessType;
    shortLabel: string;
    subtitleKhmer: string;
    sheetName: string;
    categories: CategoriesState;
  }
> = {
  'កាហ្វេចុងភូមិ': {
    name: 'កាហ្វេចុងភូមិ',
    shortLabel: 'Coffee Shop',
    subtitleKhmer: 'សាខាហាងកាហ្វេ · Coffee Shop Branch',
    sheetName: 'កាហ្វេចុងភូមិ',
    categories: {
      income: [
        'Coffee Sales (លក់កាហ្វេ)',
        'Drinks (លក់ភេសជ្ជៈ)',
        'Food/Bakery (លក់នំ/អាហារ)',
        'Takeaway Orders (កម្ម៉ង់ខ្ចប់)',
        'Other Income (ចំណូលផ្សេងៗ)'
      ],
      expense: [
        'Coffee Beans & Milk (គ្រាប់កាហ្វេ និង ទឹកដោះគោ)',
        'Syrup & Ingredients (គ្រឿងផ្សំ/ស្ករ/តែ)',
        'Cups & Straws (កែវ និង ទុយោ)',
        'Ice & Water (ទឹកកក និង ទឹក)',
        'Utilities & Electricity (ភ្លើង និង ទឹក)',
        'Rent (ថ្លៃជួលតូប)',
        'Staff Salary (ប្រាក់ខែបុគ្គលិក)',
        'Equipment Maintenance (ជួសជុលម៉ាស៊ីន)',
        'Other Expense (ចំណាយផ្សេងៗ)'
      ]
    }
  },
  'ពូអុក Internet': {
    name: 'ពូអុក Internet',
    shortLabel: 'Internet Cafe',
    subtitleKhmer: 'សាខាសេវាអ៊ីនធឺណិត · Internet & Cyber Cafe Branch',
    sheetName: 'ពូអុក Internet',
    categories: {
      income: [
        'Internet Hours (ម៉ោងអ៊ីនធឺណិត)',
        'Gaming Services (សេវាហ្គេម)',
        'Printing & Photocopy (ព្រីន និង ថតចម្លង)',
        'Drinks & Snacks (ភេសជ្ជៈ និង នំ)',
        'Card Top-up (កាតទូរស័ព្ទ)',
        'Computer Repair (ជួសជុលកុំព្យូទ័រ)',
        'Other Income (ចំណូលផ្សេងៗ)'
      ],
      expense: [
        'ISP Internet Bill (ថ្លៃអ៊ីនធឺណិតប្រចាំខែ)',
        'Electricity Bill (ថ្លៃភ្លើង)',
        'Computer Hardware & Upgrades (គ្រឿងបន្លាស់កុំព្យូទ័រ)',
        'Air Conditioner & Fans (ម៉ាស៊ីនត្រជាក់/កង្ហារ)',
        'Rent (ថ្លៃជួលទីតាំង)',
        'Staff Salary (ប្រាក់ខែបុគ្គលិក)',
        'Drinks/Snacks Stock (ទិញឥវ៉ាន់លក់)',
        'Network Equipment & Cables (ខ្សែ និង ប្រព័ន្ធណេត)',
        'Other Expense (ចំណាយផ្សេងៗ)'
      ]
    }
  }
};

export const DEFAULT_SHEET_ID_CAFE = '1748vpezYkZU7ZflHUHgNvdefcswgm7bpAN-WS8MrumM';
export const STORAGE_KEY_SHEET_ID_CAFE = 'ledger_sheet_id_cafe_v5';
export const STORAGE_KEY_SHEET_ID_INTERNET = 'ledger_sheet_id_internet_v5';
export const STORAGE_KEY_URL_CAFE = 'ledger_script_url_cafe_v5';
export const STORAGE_KEY_URL_INTERNET = 'ledger_script_url_internet_v5';
export const STORAGE_KEY_URL = 'ledger_google_apps_script_url';
export const STORAGE_KEY_ACTIVE_BUSINESS = 'ledger_active_business_v4';

// Helper to extract clean spreadsheet ID from full URL or raw ID
export function extractSpreadsheetId(input?: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

const GOOGLE_SHEET_ID = DEFAULT_SHEET_ID_CAFE;

const getStorageKeyForBusiness = (biz: BusinessType) => {
  return biz === 'កាហ្វេចុងភូមិ' ? 'ledger_cached_txs_cafe_v4' : 'ledger_cached_txs_internet_v4';
};

const getCategoriesKeyForBusiness = (biz: BusinessType) => {
  return biz === 'កាហ្វេចុងភូមិ' ? 'ledger_cached_cats_cafe_v4' : 'ledger_cached_cats_internet_v4';
};

const TIMEZONE_DAUN_PENH = 'Asia/Phnom_Penh'; // Daun Penh, Phnom Penh, Cambodia (GMT+7)

const DEFAULT_APPS_SCRIPT_URL =
  (import.meta.env as { VITE_APPS_SCRIPT_URL?: string }).VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbyXTZlHhPAtOQR9UxT7olv_Y0aP_uXsLBs8hFcl1HUuJl_e7UTZe0HTcK9_Qv926qqR/exec';

const DEFAULT_CATEGORIES: CategoriesState = BUSINESS_CONFIG['កាហ្វេចុងភូមិ'].categories;

// Default empty transactions list - records are loaded directly from your Google Sheet
const DEFAULT_DEMO_TRANSACTIONS: Transaction[] = [];

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

// Normalizes any raw date string (including Google Sheets Date string "Sun Oct 04 2026...") to "YYYY-MM-DD"
export function normalizeDateToYMD(rawDate?: string | Date | null): string {
  if (!rawDate) return '';
  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return '';
    return getDaunPenhNow(rawDate).dateYMD;
  }
  const str = String(rawDate).trim();
  if (!str) return '';

  // 1. Direct YYYY-MM-DD match
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  // 2. Parseable Date strings (e.g. "Sun Oct 04 2026 00:00:00 GMT+0700 (Indochina Time)")
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    try {
      const dtf = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE_DAUN_PENH,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = dtf.formatToParts(parsed);
      const partMap: Record<string, string> = {};
      parts.forEach((p) => {
        partMap[p.type] = p.value;
      });
      if (partMap.year && partMap.month && partMap.day) {
        return `${partMap.year}-${partMap.month}-${partMap.day}`;
      }
    } catch {
      const yr = parsed.getFullYear();
      const mo = String(parsed.getMonth() + 1).padStart(2, '0');
      const da = String(parsed.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    }
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY format
  const slashMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (slashMatch) {
    const [, p1, p2, yr] = slashMatch;
    return `${yr}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
  }

  return str;
}

// Robust type normalization for English & Khmer
export function normalizeTransactionType(rawType?: string): 'Income' | 'Expense' {
  if (!rawType) return 'Expense';
  const str = String(rawType).trim().toLowerCase();
  if (
    str === 'income' ||
    str === 'incomes' ||
    str === 'ចំណូល' ||
    str.includes('income') ||
    str.includes('ចំណូល')
  ) {
    return 'Income';
  }
  return 'Expense';
}

// Formats date into Day-Month-Year (e.g. 07-Oct-2026) and time
function formatToDaunPenhDisplay(dateStr?: string, timestampStr?: string, timeStr?: string): {
  dayMonthYear: string;
  actualTime: string;
} {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Extract actual time
  let actualTime = '—';
  if (timeStr && timeStr.trim()) {
    const tMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (tMatch) {
      const [, hr, mn, sc] = tMatch;
      const h24 = parseInt(hr, 10);
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = String(h24 % 12 || 12).padStart(2, '0');
      actualTime = `${h12}:${mn}:${sc || '00'} ${ampm}`;
    } else {
      actualTime = timeStr.trim();
    }
  } else if (timestampStr && timestampStr.trim()) {
    const tsMatch = timestampStr.trim().match(/(?:T|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (tsMatch) {
      const [, hr, mn, sc] = tsMatch;
      const h24 = parseInt(hr, 10);
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = String(h24 % 12 || 12).padStart(2, '0');
      actualTime = `${h12}:${mn}:${sc || '00'} ${ampm}`;
    }
  }

  // Extract dayMonthYear via robust normalizer
  const ymd = normalizeDateToYMD(dateStr || timestampStr);
  if (ymd) {
    const parts = ymd.split('-');
    if (parts.length === 3) {
      const [yr, mo, da] = parts;
      const mName = monthNames[parseInt(mo, 10) - 1] || mo;
      return {
        dayMonthYear: `${da}-${mName}-${yr}`,
        actualTime
      };
    }
  }

  return {
    dayMonthYear: dateStr || '—',
    actualTime
  };
}

// Formats amounts in USD ($)
function formatMoney(val: number): string {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function App() {
  // Individual Google Sheet ID and Web App URL configurations per business
  const [sheetIdCafe, setSheetIdCafe] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_SHEET_ID_CAFE) || DEFAULT_SHEET_ID_CAFE;
  });
  const [sheetIdInternet, setSheetIdInternet] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_SHEET_ID_INTERNET) || '';
  });
  const [scriptUrlCafe, setScriptUrlCafe] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL_CAFE) || localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_APPS_SCRIPT_URL;
  });
  const [scriptUrlInternet, setScriptUrlInternet] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_URL_INTERNET) || '';
  });

  const [isScriptModalOpen, setIsScriptModalOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Settings modal editable inputs
  const [settingsTab, setSettingsTab] = useState<'sheets' | 'code'>('sheets');
  const [inputSheetIdCafe, setInputSheetIdCafe] = useState<string>(() => sheetIdCafe);
  const [inputSheetIdInternet, setInputSheetIdInternet] = useState<string>(() => sheetIdInternet);
  const [inputUrlCafe, setInputUrlCafe] = useState<string>(() => scriptUrlCafe);
  const [inputUrlInternet, setInputUrlInternet] = useState<string>(() => scriptUrlInternet);

  // Connection testing states
  const [isTestingUrl, setIsTestingUrl] = useState<'cafe' | 'internet' | null>(null);
  const [testResult, setTestResult] = useState<{ target: 'cafe' | 'internet'; success: boolean; message: string } | null>(null);

  const testConnection = async (target: 'cafe' | 'internet') => {
    setIsTestingUrl(target);
    setTestResult(null);
    const urlToTest = (target === 'cafe' ? inputUrlCafe : inputUrlInternet).trim();
    if (!urlToTest) {
      setTestResult({ target, success: false, message: 'សូមបញ្ចូល Google Apps Script Web App URL ជាមុនសិន (Please enter a Web App URL first).' });
      setIsTestingUrl(null);
      return;
    }
    try {
      const res = await fetch(urlToTest, { method: 'GET', redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === 'success') {
        const count = Array.isArray(data.records) ? data.records.length : 0;
        setTestResult({
          target,
          success: true,
          message: `ភ្ជាប់បានជោគជ័យ! (Connected successfully!) បានរកឃើញ ${count} កំណត់ត្រា (records) ក្នុង Google Sheet នេះ។`
        });
      } else {
        setTestResult({ target, success: false, message: data.message || 'Script returned an error.' });
      }
    } catch (err) {
      setTestResult({
        target,
        success: false,
        message: `បរាជ័យក្នុងការភ្ជាប់ (Connection failed): ${err instanceof Error ? err.message : String(err)}. សូមពិនិត្យមើល Web App ថាបានកំណត់ "Who has access: Anyone" រួចរាល់ហើយឬនៅ។`
      });
    } finally {
      setIsTestingUrl(null);
    }
  };

  // Theme State (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Live Daun Penh (GMT+7) Time
  const [liveDaunPenh, setLiveDaunPenh] = useState<DaunPenhDateTimeInfo>(() => getDaunPenhNow());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDaunPenh(getDaunPenhNow());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Active Business Switcher ('កាហ្វេចុងភូមិ' or 'ពូអុក Internet')
  const [activeBusiness, setActiveBusiness] = useState<BusinessType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_BUSINESS);
    if (saved === 'កាហ្វេចុងភូមិ' || saved === 'ពូអុក Internet') return saved;
    return 'កាហ្វេចុងភូមិ';
  });

  // Active sheet info resolved from current business
  const isInternetConfigured = Boolean(sheetIdInternet.trim() || scriptUrlInternet.trim());
  const activeSheetId = activeBusiness === 'កាហ្វេចុងភូមិ' ? sheetIdCafe : (sheetIdInternet || '');
  const activeScriptUrl = activeBusiness === 'កាហ្វេចុងភូមិ' ? scriptUrlCafe : (scriptUrlInternet || '');

  // Data - Cached per business from Google Sheet in localStorage
  const [categories, setCategories] = useState<CategoriesState>(() => {
    try {
      const savedBiz = (localStorage.getItem(STORAGE_KEY_ACTIVE_BUSINESS) as BusinessType) || 'កាហ្វេចុងភូមិ';
      const cached = localStorage.getItem(getCategoriesKeyForBusiness(savedBiz));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.income) && Array.isArray(parsed.expense)) {
          return parsed;
        }
      }
      return BUSINESS_CONFIG[savedBiz].categories;
    } catch (e) {
      console.warn('Error reading cached categories', e);
    }
    return BUSINESS_CONFIG['កាហ្វេចុងភូមិ'].categories;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const savedBiz = (localStorage.getItem(STORAGE_KEY_ACTIVE_BUSINESS) as BusinessType) || 'កាហ្វេចុងភូមិ';
      const cached = localStorage.getItem(getStorageKeyForBusiness(savedBiz));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      // Backward compatibility for cafe
      if (savedBiz === 'កាហ្វេចុងភូមិ') {
        const oldCached = localStorage.getItem('ledger_cached_transactions_v2');
        if (oldCached) {
          const parsed = JSON.parse(oldCached);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading cached transactions', e);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const savedBiz = (localStorage.getItem(STORAGE_KEY_ACTIVE_BUSINESS) as BusinessType) || 'កាហ្វេចុងភូមិ';
    const cached = localStorage.getItem(getStorageKeyForBusiness(savedBiz));
    return !cached;
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form State
  const [txType, setTxType] = useState<'Expense' | 'Income'>('Expense');
  const [txDate, setTxDate] = useState<string>(() => getDaunPenhNow().dateYMD);
  const [txCategory, setTxCategory] = useState<string>(() => {
    const savedBiz = (localStorage.getItem(STORAGE_KEY_ACTIVE_BUSINESS) as BusinessType) || 'កាហ្វេចុងភូមិ';
    return BUSINESS_CONFIG[savedBiz].categories.expense[0];
  });
  const [txAmount, setTxAmount] = useState<string>('');
  const [txNote, setTxNote] = useState<string>('');

  // Destination Sheet Options in Add Transaction form: allows storing to another sheet tab or another document
  const [destinationMode, setDestinationMode] = useState<'business' | 'custom'>('business');
  const [targetDestination, setTargetDestination] = useState<BusinessType>('កាហ្វេចុងភូមិ');
  const [customDestinationSheet, setCustomDestinationSheet] = useState<string>('');
  const [customDestinationSpreadsheetId, setCustomDestinationSpreadsheetId] = useState<string>('');

  // Sync destination branch default when activeBusiness switches
  useEffect(() => {
    setTargetDestination(activeBusiness);
  }, [activeBusiness]);

  // Search & Filter for main history table
  const [filterType, setFilterType] = useState<'All' | 'Expense' | 'Income'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);
  const [hasCopiedDedicatedCode, setHasCopiedDedicatedCode] = useState<boolean>(false);
  const [selectedCodeType, setSelectedCodeType] = useState<'dedicated' | 'master'>('dedicated');

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
  const [calculationSummary, setCalculationSummary] = useState<string>(() => `Showing data for ${activeBusiness}`);

  // Sync Category when Type changes or Categories change
  useEffect(() => {
    const list = txType === 'Income' ? categories.income : categories.expense;
    if (list.length > 0 && (!txCategory || !list.includes(txCategory))) {
      setTxCategory(list[0]);
    }
  }, [txType, categories]);

  // Initial Fetch from Google Sheet for the active business
  useEffect(() => {
    const urlToUse = activeBusiness === 'កាហ្វេចុងភូមិ' ? scriptUrlCafe : (scriptUrlInternet || scriptUrlCafe);
    if (urlToUse) {
      fetchSheetData(activeBusiness);
    } else {
      setIsDemoMode(true);
    }
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Switch between businesses ('កាហ្វេចុងភូមិ' <-> 'ពូអុក Internet')
  const handleSwitchBusiness = (newBiz: BusinessType) => {
    if (newBiz === activeBusiness) return;
    setActiveBusiness(newBiz);
    localStorage.setItem(STORAGE_KEY_ACTIVE_BUSINESS, newBiz);

    // 1. Immediately switch transactions from cache
    try {
      const cached = localStorage.getItem(getStorageKeyForBusiness(newBiz));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setTransactions(parsed);
        } else {
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } catch {
      setTransactions([]);
    }

    // 2. Immediately switch categories for the business
    try {
      const cachedCats = localStorage.getItem(getCategoriesKeyForBusiness(newBiz));
      if (cachedCats) {
        const parsed = JSON.parse(cachedCats);
        if (parsed?.income && parsed?.expense) {
          setCategories(parsed);
          setTxCategory(txType === 'Income' ? parsed.income[0] : parsed.expense[0]);
        } else {
          const defaultCats = BUSINESS_CONFIG[newBiz].categories;
          setCategories(defaultCats);
          setTxCategory(txType === 'Income' ? defaultCats.income[0] : defaultCats.expense[0]);
        }
      } else {
        const defaultCats = BUSINESS_CONFIG[newBiz].categories;
        setCategories(defaultCats);
        setTxCategory(txType === 'Income' ? defaultCats.income[0] : defaultCats.expense[0]);
      }
    } catch {
      const defaultCats = BUSINESS_CONFIG[newBiz].categories;
      setCategories(defaultCats);
      setTxCategory(txType === 'Income' ? defaultCats.income[0] : defaultCats.expense[0]);
    }

    // 3. Reset range calculator info
    setLastCalculatedInfo(null);
    setCalculationSummary(`Showing data for ${newBiz}`);

    // 4. Trigger live Google Sheet sync for the selected business using its dedicated sheet & script
    fetchSheetData(newBiz);
  };

  // Fetch from Google Apps Script scoped to business and sheet
  const fetchSheetData = async (
    targetBiz = activeBusiness,
    overrideUrl?: string,
    overrideSheetId?: string
  ) => {
    const isInternet = targetBiz === 'ពូអុក Internet';
    const targetUrl = overrideUrl || (isInternet ? scriptUrlInternet : scriptUrlCafe);
    const targetSsId = overrideSheetId || (isInternet ? sheetIdInternet : sheetIdCafe);

    // If Internet business is active but no separate script URL or sheet is set, do NOT query cafe script
    if (isInternet && !targetUrl) {
      return;
    }

    if (!targetUrl) {
      setIsScriptModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const sep = targetUrl.includes('?') ? '&' : '?';
      const fullUrl = `${targetUrl}${sep}business=${encodeURIComponent(targetBiz)}&sheet=${encodeURIComponent(targetBiz)}&spreadsheetId=${encodeURIComponent(targetSsId)}`;
      const response = await fetch(fullUrl, { method: 'GET', redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.status === 'success') {
        if (data.categories) {
          const newCats: CategoriesState = {
            income: data.categories.income?.length ? data.categories.income : BUSINESS_CONFIG[targetBiz].categories.income,
            expense: data.categories.expense?.length ? data.categories.expense : BUSINESS_CONFIG[targetBiz].categories.expense
          };
          setCategories(newCats);
          try {
            localStorage.setItem(getCategoriesKeyForBusiness(targetBiz), JSON.stringify(newCats));
          } catch (e) {
            console.warn('Storage save category error:', e);
          }
        }
        if (Array.isArray(data.records)) {
          const mapped: Transaction[] = data.records.map((r: any, idx: number) => {
            // Prioritize the actual captured timestamp in Daun Penh (GMT+7)
            const parsedYMD = normalizeDateToYMD(r.timestamp) || normalizeDateToYMD(r.date) || getDaunPenhNow().dateYMD;
            const normType = normalizeTransactionType(r.type);
            const dtInfo = formatToDaunPenhDisplay(parsedYMD, r.timestamp, r.time);
            return {
              id: String(r.id || idx + 1),
              date: parsedYMD,
              time: r.time || dtInfo.actualTime,
              timestamp: r.timestamp || `${parsedYMD} ${r.time || ''}`,
              type: normType,
              category: String(r.category || (normType === 'Income' ? 'Other' : 'Other Expense')).trim(),
              amount: typeof r.amount === 'number' ? r.amount : parseFloat(r.amount) || 0,
              note: String(r.note || '')
            };
          });
          const finalRecords = mapped.reverse();
          setTransactions(finalRecords);
          try {
            localStorage.setItem(getStorageKeyForBusiness(targetBiz), JSON.stringify(finalRecords));
          } catch (e) {
            console.warn('Storage save transactions error:', e);
          }
        }
        setIsDemoMode(false);
        showToast(`Synced [${targetBiz}] sheet successfully!`, 'success');
      } else {
        throw new Error(data.message || 'Sheet returned error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Sync notice:', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Form Submit: Auto-captures time via Daun Penh (GMT+7) and saves to active or chosen destination sheet
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

    // Target destination resolution: supports sending this transaction to another sheet tab or document!
    const effectiveBiz: BusinessType = destinationMode === 'custom' ? activeBusiness : targetDestination;
    const effectiveSheetName: string = destinationMode === 'custom'
      ? (customDestinationSheet.trim() || activeBusiness)
      : targetDestination;
    const isInternetTarget = effectiveBiz === 'ពូអុក Internet';
    const effectiveSpreadsheetId: string = destinationMode === 'custom' && customDestinationSpreadsheetId.trim()
      ? extractSpreadsheetId(customDestinationSpreadsheetId.trim())
      : (isInternetTarget ? sheetIdInternet : sheetIdCafe);
    const effectiveScriptUrl: string = isInternetTarget ? scriptUrlInternet : scriptUrlCafe;

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

    // If saving to ពូអុក Internet and no separate Web App URL is connected yet:
    if (isInternetTarget && !effectiveScriptUrl) {
      setTimeout(() => {
        setTransactions((prev) => {
          const updated = [newRecord, ...prev];
          try {
            localStorage.setItem(getStorageKeyForBusiness(effectiveBiz), JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setTxAmount('');
        setTxNote('');
        setIsSubmitting(false);
        showToast('រក្សាទុកក្នុងម៉ាស៊ីន (Saved locally). សូមភ្ជាប់ Google Sheet របស់ ពូអុក Internet ក្នុង Settings (</>) ដើម្បីរក្សាទុកលើ Sheet ថ្មី!', 'info');
      }, 300);
      return;
    }

    if (isDemoMode || !effectiveScriptUrl) {
      setTimeout(() => {
        setTransactions((prev) => {
          const updated = [newRecord, ...prev];
          try {
            localStorage.setItem(getStorageKeyForBusiness(effectiveBiz), JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setTxAmount('');
        setTxNote('');
        setIsSubmitting(false);
        showToast(`Saved locally for [${effectiveSheetName}] at ${dpNow.time12} GMT+7`, 'success');
      }, 300);
      return;
    }

    try {
      const response = await fetch(effectiveScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          business: effectiveBiz,
          sheet: effectiveSheetName,
          sheetName: effectiveSheetName,
          spreadsheetId: effectiveSpreadsheetId,
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
        setTransactions((prev) => {
          const updated = [newRecord, ...prev];
          try {
            localStorage.setItem(getStorageKeyForBusiness(effectiveBiz), JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setTxAmount('');
        setTxNote('');
        showToast(`Saved to sheet [${effectiveSheetName}] in Google Spreadsheet at ${dpNow.time12}!`, 'success');
      } else {
        throw new Error(res.message || 'Failed to save');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Submission fallback:', msg);
      setTransactions((prev) => {
        const updated = [newRecord, ...prev];
        try {
          localStorage.setItem(getStorageKeyForBusiness(effectiveBiz), JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setTxAmount('');
      setTxNote('');
      showToast(`Saved locally for [${effectiveSheetName}]. Sheet notice: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Settings for both sheets and Apps Script URLs
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdCafe = extractSpreadsheetId(inputSheetIdCafe);
    const cleanIdInternet = extractSpreadsheetId(inputSheetIdInternet);
    const cleanUrlCafe = inputUrlCafe.trim();
    const cleanUrlInternet = inputUrlInternet.trim();

    localStorage.setItem(STORAGE_KEY_SHEET_ID_CAFE, cleanIdCafe);
    localStorage.setItem(STORAGE_KEY_SHEET_ID_INTERNET, cleanIdInternet);
    localStorage.setItem(STORAGE_KEY_URL_CAFE, cleanUrlCafe);
    localStorage.setItem(STORAGE_KEY_URL_INTERNET, cleanUrlInternet);
    localStorage.setItem(STORAGE_KEY_URL, cleanUrlCafe); // fallback

    setSheetIdCafe(cleanIdCafe);
    setSheetIdInternet(cleanIdInternet);
    setScriptUrlCafe(cleanUrlCafe);
    setScriptUrlInternet(cleanUrlInternet);

    setIsScriptModalOpen(false);
    showToast('Saved Google Sheet connections successfully!', 'success');

    // Re-sync active business
    const targetUrl = activeBusiness === 'កាហ្វេចុងភូមិ' ? cleanUrlCafe : cleanUrlInternet;
    const targetSsId = activeBusiness === 'កាហ្វេចុងភូមិ' ? cleanIdCafe : cleanIdInternet;
    if (activeBusiness === 'កាហ្វេចុងភូមិ' || cleanUrlInternet) {
      fetchSheetData(activeBusiness, targetUrl, targetSsId);
    }
  };

  // Overall Metrics
  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let countInc = 0;
    let countExp = 0;

    transactions.forEach((t) => {
      const val = Number(t.amount) || 0;
      const normType = normalizeTransactionType(t.type);
      if (normType === 'Income') {
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
      .filter((t) => normalizeTransactionType(t.type) === 'Expense')
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
      const normType = normalizeTransactionType(t.type);
      const matchType = filterType === 'All' || normType === filterType;
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
      const txYMD = normalizeDateToYMD(t.timestamp) || normalizeDateToYMD(t.date);
      const isAfterStart = !calcStartDate || (txYMD ? txYMD >= calcStartDate : true);
      const isBeforeEnd = !calcEndDate || (txYMD ? txYMD <= calcEndDate : true);
      const normType = normalizeTransactionType(t.type);
      const matchesType = calcTypeFilter === 'All' || normType === calcTypeFilter;
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
      const normType = normalizeTransactionType(t.type);
      if (normType === 'Income') {
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
      .filter((t) => normalizeTransactionType(t.type) === 'Expense')
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
      .filter((t) => normalizeTransactionType(t.type) === 'Income')
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
    link.setAttribute('download', `Ledger_${activeBusiness === 'កាហ្វេចុងភូមិ' ? 'Cafe' : 'Internet'}_DaunPenh_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded CSV for [${activeBusiness}]!`, 'success');
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
    link.setAttribute('download', `Calculation_${activeBusiness === 'កាហ្វេចុងភូមិ' ? 'Cafe' : 'Internet'}_${calcStartDate || 'start'}_to_${calcEndDate || 'end'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded Date Range Report for [${activeBusiness}]!`, 'success');
  };

  // Apps Script Code (Supports 2 separate Google Spreadsheets & custom sheet tabs)
  const appsScriptCode = `/**
 * Google Apps Script for Multi-Business Ledger (Separate Google Sheets Support)
 * Branches: 
 *   1) កាហ្វេចុងភូមិ
 *   2) ពូអុក Internet
 * Timezone: Asia/Phnom_Penh (Daun Penh, GMT+7)
 */

// Spreadsheet ID for Cafe (កាហ្វេចុងភូមិ)
const SPREADSHEET_ID_CAFE = "${sheetIdCafe || DEFAULT_SHEET_ID_CAFE}";

// Spreadsheet ID for Internet (ពូអុក Internet) - Can be a completely separate Google Sheet document!
const SPREADSHEET_ID_INTERNET = "${sheetIdInternet || DEFAULT_SHEET_ID_CAFE}";

const BUSINESS_CAFE = "កាហ្វេចុងភូមិ";
const BUSINESS_INTERNET = "ពូអុក Internet";
const TIMEZONE = "Asia/Phnom_Penh"; // Daun Penh, Phnom Penh, Cambodia (GMT+7)

function getTargetSpreadsheet(requestedId, business) {
  let targetId = requestedId;
  if (!targetId || String(targetId).trim() === "") {
    if (business === BUSINESS_INTERNET && SPREADSHEET_ID_INTERNET) {
      targetId = SPREADSHEET_ID_INTERNET;
    } else {
      targetId = SPREADSHEET_ID_CAFE;
    }
  }
  return SpreadsheetApp.openById(targetId.trim());
}

function doGet(e) {
  try {
    let targetBusiness = BUSINESS_CAFE;
    let targetSheetName = BUSINESS_CAFE;
    let reqSpreadsheetId = "";

    if (e && e.parameter) {
      if (e.parameter.business) targetBusiness = e.parameter.business;
      if (e.parameter.sheet || e.parameter.sheetName) {
        targetSheetName = e.parameter.sheet || e.parameter.sheetName;
      } else {
        targetSheetName = targetBusiness;
      }
      if (e.parameter.spreadsheetId || e.parameter.sheetId) {
        reqSpreadsheetId = e.parameter.spreadsheetId || e.parameter.sheetId;
      }
    }

    const ss = getTargetSpreadsheet(reqSpreadsheetId, targetBusiness);
    const sheet = ss.getSheetByName(targetSheetName) || ensureSheetExists(ss, targetSheetName);
    const lastRow = sheet.getLastRow();
    const records = [];

    if (lastRow > 1) {
      const vals = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
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

    // Backward compatibility: If cafe sheet is empty, check legacy "Data" sheet
    if (records.length === 0 && (targetSheetName === BUSINESS_CAFE || targetSheetName === "Data")) {
      const oldSheet = ss.getSheetByName("Data");
      if (oldSheet && oldSheet.getLastRow() > 1) {
        const oldVals = oldSheet.getRange(2, 1, oldSheet.getLastRow() - 1, 6).getValues();
        for (let i = 0; i < oldVals.length; i++) {
          const row = oldVals[i];
          if (!row[1] && !row[2] && !row[4]) continue;
          records.push({
            id: i + 1,
            timestamp: row[0] instanceof Date ? Utilities.formatDate(row[0], TIMEZONE, "yyyy-MM-dd HH:mm:ss") : String(row[0] || ""),
            date: row[1] instanceof Date ? Utilities.formatDate(row[1], TIMEZONE, "yyyy-MM-dd") : String(row[1] || ""),
            type: String(row[2] || "Expense").trim(),
            category: String(row[3] || "Other").trim(),
            amount: parseFloat(row[4]) || 0,
            note: String(row[5] || "")
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      business: targetBusiness,
      sheet: targetSheetName,
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

    const business = data.business || data.sheet || BUSINESS_CAFE;
    const targetSheetName = data.sheetName || data.sheet || business;
    const reqSpreadsheetId = data.spreadsheetId || data.sheetId || "";

    // Open target Google Spreadsheet (can be separate file for each business!)
    const ss = getTargetSpreadsheet(reqSpreadsheetId, business);
    const targetSheet = ensureSheetExists(ss, targetSheetName);

    const now = new Date();
    const date = data.date || Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
    const type = (data.type && String(data.type).toLowerCase() === "income") ? "Income" : "Expense";
    const category = String(data.category || (type === "Income" ? "Other Income" : "Other Expense")).trim();
    const amount = parseFloat(data.amount);
    const note = String(data.note || "").trim();

    if (isNaN(amount) || amount <= 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid amount." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const formattedTimestamp = data.timestamp || Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    targetSheet.appendRow([
      formattedTimestamp,
      date,
      type,
      category,
      amount,
      note
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      business: business,
      sheet: targetSheetName,
      spreadsheetId: ss.getId(),
      message: "Row appended successfully to spreadsheet [" + ss.getName() + "], sheet [" + targetSheetName + "]",
      record: { timestamp: formattedTimestamp, date: date, type: type, category: category, amount: amount, note: note }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureSheetExists(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Date", "Type", "Category", "Amount", "Note"]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#F3F4F6");
  }
  return sheet;
}`;

  // Dedicated single-sheet script for Pou Ok Internet (Sheet 2)
  const appsScriptCodeDedicated = `/**
 * Google Apps Script for Pou Ok Internet (ពូអុក Internet)
 * Attach this directly to your new Google Sheet: Extensions > Apps Script
 */
const TIMEZONE_PHNOM_PENH = "Asia/Phnom_Penh";

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

        let formattedTimestamp = row[0] instanceof Date 
          ? Utilities.formatDate(row[0], TIMEZONE_PHNOM_PENH, "yyyy-MM-dd HH:mm:ss") 
          : String(row[0] || "");
        let formattedDate = row[1] instanceof Date 
          ? Utilities.formatDate(row[1], TIMEZONE_PHNOM_PENH, "yyyy-MM-dd") 
          : String(row[1] || "");

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

    sheet.appendRow([formattedTimestamp, date, type, category, amount, note]);

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
}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-100 dark:selection:bg-emerald-950 transition-colors duration-200">
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
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold shadow-xs border border-slate-800 dark:border-slate-700">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-moul text-sm sm:text-base text-slate-900 dark:text-white leading-normal pt-0.5 tracking-normal">
                  កម្មវិធីកត់ត្រាចំណូលចំណាយប្រចាំខែ
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                    isDemoMode
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  Google Sheet Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:flex items-center gap-1.5">
                <span>{activeBusiness} Sheet:</span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${activeSheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  title="Open this Google Sheet in a new tab"
                >
                  <span>{activeSheetId ? (activeSheetId.length > 20 ? activeSheetId.slice(0, 10) + '...' + activeSheetId.slice(-6) : activeSheetId) : 'Not configured'}</span>
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggle Button: Light <-> Dark */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs"
              title={theme === 'dark' ? 'Change to Light Theme' : 'Change to Dark Theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-300" />
                  <span className="font-semibold text-slate-200">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500 animate-in spin-in-90 duration-300" />
                  <span className="font-semibold text-slate-700">Dark</span>
                </>
              )}
            </button>

            {/* Sync Button */}
            <button
              onClick={() => fetchSheetData()}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Sync Sheet"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
            </button>

            {/* Apps Script Settings */}
            <button
              onClick={() => {
                setInputSheetIdCafe(sheetIdCafe);
                setInputSheetIdInternet(sheetIdInternet);
                setInputUrlCafe(scriptUrlCafe);
                setInputUrlInternet(scriptUrlInternet);
                setIsScriptModalOpen(true);
              }}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Settings & Sheet Connections"
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* BUSINESS SWITCHER BUTTON BAR (កាហ្វេចុងភូមិ <-> ពូអុក Internet) */}
      <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 sticky top-16 z-20 transition-colors shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ជ្រើសរើសសាខា · Switch Branch:</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <span>Sheet: {activeBusiness}</span>
              {activeSheetId ? (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${activeSheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 inline-flex items-center"
                  title="Open this Google Spreadsheet"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-amber-500 font-sans text-[10px] font-semibold">(Not connected)</span>
              )}
            </span>
          </div>

          {/* TWO SWITCH BUTTONS: កាហ្វេចុងភូមិ vs ពូអុក Internet */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner w-full sm:w-auto">
            {/* Button 1: កាហ្វេចុងភូមិ */}
            <button
              type="button"
              onClick={() => handleSwitchBusiness('កាហ្វេចុងភូមិ')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeBusiness === 'កាហ្វេចុងភូមិ'
                  ? 'bg-amber-700 text-white shadow-md ring-2 ring-amber-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Coffee className="w-4 h-4 text-amber-300" />
              <span className="font-moul tracking-normal pt-0.5">កាហ្វេចុងភូមិ</span>
            </button>

            {/* Button 2: ពូអុក Internet */}
            <button
              type="button"
              onClick={() => handleSwitchBusiness('ពូអុក Internet')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeBusiness === 'ពូអុក Internet'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Wifi className="w-4 h-4 text-blue-200" />
              <span className="font-moul tracking-normal pt-0.5">ពូអុក Internet</span>
            </button>
          </div>

        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">

        {/* WARNING / NOTICE BANNER WHEN POU OK INTERNET IS NOT CONNECTED */}
        {!isInternetConfigured && activeBusiness === 'ពូអុក Internet' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-950 dark:text-amber-200 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>ពូអុក Internet មិនទាន់ភ្ជាប់ Google Sheet ដាច់ដោយឡែកនៅឡើយទេ</span>
                </h4>
                <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed">
                  ទិន្នន័យពីមុនបានចូលក្នុង Google Sheet ចាស់ (កាហ្វេចុងភូមិ) ដោយសារមិនទាន់បានភ្ជាប់ Web App URL សម្រាប់ Google Sheet ថ្មី។ ដើម្បីឱ្យទិន្នន័យ ពូអុក Internet ចូលទៅក្នុង Google Sheet ថ្មីដោយឡែក សូមចុចប៊ូតុងខាងស្តាំដើម្បីភ្ជាប់។
                </p>
                <div className="flex items-center gap-2 pt-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  <span>• ទិន្នន័យថ្មីដែលបញ្ចូលពេលនេះ នឹងរក្សាទុកក្នុងម៉ាស៊ីន (Offline) សិន រហូតដល់អ្នកភ្ជាប់ Sheet ថ្មី។</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettingsTab('sheets');
                setIsScriptModalOpen(true);
              }}
              className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm transition-colors whitespace-nowrap"
            >
              <Link2 className="w-4 h-4" />
              <span>ភ្ជាប់ Google Sheet ថ្មី (Connect Sheet) ↗</span>
            </button>
          </div>
        )}

        {/* 1. TOP NET BALANCE HERO CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  NET BALANCE · សមតុល្យសរុប
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${
                    activeBusiness === 'កាហ្វេចុងភូមិ'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                  }`}
                >
                  {activeBusiness === 'កាហ្វេចុងភូមិ' ? (
                    <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  <span className="font-moul text-[11px] pt-0.5">{activeBusiness}</span>
                </span>
              </div>
              <div
                className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                  metrics.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {metrics.net < 0 ? '-' : ''}
                {formatMoney(Math.abs(metrics.net))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span>
                  {isLoading && transactions.length === 0
                    ? `Syncing ${activeBusiness} from Google Sheet...`
                    : `Based on ${metrics.totalCount} transactions in Google Sheet tab "${activeBusiness}"`}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">Daun Penh {liveDaunPenh.time12}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Income Card */}
              <div className="bg-[#ecfdf5] dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 min-w-[150px] sm:min-w-[170px] transition-colors">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1">
                  <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                  <span>Income · ចំណូល</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  +{formatMoney(metrics.income)}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-0.5">
                  {metrics.countInc} entries
                </div>
              </div>

              {/* Expense Card */}
              <div className="bg-[#fff1f2] dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-4 min-w-[150px] sm:min-w-[170px] transition-colors">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-semibold mb-1">
                  <div className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <span>Expense · ចំណាយ</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">
                  -{formatMoney(metrics.expense)}
                </div>
                <div className="text-xs text-rose-600 dark:text-rose-400/80 mt-0.5">
                  {metrics.countExp} entries
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE SECTION: ADD TRANSACTION (LEFT) & RATIO / CATEGORIES (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ADD TRANSACTION CARD (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Add Transaction</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-moul">
                    {activeBusiness}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">បញ្ចូលចំណូល ឬ ចំណាយសម្រាប់ {activeBusiness}</p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                $ USD
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTxType('Expense')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    txType === 'Expense'
                      ? 'bg-[#e11d48] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Income (ចំណូល)
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
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
                    className="w-full pl-9 pr-4 py-3 text-base font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
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
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Date · កាលបរិច្ឆេទ
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{formatToDaunPenhDisplay(txDate).dayMonthYear}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">Time: Auto (GMT+7)</span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Category · ប្រភេទ
                  </label>
                  <select
                    required
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 text-slate-800 dark:text-slate-100 truncate"
                  >
                    {(txType === 'Income' ? categories.income : categories.expense).map((cat) => (
                      <option key={cat} value={cat} className="dark:bg-slate-900 dark:text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note / Description (NO $ SIGN!) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Note / Description · ចំណាំ
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch with team, Fuel, Internet..."
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Destination Google Sheet & Tab Selector */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Store in Sheet · ទីតាំងរក្សាទុកទិន្នន័យ:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsTab('sheets');
                      setIsScriptModalOpen(true);
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    Manage Sheets ↗
                  </button>
                </div>

                {/* 3 Quick Destination Buttons */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDestination('កាហ្វេចុងភូមិ');
                      setDestinationMode('business');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                      destinationMode === 'business' && targetDestination === 'កាហ្វេចុងភូមិ'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Store into កាហ្វេចុងភូមិ Google Sheet"
                  >
                    <Coffee className="w-3 h-3 text-amber-300" />
                    <span className="font-moul text-[10px] truncate">កាហ្វេចុងភូមិ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetDestination('ពូអុក Internet');
                      setDestinationMode('business');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                      destinationMode === 'business' && targetDestination === 'ពូអុក Internet'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Store into ពូអុក Internet Google Sheet"
                  >
                    <Wifi className="w-3 h-3 text-blue-200" />
                    <span className="font-moul text-[10px] truncate">ពូអុក Internet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationMode('custom')}
                    className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                      destinationMode === 'custom'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Store into another custom sheet tab or document"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="truncate">Other Sheet</span>
                  </button>
                </div>

                {/* Custom Sheet Inputs if Other Sheet is chosen */}
                {destinationMode === 'custom' && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Custom Sheet Tab Name (created automatically if missing):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Special Orders, Delivery, General..."
                        value={customDestinationSheet}
                        onChange={(e) => setCustomDestinationSheet(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Optional: Custom Spreadsheet ID or Link (leave blank for current):
                      </label>
                      <input
                        type="text"
                        placeholder="Paste another Google Sheet URL or ID..."
                        value={customDestinationSpreadsheetId}
                        onChange={(e) => setCustomDestinationSpreadsheetId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {/* Target Status Indicator */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                  <span className="flex items-center gap-1 truncate">
                    <span>Target Tab:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-semibold font-mono">
                      {destinationMode === 'custom' ? (customDestinationSheet.trim() || 'Custom') : targetDestination}
                    </strong>
                  </span>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${
                      destinationMode === 'custom' && customDestinationSpreadsheetId.trim()
                        ? extractSpreadsheetId(customDestinationSpreadsheetId.trim())
                        : (targetDestination === 'កាហ្វេចុងភូមិ' ? sheetIdCafe : (sheetIdInternet || sheetIdCafe))
                    }/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                  >
                    <span>Open Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Saving to Google Sheet [{destinationMode === 'custom' ? (customDestinationSheet.trim() || 'Custom Sheet') : targetDestination}]...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>Save {txType === 'Income' ? 'Income' : 'Expense'} Entry ({destinationMode === 'custom' ? (customDestinationSheet.trim() || 'Custom Sheet') : targetDestination})</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* CASH FLOW RATIO & TOP CATEGORIES (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Cash Flow Ratio Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cash Flow Ratio</h3>
                <span className="text-xs text-slate-400">ចំណូល vs ចំណាយ ({activeBusiness})</span>
              </div>

              <div className="space-y-4">
                {/* Income Ratio */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-700 dark:text-emerald-400">Income (+{formatMoney(metrics.income)})</span>
                    <span className="text-slate-400 font-mono">{metrics.incomeRatio}%</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10b981] rounded-full transition-all duration-500"
                      style={{ width: `${metrics.incomeRatio}%` }}
                    />
                  </div>
                </div>

                {/* Expense Ratio */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-700 dark:text-rose-400">Expenses (-{formatMoney(metrics.expense)})</span>
                    <span className="text-slate-400 font-mono">{metrics.expenseRatio}%</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f43f5e] rounded-full transition-all duration-500"
                      style={{ width: `${metrics.expenseRatio}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Expense Categories Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Top Expense Categories · ការចំណាយតាមប្រភេទ
                </h3>
                <span className="text-xs text-slate-400">Ranked ({activeBusiness})</span>
              </div>

              <div className="space-y-4">
                {categoryStats.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No expenses recorded yet for {activeBusiness}.</div>
                ) : (
                  categoryStats.slice(0, 5).map((cat) => {
                    const pct = metrics.expense > 0 ? Math.round((cat.total / metrics.expense) * 100) : 0;
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.name}</span>
                          <span className="font-mono text-slate-900 dark:text-white">
                            <span className="font-bold">{formatMoney(cat.total)}</span>{' '}
                            <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1e293b] dark:bg-rose-500 rounded-full transition-all duration-300"
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Transaction History · ប្រវត្តិប្រតិបត្តិការ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-moul">
                  {activeBusiness}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Synced directly with Google Sheet tab "{activeBusiness}"
              </p>
            </div>

            {/* Filter buttons & Export icon */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                {(['All', 'Expense', 'Income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterType === t
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Download CSV */}
              <button
                onClick={exportCSV}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
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
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 font-semibold">
                  <th className="pb-2.5 px-3">Date</th>
                  <th className="pb-2.5 px-3">Type</th>
                  <th className="pb-2.5 px-3">Category</th>
                  <th className="pb-2.5 px-3">Note</th>
                  <th className="pb-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      {isLoading && transactions.length === 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                          <span>Syncing live transactions from Google Sheet...</span>
                        </div>
                      ) : (
                        'No transactions recorded.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredList.map((tx) => {
                    const isInc = tx.type === 'Income';
                    const dt = formatToDaunPenhDisplay(tx.date, tx.timestamp, tx.time);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Date with Day-Month-Year and Time */}
                        <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{dt.dayMonthYear}</div>
                          {dt.actualTime && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{dt.actualTime}</span>
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isInc ? '↑ Income' : '↓ Expense'}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {tx.category}
                        </td>

                        {/* Note (NO $ sign!) */}
                        <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {tx.note || '—'}
                        </td>

                        {/* Amount */}
                        <td
                          className={`py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Calculate by Selected Date</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-moul">
                    {activeBusiness}
                  </span>
                  <span className="text-xs font-normal text-slate-400">· គណនាតាមកាលបរិច្ឆេទ</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your date range and type to view calculated income, expenses, and net balance for {activeBusiness}
                </p>
              </div>
            </div>

            {/* Quick Export button for Date Range */}
            <button
              onClick={exportRangeCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
              title="Download Range Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Range CSV</span>
            </button>
          </div>

          {/* DATE RANGE FILTER CONTROLS */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
              {/* From Date (4 cols) */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  From Date · ចាប់ពីកាលបរិច្ឆេទ
                </label>
                <input
                  type="date"
                  value={calcStartDate}
                  onChange={(e) => setCalcStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                />
                {calcStartDate && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {formatToDaunPenhDisplay(calcStartDate).dayMonthYear}
                  </p>
                )}
              </div>

              {/* To Date (4 cols) */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  To Date · ដល់កាលបរិច្ឆេទ
                </label>
                <input
                  type="date"
                  value={calcEndDate}
                  onChange={(e) => setCalcEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                />
                {calcEndDate && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {formatToDaunPenhDisplay(calcEndDate).dayMonthYear}
                  </p>
                )}
              </div>

              {/* Resized Type Switcher (4 cols - spacious with ample room for All / Income / Expense) */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Type · ប្រភេទ
                </label>
                <div className="flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs">
                  {(['All', 'Income', 'Expense'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCalcTypeFilter(t)}
                      className={`flex-1 py-2 px-3 rounded-lg text-center transition-all cursor-pointer text-xs font-semibold whitespace-nowrap ${
                        calcTypeFilter === t
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Presets Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyRangePreset('today')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('this_week')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('this_month')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('last_30_days')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('this_year')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium"
                >
                  This Year
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset('all')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium"
                >
                  All Time
                </button>
              </div>

              {/* Reset to All */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyRangePreset('all')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Range</span>
                </button>
              </div>
            </div>
          </div>

          {/* CALCULATION STATUS & RESULTS BANNER */}
          <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                  {calcTypeFilter === 'Income' && (
                    <span>
                      Total Income Earned: <strong className="text-emerald-700 dark:text-emerald-400">+{formatMoney(rangeMetrics.income)}</strong>
                    </span>
                  )}
                  {calcTypeFilter === 'Expense' && (
                    <span>
                      Total Expenses Spent: <strong className="text-rose-700 dark:text-rose-400">-{formatMoney(rangeMetrics.expense)}</strong>
                    </span>
                  )}
                  {calcTypeFilter === 'All' && (
                    <span>
                      Calculated Net Balance: <strong className={rangeMetrics.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{rangeMetrics.net >= 0 ? '+' : '-'}{formatMoney(Math.abs(rangeMetrics.net))}</strong>
                    </span>
                  )}
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                    ({calcStartDate ? formatToDaunPenhDisplay(calcStartDate).dayMonthYear : 'Beginning'} → {calcEndDate ? formatToDaunPenhDisplay(calcEndDate).dayMonthYear : 'Today'})
                  </span>
                </p>
                <p className="text-emerald-800 dark:text-emerald-300 text-[11px] mt-0.5">
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
              <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-bold bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                Daun Penh (GMT+7)
              </span>
            </div>
          </div>

          {/* DYNAMIC CALCULATED RESULTS CARDS */}
          {calcTypeFilter === 'Income' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hero Total Earned */}
              <div className="bg-[#ecfdf5] dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-600 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold uppercase tracking-wider">Total Amount Earned · ចំណូលសរុប</span>
                  <span className="font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 font-mono text-emerald-800 dark:text-emerald-300">
                    {rangeMetrics.countInc} entries
                  </span>
                </div>
                <div className="my-2 text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                  +{formatMoney(rangeMetrics.income)}
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80">
                  Total money earned between {calcStartDate ? formatToDaunPenhDisplay(calcStartDate).dayMonthYear : 'beginning'} and {calcEndDate ? formatToDaunPenhDisplay(calcEndDate).dayMonthYear : 'today'}
                </p>
              </div>

              {/* Average per Income Record */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Average per Income Record</span>
                  <span className="text-slate-400 font-mono">Avg</span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  +{formatMoney(rangeMetrics.countInc > 0 ? rangeMetrics.income / rangeMetrics.countInc : 0)}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Average amount across {rangeMetrics.countInc} income entries
                </p>
              </div>

              {/* Top Income Source */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Top Income Source</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">Rank 1</span>
                </div>
                <div className="my-2 text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 truncate">
                  {rangeMetrics.topIncomeCategories[0]?.name || 'No records'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
              <div className="bg-[#fff1f2] dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-600 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
                  <span className="font-bold uppercase tracking-wider">Total Amount Spent · ការចំណាយសរុប</span>
                  <span className="font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 font-mono text-rose-800 dark:text-rose-300">
                    {rangeMetrics.countExp} entries
                  </span>
                </div>
                <div className="my-2 text-3xl sm:text-4xl font-black text-rose-700 dark:text-rose-400 tracking-tight">
                  -{formatMoney(rangeMetrics.expense)}
                </div>
                <p className="text-[11px] text-rose-800 dark:text-rose-300/80">
                  Total money spent between {calcStartDate ? formatToDaunPenhDisplay(calcStartDate).dayMonthYear : 'beginning'} and {calcEndDate ? formatToDaunPenhDisplay(calcEndDate).dayMonthYear : 'today'}
                </p>
              </div>

              {/* Average per Expense Record */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Average per Expense Record</span>
                  <span className="text-slate-400 font-mono">Avg</span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  -{formatMoney(rangeMetrics.countExp > 0 ? rangeMetrics.expense / rangeMetrics.countExp : 0)}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Average amount across {rangeMetrics.countExp} expense entries
                </p>
              </div>

              {/* Top Expense Category */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Top Spending Category</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">Rank 1</span>
                </div>
                <div className="my-2 text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 truncate">
                  {rangeMetrics.topExpenseCategories[0]?.name || 'No records'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
              <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between border border-slate-800 dark:border-slate-700 transition-colors">
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
              <div className="bg-[#ecfdf5] dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold uppercase tracking-wider">Total Earned (Income)</span>
                  <span className="font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {rangeMetrics.countInc} entries
                  </span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                  +{formatMoney(rangeMetrics.income)}
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80">
                  {rangeMetrics.incomeRatio}% of cash flow in this period
                </p>
              </div>

              {/* Selected Range Expenses */}
              <div className="bg-[#fff1f2] dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors">
                <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
                  <span className="font-semibold uppercase tracking-wider">Total Spent (Expenses)</span>
                  <span className="font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                    {rangeMetrics.countExp} entries
                  </span>
                </div>
                <div className="my-2 text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400">
                  -{formatMoney(rangeMetrics.expense)}
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-400/80">
                  {rangeMetrics.expenseRatio}% of cash flow in this period
                </p>
              </div>
            </div>
          )}

          {/* CATEGORIES BREAKDOWN & TRANSACTIONS IN SELECTED RANGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
            
            {/* Top Categories in this Range (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
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
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.name}</span>
                            <span className="font-mono text-emerald-700 dark:text-emerald-400">
                              <strong>+{formatMoney(cat.total)}</strong>{' '}
                              <span className="text-slate-400 dark:text-slate-500 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.name}</span>
                            <span className="font-mono text-rose-700 dark:text-rose-400">
                              <strong>-{formatMoney(cat.total)}</strong>{' '}
                              <span className="text-slate-400 dark:text-slate-500 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
            <div className="lg:col-span-7 bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Calculated Transactions List ({rangeFilteredTransactions.length})
                </h4>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {calcStartDate || 'All'} → {calcEndDate || 'Today'}
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800">
                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 font-semibold">
                      <th className="pb-2 px-2">Date</th>
                      <th className="pb-2 px-2">Type</th>
                      <th className="pb-2 px-2">Category</th>
                      <th className="pb-2 px-2">Note</th>
                      <th className="pb-2 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
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
                          <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {dt.dayMonthYear}
                            </td>
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              <span className={`font-semibold ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isInc ? '↑' : '↓'} {tx.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {tx.category}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                              {tx.note || '—'}
                            </td>
                            <td
                              className={`py-2.5 px-2 text-right font-mono font-bold whitespace-nowrap ${
                                isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
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

      {/* MODAL: APPS SCRIPT CODE & MULTI-SHEET SETTINGS */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 transition-colors">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center border border-slate-700">
                  <Code2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Google Sheet Connections & Apps Script</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage separate Google Spreadsheets for each business</p>
                </div>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-slate-50/30 dark:bg-slate-800/30 gap-2">
              <button
                type="button"
                onClick={() => setSettingsTab('sheets')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  settingsTab === 'sheets'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Separate Google Sheets (២ សាខា)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('code')}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  settingsTab === 'code'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Google Apps Script (Code.gs)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-slate-300">
              {settingsTab === 'sheets' ? (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Info Notice */}
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold text-sm mb-0.5">ការកំណត់ទីតាំង Google Sheet ដាច់ដោយឡែក (Separate Sheets):</strong>
                      <span className="leading-relaxed">
                        កម្មវិធីនេះគាំទ្រការរក្សាទុកទិន្នន័យទៅក្នុង <strong>Google Sheet ពីរផ្សេងគ្នាទាំងស្រុង</strong>។ បង្កើត Google Sheet ថ្មីមួយសម្រាប់ &quot;ពូអុក Internet&quot; ដាក់កូដ Apps Script និងចម្លង Web App URL មកដាក់ក្នុងប្រអប់ខាងក្រោម។
                      </span>
                    </div>
                  </div>

                  {/* Sheet 1: កាហ្វេចុងភូមិ */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-amber-600" />
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                          Sheet 1: កាហ្វេចុងភូមិ (Coffee Shop)
                        </h4>
                      </div>
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(inputSheetIdCafe) || DEFAULT_SHEET_ID_CAFE}/edit`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Open Sheet ↗</span>
                      </a>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Google Sheet Link or ID:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Paste Google Sheet URL or ID..."
                        value={inputSheetIdCafe}
                        onChange={(e) => setInputSheetIdCafe(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Google Apps Script Web App URL:
                        </label>
                        <button
                          type="button"
                          onClick={() => testConnection('cafe')}
                          disabled={isTestingUrl === 'cafe'}
                          className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {isTestingUrl === 'cafe' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          <span>Test Connection</span>
                        </button>
                      </div>
                      <input
                        type="url"
                        required
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={inputUrlCafe}
                        onChange={(e) => setInputUrlCafe(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    {testResult && testResult.target === 'cafe' && (
                      <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-1.5 ${
                        testResult.success
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}>
                        {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Sheet 2: ពូអុក Internet */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                          Sheet 2: ពូអុក Internet (Internet Cafe)
                        </h4>
                      </div>
                      {inputSheetIdInternet.trim() && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(inputSheetIdInternet)}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>Open Sheet ↗</span>
                        </a>
                      )}
                    </div>

                    {/* Step-by-Step Setup Guide */}
                    <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                          ជំហានបង្កើត Google Sheet ថ្មី (How to Set Up New Sheet):
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href="https://sheet.new"
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <span>➕ បង្កើត Sheet ថ្មី (sheet.new) ↗</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(appsScriptCodeDedicated);
                              setHasCopiedDedicatedCode(true);
                              setTimeout(() => setHasCopiedDedicatedCode(false), 2500);
                            }}
                            className="px-2.5 py-1 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {hasCopiedDedicatedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{hasCopiedDedicatedCode ? 'បានចម្លងកូដ!' : 'ចម្លងកូដ Apps Script'}</span>
                          </button>
                        </div>
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
                        <li>ចុច <strong>បង្កើត Sheet ថ្មី</strong> ខាងលើ រួចដាក់ឈ្មោះថា &quot;ពូអុក Internet Ledger&quot;។</li>
                        <li>ក្នុង Sheet ថ្មីនោះ ចុច <strong>Extensions &gt; Apps Script</strong>។</li>
                        <li>លុបកូដចាស់ចោល រួចបិទភ្ជាប់ (Paste) កូដដែលបានចម្លងរួច ចុច <strong>Deploy &gt; New deployment &gt; Web app (Who has access: Anyone)</strong>។</li>
                        <li>ចម្លង Web app URL យកមកបិទភ្ជាប់ក្នុងប្រអប់ខាងក្រោម រួចចុច Save!</li>
                      </ol>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Google Apps Script Web App URL សម្រាប់ ពូអុក Internet:
                        </label>
                        {inputUrlInternet.trim() && (
                          <button
                            type="button"
                            onClick={() => testConnection('internet')}
                            disabled={isTestingUrl === 'internet'}
                            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {isTestingUrl === 'internet' ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span>Test Connection</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={inputUrlInternet}
                        onChange={(e) => setInputUrlInternet(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    {testResult && testResult.target === 'internet' && (
                      <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-1.5 ${
                        testResult.success
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}>
                        {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{testResult.message}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Optional: Google Sheet Link or ID (សម្រាប់បើកមើល):
                      </label>
                      <input
                        type="text"
                        placeholder="Paste your separate Google Sheet URL or ID for ពូអុក Internet..."
                        value={inputSheetIdInternet}
                        onChange={(e) => setInputSheetIdInternet(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Save &amp; Connect Separate Sheets
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Code selector tabs */}
                  <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCodeType('dedicated')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedCodeType === 'dedicated'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      1. កូដសម្រាប់ Sheet ថ្មី &quot;ពូអុក Internet&quot; (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCodeType('master')}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedCodeType === 'master'
                          ? 'bg-slate-900 text-white dark:bg-slate-700 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      2. កូដ Master Multi-Sheet Script (សម្រាប់ Web App មួយ)
                    </button>
                  </div>

                  {selectedCodeType === 'dedicated' ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60">
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                          របៀបប្រើកូដសម្រាប់ Google Sheet ថ្មី (ពូអុក Internet):
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          បង្កើត Google Sheet ថ្មីមួយ &gt; Extensions &gt; Apps Script &gt; បិទភ្ជាប់កូដខាងក្រោម &gt; Deploy &gt; New deployment &gt; Web app (Access: Anyone) &gt; ចម្លង URL ដាក់ក្នុង Settings!
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Google Apps Script Code (Code.gs)</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(appsScriptCodeDedicated);
                            setHasCopiedDedicatedCode(true);
                            setTimeout(() => setHasCopiedDedicatedCode(false), 2500);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          {hasCopiedDedicatedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{hasCopiedDedicatedCode ? 'Copied!' : 'Copy Dedicated Code'}</span>
                        </button>
                      </div>

                      <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-64 border border-slate-800">
                        {appsScriptCodeDedicated}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                          ចំណាំសំខាន់ (Critical Note):
                        </h4>
                        <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                          ប្រសិនបើអ្នកចង់ប្រើ Web App តែមួយគ្រប់គ្រង Sheet ទាំងពីរ អ្នកត្រូវតែចុច <strong>Deploy &gt; Manage deployments &gt; Edit (រូបខ្មៅដៃ) &gt; Version: New version &gt; Deploy</strong>! ប្រសិនបើមិនជ្រើសរើស New version ទេ Google នឹងនៅតែដំណើរការកូដចាស់ដដែល!
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Master Multi-Sheet Router Code (Code.gs)</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(appsScriptCode);
                            setHasCopiedCode(true);
                            setTimeout(() => setHasCopiedCode(false), 2500);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          {hasCopiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{hasCopiedCode ? 'Copied!' : 'Copy Master Code'}</span>
                        </button>
                      </div>

                      <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-64 border border-slate-800">
                        {appsScriptCode}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl cursor-pointer"
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
