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
import { getDatabaseStats } from '../../services/indexedDbStorage';

export const SettingsManager: React.FC = () => {
  const {
    settings,
    updateSettings,
    users,
    currentUser,
    setCurrentUser,
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
  } = useApp();

  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'security' | 'database' | 'printer'>('company');

  // Local state for company settings
  const [companyForm, setCompanyForm] = useState<CompanySettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

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
        } else {
          setCompanyForm(prev => ({ ...prev, logoUrl: dataUrl }));
        }
      };
      img.onerror = () => {
        setCompanyForm(prev => ({ ...prev, logoUrl: dataUrl }));
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
    setCompanyForm(prev => ({ ...prev, logoUrl: '' }));
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

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
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

  const handleResetData = () => {
    if (
      window.confirm(
        'ATTENTION : Cette action va réinitialiser l\'application avec les données d\'exemple complètes de démarrage. Continuer ?'
      )
    ) {
      resetToDefaultData();
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
      <div className={`flex border-b overflow-x-auto ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('company')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'company'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{t('settings.tab_company')}</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('settings.tab_users')} ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>{t('settings.tab_security')}</span>
        </button>

        {(currentUser.role === 'developpeur' || currentUser.role === 'administrateur') && (
          <button
            onClick={() => setActiveTab('database')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'database'
                ? 'border-emerald-500 text-emerald-500'
                : theme === 'dark'
                ? 'border-transparent text-slate-400 hover:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{language === 'fr' ? 'Base Locale & Sauvegardes' : 'Local DB & Backups'}</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('printer')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'printer'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
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
              {companyForm.logoUrl ? (
                <div className="relative">
                  <img
                    src={companyForm.logoUrl}
                    alt="Logo Entreprise"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl border border-slate-300 dark:border-slate-600 bg-white p-1.5 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow cursor-pointer transition"
                    title={language === 'fr' ? 'Supprimer le logo' : 'Remove logo'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition ${
                  theme === 'dark' ? 'border-slate-700 text-slate-500 bg-slate-800/30' : 'border-slate-300 text-slate-400 bg-white'
                }`}>
                  <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
                  <span className="text-[10px] leading-tight font-medium">
                    {language === 'fr' ? 'Aucun logo' : 'No logo'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className={`font-bold text-xs ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'fr' ? 'Logo Officiel de l\'Application & des Documents' : 'Official Application & Document Logo'}
                </span>
                {companyForm.logoUrl && (
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                    {language === 'fr' ? 'Actif' : 'Active'}
                  </span>
                )}
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
                    {companyForm.logoUrl
                      ? (language === 'fr' ? 'Changer de logo' : 'Change logo')
                      : (language === 'fr' ? 'Importer un logo depuis mon PC' : 'Upload logo from PC')}
                  </span>
                </button>

                {companyForm.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition cursor-pointer ${
                      theme === 'dark'
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'fr' ? 'Supprimer' : 'Remove'}
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
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {t('settings.users_list_title')}
              </h2>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('settings.users_readonly_notice')}
              </span>
            </div>

            <div className={`divide-y text-xs ${
              theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'
            }`}>
              {users.map(u => {
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
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          u.active
                            ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {u.active ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Inactif' : 'Inactive')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

      {/* TAB 4: DATABASE & LOCAL STORAGE (GOOGLE AI STUDIO & DESKTOP POS) */}
      {activeTab === 'database' && currentUser.role !== 'developpeur' && currentUser.role !== 'administrateur' && (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-center space-y-3">
          <Shield className="w-10 h-10 mx-auto text-rose-500" />
          <h2 className="text-base font-bold">
            {language === 'fr' ? 'Accès Restreint à l\'Administration' : 'Access Restricted to Administrators'}
          </h2>
          <p className="text-xs max-w-lg mx-auto opacity-90 leading-relaxed">
            {language === 'fr'
              ? "Le module de sauvegarde, de restauration et de gestion de la base de données est réservé à la direction pour prévenir toute altération ou perte accidentelle des données."
              : "The database backup, restoration, and management module is restricted to administration to prevent accidental data loss or corruption."}
          </p>
        </div>
      )}

      {activeTab === 'database' && (currentUser.role === 'developpeur' || currentUser.role === 'administrateur') && (
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
                  <div className="text-lg font-bold text-slate-400">{users.length}</div>
                  <div className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Comptes Utilisateurs' : 'User Accounts'}
                  </div>
                </div>
              </div>
            </div>
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
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer transition shrink-0 self-start sm:self-auto text-xs"
              >
                {t('settings.reset_btn')}
              </button>
            </div>
          </div>

          {/* OPTIONAL CLOUD MIRROR DETAILS (FOR DEVELOPERS) */}
          <details className={`border rounded-2xl p-4 transition-colors ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <summary className="font-bold cursor-pointer text-xs flex items-center gap-2 select-none py-1">
              <Cloud className="w-4 h-4 text-slate-400" />
              <span>{language === 'fr' ? 'Passerelle Optionnelle : Miroir Cloud Supabase (Avancé)' : 'Optional Gateway: Cloud Supabase Mirror (Advanced)'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 ml-auto uppercase">
                {language === 'fr' ? 'Facultatif' : 'Optional'}
              </span>
            </summary>

            <div className="pt-4 space-y-4 border-t border-slate-700/20 mt-3 text-xs">
              <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'fr'
                  ? 'Si vous souhaitez synchroniser un miroir central en temps réel en complément de la base locale, configurez ici vos identifiants Supabase.'
                  : 'If you wish to synchronize a cloud mirror alongside the local database, configure your Supabase credentials here.'}
              </p>

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold">{t('settings.supabase_url_label')}</label>
                    <input
                      type="url"
                      placeholder="https://xyz.supabase.co"
                      value={supabaseUrlInput}
                      onChange={e => setSupabaseUrlInput(e.target.value)}
                      className={`w-full rounded-xl p-2 font-mono text-xs border ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold">{t('settings.supabase_key_label')}</label>
                    <input
                      type="password"
                      placeholder="eyJhbGci..."
                      value={supabaseKeyInput}
                      onChange={e => setSupabaseKeyInput(e.target.value)}
                      className={`w-full rounded-xl p-2 font-mono text-xs border ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={testStatus.loading}
                    className="px-3 py-1.5 rounded-lg border font-semibold text-xs cursor-pointer hover:bg-slate-500/10"
                  >
                    {testStatus.loading ? 'Test...' : t('settings.supabase_test_btn')}
                  </button>

                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    {t('settings.supabase_save_btn')}
                  </button>

                  {supabaseConfig.isConfigured && (
                    <button
                      type="button"
                      onClick={handleDisconnectSupabase}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-500 font-semibold text-xs cursor-pointer"
                    >
                      {t('settings.supabase_disconnect_btn')}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePushToSupabase}
                    disabled={syncPushStatus.loading || !supabaseConfig.isConfigured}
                    className="bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Push Supabase</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromSupabase}
                    disabled={syncPullStatus.loading || !supabaseConfig.isConfigured}
                    className="px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pull Supabase</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="ml-auto px-3 py-1.5 rounded-lg border text-xs cursor-pointer"
                  >
                    {copiedSql ? 'SQL Copié !' : 'Copier SQL'}
                  </button>
                </div>

                {testStatus.message && (
                  <div className={`p-2 rounded-lg text-xs ${testStatus.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {testStatus.message}
                  </div>
                )}
                {syncPushStatus.message && (
                  <div className={`p-2 rounded-lg text-xs ${syncPushStatus.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {syncPushStatus.message}
                  </div>
                )}
              </form>
            </div>
          </details>
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
