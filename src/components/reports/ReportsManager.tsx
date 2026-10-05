import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatFCFA, formatDate, formatNumber } from '../../utils/formatters';

export const ReportsManager: React.FC = () => {
  const { products, invoices, stockMovements, settings, customers, theme, language, t } = useApp();

  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'year' | 'all'>('month');
  const [reportType, setReportType] = useState<'sales_margin' | 'stock_cmp' | 'cash_breakdown'>('sales_margin');

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter invoices for chosen period
  const validInvoices = invoices.filter(inv => {
    if (inv.status === 'annulée') return false;
    if (dateRange === 'today') return inv.date === todayStr;
    if (dateRange === '7days') {
      const d = new Date(inv.date);
      const diff = (Date.now() - d.getTime()) / (1000 * 3600 * 24);
      return diff <= 7;
    }
    if (dateRange === 'month') {
      const [y, m] = inv.date.split('-');
      const now = new Date();
      return Number(y) === now.getFullYear() && Number(m) === now.getMonth() + 1;
    }
    return true;
  });

  // Financial aggregates
  const totalGross = validInvoices.reduce((s, i) => s + i.subtotalGross, 0);
  const totalDiscounts = validInvoices.reduce((s, i) => s + i.totalDiscount, 0);
  const totalNet = validInvoices.reduce((s, i) => s + i.totalNet, 0);
  const totalCOGS = validInvoices.reduce((s, i) => s + i.totalCostOfGoodsSold, 0);
  const totalGrossMargin = totalNet - totalCOGS;
  const marginOnCost = totalCOGS > 0 ? (totalGrossMargin / totalCOGS) * 100 : 0;
  const marginOnSales = totalNet > 0 ? (totalGrossMargin / totalNet) * 100 : 0;

  // Payment Breakdown
  let cashTotal = 0;
  let mobileTotal = 0;
  let bankTotal = 0;
  let creditTotal = 0;

  validInvoices.forEach(inv => {
    inv.payments.forEach(p => {
      if (p.method === 'espèces') cashTotal += p.amount;
      else if (p.method === 'paiement mobile') mobileTotal += p.amount;
      else if (p.method === 'virement') bankTotal += p.amount;
    });
    if (inv.remainingBalance > 0) {
      creditTotal += inv.remainingBalance;
    }
  });

  // Product Margin Breakdown
  const productPerformance: Record<
    string,
    {
      name: string;
      code: string;
      category: string;
      qty: number;
      revenue: number;
      cogs: number;
      margin: number;
      unit: string;
    }
  > = {};

  validInvoices.forEach(inv => {
    inv.items.forEach(item => {
      if (!productPerformance[item.productId]) {
        const pObj = products.find(p => p.id === item.productId);
        productPerformance[item.productId] = {
          name: item.productName,
          code: item.productCode,
          category: pObj?.category || 'Général',
          qty: 0,
          revenue: 0,
          cogs: 0,
          margin: 0,
          unit: item.unit,
        };
      }
      productPerformance[item.productId].qty += item.quantity;
      productPerformance[item.productId].revenue += item.totalNet;
      productPerformance[item.productId].cogs += item.costOfGoodsSold;
      productPerformance[item.productId].margin += item.grossMargin;
    });
  });

  const productList = Object.values(productPerformance).sort((a, b) => b.revenue - a.revenue);

  // Stock Valuation
  const totalStockValuation = products
    .filter(p => p.status === 'actif')
    .reduce((sum, p) => sum + p.stockCurrentBaseUnit * p.cmp, 0);

  const exportReportCSV = () => {
    if (reportType === 'sales_margin') {
      const headers = ['Code', 'Désignation', 'Catégorie', 'Volume Vendu', 'Unité', 'CA Net (FCFA)', 'CMV (FCFA)', 'Marge Brute (FCFA)', 'Taux Marge (%)'];
      const rows = productList.map(p => {
        const rate = p.cogs > 0 ? ((p.margin / p.cogs) * 100).toFixed(1) : '0';
        return [
          `"${p.code}"`,
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.category}"`,
          p.qty,
          `"${p.unit}"`,
          p.revenue,
          p.cogs,
          p.margin,
          rate,
        ].join(';');
      });
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `rapport_ventes_marges_${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            <span>Rapports d'Exploitation & Rentabilité</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Analyse des marges par produit au CMP, ventilation des encaissements et valeur d'actif stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Period selector */}
          <div className={`flex items-center p-1 rounded-xl text-xs border ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: '7days', label: '7 jours' },
              { id: 'month', label: 'Ce mois' },
              { id: 'all', label: 'Tout' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDateRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportReportCSV}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className={`flex border-b overflow-x-auto ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setReportType('sales_margin')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            reportType === 'sales_margin'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Ventes, CMV & Marges Brutes
        </button>
        <button
          onClick={() => setReportType('cash_breakdown')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            reportType === 'cash_breakdown'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Ventilation des Encaissements & Caisse
        </button>
        <button
          onClick={() => setReportType('stock_cmp')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            reportType === 'stock_cmp'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Valorisation Actuelle des Stocks (CMP)
        </button>
      </div>

      {/* REPORT 1: SALES & MARGIN */}
      {reportType === 'sales_margin' && (
        <div className="space-y-6">
          {/* Key Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                CA Net de la Période
              </div>
              <div className={`text-xl sm:text-2xl font-black mt-1 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {formatFCFA(totalNet)}
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Brut: {formatFCFA(totalGross)} | Remises: {formatFCFA(totalDiscounts)}
              </div>
            </div>

            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Coût des Marchandises (CMV)
              </div>
              <div className={`text-xl sm:text-2xl font-black mt-1 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {formatFCFA(totalCOGS)}
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Calculé à l'instant T au Coût Moyen Pondéré
              </div>
            </div>

            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Marge Brute Réalisée
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatFCFA(totalGrossMargin)}
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Gain net d'exploitation sur marchandises
              </div>
            </div>

            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Rentabilité / Taux
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {marginOnCost.toFixed(1)}%
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Taux de marque (sur CA): {marginOnSales.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Table of Margin per Product */}
          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Rentabilité Détaillée par Référence de Provende
              </h2>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {productList.length} référence(s) vendue(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                    theme === 'dark'
                      ? 'bg-slate-850 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <th className="py-3 px-3">Réf.</th>
                    <th className="py-3 px-3">Désignation</th>
                    <th className="py-3 px-3">Catégorie</th>
                    <th className="py-3 px-3 text-right">Volume</th>
                    <th className="py-3 px-3 text-right">CA Net Réalisé</th>
                    <th className="py-3 px-3 text-right">Coût CMV (au CMP)</th>
                    <th className="py-3 px-3 text-right">Marge Brute (FCFA)</th>
                    <th className="py-3 px-3 text-right">Taux de Marge</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {productList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Aucune vente pour la période sélectionnée.
                      </td>
                    </tr>
                  ) : (
                    productList.map((prod, idx) => {
                      const tMarge = prod.cogs > 0 ? (prod.margin / prod.cogs) * 100 : 0;
                      return (
                        <tr
                          key={idx}
                          className={`transition ${
                            theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className={`py-3 px-3 font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {prod.code}
                          </td>
                          <td className={`py-3 px-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {prod.name}
                          </td>
                          <td className={`py-3 px-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {prod.category}
                          </td>
                          <td className={`py-3 px-3 text-right font-medium ${
                            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                          }`}>
                            {prod.qty} {prod.unit}s
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {formatFCFA(prod.revenue)}
                          </td>
                          <td className={`py-3 px-3 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {formatFCFA(prod.cogs)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            +{formatFCFA(prod.margin)}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {tMarge.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: CASH BREAKDOWN */}
      {reportType === 'cash_breakdown' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Encaissements Espèces
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatFCFA(cashTotal)}
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Versements en billets & pièces
              </div>
            </div>

            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Paiement Mobile (MoMo / OM)
              </div>
              <div className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-1">
                {formatFCFA(mobileTotal)}
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Transactions électroniques tracées
              </div>
            </div>

            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Virements Bancaires
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {formatFCFA(bankTotal)}
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Chèques & bordereaux bancaires
              </div>
            </div>

            <div className={`border rounded-xl p-4 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Ventes à Crédit (Non perçues)
              </div>
              <div className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-1">
                {formatFCFA(creditTotal)}
              </div>
              <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Créances ajoutées aux comptes clients
              </div>
            </div>
          </div>

          <div className={`border rounded-xl p-5 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Récapitulatif Financier Caisse
            </h2>
            <div className="space-y-2 text-xs">
              <div className={`flex justify-between py-2 border-b ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                  Total Liquidités Encaissées (Espèces + Mobile + Virement) :
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatFCFA(cashTotal + mobileTotal + bankTotal)}
                </span>
              </div>
              <div className={`flex justify-between py-2 border-b ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                  Total Ventes Réalisées sur la période :
                </span>
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {formatFCFA(totalNet)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                  Taux de Recouvrement Comptant Immédiat :
                </span>
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {totalNet > 0
                    ? (((cashTotal + mobileTotal + bankTotal) / totalNet) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: STOCK CMP VALUATION */}
      {reportType === 'stock_cmp' && (
        <div className="space-y-6">
          <div className={`border rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Valorisation Totale du Stock d'Actif au CMP
              </div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatFCFA(totalStockValuation)}
              </div>
              <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Représente l'actif circulant net de la provenderie valorisé aux coûts pondérés historiques.
              </p>
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                    theme === 'dark'
                      ? 'bg-slate-850 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <th className="py-3 px-3">Réf / Code</th>
                    <th className="py-3 px-3">Produit</th>
                    <th className="py-3 px-3">Catégorie</th>
                    <th className="py-3 px-3 text-right">Quantité Stock</th>
                    <th className="py-3 px-3 text-right">CMP Unitaire</th>
                    <th className="py-3 px-3 text-right">Valeur d'Actif (FCFA)</th>
                    <th className="py-3 px-3 text-right">% du Stock Total</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {products
                    .filter(p => p.status === 'actif')
                    .map(p => {
                      const val = p.stockCurrentBaseUnit * p.cmp;
                      const share = totalStockValuation > 0 ? (val / totalStockValuation) * 100 : 0;
                      return (
                        <tr
                          key={p.id}
                          className={`transition ${
                            theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className={`py-3 px-3 font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {p.code}
                          </td>
                          <td className={`py-3 px-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {p.name}
                          </td>
                          <td className={`py-3 px-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {p.category}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {formatNumber(p.stockCurrentBaseUnit)} {p.baseUnit}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            {formatFCFA(p.cmp)}/{p.baseUnit}
                          </td>
                          <td className={`py-3 px-3 text-right font-black ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {formatFCFA(val)}
                          </td>
                          <td className={`py-3 px-3 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
