import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  CreditCard,
  Percent,
  Download,
  Eye,
  Truck,
  Wallet,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatFCFA, formatDate, formatNumber } from '../../utils/formatters';
import {
  DateFilterPreset,
  DateRange,
  getDateRangeFromPreset,
  isDateInRange,
  formatHumanDateRange,
  formatToDateInput,
} from '../../utils/dateFilterUtils';
import { ReportPrintModal, ReportDocType } from './ReportPrintModal';
import {
  generateSalesReportPDF,
  generateFinancialReportPDF,
  generateInventoryReportPDF,
  generatePurchaseReportPDF,
  generateExpenseReportPDF,
} from '../../utils/reportPdfGenerator';

export const ReportsManager: React.FC = () => {
  const {
    products,
    invoices,
    purchases,
    expenses,
    stockMovements,
    settings,
    customers,
    currentSalesPoint,
    currentUser,
    theme,
    language,
    t,
  } = useApp();

  // Active Report Tab
  const [activeReportTab, setActiveReportTab] = useState<ReportDocType>('sales');

  // Date Filter Preset & Custom Range
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('this_month');
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: formatToDateInput(firstDay),
      endDate: formatToDateInput(now),
    };
  });

  // Category filter for inventory
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Print Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Resolved Date Range (YYYY-MM-DD)
  const resolvedDateRange = useMemo(() => {
    return getDateRangeFromPreset(datePreset, customRange);
  }, [datePreset, customRange]);

  const { startDate, endDate } = resolvedDateRange;

  // Filtered dataset for active date range (sorted descending by creation / transaction date)
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => inv.status !== 'annulée' && isDateInRange(inv.date, startDate, endDate))
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return timeB - timeA;
      });
  }, [invoices, startDate, endDate]);

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => {
        const d = p.receptionDate || p.orderDate;
        return isDateInRange(d, startDate, endDate);
      })
      .sort((a, b) => {
        const timeA = new Date(a.receptionDate || a.orderDate).getTime();
        const timeB = new Date(b.receptionDate || b.orderDate).getTime();
        return timeB - timeA;
      });
  }, [purchases, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => isDateInRange(e.date, startDate, endDate))
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        return timeB - timeA;
      });
  }, [expenses, startDate, endDate]);

  // Aggregate Key Figures
  const grossSales = filteredInvoices.reduce((s, i) => s + i.subtotalGross, 0);
  const totalDiscounts = filteredInvoices.reduce((s, i) => s + i.totalDiscount, 0);
  const netSales = filteredInvoices.reduce((s, i) => s + i.totalNet, 0);
  const totalCOGS = filteredInvoices.reduce((s, i) => s + i.totalCostOfGoodsSold, 0);
  const grossProfit = netSales - totalCOGS;
  const marginRateSales = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const totalPurchasesAmount = filteredPurchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalExpensesAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netOperatingProfit = grossProfit - totalExpensesAmount;

  const totalStockValuation = useMemo(() => {
    return products
      .filter(p => p.status === 'actif')
      .reduce((sum, p) => sum + p.stockCurrentBaseUnit * p.cmp, 0);
  }, [products]);

  const isEn = language === 'en';

  // Direct PDF Download Handler
  const handleDirectDownloadPDF = () => {
    if (activeReportTab === 'sales') {
      generateSalesReportPDF(invoices, startDate, endDate, settings, currentSalesPoint, currentUser, language, expenses);
    } else if (activeReportTab === 'financial') {
      generateFinancialReportPDF(invoices, purchases, expenses, products, startDate, endDate, settings, currentSalesPoint, currentUser, language);
    } else if (activeReportTab === 'inventory') {
      generateInventoryReportPDF(products, categoryFilter, settings, currentSalesPoint, currentUser, language);
    } else if (activeReportTab === 'purchases') {
      generatePurchaseReportPDF(purchases, startDate, endDate, settings, currentSalesPoint, currentUser, language);
    } else if (activeReportTab === 'expenses') {
      generateExpenseReportPDF(expenses, startDate, endDate, settings, currentSalesPoint, currentUser, language);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `rapport_${activeReportTab}_${startDate}_${endDate}.csv`;

    if (activeReportTab === 'sales') {
      headers = ['N° Facture', 'Date', 'Client', 'Articles', 'Brut (FCFA)', 'Remise', 'Net (FCFA)', 'Paiement', 'Statut'];
      rows = filteredInvoices.map(inv => [
        `"${inv.number}"`,
        `"${inv.date} ${inv.time || ''}"`,
        `"${inv.customerName}"`,
        `"${inv.items.map(it => `${it.productName} (${it.quantity} ${it.unit})`).join(', ')}"`,
        inv.subtotalGross,
        inv.totalDiscount,
        inv.totalNet,
        `"${inv.payments && inv.payments.length > 0 ? inv.payments[0].method : 'Crédit'}"`,
        `"${inv.status}"`,
      ]);
    } else if (activeReportTab === 'expenses') {
      headers = ['Réf', 'Date', 'Catégorie', 'Description', 'Montant (FCFA)', 'Règlement', 'Auteur'];
      rows = filteredExpenses.map(e => [
        `"${e.referenceNumber}"`,
        `"${e.date}"`,
        `"${e.category}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        e.amount,
        `"${e.paymentMethod}"`,
        `"${e.recordedBy}"`,
      ]);
    } else if (activeReportTab === 'purchases') {
      headers = ['Réf Bon', 'Date', 'Fournisseur', 'Montant Lignes', 'Frais Transport', 'Total TTC (FCFA)', 'Statut'];
      rows = filteredPurchases.map(p => [
        `"${p.referenceNumber}"`,
        `"${p.receptionDate || p.orderDate}"`,
        `"${p.supplierName}"`,
        p.subtotal,
        p.transportFees,
        p.totalAmount,
        `"${p.status}"`,
      ]);
    } else if (activeReportTab === 'inventory') {
      headers = ['Code', 'Désignation', 'Catégorie', 'Stock Dispo', 'Unité Base', 'CMP (FCFA)', 'Prix Vente', 'Valeur Actif CMP (FCFA)'];
      rows = products.filter(p => p.status !== 'archivé').map(p => [
        `"${p.code}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        p.stockCurrentBaseUnit,
        `"${p.baseUnit}"`,
        p.cmp,
        p.salePrice,
        p.stockCurrentBaseUnit * p.cmp,
      ]);
    } else {
      headers = ['Poste Analytique', 'Montant (FCFA)'];
      rows = [
        ['Chiffre d\'Affaires Brut', grossSales],
        ['Remises commerciales', -totalDiscounts],
        ['Chiffre d\'Affaires Net', netSales],
        ['Coût des Marchandises Vendues (CMP)', -totalCOGS],
        ['Marge Brute sur Marchandises', grossProfit],
        ['Charges d\'Exploitation', -totalExpensesAmount],
        ['Résultat Net d\'Exploitation', netOperatingProfit],
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            <span>{isEn ? 'Reports & Management Statements Center' : 'Centre de Rapports & États de Gestion'}</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {isEn
              ? 'Certified multi-page report publishing with pagination, recurring headers and PDF export for audit and executive management.'
              : 'Édition de rapports certifiés multi-pages avec pagination, en-têtes récurrents et export PDF pour l\'audit et la direction.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={handleExportCSV}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
            title={isEn ? 'Export data to Excel / CSV format' : 'Exporter les données au format Excel / CSV'}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">{isEn ? 'Export CSV' : 'Exporter CSV'}</span>
          </button>

          <button
            onClick={handleDirectDownloadPDF}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
            title={isEn ? 'Download A4 PDF report directly' : 'Télécharger directement le rapport PDF A4'}
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>{isEn ? 'Download PDF' : 'Télécharger PDF'}</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition cursor-pointer"
            title={isEn ? 'Preview A4 document and print' : 'Prévisualiser le document A4 et lancer l\'impression'}
          >
            <Printer className="w-4 h-4" />
            <span>{isEn ? 'Preview & Print' : 'Prévisualiser & Imprimer'}</span>
          </button>
        </div>
      </div>

      {/* Date Filter Controls & Presets */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isEn ? 'Period :' : 'Période :'}</span>
          </span>

          {[
            { id: 'today', label: isEn ? 'Today' : "Aujourd'hui" },
            { id: 'yesterday', label: isEn ? 'Yesterday' : 'Hier' },
            { id: 'this_week', label: isEn ? 'This week' : 'Cette semaine' },
            { id: 'this_month', label: isEn ? 'This month' : 'Ce mois' },
            { id: 'custom', label: isEn ? 'Custom...' : 'Personnalisée...' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDatePreset(tab.id as DateFilterPreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                datePreset === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Pickers for Custom Range */}
        {datePreset === 'custom' ? (
          <div className="flex items-center gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{isEn ? 'From :' : 'Du :'}</span>
              <input
                type="date"
                value={customRange.startDate}
                onChange={e => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{isEn ? 'To :' : 'Au :'}</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={e => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono">
            {formatHumanDateRange(startDate, endDate, language)}
          </div>
        )}
      </div>

      {/* KPI Overview Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Net Turnover' : 'CA Net Ventes'}
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-500 font-mono mt-1">
            {formatFCFA(netSales)}
          </div>
          <span className="text-[10px] text-slate-400">
            {isEn ? `${filteredInvoices.length} invoice(s) issued` : `${filteredInvoices.length} facture(s) émise(s)`}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Gross Margin (WAC)' : 'Marge Brute (CMP)'}
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-1">
            +{formatFCFA(grossProfit)}
          </div>
          <span className="text-[10px] text-slate-400">
            {isEn ? 'Markup rate :' : 'Taux de marque :'} <strong className="text-white">{marginRateSales.toFixed(1)}%</strong>
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Operating Expenses' : 'Dépenses Exploitation'}
          </span>
          <div className="text-xl sm:text-2xl font-bold text-rose-500 font-mono mt-1">
            -{formatFCFA(totalExpensesAmount)}
          </div>
          <span className="text-[10px] text-slate-400">
            {isEn ? `${filteredExpenses.length} charge(s) paid` : `${filteredExpenses.length} charge(s) décaissée(s)`}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEn ? 'Net Operating Income' : "Résultat Net d'Exploitation"}
          </span>
          <div className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
            netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {netOperatingProfit >= 0 ? `+${formatFCFA(netOperatingProfit)}` : formatFCFA(netOperatingProfit)}
          </div>
          <span className="text-[10px] text-slate-400">
            {isEn ? 'Net profit after overhead' : 'Bénéfice net après charges'}
          </span>
        </div>
      </div>

      {/* Report Types Tabs Navigation */}
      <div className={`flex border-b overflow-x-auto gap-2 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {[
          { id: 'sales', label: isEn ? '1. Sales & Cash Receipts' : '1. Ventes & Encaissements', icon: DollarSign },
          { id: 'financial', label: isEn ? '2. Income Statement & Profitability' : '2. Compte de Résultat & Finances', icon: TrendingUp },
          { id: 'inventory', label: isEn ? '3. Inventory & WAC Valuation' : '3. Stock & Valorisation CMP', icon: Package },
          { id: 'purchases', label: isEn ? '4. Purchases & Supplies' : '4. Approvisionnements Achats', icon: Truck },
          { id: 'expenses', label: isEn ? '5. Operating Expenses' : '5. Dépenses d\'Exploitation', icon: Wallet },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as ReportDocType)}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                  : theme === 'dark'
                  ? 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* On-Screen Report Preview Area */}
      <div className={`rounded-2xl border p-4 sm:p-6 ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-slate-400">
              {isEn ? 'Interactive preview :' : 'Aperçu interactif :'}
            </span>
            <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
              {startDate} → {endDate}
            </span>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>{isEn ? 'Open layout editor' : 'Ouvrir l\'éditeur de mise en page'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab 1: Sales Table Preview */}
        {activeReportTab === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[11px] font-bold uppercase ${
                theme === 'dark' ? 'text-slate-400 bg-slate-800/60 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}>
                <tr>
                  <th className="py-2.5 px-3">{isEn ? 'Date' : 'Date'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Invoice #' : 'N° Facture'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Customer' : 'Client'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Items' : 'Articles'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Gross' : 'Brut'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Discount' : 'Remise'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Net' : 'Net'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Margin' : 'Marge'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Status' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      {isEn ? 'No sales recorded for this period.' : 'Aucune vente enregistrée sur cette période.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.slice(0, 15).map(inv => (
                    <tr key={inv.id} className={theme === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">{formatDate(inv.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">{inv.number}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">{inv.customerName}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px] truncate max-w-xs">
                        {inv.items.map(it => `${it.productName} (${it.quantity})`).join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatNumber(inv.subtotalGross)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-400">{inv.totalDiscount > 0 ? `-${formatNumber(inv.totalDiscount)}` : '0'}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatNumber(inv.totalNet)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">+{formatNumber(inv.grossMargin)}</td>
                      <td className="py-2.5 px-3 font-sans capitalize text-slate-400">
                        {inv.status === 'payée' ? (isEn ? 'Paid' : 'payée') : inv.status === 'partielle' ? (isEn ? 'Partial' : 'partielle') : (isEn ? 'Pending' : 'en attente')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredInvoices.length > 15 && (
              <div className="text-center py-3 text-xs text-slate-400 font-sans border-t border-slate-800">
                {isEn
                  ? `Showing first 15 transactions out of ${filteredInvoices.length}. Click Preview & Print to view and print the complete report.`
                  : `Affichage des 15 premières transactions sur ${filteredInvoices.length}. Cliquez sur Prévisualiser & Imprimer pour voir et imprimer l'intégralité du rapport.`}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Financial Preview */}
        {activeReportTab === 'financial' && (
          <div className="space-y-4 max-w-3xl mx-auto font-sans text-xs">
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between py-1.5 border-b border-slate-700/50">
                <span className="font-semibold">{isEn ? 'Gross Sales Revenue :' : "Chiffre d'Affaires Brut :"}</span>
                <span className="font-mono font-bold">{formatFCFA(grossSales)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/50 text-amber-400">
                <span>{isEn ? 'Commercial discounts deducted :' : 'Remises commerciales déduites :'}</span>
                <span className="font-mono">-{formatFCFA(totalDiscounts)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/50 font-bold text-emerald-400 text-sm">
                <span>{isEn ? 'Net Sales Revenue :' : "Chiffre d'Affaires Net :"}</span>
                <span className="font-mono">{formatFCFA(netSales)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/50 text-slate-400">
                <span>{isEn ? 'Cost of Goods Sold (CMP / WAC) :' : 'Coût des Marchandises Vendues (CMP) :'}</span>
                <span className="font-mono">-{formatFCFA(totalCOGS)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/50 font-bold text-slate-200">
                <span>{isEn ? 'Gross Commercial Margin :' : 'Marge Commerciale Brute :'}</span>
                <span className="font-mono text-emerald-400">+{formatFCFA(grossProfit)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/50 text-rose-400">
                <span>{isEn ? 'Operating Charges & Expenses :' : "Charges et Dépenses d'Exploitation :"}</span>
                <span className="font-mono">-{formatFCFA(totalExpensesAmount)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-black text-white pt-2">
                <span>{isEn ? 'Net Operating Profit / (Loss) :' : 'Résultat Net Réel (Bénéfice) :'}</span>
                <span className={`font-mono ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netOperatingProfit >= 0 ? `+${formatFCFA(netOperatingProfit)}` : formatFCFA(netOperatingProfit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Inventory Preview */}
        {activeReportTab === 'inventory' && (
          <div className="overflow-x-auto">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-400">{isEn ? 'Filter by category :' : 'Filtrer par catégorie :'}</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="all">{isEn ? 'All categories' : 'Toutes les catégories'}</option>
                <option value="Matières premières">{isEn ? 'Raw materials' : 'Matières premières'}</option>
                <option value="Concentrés, prémix et compléments">{isEn ? 'Concentrates, premix & supplements' : 'Concentrés, prémix et compléments'}</option>
                <option value="Aliments finis">{isEn ? 'Finished feeds' : 'Aliments finis'}</option>
                <option value="Autres fournitures">{isEn ? 'Other supplies' : 'Autres fournitures'}</option>
              </select>
            </div>
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[11px] font-bold uppercase ${
                theme === 'dark' ? 'text-slate-400 bg-slate-800/60 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}>
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">{isEn ? 'Product' : 'Produit'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Category' : 'Catégorie'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Stock' : 'Stock'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'WAC (U)' : 'CMP (U)'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Sale Price' : 'Prix Vente'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Stock Value (CMP)' : 'Valeur Stock (CMP)'}</th>
                  <th className="py-2.5 px-3 text-center">{isEn ? 'Status' : 'État'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {products
                  .filter(p => p.status !== 'archivé' && (categoryFilter === 'all' || p.category === categoryFilter))
                  .slice(0, 15)
                  .map(p => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 text-slate-400">{p.code}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-white">{p.name}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">{p.category}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-200">{p.stockCurrentBaseUnit} {p.baseUnit}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatNumber(p.cmp)} FCFA</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{formatNumber(p.salePrice)} FCFA</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatFCFA(p.stockCurrentBaseUnit * p.cmp)}</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.stockCurrentBaseUnit <= 0 ? 'bg-rose-500/20 text-rose-400' : p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {p.stockCurrentBaseUnit <= 0
                            ? (isEn ? 'Out of stock' : 'Rupture')
                            : p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
                            ? (isEn ? 'Low stock' : 'Alerte')
                            : (isEn ? 'Normal' : 'Normal')}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Purchases Preview */}
        {activeReportTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[11px] font-bold uppercase ${
                theme === 'dark' ? 'text-slate-400 bg-slate-800/60 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}>
                <tr>
                  <th className="py-2.5 px-3">{isEn ? 'Order Ref' : 'Réf Bon'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Date' : 'Date'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Supplier' : 'Fournisseur'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Subtotal' : 'Sous-total'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Transport' : 'Transport'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Total (FCFA)' : 'Total TTC'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Status' : 'Statut'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      {isEn ? 'No purchases or supplies recorded for this period.' : 'Aucun approvisionnement enregistré sur cette période.'}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-bold text-white">{p.referenceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-400">{formatDate(p.receptionDate || p.orderDate)}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">{p.supplierName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">{formatNumber(p.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-400">{p.transportFees > 0 ? `+${formatNumber(p.transportFees)}` : '0'}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatFCFA(p.totalAmount)}</td>
                      <td className="py-2.5 px-3 font-sans capitalize text-slate-400">
                        {p.status === 'validé' ? (isEn ? 'Validated' : 'validé') : (isEn ? 'Draft' : 'brouillon')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Expenses Preview */}
        {activeReportTab === 'expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[11px] font-bold uppercase ${
                theme === 'dark' ? 'text-slate-400 bg-slate-800/60 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}>
                <tr>
                  <th className="py-2.5 px-3">{isEn ? 'Ref' : 'Réf'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Date' : 'Date'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Category' : 'Catégorie'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Description' : 'Description'}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? 'Amount' : 'Montant'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Payment Method' : 'Règlement'}</th>
                  <th className="py-2.5 px-3">{isEn ? 'Author' : 'Auteur'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      {isEn ? 'No expenses recorded for this period.' : 'Aucune dépense enregistrée sur cette période.'}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id}>
                      <td className="py-2.5 px-3 font-bold text-rose-400">{e.referenceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-400">{formatDate(e.date)}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{e.category}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 max-w-xs truncate">{e.description}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-500">{formatFCFA(e.amount)}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 capitalize">
                        {e.paymentMethod === 'espèces' ? (isEn ? 'Cash' : 'espèces') : e.paymentMethod === 'paiement mobile' ? (isEn ? 'Mobile' : 'paiement mobile') : e.paymentMethod === 'virement' ? (isEn ? 'Transfer' : 'virement') : e.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">{e.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Print & PDF Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType={activeReportTab}
        startDate={startDate}
        endDate={endDate}
        categoryFilter={categoryFilter}
      />
    </div>
  );
};
