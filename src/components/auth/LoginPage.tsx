import React, { useState } from 'react';
import {
  Warehouse,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  Sun,
  Moon,
  Globe,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginPage: React.FC = () => {
  const { login, theme, toggleTheme, language, setLanguage, t, users } = useApp();

  const [email, setEmail] = useState('amadou.diallo@provenda.net');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const result = login(email, password);
      if (!result.success) {
        setError(result.error || t('login.error_invalid'));
        setIsSubmitting(false);
      }
    }, 250);
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    login(demoEmail, demoPass);
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
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Warehouse className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-base sm:text-lg">PROVENDA</span>
            <span className="ml-2 text-[10px] uppercase font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              v2.2
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className={`flex items-center rounded-lg p-0.5 border text-xs ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                language === 'fr'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border text-sm transition ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title={theme === 'dark' ? t('header.theme_light') : t('header.theme_dark')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@provenda.net"
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

            {/* Quick-Access Demo Accounts */}
            <div className="mt-6 pt-5 border-t border-slate-800/60 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('login.quick_test')}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">1-Clic</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    name: 'Amadou (Admin)',
                    role: 'administrateur',
                    email: 'amadou.diallo@provenda.net',
                    pass: 'admin123',
                    badge: 'Full / Admin',
                  },
                  {
                    name: 'Béatrice (Resp)',
                    role: 'responsable',
                    email: 'beatrice.ngoue@provenda.net',
                    pass: 'resp123',
                    badge: 'Remise ≤ 15%',
                  },
                  {
                    name: 'Patrick (Caisse)',
                    role: 'caissier',
                    email: 'patrick.kamga@provenda.net',
                    pass: 'caisse123',
                    badge: 'Caisse POS',
                  },
                  {
                    name: 'Samuel (Stock)',
                    role: 'magasinier',
                    email: 'samuel.tientcheu@provenda.net',
                    pass: 'mag123',
                    badge: 'Stock & CMP',
                  },
                ].map(demo => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickLogin(demo.email, demo.pass)}
                    className={`p-2.5 text-left rounded-xl border transition text-xs flex flex-col justify-between ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="font-semibold truncate">{demo.name}</div>
                    <div className="text-[10px] text-emerald-500 font-medium mt-1">
                      {demo.badge}
                    </div>
                  </button>
                ))}
              </div>
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
    </div>
  );
};
