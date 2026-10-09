import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Boxes,
  Truck,
  ClipboardList,
  Users,
  Building2,
  Package,
  BarChart3,
  History,
  Settings,
  AlertTriangle,
  CreditCard,
  UserCheck,
  BookOpen,
  Wallet,
  Sun,
  Moon,
  Globe,
  Cloud,
  RefreshCw,
  MonitorDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const {
    products,
    invoices,
    currentUser,
    theme,
    toggleTheme,
    language,
    setLanguage,
    t,
    syncStatus,
    lastSyncTime,
    triggerManualSync,
    isSupabaseConfigured,
    setShowDesktopInstallModal,
    isStandalone,
  } = useApp();

  // Alert counters
  const lowStockCount = products.filter(
    p => p.status === 'actif' && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
  ).length;

  const unpaidCreditCount = invoices.filter(
    i => (i.status === 'partielle' || i.status === 'crédit') && i.remainingBalance > 0
  ).length;

  const menuSections = [
    {
      title: language === 'fr' ? 'Opérations & Ventes' : 'Operations & Sales',
      items: [
        {
          id: 'dashboard',
          label: t('nav.dashboard'),
          icon: LayoutDashboard,
          badge: null,
          roles: ['administrateur', 'responsable', 'caissier', 'magasinier'],
        },
        {
          id: 'pos',
          label: t('nav.pos'),
          icon: ShoppingCart,
          badge: null,
          roles: ['administrateur', 'responsable', 'caissier'],
        },
        {
          id: 'invoices',
          label: t('nav.invoices'),
          icon: Receipt,
          badge: null,
          roles: ['administrateur', 'responsable', 'caissier'],
        },
        {
          id: 'customers',
          label: t('nav.customers'),
          icon: Users,
          badge: unpaidCreditCount > 0 ? `${unpaidCreditCount} dû` : null,
          badgeType: 'warning',
          roles: ['administrateur', 'responsable', 'caissier'],
        },
      ],
    },
    {
      title: language === 'fr' ? 'Stocks & Catalogue' : 'Stock & Catalog',
      items: [
        {
          id: 'products',
          label: t('nav.products') || (language === 'fr' ? 'Produits & Tarifs' : 'Products & Pricing'),
          icon: Package,
          badge: null,
          roles: ['administrateur', 'responsable', 'magasinier', 'caissier'],
        },
        {
          id: 'stock',
          label: t('nav.stock'),
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          badgeType: 'danger',
          roles: ['administrateur', 'responsable', 'magasinier', 'caissier'],
        },
        {
          id: 'purchases',
          label: t('nav.purchases'),
          icon: Truck,
          badge: null,
          roles: ['administrateur', 'responsable', 'magasinier'],
        },
        {
          id: 'inventory',
          label: t('nav.inventory'),
          icon: ClipboardList,
          badge: null,
          roles: ['administrateur', 'responsable', 'magasinier'],
        },
        {
          id: 'suppliers',
          label: t('nav.suppliers'),
          icon: Building2,
          badge: null,
          roles: ['administrateur', 'responsable', 'magasinier'],
        },
      ],
    },
    {
      title: language === 'fr' ? 'Pilotage & Administration' : 'Management & Admin',
      items: [
        {
          id: 'expenses',
          label: t('nav.expenses'),
          icon: Wallet,
          badge: null,
          roles: ['administrateur', 'responsable', 'caissier'],
        },
        {
          id: 'admin_users',
          label: t('nav.users'),
          icon: UserCheck,
          badge: currentUser.role === 'administrateur' ? 'Admin' : currentUser.role === 'developpeur' ? 'Dev' : null,
          badgeType: 'admin',
          roles: ['administrateur', 'responsable', 'magasinier', 'caissier'],
        },
        {
          id: 'reports',
          label: t('nav.reports'),
          icon: BarChart3,
          badge: 'Phase 3 & 4',
          badgeType: 'info',
          roles: ['administrateur', 'responsable'],
        },
        {
          id: 'audit',
          label: t('nav.audit'),
          icon: History,
          badge: null,
          roles: ['administrateur', 'responsable'],
        },
        {
          id: 'settings',
          label: t('nav.settings'),
          icon: Settings,
          badge: null,
          roles: ['administrateur', 'responsable'],
        },
        {
          id: 'documentation',
          label: t('nav.documentation'),
          icon: BookOpen,
          badge: 'PDF',
          badgeType: 'info',
          roles: ['administrateur', 'responsable', 'magasinier', 'caissier'],
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 w-64 border-r z-40 transition-colors duration-200 flex flex-col justify-between ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Navigation sections container with uniform vertical distribution */}
        <div className="py-3 px-3 overflow-y-auto flex-1 flex flex-col justify-between gap-3 min-h-0">
          {menuSections.map((section, sectionIdx) => {
            const allowedItems = section.items.filter(
              item => currentUser.role === 'developpeur' || item.roles.includes(currentUser.role)
            );

            if (allowedItems.length === 0) return null;

            return (
              <div key={sectionIdx} className="space-y-1 shrink-0">
                <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-b pb-1 mb-1.5 ${
                  theme === 'dark' ? 'text-slate-400 border-slate-800/80' : 'text-slate-500 border-slate-100'
                }`}>
                  <span>{section.title}</span>
                </div>

                <div className="space-y-1">
                  {allowedItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : theme === 'dark'
                            ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-400 group-hover:text-emerald-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
                            item.badgeType === 'danger'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : item.badgeType === 'warning'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : item.badgeType === 'admin'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : theme === 'dark'
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Automatic Cloud Sync Card */}
        <div className={`p-2.5 mx-3 mb-2 rounded-xl border transition shrink-0 ${
          theme === 'dark' ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50 border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
            <span className={`flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <Cloud className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'fr' ? 'Synchro Supabase' : 'Supabase Sync'}</span>
            </span>
            <button
              onClick={() => triggerManualSync(false)}
              disabled={syncStatus === 'syncing'}
              className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400 transition cursor-pointer disabled:opacity-50"
              title={language === 'fr' ? 'Forcer la synchronisation immédiate' : 'Sync now'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                syncStatus === 'syncing'
                  ? 'bg-blue-500 animate-ping'
                  : syncStatus === 'synced'
                  ? 'bg-emerald-500'
                  : syncStatus === 'offline'
                  ? 'bg-amber-500'
                  : isSupabaseConfigured
                  ? 'bg-emerald-500'
                  : 'bg-slate-500'
              }`} />
              <span className={syncStatus === 'error' ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                {syncStatus === 'syncing'
                  ? (language === 'fr' ? 'Synchronisation...' : 'Syncing...')
                  : syncStatus === 'offline'
                  ? (language === 'fr' ? 'Hors ligne (Local)' : 'Offline (Local)')
                  : syncStatus === 'error'
                  ? (language === 'fr' ? 'Erreur synchro' : 'Sync error')
                  : isSupabaseConfigured
                  ? (language === 'fr' ? 'Automatique active' : 'Auto-sync active')
                  : (language === 'fr' ? 'Non configuré' : 'Not configured')}
              </span>
            </div>

            {lastSyncTime && (
              <span className="text-[9px] text-slate-500 font-mono">
                {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Desktop App Quick Launch / Install Button */}
        <div className="px-3 pt-2 pb-1 shrink-0">
          <button
            onClick={() => setShowDesktopInstallModal(true)}
            className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800/80 hover:bg-slate-800 text-sky-400 border-slate-700/80'
                : 'bg-white hover:bg-slate-50 text-sky-700 border-slate-200 shadow-xs'
            }`}
            title={language === 'fr' ? 'Installer ou télécharger l\'application de bureau Windows' : 'Install or download Windows desktop app'}
          >
            <div className="flex items-center gap-2">
              <MonitorDown className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-semibold text-[11px]">
                {language === 'fr' ? 'Application Bureau' : 'Desktop App'}
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-sky-500/10 text-sky-500 border border-sky-500/20">
              {isStandalone ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Installer' : 'Install')}
            </span>
          </button>
        </div>

        {/* Bottom Theme & Language Controls */}
        <div className={`px-3 py-2 border-t flex items-center justify-between gap-2 shrink-0 ${
          theme === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80'
        }`}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
            }`}
            title={theme === 'dark' ? (language === 'fr' ? 'Passer en Mode Clair' : 'Switch to Light Mode') : (language === 'fr' ? 'Passer en Mode Sombre' : 'Switch to Dark Mode')}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
            <span className="text-[11px] font-bold">{theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}</span>
          </button>

          {/* Language Toggle Pill */}
          <div className={`flex rounded-xl border p-0.5 shrink-0 ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200/80 border-slate-300'
          }`}>
            <button
              onClick={() => setLanguage('fr')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                language === 'fr'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Français"
            >
              FR
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="English"
            >
              EN
            </button>
          </div>
        </div>

        {/* Bottom session indicator */}
        <div className={`p-3 border-t shrink-0 ${
          theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className={`rounded-xl p-2.5 border ${
            theme === 'dark' ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
              <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{t('sidebar.session_profile')}</span>
              <span className="text-emerald-500 capitalize">{t(`role.${currentUser.role}`) || currentUser.role}</span>
            </div>
            <div className={`text-[10px] flex items-center gap-1.5 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>{t('sidebar.max_discount')}</span>
              <span className="font-semibold text-emerald-500">
                {currentUser.role === 'caissier'
                  ? '0%'
                  : currentUser.role === 'responsable'
                  ? '≤ 15%'
                  : t('sidebar.unlimited')}
              </span>
            </div>
            <div className={`text-[10px] mt-1 flex items-center gap-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t('sidebar.rules_active')}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
