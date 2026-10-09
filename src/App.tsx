import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { PosTerminal } from './components/pos/PosTerminal';
import { StockManager } from './components/stock/StockManager';
import { PurchasesManager } from './components/purchases/PurchasesManager';
import { InvoicesManager } from './components/invoices/InvoicesManager';
import { InventoryManager } from './components/inventory/InventoryManager';
import { CustomersManager } from './components/customers/CustomersManager';
import { ReportsManager } from './components/reports/ReportsManager';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { SettingsManager } from './components/settings/SettingsManager';
import { SuppliersManager } from './components/suppliers/SuppliersManager';
import { UserManager } from './components/admin/UserManager';
import { LoginPage } from './components/auth/LoginPage';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { DesktopInstallModal } from './components/modals/DesktopInstallModal';
import { DocumentationManager } from './components/documentation/DocumentationManager';
import { ExpensesManager } from './components/expenses/ExpensesManager';
import { ProductsManager } from './components/products/ProductsManager';
import { Invoice } from './types';

function AppContent() {
  const { currentUser, isAuthenticated, theme, showDesktopInstallModal, setShowDesktopInstallModal } = useApp();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeInvoiceForPrint, setActiveInvoiceForPrint] = useState<Invoice | null>(null);
  const [invoiceToSettle, setInvoiceToSettle] = useState<Invoice | null>(null);

  // If user is not authenticated, display Login Page with email & password + role quick-switch
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSaleCompleted = (invoice: Invoice) => {
    setActiveInvoiceForPrint(invoice);
  };

  const handleOpenPaymentFromInvoice = (invoice: Invoice) => {
    setActiveInvoiceForPrint(null);
    setInvoiceToSettle(invoice);
    setCurrentTab('customers');
  };

  const handleSelectEntity = (type: string, id: string, extra?: any) => {
    if (type === 'product') {
      setCurrentTab('stock');
    } else if (type === 'invoice') {
      if (extra) {
        setActiveInvoiceForPrint(extra);
      } else {
        setCurrentTab('invoices');
      }
    } else if (type === 'customer') {
      setCurrentTab('customers');
    } else if (type === 'supplier') {
      setCurrentTab('suppliers');
    } else if (type === 'movement') {
      setCurrentTab('stock');
    } else if (type === 'audit') {
      setCurrentTab('audit');
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 antialiased selection:bg-emerald-500 selection:text-white ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#FAF7F2] text-slate-900'
    }`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          setInvoiceToSettle(null);
        }}
        isMobileOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigateTab={tab => setCurrentTab(tab)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Viewport View Routing */}
        <main className={`flex-1 overflow-y-auto ${
          theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#FAF7F2] text-slate-900'
        }`}>
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigateTab={tab => setCurrentTab(tab)}
              onSelectInvoice={inv => setActiveInvoiceForPrint(inv)}
            />
          )}

          {currentTab === 'pos' && (
            <PosTerminal onSaleCompleted={handleSaleCompleted} />
          )}

          {currentTab === 'products' && <ProductsManager />}

          {currentTab === 'stock' && <StockManager />}

          {currentTab === 'catalog' && <ProductsManager />}

          {currentTab === 'purchases' && <PurchasesManager />}

          {currentTab === 'suppliers' && (
            <SuppliersManager onNavigateTab={tab => setCurrentTab(tab)} />
          )}

          {currentTab === 'expenses' && (
            <ExpensesManager onOpenReport={() => setCurrentTab('reports')} />
          )}

          {currentTab === 'admin_users' && <UserManager />}

          {currentTab === 'invoices' && (
            <InvoicesManager
              onOpenInvoiceModal={inv => setActiveInvoiceForPrint(inv)}
              onOpenPaymentModal={inv => handleOpenPaymentFromInvoice(inv)}
            />
          )}

          {currentTab === 'inventory' && <InventoryManager />}

          {currentTab === 'customers' && (
            <CustomersManager
              onSelectInvoice={inv => setActiveInvoiceForPrint(inv)}
              openPaymentForInvoice={invoiceToSettle}
            />
          )}

          {currentTab === 'reports' && <ReportsManager />}

          {currentTab === 'audit' && <AuditLogsView />}

          {currentTab === 'settings' && <SettingsManager />}

          {currentTab === 'documentation' && <DocumentationManager />}
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectEntity={handleSelectEntity}
      />

      <InvoiceModal
        invoice={activeInvoiceForPrint}
        onClose={() => setActiveInvoiceForPrint(null)}
        onOpenPaymentModal={handleOpenPaymentFromInvoice}
      />

      <DesktopInstallModal
        isOpen={showDesktopInstallModal}
        onClose={() => setShowDesktopInstallModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
