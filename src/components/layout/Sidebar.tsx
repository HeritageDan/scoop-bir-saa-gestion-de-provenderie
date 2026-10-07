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
  const { products, invoices, currentUser, theme, language, t } = useApp();

  // Alert counters
  const lowStockCount = products.filter(
    p => p.status === 'actif' && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
  ).length;

  const unpaidCreditCount = invoices.filter(
    i => (i.status === 'partielle' || i.status === 'crédit') && i.remainingBalance > 0
  ).length;

  const menuItems = [
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
      id: 'customers',
      label: t('nav.customers'),
      icon: Users,
      badge: unpaidCreditCount > 0 ? `${unpaidCreditCount} dû` : null,
      badgeType: 'warning',
      roles: ['administrateur', 'responsable', 'caissier'],
    },
    {
      id: 'suppliers',
      label: t('nav.suppliers'),
      icon: Building2,
      badge: null,
      roles: ['administrateur', 'responsable', 'magasinier'],
    },
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
      badge: currentUser.role === 'administrateur' ? 'Admin' : null,
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
        <div className="py-3 px-3 space-y-1 overflow-y-auto flex-1">
          <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {t('sidebar.operational_nav')}
          </div>

          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isAllowed = currentUser.role === 'developpeur' || item.roles.includes(currentUser.role);

            return (
              <button
                key={item.id}
                disabled={!isAllowed}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isAllowed
                    ? theme === 'dark'
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 cursor-not-allowed opacity-40'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : isAllowed
                        ? 'text-slate-400 group-hover:text-emerald-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && isAllowed && (
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

        {/* Bottom session indicator */}
        <div className={`p-3 border-t ${
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
