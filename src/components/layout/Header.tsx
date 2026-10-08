import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  User as UserIcon,
  Shield,
  ChevronDown,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Menu,
  LogOut,
  MapPin,
  Building2,
  BookOpen,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { DEFAULT_APP_LOGO } from '../../config/defaultLogo';

interface HeaderProps {
  onOpenSearch: () => void;
  onNavigateTab: (tab: string) => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onNavigateTab, onToggleSidebar }) => {
  const {
    currentUser,
    users,
    switchRole,
    logout,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    settings,
    theme,
    toggleTheme,
    language,
    setLanguage,
    t,
    salesPoints,
    currentSalesPointId,
    setCurrentSalesPointId,
    currentSalesPoint,
  } = useApp();

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifDropdown(false);
      }
      if (roleRef.current && !roleRef.current.contains(target)) {
        setShowRoleDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifDropdown(false);
        setShowRoleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const roleLabels: Record<Role, { label: string; desc: string }> = {
    developpeur: {
      label: t('role.developpeur'),
      desc: language === 'fr' ? 'Superadmin, Sauvegardes & Restauration, Audit' : 'Superadmin, Backups & Restoration, Audit',
    },
    administrateur: {
      label: t('role.administrateur'),
      desc: language === 'fr' ? 'Gestion globale, catalogue, prix, supervision' : 'Global management, catalog, pricing, supervision',
    },
    responsable: {
      label: t('role.responsable'),
      desc: language === 'fr' ? 'Supervision, validation écarts, remises ≤ 15%' : 'Supervision, variance validation, discounts ≤ 15%',
    },
    caissier: {
      label: t('role.caissier'),
      desc: language === 'fr' ? 'Ventes, encaissement, facturation (remise 0%)' : 'Sales, register, checkout, invoicing (0% discount)',
    },
    magasinier: {
      label: t('role.magasinier'),
      desc: language === 'fr' ? 'Réceptions, entrées/sorties, inventaires' : 'Goods reception, movements, inventories',
    },
  };

  return (
    <header className={`h-16 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30 select-none transition-colors duration-200 ${
      theme === 'dark'
        ? 'bg-slate-900 border-slate-800 text-slate-100'
        : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Brand & Point de vente indicator */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg lg:hidden focus:outline-none ${
              theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <img
          src={settings.logoUrl || DEFAULT_APP_LOGO}
          alt={settings.name || 'COOPS BIR SAA'}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-contain bg-white p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 cursor-pointer"
          onClick={() => onNavigateTab('settings')}
          title="Cliquez pour configurer le logo ou l'entreprise"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold tracking-tight text-sm sm:text-base uppercase whitespace-nowrap">
              {settings.name || 'COOPS BIR SAA'}
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded shrink-0">
              POS
            </span>
            <span
              onClick={() => onNavigateTab('settings')}
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition shrink-0 ${
                isOnline
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20'
              }`}
              title={
                isOnline
                  ? (language === 'fr' ? 'En Ligne — Mode Local Autonome (Google AI Studio Ready)' : 'Online — Autonomous Local Mode (Google AI Studio Ready)')
                  : (language === 'fr' ? 'Hors Ligne — Base Locale 100% Fonctionnelle' : 'Offline — 100% Functional Local Database')
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isOnline ? (language === 'fr' ? 'En Ligne' : 'Online') : (language === 'fr' ? 'Hors Ligne' : 'Offline')}</span>
              <span className="opacity-40">|</span>
              <span className="font-mono text-[9px] opacity-80">{language === 'fr' ? 'Base Locale' : 'Local DB'}</span>
            </span>
          </div>

          {/* Single Sales Point Indicator */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5">
            <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-[260px] font-semibold text-slate-300">
              {salesPoints[0]?.name || 'Siège Principal & Usine (Douala Bassa)'}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Global Search Trigger */}
      <div className="flex-1 max-w-xs mx-2 lg:mx-4 hidden md:block">
        <button
          onClick={onOpenSearch}
          className={`w-full rounded-xl py-1.5 px-3 text-left text-xs flex items-center justify-between border transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
            theme === 'dark'
              ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-400'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{t('header.search_placeholder')}</span>
          </div>
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
            theme === 'dark' ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-200 text-slate-700 border-slate-300'
          }`}>
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Language, Theme, Notifications, User & Role Switcher */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          className={`md:hidden p-1.5 sm:p-2 rounded-lg transition shrink-0 cursor-pointer ${
            theme === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Recherche globale"
          aria-label="Recherche globale"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Documentation PDF Quick Access Button */}
        <button
          onClick={() => onNavigateTab('documentation')}
          className={`shrink-0 p-1.5 sm:p-2 rounded-lg border text-xs transition flex items-center gap-1.5 cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300'
              : 'bg-slate-100 border-slate-200 text-emerald-700 hover:bg-slate-200 shadow-xs'
          }`}
          title={language === 'fr' ? 'Documentation Complète & PDF' : 'Complete PDF Documentation'}
          aria-label="Documentation PDF"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline font-semibold text-[11px]">
            {language === 'fr' ? 'Doc PDF' : 'PDF Doc'}
          </span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifDropdown(prev => !prev);
              setShowRoleDropdown(false);
            }}
            className={`relative p-1.5 sm:p-2 rounded-lg transition focus:outline-none ${
              theme === 'dark'
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={t('header.notifications')}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl p-3 z-50 border animate-in fade-in slide-in-from-top-2 duration-150 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-2">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>{t('header.notifications')}</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                      {unreadCount}
                    </span>
                  )}
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Aucune notification active
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.linkTab) onNavigateTab(n.linkTab);
                        setShowNotifDropdown(false);
                      }}
                      className={`p-2.5 rounded-lg text-xs cursor-pointer transition border ${
                        !n.read
                          ? theme === 'dark'
                            ? 'bg-slate-700/60 border-slate-600'
                            : 'bg-emerald-50/70 border-emerald-200'
                          : theme === 'dark'
                          ? 'bg-slate-800/40 border-slate-800 text-slate-400'
                          : 'bg-slate-50 border-slate-100 text-slate-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold flex items-center gap-1.5">
                          {n.type === 'danger' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                          {n.type === 'warning' && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          {n.type === 'success' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{n.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {n.timestamp.slice(11, 16)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] opacity-90 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => {
              setShowRoleDropdown(prev => !prev);
              setShowNotifDropdown(false);
            }}
            className={`flex items-center gap-2 p-1.5 rounded-lg border transition focus:outline-none ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:border-slate-600 text-white'
                : 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800'
            }`}
          >
            <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center text-white font-semibold text-xs shadow-xs">
              {currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold leading-tight truncate max-w-[110px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-emerald-500 font-medium capitalize flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                {roleLabels[currentUser.role]?.label || currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleDropdown && (
            <div className={`absolute right-0 mt-2 w-72 rounded-xl shadow-2xl p-2 z-50 border animate-in fade-in slide-in-from-top-2 duration-150 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="px-3 py-2 border-b border-slate-700/50 mb-1">
                <div className="text-xs font-semibold">{currentUser.name}</div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentUser.email}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {roleLabels[currentUser.role]?.label || currentUser.role}
                  </span>
                  <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'fr' ? 'Remise max: ' : 'Max discount: '}
                    {currentUser.role === 'administrateur' || currentUser.role === 'developpeur'
                      ? (language === 'fr' ? 'Illimitée' : 'Unlimited')
                      : `${currentUser.discountLimitPercent}%`}
                  </span>
                </div>
              </div>

              {/* Navigation Quick Links */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    onNavigateTab('settings');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
                    theme === 'dark'
                      ? 'hover:bg-slate-700/60 text-slate-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('nav.settings')}</span>
                </button>

                {/* Theme Toggle row in dropdown */}
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                    theme === 'dark'
                      ? 'hover:bg-slate-700/60 text-slate-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                    <span>{theme === 'dark' ? (language === 'fr' ? 'Mode Clair' : 'Light Mode') : (language === 'fr' ? 'Mode Sombre' : 'Dark Mode')}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
                </button>

                {/* Language Toggle row in dropdown */}
                <button
                  onClick={() => {
                    setLanguage(language === 'fr' ? 'en' : 'fr');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                    theme === 'dark'
                      ? 'hover:bg-slate-700/60 text-slate-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'fr' ? 'Langue' : 'Language'}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">{language === 'fr' ? 'FR (Français)' : 'EN (English)'}</span>
                </button>
              </div>

              {/* Logout button */}
              <div className="mt-2 pt-2 border-t border-slate-700/50">
                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('header.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
