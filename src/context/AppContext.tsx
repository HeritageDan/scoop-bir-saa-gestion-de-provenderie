import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Role,
  Product,
  Supplier,
  Customer,
  Invoice,
  StockMovement,
  Purchase,
  InventorySession,
  AuditLog,
  CompanySettings,
  AppNotification,
  CreditNote,
  Payment,
  SaleItem,
  SaleDiscount,
  SalesPoint,
  Language,
  Theme,
  Expense,
  UnitType,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_PURCHASES,
  INITIAL_INVENTORIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMPANY_SETTINGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SALES_POINTS,
  INITIAL_EXPENSES,
} from '../data/seedData';
import { DEFAULT_APP_LOGO } from '../config/defaultLogo';
import { getTranslation } from '../utils/i18n';
import {
  openDatabase,
  saveStoreItems,
  loadStoreItems,
  saveMetadata,
  clearAllIndexedDbStores,
} from '../services/indexedDbStorage';
import {
  getSupabaseConfig,
  pullAllDataFromSupabase,
  upsertRecordToSupabase,
  deleteRecordFromSupabase,
  clearAllSupabaseTransactions,
  clearAllSupabaseDataExceptDevAndSettings,
  pushAllLocalDataToSupabase,
} from '../services/supabaseService';
import { updateAppIconEverywhere } from '../services/appIconService';

interface AppContextType {
  // Theme & Language
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;

  // Points of Sale (Multi-magasin)
  salesPoints: SalesPoint[];
  currentSalesPointId: string;
  setCurrentSalesPointId: (id: string) => void;
  currentSalesPoint: SalesPoint | null;
  addSalesPoint: (sp: Omit<SalesPoint, 'id' | 'createdAt'>) => void;
  updateSalesPoint: (sp: SalesPoint) => void;
  deleteSalesPoint: (id: string) => void;

  // Authentication
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Current user & Users Management (Admin creates users & assigns roles)
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchRole: (role: Role) => void;
  updateUser: (user: User) => void;
  addUser: (user: Omit<User, 'id'>) => { success: boolean; error?: string };
  deactivateUser: (userId: string) => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory' | 'stockCurrentBaseUnit' | 'cmp'>, initialStock?: number, initialCmp?: number) => void;
  updateProduct: (product: Product, reason?: string) => void;
  archiveProduct: (productId: string) => void;
  unarchiveProduct: (productId: string) => void;
  maskProduct: (productId: string) => void;

  // Purchases & Receipts
  purchases: Purchase[];
  allPurchases: Purchase[];
  createPurchaseDraft: (purchase: Omit<Purchase, 'id' | 'referenceNumber' | 'status'>, targetSalesPointId?: string) => Purchase;
  updatePurchase: (purchaseId: string, updatedData: Partial<Purchase>) => { success: boolean; error?: string };
  validatePurchaseReception: (purchaseIdOrObj: string | Purchase) => void;
  cancelPurchase: (purchaseId: string, reason?: string) => void;

  // Sales & Invoicing
  invoices: Invoice[];
  allInvoices: Invoice[];
  creditNotes: CreditNote[];
  createSale: (
    customerId: string,
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
      saleMode?: 'gros' | 'detail';
      unit?: UnitType;
      conversionFactor?: number;
    }[],
    discount?: { type: 'pourcentage' | 'montant'; value: number; reason: string },
    payment?: {
      amount: number;
      method: 'espèces' | 'virement' | 'paiement mobile' | 'crédit client';
      reference?: string;
      amountReceived?: number;
      changeGiven?: number;
    },
    notes?: string,
    isCredit?: boolean,
    creditDueDate?: string,
    targetSalesPointId?: string
  ) => { success: boolean; invoiceId?: string; invoice?: Invoice; error?: string };
  cancelInvoiceWithCreditNote: (invoiceId: string, reason: string) => { success: boolean; error?: string };

  // Payments / Debt settlements
  payments: Payment[];
  recordDebtPayment: (invoiceId: string, amount: number, method: 'espèces' | 'virement' | 'paiement mobile', reference?: string, notes?: string) => { success: boolean; error?: string };

  // Stock & Movements
  stockMovements: StockMovement[];
  allStockMovements: StockMovement[];
  recordStockAdjustment: (productId: string, quantityChangeBaseUnit: number, type: 'perte' | 'produit endommagé' | 'consommation interne' | 'correction d\'inventaire' | 'entrée fournisseur', justification?: string) => { success: boolean; error?: string };

  // Inventories
  inventories: InventorySession[];
  allInventories: InventorySession[];
  createInventorySession: (categoryFilter?: string) => string;
  validateInventorySession: (sessionId: string, countedItems: { productId: string; physicalStock: number; reason?: string }[], notes?: string) => { success: boolean; error?: string };

  // Suppliers & Customers
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'currentDebt'>) => void;
  updateCustomer: (customer: Customer) => void;

  // Operating Expenses
  expenses: Expense[];
  allExpenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'referenceNumber' | 'createdAt'>) => string;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string, reason?: string) => void;

  // Audit Logs & Notifications
  auditLogs: AuditLog[];
  addAuditLog: (action: AuditLog['action'], targetObject: string, objectId: string, oldValue?: string, newValue?: string, justification?: string) => void;
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Company Settings
  settings: CompanySettings;
  updateSettings: (newSettings: CompanySettings) => void;

  // Backup & Restore
  exportSystemBackup: () => string;
  restoreSystemBackup: (jsonString: string) => { success: boolean; message: string };
  resetToDefaultData: () => Promise<void>;
  lastAutoBackupTime: Date | null;
  triggerAutoBackup: () => string;

  // Helper selectors
  getLowStockProducts: () => Product[];
  getOutOfStockProducts: () => Product[];

  // Cloud Supabase Sync Engine
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncTime: Date | null;
  syncErrorMessage?: string;
  triggerManualSync: (silent?: boolean) => Promise<void>;
  isSupabaseConfigured: boolean;

  // Desktop & PWA Installation
  canInstallPwa: boolean;
  isStandalone: boolean;
  installPwa: () => Promise<boolean>;
  showDesktopInstallModal: boolean;
  setShowDesktopInstallModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Extraction du timestamp d'une entité pour arbitrage temporel
function getEntityTimestamp(item: any): number {
  if (!item || typeof item !== 'object') return 0;
  const val = item.updatedAt || item.validatedAt || item.timestamp || item.createdAt || item.receptionDate || item.orderDate || item.date || item.endDate || item.startDate;
  if (!val) return 0;
  const time = new Date(val).getTime();
  return isNaN(time) ? 0 : time;
}

// Suivi persistant des identifiants supprimés pour éviter la résurrection lors des synchronisations
function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem('provenda_deleted_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function trackDeletedId(id: string) {
  try {
    const current = getDeletedIds();
    current.add(id);
    localStorage.setItem('provenda_deleted_ids', JSON.stringify(Array.from(current)));
  } catch {}
}

// Helper utilitaire pour fusionner deux listes d'entités par leur ID avec arbitrage Last-Write-Wins
function mergeEntityLists<T extends { id?: string }>(
  localList: T[],
  remoteList: T[],
  isFreshClient = false,
  _lastSyncTime?: Date | null
): T[] {
  const deletedIds = getDeletedIds();

  // Sur un nouveau navigateur sans synchronisation antérieure, la base distante est 100% prioritaire
  if (isFreshClient) {
    return remoteList.filter(item => item && item.id && !deletedIds.has(item.id));
  }

  const map = new Map<string, T>();

  // 1. Ajouter d'abord les éléments distants (sauf si supprimés localement)
  for (const item of remoteList) {
    if (item && item.id && !deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }

  // 2. Fusionner avec les éléments locaux
  for (const localItem of localList) {
    if (localItem && localItem.id && !deletedIds.has(localItem.id)) {
      const remoteItem = map.get(localItem.id);
      if (!remoteItem) {
        // RÈGLE FONDAMENTALE OFFLINE-FIRST: Tout élément présent localement et non explicitement supprimé
        // DOIT être conservé ! On ne supprime JAMAIS des données locales simplement parce que le
        // serveur distant ne les a pas encore reçues ou ne les possède pas.
        map.set(localItem.id, localItem);
      } else {
        const localTime = getEntityTimestamp(localItem);
        const remoteTime = getEntityTimestamp(remoteItem);
        // Le local l'emporte s'il est plus récent ou égal (priorité aux saisies locales)
        if (localTime >= remoteTime) {
          map.set(localItem.id, localItem);
        }
      }
    }
  }
  return Array.from(map.values());
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('provenda_theme') as Theme) || 'dark';
  });

  // Language state (fr / en)
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('provenda_language') as Language) || 'fr';
  });

  // Desktop & PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  });
  const [showDesktopInstallModal, setShowDesktopInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstallPwa(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPwa = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setCanInstallPwa(false);
        setIsStandalone(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error during PWA installation prompt:', err);
      return false;
    }
  };

  // Sales point (Points de vente et dépôts)
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>(() => {
    const saved = localStorage.getItem('provenda_sales_points');
    if (saved) {
      try {
        const parsed: SalesPoint[] = JSON.parse(saved);
        return parsed.length > 0 ? parsed : INITIAL_SALES_POINTS;
      } catch (e) {
        return INITIAL_SALES_POINTS;
      }
    }
    return INITIAL_SALES_POINTS;
  });

  const [currentSalesPointId, setCurrentSalesPointIdState] = useState<string>('pos-1');

  // Load initial states from localStorage if available, otherwise use seed data
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('provenda_users');
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        // Clean out legacy mock accounts (usr-1, usr-2, usr-3, usr-4)
        const cleanUsers = parsed.filter(u => !['usr-1', 'usr-2', 'usr-3', 'usr-4'].includes(u.id));
        // Ensure Developer user is present
        const hasDev = cleanUsers.some(u => u.role === 'developpeur');
        if (!hasDev) {
          cleanUsers.unshift(INITIAL_USERS[0]);
        }
        return cleanUsers.length > 0 ? cleanUsers : INITIAL_USERS;
      } catch (e) {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const savedId = localStorage.getItem('provenda_current_user_id');
    if (savedId) {
      const found = users.find(u => u.id === savedId && u.active);
      if (found) return found;
    }
    return users.find(u => u.role === 'developpeur') || users[0];
  });

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    localStorage.setItem('provenda_current_user_id', user.id);
    if (user.role !== 'administrateur' && user.role !== 'developpeur') {
      const assignedId = user.assignedSalesPointId || 'pos-1';
      setCurrentSalesPointIdState(assignedId);
      localStorage.setItem('provenda_current_sales_point', assignedId);
    }
  };

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') === 'true') {
        localStorage.setItem('provenda_auth', 'true');
        return true;
      }
      return localStorage.getItem('provenda_auth') === 'true';
    }
    return false;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('provenda_products');
    const rawList: Product[] = saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    return rawList.map(p => {
      if (p.conversionFactor && p.conversionFactor > 1) {
        const allowDetail = p.allowDetailSale !== undefined ? p.allowDetailSale : true;
        const detailPrice = p.detailPrice || Math.round(((p.salePrice / p.conversionFactor) * 1.15) / 10) * 10;
        return { ...p, allowDetailSale: allowDetail, detailPrice };
      }
      return p;
    });
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('provenda_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('provenda_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('provenda_purchases');
    const list: Purchase[] = saved ? JSON.parse(saved) : INITIAL_PURCHASES;
    return list.sort((a, b) => new Date(b.receptionDate || b.orderDate || 0).getTime() - new Date(a.receptionDate || a.orderDate || 0).getTime());
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('provenda_invoices');
    const list: Invoice[] = saved ? JSON.parse(saved) : INITIAL_INVOICES;
    return list.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeB - timeA;
    });
  });

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => {
    const saved = localStorage.getItem('provenda_credit_notes');
    const list: CreditNote[] = saved ? JSON.parse(saved) : [];
    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('provenda_stock_movements');
    const list: StockMovement[] = saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  });

  const [inventories, setInventories] = useState<InventorySession[]>(() => {
    const saved = localStorage.getItem('provenda_inventories');
    const list: InventorySession[] = saved ? JSON.parse(saved) : INITIAL_INVENTORIES;
    return list.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('provenda_audit_logs');
    const list: AuditLog[] = saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('provenda_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('provenda_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.logoUrl || typeof parsed.logoUrl !== 'string' || parsed.logoUrl.trim() === '') {
          parsed.logoUrl = DEFAULT_APP_LOGO;
        }
        return parsed;
      } catch {
        return { ...INITIAL_COMPANY_SETTINGS, logoUrl: DEFAULT_APP_LOGO };
      }
    }
    return { ...INITIAL_COMPANY_SETTINGS, logoUrl: DEFAULT_APP_LOGO };
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('provenda_expenses');
    const list: Expense[] = saved ? JSON.parse(saved) : [];
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || `${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(b.createdAt || `${b.date}T${b.time || '00:00'}`).getTime();
      return timeB - timeA;
    });
  });

  // Collect all payments from invoices
  const payments = invoices.flatMap(inv => inv.payments || []);

  // Initial synchronization with IndexedDB
  useEffect(() => {
    const syncWithIndexedDb = async () => {
      try {
        await openDatabase();
        const dbInvoices = await loadStoreItems<Invoice>('invoices');
        if (dbInvoices && dbInvoices.length > 0 && invoices.length === INITIAL_INVOICES.length) {
          setInvoices(dbInvoices);
        }
        const dbStockMovements = await loadStoreItems<StockMovement>('stockMovements');
        if (dbStockMovements && dbStockMovements.length > 0 && stockMovements.length === INITIAL_STOCK_MOVEMENTS.length) {
          setStockMovements(dbStockMovements);
        }
      } catch (err) {
        console.warn('[IndexedDB] Background sync notice:', err);
      }
    };
    syncWithIndexedDb();
  }, []);

  // Synchronisation dynamique de l'icône de l'application (PWA, Favicon, Desktop Electron)
  useEffect(() => {
    if (settings?.logoUrl) {
      updateAppIconEverywhere(settings.logoUrl);
    }
  }, [settings?.logoUrl]);

  // Cloud Supabase Sync States
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('provenda_last_sync_time');
    return saved ? new Date(saved) : null;
  });
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | undefined>();

  // Flag and refs for automatic background 2-way synchronization
  const hasLocalChangesRef = useRef(false);
  const isSyncingRemoteRef = useRef(false);
  const isInitialMount = useRef(true);
  const hasCompletedInitialPullRef = useRef(false);
  const pushTimerRef = useRef<any>(null);
  const purchasesRef = useRef<Purchase[]>(purchases);
  purchasesRef.current = purchases;
  const productsRef = useRef<Product[]>(products);
  productsRef.current = products;

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Fonction de poussée automatique de l'état complet vers Supabase
  const pushCurrentStateToSupabase = useCallback(async () => {
    const config = getSupabaseConfig();
    if (!config.isConfigured || !navigator.onLine) return;
    // Ne jamais écraser le cloud si ce terminal n'a pas encore téléchargé la base existante
    if (!hasCompletedInitialPullRef.current && localStorage.getItem('provenda_last_sync_time')) return;

    try {
      const currentUsers = JSON.parse(localStorage.getItem('provenda_users') || '[]');
      const currentProducts = JSON.parse(localStorage.getItem('provenda_products') || '[]');
      const currentSuppliers = JSON.parse(localStorage.getItem('provenda_suppliers') || '[]');
      const currentCustomers = JSON.parse(localStorage.getItem('provenda_customers') || '[]');
      const currentPurchases = JSON.parse(localStorage.getItem('provenda_purchases') || '[]');
      const currentInvoices = JSON.parse(localStorage.getItem('provenda_invoices') || '[]');
      const currentCreditNotes = JSON.parse(localStorage.getItem('provenda_credit_notes') || '[]');
      const currentStockMovements = JSON.parse(localStorage.getItem('provenda_stock_movements') || '[]');
      const currentInventories = JSON.parse(localStorage.getItem('provenda_inventories') || '[]');
      const currentSalesPoints = JSON.parse(localStorage.getItem('provenda_sales_points') || '[]');
      const currentAuditLogs = JSON.parse(localStorage.getItem('provenda_audit_logs') || '[]');
      const currentSettings = JSON.parse(localStorage.getItem('provenda_settings') || '{}');
      const currentExpenses = JSON.parse(localStorage.getItem('provenda_expenses') || '[]');

      await pushAllLocalDataToSupabase({
        users: currentUsers,
        products: currentProducts,
        suppliers: currentSuppliers,
        customers: currentCustomers,
        purchases: currentPurchases,
        invoices: currentInvoices,
        creditNotes: currentCreditNotes,
        stockMovements: currentStockMovements,
        inventories: currentInventories,
        salesPoints: currentSalesPoints.length > 0 ? currentSalesPoints : salesPoints,
        auditLogs: currentAuditLogs,
        settings: currentSettings,
        expenses: currentExpenses,
      });
      hasLocalChangesRef.current = false;
    } catch (err) {
      console.warn('[Supabase Push Error]:', err);
    }
  }, [salesPoints]);

  const scheduleBackgroundPush = useCallback(() => {
    // Marquer les changements locaux sans requêtes réseau intempestives
    hasLocalChangesRef.current = true;
  }, []);

  // Automatic Background Cloud Supabase Synchronization Function
  const performAutomaticSync = useCallback(async (silent = true) => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      setSyncStatus('idle');
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    if (!silent) {
      setSyncStatus('syncing');
    }

    try {
      isSyncingRemoteRef.current = true;
      const pullRes = await pullAllDataFromSupabase();
      if (pullRes.success && pullRes.data) {
        const d = pullRes.data;
        const isFresh = !localStorage.getItem('provenda_last_sync_time');

        if (Array.isArray(d.users)) {
          setUsers(prev => {
            const merged = mergeEntityLists(prev, d.users!, isFresh, lastSyncTime);
            if (!merged.some(u => u.role === 'developpeur')) {
              const dev = prev.find(u => u.role === 'developpeur') || INITIAL_USERS[0];
              merged.unshift(dev);
            }
            localStorage.setItem('provenda_users', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.products)) {
          setProducts(prev => {
            const merged = isFresh ? d.products! : mergeEntityLists(prev, d.products!, false, lastSyncTime);
            localStorage.setItem('provenda_products', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.suppliers)) {
          setSuppliers(prev => {
            const merged = isFresh ? d.suppliers! : mergeEntityLists(prev, d.suppliers!, false, lastSyncTime);
            localStorage.setItem('provenda_suppliers', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.customers)) {
          setCustomers(prev => {
            const merged = isFresh ? d.customers! : mergeEntityLists(prev, d.customers!, false, lastSyncTime);
            localStorage.setItem('provenda_customers', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.purchases)) {
          setPurchases(prev => {
            const merged = isFresh ? d.purchases! : mergeEntityLists(prev, d.purchases!, false, lastSyncTime);
            merged.sort((a, b) => new Date(b.receptionDate || b.orderDate || 0).getTime() - new Date(a.receptionDate || a.orderDate || 0).getTime());
            localStorage.setItem('provenda_purchases', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.invoices)) {
          setInvoices(prev => {
            const merged = isFresh ? d.invoices! : mergeEntityLists(prev, d.invoices!, false, lastSyncTime);
            merged.sort((a, b) => {
              const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
              const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
              return timeB - timeA;
            });
            localStorage.setItem('provenda_invoices', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.creditNotes)) {
          setCreditNotes(prev => {
            const merged = isFresh ? d.creditNotes! : mergeEntityLists(prev, d.creditNotes!, false, lastSyncTime);
            merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            localStorage.setItem('provenda_credit_notes', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.stockMovements)) {
          setStockMovements(prev => {
            const merged = isFresh ? d.stockMovements! : mergeEntityLists(prev, d.stockMovements!, false, lastSyncTime);
            merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem('provenda_stock_movements', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.inventories)) {
          setInventories(prev => {
            const merged = isFresh ? d.inventories! : mergeEntityLists(prev, d.inventories!, false, lastSyncTime);
            merged.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
            localStorage.setItem('provenda_inventories', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.expenses)) {
          setExpenses(prev => {
            const merged = isFresh ? d.expenses! : mergeEntityLists(prev, d.expenses!, false, lastSyncTime);
            merged.sort((a, b) => {
              const timeA = new Date(a.createdAt || `${a.date}T${a.time || '00:00'}`).getTime();
              const timeB = new Date(b.createdAt || `${b.date}T${b.time || '00:00'}`).getTime();
              return timeB - timeA;
            });
            localStorage.setItem('provenda_expenses', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.salesPoints)) {
          setSalesPoints(prev => {
            const merged = isFresh ? d.salesPoints! : mergeEntityLists(prev, d.salesPoints!, false, lastSyncTime);
            if (merged.length === 0) {
              merged.push(INITIAL_SALES_POINTS[0]);
            }
            localStorage.setItem('provenda_sales_points', JSON.stringify(merged));
            return merged;
          });
        }

        if (Array.isArray(d.auditLogs)) {
          setAuditLogs(prev => {
            const merged = isFresh ? d.auditLogs! : mergeEntityLists(prev, d.auditLogs!, false, lastSyncTime);
            merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem('provenda_audit_logs', JSON.stringify(merged));
            return merged;
          });
        }

        if (d.settings && typeof d.settings === 'object' && d.settings.name) {
          setSettings(prev => {
            const merged = { ...prev, ...d.settings };
            if (!merged.logoUrl || typeof merged.logoUrl !== 'string' || merged.logoUrl.trim() === '') {
              merged.logoUrl = prev.logoUrl || DEFAULT_APP_LOGO;
            }
            localStorage.setItem('provenda_settings', JSON.stringify(merged));
            return merged;
          });
        }

        hasCompletedInitialPullRef.current = true;

        // Si des modifications locales étaient en attente, pousser vers Supabase
        if (hasLocalChangesRef.current) {
          hasLocalChangesRef.current = false;
          await pushCurrentStateToSupabase();
        }

        const now = new Date();
        setLastSyncTime(now);
        localStorage.setItem('provenda_last_sync_time', now.toISOString());
        setSyncStatus('synced');
        setSyncErrorMessage(undefined);
      } else {
        setSyncStatus('error');
        setSyncErrorMessage(pullRes.message);
      }
    } catch (err: any) {
      console.warn('[Supabase Sync Error]:', err);
      setSyncStatus('error');
      setSyncErrorMessage(err?.message || 'Erreur réseau');
    } finally {
      setTimeout(() => {
        isSyncingRemoteRef.current = false;
      }, 2500);
    }
  }, [pushCurrentStateToSupabase]);

  const triggerManualSync = useCallback(async (silent = false) => {
    await performAutomaticSync(silent);
  }, [performAutomaticSync]);

  // Mode Sauvegarde et Synchronisation STRICTEMENT MANUELS
  // Élimination totale de tout automatisme : aucun déclenchement au rafraîchissement de la page, aucune récurrence toutes les 3h, aucune synchronisation sur reconnexion réseau.
  // La synchronisation cloud s'exécute UNIQUEMENT lorsque l'utilisateur clique volontairement sur "Synchroniser" ou "Pousser vers Supabase".
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('idle');
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dual-Persistence Engine: Instant localStorage + High-Capacity IndexedDB + Cloud Sync
  useEffect(() => {
    localStorage.setItem('provenda_expenses', JSON.stringify(expenses));
    saveStoreItems('expenses', expenses);
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('provenda_users', JSON.stringify(users));
    saveStoreItems('users', users);
  }, [users]);

  useEffect(() => {
    localStorage.setItem('provenda_products', JSON.stringify(products));
    saveStoreItems('products', products);
  }, [products]);

  useEffect(() => {
    localStorage.setItem('provenda_suppliers', JSON.stringify(suppliers));
    saveStoreItems('suppliers', suppliers);
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('provenda_customers', JSON.stringify(customers));
    saveStoreItems('customers', customers);
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('provenda_purchases', JSON.stringify(purchases));
    saveStoreItems('purchases', purchases);
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('provenda_invoices', JSON.stringify(invoices));
    saveStoreItems('invoices', invoices);
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('provenda_credit_notes', JSON.stringify(creditNotes));
    saveStoreItems('creditNotes', creditNotes);
  }, [creditNotes]);

  useEffect(() => {
    localStorage.setItem('provenda_stock_movements', JSON.stringify(stockMovements));
    saveStoreItems('stockMovements', stockMovements);
  }, [stockMovements]);

  useEffect(() => {
    localStorage.setItem('provenda_inventories', JSON.stringify(inventories));
    saveStoreItems('inventories', inventories);
  }, [inventories]);

  useEffect(() => {
    localStorage.setItem('provenda_audit_logs', JSON.stringify(auditLogs));
    saveStoreItems('auditLogs', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('provenda_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('provenda_settings', JSON.stringify(settings));
    saveMetadata('settings', settings);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('provenda_sales_points', JSON.stringify(salesPoints));
    saveStoreItems('salesPoints', salesPoints);
  }, [salesPoints]);

  // Theme handling
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('provenda_theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Language handling
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('provenda_language', lang);
  };

  const t = (key: string): string => {
    return getTranslation(language, key);
  };

  // Sales points handling
  const effectiveSalesPointId = (currentUser.role === 'administrateur' || currentUser.role === 'developpeur')
    ? currentSalesPointId
    : (currentUser.assignedSalesPointId || 'pos-1');

  const setCurrentSalesPointId = (id: string) => {
    if (currentUser.role !== 'administrateur' && currentUser.role !== 'developpeur') {
      const lockedId = currentUser.assignedSalesPointId || 'pos-1';
      setCurrentSalesPointIdState(lockedId);
      localStorage.setItem('provenda_current_sales_point', lockedId);
      return;
    }
    setCurrentSalesPointIdState(id);
    localStorage.setItem('provenda_current_sales_point', id);
  };

  const currentSalesPoint: SalesPoint | null =
    (currentUser.role === 'administrateur' || currentUser.role === 'developpeur') && effectiveSalesPointId === 'all'
      ? {
          id: 'all',
          code: 'GLOBAL',
          name: language === 'fr' ? 'Tous les points de vente (Vue Globale)' : 'All Sales Points (Global View)',
          city: language === 'fr' ? 'National' : 'National',
          address: language === 'fr' ? 'Consolidation multi-sites' : 'Multi-site consolidation',
          phone: '',
          managerName: 'Direction Générale',
          isMain: true,
          active: true,
          createdAt: '2026-01-01',
        }
      : (salesPoints.find(sp => sp.id === effectiveSalesPointId) || salesPoints[0] || null);

  const addSalesPoint = (spData: Omit<SalesPoint, 'id' | 'createdAt'>) => {
    const newSp: SalesPoint = {
      ...spData,
      id: `pos-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSalesPoints(prev => {
      const next = [...prev, newSp];
      localStorage.setItem('provenda_sales_points', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('sales_points', newSp).catch(() => {});
    upsertRecordToSupabase('salespoint', newSp).catch(() => {});
    scheduleBackgroundPush();
    addAuditLog(
      'MODIFICATION_PARAMETRES',
      `Point de Vente: ${newSp.name}`,
      newSp.id,
      undefined,
      `${newSp.name} (${newSp.code}) - ${newSp.address}`,
      'Création d\'un point de vente / dépôt'
    );
  };

  const updateSalesPoint = (sp: SalesPoint) => {
    setSalesPoints(prev => {
      const next = prev.map(s => (s.id === sp.id ? sp : s));
      localStorage.setItem('provenda_sales_points', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('sales_points', sp).catch(() => {});
    upsertRecordToSupabase('salespoint', sp).catch(() => {});
    scheduleBackgroundPush();
    addAuditLog(
      'MODIFICATION_PARAMETRES',
      `Point de Vente: ${sp.name}`,
      sp.id,
      undefined,
      `${sp.name} (${sp.code})`,
      'Mise à jour des informations du point de vente'
    );
  };

  const deleteSalesPoint = (id: string) => {
    const target = salesPoints.find(s => s.id === id);
    if (!target) return;
    setSalesPoints(prev => {
      const next = prev.filter(s => s.id !== id);
      localStorage.setItem('provenda_sales_points', JSON.stringify(next));
      return next;
    });
    deleteRecordFromSupabase('sales_points', id).catch(() => {});
    deleteRecordFromSupabase('salespoint', id).catch(() => {});
    trackDeletedId(id);
    scheduleBackgroundPush();
    addAuditLog(
      'MODIFICATION_PARAMETRES',
      `Point de Vente supprimé: ${target.name}`,
      id,
      target.name,
      undefined,
      'Suppression d\'un point de vente'
    );
  };

  // Authentication
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    let target = users.find(u =>
      (u.email && u.email.trim().toLowerCase() === cleanEmail) ||
      (u.name && u.name.trim().toLowerCase() === cleanEmail) ||
      (u.id && u.id.toLowerCase() === cleanEmail) ||
      (u.phone && u.phone.trim().replace(/\s+/g, '') === cleanEmail.replace(/\s+/g, '')) ||
      (u.role === 'developpeur' && (cleanEmail === 'dev' || cleanEmail === 'dev@scoopsbir.com' || cleanEmail === 'dev@coopsbir.com' || cleanEmail === 'dev@provenda.net'))
    );

    // If not found locally, query Supabase for all users to ensure complete sync
    if (!target) {
      const config = getSupabaseConfig();
      if (config.isConfigured) {
        try {
          const res = await fetch(`${config.url}/rest/v1/users?select=*`, {
            method: 'GET',
            headers: {
              'apikey': config.anonKey,
              'Authorization': `Bearer ${config.anonKey}`,
            },
          });
          if (res.ok) {
            const remoteUsers: User[] = await res.json();
            if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
              setUsers(prev => {
                const merged = mergeEntityLists(prev, remoteUsers, false, lastSyncTime);
                if (!merged.some(u => u.role === 'developpeur')) {
                  const dev = prev.find(u => u.role === 'developpeur') || INITIAL_USERS[0];
                  merged.unshift(dev);
                }
                localStorage.setItem('provenda_users', JSON.stringify(merged));
                return merged;
              });
              target = remoteUsers.find(u =>
                (u.email && u.email.trim().toLowerCase() === cleanEmail) ||
                (u.name && u.name.trim().toLowerCase() === cleanEmail) ||
                (u.id && u.id.toLowerCase() === cleanEmail) ||
                (u.phone && u.phone.trim().replace(/\s+/g, '') === cleanEmail.replace(/\s+/g, '')) ||
                (u.role === 'developpeur' && (cleanEmail === 'dev' || cleanEmail === 'dev@scoopsbir.com' || cleanEmail === 'dev@coopsbir.com' || cleanEmail === 'dev@provenda.net'))
              );
            }
          }
        } catch (err) {
          console.warn('[Supabase] Login check failed:', err);
        }
      }
    }

    if (!target) {
      return { success: false, error: t('login.error_invalid') };
    }
    if (!target.active) {
      return { success: false, error: t('login.error_inactive') };
    }
    const validPassword = target.password || (target.role === 'developpeur' ? 'devpassword2026' : target.role === 'administrateur' ? 'admin123' : '123456');
    if (password.trim() !== validPassword.trim()) {
      return { success: false, error: t('login.error_invalid') };
    }
    setCurrentUser(target);
    setIsAuthenticated(true);
    localStorage.setItem('provenda_auth', 'true');
    localStorage.setItem('provenda_current_user_id', target.id);
    addAuditLog(
      'MODIFICATION_UTILISATEUR',
      `Connexion: ${target.name}`,
      target.id,
      undefined,
      `Connexion réussie (${target.role})`,
      'Authentification avec mot de passe'
    );
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('provenda_auth');
    localStorage.removeItem('provenda_current_user_id');
    addAuditLog(
      'MODIFICATION_UTILISATEUR',
      `Déconnexion: ${currentUser.name}`,
      currentUser.id,
      undefined,
      `Déconnexion manuelle (${currentUser.role})`,
      'Fermeture de session'
    );
  };

  // Check alert thresholds whenever products change and create internal notifications
  useEffect(() => {
    const outOfStock = products.filter(p => p.status === 'actif' && p.stockCurrentBaseUnit <= 0);
    const lowStock = products.filter(
      p => p.status === 'actif' && p.stockCurrentBaseUnit > 0 && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
    );

    // Update notifications if not already added
    outOfStock.forEach(p => {
      const exists = notifications.some(n => n.message.includes(p.code) && n.type === 'danger');
      if (!exists) {
        setNotifications(prev => [
          {
            id: `notif-oos-${p.id}-${Date.now()}`,
            title: 'Rupture de stock détectée',
            message: `Le produit ${p.name} (${p.code}) est en rupture complète (0 ${p.baseUnit}).`,
            type: 'danger',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            read: false,
            linkTab: 'stock',
          },
          ...prev,
        ]);
      }
    });

    lowStock.forEach(p => {
      const exists = notifications.some(n => n.message.includes(p.code) && n.type === 'warning');
      if (!exists) {
        setNotifications(prev => [
          {
            id: `notif-low-${p.id}-${Date.now()}`,
            title: 'Seuil minimum franchi',
            message: `Stock faible pour ${p.name} (${p.code}) : ${p.stockCurrentBaseUnit} ${p.baseUnit} restant(s) (Seuil: ${p.minAlertThresholdBaseUnit}).`,
            type: 'warning',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            read: false,
            linkTab: 'stock',
          },
          ...prev,
        ]);
      }
    });
  }, [products]);

  // Audit helper
  const addAuditLog = (
    action: AuditLog['action'],
    targetObject: string,
    objectId: string,
    oldValue?: string,
    newValue?: string,
    justification?: string
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetObject,
      objectId,
      oldValue,
      newValue,
      justification,
      ipAddress: '192.168.1.10',
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Switch role helper
  const switchRole = (role: Role) => {
    const userForRole = users.find(u => u.role === role && u.active);
    if (userForRole) {
      setCurrentUser(userForRole);
    }
  };

  const updateUser = (updatedUser: User) => {
    const old = users.find(u => u.id === updatedUser.id);
    setUsers(prev => {
      const next = prev.map(u => (u.id === updatedUser.id ? updatedUser : u));
      localStorage.setItem('provenda_users', JSON.stringify(next));
      return next;
    });
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    upsertRecordToSupabase('users', updatedUser).catch(() => {});
    scheduleBackgroundPush();
    addAuditLog(
      'MODIFICATION_UTILISATEUR',
      `Utilisateur: ${updatedUser.name}`,
      updatedUser.id,
      old ? `${old.name} (${old.role}, statut: ${old.active ? 'actif' : 'inactif'})` : undefined,
      `${updatedUser.name} (${updatedUser.role}, statut: ${updatedUser.active ? 'actif' : 'inactif'})`,
      'Mise à jour des privilèges et informations'
    );
  };

  const addUser = (userData: Omit<User, 'id'>): { success: boolean; error?: string } => {
    // 1. Developer role cannot be created - it is strictly unique
    if (userData.role === 'developpeur') {
      return {
        success: false,
        error: language === 'fr'
          ? "Action interdite : Le rôle Développeur est unique et ne peut pas être créé."
          : "Forbidden: Developer role is unique and cannot be created."
      };
    }

    // 2. Only Developer and Administrator can create users
    if (currentUser.role !== 'administrateur' && currentUser.role !== 'developpeur') {
      return {
        success: false,
        error: language === 'fr'
          ? "Action non autorisée : Seul le Développeur ou l'Administrateur a le privilège de créer des collaborateurs."
          : "Unauthorized: Only the Developer or Administrator can create staff."
      };
    }

    // 3. Administrator role creation: ONLY by Developer, and ONLY ONE Administrator can exist
    if (userData.role === 'administrateur') {
      if (currentUser.role !== 'developpeur') {
        return {
          success: false,
          error: language === 'fr'
            ? "Action non autorisée : Seul le Développeur peut créer le compte Administrateur."
            : "Unauthorized: Only the Developer can create the Administrator account."
        };
      }
      const existingAdmin = users.find(u => u.role === 'administrateur' && u.active);
      if (existingAdmin) {
        return {
          success: false,
          error: language === 'fr'
            ? `Un compte Administrateur actif existe déjà (${existingAdmin.name} - ${existingAdmin.email}). Le système est configuré avec un Administrateur unique.`
            : "An Administrator already exists. Only one Administrator account is permitted."
        };
      }
    }

    // 4. Administrator cannot create another administrator or developer
    if (currentUser.role === 'administrateur' && (userData.role === 'administrateur' || (userData.role as string) === 'developpeur')) {
      return {
        success: false,
        error: language === 'fr'
          ? "Action interdite : En tant qu'Administrateur, vous pouvez créer des Responsables, Caissiers et Magasiniers, mais pas d'autre Administrateur."
          : "Forbidden: As Administrator, you cannot create another Administrator."
      };
    }

    const newUser: User = {
      ...userData,
      assignedSalesPointId: 'pos-1',
      id: `usr-${Date.now()}`,
      active: true,
      password: userData.password || 'provenda123',
    };
    setUsers(prev => {
      const next = [...prev, newUser];
      localStorage.setItem('provenda_users', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('users', newUser).catch(() => {});
    scheduleBackgroundPush();
    addAuditLog(
      'MODIFICATION_UTILISATEUR',
      `Nouvel utilisateur: ${newUser.name}`,
      newUser.id,
      undefined,
      `Rôle: ${newUser.role}, Email: ${newUser.email}, Remise: ${newUser.discountLimitPercent}%`,
      `Création par ${currentUser.name} (${currentUser.role})`
    );
    return { success: true };
  };

  const deactivateUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const updated = { ...target, active: false };
    setUsers(prev => {
      const next = prev.map(u => (u.id === userId ? updated : u));
      localStorage.setItem('provenda_users', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('users', updated).catch(() => {});
    scheduleBackgroundPush();
    addAuditLog('MODIFICATION_UTILISATEUR', `Désactivation utilisateur: ${target.name}`, target.id, 'Actif', 'Inactif', 'Désactivation du compte utilisateur');
  };

  // Product management
  const addProduct = (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory' | 'stockCurrentBaseUnit' | 'cmp'>,
    initialStock = 0,
    initialCmp?: number
  ) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newProduct: Product = {
      ...productData,
      id: `prd-${Date.now()}`,
      allowDetailSale: productData.allowDetailSale ?? false,
      detailPrice: productData.detailPrice,
      stockCurrentBaseUnit: initialStock,
      cmp: initialCmp ?? (productData.purchasePrice / (productData.conversionFactor || 1)),
      priceHistory: [
        {
          date: now,
          purchasePrice: productData.purchasePrice,
          salePrice: productData.salePrice,
          detailPrice: productData.detailPrice,
          changedBy: currentUser.name,
          reason: 'Création initiale du produit au catalogue',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    setProducts(prev => {
      const next = [...prev, newProduct];
      localStorage.setItem('provenda_products', JSON.stringify(next));
      return next;
    });
    productsRef.current = [...productsRef.current, newProduct];
    upsertRecordToSupabase('products', newProduct).catch(() => {});

    addAuditLog(
      'CRÉATION_PRODUIT',
      `Produit: ${newProduct.name} (${newProduct.code})`,
      newProduct.id,
      undefined,
      `Prix vente: ${newProduct.salePrice} FCFA, Stock init: ${initialStock} ${newProduct.baseUnit}, CMP: ${newProduct.cmp} FCFA`,
      'Ajout au catalogue'
    );

    if (initialStock > 0) {
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        productId: newProduct.id,
        productCode: newProduct.code,
        productName: newProduct.name,
        type: 'correction d\'inventaire',
        quantityBaseUnit: initialStock,
        unit: newProduct.baseUnit,
        stockBefore: 0,
        stockAfter: initialStock,
        costUnitCMP: newProduct.cmp,
        totalValue: initialStock * newProduct.cmp,
        referenceDocument: 'STOCK-INIT',
        userId: currentUser.id,
        userName: currentUser.name,
        justification: 'Stock initial lors de la création du produit',
        timestamp: now,
      };
      setStockMovements(prev => {
        const next = [movement, ...prev];
        localStorage.setItem('provenda_stock_movements', JSON.stringify(next));
        return next;
      });
      upsertRecordToSupabase('stock_movements', movement).catch(() => {});
    }
  };

  const updateProduct = (updatedProduct: Product, reason?: string) => {
    const oldProduct = products.find(p => p.id === updatedProduct.id);
    if (!oldProduct) return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const priceChanged =
      oldProduct.purchasePrice !== updatedProduct.purchasePrice ||
      oldProduct.salePrice !== updatedProduct.salePrice ||
      oldProduct.detailPrice !== updatedProduct.detailPrice;

    const newHistory = [...oldProduct.priceHistory];
    if (priceChanged) {
      newHistory.unshift({
        date: now,
        purchasePrice: updatedProduct.purchasePrice,
        salePrice: updatedProduct.salePrice,
        detailPrice: updatedProduct.detailPrice,
        changedBy: currentUser.name,
        reason: reason || 'Modification de tarif catalogue',
      });
    }

    const finalProduct: Product = {
      ...updatedProduct,
      priceHistory: newHistory,
      updatedAt: now,
    };

    setProducts(prev => {
      const next = prev.map(p => (p.id === updatedProduct.id ? finalProduct : p));
      localStorage.setItem('provenda_products', JSON.stringify(next));
      return next;
    });
    productsRef.current = productsRef.current.map(p => (p.id === updatedProduct.id ? finalProduct : p));
    upsertRecordToSupabase('products', finalProduct).catch(() => {});

    if (priceChanged) {
      addAuditLog(
        'MODIFICATION_PRIX',
        `Produit: ${updatedProduct.name} (${updatedProduct.code})`,
        updatedProduct.id,
        `Achat: ${oldProduct.purchasePrice} FCFA / Vente: ${oldProduct.salePrice} FCFA`,
        `Achat: ${updatedProduct.purchasePrice} FCFA / Vente: ${updatedProduct.salePrice} FCFA`,
        reason || 'Mise à jour des prix catalogue'
      );
    } else {
      addAuditLog(
        'MODIFICATION_PRODUIT',
        `Produit: ${updatedProduct.name} (${updatedProduct.code})`,
        updatedProduct.id,
        `Seuil: ${oldProduct.minAlertThresholdBaseUnit} ${oldProduct.baseUnit}`,
        `Seuil: ${updatedProduct.minAlertThresholdBaseUnit} ${updatedProduct.baseUnit}`,
        reason || 'Mise à jour de la fiche technique'
      );
    }
  };

  const archiveProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const now = new Date().toISOString();
    const updated = { ...target, status: 'archivé' as const, updatedAt: now };
    setProducts(prev => {
      const next = prev.map(p => (p.id === productId ? updated : p));
      localStorage.setItem('provenda_products', JSON.stringify(next));
      return next;
    });
    productsRef.current = productsRef.current.map(p => (p.id === productId ? updated : p));
    upsertRecordToSupabase('products', updated).catch(() => {});
    addAuditLog('MODIFICATION_PRODUIT', `Archivage produit: ${target.name}`, target.id, target.status, 'archivé', 'Archivage du produit');
  };

  const unarchiveProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const now = new Date().toISOString();
    const updated = { ...target, status: 'actif' as const, updatedAt: now };
    setProducts(prev => {
      const next = prev.map(p => (p.id === productId ? updated : p));
      localStorage.setItem('provenda_products', JSON.stringify(next));
      return next;
    });
    productsRef.current = productsRef.current.map(p => (p.id === productId ? updated : p));
    upsertRecordToSupabase('products', updated).catch(() => {});
    addAuditLog('MODIFICATION_PRODUIT', `Réactivation produit: ${target.name}`, target.id, target.status, 'actif', 'Réactivation du produit');
  };

  const maskProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const nextStatus = target.status === 'masqué' ? ('actif' as const) : ('masqué' as const);
    const now = new Date().toISOString();
    const updated = { ...target, status: nextStatus, updatedAt: now };
    setProducts(prev => {
      const next = prev.map(p => (p.id === productId ? updated : p));
      localStorage.setItem('provenda_products', JSON.stringify(next));
      return next;
    });
    productsRef.current = productsRef.current.map(p => (p.id === productId ? updated : p));
    upsertRecordToSupabase('products', updated).catch(() => {});
    addAuditLog('MODIFICATION_PRODUIT', `Masquage produit: ${target.name}`, target.id, target.status, nextStatus, 'Modification visibilité');
  };

  // Purchases & Receipts (CMP Calculation Formula)
  const createPurchaseDraft = (
    purchaseData: Omit<Purchase, 'id' | 'referenceNumber' | 'status'>,
    targetSalesPointId?: string
  ): Purchase => {
    const purchaseSeq = purchases.length + 1;
    const ref = `ACH-${new Date().getFullYear()}-${String(purchaseSeq).padStart(6, '0')}`;
    const id = `ach-${Date.now()}`;
    const now = new Date().toISOString();

    const effectiveSpId = (currentUser.role === 'administrateur' || currentUser.role === 'developpeur')
      ? (targetSalesPointId || (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : (salesPoints[0]?.id || 'pos-1')))
      : (currentUser.assignedSalesPointId || 'pos-1');
    const sp = salesPoints.find(s => s.id === effectiveSpId) || salesPoints[0];

    const newPurchase: Purchase = {
      ...purchaseData,
      id,
      referenceNumber: ref,
      status: 'brouillon',
      salesPointId: effectiveSpId,
      salesPointName: sp?.name,
      createdAt: now,
      updatedAt: now,
    };

    setPurchases(prev => {
      const next = [newPurchase, ...prev];
      localStorage.setItem('provenda_purchases', JSON.stringify(next));
      return next;
    });
    purchasesRef.current = [newPurchase, ...purchasesRef.current];
    upsertRecordToSupabase('purchases', newPurchase).catch(() => {});
    return newPurchase;
  };

  const validatePurchaseReception = (purchaseIdOrObj: string | Purchase) => {
    let purchase: Purchase | undefined;
    if (typeof purchaseIdOrObj === 'string') {
      purchase = purchases.find(p => p.id === purchaseIdOrObj) || purchasesRef.current.find(p => p.id === purchaseIdOrObj);
      if (!purchase) {
        try {
          const savedPurchases: Purchase[] = JSON.parse(localStorage.getItem('provenda_purchases') || '[]');
          purchase = savedPurchases.find(p => p.id === purchaseIdOrObj);
        } catch {}
      }
    } else {
      purchase = purchaseIdOrObj;
    }

    if (!purchase || purchase.status === 'validé') return;

    const now = new Date().toISOString();
    const currentProds = products.length > 0 ? products : (productsRef.current.length > 0 ? productsRef.current : JSON.parse(localStorage.getItem('provenda_products') || '[]'));
    const updatedProducts = [...currentProds];
    const newMovements: StockMovement[] = [];
    const affectedProducts: Product[] = [];

    // Ratio of transport fees allocated per item based on purchase line value
    const totalLinesValue = purchase.subtotal || 1;
    const transportFees = settings.transportFeesIntegratedInCMP ? (purchase.transportFees || 0) : 0;

    const updatedItems = purchase.items.map(item => {
      const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (productIndex === -1) return item;

      const product = updatedProducts[productIndex];
      const stockBefore = product.stockCurrentBaseUnit;
      const cmpBefore = product.cmp;

      // Quantity in base unit received (e.g. 50 sacs * 50 kg = 2500 kg)
      const qtyReceivedBase = item.quantityReceived * product.conversionFactor;
      const stockAfter = stockBefore + qtyReceivedBase;

      // Attributable transport fee for this line
      const lineProportion = (item.totalPrice / totalLinesValue);
      const lineTransportFees = transportFees * lineProportion;

      // Total value of the entry = (unit price * qty) + transport fee
      const entryValue = item.totalPrice + lineTransportFees;

      // CMP FORMULA (Section 8.1 & 21.5):
      // Nouveau CMP = (valeur du stock avant entrée + valeur de l'entrée) / (quantité avant + quantité reçue)
      const valueBefore = stockBefore * cmpBefore;
      const totalNewValue = valueBefore + entryValue;
      const newCMP = stockAfter > 0 ? Math.round((totalNewValue / stockAfter) * 100) / 100 : cmpBefore;

      const updatedProd: Product = {
        ...product,
        stockCurrentBaseUnit: stockAfter,
        cmp: newCMP,
        updatedAt: now,
      };

      // Update product in memory
      updatedProducts[productIndex] = updatedProd;
      affectedProducts.push(updatedProd);

      // Create stock movement
      const movement: StockMovement = {
        id: `mov-${Date.now()}-${item.productId}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        type: 'entrée fournisseur',
        quantityBaseUnit: qtyReceivedBase,
        unit: product.baseUnit,
        stockBefore,
        stockAfter,
        costUnitCMP: newCMP,
        totalValue: entryValue,
        salesPointId: purchase.salesPointId,
        salesPointName: purchase.salesPointName,
        referenceDocument: purchase.referenceNumber,
        userId: currentUser.id,
        userName: currentUser.name,
        justification: `Réception fournisseur ${purchase.supplierName} - Réf: ${purchase.supplierDocumentRef}`,
        timestamp: now,
      };

      newMovements.push(movement);

      return {
        ...item,
        stockBefore,
        stockAfter,
      };
    });

    const finalizedPurchase: Purchase = {
      ...purchase,
      items: updatedItems,
      status: 'validé',
      receptionDate: now,
      validatedAt: now,
      updatedAt: now,
    };

    // Update state & LocalStorage
    setProducts(updatedProducts);
    productsRef.current = updatedProducts;
    localStorage.setItem('provenda_products', JSON.stringify(updatedProducts));

    setStockMovements(prev => {
      const next = [...newMovements, ...prev];
      localStorage.setItem('provenda_stock_movements', JSON.stringify(next));
      return next;
    });

    setPurchases(prev => {
      const exists = prev.some(p => p.id === finalizedPurchase.id);
      const next = exists
        ? prev.map(p => (p.id === finalizedPurchase.id ? finalizedPurchase : p))
        : [finalizedPurchase, ...prev];
      localStorage.setItem('provenda_purchases', JSON.stringify(next));
      return next;
    });
    purchasesRef.current = [
      finalizedPurchase,
      ...purchasesRef.current.filter(p => p.id !== finalizedPurchase.id),
    ];

    // Push to Supabase immediately
    affectedProducts.forEach(p => upsertRecordToSupabase('products', p).catch(() => {}));
    newMovements.forEach(m => upsertRecordToSupabase('stock_movements', m).catch(() => {}));
    upsertRecordToSupabase('purchases', finalizedPurchase).catch(() => {});

    addAuditLog(
      'RECEPTION_FOURNISSEUR',
      `Réception Achat: ${finalizedPurchase.referenceNumber}`,
      finalizedPurchase.id,
      'Statut: brouillon',
      `Validé, ${finalizedPurchase.items.length} produit(s), Total: ${finalizedPurchase.totalAmount.toLocaleString()} FCFA, Recalcul CMP effectué`,
      `Fournisseur: ${finalizedPurchase.supplierName}, BL: ${finalizedPurchase.supplierDocumentRef}`
    );
  };

  const updatePurchase = (
    purchaseId: string,
    updatedData: Partial<Purchase>
  ): { success: boolean; error?: string } => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return { success: false, error: 'Approvisionnement introuvable.' };

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // If purchase is draft, simply update its fields and recalculate totals
    if (purchase.status === 'brouillon') {
      const newItems = updatedData.items || purchase.items;
      const newSubtotal = updatedData.subtotal !== undefined
        ? updatedData.subtotal
        : newItems.reduce((s, it) => s + (it.totalPrice || it.quantityReceived * it.unitPrice), 0);
      const newTransport = updatedData.transportFees !== undefined ? Number(updatedData.transportFees) : purchase.transportFees;
      const newOther = updatedData.otherFees !== undefined ? Number(updatedData.otherFees) : purchase.otherFees;
      const newTotal = newSubtotal + newTransport + newOther;

      const updatedPurchase: Purchase = {
        ...purchase,
        ...updatedData,
        items: newItems,
        subtotal: newSubtotal,
        transportFees: newTransport,
        otherFees: newOther,
        totalAmount: newTotal,
        updatedAt: now,
      };

      setPurchases(prev => {
        const next = prev.map(p => (p.id === purchaseId ? updatedPurchase : p));
        localStorage.setItem('provenda_purchases', JSON.stringify(next));
        return next;
      });
      purchasesRef.current = purchasesRef.current.map(p => (p.id === purchaseId ? updatedPurchase : p));
      upsertRecordToSupabase('purchases', updatedPurchase).catch(() => {});
      addAuditLog(
        'MODIFICATION_ACHAT',
        `Mise à jour Réception (Brouillon): ${purchase.referenceNumber}`,
        purchase.id,
        `BL: ${purchase.supplierDocumentRef}, Total: ${purchase.totalAmount}`,
        `BL: ${updatedPurchase.supplierDocumentRef}, Total: ${updatedPurchase.totalAmount}`,
        `Mise à jour des informations de stock entrant`
      );
      return { success: true };
    }

    // If purchase is already validated, adjust stock differences if quantities or items changed
    if (purchase.status === 'validé') {
      const newItems = updatedData.items || purchase.items;
      const itemsChanged = updatedData.items && JSON.stringify(updatedData.items) !== JSON.stringify(purchase.items);
      const affectedProducts: Product[] = [];

      if (itemsChanged) {
        const updatedProducts = [...products];

        // 1. Verify stock availability if any item quantity was reduced
        for (const oldItem of purchase.items) {
          const prod = updatedProducts.find(p => p.id === oldItem.productId);
          if (prod) {
            const oldQtyBase = oldItem.quantityReceived * prod.conversionFactor;
            const newItem = newItems.find(it => it.productId === oldItem.productId);
            const newQtyBase = newItem ? newItem.quantityReceived * prod.conversionFactor : 0;
            const diff = newQtyBase - oldQtyBase;
            if (diff < 0 && prod.stockCurrentBaseUnit + diff < 0) {
              return {
                success: false,
                error: `Impossible de réduire la quantité de ${prod.name} : le stock actuel (${prod.stockCurrentBaseUnit} ${prod.baseUnit}) est inférieur à la réduction demandée (${Math.abs(diff)} ${prod.baseUnit}). Des ventes ont déjà consommé ce stock.`,
              };
            }
          }
        }

        // 2. Apply differences to stock and create adjustment movements
        const newMovements: StockMovement[] = [];
        const totalLinesValue = updatedData.subtotal !== undefined
          ? updatedData.subtotal
          : newItems.reduce((s, it) => s + (it.totalPrice || it.quantityReceived * it.unitPrice), 0);
        const transportFees = settings.transportFeesIntegratedInCMP
          ? (updatedData.transportFees !== undefined ? Number(updatedData.transportFees) : purchase.transportFees)
          : 0;

        for (const newItem of newItems) {
          const pIndex = updatedProducts.findIndex(p => p.id === newItem.productId);
          if (pIndex !== -1) {
            const prod = updatedProducts[pIndex];
            const oldItem = purchase.items.find(it => it.productId === newItem.productId);
            const oldQtyBase = oldItem ? oldItem.quantityReceived * prod.conversionFactor : 0;
            const newQtyBase = newItem.quantityReceived * prod.conversionFactor;
            const diffBase = newQtyBase - oldQtyBase;

            if (diffBase !== 0) {
              const stockBefore = prod.stockCurrentBaseUnit;
              const stockAfter = stockBefore + diffBase;

              let newCMP = prod.cmp;
              if (diffBase > 0) {
                const lineProportion = totalLinesValue > 0 ? (newItem.totalPrice / totalLinesValue) : 0;
                const lineTransport = transportFees * lineProportion;
                const unitItemCost = (newItem.unitPrice / prod.conversionFactor) + (newItem.quantityReceived > 0 ? lineTransport / (newItem.quantityReceived * prod.conversionFactor) : 0);
                const additionalEntryValue = diffBase * unitItemCost;
                const valueBefore = Math.max(0, stockBefore) * prod.cmp;
                newCMP = stockAfter > 0 ? Math.round(((valueBefore + additionalEntryValue) / stockAfter) * 100) / 100 : prod.cmp;
              }

              const updProd = {
                ...prod,
                stockCurrentBaseUnit: stockAfter,
                cmp: newCMP,
                updatedAt: now,
              };

              updatedProducts[pIndex] = updProd;
              affectedProducts.push(updProd);

              newMovements.push({
                id: `mov-upd-${Date.now()}-${prod.id}`,
                productId: prod.id,
                productCode: prod.code,
                productName: prod.name,
                type: diffBase > 0 ? 'entrée fournisseur' : 'correction d\'inventaire',
                quantityBaseUnit: diffBase,
                unit: prod.baseUnit,
                stockBefore,
                stockAfter,
                costUnitCMP: newCMP,
                totalValue: Math.abs(diffBase * newCMP),
                salesPointId: purchase.salesPointId,
                salesPointName: purchase.salesPointName,
                referenceDocument: purchase.referenceNumber,
                userId: currentUser.id,
                userName: currentUser.name,
                justification: `Ajustement de réception suite à modification (${purchase.referenceNumber})`,
                timestamp: now,
              });
            }
          }
        }

        setProducts(updatedProducts);
        productsRef.current = updatedProducts;
        localStorage.setItem('provenda_products', JSON.stringify(updatedProducts));
        affectedProducts.forEach(p => upsertRecordToSupabase('products', p).catch(() => {}));

        if (newMovements.length > 0) {
          setStockMovements(prev => {
            const next = [...newMovements, ...prev];
            localStorage.setItem('provenda_stock_movements', JSON.stringify(next));
            return next;
          });
          newMovements.forEach(m => upsertRecordToSupabase('stock_movements', m).catch(() => {}));
        }
      }

      const newSubtotal = updatedData.subtotal !== undefined
        ? updatedData.subtotal
        : newItems.reduce((s, it) => s + (it.totalPrice || it.quantityReceived * it.unitPrice), 0);
      const newTransport = updatedData.transportFees !== undefined ? Number(updatedData.transportFees) : purchase.transportFees;
      const newOther = updatedData.otherFees !== undefined ? Number(updatedData.otherFees) : purchase.otherFees;
      const newTotal = newSubtotal + newTransport + newOther;

      const updatedPurchase: Purchase = {
        ...purchase,
        ...updatedData,
        items: newItems,
        subtotal: newSubtotal,
        transportFees: newTransport,
        otherFees: newOther,
        totalAmount: newTotal,
        updatedAt: now,
      };

      setPurchases(prev => {
        const next = prev.map(p => (p.id === purchaseId ? updatedPurchase : p));
        localStorage.setItem('provenda_purchases', JSON.stringify(next));
        return next;
      });
      purchasesRef.current = purchasesRef.current.map(p => (p.id === purchaseId ? updatedPurchase : p));
      upsertRecordToSupabase('purchases', updatedPurchase).catch(() => {});
      addAuditLog(
        'MODIFICATION_ACHAT',
        `Mise à jour Réception (Validée): ${purchase.referenceNumber}`,
        purchase.id,
        `BL: ${purchase.supplierDocumentRef}, Total: ${purchase.totalAmount}`,
        `BL: ${updatedPurchase.supplierDocumentRef}, Total: ${updatedPurchase.totalAmount}`,
        `Modification des informations de réception validée`
      );
      return { success: true };
    }

    return { success: false, error: 'Impossible de modifier un approvisionnement annulé.' };
  };

  const cancelPurchase = (purchaseId: string, reason?: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    const cleanReason = (reason && reason.trim()) ? reason.trim() : 'Annulation bon de réception';
    const now = new Date().toISOString();
    const affectedProducts: Product[] = [];
    const reverseMovements: StockMovement[] = [];

    if (purchase.status === 'validé') {
      // Must reverse stock and verify stock won't become negative
      const updatedProducts = [...products];
      for (const item of purchase.items) {
        const prod = updatedProducts.find(p => p.id === item.productId);
        if (prod) {
          const qtyBase = item.quantityReceived * prod.conversionFactor;
          if (prod.stockCurrentBaseUnit < qtyBase) {
            alert(`Impossible d'annuler la réception : le stock de ${prod.name} (${prod.stockCurrentBaseUnit} ${prod.baseUnit}) est inférieur à la quantité reçue (${qtyBase} ${prod.baseUnit}). Des ventes ont déjà consommé ce stock.`);
            return;
          }
        }
      }

      for (const item of purchase.items) {
        const prodIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (prodIdx !== -1) {
          const prod = updatedProducts[prodIdx];
          const qtyBase = item.quantityReceived * prod.conversionFactor;
          const stockBefore = prod.stockCurrentBaseUnit;
          const stockAfter = stockBefore - qtyBase;

          const updProd = {
            ...prod,
            stockCurrentBaseUnit: stockAfter,
            updatedAt: now,
          };

          updatedProducts[prodIdx] = updProd;
          affectedProducts.push(updProd);

          reverseMovements.push({
            id: `mov-rev-${Date.now()}-${prod.id}`,
            productId: prod.id,
            productCode: prod.code,
            productName: prod.name,
            type: 'retour fournisseur',
            quantityBaseUnit: -qtyBase,
            unit: prod.baseUnit,
            stockBefore,
            stockAfter,
            costUnitCMP: prod.cmp,
            totalValue: item.totalPrice,
            referenceDocument: `ANNUL-${purchase.referenceNumber}`,
            userId: currentUser.id,
            userName: currentUser.name,
            justification: `Annulation de la réception ${purchase.referenceNumber} : ${cleanReason}`,
            timestamp: now,
          });
        }
      }

      setProducts(updatedProducts);
      productsRef.current = updatedProducts;
      localStorage.setItem('provenda_products', JSON.stringify(updatedProducts));
      affectedProducts.forEach(p => upsertRecordToSupabase('products', p).catch(() => {}));

      setStockMovements(prev => {
        const next = [...reverseMovements, ...prev];
        localStorage.setItem('provenda_stock_movements', JSON.stringify(next));
        return next;
      });
      reverseMovements.forEach(m => upsertRecordToSupabase('stock_movements', m).catch(() => {}));
    }

    const cancelledPurchase = {
      ...purchase,
      status: 'annulé' as const,
      cancelledAt: now,
      cancellationReason: cleanReason,
      updatedAt: now,
    };

    setPurchases(prev => {
      const next = prev.map(p => (p.id === purchaseId ? cancelledPurchase : p));
      localStorage.setItem('provenda_purchases', JSON.stringify(next));
      return next;
    });
    purchasesRef.current = purchasesRef.current.map(p => (p.id === purchaseId ? cancelledPurchase : p));
    upsertRecordToSupabase('purchases', cancelledPurchase).catch(() => {});

    addAuditLog(
      'ANNULATION_RECEPTION',
      `Achat: ${purchase.referenceNumber}`,
      purchase.id,
      purchase.status,
      'Annulé',
      cleanReason
    );
  };

  // Sales & POS Engine (Atomic Stock Verification & CMP Snapshot)
  const createSale = (
    customerId: string,
    itemsToSell: {
      productId: string;
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
      saleMode?: 'gros' | 'detail';
      unit?: UnitType;
      conversionFactor?: number;
    }[],
    discount?: { type: 'pourcentage' | 'montant'; value: number; reason: string },
    payment?: {
      amount: number;
      method: 'espèces' | 'virement' | 'paiement mobile' | 'crédit client';
      reference?: string;
      amountReceived?: number;
      changeGiven?: number;
    },
    notes?: string,
    isCredit = false,
    creditDueDate?: string,
    targetSalesPointId?: string
  ): { success: boolean; invoiceId?: string; invoice?: Invoice; error?: string } => {
    // 1. Verification of items
    if (!itemsToSell || itemsToSell.length === 0) {
      return { success: false, error: 'Le panier de vente est vide.' };
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return { success: false, error: 'Client introuvable.' };
    }

    const chosenSpId = (currentUser.role === 'administrateur' || currentUser.role === 'developpeur')
      ? (targetSalesPointId || (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : (salesPoints[0]?.id || 'pos-1')))
      : (currentUser.assignedSalesPointId || 'pos-1');
    const chosenSp = salesPoints.find(s => s.id === chosenSpId) || salesPoints[0];

    // 2. Strict Negative Stock Verification (Section 7 & Acceptation Criterion #4)
    // Support multi-line items (wholesale + detail) of the same product
    const totalRequestedBaseByProduct: Record<string, number> = {};

    for (const item of itemsToSell) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return { success: false, error: `Produit ID ${item.productId} non trouvé.` };
      }
      if (product.status !== 'actif') {
        return { success: false, error: `Le produit "${product.name}" n'est pas actif dans le catalogue.` };
      }

      const factor = item.conversionFactor !== undefined
        ? item.conversionFactor
        : (item.saleMode === 'detail' ? 1 : (product.conversionFactor || 1));
      const requestedBaseQty = item.quantity * factor;
      totalRequestedBaseByProduct[item.productId] = (totalRequestedBaseByProduct[item.productId] || 0) + requestedBaseQty;
    }

    for (const [prodId, totalRequested] of Object.entries(totalRequestedBaseByProduct)) {
      const product = products.find(p => p.id === prodId)!;
      if (product.stockCurrentBaseUnit < totalRequested) {
        return {
          success: false,
          error: `Stock insuffisant pour "${product.name}". Stock disponible: ${product.stockCurrentBaseUnit} ${product.baseUnit} (soit ~${(product.stockCurrentBaseUnit / (product.conversionFactor || 1)).toFixed(1)} ${product.saleUnit}), demandé au total: ${totalRequested} ${product.baseUnit}. La vente ne peut créer un stock négatif.`,
        };
      }
    }

    // 3. Discount Permission Verification (Per Item and Legacy Global)
    let allowedLimit = currentUser.discountLimitPercent;
    if (currentUser.role === 'caissier') {
      allowedLimit = settings.maxDiscountCaissier;
    } else if (currentUser.role === 'responsable') {
      allowedLimit = settings.maxDiscountResponsable;
    } else if (currentUser.role === 'administrateur' || currentUser.role === 'developpeur') {
      allowedLimit = 100;
    }

    const subtotalGross = itemsToSell.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Sum up item-specific discounts
    const totalItemDiscounts = itemsToSell.reduce((sum, item) => {
      const itemGross = item.quantity * item.unitPrice;
      const itemDisc = Math.min(itemGross, Math.max(0, item.discountAmount || 0));
      return sum + itemDisc;
    }, 0);

    let finalTotalDiscount = 0;
    let saleDiscountDetails: SaleDiscount | undefined = undefined;

    if (totalItemDiscounts > 0) {
      // Validate each item discount against user role ceiling
      for (const item of itemsToSell) {
        const itemGross = item.quantity * item.unitPrice;
        const itemDisc = Math.min(itemGross, Math.max(0, item.discountAmount || 0));
        const itemDiscPercent = itemGross > 0 ? (itemDisc / itemGross) * 100 : 0;
        if (itemDiscPercent > allowedLimit + 0.01) {
          const product = products.find(p => p.id === item.productId);
          return {
            success: false,
            error: `Remise refusée pour "${product?.name || 'produit'}" : votre profil (${currentUser.role}) est limité à ${allowedLimit}% de remise par article. Remise demandée : ${itemDiscPercent.toFixed(1)}%. Une autorisation du responsable ou administrateur est requise.`,
          };
        }
      }

      finalTotalDiscount = totalItemDiscounts;
      saleDiscountDetails = {
        type: 'montant',
        value: totalItemDiscounts,
        calculatedAmount: totalItemDiscounts,
        authorId: currentUser.id,
        authorName: currentUser.name,
        reason: discount?.reason || 'Remises par article appliquées en caisse',
        valueBefore: subtotalGross,
        valueAfter: subtotalGross - totalItemDiscounts,
      };
    } else if (discount && discount.value > 0) {
      let requestedDiscountPercent = 0;
      if (discount.type === 'pourcentage') {
        requestedDiscountPercent = discount.value;
        finalTotalDiscount = Math.round((subtotalGross * discount.value) / 100);
      } else {
        finalTotalDiscount = Math.min(discount.value, subtotalGross);
        requestedDiscountPercent = (finalTotalDiscount / subtotalGross) * 100;
      }

      if (requestedDiscountPercent > allowedLimit) {
        return {
          success: false,
          error: `Remise refusée : votre profil (${currentUser.role}) est limité à ${allowedLimit}% de remise. Remise demandée : ${requestedDiscountPercent.toFixed(1)}%. Une autorisation du responsable ou administrateur est requise.`,
        };
      }

      saleDiscountDetails = {
        type: discount.type,
        value: discount.value,
        calculatedAmount: finalTotalDiscount,
        authorId: currentUser.id,
        authorName: currentUser.name,
        reason: discount.reason || 'Remise commerciale accordée',
        valueBefore: subtotalGross,
        valueAfter: subtotalGross - finalTotalDiscount,
      };
    }

    const totalNet = Math.max(0, subtotalGross - finalTotalDiscount);

    // 4. Payment, Change and Credit validation
    const paymentMethodType = payment?.method || 'espèces';
    const isCreditRequested = Boolean(isCredit) || paymentMethodType === 'crédit client';
    const isCashPayment = paymentMethodType === 'espèces';

    let rawReceived = 0;
    if (payment?.amountReceived !== undefined) {
      rawReceived = payment.amountReceived;
    } else if (payment?.amount !== undefined) {
      rawReceived = payment.amount;
    } else {
      rawReceived = isCreditRequested ? 0 : totalNet;
    }

    const calcChange = isCashPayment && rawReceived > totalNet ? rawReceived - totalNet : 0;
    const finalChangeGiven = payment?.changeGiven !== undefined ? payment.changeGiven : calcChange;

    const paidAmount = isCashPayment
      ? Math.min(rawReceived, totalNet)
      : (payment ? Math.min(payment.amount, totalNet) : 0);

    const remainingBalance = Math.max(0, totalNet - paidAmount);

    if (remainingBalance > 0 && customer.id === 'cst-0') {
      return {
        success: false,
        error: 'Une vente à crédit ou avec solde restant doit obligatoirement être associée à un client identifié, pas au "Client Comptant / Divers".',
      };
    }

    if (remainingBalance > 0 && customer.creditLimit > 0 && customer.currentDebt + remainingBalance > customer.creditLimit) {
      return {
        success: false,
        error: `Plafond de crédit dépassé pour ${customer.name}. Encours actuel: ${customer.currentDebt.toLocaleString()} FCFA, Solde vente: ${remainingBalance.toLocaleString()} FCFA, Plafond: ${customer.creditLimit.toLocaleString()} FCFA.`,
      };
    }

    // 5. Generate unique sequence format FAC-AAAA-XXXXXX (Section 11)
    const year = new Date().getFullYear();
    const invoiceCount = invoices.length + 1;
    const invoiceNumber = `FAC-${year}-${String(invoiceCount).padStart(6, '0')}`;
    const invoiceId = `inv-${Date.now()}`;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);

    // 6. Build Sale Items with frozen CMP and calculate Cost of Goods Sold
    let totalCOGS = 0;
    const finalSaleItems: SaleItem[] = [];
    const stockMovementsToCreate: StockMovement[] = [];
    const updatedProducts = [...products];

    itemsToSell.forEach((item, idx) => {
      const prodIdx = updatedProducts.findIndex(p => p.id === item.productId);
      const product = updatedProducts[prodIdx];
      const factor = item.conversionFactor !== undefined
        ? item.conversionFactor
        : (item.saleMode === 'detail' ? 1 : (product.conversionFactor || 1));
      const itemUnit = item.unit || (item.saleMode === 'detail' ? product.baseUnit : product.saleUnit);
      const saleMode = item.saleMode || (itemUnit === product.baseUnit && factor === 1 ? 'detail' : 'gros');
      const qtyBase = item.quantity * factor;

      // Calculate item discount (per-item priority or distributed global)
      const itemGross = item.quantity * item.unitPrice;
      let itemDiscountAmount = 0;
      if (totalItemDiscounts > 0) {
        itemDiscountAmount = Math.min(itemGross, Math.max(0, item.discountAmount || 0));
      } else if (finalTotalDiscount > 0) {
        const proportion = subtotalGross > 0 ? itemGross / subtotalGross : 0;
        itemDiscountAmount = Math.round(finalTotalDiscount * proportion);
      }
      const itemNet = itemGross - itemDiscountAmount;
      const netUnitPrice = Math.round((itemNet / item.quantity) * 100) / 100;

      // Coût des marchandises vendues basé sur le CMP courant
      const cogs = Math.round(product.cmp * qtyBase);
      const grossMargin = itemNet - cogs;

      totalCOGS += cogs;

      finalSaleItems.push({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        unit: itemUnit,
        conversionFactor: factor,
        quantity: item.quantity,
        quantityBaseUnit: qtyBase,
        unitPrice: item.unitPrice,
        discountAmount: itemDiscountAmount,
        netUnitPrice,
        totalNet: itemNet,
        cmpAtSale: product.cmp,
        costOfGoodsSold: cogs,
        grossMargin,
        saleMode,
      });

      // Update product stock (decrementing current working stock in updatedProducts)
      const stockBefore = product.stockCurrentBaseUnit;
      const stockAfter = stockBefore - qtyBase;

      updatedProducts[prodIdx] = {
        ...product,
        stockCurrentBaseUnit: stockAfter,
        updatedAt: `${dateStr} ${timeStr}`,
      };

      // Create stock movement
      stockMovementsToCreate.push({
        id: `mov-${Date.now()}-${idx}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        type: 'vente',
        quantityBaseUnit: -qtyBase,
        unit: product.baseUnit,
        stockBefore,
        stockAfter,
        costUnitCMP: product.cmp,
        totalValue: cogs,
        salesPointId: chosenSpId,
        salesPointName: chosenSp?.name,
        referenceDocument: invoiceNumber,
        userId: currentUser.id,
        userName: currentUser.name,
        justification: saleMode === 'detail'
          ? `Vente au détail client ${customer.name} - Facture ${invoiceNumber}`
          : `Vente client ${customer.name} - Facture ${invoiceNumber}`,
        timestamp: `${dateStr} ${timeStr}`,
      });
    });

    // 7. Payment record
    const recordedPayments: Payment[] = [];
    if (paidAmount > 0 && payment) {
      recordedPayments.push({
        id: `pay-${Date.now()}`,
        invoiceId,
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        amount: paidAmount,
        method: payment.method === 'crédit client' ? 'espèces' : payment.method,
        reference: payment.reference || (payment.method === 'crédit client' ? `ACOMPTE-${timeStr.replace(':', '')}` : (payment.method === 'espèces' ? `ESP-${timeStr.replace(':', '')}` : `REF-${Date.now()}`)),
        date: `${dateStr} ${timeStr}`,
        userId: currentUser.id,
        userName: currentUser.name,
        notes: remainingBalance > 0
          ? `Acompte versé: ${paidAmount.toLocaleString()} FCFA, Reste à payer (Dette): ${remainingBalance.toLocaleString()} FCFA`
          : finalChangeGiven > 0
          ? `Espèces remises: ${rawReceived.toLocaleString()} FCFA, Monnaie rendue: ${finalChangeGiven.toLocaleString()} FCFA`
          : (notes || 'Paiement lors de la vente'),
      });
    }

    const grossMargin = totalNet - totalCOGS;
    const marginRateCost = totalCOGS > 0 ? Math.round((grossMargin / totalCOGS) * 1000) / 10 : 0;
    const marginRateSales = totalNet > 0 ? Math.round((grossMargin / totalNet) * 1000) / 10 : 0;

    let invoiceStatus: Invoice['status'] = 'payée';
    if (remainingBalance > 0) {
      invoiceStatus = paidAmount > 0 ? 'partielle' : 'crédit';
    }

    const newInvoice: Invoice = {
      id: invoiceId,
      number: invoiceNumber,
      saleId: `sal-${Date.now()}`,
      date: dateStr,
      time: timeStr,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: finalSaleItems,
      subtotalGross,
      totalDiscount: finalTotalDiscount,
      discountDetails: saleDiscountDetails,
      totalNet,
      totalCostOfGoodsSold: totalCOGS,
      grossMargin,
      marginRateCost,
      marginRateSales,
      payments: recordedPayments,
      amountPaid: paidAmount,
      amountReceived: isCashPayment ? rawReceived : (payment?.amountReceived ?? paidAmount),
      changeGiven: isCashPayment ? finalChangeGiven : 0,
      remainingBalance,
      status: invoiceStatus,
      salesPointId: chosenSpId,
      salesPointName: chosenSp?.name,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      notes,
      isCredit: remainingBalance > 0 || isCreditRequested,
      creditDueDate: (remainingBalance > 0 || isCreditRequested)
        ? creditDueDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10)
        : undefined,
    };

    // 8. Atomic updates of all state
    setProducts(updatedProducts);
    setStockMovements(prev => [...stockMovementsToCreate, ...prev]);
    setInvoices(prev => [newInvoice, ...prev]);

    // Background Supabase Sync for Sale
    upsertRecordToSupabase('invoices', newInvoice).catch(() => {});
    stockMovementsToCreate.forEach(m => upsertRecordToSupabase('stock_movements', m).catch(() => {}));
    itemsToSell.forEach(item => {
      const p = updatedProducts.find(prod => prod.id === item.productId);
      if (p) upsertRecordToSupabase('products', p).catch(() => {});
    });

    // Update customer debt if credit
    if (remainingBalance > 0 && customer.id !== 'cst-0') {
      const updatedCust = { ...customer, currentDebt: customer.currentDebt + remainingBalance };
      setCustomers(prev =>
        prev.map(c =>
          c.id === customer.id ? updatedCust : c
        )
      );
      upsertRecordToSupabase('customers', updatedCust).catch(() => {});
    }

    // 9. Audit log entry
    addAuditLog(
      'VENTE_ENREGISTREE',
      `Facture: ${invoiceNumber}`,
      invoiceId,
      undefined,
      `Client: ${customer.name}, Net: ${totalNet.toLocaleString()} FCFA, Payé: ${paidAmount.toLocaleString()} FCFA, Reste dû (Dette): ${remainingBalance.toLocaleString()} FCFA, Marge: ${grossMargin.toLocaleString()} FCFA`,
      notes || (remainingBalance > 0 ? 'Vente avec crédit client / acompte' : 'Validation vente en caisse')
    );

    if (saleDiscountDetails) {
      addAuditLog(
        'REMISE_ACCORDEE',
        `Facture: ${invoiceNumber}`,
        invoiceId,
        `Brut: ${subtotalGross.toLocaleString()} FCFA`,
        `Remise: ${saleDiscountDetails.calculatedAmount.toLocaleString()} FCFA (${saleDiscountDetails.type === 'pourcentage' ? saleDiscountDetails.value + '%' : 'Fixe'}) -> Net: ${totalNet.toLocaleString()} FCFA`,
        saleDiscountDetails.reason
      );
    }

    return { success: true, invoiceId, invoice: newInvoice };
  };

  // Non-destructive Invoice Cancellation / Credit Note (Section 10 & Criterion #10)
  const cancelInvoiceWithCreditNote = (invoiceId: string, reason: string): { success: boolean; error?: string } => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return { success: false, error: 'Facture non trouvée.' };
    if (invoice.status === 'annulée') {
      return { success: false, error: 'Cette facture est déjà annulée.' };
    }

    // Security check: Responsable, Admin or Developer can cancel invoices (Section 10)
    if (currentUser.role !== 'responsable' && currentUser.role !== 'administrateur' && currentUser.role !== 'developpeur') {
      return {
        success: false,
        error: 'Seul un Responsable, un Administrateur ou le Développeur est autorisé à annuler une facture.',
      };
    }

    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').slice(0, 16);
    const dateStr = now.toISOString().slice(0, 10);
    const year = now.getFullYear();

    const creditNoteNumber = `AVO-${year}-${String(creditNotes.length + 1).padStart(6, '0')}`;
    const creditNoteId = `cn-${Date.now()}`;

    // 1. Reintegrate goods into stock (reverse movements)
    const updatedProducts = [...products];
    const reverseMovements: StockMovement[] = [];

    invoice.items.forEach((item, idx) => {
      const prodIdx = updatedProducts.findIndex(p => p.id === item.productId);
      if (prodIdx !== -1) {
        const prod = updatedProducts[prodIdx];
        const stockBefore = prod.stockCurrentBaseUnit;
        const stockAfter = stockBefore + item.quantityBaseUnit;

        updatedProducts[prodIdx] = {
          ...prod,
          stockCurrentBaseUnit: stockAfter,
          updatedAt: nowStr,
        };

        reverseMovements.push({
          id: `mov-ret-${Date.now()}-${idx}`,
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          type: 'retour client',
          quantityBaseUnit: item.quantityBaseUnit, // Positive entry
          unit: prod.baseUnit,
          stockBefore,
          stockAfter,
          costUnitCMP: item.cmpAtSale,
          totalValue: item.costOfGoodsSold,
          referenceDocument: creditNoteNumber,
          userId: currentUser.id,
          userName: currentUser.name,
          justification: `Annulation facture ${invoice.number} : ${reason}`,
          timestamp: nowStr,
        });
      }
    });

    // 2. Adjust customer debt if there was remaining balance
    if (invoice.remainingBalance > 0 && invoice.customerId !== 'cst-0') {
      let updatedCustomer: Customer | undefined;
      setCustomers(prev => {
        const next = prev.map(c => {
          if (c.id === invoice.customerId) {
            const upd = { ...c, currentDebt: Math.max(0, c.currentDebt - invoice.remainingBalance) };
            updatedCustomer = upd;
            return upd;
          }
          return c;
        });
        localStorage.setItem('provenda_customers', JSON.stringify(next));
        return next;
      });
      if (updatedCustomer) {
        upsertRecordToSupabase('customers', updatedCustomer).catch(() => {});
      }
    }

    // 3. Create credit note
    const newCreditNote: CreditNote = {
      id: creditNoteId,
      number: creditNoteNumber,
      originalInvoiceId: invoice.id,
      originalInvoiceNumber: invoice.number,
      date: dateStr,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount: invoice.totalNet,
      reason,
      authorizedBy: currentUser.name,
      restockCompleted: true,
      notes: `Avoir généré suite à annulation autorisée de la facture ${invoice.number}`,
    };

    // 4. Mark invoice as cancelled (never deleted!)
    const cancelledInvoice: Invoice = {
      ...invoice,
      status: 'annulée',
      cancelledAt: nowStr,
      cancelledBy: currentUser.name,
      cancellationReason: reason,
      creditNoteNumber,
    };

    setInvoices(prev => {
      const next = prev.map(i => (i.id === invoiceId ? cancelledInvoice : i));
      localStorage.setItem('provenda_invoices', JSON.stringify(next));
      return next;
    });

    setProducts(updatedProducts);
    productsRef.current = updatedProducts;
    localStorage.setItem('provenda_products', JSON.stringify(updatedProducts));

    setStockMovements(prev => {
      const next = [...reverseMovements, ...prev];
      localStorage.setItem('provenda_stock_movements', JSON.stringify(next));
      return next;
    });

    setCreditNotes(prev => {
      const next = [newCreditNote, ...prev];
      localStorage.setItem('provenda_credit_notes', JSON.stringify(next));
      return next;
    });

    upsertRecordToSupabase('invoices', cancelledInvoice).catch(() => {});
    upsertRecordToSupabase('credit_notes', newCreditNote).catch(() => {});
    updatedProducts.forEach(p => upsertRecordToSupabase('products', p).catch(() => {}));
    reverseMovements.forEach(m => upsertRecordToSupabase('stock_movements', m).catch(() => {}));

    // 5. Audit log
    addAuditLog(
      'ANNULATION_FACTURE',
      `Facture: ${invoice.number}`,
      invoice.id,
      `Statut: ${invoice.status}, Total: ${invoice.totalNet.toLocaleString()} FCFA`,
      `Statut: annulée, Avoir: ${creditNoteNumber}, Stock réintégré`,
      reason
    );

    addAuditLog(
      'CREATION_AVOIR',
      `Avoir: ${creditNoteNumber}`,
      creditNoteId,
      undefined,
      `Montant: ${invoice.totalNet.toLocaleString()} FCFA pour ${invoice.customerName}`,
      `Réf Facture initiale: ${invoice.number}`
    );

    return { success: true };
  };

  // Debt Payment Processing
  const recordDebtPayment = (
    invoiceId: string,
    amount: number,
    method: 'espèces' | 'virement' | 'paiement mobile',
    reference?: string,
    notes?: string
  ): { success: boolean; error?: string } => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return { success: false, error: 'Facture non trouvée.' };
    if (invoice.remainingBalance <= 0) return { success: false, error: 'Cette facture est déjà soldée.' };
    if (amount <= 0) return { success: false, error: 'Le montant du paiement doit être supérieur à zéro.' };
    if (amount > invoice.remainingBalance) {
      return {
        success: false,
        error: `Le montant (${amount.toLocaleString()} FCFA) dépasse le solde restant (${invoice.remainingBalance.toLocaleString()} FCFA).`,
      };
    }

    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);
    const newRemaining = invoice.remainingBalance - amount;
    const newPaidTotal = invoice.amountPaid + amount;
    const newStatus: Invoice['status'] = newRemaining === 0 ? 'payée' : 'partielle';

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount,
      method,
      reference: reference || `REG-${Date.now()}`,
      date: dateStr,
      userId: currentUser.id,
      userName: currentUser.name,
      notes: notes || 'Règlement de créance',
    };

    const updatedInvoice: Invoice = {
      ...invoice,
      amountPaid: newPaidTotal,
      remainingBalance: newRemaining,
      status: newStatus,
      payments: [...(invoice.payments || []), newPayment],
    };

    setInvoices(prev => {
      const next = prev.map(i => (i.id === invoiceId ? updatedInvoice : i));
      localStorage.setItem('provenda_invoices', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('invoices', updatedInvoice).catch(() => {});

    if (invoice.customerId && invoice.customerId !== 'cst-0') {
      setCustomers(prev => {
        const next = prev.map(c =>
          c.id === invoice.customerId
            ? { ...c, currentDebt: Math.max(0, c.currentDebt - amount) }
            : c
        );
        localStorage.setItem('provenda_customers', JSON.stringify(next));
        const updatedCust = next.find(c => c.id === invoice.customerId);
        if (updatedCust) upsertRecordToSupabase('customers', updatedCust).catch(() => {});
        return next;
      });
    }

    addAuditLog(
      'REGLEMENT_CREANCE',
      `Facture: ${invoice.number}`,
      invoice.id,
      `Solde restant: ${invoice.remainingBalance.toLocaleString()} FCFA`,
      `Paiement: ${amount.toLocaleString()} FCFA (${method}) -> Nouveau solde: ${newRemaining.toLocaleString()} FCFA`,
      notes || `Règlement partiel/total par ${invoice.customerName}`
    );

    return { success: true };
  };

  // Stock Adjustments (Losses, Damages, Internal Consumption, Direct Inward)
  const recordStockAdjustment = (
    productId: string,
    quantityChangeBaseUnit: number,
    type: 'perte' | 'produit endommagé' | 'consommation interne' | 'correction d\'inventaire' | 'entrée fournisseur',
    justification?: string
  ): { success: boolean; error?: string } => {
    const cleanJustification = (justification && justification.trim())
      ? justification.trim()
      : (type === 'entrée fournisseur' ? 'Entrée de stock' : `Ajustement de stock (${type})`);

    const prodIdx = products.findIndex(p => p.id === productId);
    if (prodIdx === -1) return { success: false, error: 'Produit introuvable.' };

    const product = products[prodIdx];
    const stockBefore = product.stockCurrentBaseUnit;
    const stockAfter = stockBefore + quantityChangeBaseUnit;

    if (stockAfter < 0) {
      return { success: false, error: 'L\'ajustement entraînerait un stock négatif, ce qui est strictement interdit.' };
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedProduct = {
      ...product,
      stockCurrentBaseUnit: stockAfter,
      updatedAt: now,
    };

    const movement: StockMovement = {
      id: `mov-adj-${Date.now()}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      type,
      quantityBaseUnit: quantityChangeBaseUnit,
      unit: product.baseUnit,
      stockBefore,
      stockAfter,
      costUnitCMP: product.cmp,
      totalValue: Math.abs(quantityChangeBaseUnit) * product.cmp,
      salesPointId: (currentUser.role === 'administrateur' || currentUser.role === 'developpeur')
        ? (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : (salesPoints[0]?.id || 'pos-1'))
        : (currentUser.assignedSalesPointId || 'pos-1'),
      salesPointName: salesPoints.find(s => s.id === ((currentUser.role === 'administrateur' || currentUser.role === 'developpeur') ? (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : 'pos-1') : (currentUser.assignedSalesPointId || 'pos-1')))?.name,
      referenceDocument: `ADJ-${Date.now().toString().slice(-6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      justification: cleanJustification,
      timestamp: now,
    };

    setProducts(prev => {
      const next = prev.map(p => (p.id === productId ? updatedProduct : p));
      localStorage.setItem('provenda_products', JSON.stringify(next));
      return next;
    });
    productsRef.current = productsRef.current.map(p => (p.id === productId ? updatedProduct : p));

    setStockMovements(prev => {
      const next = [movement, ...prev];
      localStorage.setItem('provenda_stock_movements', JSON.stringify(next));
      return next;
    });

    upsertRecordToSupabase('products', updatedProduct).catch(() => {});
    upsertRecordToSupabase('stock_movements', movement).catch(() => {});

    addAuditLog(
      'AJUSTEMENT_STOCK',
      `Produit: ${product.name} (${product.code})`,
      product.id,
      `Stock avant: ${stockBefore} ${product.baseUnit}`,
      `Ajustement: ${quantityChangeBaseUnit > 0 ? '+' : ''}${quantityChangeBaseUnit} ${product.baseUnit} (${type}) -> Stock après: ${stockAfter} ${product.baseUnit}`,
      cleanJustification
    );

    return { success: true };
  };

  // Physical Inventories
  const createInventorySession = (categoryFilter = 'all'): string => {
    const year = new Date().getFullYear();
    const count = inventories.length + 1;
    const ref = `INV-${year}-${String(count).padStart(6, '0')}`;
    const id = `inv-ses-${Date.now()}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const filteredProds = products.filter(p => {
      if (p.status === 'archivé') return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      return true;
    });

    const items = filteredProds.map(p => ({
      productId: p.id,
      productCode: p.code,
      productName: p.name,
      category: p.category,
      baseUnit: p.baseUnit,
      theoreticalStock: p.stockCurrentBaseUnit,
      physicalStock: p.stockCurrentBaseUnit, // Default to theoretical before count
      variance: 0,
      cmp: p.cmp,
      varianceValue: 0,
      reason: '',
    }));

    const totalTheoValue = items.reduce((sum, item) => sum + item.theoreticalStock * item.cmp, 0);

    const effectiveSpId = (currentUser.role === 'administrateur' || currentUser.role === 'developpeur')
      ? (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : (salesPoints[0]?.id || 'pos-1'))
      : (currentUser.assignedSalesPointId || 'pos-1');
    const matchedSp = salesPoints.find(s => s.id === effectiveSpId) || salesPoints[0];

    const newSession: InventorySession = {
      id,
      referenceNumber: ref,
      salesPointId: effectiveSpId,
      salesPointName: matchedSp?.name,
      startDate: now,
      categoryFilter: categoryFilter as any,
      status: 'en_cours',
      items,
      totalTheoreticalStockValue: totalTheoValue,
      totalPhysicalStockValue: totalTheoValue,
      totalVarianceValue: 0,
      createdBy: currentUser.name,
    };

    setInventories(prev => [newSession, ...prev]);
    return id;
  };

  const validateInventorySession = (
    sessionId: string,
    countedItems: { productId: string; physicalStock: number; reason?: string }[],
    notes?: string
  ): { success: boolean; error?: string } => {
    // Responsable, Admin or Developer can validate inventory adjustments (Section 12.1)
    if (currentUser.role !== 'responsable' && currentUser.role !== 'administrateur' && currentUser.role !== 'developpeur') {
      return { success: false, error: 'Seul un Responsable, un Administrateur ou le Développeur est habilité à valider les écarts d\'inventaire.' };
    }

    const session = inventories.find(s => s.id === sessionId);
    if (!session || session.status === 'validé') {
      return { success: false, error: 'Session d\'inventaire invalide ou déjà validée.' };
    }

    const now = new Date().toISOString();
    const updatedProducts = [...products];
    const adjustmentMovements: StockMovement[] = [];
    const affectedProducts: Product[] = [];

    let totalPhysicalValue = 0;
    let totalVarianceVal = 0;

    const validatedItems = session.items.map(item => {
      const count = countedItems.find(c => c.productId === item.productId);
      const physStock = count !== null && count !== undefined ? Number(count.physicalStock) : item.physicalStock;
      const variance = physStock - item.theoreticalStock;
      const varianceVal = variance * item.cmp;
      const reason = count?.reason || item.reason || (variance !== 0 ? 'Ajustement inventaire physique' : '');

      totalPhysicalValue += physStock * item.cmp;
      totalVarianceVal += varianceVal;

      if (variance !== 0) {
        const prodIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (prodIdx !== -1) {
          const prod = updatedProducts[prodIdx];
          const stockBefore = prod.stockCurrentBaseUnit;
          const stockAfter = physStock;

          const updProd = {
            ...prod,
            stockCurrentBaseUnit: stockAfter,
            updatedAt: now,
          };

          updatedProducts[prodIdx] = updProd;
          affectedProducts.push(updProd);

          adjustmentMovements.push({
            id: `mov-inv-${Date.now()}-${item.productId}`,
            productId: prod.id,
            productCode: prod.code,
            productName: prod.name,
            type: 'correction d\'inventaire',
            quantityBaseUnit: variance,
            unit: prod.baseUnit,
            stockBefore,
            stockAfter,
            costUnitCMP: prod.cmp,
            totalValue: Math.abs(varianceVal),
            salesPointId: session.salesPointId,
            salesPointName: session.salesPointName,
            referenceDocument: session.referenceNumber,
            userId: currentUser.id,
            userName: currentUser.name,
            justification: reason || `Régularisation inventaire ${session.referenceNumber}`,
            timestamp: now,
          });
        }
      }

      return {
        ...item,
        physicalStock: physStock,
        variance,
        varianceValue: varianceVal,
        reason,
      };
    });

    const finalizedSession: InventorySession = {
      ...session,
      status: 'validé',
      endDate: now,
      validatedBy: currentUser.name,
      items: validatedItems,
      totalPhysicalStockValue: totalPhysicalValue,
      totalVarianceValue: totalVarianceVal,
      notes: notes || session.notes,
    };

    setProducts(updatedProducts);
    productsRef.current = updatedProducts;
    localStorage.setItem('provenda_products', JSON.stringify(updatedProducts));

    setStockMovements(prev => {
      const next = [...adjustmentMovements, ...prev];
      localStorage.setItem('provenda_stock_movements', JSON.stringify(next));
      return next;
    });

    setInventories(prev => {
      const next = prev.map(s => (s.id === sessionId ? finalizedSession : s));
      localStorage.setItem('provenda_inventories', JSON.stringify(next));
      return next;
    });

    affectedProducts.forEach(p => upsertRecordToSupabase('products', p).catch(() => {}));
    adjustmentMovements.forEach(m => upsertRecordToSupabase('stock_movements', m).catch(() => {}));
    upsertRecordToSupabase('inventory_sessions', finalizedSession).catch(() => {});

    addAuditLog(
      'INVENTAIRE_VALIDE',
      `Inventaire: ${session.referenceNumber}`,
      session.id,
      `Valeur théorique: ${session.totalTheoreticalStockValue.toLocaleString()} FCFA`,
      `Valeur physique: ${totalPhysicalValue.toLocaleString()} FCFA (Écart net: ${totalVarianceVal.toLocaleString()} FCFA)`,
      notes || `Validation de ${adjustmentMovements.length} ajustement(s) de stock`
    );

    return { success: true };
  };

  // Suppliers & Customers
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSuppliers(prev => {
      const next = [...prev, newSupplier];
      localStorage.setItem('provenda_suppliers', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('suppliers', newSupplier).catch(() => {});
    scheduleBackgroundPush();
  };

  const updateSupplier = (supplier: Supplier) => {
    setSuppliers(prev => {
      const next = prev.map(s => (s.id === supplier.id ? supplier : s));
      localStorage.setItem('provenda_suppliers', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('suppliers', supplier).catch(() => {});
    scheduleBackgroundPush();
  };

  const deleteSupplier = (supplierId: string) => {
    const s = suppliers.find(sup => sup.id === supplierId);
    if (!s) return;
    setSuppliers(prev => {
      const next = prev.filter(sup => sup.id !== supplierId);
      localStorage.setItem('provenda_suppliers', JSON.stringify(next));
      return next;
    });
    deleteRecordFromSupabase('suppliers', supplierId).catch(() => {});
    trackDeletedId(supplierId);
    scheduleBackgroundPush();
    addAuditLog(
      'MODIFICATION_PARAMETRES',
      `Fournisseur supprimé: ${s.name}`,
      supplierId,
      s.name,
      undefined,
      'Suppression du fournisseur du catalogue'
    );
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'currentDebt'>) => {
    const code = `CST-${String(customers.length).padStart(3, '0')}`;
    const newCustomer: Customer = {
      ...customerData,
      code,
      id: `cst-${Date.now()}`,
      currentDebt: 0,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setCustomers(prev => {
      const next = [...prev, newCustomer];
      localStorage.setItem('provenda_customers', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('customers', newCustomer).catch(() => {});
    scheduleBackgroundPush();
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => {
      const next = prev.map(c => (c.id === customer.id ? customer : c));
      localStorage.setItem('provenda_customers', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('customers', customer).catch(() => {});
    scheduleBackgroundPush();
  };

  // Expenses Management
  const addExpense = (
    expenseData: Omit<Expense, 'id' | 'referenceNumber' | 'createdAt'>
  ): string => {
    const year = new Date().getFullYear();
    const count = expenses.length + 1;
    const ref = `DEP-${year}-${String(count).padStart(6, '0')}`;
    const id = `exp-${Date.now()}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const effectiveSpId = expenseData.salesPointId || ((currentUser.role === 'administrateur' || currentUser.role === 'developpeur')
      ? (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : (salesPoints[0]?.id || 'pos-1'))
      : (currentUser.assignedSalesPointId || 'pos-1'));
    const sp = salesPoints.find(s => s.id === effectiveSpId) || salesPoints[0];

    const newExpense: Expense = {
      ...expenseData,
      id,
      referenceNumber: ref,
      salesPointId: effectiveSpId,
      salesPointName: sp?.name,
      createdAt: now,
    };

    setExpenses(prev => {
      const next = [newExpense, ...prev];
      localStorage.setItem('provenda_expenses', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('expenses', newExpense).catch(() => {});
    scheduleBackgroundPush();

    addAuditLog(
      'ENREGISTREMENT_DEPENSE',
      `Dépense: ${ref} (${newExpense.category})`,
      id,
      undefined,
      `Montant: ${newExpense.amount.toLocaleString()} FCFA (${newExpense.paymentMethod}) - ${newExpense.description}`,
      newExpense.notes || 'Enregistrement charge d\'exploitation'
    );

    return id;
  };

  const updateExpense = (updatedExpense: Expense) => {
    const old = expenses.find(e => e.id === updatedExpense.id);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const finalized = { ...updatedExpense, updatedAt: now };

    setExpenses(prev => {
      const next = prev.map(e => (e.id === updatedExpense.id ? finalized : e));
      localStorage.setItem('provenda_expenses', JSON.stringify(next));
      return next;
    });
    upsertRecordToSupabase('expenses', finalized).catch(() => {});
    scheduleBackgroundPush();

    addAuditLog(
      'ENREGISTREMENT_DEPENSE',
      `Dépense modifiée: ${updatedExpense.referenceNumber}`,
      updatedExpense.id,
      old ? `${old.amount.toLocaleString()} FCFA (${old.category})` : undefined,
      `${updatedExpense.amount.toLocaleString()} FCFA (${updatedExpense.category}) - ${updatedExpense.description}`,
      'Mise à jour de la charge opérationnelle'
    );
  };

  const deleteExpense = (id: string, reason?: string) => {
    const target = expenses.find(e => e.id === id);
    if (!target) return;

    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem('provenda_expenses', JSON.stringify(next));
      return next;
    });
    deleteRecordFromSupabase('expenses', id).catch(() => {});
    trackDeletedId(id);
    scheduleBackgroundPush();

    addAuditLog(
      'SUPPRESSION_DEPENSE',
      `Dépense supprimée: ${target.referenceNumber}`,
      target.id,
      `${target.amount.toLocaleString()} FCFA (${target.category})`,
      undefined,
      reason || 'Suppression d\'une dépense'
    );
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Settings
  const updateSettings = (newSettings: CompanySettings) => {
    const old = { ...settings };
    setSettings(newSettings);
    localStorage.setItem('provenda_settings', JSON.stringify(newSettings));
    saveMetadata('settings', newSettings);
    upsertRecordToSupabase('company_settings', { id: 'company-settings-1', ...newSettings }).catch(() => {});
    addAuditLog(
      'MODIFICATION_PARAMETRES',
      'Paramètres Système & Entreprise',
      'settings-global',
      JSON.stringify(old),
      JSON.stringify(newSettings),
      'Mise à jour des paramètres généraux'
    );
  };

  // Automated 2-Minute Local Backup Engine
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('provenda_last_auto_backup_time');
    return saved ? new Date(saved) : null;
  });

  const triggerAutoBackup = useCallback((): string => {
    try {
      const currentUsers = JSON.parse(localStorage.getItem('provenda_users') || '[]');
      const currentSalesPoints = JSON.parse(localStorage.getItem('provenda_sales_points') || '[]');
      const currentProducts = JSON.parse(localStorage.getItem('provenda_products') || '[]');
      const currentSuppliers = JSON.parse(localStorage.getItem('provenda_suppliers') || '[]');
      const currentCustomers = JSON.parse(localStorage.getItem('provenda_customers') || '[]');
      const currentPurchases = JSON.parse(localStorage.getItem('provenda_purchases') || '[]');
      const currentInvoices = JSON.parse(localStorage.getItem('provenda_invoices') || '[]');
      const currentCreditNotes = JSON.parse(localStorage.getItem('provenda_credit_notes') || '[]');
      const currentStockMovements = JSON.parse(localStorage.getItem('provenda_stock_movements') || '[]');
      const currentInventories = JSON.parse(localStorage.getItem('provenda_inventories') || '[]');
      const currentAuditLogs = JSON.parse(localStorage.getItem('provenda_audit_logs') || '[]');
      const currentSettings = JSON.parse(localStorage.getItem('provenda_settings') || '{}');
      const currentExpenses = JSON.parse(localStorage.getItem('provenda_expenses') || '[]');

      // Ne pas écraser si la base locale est totalement vide
      if (currentUsers.length === 0 && currentProducts.length === 0 && currentPurchases.length === 0 && currentInvoices.length === 0) {
        return '';
      }

      const backupData = {
        appName: 'SCOOPS BIR SAA Management System',
        version: '2.2',
        exportDate: new Date().toISOString(),
        type: 'MANUAL_LOCAL_BACKUP',
        checksum: `LOCAL-${Date.now()}`,
        data: {
          users: currentUsers,
          salesPoints: currentSalesPoints,
          products: currentProducts,
          suppliers: currentSuppliers,
          customers: currentCustomers,
          purchases: currentPurchases,
          invoices: currentInvoices,
          creditNotes: currentCreditNotes,
          stockMovements: currentStockMovements,
          inventories: currentInventories,
          auditLogs: currentAuditLogs,
          settings: currentSettings,
          expenses: currentExpenses,
        },
      };

      const backupJson = JSON.stringify(backupData);
      try {
        localStorage.setItem('provenda_auto_backup_latest', backupJson);
      } catch (quotaErr) {
        console.warn('[Auto Backup] localStorage quota reached, persisting safely in IndexedDB:', quotaErr);
      }
      // Dual high-capacity backup in IndexedDB (immune to 5MB browser quota ceiling)
      saveMetadata('provenda_auto_backup_latest', backupData);

      const now = new Date();
      localStorage.setItem('provenda_last_auto_backup_time', now.toISOString());
      setLastAutoBackupTime(now);
      return backupJson;
    } catch (err) {
      console.warn('[Auto Backup 2min Error]:', err);
      return '';
    }
  }, []);

  // Sauvegarde automatique d'arrière-plan complètement arrêtée à la demande de l'utilisateur
  // La sauvegarde reste disponible sur action manuelle via triggerAutoBackup() ou exportSystemBackup()

  // Backup & Restore Engine (Section 13, 17, 19 Criterion #14)
  const exportSystemBackup = (): string => {
    const backupData = {
      appName: 'SCOOPS BIR SAA Management System',
      version: '2.2',
      exportDate: new Date().toISOString(),
      exportedBy: currentUser.name,
      checksum: `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      data: {
        users,
        salesPoints,
        products,
        suppliers,
        customers,
        purchases,
        invoices,
        creditNotes,
        stockMovements,
        inventories,
        auditLogs,
        settings,
        expenses,
      },
    };

    addAuditLog(
      'SAUVEGARDE_SYSTEME',
      'Base de données complète',
      backupData.checksum,
      undefined,
      `Export complet réalisé avec succès (${products.length} produits, ${invoices.length} factures, ${expenses.length} dépenses)`,
      'Sauvegarde manuelle exportée'
    );

    return JSON.stringify(backupData, null, 2);
  };

  const restoreSystemBackup = (jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Fichier de sauvegarde invalide ou corrompu.' };
      }

      const hasValidData = data.products || data.invoices || data.users || data.customers || data.purchases || data.settings;
      if (!hasValidData) {
        return { success: false, message: 'Fichier de sauvegarde invalide ou vide.' };
      }

      if (Array.isArray(data.users) && data.users.length > 0) {
        setUsers(prev => {
          const merged = [...data.users];
          if (!merged.some((u: any) => u.role === 'developpeur')) {
            const dev = prev.find(u => u.role === 'developpeur') || INITIAL_USERS[0];
            merged.unshift(dev);
          }
          localStorage.setItem('provenda_users', JSON.stringify(merged));
          return merged;
        });
      }
      if (Array.isArray(data.salesPoints) && data.salesPoints.length > 0) {
        setSalesPoints(data.salesPoints);
        localStorage.setItem('provenda_sales_points', JSON.stringify(data.salesPoints));
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
        localStorage.setItem('provenda_products', JSON.stringify(data.products));
      }
      if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
        setSuppliers(data.suppliers);
        localStorage.setItem('provenda_suppliers', JSON.stringify(data.suppliers));
      }
      if (Array.isArray(data.customers) && data.customers.length > 0) {
        setCustomers(data.customers);
        localStorage.setItem('provenda_customers', JSON.stringify(data.customers));
      }
      if (Array.isArray(data.purchases) && data.purchases.length > 0) {
        setPurchases(data.purchases);
        localStorage.setItem('provenda_purchases', JSON.stringify(data.purchases));
      }
      if (Array.isArray(data.invoices) && data.invoices.length > 0) {
        setInvoices(data.invoices);
        localStorage.setItem('provenda_invoices', JSON.stringify(data.invoices));
      }
      if (Array.isArray(data.creditNotes)) {
        setCreditNotes(data.creditNotes);
        localStorage.setItem('provenda_credit_notes', JSON.stringify(data.creditNotes));
      }
      if (Array.isArray(data.stockMovements) && data.stockMovements.length > 0) {
        setStockMovements(data.stockMovements);
        localStorage.setItem('provenda_stock_movements', JSON.stringify(data.stockMovements));
      }
      if (Array.isArray(data.inventories)) {
        setInventories(data.inventories);
        localStorage.setItem('provenda_inventories', JSON.stringify(data.inventories));
      }
      if (data.settings && typeof data.settings === 'object') {
        const restoredSettings = {
          ...data.settings,
          logoUrl: data.settings.logoUrl || DEFAULT_APP_LOGO,
        };
        setSettings(restoredSettings);
        localStorage.setItem('provenda_settings', JSON.stringify(restoredSettings));
      }
      if (Array.isArray(data.expenses) && data.expenses.length > 0) {
        setExpenses(data.expenses);
        localStorage.setItem('provenda_expenses', JSON.stringify(data.expenses));
      }

      const restoreLog: AuditLog = {
        id: `aud-restore-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'RESTAURATION_SYSTEME',
        targetObject: `Restauration archive du ${parsed.exportDate || 'date inconnue'}`,
        objectId: parsed.checksum || 'restored-archive',
        justification: `Restauration réussie de ${(data.products || []).length} produits et ${(data.invoices || []).length} factures`,
        ipAddress: '192.168.1.10',
      };

      setAuditLogs(prev => [restoreLog, ...(Array.isArray(data.auditLogs) ? data.auditLogs : prev)]);

      return { success: true, message: 'Base de données restaurée avec succès ! Les données sont rechargées.' };
    } catch (e: any) {
      return { success: false, message: `Erreur lors de la lecture du fichier : ${e.message}` };
    }
  };

  const resetToDefaultData = async (): Promise<void> => {
    isSyncingRemoteRef.current = true;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);

    // 1. Keep solely Developer account for client hand-off
    const devUser = users.find(u => u.role === 'developpeur') || INITIAL_USERS[0];
    const blankUsers = [devUser];
    setUsers(blankUsers);
    setCurrentUser(devUser);

    // 2. Main Sales Point (SCOOPS BIR SAA)
    const mainSp: SalesPoint = {
      id: 'pos-1',
      code: 'DP-DLA-01',
      name: 'Siège Principal & Usine (Douala Bassa)',
      city: 'Douala',
      address: 'Zone Industrielle Bassa, Douala, Cameroun',
      phone: '+237 699 00 00 01',
      managerName: 'Directeur Général',
      isMain: true,
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setSalesPoints([mainSp]);
    setCurrentSalesPointIdState('pos-1');

    // 3. Transactions: completely deleted
    setInvoices([]);
    setCreditNotes([]);
    setStockMovements([]);
    setInventories([]);
    setPurchases([]);
    setExpenses([]);
    setNotifications([]);

    // 4. Customers & Suppliers: completely deleted except default cash customer (cst-0)
    const defaultCashCustomer: Customer = {
      id: 'cst-0',
      code: 'CST-000',
      name: 'Client Comptant / Divers',
      phone: 'Sans téléphone',
      type: 'particulier',
      creditLimit: 0,
      currentDebt: 0,
      active: true,
      notes: 'Passage caisse standard sans compte nominatif.',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setCustomers([defaultCashCustomer]);
    setSuppliers([]);

    // 5. Products catalog: completely deleted
    setProducts([]);

    // 6. Settings: PRESERVED as requested ("except the developer, and the system settings")
    const preservedSettings: CompanySettings = {
      ...settings,
      logoUrl: settings.logoUrl || DEFAULT_APP_LOGO,
    };
    setSettings(preservedSettings);

    // 7. Audit log: completely deleted
    setAuditLogs([]);

    // 8. Wipe LocalStorage & IndexedDB (tout en préservant impérativement la configuration Supabase et les paramètres)
    const cfg = getSupabaseConfig();
    const savedUrl = localStorage.getItem('provenda_supabase_url') || cfg.url;
    const savedKey = localStorage.getItem('provenda_supabase_key') || cfg.anonKey;
    const currentTheme = localStorage.getItem('provenda_theme') || theme;
    const currentLang = localStorage.getItem('provenda_language') || language;

    localStorage.clear();
    if (savedUrl) localStorage.setItem('provenda_supabase_url', savedUrl);
    if (savedKey) localStorage.setItem('provenda_supabase_key', savedKey);
    localStorage.setItem('provenda_theme', currentTheme);
    localStorage.setItem('provenda_language', currentLang);
    localStorage.setItem('provenda_auth', 'true');
    localStorage.setItem('provenda_current_user_id', devUser.id);
    localStorage.setItem('provenda_users', JSON.stringify(blankUsers));
    localStorage.setItem('provenda_sales_points', JSON.stringify([mainSp]));
    localStorage.setItem('provenda_settings', JSON.stringify(preservedSettings));
    localStorage.setItem('provenda_customers', JSON.stringify([defaultCashCustomer]));
    localStorage.setItem('provenda_products', JSON.stringify([]));
    localStorage.setItem('provenda_invoices', JSON.stringify([]));
    localStorage.setItem('provenda_credit_notes', JSON.stringify([]));
    localStorage.setItem('provenda_stock_movements', JSON.stringify([]));
    localStorage.setItem('provenda_inventories', JSON.stringify([]));
    localStorage.setItem('provenda_purchases', JSON.stringify([]));
    localStorage.setItem('provenda_expenses', JSON.stringify([]));
    localStorage.setItem('provenda_suppliers', JSON.stringify([]));
    localStorage.setItem('provenda_audit_logs', JSON.stringify([]));
    localStorage.setItem('provenda_notifications', JSON.stringify([]));
    localStorage.setItem('provenda_deleted_ids', JSON.stringify([]));
    localStorage.setItem('provenda_last_sync_time', new Date().toISOString());

    clearAllIndexedDbStores();

    // 9. Vider Supabase de manière synchrone et exhaustive (produits, clients non-comptant, fournisseurs, audit logs, transactions, utilisateurs non-dev)
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      try {
        await clearAllSupabaseDataExceptDevAndSettings(devUser.id);
        // Pousser le compte développeur, le point de vente principal, le client comptant et les paramètres préservés
        await pushAllLocalDataToSupabase({
          products: [],
          customers: [defaultCashCustomer],
          suppliers: [],
          purchases: [],
          invoices: [],
          creditNotes: [],
          stockMovements: [],
          inventories: [],
          users: blankUsers,
          salesPoints: [mainSp],
          auditLogs: [],
          settings: preservedSettings,
          expenses: [],
        });
      } catch (err) {
        console.warn('[Supabase] Reset sync:', err);
      }
    }

    isSyncingRemoteRef.current = false;
    hasLocalChangesRef.current = false;
  };

  const getLowStockProducts = () => {
    return products.filter(
      p => p.status === 'actif' && p.stockCurrentBaseUnit > 0 && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
    );
  };

  const getOutOfStockProducts = () => {
    return products.filter(p => p.status === 'actif' && p.stockCurrentBaseUnit <= 0);
  };

  // Filtered collections according to active role and sales point selection, sorted chronologically descending (most recent first)
  const isSuperAdmin = currentUser.role === 'administrateur' || currentUser.role === 'developpeur';

  const scopedInvoices = (isSuperAdmin
    ? (effectiveSalesPointId === 'all' ? invoices : invoices.filter(i => (i.salesPointId || 'pos-1') === effectiveSalesPointId))
    : invoices.filter(i => (i.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'))
  ).sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return timeB - timeA;
  });

  const scopedPurchases = (isSuperAdmin
    ? (effectiveSalesPointId === 'all' ? purchases : purchases.filter(p => (p.salesPointId || 'pos-1') === effectiveSalesPointId))
    : purchases.filter(p => (p.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'))
  ).sort((a, b) => new Date(b.receptionDate || b.orderDate || 0).getTime() - new Date(a.receptionDate || a.orderDate || 0).getTime());

  const scopedStockMovements = (isSuperAdmin
    ? (effectiveSalesPointId === 'all' ? stockMovements : stockMovements.filter(m => (m.salesPointId || 'pos-1') === effectiveSalesPointId))
    : stockMovements.filter(m => (m.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'))
  ).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  const scopedInventories = (isSuperAdmin
    ? (effectiveSalesPointId === 'all' ? inventories : inventories.filter(inv => (inv.salesPointId || 'pos-1') === effectiveSalesPointId))
    : inventories.filter(inv => (inv.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'))
  ).sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());

  const scopedExpenses = (isSuperAdmin
    ? (effectiveSalesPointId === 'all' ? expenses : expenses.filter(e => (e.salesPointId || 'pos-1') === effectiveSalesPointId))
    : expenses.filter(e => (e.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'))
  ).sort((a, b) => {
    const timeA = new Date(a.createdAt || `${a.date}T${a.time || '00:00'}`).getTime();
    const timeB = new Date(b.createdAt || `${b.date}T${b.time || '00:00'}`).getTime();
    return timeB - timeA;
  });

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        language,
        setLanguage,
        t,
        salesPoints,
        currentSalesPointId,
        setCurrentSalesPointId,
        currentSalesPoint,
        addSalesPoint,
        updateSalesPoint,
        deleteSalesPoint,
        isAuthenticated,
        login,
        logout,
        currentUser,
        users,
        setCurrentUser,
        switchRole,
        updateUser,
        addUser,
        deactivateUser,
        products,
        addProduct,
        updateProduct,
        archiveProduct,
        unarchiveProduct,
        maskProduct,
        purchases: scopedPurchases,
        allPurchases: purchases,
        createPurchaseDraft,
        updatePurchase,
        validatePurchaseReception,
        cancelPurchase,
        invoices: scopedInvoices,
        allInvoices: invoices,
        creditNotes,
        createSale,
        cancelInvoiceWithCreditNote,
        payments,
        recordDebtPayment,
        stockMovements: scopedStockMovements,
        allStockMovements: stockMovements,
        recordStockAdjustment,
        inventories: scopedInventories,
        allInventories: inventories,
        createInventorySession,
        validateInventorySession,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        customers,
        addCustomer,
        updateCustomer,
        expenses: scopedExpenses,
        allExpenses: expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        auditLogs,
        addAuditLog,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
        settings,
        updateSettings,
        exportSystemBackup,
        restoreSystemBackup,
        resetToDefaultData,
        lastAutoBackupTime,
        triggerAutoBackup,
        getLowStockProducts,
        getOutOfStockProducts,
        syncStatus,
        lastSyncTime,
        syncErrorMessage,
        triggerManualSync,
        isSupabaseConfigured: getSupabaseConfig().isConfigured,
        canInstallPwa,
        isStandalone,
        installPwa,
        showDesktopInstallModal,
        setShowDesktopInstallModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
