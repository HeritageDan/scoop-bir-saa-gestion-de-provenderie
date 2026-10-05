import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CompanySettings, Role } from '../../types';
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
    auditLogs,
    salesPoints,
    theme,
    language,
    t,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'security' | 'database'>('company');

  // Local state for company settings
  const [companyForm, setCompanyForm] = useState<CompanySettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

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

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

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

        {currentUser.role === 'developpeur' && (
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
            <span>{t('settings.tab_database')}</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded uppercase font-mono">
              Dev
            </span>
          </button>
        )}
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

      {/* TAB 4: DATABASE & CLOUD SUPABASE */}
      {activeTab === 'database' && currentUser.role !== 'developpeur' && (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-center space-y-3">
          <Shield className="w-10 h-10 mx-auto text-rose-500" />
          <h2 className="text-base font-bold">
            {language === 'fr' ? 'Accès Strictement Réservé au Développeur' : 'Access Strictly Restricted to Developer'}
          </h2>
          <p className="text-xs max-w-lg mx-auto opacity-90 leading-relaxed">
            {language === 'fr'
              ? "Le module de sauvegarde, de restauration et de gestion directe de la base de données Supabase est sous la responsabilité exclusive du développeur système afin de prévenir toute altération ou écrasement accidentel des données."
              : "The backup, restoration, and direct Supabase database management module is under the exclusive authority of the system developer to prevent accidental data corruption or loss."}
          </p>
        </div>
      )}

      {activeTab === 'database' && currentUser.role === 'developpeur' && (
        <div className="space-y-6 text-xs">
          {/* SUPABASE CLOUD DATABASE CARD */}
          <div className={`border rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs transition-colors ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-700/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {t('settings.supabase_title')}
                  </h2>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('settings.supabase_desc')}
                </p>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {supabaseConfig.isConfigured ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t('settings.supabase_status_connected')}</span>
                    <span className="text-[10px] opacity-75 font-mono">({supabaseConfig.source === 'env' ? 'Vercel Env' : 'Local'})</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                    <CloudOff className="w-3.5 h-3.5" />
                    <span>{t('settings.supabase_status_local')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Supabase Configuration Form */}
            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`block font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {t('settings.supabase_url_label')}
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzabcdefg.supabase.co"
                    value={supabaseUrlInput}
                    onChange={e => setSupabaseUrlInput(e.target.value)}
                    className={`w-full rounded-xl p-2.5 font-mono text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <span className={`text-[11px] block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'fr'
                      ? <span>Trouvable sous <i>Project Settings &gt; API &gt; Project URL</i> (ex: <code className="text-emerald-500">https://xyz.supabase.co</code> - <b>ne pas ajouter /rest/v1</b>)</span>
                      : <span>Found under <i>Project Settings &gt; API &gt; Project URL</i> (e.g. <code className="text-emerald-500">https://xyz.supabase.co</code> - <b>do not append /rest/v1</b>)</span>}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className={`block font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {t('settings.supabase_key_label')}
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKeyInput}
                    onChange={e => setSupabaseKeyInput(e.target.value)}
                    className={`w-full rounded-xl p-2.5 font-mono text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <span className={`text-[11px] block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    {language === 'fr' ? 'Trouvable dans Supabase sous Project Settings > API > anon / public' : 'Found in Supabase under Project Settings > API > anon / public'}
                  </span>

                  {/* Instant Key Inspection Feedback */}
                  {supabaseKeyInput && (() => {
                    const insp = inspectSupabaseKey(supabaseKeyInput, supabaseUrlInput);
                    if (!insp.isValidJwt || insp.mismatch) {
                      return (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{insp.hint}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                        <Check className="w-3 h-3" />
                        <span>Clé JWT valide (Projet: {insp.projectRef || 'Supabase'}, Rôle: {insp.role})</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Status Message */}
              {testStatus.message && (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  testStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span className="font-semibold">{testStatus.message}</span>
                  </div>
                  {testStatus.error && (
                    <div className="mt-1 p-2 rounded bg-black/10 dark:bg-black/30 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap select-all">
                      {testStatus.error}
                    </div>
                  )}
                </div>
              )}

              {/* Config Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={testStatus.loading}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold border transition cursor-pointer disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin' : ''}`} />
                  <span>{testStatus.loading ? (language === 'fr' ? 'Test en cours...' : 'Testing...') : t('settings.supabase_test_btn')}</span>
                </button>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('settings.supabase_save_btn')}</span>
                </button>

                {supabaseConfig.source === 'localStorage' && getVercelEnvConfig().isAvailable && (
                  <button
                    type="button"
                    onClick={handleResetToVercelEnv}
                    className="px-3.5 py-2 rounded-xl font-semibold border border-slate-500/30 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition cursor-pointer"
                    title={language === 'fr' ? "Effacer la configuration personnalisée et réactiver les variables d'environnement Vercel" : "Clear custom configuration and reactivate Vercel environment variables"}
                  >
                    {language === 'fr' ? 'Utiliser variables Vercel' : 'Use Vercel env'}
                  </button>
                )}

                {supabaseConfig.isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="px-3.5 py-2 rounded-xl font-semibold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    {t('settings.supabase_disconnect_btn')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopySql}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium border text-xs transition cursor-pointer ${
                    copiedSql
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  }`}
                  title={language === 'fr' ? "Copier le script SQL complet avec les droits d'accès" : "Copy full SQL script with access rights"}
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? t('settings.supabase_copied_sql_btn') : t('settings.supabase_copy_sql_btn')}</span>
                </button>
              </div>
            </form>

            {/* SYNC ACTIONS PANEL */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'fr' ? 'Synchronisation des Données Cloud' : 'Cloud Data Synchronization'}
                  </h3>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('settings.supabase_push_desc')}
                  </p>
                </div>
              </div>

              {/* Step by step reminder */}
              <div className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <div className="font-semibold text-emerald-500">
                  {language === 'fr' ? "Procédure d'initialisation en 3 étapes :" : "3-step initialization procedure:"}
                </div>
                <div>
                  {language === 'fr'
                    ? "1. Cliquez sur « Copier le Script SQL », ouvrez Supabase > SQL Editor > New Query, collez et cliquez sur Run."
                    : "1. Click \"Copy SQL Script\", open Supabase > SQL Editor > New Query, paste and click Run."}
                </div>
                <div>
                  {language === 'fr'
                    ? "2. Cliquez sur « Tester la Connexion » pour vérifier que la base est prête."
                    : "2. Click \"Test Connection\" to verify the database is ready."}
                </div>
                <div>
                  {language === 'fr'
                    ? "3. Cliquez sur « Envoyer les Données Locales vers Supabase (Push) »."
                    : "3. Click \"Push Local Data to Supabase\"."}
                </div>
              </div>

              {syncPushStatus.message && (
                <div className={`p-3 rounded-lg border text-xs space-y-2 ${
                  syncPushStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400'
                }`}>
                  <div className="font-semibold">{syncPushStatus.message}</div>
                  {syncPushStatus.error && (
                    <div className="p-2 rounded bg-black/20 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap select-all">
                      {syncPushStatus.error}
                    </div>
                  )}
                  {syncPushStatus.details && Object.keys(syncPushStatus.details).length > 0 && (
                    <div className="mt-1 text-[11px] opacity-80 flex flex-wrap gap-2">
                      {Object.entries(syncPushStatus.details).map(([tbl, count]) => (
                        <span key={tbl} className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/30 font-mono">
                          {tbl}: {String(count)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {syncPullStatus.message && (
                <div className={`p-2.5 rounded-lg border text-xs ${
                  syncPullStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400'
                }`}>
                  {syncPullStatus.message}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePushToSupabase}
                  disabled={syncPushStatus.loading || !supabaseConfig.isConfigured}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                  title={language === 'fr' ? "Envoyer les articles, factures et clients locaux vers Supabase" : "Send local articles, invoices and customers to Supabase"}
                >
                  <Upload className="w-4 h-4" />
                  <span>{syncPushStatus.loading ? (language === 'fr' ? 'Envoi en cours...' : 'Sending...') : t('settings.supabase_push_btn')}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={syncPullStatus.loading || !supabaseConfig.isConfigured}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold border transition cursor-pointer disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                  }`}
                  title={language === 'fr' ? "Télécharger les dernières données depuis Supabase pour mettre à jour l'application" : "Download latest data from Supabase to update application"}
                >
                  <Download className="w-4 h-4" />
                  <span>{syncPullStatus.loading ? (language === 'fr' ? 'Téléchargement...' : 'Downloading...') : t('settings.supabase_pull_btn')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Export card */}
          <div className={`border rounded-xl p-5 space-y-3 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Download className="w-4 h-4 text-emerald-500" />
              <span>{t('settings.backup_title')}</span>
            </h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              {t('settings.backup_desc')}
            </p>
            <button
              onClick={handleDownloadBackup}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>{t('settings.download_backup_btn')}</span>
            </button>
          </div>

          {/* Import / Restore card */}
          <form
            onSubmit={handleRestoreSubmit}
            className={`border rounded-xl p-5 space-y-3 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>{t('settings.restore_title')}</span>
            </h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              {t('settings.restore_desc')}
            </p>

            {restoreError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 rounded-lg">
                {restoreError}
              </div>
            )}
            {restoreSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-lg">
                {restoreSuccess}
              </div>
            )}

            <textarea
              rows={4}
              value={backupJson}
              onChange={e => setBackupJson(e.target.value)}
              placeholder={t('settings.restore_placeholder')}
              className={`w-full rounded-lg p-2.5 font-mono text-[11px] border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition"
            >
              <Upload className="w-4 h-4" />
              <span>{t('settings.restore_btn')}</span>
            </button>
          </form>

          {/* Reset card */}
          <div className={`border rounded-xl p-5 space-y-3 ${
            theme === 'dark'
              ? 'bg-rose-950/30 border-rose-800/60'
              : 'bg-rose-50/70 border-rose-200'
          }`}>
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-500" />
              <span>{t('settings.reset_title')}</span>
            </h2>
            <p className="text-rose-700/80 dark:text-rose-300">
              {t('settings.reset_desc')}
            </p>
            <button
              onClick={handleResetData}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm cursor-pointer transition"
            >
              {t('settings.reset_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
