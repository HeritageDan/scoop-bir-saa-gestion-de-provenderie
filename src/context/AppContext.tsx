import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { getTranslation } from '../utils/i18n';
import {
  openDatabase,
  saveStoreItems,
  loadStoreItems,
  saveMetadata,
  clearAllIndexedDbStores,
} from '../services/indexedDbStorage';

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
  login: (email: string, password: string) => { success: boolean; error?: string };
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
  createPurchaseDraft: (purchase: Omit<Purchase, 'id' | 'referenceNumber' | 'status'>, targetSalesPointId?: string) => string;
  validatePurchaseReception: (purchaseId: string) => void;
  cancelPurchase: (purchaseId: string, reason: string) => void;

  // Sales & Invoicing
  invoices: Invoice[];
  allInvoices: Invoice[];
  creditNotes: CreditNote[];
  createSale: (
    customerId: string,
    items: { productId: string; quantity: number; unitPrice: number; discountAmount?: number }[],
    discount?: { type: 'pourcentage' | 'montant'; value: number; reason: string },
    payment?: { amount: number; method: 'espèces' | 'virement' | 'paiement mobile' | 'crédit client'; reference?: string },
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
  recordStockAdjustment: (productId: string, quantityChangeBaseUnit: number, type: 'perte' | 'produit endommagé' | 'consommation interne' | 'correction d\'inventaire', justification: string) => { success: boolean; error?: string };

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
  resetToDefaultData: () => void;

  // Helper selectors
  getLowStockProducts: () => Product[];
  getOutOfStockProducts: () => Product[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('provenda_theme') as Theme) || 'dark';
  });

  // Language state (fr / en)
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('provenda_language') as Language) || 'fr';
  });

  // Sales points (Multi-magasin)
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>(() => {
    const saved = localStorage.getItem('provenda_sales_points');
    return saved ? JSON.parse(saved) : INITIAL_SALES_POINTS;
  });

  const [currentSalesPointId, setCurrentSalesPointIdState] = useState<string>(() => {
    return localStorage.getItem('provenda_current_sales_point') || 'pos-1';
  });

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
    return localStorage.getItem('provenda_auth') === 'true';
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('provenda_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
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
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('provenda_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(() => {
    const saved = localStorage.getItem('provenda_credit_notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('provenda_stock_movements');
    return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
  });

  const [inventories, setInventories] = useState<InventorySession[]>(() => {
    const saved = localStorage.getItem('provenda_inventories');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORIES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('provenda_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('provenda_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('provenda_settings');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_SETTINGS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('provenda_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
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

  // Dual-Persistence Engine: Instant localStorage + High-Capacity IndexedDB
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
    setSalesPoints(prev => [...prev, newSp]);
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
    setSalesPoints(prev => prev.map(s => (s.id === sp.id ? sp : s)));
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
    setSalesPoints(prev => prev.filter(s => s.id !== id));
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
  const login = (email: string, password: string): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const target = users.find(u =>
      u.email.trim().toLowerCase() === cleanEmail ||
      (u.role === 'developpeur' && (cleanEmail === 'dev' || cleanEmail === 'dev@coopsbir.com' || cleanEmail === 'dev@provenda.net'))
    );
    if (!target) {
      return { success: false, error: t('login.error_invalid') };
    }
    if (!target.active) {
      return { success: false, error: t('login.error_inactive') };
    }
    const validPassword = target.password || (target.role === 'developpeur' ? 'devpassword2026' : target.role === 'administrateur' ? 'admin123' : '123456');
    if (password !== validPassword) {
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
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
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
    if (currentUser.role !== 'administrateur' && currentUser.role !== 'developpeur') {
      return {
        success: false,
        error: language === 'fr'
          ? "Action non autorisée : Seul le développeur ou l'administrateur a le privilège de créer des utilisateurs et de leur assigner des rôles."
          : "Unauthorized: Only the Developer or Administrator has the privilege to create users and assign roles."
      };
    }
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      active: true,
      password: userData.password || 'provenda123',
    };
    setUsers(prev => [...prev, newUser]);
    addAuditLog(
      'MODIFICATION_UTILISATEUR',
      `Nouvel utilisateur: ${newUser.name}`,
      newUser.id,
      undefined,
      `Rôle: ${newUser.role}, Email: ${newUser.email}, Remise: ${newUser.discountLimitPercent}%`,
      'Création et attribution des rôles par l\'administrateur'
    );
    return { success: true };
  };

  const deactivateUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, active: false } : u)));
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
      stockCurrentBaseUnit: initialStock,
      cmp: initialCmp ?? (productData.purchasePrice / (productData.conversionFactor || 1)),
      priceHistory: [
        {
          date: now,
          purchasePrice: productData.purchasePrice,
          salePrice: productData.salePrice,
          changedBy: currentUser.name,
          reason: 'Création initiale du produit au catalogue',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    setProducts(prev => [...prev, newProduct]);

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
      setStockMovements(prev => [movement, ...prev]);
    }
  };

  const updateProduct = (updatedProduct: Product, reason?: string) => {
    const oldProduct = products.find(p => p.id === updatedProduct.id);
    if (!oldProduct) return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const priceChanged =
      oldProduct.purchasePrice !== updatedProduct.purchasePrice ||
      oldProduct.salePrice !== updatedProduct.salePrice;

    const newHistory = [...oldProduct.priceHistory];
    if (priceChanged) {
      newHistory.unshift({
        date: now,
        purchasePrice: updatedProduct.purchasePrice,
        salePrice: updatedProduct.salePrice,
        changedBy: currentUser.name,
        reason: reason || 'Modification de tarif catalogue',
      });
    }

    const finalProduct: Product = {
      ...updatedProduct,
      priceHistory: newHistory,
      updatedAt: now,
    };

    setProducts(prev => prev.map(p => (p.id === updatedProduct.id ? finalProduct : p)));

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
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, status: 'archivé' } : p)));
    addAuditLog('MODIFICATION_PRODUIT', `Archivage produit: ${target.name}`, target.id, target.status, 'archivé', 'Archivage du produit');
  };

  const unarchiveProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, status: 'actif' } : p)));
    addAuditLog('MODIFICATION_PRODUIT', `Réactivation produit: ${target.name}`, target.id, target.status, 'actif', 'Réactivation du produit');
  };

  const maskProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const nextStatus = target.status === 'masqué' ? 'actif' : 'masqué';
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, status: nextStatus } : p)));
    addAuditLog('MODIFICATION_PRODUIT', `Masquage produit: ${target.name}`, target.id, target.status, nextStatus, 'Modification visibilité');
  };

  // Purchases & Receipts (CMP Calculation Formula)
  const createPurchaseDraft = (
    purchaseData: Omit<Purchase, 'id' | 'referenceNumber' | 'status'>,
    targetSalesPointId?: string
  ): string => {
    const purchaseSeq = purchases.length + 1;
    const ref = `ACH-${new Date().getFullYear()}-${String(purchaseSeq).padStart(6, '0')}`;
    const id = `ach-${Date.now()}`;

    const effectiveSpId = currentUser.role === 'administrateur'
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
    };

    setPurchases(prev => [newPurchase, ...prev]);
    return id;
  };

  const validatePurchaseReception = (purchaseId: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase || purchase.status === 'validé') return;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedProducts = [...products];
    const newMovements: StockMovement[] = [];

    // Ratio of transport fees allocated per item based on purchase line value
    const totalLinesValue = purchase.subtotal || 1;
    const transportFees = settings.transportFeesIntegratedInCMP ? purchase.transportFees : 0;

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

      // Update product in memory
      updatedProducts[productIndex] = {
        ...product,
        stockCurrentBaseUnit: stockAfter,
        cmp: newCMP,
        updatedAt: now,
      };

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

    // Update state
    setProducts(updatedProducts);
    setStockMovements(prev => [...newMovements, ...prev]);

    setPurchases(prev =>
      prev.map(p =>
        p.id === purchaseId
          ? {
              ...p,
              items: updatedItems,
              status: 'validé',
              receptionDate: now,
              validatedAt: now,
            }
          : p
      )
    );

    addAuditLog(
      'RECEPTION_FOURNISSEUR',
      `Réception Achat: ${purchase.referenceNumber}`,
      purchase.id,
      'Statut: brouillon',
      `Validé, ${purchase.items.length} produit(s), Total: ${purchase.totalAmount.toLocaleString()} FCFA, Recalcul CMP effectué`,
      `Fournisseur: ${purchase.supplierName}, BL: ${purchase.supplierDocumentRef}`
    );
  };

  const cancelPurchase = (purchaseId: string, reason: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

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

      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const reverseMovements: StockMovement[] = [];

      for (const item of purchase.items) {
        const prodIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (prodIdx !== -1) {
          const prod = updatedProducts[prodIdx];
          const qtyBase = item.quantityReceived * prod.conversionFactor;
          const stockBefore = prod.stockCurrentBaseUnit;
          const stockAfter = stockBefore - qtyBase;

          updatedProducts[prodIdx] = {
            ...prod,
            stockCurrentBaseUnit: stockAfter,
            updatedAt: now,
          };

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
            justification: `Annulation de la réception ${purchase.referenceNumber} : ${reason}`,
            timestamp: now,
          });
        }
      }

      setProducts(updatedProducts);
      setStockMovements(prev => [...reverseMovements, ...prev]);
    }

    setPurchases(prev =>
      prev.map(p =>
        p.id === purchaseId
          ? {
              ...p,
              status: 'annulé',
              cancelledAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
              cancellationReason: reason,
            }
          : p
      )
    );

    addAuditLog(
      'ANNULATION_RECEPTION',
      `Achat: ${purchase.referenceNumber}`,
      purchase.id,
      purchase.status,
      'Annulé',
      reason
    );
  };

  // Sales & POS Engine (Atomic Stock Verification & CMP Snapshot)
  const createSale = (
    customerId: string,
    itemsToSell: { productId: string; quantity: number; unitPrice: number; discountAmount?: number }[],
    discount?: { type: 'pourcentage' | 'montant'; value: number; reason: string },
    payment?: { amount: number; method: 'espèces' | 'virement' | 'paiement mobile' | 'crédit client'; reference?: string },
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

    const chosenSpId = currentUser.role === 'administrateur'
      ? (targetSalesPointId || (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : (salesPoints[0]?.id || 'pos-1')))
      : (currentUser.assignedSalesPointId || 'pos-1');
    const chosenSp = salesPoints.find(s => s.id === chosenSpId) || salesPoints[0];

    // 2. Strict Negative Stock Verification (Section 7 & Acceptation Criterion #4)
    for (const item of itemsToSell) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return { success: false, error: `Produit ID ${item.productId} non trouvé.` };
      }
      if (product.status !== 'actif') {
        return { success: false, error: `Le produit "${product.name}" n'est pas actif dans le catalogue.` };
      }

      const requestedBaseQty = item.quantity * product.conversionFactor;
      if (product.stockCurrentBaseUnit < requestedBaseQty) {
        return {
          success: false,
          error: `Stock insuffisant pour "${product.name}". Stock disponible: ${product.stockCurrentBaseUnit} ${product.baseUnit} (soit ~${(product.stockCurrentBaseUnit / product.conversionFactor).toFixed(1)} ${product.saleUnit}), demandé: ${requestedBaseQty} ${product.baseUnit} (${item.quantity} ${product.saleUnit}). La vente ne peut créer un stock négatif.`,
        };
      }
    }

    // 3. Discount Permission Verification (Section 9)
    let globalDiscountCalc = 0;
    let saleDiscountDetails: SaleDiscount | undefined = undefined;

    const subtotalGross = itemsToSell.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    if (discount && discount.value > 0) {
      let requestedDiscountPercent = 0;
      if (discount.type === 'pourcentage') {
        requestedDiscountPercent = discount.value;
        globalDiscountCalc = Math.round((subtotalGross * discount.value) / 100);
      } else {
        globalDiscountCalc = Math.min(discount.value, subtotalGross);
        requestedDiscountPercent = (globalDiscountCalc / subtotalGross) * 100;
      }

      // Check max limit allowed for current user role
      let allowedLimit = currentUser.discountLimitPercent;
      if (currentUser.role === 'caissier') {
        allowedLimit = settings.maxDiscountCaissier;
      } else if (currentUser.role === 'responsable') {
        allowedLimit = settings.maxDiscountResponsable;
      } else if (currentUser.role === 'administrateur') {
        allowedLimit = settings.maxDiscountAdmin;
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
        calculatedAmount: globalDiscountCalc,
        authorId: currentUser.id,
        authorName: currentUser.name,
        reason: discount.reason || 'Remise commerciale accordée',
        valueBefore: subtotalGross,
        valueAfter: subtotalGross - globalDiscountCalc,
      };
    }

    const totalNet = Math.max(0, subtotalGross - globalDiscountCalc);

    // 4. Credit validation check
    const paidAmount = payment ? payment.amount : 0;
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
      const qtyBase = item.quantity * product.conversionFactor;

      // Distribute global discount proportionally across items
      const itemGross = item.quantity * item.unitPrice;
      const proportion = subtotalGross > 0 ? itemGross / subtotalGross : 0;
      const itemDiscountAmount = Math.round(globalDiscountCalc * proportion);
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
        unit: product.saleUnit,
        conversionFactor: product.conversionFactor,
        quantity: item.quantity,
        quantityBaseUnit: qtyBase,
        unitPrice: item.unitPrice,
        discountAmount: itemDiscountAmount,
        netUnitPrice,
        totalNet: itemNet,
        cmpAtSale: product.cmp,
        costOfGoodsSold: cogs,
        grossMargin,
      });

      // Update product stock
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
        justification: `Vente client ${customer.name} - Facture ${invoiceNumber}`,
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
        method: payment.method,
        reference: payment.reference || (payment.method === 'espèces' ? `ESP-${timeStr.replace(':', '')}` : `REF-${Date.now()}`),
        date: `${dateStr} ${timeStr}`,
        userId: currentUser.id,
        userName: currentUser.name,
        notes: notes || 'Paiement lors de la vente',
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
      totalDiscount: globalDiscountCalc,
      discountDetails: saleDiscountDetails,
      totalNet,
      totalCostOfGoodsSold: totalCOGS,
      grossMargin,
      marginRateCost,
      marginRateSales,
      payments: recordedPayments,
      amountPaid: paidAmount,
      remainingBalance,
      status: invoiceStatus,
      salesPointId: chosenSpId,
      salesPointName: chosenSp?.name,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      notes,
      isCredit: remainingBalance > 0 || isCredit,
      creditDueDate: remainingBalance > 0 ? creditDueDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10) : undefined,
    };

    // 8. Atomic updates of all state
    setProducts(updatedProducts);
    setStockMovements(prev => [...stockMovementsToCreate, ...prev]);
    setInvoices(prev => [newInvoice, ...prev]);

    // Update customer debt if credit
    if (remainingBalance > 0 && customer.id !== 'cst-0') {
      setCustomers(prev =>
        prev.map(c =>
          c.id === customer.id ? { ...c, currentDebt: c.currentDebt + remainingBalance } : c
        )
      );
    }

    // 9. Audit log entry
    addAuditLog(
      'VENTE_ENREGISTREE',
      `Facture: ${invoiceNumber}`,
      invoiceId,
      undefined,
      `Client: ${customer.name}, Net: ${totalNet.toLocaleString()} FCFA, Payé: ${paidAmount.toLocaleString()} FCFA, Marge: ${grossMargin.toLocaleString()} FCFA`,
      notes || 'Validation vente en caisse'
    );

    if (saleDiscountDetails) {
      addAuditLog(
        'REMISE_ACCORDEE',
        `Facture: ${invoiceNumber}`,
        invoiceId,
        `Brut: ${subtotalGross.toLocaleString()} FCFA`,
        `Remise: ${globalDiscountCalc.toLocaleString()} FCFA (${saleDiscountDetails.type === 'pourcentage' ? saleDiscountDetails.value + '%' : 'Fixe'}) -> Net: ${totalNet.toLocaleString()} FCFA`,
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

    // Security check: Only Responsable or Admin can cancel invoices (Section 10)
    if (currentUser.role !== 'responsable' && currentUser.role !== 'administrateur') {
      return {
        success: false,
        error: 'Seul un Responsable ou un Administrateur est autorisé à annuler une facture.',
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
      setCustomers(prev =>
        prev.map(c =>
          c.id === invoice.customerId
            ? { ...c, currentDebt: Math.max(0, c.currentDebt - invoice.remainingBalance) }
            : c
        )
      );
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
    setInvoices(prev =>
      prev.map(i =>
        i.id === invoiceId
          ? {
              ...i,
              status: 'annulée',
              cancelledAt: nowStr,
              cancelledBy: currentUser.name,
              cancellationReason: reason,
              creditNoteNumber,
            }
          : i
      )
    );

    setProducts(updatedProducts);
    setStockMovements(prev => [...reverseMovements, ...prev]);
    setCreditNotes(prev => [newCreditNote, ...prev]);

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

    setInvoices(prev =>
      prev.map(i =>
        i.id === invoiceId
          ? {
              ...i,
              amountPaid: newPaidTotal,
              remainingBalance: newRemaining,
              status: newStatus,
              payments: [...(i.payments || []), newPayment],
            }
          : i
      )
    );

    if (invoice.customerId && invoice.customerId !== 'cst-0') {
      setCustomers(prev =>
        prev.map(c =>
          c.id === invoice.customerId
            ? { ...c, currentDebt: Math.max(0, c.currentDebt - amount) }
            : c
        )
      );
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

  // Stock Adjustments (Losses, Damages, Internal Consumption)
  const recordStockAdjustment = (
    productId: string,
    quantityChangeBaseUnit: number,
    type: 'perte' | 'produit endommagé' | 'consommation interne' | 'correction d\'inventaire',
    justification: string
  ): { success: boolean; error?: string } => {
    if (!justification || justification.trim().length < 5) {
      return { success: false, error: 'Une justification détaillée est obligatoire pour tout ajustement de stock.' };
    }

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
      salesPointId: currentUser.role === 'administrateur'
        ? (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : (salesPoints[0]?.id || 'pos-1'))
        : (currentUser.assignedSalesPointId || 'pos-1'),
      salesPointName: salesPoints.find(s => s.id === (currentUser.role === 'administrateur' ? (effectiveSalesPointId !== 'all' ? effectiveSalesPointId : 'pos-1') : (currentUser.assignedSalesPointId || 'pos-1')))?.name,
      referenceDocument: `ADJ-${Date.now().toString().slice(-6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      justification,
      timestamp: now,
    };

    setProducts(prev => prev.map(p => (p.id === productId ? updatedProduct : p)));
    setStockMovements(prev => [movement, ...prev]);

    addAuditLog(
      'AJUSTEMENT_STOCK',
      `Produit: ${product.name} (${product.code})`,
      product.id,
      `Stock avant: ${stockBefore} ${product.baseUnit}`,
      `Ajustement: ${quantityChangeBaseUnit > 0 ? '+' : ''}${quantityChangeBaseUnit} ${product.baseUnit} (${type}) -> Stock après: ${stockAfter} ${product.baseUnit}`,
      justification
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

    const effectiveSpId = currentUser.role === 'administrateur'
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
    // Only Responsable or Admin can validate inventory adjustments (Section 12.1)
    if (currentUser.role !== 'responsable' && currentUser.role !== 'administrateur') {
      return { success: false, error: 'Seul un Responsable ou un Administrateur est habilité à valider les écarts d\'inventaire.' };
    }

    const session = inventories.find(s => s.id === sessionId);
    if (!session || session.status === 'validé') {
      return { success: false, error: 'Session d\'inventaire invalide ou déjà validée.' };
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedProducts = [...products];
    const adjustmentMovements: StockMovement[] = [];

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

          updatedProducts[prodIdx] = {
            ...prod,
            stockCurrentBaseUnit: stockAfter,
            updatedAt: now,
          };

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

    setProducts(updatedProducts);
    setStockMovements(prev => [...adjustmentMovements, ...prev]);

    setInventories(prev =>
      prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              status: 'validé',
              endDate: now,
              validatedBy: currentUser.name,
              items: validatedItems,
              totalPhysicalStockValue: totalPhysicalValue,
              totalVarianceValue: totalVarianceVal,
              notes: notes || s.notes,
            }
          : s
      )
    );

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
    setSuppliers(prev => [...prev, newSupplier]);
  };

  const updateSupplier = (supplier: Supplier) => {
    setSuppliers(prev => prev.map(s => (s.id === supplier.id ? supplier : s)));
  };

  const deleteSupplier = (supplierId: string) => {
    const s = suppliers.find(sup => sup.id === supplierId);
    if (!s) return;
    setSuppliers(prev => prev.filter(sup => sup.id !== supplierId));
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
    setCustomers(prev => [...prev, newCustomer]);
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => (c.id === customer.id ? customer : c)));
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

    const effectiveSpId = expenseData.salesPointId || (currentUser.role === 'administrateur'
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

    setExpenses(prev => [newExpense, ...prev]);

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

    setExpenses(prev => prev.map(e => (e.id === updatedExpense.id ? finalized : e)));

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

    setExpenses(prev => prev.filter(e => e.id !== id));

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
    addAuditLog(
      'MODIFICATION_PARAMETRES',
      'Paramètres Système & Entreprise',
      'settings-global',
      JSON.stringify(old),
      JSON.stringify(newSettings),
      'Mise à jour des paramètres généraux'
    );
  };

  // Backup & Restore Engine (Section 13, 17, 19 Criterion #14)
  const exportSystemBackup = (): string => {
    const backupData = {
      appName: 'Provenda Management System',
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
      if (!parsed.data || !parsed.data.products || !parsed.data.invoices) {
        return { success: false, message: 'Fichier de sauvegarde invalide ou corrompu.' };
      }

      if (parsed.data.users) setUsers(parsed.data.users);
      if (parsed.data.salesPoints) setSalesPoints(parsed.data.salesPoints);
      if (parsed.data.products) setProducts(parsed.data.products);
      if (parsed.data.suppliers) setSuppliers(parsed.data.suppliers);
      if (parsed.data.customers) setCustomers(parsed.data.customers);
      if (parsed.data.purchases) setPurchases(parsed.data.purchases);
      if (parsed.data.invoices) setInvoices(parsed.data.invoices);
      if (parsed.data.creditNotes) setCreditNotes(parsed.data.creditNotes);
      if (parsed.data.stockMovements) setStockMovements(parsed.data.stockMovements);
      if (parsed.data.inventories) setInventories(parsed.data.inventories);
      if (parsed.data.settings) setSettings(parsed.data.settings);
      if (parsed.data.expenses) setExpenses(parsed.data.expenses);

      const restoreLog: AuditLog = {
        id: `aud-restore-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'RESTAURATION_SYSTEME',
        targetObject: `Restauration archive du ${parsed.exportDate || 'date inconnue'}`,
        objectId: parsed.checksum || 'restored-archive',
        justification: `Restauration réussie de ${parsed.data.products.length} produits et ${parsed.data.invoices.length} factures`,
        ipAddress: '192.168.1.10',
      };

      setAuditLogs(prev => [restoreLog, ...(parsed.data.auditLogs || prev)]);

      return { success: true, message: 'Base de données restaurée avec succès ! Les données sont rechargées.' };
    } catch (e: any) {
      return { success: false, message: `Erreur lors de la lecture du fichier : ${e.message}` };
    }
  };

  const resetToDefaultData = () => {
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setSalesPoints(INITIAL_SALES_POINTS);
    setCurrentSalesPointIdState('pos-1');
    setProducts(INITIAL_PRODUCTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomers(INITIAL_CUSTOMERS);
    setPurchases(INITIAL_PURCHASES);
    setInvoices(INITIAL_INVOICES);
    setCreditNotes([]);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setInventories(INITIAL_INVENTORIES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSettings(INITIAL_COMPANY_SETTINGS);
    setExpenses(INITIAL_EXPENSES);
    localStorage.clear();
    clearAllIndexedDbStores();
  };

  const getLowStockProducts = () => {
    return products.filter(
      p => p.status === 'actif' && p.stockCurrentBaseUnit > 0 && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
    );
  };

  const getOutOfStockProducts = () => {
    return products.filter(p => p.status === 'actif' && p.stockCurrentBaseUnit <= 0);
  };

  // Filtered collections according to active role and sales point selection
  const scopedInvoices = currentUser.role === 'administrateur'
    ? (effectiveSalesPointId === 'all' ? invoices : invoices.filter(i => (i.salesPointId || 'pos-1') === effectiveSalesPointId))
    : invoices.filter(i => (i.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'));

  const scopedPurchases = currentUser.role === 'administrateur'
    ? (effectiveSalesPointId === 'all' ? purchases : purchases.filter(p => (p.salesPointId || 'pos-1') === effectiveSalesPointId))
    : purchases.filter(p => (p.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'));

  const scopedStockMovements = currentUser.role === 'administrateur'
    ? (effectiveSalesPointId === 'all' ? stockMovements : stockMovements.filter(m => (m.salesPointId || 'pos-1') === effectiveSalesPointId))
    : stockMovements.filter(m => (m.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'));

  const scopedInventories = currentUser.role === 'administrateur'
    ? (effectiveSalesPointId === 'all' ? inventories : inventories.filter(inv => (inv.salesPointId || 'pos-1') === effectiveSalesPointId))
    : inventories.filter(inv => (inv.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'));

  const scopedExpenses = currentUser.role === 'administrateur'
    ? (effectiveSalesPointId === 'all' ? expenses : expenses.filter(e => (e.salesPointId || 'pos-1') === effectiveSalesPointId))
    : expenses.filter(e => (e.salesPointId || 'pos-1') === (currentUser.assignedSalesPointId || 'pos-1'));

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
        getLowStockProducts,
        getOutOfStockProducts,
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
