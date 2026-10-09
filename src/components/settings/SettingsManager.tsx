import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building,
  Shield,
  Users,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Percent,
  Cloud,
  CloudOff,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Server,
  Zap,
  HardDrive,
  FileJson,
  Printer,
  Image as ImageIcon,
  Trash2,
  Plus,
  X,
  MonitorDown,
  Laptop,
  FileCode,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CompanySettings, Role, ReceiptPrinterConfig, ReceiptPaperWidth } from '../../types';
import {
  getPrinterConfig,
  savePrinterConfig,
  printTestReceipt,
} from '../../services/receiptPrinterService';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  pushAllLocalDataToSupabase,
  pullAllDataFromSupabase,
  normalizeSupabaseUrl,
  normalizeSupabaseKey,
  inspectSupabaseKey,
  getVercelEnvConfig,
} from '../../services/supabaseService';
import { SUPABASE_SCHEMA_SQL } from '../../services/supabaseSchema';
import { DEFAULT_APP_LOGO } from '../../config/defaultLogo';
import { getDatabaseStats } from '../../services/indexedDbStorage';
import { updateAppIconEverywhere } from '../../services/appIconService';

export const SettingsManager: React.FC = () => {
  const {
    settings,
    updateSettings,
    users,
    currentUser,
    setCurrentUser,
    addUser,
    updateUser,
    exportSystemBackup,
    restoreSystemBackup,
    resetToDefaultData,
    products,
    customers,
    suppliers,
    purchases,
    invoices,
    creditNotes,
    stockMovements,
    inventories,
    expenses,
    auditLogs,
    salesPoints,
    theme,
    language,
    t,
    setShowDesktopInstallModal,
    isStandalone,
    canInstallPwa,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'security' | 'database' | 'printer'>('company');

  // Filter out the developer system account for non-developers
  const visibleUsers = users.filter(u => currentUser.role === 'developpeur' || u.role !== 'developpeur');

  // Local state for company settings
  const [companyForm, setCompanyForm] = useState<CompanySettings>(() => ({
    ...settings,
    logoUrl: settings.logoUrl || DEFAULT_APP_LOGO,
  }));

  useEffect(() => {
    setCompanyForm({
      ...settings,
      logoUrl: settings.logoUrl || DEFAULT_APP_LOGO,
    });
  }, [settings]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Logo upload from PC state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');

    if (!file.type.startsWith('image/')) {
      setLogoError(language === 'fr' ? 'Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP, SVG).' : 'Please select a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError(language === 'fr' ? "L'image ne doit pas dépasser 5 Mo." : 'Image must not exceed 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Automatically optimize / resize if too large
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400; // 400px is perfect for sharp thermal receipts and high-DPI headers
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/png');
          setCompanyForm(prev => ({ ...prev, logoUrl: optimizedDataUrl }));
          updateAppIconEverywhere(optimizedDataUrl);
        } else {
          setCompanyForm(prev => ({ ...prev, logoUrl: dataUrl }));
          updateAppIconEverywhere(dataUrl);
        }
      };
      img.onerror = () => {
        setCompanyForm(prev => ({ ...prev, logoUrl: dataUrl }));
        updateAppIconEverywhere(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setLogoError(language === 'fr' ? "Erreur lors de la lecture du fichier." : "Error reading image file.");
    };
    reader.readAsDataURL(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setCompanyForm(prev => ({ ...prev, logoUrl: DEFAULT_APP_LOGO }));
    updateAppIconEverywhere(DEFAULT_APP_LOGO);
  };

  // Thermal Printer config state
  const [printerConfig, setPrinterConfig] = useState<ReceiptPrinterConfig>(getPrinterConfig());
  const [printerSaveSuccess, setPrinterSaveSuccess] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSavePrinterConfig = (e: React.FormEvent) => {
    e.preventDefault();
    savePrinterConfig(printerConfig);
    setPrinterSaveSuccess(true);
    setTimeout(() => setPrinterSaveSuccess(false), 2500);
  };

  const handleTestPrint = async () => {
    setTestingPrinter(true);
    setTestResult(null);
    const res = await printTestReceipt(settings, printerConfig);
    setTestingPrinter(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: language === 'fr' ? 'Ticket de test envoyé avec succès à l\'imprimante thermique !' : 'Test receipt sent successfully to thermal printer!',
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || (language === 'fr' ? 'Échec du test. Vérifiez la connexion de l\'imprimante.' : 'Test failed. Check printer connection.'),
      });
    }
  };

  // Supabase state
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(supabaseConfig.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(supabaseConfig.anonKey);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string; error?: string; details?: any }>({ loading: false });
  const [syncPushStatus, setSyncPushStatus] = useState<{ loading: boolean; success?: boolean; message?: string; error?: string; details?: any }>({ loading: false });
  const [syncPullStatus, setSyncPullStatus] = useState<{ loading: boolean; success?: boolean; message?: string; error?: string }>({ loading: false });
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  useEffect(() => {
    const cfg = getSupabaseConfig();
    setSupabaseConfig(cfg);
    setSupabaseUrlInput(cfg.url);
    setSupabaseKeyInput(cfg.anonKey);
  }, []);

  const [idbStats, setIdbStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeTab === 'database') {
      getDatabaseStats().then(setIdbStats);
    }
  }, [activeTab, products, invoices, purchases, expenses, stockMovements]);

  // User creation modal state
  const hasActiveAdmin = users.some(u => u.role === 'administrateur' && u.active);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'administrateur' as Role,
    phone: '',
    discountLimitPercent: 100,
    assignedSalesPointId: 'pos-1',
  });
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [userCreationSuccess, setUserCreationSuccess] = useState<string | null>(null);

  const handleOpenAddUserModal = () => {
    const initialRole: Role = (currentUser.role === 'developpeur' && !hasActiveAdmin) ? 'administrateur' : 'caissier';
    setNewUserForm({
      name: '',
      email: '',
      password: '',
      role: initialRole,
      phone: '',
      discountLimitPercent: initialRole === 'administrateur' ? 100 : 0,
      assignedSalesPointId: 'pos-1',
    });
    setUserCreationError(null);
    setUserCreationSuccess(null);
    setShowAddUserModal(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationError(null);
    setUserCreationSuccess(null);
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()) {
      setUserCreationError(language === 'fr' ? 'Veuillez remplir tous les champs obligatoires (Nom, Email, Mot de passe).' : 'Please fill all required fields (Name, Email, Password).');
      return;
    }
    const result = addUser({
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim(),
      password: newUserForm.password.trim(),
      role: newUserForm.role,
      phone: newUserForm.phone.trim(),
      discountLimitPercent: Number(newUserForm.discountLimitPercent) || 0,
      assignedSalesPointId: 'pos-1',
      active: true,
      lastLogin: '',
    });
    if (result.success) {
      setUserCreationSuccess(language === 'fr' ? 'Compte utilisateur créé avec succès !' : 'User account created successfully!');
      setTimeout(() => {
        setShowAddUserModal(false);
        setUserCreationSuccess(null);
        setNewUserForm({
          name: '',
          email: '',
          password: '',
          role: 'caissier',
          phone: '',
          discountLimitPercent: 0,
          assignedSalesPointId: 'pos-1',
        });
      }, 1000);
    } else {
      setUserCreationError(result.error || (language === 'fr' ? 'Échec de la création de l\'utilisateur.' : 'Failed to create user.'));
    }
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLogo = companyForm.logoUrl || DEFAULT_APP_LOGO;
    updateSettings({
      ...companyForm,
      logoUrl: finalLogo,
    });
    updateAppIconEverywhere(finalLogo);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleDownloadBackup = () => {
    const data = exportSystemBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `provenda_sauvegarde_complete_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyBackupJson = () => {
    const data = exportSystemBackup();
    navigator.clipboard.writeText(data);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError('');
    setRestoreSuccess('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBackupJson(content);
        const res = restoreSystemBackup(content);
        if (res.success) {
          setRestoreSuccess(language === 'fr' ? 'Base de données restaurée avec succès depuis le fichier sélectionné !' : 'Database successfully restored from selected file!');
        } else {
          setRestoreError(res.message || 'Erreur lors de la restauration du fichier.');
        }
      }
    };
    reader.onerror = () => {
      setRestoreError('Erreur lors de la lecture du fichier.');
    };
    reader.readAsText(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRestoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError('');
    setRestoreSuccess('');

    if (!backupJson.trim()) {
      setRestoreError('Veuillez coller le contenu JSON de sauvegarde.');
      return;
    }

    const res = restoreSystemBackup(backupJson);
    if (!res.success) {
      setRestoreError(res.message || 'Erreur : structure JSON invalide ou corrompue.');
    } else {
      setRestoreSuccess('Base de données restaurée avec succès !');
      setBackupJson('');
    }
  };

  const handleResetData = async () => {
    const confirmMsg = language === 'fr'
      ? 'ATTENTION ACTION IRRÉVERSIBLE :\n\nVoulez-vous réinitialiser l\'application à un état 100% VIERGE ?\n\n• Tous les produits seront supprimés\n• Tous les clients et fournisseurs seront supprimés\n• Tous les utilisateurs (sauf votre compte Développeur) seront supprimés\n• Tous les tickets, factures et achats seront supprimés\n• Tous les mouvements de stock et inventaires seront supprimés\n• Toutes les dépenses et les journaux d\'audit seront supprimés\n• Seuls votre compte Développeur et les paramètres du système seront conservés.\n\nConfirmer la réinitialisation complète ?'
      : 'WARNING IRREVERSIBLE ACTION:\n\nDo you want to reset the system to a 100% BLANK slate?\n\n• All products will be deleted\n• All customers and suppliers will be deleted\n• All users (except your Developer account) will be deleted\n• All receipts, invoices and purchases will be deleted\n• All stock movements and inventories will be deleted\n• All expenses and audit logs will be deleted\n• Only your Developer account and system settings will be preserved.\n\nConfirm complete reset?';

    if (window.confirm(confirmMsg)) {
      setIsResetting(true);
      try {
        await resetToDefaultData();
        alert(
          language === 'fr'
            ? 'Le système a été réinitialisé à blanc avec succès ! Tous les produits, clients, fournisseurs, utilisateurs, transactions et journaux d\'audit ont été définitivement effacés localement et sur Supabase. Votre compte Développeur et vos paramètres système ont été préservés.'
            : 'System successfully reset to blank! All products, customers, suppliers, users, transactions and audit logs have been permanently deleted locally and on Supabase. Your Developer account and system settings have been preserved.'
        );
      } catch (err: any) {
        alert(language === 'fr' ? `Erreur lors de la réinitialisation : ${err?.message || err}` : `Reset error: ${err?.message || err}`);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
      setTestStatus({ loading: false, success: false, message: 'Veuillez saisir l\'URL et la clé publique Anon de Supabase.' });
      return;
    }
    const cleanUrl = normalizeSupabaseUrl(supabaseUrlInput);
    const cleanKey = normalizeSupabaseKey(supabaseKeyInput);
    saveSupabaseConfig(cleanUrl, cleanKey);
    const cfg = getSupabaseConfig();
    setSupabaseConfig(cfg);
    setSupabaseUrlInput(cfg.url);
    setSupabaseKeyInput(cfg.anonKey);
    setTestStatus({ loading: false, success: true, message: 'Configuration enregistrée ! Cliquez sur « Tester la connexion & tables ».' });
  };

  const handleResetToVercelEnv = () => {
    clearSupabaseConfig();
    const cfg = getSupabaseConfig();
    setSupabaseConfig(cfg);
    setSupabaseUrlInput(cfg.url);
    setSupabaseKeyInput(cfg.anonKey);
    setTestStatus({
      loading: false,
      success: true,
      message: 'Configuration réinitialisée avec les variables d\'environnement Vercel !',
    });
  };

  const handleDisconnectSupabase = () => {
    clearSupabaseConfig();
    const cfg = getSupabaseConfig();
    setSupabaseConfig(cfg);
    setSupabaseUrlInput('');
    setSupabaseKeyInput('');
    setTestStatus({ loading: false, success: false, message: 'Configuration effacée. L\'application fonctionne en mode LocalStorage.' });
  };

  const handleTestSupabase = async () => {
    setTestStatus({ loading: true });
    const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
    setTestStatus({
      loading: false,
      success: res.success,
      message: res.message,
      error: res.errorDetail,
      details: res.tablesFound,
    });
  };

  const handlePushToSupabase = async () => {
    setSyncPushStatus({ loading: true });
    const res = await pushAllLocalDataToSupabase({
      products,
      customers,
      suppliers,
      purchases,
      invoices,
      creditNotes,
      stockMovements,
      inventories,
      users,
      salesPoints,
      auditLogs,
      settings,
    });
    setSyncPushStatus({
      loading: false,
      success: res.success,
      message: res.message,
      error: res.error,
      details: res.details,
    });
  };

  const handlePullFromSupabase = async () => {
    setSyncPullStatus({ loading: true });
    const res = await pullAllDataFromSupabase();
    if (res.success && res.data) {
      const restoreRes = restoreSystemBackup(JSON.stringify(res.data));
      if (restoreRes.success) {
        setSyncPullStatus({
          loading: false,
          success: true,
          message: 'Données synchronisées avec succès depuis Supabase ! L\'application est à jour.',
        });
      } else {
        setSyncPullStatus({
          loading: false,
          success: false,
          message: 'Erreur lors de l\'application des données reçues de Supabase.',
        });
      }
    } else {
      setSyncPullStatus({
        loading: false,
        success: false,
        message: res.message || 'Impossible de récupérer les données depuis Supabase.',
      });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <Settings className="w-6 h-6 text-emerald-500" />
            <span>{t('settings.title')}</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/80 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('company')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'company'
              ? 'bg-emerald-600 text-white shadow-xs'
              : theme === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{t('settings.tab_company')}</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-xs'
              : theme === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('settings.tab_users')} ({visibleUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-emerald-600 text-white shadow-xs'
              : theme === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>{t('settings.tab_security')}</span>
        </button>

        {currentUser.role === 'developpeur' && (
          <button
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-emerald-600 text-white shadow-xs'
                : theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Database className="w-4 h-4" />
            <span className="flex items-center gap-1.5">
              <span>{language === 'fr' ? 'Base Locale & Cloud Supabase' : 'Local DB & Cloud Supabase'}</span>
              <span className={`w-2 h-2 rounded-full ${supabaseConfig.isConfigured ? 'bg-emerald-400 ring-2 ring-emerald-500/30' : 'bg-amber-400 ring-2 ring-amber-500/30'}`} />
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('printer')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'printer'
              ? 'bg-emerald-600 text-white shadow-xs'
              : theme === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'fr' ? 'Imprimante POS & Tickets' : 'POS Thermal Printer'}</span>
        </button>
      </div>

      {/* TAB 1: COMPANY SETTINGS */}
      {activeTab === 'company' && (
        <form
          onSubmit={handleSaveCompany}
          className={`border rounded-xl p-5 space-y-4 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h2 className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {t('settings.company_title')}
          </h2>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('settings.save_success')}</span>
            </div>
          )}

          {/* Logo Upload Card from PC */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center gap-4 ${
            theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="relative group shrink-0">
              <div className="relative">
                <img
                  src={companyForm.logoUrl || DEFAULT_APP_LOGO}
                  alt="Logo Entreprise"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl border border-slate-300 dark:border-slate-600 bg-white p-1.5 shadow-sm"
                />
                {companyForm.logoUrl && companyForm.logoUrl !== DEFAULT_APP_LOGO && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow cursor-pointer transition"
                    title={language === 'fr' ? 'Rétablir le logo officiel par défaut' : 'Reset to default official logo'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className={`font-bold text-xs ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'fr' ? 'Logo Officiel de l\'Application & des Documents' : 'Official Application & Document Logo'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                  {companyForm.logoUrl && companyForm.logoUrl !== DEFAULT_APP_LOGO
                    ? (language === 'fr' ? 'Personnalisé' : 'Custom')
                    : (language === 'fr' ? 'Officiel (Par défaut)' : 'Official (Default)')}
                </span>
              </div>
              <p className={`text-[11px] max-w-xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'fr'
                  ? 'Importez une image depuis votre PC (PNG, JPG, SVG, WEBP). Ce logo sera affiché dans l\'en-tête de l\'application, sur les tickets de caisse thermiques POS, les factures A4 et les rapports officiels.'
                  : 'Upload an image from your PC (PNG, JPG, SVG, WEBP). This logo will appear in the app header, POS thermal receipts, A4 invoices, and official reports.'}
              </p>

              {logoError && (
                <div className="text-[11px] text-rose-500 font-medium">
                  {logoError}
                </div>
              )}

              <div className="pt-1 flex items-center gap-2 justify-center sm:justify-start">
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {language === 'fr' ? 'Changer de logo' : 'Change logo'}
                  </span>
                </button>

                {companyForm.logoUrl && companyForm.logoUrl !== DEFAULT_APP_LOGO && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      theme === 'dark'
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Rétablir le logo officiel' : 'Reset to official logo'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.company_name')}
              </label>
              <input
                type="text"
                value={companyForm.name}
                onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                className={`w-full rounded-lg p-2 font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.legal_status')}
              </label>
              <input
                type="text"
                value={companyForm.legalStatus}
                onChange={e => setCompanyForm({ ...companyForm, legalStatus: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.phone')}
              </label>
              <input
                type="text"
                value={companyForm.phone1}
                onChange={e => setCompanyForm({ ...companyForm, phone1: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {language === 'fr' ? 'Téléphone Secondaire :' : 'Secondary Phone:'}
              </label>
              <input
                type="text"
                value={companyForm.phone2 || ''}
                onChange={e => setCompanyForm({ ...companyForm, phone2: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.email')}
              </label>
              <input
                type="email"
                value={companyForm.email}
                onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.address')}
              </label>
              <input
                type="text"
                value={companyForm.address}
                onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.tax_id')}
              </label>
              <input
                type="text"
                value={companyForm.taxId}
                onChange={e => setCompanyForm({ ...companyForm, taxId: e.target.value })}
                className={`w-full rounded-lg p-2 font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.trade_register')}
              </label>
              <input
                type="text"
                value={companyForm.tradeRegisterNumber}
                onChange={e =>
                  setCompanyForm({ ...companyForm, tradeRegisterNumber: e.target.value })
                }
                className={`w-full rounded-lg p-2 font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>
          </div>

          <div className={`pt-4 border-t space-y-3 text-xs ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {language === 'fr' ? 'Mentions Légales sur les Pièces Imprimées' : 'Legal Notices on Printed Documents'}
            </h3>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.invoice_footer')}
              </label>
              <textarea
                rows={2}
                value={companyForm.invoiceFooterNotice}
                onChange={e =>
                  setCompanyForm({ ...companyForm, invoiceFooterNotice: e.target.value })
                }
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {t('settings.ticket_footer')}
              </label>
              <input
                type="text"
                value={companyForm.ticketFooterNotice}
                onChange={e =>
                  setCompanyForm({ ...companyForm, ticketFooterNotice: e.target.value })
                }
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer transition"
            >
              {t('settings.save_company')}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: USERS & ACTIVE SESSION */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className={`border rounded-xl p-5 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {t('settings.users_active_title')}
            </h2>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-3 ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {currentUser.name}
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('settings.users_active_role')}{' '}
                    <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {t(`role.${currentUser.role}`) || currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('settings.users_discount_cap')}{' '}
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.role === 'administrateur' || currentUser.role === 'developpeur'
                    ? t('settings.users_unlimited')
                    : `${currentUser.discountLimitPercent}%`}
                </span>
              </div>
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <h2 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t('settings.users_list_title')}
                </h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'fr'
                    ? 'Gestion des accès collaborateurs, création des comptes et plafonds de remise'
                    : 'Staff access management, account creation and discount thresholds'}
                </p>
              </div>

              {(currentUser.role === 'developpeur' || currentUser.role === 'administrateur') && (
                <button
                  type="button"
                  onClick={handleOpenAddUserModal}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Créer un Utilisateur' : 'Create User'}</span>
                </button>
              )}
            </div>

            <div className={`divide-y text-xs ${
              theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'
            }`}>
              {visibleUsers.map(u => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <div
                    key={u.id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      theme === 'dark' ? 'hover:bg-slate-850' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            theme === 'dark'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {t('settings.users_connected')}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {language === 'fr' ? 'Identifiant' : 'Email'} : {u.email} &middot; {language === 'fr' ? 'Rôle' : 'Role'} :{' '}
                        <span className={`font-semibold uppercase ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {t(`role.${u.role}`) || u.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t('sidebar.max_discount')} <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{u.role === 'administrateur' || u.role === 'developpeur' ? t('settings.users_unlimited') : `${u.discountLimitPercent}%`}</strong>
                      </span>
                      {isCurrent ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {t('settings.users_connected')}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                            u.active
                              ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {u.active ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Inactif' : 'Inactive')}
                          </span>

                          {(currentUser.role === 'developpeur' || currentUser.role === 'administrateur') && u.id !== 'usr-dev' && (
                            <button
                              type="button"
                              onClick={() => updateUser({ ...u, active: !u.active })}
                              className={`text-[10px] px-2 py-1 rounded font-semibold border transition cursor-pointer ${
                                u.active
                                  ? 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                                  : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                              }`}
                            >
                              {u.active ? (language === 'fr' ? 'Désactiver' : 'Deactivate') : (language === 'fr' ? 'Activer' : 'Activate')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ADD USER MODAL */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
              <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">
                        {language === 'fr' ? 'Créer un Nouveau Compte' : 'Create New Account'}
                      </h3>
                      <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {currentUser.role === 'developpeur'
                          ? (language === 'fr' ? 'Le développeur peut créer l\'Administrateur ou des employés.' : 'Developer can create Administrator or staff.')
                          : (language === 'fr' ? 'Création de comptes opérationnels.' : 'Operational accounts creation.')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserModal(false);
                      setUserCreationError(null);
                      setUserCreationSuccess(null);
                    }}
                    className={`p-1.5 rounded-lg border transition ${
                      theme === 'dark' ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {userCreationError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{userCreationError}</span>
                  </div>
                )}

                {userCreationSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{userCreationSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium mb-1 opacity-80">
                      {language === 'fr' ? 'Nom complet *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserForm.name}
                      onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                      placeholder="ex: Jean Dupont"
                      className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1 opacity-80">
                        {language === 'fr' ? 'Identifiant / Email *' : 'Username / Email *'}
                      </label>
                      <input
                        type="email"
                        required
                        value={newUserForm.email}
                        onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        placeholder="admin@scoopsbir.com"
                        className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1 opacity-80">
                        {language === 'fr' ? 'Mot de passe *' : 'Password *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserForm.password}
                        onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        placeholder="••••••••"
                        className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1 opacity-80">
                        {language === 'fr' ? 'Rôle dans le système *' : 'System Role *'}
                      </label>
                      <select
                        value={newUserForm.role}
                        onChange={e => {
                          const r = e.target.value as Role;
                          setNewUserForm({
                            ...newUserForm,
                            role: r,
                            discountLimitPercent: r === 'administrateur' ? 100 : r === 'responsable' ? 15 : 0,
                          });
                        }}
                        className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      >
                        {currentUser.role === 'developpeur' && !hasActiveAdmin && (
                          <option value="administrateur">
                            {language === 'fr' ? '👑 Administrateur (Gestion complète - 1 seul autorisé)' : '👑 Administrator (Full Business - Single Allowed)'}
                          </option>
                        )}
                        <option value="responsable">
                          {language === 'fr' ? 'Responsable d\'exploitation' : 'Operations Manager'}
                        </option>
                        <option value="caissier">
                          {language === 'fr' ? 'Caissier (Point de vente POS)' : 'Cashier (POS Sales)'}
                        </option>
                        <option value="magasinier">
                          {language === 'fr' ? 'Magasinier (Stocks & Dépôt)' : 'Storekeeper (Inventory)'}
                        </option>
                      </select>
                      {currentUser.role === 'developpeur' && hasActiveAdmin && (
                        <p className="text-[10px] text-amber-500 mt-1">
                          {language === 'fr'
                            ? 'ℹ️ Un Administrateur actif existe déjà. Selon la hiérarchie SCOOPS BIR SAA, un seul Administrateur est autorisé.'
                            : 'ℹ️ An active Administrator already exists. Only one is allowed.'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-medium mb-1 opacity-80">
                        {language === 'fr' ? 'Plafond Remise (%)' : 'Max Discount (%)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newUserForm.discountLimitPercent}
                        onChange={e => setNewUserForm({ ...newUserForm, discountLimitPercent: Number(e.target.value) })}
                        disabled={newUserForm.role === 'administrateur'}
                        className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1 opacity-80">
                        {language === 'fr' ? 'Téléphone' : 'Phone'}
                      </label>
                      <input
                        type="text"
                        value={newUserForm.phone}
                        onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                        placeholder="+237 ..."
                        className={`w-full rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1 opacity-80">
                        {language === 'fr' ? 'Point de Vente assigné' : 'Assigned Sales Point'}
                      </label>
                      <div className={`w-full rounded-xl p-2.5 border text-xs font-semibold flex items-center gap-1.5 ${
                        theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-emerald-400' : 'bg-slate-100 border-slate-200 text-emerald-700'
                      }`}>
                        <span>📍</span>
                        <span className="truncate">Siège Principal & Usine (Douala Bassa) — Site Unique</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className={`px-4 py-2.5 rounded-xl border font-semibold transition cursor-pointer ${
                        theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer shadow-xs"
                    >
                      {language === 'fr' ? 'Créer le Compte' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY & DISCOUNT CAPS */}
      {activeTab === 'security' && (
        <form
          onSubmit={handleSaveCompany}
          className={`border rounded-xl p-5 space-y-4 text-xs shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h2 className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {t('settings.security_title')}
          </h2>
          <p className={`leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('settings.security_subtitle')}
          </p>

          <div className="space-y-3 pt-2">
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t('role.caissier')} :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? 'Par défaut fixé à 0% (Aucune remise sans accord de la hiérarchie).'
                    : 'Default set to 0% (No discount permitted without manager authorization).'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={companyForm.maxDiscountCaissier}
                  onChange={e =>
                    setCompanyForm({
                      ...companyForm,
                      maxDiscountCaissier: Number(e.target.value),
                    })
                  }
                  className={`w-20 rounded p-1 text-right font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>%</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t('role.responsable')} :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? "Plafond d'autorisation pour négociation commerciale directe (défaut : 15%)."
                    : 'Authorized ceiling for direct commercial negotiation (default: 15%).'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={companyForm.maxDiscountResponsable}
                  onChange={e =>
                    setCompanyForm({
                      ...companyForm,
                      maxDiscountResponsable: Number(e.target.value),
                    })
                  }
                  className={`w-20 rounded p-1 text-right font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>%</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t('role.administrateur')} :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? "Pouvoir discrétionnaire complet avec traçabilité obligatoire dans l'audit."
                    : 'Full discretionary authorization with mandatory audit trail logging.'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{t('settings.users_unlimited')}</span>
              </div>
            </div>
          </div>

          {/* CMP Strict Rule Box */}
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>{t('settings.security_cmp_title')}</span>
            </div>
            <p className="opacity-90 leading-relaxed text-[11px]">
              {t('settings.security_cmp_desc')}
            </p>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer transition"
            >
              {language === 'fr' ? 'Enregistrer les Plafonds' : 'Save Discount Caps'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: DATABASE & LOCAL STORAGE (STRICTLY DEVELOPER EXCLUSIVE) */}
      {activeTab === 'database' && currentUser.role !== 'developpeur' && (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-center space-y-3">
          <Shield className="w-10 h-10 mx-auto text-rose-500" />
          <h2 className="text-base font-bold">
            {language === 'fr' ? 'Accès Strictement Réservé au Développeur Système' : 'Access Strictly Restricted to System Developer'}
          </h2>
          <p className="text-xs max-w-lg mx-auto opacity-90 leading-relaxed">
            {language === 'fr'
              ? "Les interfaces de connexion aux bases de données, configurations Supabase, identifiants backend et sauvegardes système sont strictement réservées au Développeur. L'administrateur et les autres collaborateurs n'y ont pas accès afin de sécuriser les identifiants techniques et l'infrastructure."
              : "Database connection interfaces, Supabase credentials, backend settings, and system backups are strictly restricted to the System Developer."}
          </p>
        </div>
      )}

      {activeTab === 'database' && currentUser.role === 'developpeur' && (
        <div className="space-y-6 text-xs">
          {/* OFFLINE-FIRST ARCHITECTURE BANNER */}
          <div className={`border rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs transition-colors ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-700/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'fr' ? 'Base de Données Locale & Haute Résilience' : 'Local Database & High Resilience'}
                    </h2>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {language === 'fr'
                        ? 'Architecture Offline-First (1 point de vente physique) & Déploiement Google AI Studio'
                        : 'Offline-First architecture (1 physical POS) & Google AI Studio deployment'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{language === 'fr' ? 'Moteur IndexedDB Actif' : 'IndexedDB Engine Active'}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Google AI Studio Ready</span>
                </div>
              </div>
            </div>

            {/* Architecture Explanatory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-bold text-emerald-500 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Zéro Dépendance Internet' : 'Zero Internet Dependence'}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? 'Chaque vente, approvisionnement, dépense et mouvement de stock est enregistré immédiatement sur le stockage local sécurisé.'
                    : 'Every sale, purchase, expense, and stock movement is saved immediately to secure local storage.'}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-bold text-blue-500 mb-1 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Déploiement AI Studio' : 'AI Studio Deployment'}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? 'Publié directement sur Google AI Studio sans passer par un hébergeur tiers, garantissant une disponibilité permanente et sans latence.'
                    : 'Published directly to Google AI Studio without third-party host latency, ensuring high performance.'}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="font-bold text-purple-500 mb-1 flex items-center gap-1.5">
                  <FileJson className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Sauvegardes Portables JSON' : 'Portable JSON Backups'}</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? 'Export et import en 1 clic de l\'intégralité des données d\'exploitation avec calcul exact du CMP et historique d\'audit.'
                    : '1-click export and import of all operational data with exact CMP valuation and audit history.'}
                </p>
              </div>
            </div>

            {/* REAL-TIME VOLUME STATS */}
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {language === 'fr' ? 'Volumes de Données Enregistrées en Local' : 'Locally Stored Data Volumes'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-lg font-bold text-emerald-500">{products.length}</div>
                  <div className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Articles & Matières' : 'Products & Stock'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-lg font-bold text-blue-500">{invoices.length}</div>
                  <div className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Factures & Ventes' : 'Sales Invoices'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-lg font-bold text-amber-500">{purchases.length}</div>
                  <div className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Bons d\'Achat' : 'Purchase Orders'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-lg font-bold text-rose-500">{expenses.length}</div>
                  <div className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Charges d\'Exploit.' : 'Operating Expenses'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-lg font-bold text-cyan-500">{stockMovements.length}</div>
                  <div className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Mouvements Stock' : 'Stock Movements'}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-center ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-lg font-bold text-slate-400">{visibleUsers.length}</div>
                  <div className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Comptes Utilisateurs' : 'User Accounts'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PROMINENT CLOUD SUPABASE CREDENTIALS & SYNC CARD */}
          <div className={`border-2 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs transition-all ${
            supabaseConfig.isConfigured
              ? theme === 'dark' ? 'bg-slate-900 border-emerald-500/40' : 'bg-white border-emerald-500/40 shadow-emerald-500/5'
              : theme === 'dark' ? 'bg-slate-900 border-amber-500/40' : 'bg-white border-amber-500/40 shadow-amber-500/5'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/20">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  supabaseConfig.isConfigured
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-500'
                }`}>
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'fr' ? 'Connexion & Synchronisation Cloud Supabase' : 'Cloud Supabase Connection & Sync'}
                    </h2>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5 ${
                      supabaseConfig.isConfigured
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${supabaseConfig.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span>{supabaseConfig.isConfigured ? (language === 'fr' ? 'Connecté au Cloud' : 'Cloud Connected') : (language === 'fr' ? 'En Attente de Clés' : 'Awaiting Keys')}</span>
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr'
                      ? 'Entrez ici vos clés Supabase (les mêmes que dans Google AI Studio) pour lier et synchroniser votre application de bureau avec le cloud.'
                      : 'Enter your Supabase project keys here (the same as in Google AI Studio) to link and sync your desktop app with the cloud.'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold flex items-center justify-between">
                    <span>{t('settings.supabase_url_label')} *</span>
                    <span className="text-[10px] font-mono opacity-60">https://xyz.supabase.co</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://votre-projet.supabase.co"
                    value={supabaseUrlInput}
                    onChange={e => setSupabaseUrlInput(e.target.value)}
                    className={`w-full rounded-xl p-2.5 font-mono text-xs border focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold flex items-center justify-between">
                    <span>{t('settings.supabase_key_label')} *</span>
                    <span className="text-[10px] font-mono opacity-60">Clé `anon` / `public`</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKeyInput}
                    onChange={e => setSupabaseKeyInput(e.target.value)}
                    className={`w-full rounded-xl p-2.5 font-mono text-xs border focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('settings.supabase_save_btn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={testStatus.loading || !supabaseUrlInput || !supabaseKeyInput}
                  className="px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer hover:bg-slate-500/10 disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{testStatus.loading ? (language === 'fr' ? 'Test en cours...' : 'Testing...') : t('settings.supabase_test_btn')}</span>
                </button>

                {supabaseConfig.isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="px-3.5 py-2.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-semibold text-xs cursor-pointer transition"
                  >
                    {t('settings.supabase_disconnect_btn')}
                  </button>
                )}

                <div className="h-5 w-px bg-slate-700/30 mx-1 hidden sm:block" />

                <button
                  type="button"
                  onClick={handlePushToSupabase}
                  disabled={syncPushStatus.loading || !supabaseConfig.isConfigured}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer disabled:opacity-40 flex items-center gap-1.5 transition shadow-xs"
                  title="Envoyer toutes les données locales vers le cloud Supabase"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{syncPushStatus.loading ? (language === 'fr' ? 'Envoi...' : 'Pushing...') : (language === 'fr' ? 'Pousser vers Cloud (Push)' : 'Push to Cloud')}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={syncPullStatus.loading || !supabaseConfig.isConfigured}
                  className="px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer disabled:opacity-40 flex items-center gap-1.5 hover:bg-slate-500/10 transition shadow-xs"
                  title="Télécharger toutes les données du Cloud vers la base locale"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{syncPullStatus.loading ? (language === 'fr' ? 'Récupération...' : 'Pulling...') : (language === 'fr' ? 'Récupérer du Cloud (Pull)' : 'Pull from Cloud')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="ml-auto px-3.5 py-2.5 rounded-xl border text-xs cursor-pointer hover:bg-slate-500/10 transition flex items-center gap-1.5 opacity-80 hover:opacity-100"
                  title="Copier le script SQL DDL pour créer les tables dans Supabase"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? (language === 'fr' ? 'SQL Copié !' : 'SQL Copied!') : (language === 'fr' ? 'Copier Script SQL DDL' : 'Copy DDL SQL')}</span>
                </button>
              </div>

              {/* Status feedback banners */}
              {testStatus.message && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  testStatus.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />}
                  <span>{testStatus.message}</span>
                </div>
              )}

              {syncPushStatus.message && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  syncPushStatus.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {syncPushStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />}
                  <span>{syncPushStatus.message}</span>
                </div>
              )}

              {syncPullStatus.message && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  syncPullStatus.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {syncPullStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />}
                  <span>{syncPullStatus.message}</span>
                </div>
              )}
            </form>
          </div>

          {/* BACKUP & RESTORE ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* EXPORT BACKUP CARD */}
            <div className={`border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs flex flex-col justify-between ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <h2 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'fr' ? 'Sauvegarde Complète du Système' : 'Complete System Backup'}
                  </h2>
                </div>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? 'Exporte l\'intégralité des 12 bases du système dans un fichier JSON standard horodaté : articles au CMP, clients, fournisseurs, factures, avoirs, achats, dépenses d\'exploitation, mouvements de stock, inventaires, utilisateurs et journal d\'audit.'
                    : 'Exports all 12 system datasets to a standardized timestamped JSON file: CMP products, clients, suppliers, invoices, credit notes, purchases, operating expenses, stock movements, inventories, users and audit log.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Télécharger la Sauvegarde (.json)' : 'Download Backup File (.json)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyBackupJson}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold border transition cursor-pointer text-xs ${
                    copiedJson
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                  }`}
                >
                  {copiedJson ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedJson ? (language === 'fr' ? 'Copié !' : 'Copied!') : (language === 'fr' ? 'Copier JSON' : 'Copy JSON')}</span>
                </button>
              </div>
            </div>

            {/* IMPORT / RESTORE CARD */}
            <form
              onSubmit={handleRestoreSubmit}
              className={`border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs flex flex-col justify-between ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h2 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'fr' ? 'Restauration de Sauvegarde' : 'Restore from Backup'}
                  </h2>
                </div>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr'
                    ? 'Chargez un fichier de sauvegarde .json ou collez directement son contenu pour restaurer instantanément l\'état complet de votre provenderie.'
                    : 'Select a .json backup file or paste its content directly to instantly restore your feed mill operational data.'}
                </p>

                {restoreError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}
                {restoreSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{restoreSuccess}</span>
                  </div>
                )}
              </div>

              {/* Hidden file input for one-click upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="space-y-2.5 pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition text-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{language === 'fr' ? 'Sélectionner Fichier (.json)' : 'Select Backup File (.json)'}</span>
                  </button>

                  <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'fr' ? 'ou coller le texte ci-dessous :' : 'or paste JSON below:'}
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={backupJson}
                  onChange={e => setBackupJson(e.target.value)}
                  placeholder={language === 'fr' ? 'Collez ici le contenu JSON complet de sauvegarde...' : 'Paste raw backup JSON content here...'}
                  className={`w-full rounded-xl p-2.5 font-mono text-[11px] border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />

                {backupJson.trim() && (
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Appliquer la Restauration' : 'Apply Restoration'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* DESKTOP APPLICATION & SHORTCUTS CARD */}
          <div className={`border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <MonitorDown className="w-4 h-4" />
                </div>
                <div>
                  <h2 className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    <span>{language === 'fr' ? 'Application de Bureau & Raccourcis Windows' : 'Desktop Application & Windows Shortcuts'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      {isStandalone ? (language === 'fr' ? 'Mode Bureau Actif' : 'Desktop Mode Active') : (language === 'fr' ? 'Web PWA' : 'Web PWA')}
                    </span>
                  </h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr'
                      ? 'Installez SCOOPS BIR SAA directement sur votre Bureau Windows ou téléchargez les scripts lanceurs autonomes.'
                      : 'Install SCOOPS BIR SAA directly to your Windows Desktop or download standalone launcher scripts.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDesktopInstallModal(true)}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition text-xs shrink-0"
              >
                <MonitorDown className="w-4 h-4" />
                <span>{language === 'fr' ? 'Ouvrir l\'Assistant d\'Installation' : 'Open Install Wizard'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Launcher bat */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-sky-500">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Lancer_SCOOPS_BIR_SAA.bat</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'fr'
                      ? 'Démarre le serveur local et ouvre l\'application en mode plein écran sans barre URL.'
                      : 'Starts local server and opens app in fullscreen mode without URL bar.'}
                  </p>
                </div>
                <div className="pt-3">
                  <a
                    href="/Lancer_SCOOPS_BIR_SAA.bat"
                    download="Lancer_SCOOPS_BIR_SAA.bat"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Télécharger (.bat)' : 'Download (.bat)'}</span>
                  </a>
                </div>
              </div>

              {/* Shortcut installer bat */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-500">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Installer_Raccourci_Bureau.bat</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'fr'
                      ? 'Place automatiquement le raccourci officiel avec l\'icône sur votre Bureau Windows.'
                      : 'Automatically places the official shortcut with icon on your Windows Desktop.'}
                  </p>
                </div>
                <div className="pt-3">
                  <a
                    href="/Installer_Raccourci_Bureau.bat"
                    download="Installer_Raccourci_Bureau.bat"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Télécharger (.bat)' : 'Download (.bat)'}</span>
                  </a>
                </div>
              </div>

              {/* Windows Icon ico */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                theme === 'dark' ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-500">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>app_icon.ico (Icône Windows)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'fr'
                      ? 'Icône Windows HD multi-résolution issue du logo de l\'entreprise.'
                      : 'HD multi-resolution Windows icon generated from company logo.'}
                  </p>
                </div>
                <div className="pt-3">
                  <a
                    href="/assets/app_icon.ico"
                    download="SCOOPS_BIR_SAA_icon.ico"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Télécharger (.ico)' : 'Download (.ico)'}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* FACTORY RESET CARD */}
          <div className={`border rounded-2xl p-5 space-y-3 ${
            theme === 'dark'
              ? 'bg-rose-950/20 border-rose-800/40'
              : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-rose-600 dark:text-rose-300 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  <span>{t('settings.reset_title')}</span>
                </h2>
                <p className="text-rose-700/80 dark:text-rose-400 text-xs">
                  {t('settings.reset_desc')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetData}
                disabled={isResetting}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer transition shrink-0 self-start sm:self-auto text-xs flex items-center gap-2"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'fr' ? 'Réinitialisation en cours...' : 'Resetting...'}</span>
                  </>
                ) : (
                  <span>{t('settings.reset_btn')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: POS THERMAL PRINTER SETTINGS */}
      {activeTab === 'printer' && (
        <form
          onSubmit={handleSavePrinterConfig}
          className={`border rounded-xl p-5 space-y-5 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b dark:border-slate-800 border-slate-200">
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Printer className="w-5 h-5 text-emerald-500" />
                <span>{language === 'fr' ? 'Configuration de l\'Imprimante Thermique POS' : 'POS Thermal Receipt Printer Configuration'}</span>
              </h2>
              <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'fr'
                  ? 'Gestion des tickets de caisse : rouleaux 58 mm / 80 mm, impression automatique hors-ligne, copies et messages personnalisés.'
                  : 'Receipt settings: 58 mm / 80 mm rolls, offline auto-printing, copies, and custom footer notices.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={testingPrinter}
                onClick={handleTestPrint}
                className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-2xs'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingPrinter ? 'animate-spin' : ''}`} />
                <span>{testingPrinter ? (language === 'fr' ? 'Test en cours...' : 'Testing...') : (language === 'fr' ? 'Tester l\'Imprimante' : 'Test Printer')}</span>
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              >
                {language === 'fr' ? 'Enregistrer Préférences' : 'Save Preferences'}
              </button>
            </div>
          </div>

          {printerSaveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{language === 'fr' ? 'Préférences d\'impression enregistrées avec succès dans le stockage local !' : 'Printer settings successfully saved locally!'}</span>
            </div>
          )}

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Paper Width Selection */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className={`block font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {language === 'fr' ? 'Largeur du Rouleau Thermique' : 'Thermal Roll Width'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrinterConfig({ ...printerConfig, paperWidth: '58mm' })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    printerConfig.paperWidth === '58mm'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500'
                      : theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold text-sm">58 mm</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {language === 'fr' ? 'Format compact (32 col.)' : 'Compact format (32 cols)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrinterConfig({ ...printerConfig, paperWidth: '80mm' })}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    printerConfig.paperWidth === '80mm'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500'
                      : theme === 'dark'
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold text-sm">80 mm</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {language === 'fr' ? 'Format standard POS (48 col.)' : 'Standard POS format (48 cols)'}
                  </div>
                </button>
              </div>
            </div>

            {/* Automatic Print on Sale */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <label className={`block font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'fr' ? 'Impression Automatique en Caisse' : 'Automatic POS Printing'}
                </label>
                <p className={`text-[11px] mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'fr'
                    ? 'Lancer l\'impression du ticket thermique dès validation de la vente sans confirmation supplémentaire.'
                    : 'Automatically trigger thermal print upon validating sale without extra clicks.'}
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printerConfig.autoPrintOnSale}
                  onChange={e => setPrinterConfig({ ...printerConfig, autoPrintOnSale: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-850'}`}>
                  {language === 'fr' ? 'Activer l\'impression automatique après chaque vente' : 'Enable auto-printing after completed sale'}
                </span>
              </label>
            </div>

            {/* Target Printer Name */}
            <div className="space-y-1">
              <label className={`block font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {language === 'fr' ? 'Nom de l\'imprimante Windows / Réseau (Optionnel) :' : 'Windows / Network Printer Name (Optional):'}
              </label>
              <input
                type="text"
                value={printerConfig.printerName || ''}
                onChange={e => setPrinterConfig({ ...printerConfig, printerName: e.target.value })}
                placeholder="Ex: POS-80, EPSON TM-T20, XP-58 (laisser vide pour spouleur par défaut)"
                className={`w-full rounded-lg p-2.5 font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              />
              <p className="text-[10px] text-slate-500">
                {language === 'fr'
                  ? 'Si non renseigné, le spouleur d\'impression par défaut de Windows sera utilisé.'
                  : 'If empty, the Windows default thermal printer will be targeted.'}
              </p>
            </div>

            {/* Copies Count */}
            <div className="space-y-1">
              <label className={`block font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {language === 'fr' ? 'Nombre d\'exemplaires :' : 'Number of copies:'}
              </label>
              <select
                value={printerConfig.copies}
                onChange={e => setPrinterConfig({ ...printerConfig, copies: Number(e.target.value) })}
                className={`w-full rounded-lg p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              >
                <option value={1}>1 exemplaire (Client)</option>
                <option value={2}>2 exemplaires (Client + Souche Caisse)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printerConfig.showLogo}
                  onChange={e => setPrinterConfig({ ...printerConfig, showLogo: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>
                  {language === 'fr' ? 'Imprimer le logo de l\'entreprise sur le ticket' : 'Print company logo on ticket'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printerConfig.showBarcode}
                  onChange={e => setPrinterConfig({ ...printerConfig, showBarcode: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>
                  {language === 'fr' ? 'Imprimer le code-barres / référence de la facture' : 'Print barcode / invoice reference'}
                </span>
              </label>
            </div>

            {/* Feed Lines */}
            <div className="space-y-1">
              <label className={`block font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                {language === 'fr' ? 'Lignes d\'espacement avant découpe :' : 'Feed lines before cut:'}
              </label>
              <select
                value={printerConfig.feedLines}
                onChange={e => setPrinterConfig({ ...printerConfig, feedLines: Number(e.target.value) })}
                className={`w-full rounded-lg p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              >
                <option value={2}>2 lignes (Économique)</option>
                <option value={3}>3 lignes (Standard)</option>
                <option value={4}>4 lignes</option>
                <option value={5}>5 lignes (Découpe manuelle aisée)</option>
              </select>
            </div>
          </div>

          {/* Custom Footer Message */}
          <div className="space-y-1 text-xs">
            <label className={`block font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
              {language === 'fr' ? 'Message de bas de ticket personnalisé :' : 'Custom ticket footer message:'}
            </label>
            <textarea
              rows={2}
              value={printerConfig.footerMessage}
              onChange={e => setPrinterConfig({ ...printerConfig, footerMessage: e.target.value })}
              className={`w-full rounded-lg p-2.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
              }`}
              placeholder="Ex: Merci de votre confiance et à très bientôt !"
            />
          </div>
        </form>
      )}
    </div>
  );
};
