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
            <span>Paramètres Système & Contrôles d'Accès</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Mentions légales, plafonds de remises, habilitations de profil et sauvegarde de l'activité.
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
          <span>Fiche Provenderie & Documents</span>
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
          <span>Utilisateurs & Rôles ({users.length})</span>
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
          <span>Plafonds & Remises Contrôlées</span>
        </button>

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
          <span>Sauvegarde & Restauration</span>
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
            Identité Fiscale & Coordonnées
          </h2>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Paramètres enregistrés avec succès !</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Nom de la Provenderie :
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
                Forme Juridique :
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
                Téléphone Principal :
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
                Téléphone Secondaire :
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
                Email Professionnel :
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
                Adresse & Ville :
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
                Numéro NIF :
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
                Registre de Commerce (RCCM) :
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
              Mentions Légales sur les Pièces Imprimées
            </h3>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Pied de page des Factures Officielles (A4) :
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
                Pied de page des Tickets de Caisse (Thermique 80mm) :
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
              Enregistrer les Mentions
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
              Session Active Actuelle
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
                    Rôle actif :{' '}
                    <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Plafond remise accordé :{' '}
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.role === 'administrateur'
                    ? '100% (Illimité)'
                    : `${currentUser.discountLimitPercent}%`}
                </span>
              </div>
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Comptes Utilisateurs Enregistrés
              </h2>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Cliquez pour permuter instantanément d'opérateur
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
                            Connecté
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Identifiant : {u.email} · Rôle :{' '}
                        <span className={`font-semibold uppercase ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Remise max : <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{u.discountLimitPercent}%</strong>
                      </span>
                      {!isCurrent && (
                        <button
                          onClick={() => setCurrentUser(u)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-2xs'
                          }`}
                        >
                          Passer sur ce compte
                        </button>
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
            Plafonds de Remises Contrôlées par Rôle (Section 9.1 & 18)
          </h2>
          <p className={`leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Pour protéger la rentabilité de la provenderie et éviter les dérives de caisse, les
            remises sont strictement bornées selon l'habilitation hiérarchique de l'opérateur.
          </p>

          <div className="space-y-3 pt-2">
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Profil Caissier :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Par défaut fixé à 0% (Aucune remise sans accord de la hiérarchie).
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
                  Profil Responsable :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Plafond d'autorisation pour négociation commerciale directe (défaut : 15%).
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
                  Profil Administrateur :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Pouvoir discrétionnaire complet avec traçabilité obligatoire dans l'audit.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">100% (Illimité)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer transition"
            >
              Enregistrer les Plafonds
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: DATABASE & CLOUD SUPABASE */}
      {activeTab === 'database' && (
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
                    Base de Données Cloud (Supabase PostgreSQL)
                  </h2>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Connectez votre application déployée sur Vercel à une base de données cloud temps réel pour synchroniser plusieurs appareils (PC, tablettes, smartphones).
                </p>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {supabaseConfig.isConfigured ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connecté à Supabase</span>
                    <span className="text-[10px] opacity-75 font-mono">({supabaseConfig.source === 'env' ? 'Vercel Env' : 'Local'})</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                    <CloudOff className="w-3.5 h-3.5" />
                    <span>Mode Local (LocalStorage)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Supabase Configuration Form */}
            <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`block font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    URL du Projet Supabase (Project URL) :
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
                    Trouvable sous <i>Project Settings &gt; API &gt; Project URL</i> (ex: <code className="text-emerald-500">https://xyz.supabase.co</code> - <b>ne pas ajouter /rest/v1</b>)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className={`block font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Clé Publique Anon (Project API anon key) :
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
                    Trouvable dans Supabase sous <i>Project Settings &gt; API &gt; anon / public</i>
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
                  <span>{testStatus.loading ? 'Test en cours...' : 'Tester la connexion & tables'}</span>
                </button>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer la Configuration</span>
                </button>

                {supabaseConfig.source === 'localStorage' && getVercelEnvConfig().isAvailable && (
                  <button
                    type="button"
                    onClick={handleResetToVercelEnv}
                    className="px-3.5 py-2 rounded-xl font-semibold border border-slate-500/30 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition cursor-pointer"
                    title="Effacer la configuration personnalisée et réactiver les variables d'environnement Vercel"
                  >
                    Utiliser variables Vercel
                  </button>
                )}

                {supabaseConfig.isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="px-3.5 py-2 rounded-xl font-semibold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    Déconnecter / Revenir au Local
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
                  title="Copier le script SQL complet avec les droits d'accès"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Script SQL Copié !' : 'Copier supabase-schema.sql'}</span>
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
                    Synchronisation des Données
                  </h3>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Transférez vos données locales vers le cloud pour la première initialisation, ou téléchargez les données du cloud.
                  </p>
                </div>
              </div>

              {/* Step by step reminder */}
              <div className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <div className="font-semibold text-emerald-500">Procédure d'initialisation en 3 étapes :</div>
                <div>1. Cliquez sur <span className="font-mono bg-black/10 dark:bg-black/30 px-1 py-0.5 rounded">Copier supabase-schema.sql</span>, ouvrez <b>Supabase &gt; SQL Editor &gt; New Query</b>, collez et cliquez sur <b>Run</b>.</div>
                <div>2. Cliquez sur <span className="font-semibold">« Tester la connexion & tables »</span> pour vérifier que <i>sales_points</i> est accessible.</div>
                <div>3. Cliquez sur le bouton vert <span className="font-semibold text-emerald-600 dark:text-emerald-400">« Envoyer les Données Locales vers Supabase (Push) »</span>.</div>
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
                  title="Envoyer les articles, factures et clients locaux vers Supabase"
                >
                  <Upload className="w-4 h-4" />
                  <span>{syncPushStatus.loading ? 'Envoi en cours...' : 'Envoyer les Données Locales vers Supabase (Push)'}</span>
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
                  title="Télécharger les dernières données depuis Supabase pour mettre à jour l'application"
                >
                  <Download className="w-4 h-4" />
                  <span>{syncPullStatus.loading ? 'Téléchargement...' : 'Récupérer les Données depuis Supabase (Pull)'}</span>
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
              <span>Sauvegarde Totale des Données (Export JSON)</span>
            </h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Téléchargez un instantané complet et structuré de l'application : produits, stocks au
              CMP, clients, fournisseurs, factures, avoirs, mouvements et pistes d'audit.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>Générer le Fichier de Sauvegarde</span>
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
              <span>Restauration de la Base de Données</span>
            </h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Collez ci-dessous le contenu d'un fichier de sauvegarde pour réinjecter l'ensemble des
              données de la provenderie.
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
              placeholder="Collez ici le JSON de sauvegarde..."
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
              <span>Restaurer les Données</span>
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
              <span>Réinitialisation Usine des Données de Test</span>
            </h2>
            <p className="text-rose-700/80 dark:text-rose-300">
              Réinitialise le stockage local avec les matières premières, formules d'aliments et
              historique d'exemple certifiés.
            </p>
            <button
              onClick={handleResetData}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm cursor-pointer transition"
            >
              Réinitialiser la Base
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
