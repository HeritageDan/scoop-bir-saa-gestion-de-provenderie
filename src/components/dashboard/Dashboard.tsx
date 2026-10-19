import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Receipt,
  Users,
  Boxes,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  X,
  Building2,
  Tag,
  ShieldCheck,
  Info,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, Product } from '../../types';
import { formatFCFA, formatDate } from '../../utils/formatters';

interface DashboardProps {
  onNavigateTab: (tab: string) => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab, onSelectInvoice }) => {
  const {
    products,
    invoices,
    customers,
    currentUser,
    currentSalesPoint,
    currentSalesPointId,
    salesPoints,
    setCurrentSalesPointId,
    theme,
    language,
    t,
    getLowStockProducts,
    getOutOfStockProducts,
  } = useApp();

  // Period selector: 'today' | 'specific' | '7days' | 'month' | 'all'
  const [period, setPeriod] = useState<'today' | 'specific' | '7days' | 'month' | 'all'>('today');
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>('');

  // Filters: Category & Product
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  // Modal for drill-down transactions
  const [drillDownModal, setDrillDownModal] = useState<{
    title: string;
    type: 'sales' | 'discounts' | 'lowstock' | 'debts' | 'margin';
  } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Extract distinct categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  }, [products]);

  // Available products based on selected category
  const availableProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Selected product object if any
  const focusProduct: Product | undefined = useMemo(() => {
    if (selectedProductId === 'all') return undefined;
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Filter valid invoices (exclude cancelled) and ensure descending sort
  const validInvoices = useMemo(() => {
    return invoices
      .filter(inv => inv.status !== 'annulée')
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return timeB - timeA;
      });
  }, [invoices]);

  const periodInvoices = useMemo(() => {
    return validInvoices.filter(inv => {
      if (period === 'today') return inv.date === todayStr;
      if (period === 'specific') {
        return selectedSpecificDate ? inv.date === selectedSpecificDate : true;
      }
      if (period === '7days') {
        const d = new Date(inv.date);
        const diffDays = (Date.now() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (period === 'month') {
        const [year, month] = inv.date.split('-');
        const now = new Date();
        return Number(year) === now.getFullYear() && Number(month) === now.getMonth() + 1;
      }
      return true;
    });
  }, [validInvoices, period, todayStr, selectedSpecificDate]);

  // Scoped metrics based on category and product filter
  const scopedMetrics = useMemo(() => {
    let grossSales = 0;
    let totalDiscounts = 0;
    let netSales = 0;
    let costOfGoodsSold = 0;
    let itemsSoldQty = 0;
    let matchingInvoicesCount = 0;

    periodInvoices.forEach(inv => {
      let invMatched = false;
      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const matchCat = selectedCategory === 'all' || prod?.category === selectedCategory;
        const matchProd = selectedProductId === 'all' || item.productId === selectedProductId;

        if (matchCat && matchProd) {
          invMatched = true;
          grossSales += item.quantity * item.unitPrice;
          totalDiscounts += item.discountAmount || 0;
          netSales += item.totalNet;
          costOfGoodsSold += item.costOfGoodsSold;
          itemsSoldQty += item.quantity;
        }
      });
      if (invMatched) {
        matchingInvoicesCount++;
      }
    });

    const grossMargin = netSales - costOfGoodsSold;
    const marginRateCost = costOfGoodsSold > 0 ? (grossMargin / costOfGoodsSold) * 100 : 0;
    const marginRateSales = netSales > 0 ? (grossMargin / netSales) * 100 : 0;

    return {
      grossSales,
      totalDiscounts,
      netSales,
      costOfGoodsSold,
      grossMargin,
      marginRateCost,
      marginRateSales,
      salesCount: matchingInvoicesCount,
      itemsSoldQty,
    };
  }, [periodInvoices, selectedCategory, selectedProductId, products]);

  // Total customer receivables
  const totalReceivables = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);

  // Alerts
  const lowStockProds = getLowStockProducts();
  const outOfStockProds = getOutOfStockProducts();

  // Stock valuation at CMP for active products (scoped by category/product if selected)
  const totalInventoryCMPValue = useMemo(() => {
    return products
      .filter(p => {
        if (p.status !== 'actif') return false;
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (selectedProductId !== 'all' && p.id !== selectedProductId) return false;
        return true;
      })
      .reduce((sum, p) => sum + p.stockCurrentBaseUnit * p.cmp, 0);
  }, [products, selectedCategory, selectedProductId]);

  // Top products sold in this period (filtered if category is chosen)
  const productSalesMap: Record<
    string,
    { name: string; code: string; qty: number; unit: string; totalRevenue: number; margin: number }
  > = {};

  periodInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (selectedCategory !== 'all' && prod?.category !== selectedCategory) return;
      if (selectedProductId !== 'all' && item.productId !== selectedProductId) return;

      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.productName,
          code: item.productCode,
          qty: 0,
          unit: item.unit,
          totalRevenue: 0,
          margin: 0,
        };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].totalRevenue += item.totalNet;
      productSalesMap[item.productId].margin += item.grossMargin;
    });
  });

  const topSoldProducts = Object.values(productSalesMap).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  // Filtered recent invoices
  const displayInvoices = useMemo(() => {
    const baseList = period === 'specific' || period === 'today' ? periodInvoices : validInvoices;
    if (selectedCategory === 'all' && selectedProductId === 'all') {
      return baseList.slice(0, 6);
    }
    return baseList
      .filter(inv =>
        inv.items.some(it => {
          const prod = products.find(p => p.id === it.productId);
          const matchCat = selectedCategory === 'all' || prod?.category === selectedCategory;
          const matchProd = selectedProductId === 'all' || it.productId === selectedProductId;
          return matchCat && matchProd;
        })
      )
      .slice(0, 6);
  }, [validInvoices, periodInvoices, period, selectedCategory, selectedProductId, products]);

  const isFiltered = selectedCategory !== 'all' || selectedProductId !== 'all';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner & Period Controls */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {t('dashboard.title')}
            </h1>

            {/* Scope Badge / Selector for Admin & Dev */}
            {(currentUser.role === 'administrateur' || currentUser.role === 'developpeur') ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-1 text-xs">
                <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />
                <button
                  type="button"
                  onClick={() => setCurrentSalesPointId('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer text-xs ${
                    currentSalesPointId === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : theme === 'dark'
                      ? 'text-emerald-400 hover:bg-emerald-500/20'
                      : 'text-emerald-700 hover:bg-emerald-500/20'
                  }`}
                  title={t('sales_point.global_view')}
                >
                  {t('sales_point.global_badge')}
                </button>
                <select
                  value={currentSalesPointId}
                  onChange={(e) => setCurrentSalesPointId(e.target.value)}
                  className={`text-xs font-semibold px-2 py-1 rounded-md border focus:outline-none cursor-pointer ${
                    currentSalesPointId !== 'all'
                      ? theme === 'dark'
                        ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="all">
                    {language === 'fr' ? 'Tous les sites (Vue Globale)' : 'All sites (Global View)'}
                  </option>
                  {salesPoints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <Building2 className="w-3 h-3 shrink-0" />
                <span>{currentSalesPoint?.name || 'Site Local'}</span>
                <span className="text-[10px] opacity-75 font-normal">({t('sales_point.assigned_badge')})</span>
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Period Selector Tabs & Specific Date Picker */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {[
              { id: 'today', label: t('dashboard.period.today') },
              { id: '7days', label: t('dashboard.period.7days') },
              { id: 'month', label: t('dashboard.period.month') },
              { id: 'all', label: t('dashboard.period.all') },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setPeriod(tab.id as any);
                  setSelectedSpecificDate('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  period === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Specific Date Picker Input */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition ${
            period === 'specific'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30'
              : theme === 'dark'
              ? 'bg-slate-900 border-slate-800'
              : 'bg-slate-100 border-slate-200'
          }`}>
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${period === 'specific' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <input
              type="date"
              value={selectedSpecificDate}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSpecificDate(val);
                if (val) {
                  setPeriod('specific');
                } else {
                  setPeriod('today');
                }
              }}
              title={language === 'fr' ? 'Sélectionner une date précise du calendrier' : 'Pick a specific calendar date'}
              className={`text-xs font-semibold bg-transparent focus:outline-none cursor-pointer ${
                period === 'specific'
                  ? 'text-emerald-500 font-bold'
                  : theme === 'dark'
                  ? 'text-slate-300'
                  : 'text-slate-700'
              }`}
            />
            {selectedSpecificDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSpecificDate('');
                  setPeriod('today');
                }}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title={language === 'fr' ? 'Réinitialiser à Aujourd\'hui' : 'Reset to Today'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Filters Bar: Category & Product */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
            <Filter className="w-3.5 h-3.5" />
            <span>{t('dashboard.filter.title')} :</span>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <select
              value={selectedCategory}
              onChange={e => {
                const newCat = e.target.value;
                setSelectedCategory(newCat);
                if (newCat !== 'all') {
                  const currProd = products.find(p => p.id === selectedProductId);
                  if (currProd && currProd.category !== newCat) {
                    setSelectedProductId('all');
                  }
                }
              }}
              className={`text-xs rounded-lg px-2.5 py-1.5 border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="all">{t('dashboard.filter.all_categories')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-1">
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className={`text-xs rounded-lg px-2.5 py-1.5 border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-xs truncate ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="all">{t('dashboard.filter.all_products')}</option>
              {availableProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedProductId('all');
              }}
              className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 text-slate-400 hover:text-rose-400 transition cursor-pointer border ${
                theme === 'dark' ? 'border-slate-800 hover:border-rose-900' : 'border-slate-200 hover:border-rose-300'
              }`}
            >
              <X className="w-3 h-3" />
              <span>{t('dashboard.filter.reset')}</span>
            </button>
          )}
        </div>

        {isFiltered && (
          <div className={`text-xs ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'} flex items-center gap-1`}>
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              {language === 'fr'
                ? 'Indicateurs financiers calculés uniquement pour la sélection en cours'
                : 'Financial metrics calculated strictly for the current filter'}
            </span>
          </div>
        )}
      </div>

      {/* Focus Product Card (When specific product is selected) */}
      {focusProduct && (
        <div className={`p-4 rounded-xl border relative overflow-hidden transition shadow-sm ${
          theme === 'dark' ? 'bg-slate-900 border-emerald-500/40' : 'bg-emerald-50/40 border-emerald-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                  {focusProduct.code}
                </span>
                <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {focusProduct.name}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                  focusProduct.stockCurrentBaseUnit <= 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : focusProduct.stockCurrentBaseUnit <= focusProduct.minAlertThresholdBaseUnit
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {focusProduct.stockCurrentBaseUnit <= 0
                    ? t('stock.status_out')
                    : focusProduct.stockCurrentBaseUnit <= focusProduct.minAlertThresholdBaseUnit
                    ? t('stock.status_low')
                    : t('stock.status_in')}
                </span>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {focusProduct.category} &middot; {focusProduct.packaging} &middot; {language === 'fr' ? 'Conditionnement :' : 'Packaging:'} 1 {focusProduct.saleUnit} = {focusProduct.conversionFactor} {focusProduct.baseUnit}
              </p>
            </div>

            {/* Product Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className={`p-2.5 rounded-lg border ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="text-[11px] text-slate-400">{t('dashboard.product_focus.current_stock')}</div>
                <div className={`font-bold text-sm ${
                  focusProduct.stockCurrentBaseUnit <= 0 ? 'text-rose-400' : 'text-emerald-500'
                }`}>
                  {focusProduct.stockCurrentBaseUnit} {focusProduct.baseUnit}
                </div>
                <div className="text-[10px] text-slate-500">
                  ~{(focusProduct.stockCurrentBaseUnit / (focusProduct.conversionFactor || 1)).toFixed(1)} {focusProduct.saleUnit}
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="text-[11px] text-slate-400">{t('dashboard.product_focus.cmp_unit')}</div>
                <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {formatFCFA(focusProduct.cmp)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {language === 'fr' ? 'Prix vente :' : 'Sale price:'} {formatFCFA(focusProduct.salePrice)}
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="text-[11px] text-slate-400">{t('dashboard.product_focus.period_sales_qty')}</div>
                <div className="font-bold text-sm text-emerald-500">
                  {scopedMetrics.itemsSoldQty} {focusProduct.saleUnit}s
                </div>
                <div className="text-[10px] text-slate-500">
                  {period === 'specific' && selectedSpecificDate
                    ? (language === 'fr' ? `Journée du ${formatDate(selectedSpecificDate)}` : `Day of ${formatDate(selectedSpecificDate)}`)
                    : (language === 'fr' ? `Sur la période (${period})` : `Over period (${period})`)}
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="text-[11px] text-slate-400">{t('dashboard.product_focus.margin_generated')}</div>
                <div className="font-bold text-sm text-emerald-500">
                  +{formatFCFA(scopedMetrics.grossMargin)}
                </div>
                <div className="text-[10px] text-slate-500">
                  CA: {formatFCFA(scopedMetrics.netSales)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Stock Alert Banner if any */}
      {(outOfStockProds.length > 0 || lowStockProds.length > 0) && (
        <div className={`border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          theme === 'dark' ? 'bg-amber-950/40 border-amber-800/80' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className={`font-bold ${theme === 'dark' ? 'text-amber-200' : 'text-amber-900'}`}>
                {t('dashboard.alert.title')}
              </div>
              <div className={`mt-0.5 ${theme === 'dark' ? 'text-amber-300/80' : 'text-amber-700'}`}>
                {outOfStockProds.length > 0 && (
                  <span className="font-semibold text-rose-500">
                    {outOfStockProds.length} {t('dashboard.alert.out_of_stock_count')}{' '}
                  </span>
                )}
                {lowStockProds.length > 0 && (
                  <span>{lowStockProds.length} {t('dashboard.alert.low_stock_count')}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setDrillDownModal({ title: t('dashboard.drilldown.low_stock_title'), type: 'lowstock' })}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer border ${
                theme === 'dark'
                  ? 'bg-amber-800/60 hover:bg-amber-700 text-amber-100 border-amber-600'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
              }`}
            >
              {t('dashboard.alert.examine')}
            </button>
            <button
              onClick={() => onNavigateTab('purchases')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
            >
              {t('dashboard.alert.new_purchase')}
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Chiffre d'affaires net */}
        <div
          onClick={() => setDrillDownModal({ title: t('dashboard.kpi.net_turnover'), type: 'sales' })}
          className={`border hover:border-emerald-500 rounded-xl p-4 transition cursor-pointer shadow-xs group ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">{t('dashboard.kpi.net_turnover')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {formatFCFA(scopedMetrics.netSales)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {t('dashboard.kpi.gross_turnover')}:{' '}
              <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {formatFCFA(scopedMetrics.grossSales)}
              </span>
            </span>
            <span className="text-emerald-500 group-hover:underline flex items-center gap-0.5">
              <span>{scopedMetrics.salesCount} {t('dashboard.kpi.sales_count')}</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 2: Marge Brute */}
        <div
          onClick={() => setDrillDownModal({ title: t('dashboard.kpi.gross_margin'), type: 'margin' })}
          className={`border hover:border-emerald-500 rounded-xl p-4 transition cursor-pointer shadow-xs group ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">{t('dashboard.kpi.gross_margin')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-500 tracking-tight">
            {formatFCFA(scopedMetrics.grossMargin)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {t('dashboard.kpi.margin_rate')}:{' '}
              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {scopedMetrics.marginRateCost.toFixed(1)}%
              </span>
            </span>
            <span>
              {t('dashboard.kpi.markup_rate')}:{' '}
              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {scopedMetrics.marginRateSales.toFixed(1)}%
              </span>
            </span>
          </div>
        </div>

        {/* KPI 3: Créances Clients (Dettes en cours) */}
        <div
          onClick={() => setDrillDownModal({ title: t('dashboard.kpi.receivables'), type: 'debts' })}
          className={`border hover:border-amber-500 rounded-xl p-4 transition cursor-pointer shadow-xs group ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">{t('dashboard.kpi.receivables')}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500 tracking-tight">
            {formatFCFA(totalReceivables)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{t('dashboard.kpi.outstanding_debt')}</span>
            <span className="text-amber-500 group-hover:underline flex items-center gap-0.5">
              <span>{t('dashboard.kpi.view_customers')}</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 4: Valeur du Stock au CMP */}
        <div
          onClick={() => onNavigateTab('stock')}
          className={`border hover:border-blue-500 rounded-xl p-4 transition cursor-pointer shadow-xs group ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">{t('dashboard.kpi.stock_value')}</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-500 tracking-tight">
            {formatFCFA(totalInventoryCMPValue)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {products.filter(p => p.status === 'actif').length} {t('dashboard.kpi.active_products')}
            </span>
            <span className="text-blue-500 group-hover:underline flex items-center gap-0.5">
              <span>{t('dashboard.kpi.stock_ledger')}</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row: Remises & Coût marchandises vendues */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => setDrillDownModal({ title: t('dashboard.drilldown.discounts_title'), type: 'discounts' })}
          className={`border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition ${
            theme === 'dark' ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-xs text-slate-400">
              {t('dashboard.secondary.discounts')} ({period === 'specific' && selectedSpecificDate ? formatDate(selectedSpecificDate) : period})
            </div>
            <div className="text-base font-bold text-amber-500 mt-0.5">
              {formatFCFA(scopedMetrics.totalDiscounts)}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            {scopedMetrics.grossSales > 0 ? ((scopedMetrics.totalDiscounts / scopedMetrics.grossSales) * 100).toFixed(1) : 0}% {t('dashboard.secondary.of_gross')}
          </div>
        </div>

        <div className={`border rounded-xl p-3.5 flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-xs text-slate-400">{t('dashboard.secondary.cogs')}</div>
            <div className={`text-base font-bold mt-0.5 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
              {formatFCFA(scopedMetrics.costOfGoodsSold)}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            {t('dashboard.secondary.cmp_formula')}
          </div>
        </div>

        <div className={`border rounded-xl p-3.5 flex items-center justify-between ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-xs text-slate-400">{t('dashboard.secondary.average_basket')}</div>
            <div className="text-base font-bold text-emerald-500 mt-0.5">
              {formatFCFA(scopedMetrics.salesCount > 0 ? scopedMetrics.netSales / scopedMetrics.salesCount : 0)}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            {scopedMetrics.salesCount} {t('dashboard.secondary.sales_completed')}
          </div>
        </div>
      </div>

      {/* Two columns: Top Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className={`border rounded-xl p-4 flex flex-col justify-between shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <Package className="w-4 h-4 text-emerald-500" />
                <span>{t('dashboard.top_products.title')}</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                {t('dashboard.top_products.by_turnover')}
              </span>
            </div>

            {topSoldProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {t('dashboard.top_products.empty')}
              </div>
            ) : (
              <div className={`divide-y text-xs ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {topSoldProducts.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className={`font-semibold flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-800'
                      }`}>
                        <span>{item.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">[{item.code}]</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t('dashboard.top_products.volume')} :{' '}
                        <span className={`font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {item.qty} {item.unit}s
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatFCFA(item.totalRevenue)}
                      </div>
                      <div className="text-[10px] text-emerald-500 font-medium">
                        {t('dashboard.top_products.margin')} : +{formatFCFA(item.margin)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`pt-3 border-t mt-3 flex justify-end ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs text-emerald-500 hover:text-emerald-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{t('dashboard.top_products.access_report')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Invoices / Sales */}
        <div className={`border rounded-xl p-4 flex flex-col justify-between shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <Receipt className="w-4 h-4 text-emerald-500" />
                <span>
                  {period === 'specific' && selectedSpecificDate
                    ? (language === 'fr' ? `Ventes du ${formatDate(selectedSpecificDate)}` : `Sales for ${formatDate(selectedSpecificDate)}`)
                    : t('dashboard.recent_sales.title')}
                </span>
              </h2>
              <button
                onClick={() => onNavigateTab('invoices')}
                className="text-xs text-emerald-500 hover:underline cursor-pointer"
              >
                {t('dashboard.recent_sales.view_all')}
              </button>
            </div>

            {displayInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {t('dashboard.recent_sales.empty')}
              </div>
            ) : (
              <div className={`divide-y text-xs ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {displayInvoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv)}
                    className={`py-2.5 flex items-center justify-between cursor-pointer px-2 rounded-lg transition ${
                      theme === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-800'
                      }`}>
                        <span>{inv.number}</span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            inv.status === 'payée'
                              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                              : inv.status === 'partielle'
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                          }`}
                        >
                          {inv.status === 'payée'
                            ? (language === 'fr' ? 'Payée' : 'Paid')
                            : inv.status === 'partielle'
                            ? (language === 'fr' ? 'Partielle' : 'Partial')
                            : (language === 'fr' ? 'À Crédit' : 'Credit')}
                        </span>
                        {inv.salesPointName && currentSalesPointId === 'all' && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            &middot; {inv.salesPointName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {inv.customerName} &middot; {formatDate(inv.date)} {language === 'fr' ? 'à' : 'at'} {inv.time}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {formatFCFA(inv.totalNet)}
                      </div>
                      {inv.remainingBalance > 0 ? (
                        <div className="text-[10px] text-rose-500 font-semibold">
                          {t('dashboard.recent_sales.due')} : {formatFCFA(inv.remainingBalance)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500">
                          {t('dashboard.recent_sales.paid')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`pt-3 border-t mt-3 flex justify-between items-center ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <span className="text-[11px] text-slate-500">
              {t('dashboard.recent_sales.print_formats')}
            </span>
            <button
              onClick={() => onNavigateTab('pos')}
              className="text-xs text-emerald-500 hover:text-emerald-600 font-semibold cursor-pointer"
            >
              {t('nav.pos')} &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Drill-down modal for KPI details */}
      {drillDownModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDrillDownModal(null)}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl border p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>{drillDownModal.title}</span>
              </h3>
              <button
                onClick={() => setDrillDownModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {drillDownModal.type === 'sales' && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 mb-2">
                    {language === 'fr'
                      ? 'Liste des factures validées de la période sélectionnée :'
                      : 'List of validated invoices for the selected period:'}
                  </div>
                  {periodInvoices.map(inv => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setDrillDownModal(null);
                        onSelectInvoice(inv);
                      }}
                      className={`p-3 rounded-lg flex items-center justify-between text-xs cursor-pointer border transition ${
                        theme === 'dark'
                          ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500'
                          : 'bg-slate-50 border-slate-200 hover:border-emerald-500'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>{inv.number}</span>
                          <span className="text-slate-400 font-normal">({inv.customerName})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.items.length} {language === 'fr' ? 'produit(s)' : 'item(s)'} &middot; {language === 'fr' ? 'Règlement :' : 'Payment:'} {inv.payments?.[0]?.method || (language === 'fr' ? 'Espèces' : 'Cash')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-500">{formatFCFA(inv.totalNet)}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(inv.date)} {inv.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {drillDownModal.type === 'discounts' && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 mb-2">
                    {language === 'fr'
                      ? 'Détail des remises accordées avec traçabilité de l\'auteur et du motif :'
                      : 'Detailed discounts granted with author and reason traceability:'}
                  </div>
                  {periodInvoices
                    .filter(inv => inv.totalDiscount > 0)
                    .map(inv => (
                      <div
                        key={inv.id}
                        className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
                          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span>{language === 'fr' ? 'Facture' : 'Invoice'} {inv.number}</span>
                            <span className="text-amber-500 font-semibold">
                              -{formatFCFA(inv.totalDiscount)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {language === 'fr' ? 'Client :' : 'Customer:'} {inv.customerName}
                          </div>
                          {inv.discountDetails && (
                            <div className="text-[10px] text-amber-400 mt-1">
                              {language === 'fr' ? 'Accordé par :' : 'Granted by:'} <span className="font-semibold">{inv.discountDetails.authorName}</span> &middot; {language === 'fr' ? 'Motif :' : 'Reason:'} {inv.discountDetails.reason}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setDrillDownModal(null);
                            onSelectInvoice(inv);
                          }}
                          className="text-xs text-emerald-500 hover:underline cursor-pointer"
                        >
                          {language === 'fr' ? 'Voir Facture' : 'View Invoice'}
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {drillDownModal.type === 'lowstock' && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 mb-2">
                    {language === 'fr'
                      ? 'Produits nécessitant un réapprovisionnement d\'urgence :'
                      : 'Products requiring urgent restocking:'}
                  </div>
                  {[...outOfStockProds, ...lowStockProds].map(p => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
                        theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">[{p.code}]</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              p.stockCurrentBaseUnit <= 0
                                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            }`}
                          >
                            {p.stockCurrentBaseUnit <= 0 ? (language === 'fr' ? 'Rupture' : 'Out of stock') : (language === 'fr' ? 'Stock Faible' : 'Low stock')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {p.category} &middot; {language === 'fr' ? 'Conditionnement :' : 'Packaging:'} {p.packaging}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-extrabold ${
                            p.stockCurrentBaseUnit <= 0 ? 'text-rose-500' : 'text-amber-500'
                          }`}
                        >
                          {p.stockCurrentBaseUnit} {p.baseUnit}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {language === 'fr' ? 'Seuil mini :' : 'Min threshold:'} {p.minAlertThresholdBaseUnit} {p.baseUnit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {drillDownModal.type === 'debts' && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 mb-2">
                    {language === 'fr'
                      ? 'Clients ayant des créances et encours de dettes actives :'
                      : 'Customers with active receivables and debt balances:'}
                  </div>
                  {customers
                    .filter(c => c.currentDebt > 0)
                    .map(c => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
                          theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {language === 'fr' ? 'Tél :' : 'Tel:'} {c.phone} &middot; {language === 'fr' ? 'Plafond autorisé :' : 'Credit limit:'} {formatFCFA(c.creditLimit)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-rose-500 text-sm">
                            {formatFCFA(c.currentDebt)}
                          </div>
                          <button
                            onClick={() => {
                              setDrillDownModal(null);
                              onNavigateTab('customers');
                            }}
                            className="text-[11px] text-emerald-500 hover:underline mt-0.5 cursor-pointer"
                          >
                            {language === 'fr' ? 'Gérer créance' : 'Manage debt'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {drillDownModal.type === 'margin' && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 mb-2">
                    {language === 'fr'
                      ? 'Détail des marges réalisées par vente (CA Net - Coût Marchandises vendues au CMP) :'
                      : 'Detailed gross margin per sale (Net Turnover - Cost of Goods Sold at CMP):'}
                  </div>
                  {periodInvoices.map(inv => (
                    <div
                      key={inv.id}
                      className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
                        theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>{inv.number}</span>
                          <span className="text-slate-400 font-normal">({inv.customerName})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {language === 'fr' ? 'CA Net :' : 'Net Sales:'} {formatFCFA(inv.totalNet)} | {language === 'fr' ? 'Coût CMV :' : 'COGS:'} {formatFCFA(inv.totalCostOfGoodsSold)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-500">
                          +{formatFCFA(inv.grossMargin)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'fr' ? 'Taux marge :' : 'Margin rate:'} {inv.marginRateCost}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
