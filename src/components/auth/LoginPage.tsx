import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  AlertCircle,
  Cloud,
  CloudOff,
  CheckCircle2,
  RefreshCw,
  X,
  MonitorDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../../services/supabaseService';
import { DEFAULT_APP_LOGO } from '../../config/defaultLogo';
import { DesktopInstallModal } from '../modals/DesktopInstallModal';

export const LoginPage: React.FC = () => {
  const {
    login,
    theme,
    language,
    t,
    settings,
    triggerManualSync,
    isSupabaseConfigured,
    showDesktopInstallModal,
    setShowDesktopInstallModal,
    canInstallPwa,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cloud config modal state
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleOpenCloudModal = () => {
    const cfg = getSupabaseConfig();
    setCloudUrl(cfg.url);
    setCloudKey(cfg.anonKey);
    setTestResult(null);
    setShowCloudModal(true);
  };

  const handleTestCloud = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(cloudUrl, cloudKey);
      setTestResult({
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Erreur lors du test de connexion',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudUrl.trim() || !cloudKey.trim()) return;
    saveSupabaseConfig(cloudUrl, cloudKey);
    await triggerManualSync(false);
    setShowCloudModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || t('login.error_invalid'));
        setIsSubmitting(false);
      }
    } catch {
      setError(t('login.error_invalid'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Bar with Language and Theme Switchers */}
      <header className={`h-16 px-6 border-b flex items-center justify-between ${
        theme === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white/80'
      } backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          <img
            src={settings.logoUrl || DEFAULT_APP_LOGO}
            alt={settings.name || 'SCOOPS BIR SAA'}
            className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm"
          />
          <div>
            <span className="font-bold tracking-tight text-base sm:text-lg uppercase">
              {settings.name || 'SCOOPS BIR SAA'}
            </span>
            <span className="ml-2 text-[10px] uppercase font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              POS
            </span>
          </div>
        </div>

        {/* Top Right Cloud Supabase Link & Desktop App Buttons */}
        <div className="flex items-center gap-2">
          {/* Desktop App Download & Install Quick Access */}
          <button
            type="button"
            onClick={() => setShowDesktopInstallModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700 hover:text-sky-300'
                : 'bg-white border-slate-200 text-sky-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Installer ou télécharger l'application de bureau Windows"
          >
            <MonitorDown className="w-4 h-4 text-sky-500" />
            <span className="hidden sm:inline">
              {language === 'fr' ? 'App Bureau' : 'Desktop App'}
            </span>
            {canInstallPwa && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Prêt pour installation directe" />
            )}
          </button>

          <button
            onClick={handleOpenCloudModal}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              isSupabaseConfigured
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
            }`}
            title="Lier la base de données Supabase Cloud"
          >
            {isSupabaseConfigured ? (
              <Cloud className="w-4 h-4 text-emerald-500" />
            ) : (
              <CloudOff className="w-4 h-4 text-amber-500" />
            )}
            <span className="hidden sm:inline">
              {isSupabaseConfigured
                ? (language === 'fr' ? 'Cloud Connecté' : 'Cloud Connected')
                : (language === 'fr' ? 'Lier Base Cloud' : 'Connect Cloud')}
            </span>
          </button>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t('login.title')}
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('login.subtitle')}
            </p>
          </div>

          <div className={`p-6 sm:p-8 rounded-2xl border shadow-xl ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800 shadow-black/40'
              : 'bg-white border-slate-200 shadow-slate-200/60'
          }`}>
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                  {t('login.email')}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={language === 'fr' ? 'admin@scoopsbir.com ou identifiant' : 'admin@scoopsbir.com or username'}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-900/20 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isSubmitting ? '...' : t('login.submit')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Professional Authentication Notice */}
            <div className={`mt-6 pt-5 border-t text-xs ${
              theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-center gap-2 mb-2 font-medium">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700 font-semibold'}>
                  {language === 'fr' ? 'Accès Professionnel Sécurisé' : 'Secure Professional Access'}
                </span>
              </div>
              <p className="leading-relaxed text-[11px]">
                {language === 'fr'
                  ? "Veuillez saisir les identifiants qui vous ont été communiqués par l'administrateur de votre établissement pour ouvrir votre session de travail."
                  : "Please enter the credentials provided to you by your system administrator to start your work session."}
              </p>
            </div>
          </div>

          <div className={`text-center text-xs ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <p>{t('login.admin_note')}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`py-4 text-center text-xs border-t ${
        theme === 'dark' ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-400'
      }`}>
        Provenda &copy; {new Date().getFullYear()} &middot; Gestion de Provenderie &amp; Aliments de Bétail &middot; FCFA (XAF)
      </footer>

      {/* Cloud Supabase Configuration Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {language === 'fr' ? 'Liaison Supabase Cloud' : 'Connect Supabase Cloud'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'fr' 
                      ? 'Synchronisation des utilisateurs et des données' 
                      : 'Sync users and database across devices'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloudModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCloud} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                  {language === 'fr' ? 'URL du projet Supabase' : 'Supabase Project URL'}
                </label>
                <input
                  type="url"
                  required
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                  {language === 'fr' ? 'Clé API Publique (Anon Key)' : 'Anon Public Key'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={cloudKey}
                  onChange={(e) => setCloudKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed">
                {language === 'fr'
                  ? "Cette configuration est enregistrée dans ce navigateur afin que tout utilisateur créé (administrateur, caissier, etc.) puisse s'y connecter directement et automatiquement."
                  : "This configuration will be saved in this browser so that any created user (admin, cashier, etc.) can log in directly and automatically."}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestCloud}
                  disabled={testLoading || !cloudUrl.trim() || !cloudKey.trim()}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{testLoading ? 'Test en cours...' : (language === 'fr' ? 'Tester la connexion' : 'Test Connection')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloudModal(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                  >
                    {language === 'fr' ? 'Enregistrer & Synchroniser' : 'Save & Sync'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Install & Download Modal */}
      <DesktopInstallModal
        isOpen={showDesktopInstallModal}
        onClose={() => setShowDesktopInstallModal(false)}
      />
    </div>
  );
};
