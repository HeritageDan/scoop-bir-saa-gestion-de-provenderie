import React, { useState } from 'react';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  History,
  FileSpreadsheet,
  PlusCircle,
  Filter,
  Search,
  Scale,
  X,
  CheckCircle2,
  Sliders,
  Plus,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, StockMovementType } from '../../types';
import { formatFCFA, formatDate, formatNumber } from '../../utils/formatters';

export const StockManager: React.FC = () => {
  const {
    products,
    addProduct,
    stockMovements,
    currentUser,
    recordStockAdjustment,
    theme,
    language,
    t,
    currentSalesPointId,
    currentSalesPoint,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | 'movements'>('status');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [movementDateFilter, setMovementDateFilter] = useState<string>('');

  // Manual Adjustment Modal State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [adjustType, setAdjustType] = useState<'perte' | 'produit endommagé' | 'consommation interne' | 'correction d\'inventaire' | 'entrée fournisseur'>('produit endommagé');
  const [adjustQtyCommercial, setAdjustQtyCommercial] = useState<number>(1);
  const [isNegativeChange, setIsNegativeChange] = useState<boolean>(true); // default reduction for loss/damage
  const [justification, setJustification] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');

  // Stock calculations
  const totalStockValue = products
    .filter(p => p.status === 'actif')
    .reduce((sum, p) => sum + p.stockCurrentBaseUnit * p.cmp, 0);

  const lowStockCount = products.filter(
    p => p.status === 'actif' && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
  ).length;

  const filteredProducts = products.filter(p => {
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredMovements = stockMovements
    .filter(m => {
      const matchesType = movementFilter === 'all' || m.type === movementFilter;
      const matchesDate = !movementDateFilter || (m.timestamp && m.timestamp.slice(0, 10) === movementDateFilter);
      const matchesSearch =
        m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.referenceDocument.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.userName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesDate && matchesSearch;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const handleManualAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError('');
    setAdjustSuccess('');

    if (!selectedProduct) return;
    if (!justification.trim() || justification.trim().length < 5) {
      setAdjustError('Une justification claire de 5 caractères minimum est obligatoire.');
      return;
    }

    // Convert commercial unit to base unit
    const qtyBase = adjustQtyCommercial * selectedProduct.conversionFactor;
    const finalChange = isNegativeChange ? -qtyBase : qtyBase;

    const res = recordStockAdjustment(selectedProduct.id, finalChange, adjustType, justification);
    if (!res.success) {
      setAdjustError(res.error || 'Erreur lors de l\'ajustement');
    } else {
      setAdjustSuccess(`Ajustement enregistré avec succès pour ${selectedProduct.name} !`);
      setJustification('');
      setAdjustQtyCommercial(1);
      setTimeout(() => {
        setShowAdjustmentModal(false);
        setAdjustSuccess('');
      }, 1200);
    }
  };

  const exportStockCSV = () => {
    const headers = [
      'Code',
      'Désignation',
      'Catégorie',
      'Stock Unité Base',
      'Unité Base',
      'Équivalent Unités Vente',
      'Unité Vente',
      'CMP Unitaire (FCFA)',
      'Valeur Totale Stock (FCFA)',
      'Seuil Alerte',
      'Statut Stock',
    ];

    const rows = products.map(p => {
      const unitsSale = (p.stockCurrentBaseUnit / (p.conversionFactor || 1)).toFixed(1);
      const val = p.stockCurrentBaseUnit * p.cmp;
      const statusAlert =
        p.stockCurrentBaseUnit <= 0
          ? 'Rupture'
          : p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
          ? 'Stock Faible'
          : 'Normal';

      return [
        `"${p.code}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        p.stockCurrentBaseUnit,
        `"${p.baseUnit}"`,
        unitsSale,
        `"${p.saleUnit}"`,
        p.cmp,
        val,
        p.minAlertThresholdBaseUnit,
        `"${statusAlert}"`,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `etat_des_stocks_cmp_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-500" />
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {t('stock.title')}
            </h1>
            {currentSalesPointId === 'all' ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                {t('sales_point.global_badge')}
              </span>
            ) : currentSalesPoint ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-blue-500/10 text-blue-500 border-blue-500/30">
                {currentSalesPoint.name}
              </span>
            ) : null}
          </div>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('stock.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportStockCSV}
            className={`border px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
            }`}
            title="Exporter l'état du stock en fichier CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          {(currentUser.role === 'administrateur' ||
            currentUser.role === 'responsable' ||
            currentUser.role === 'magasinier' ||
            currentUser.role === 'developpeur') && (
            <>
              <button
                onClick={() => {
                  setSelectedProductId(products[0]?.id || '');
                  setAdjustType('entrée fournisseur');
                  setIsNegativeChange(false);
                  setJustification(language === 'fr' ? 'Arrivage fournisseur direct' : 'Direct supplier inward delivery');
                  setShowAdjustmentModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                title={language === 'fr' ? 'Enregistrer une entrée de stock / approvisionnement' : 'Record incoming stock delivery'}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>{language === 'fr' ? 'Entrée Stock / Arrivage' : 'Stock Inward / Delivery'}</span>
              </button>

              <button
                onClick={() => setShowAdjustmentModal(true)}
                className={`border px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-amber-500" />
                <span>{language === 'fr' ? 'Ajustement / Perte' : 'Adjustment / Loss'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`border rounded-xl p-4 shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400">
            {language === 'fr' ? 'Valeur Totale du Stock en Magasin' : 'Total Warehouse Stock Value'}
          </div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {formatFCFA(totalStockValue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'fr' ? 'Basé sur le Coût Moyen Pondéré (CMP) en vigueur' : 'Based on current Weighted Average Cost (CMP)'}
          </div>
        </div>

        <div className={`border rounded-xl p-4 shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400">
            {language === 'fr' ? 'Références Actives au Magasin' : 'Active Catalog References'}
          </div>
          <div className={`text-2xl font-black mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {products.filter(p => p.status === 'actif').length} {language === 'fr' ? 'références' : 'items'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'fr' ? 'Matières premières, prémix & aliments finis' : 'Raw materials, premixes & feeds'}
          </div>
        </div>

        <div className={`border rounded-xl p-4 shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400">
            {language === 'fr' ? 'Alertes & Ruptures Critiques' : 'Alerts & Out-of-Stock'}
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'
            }`}
          >
            {lowStockCount} {language === 'fr' ? 'alerte(s)' : 'alert(s)'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'fr' ? 'Seuil minimum paramétrable par fiche produit' : 'Configurable minimum threshold per item'}
          </div>
        </div>
      </div>

      {/* Tab switch between Stock Inventory and Movement Ledger */}
      <div className={`flex border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('status')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'status'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          {language === 'fr' ? 'État des Stocks Actuels' : 'Current Stock Inventory'} ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{language === 'fr' ? 'Journal des Mouvements' : 'Movement Ledger'} ({stockMovements.length})</span>
        </button>
      </div>

      {/* TAB 1: Real-time Stock Status */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={language === 'fr' ? 'Rechercher par libellé ou code...' : 'Search by item name or code...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">
                {language === 'fr' ? 'Famille :' : 'Category:'}
              </span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-850'
                }`}
              >
                <option value="all">{language === 'fr' ? 'Toutes les familles' : 'All categories'}</option>
                <option value="Matières premières">{language === 'fr' ? 'Matières premières' : 'Raw materials'}</option>
                <option value="Concentrés, prémix et compléments">
                  {language === 'fr' ? 'Concentrés, prémix & compléments' : 'Concentrates, premixes & complements'}
                </option>
                <option value="Aliments finis">{language === 'fr' ? 'Aliments finis' : 'Finished feeds'}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider ${
                    theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <th className="py-3 px-3">{language === 'fr' ? 'Réf / Code' : 'Ref / Code'}</th>
                    <th className="py-3 px-3">{language === 'fr' ? 'Désignation' : 'Product Name'}</th>
                    <th className="py-3 px-3">{language === 'fr' ? 'Conditionnement' : 'Packaging'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'Stock Base' : 'Base Stock'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'Équiv. Commercial' : 'Commercial Equiv.'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'CMP Unitaire' : 'Unit WAC'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'Valeur Stock' : 'Stock Value'}</th>
                    <th className="py-3 px-3 text-center">{language === 'fr' ? 'État Stock' : 'Stock State'}</th>
                    {(currentUser.role === 'administrateur' ||
                      currentUser.role === 'responsable' ||
                      currentUser.role === 'magasinier' ||
                      currentUser.role === 'developpeur') && (
                      <th className="py-3 px-3 text-center">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {filteredProducts.map(prod => {
                    const isOutOfStock = prod.stockCurrentBaseUnit <= 0;
                    const isLowStock =
                      prod.stockCurrentBaseUnit > 0 &&
                      prod.stockCurrentBaseUnit <= prod.minAlertThresholdBaseUnit;

                    const fullSacks = Math.floor(
                      prod.stockCurrentBaseUnit / (prod.conversionFactor || 1)
                    );
                    const remainingBase = Math.round(
                      (prod.stockCurrentBaseUnit % (prod.conversionFactor || 1)) * 100
                    ) / 100;

                    const lineValue = prod.stockCurrentBaseUnit * prod.cmp;

                    return (
                      <tr key={prod.id} className={`transition ${
                        theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                      }`}>
                        <td className="py-3 px-3 font-mono text-slate-400 font-medium">
                          {prod.code}
                        </td>
                        <td className="py-3 px-3">
                          <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{prod.name}</div>
                          <div className="text-[10px] text-slate-400">{prod.category}</div>
                        </td>
                        <td className={`py-3 px-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                          {prod.packaging} ({prod.conversionFactor} {prod.baseUnit}/{prod.saleUnit})
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span
                            className={
                              isOutOfStock
                                ? 'text-rose-500'
                                : isLowStock
                                ? 'text-amber-500'
                                : theme === 'dark'
                                ? 'text-slate-100'
                                : 'text-slate-850'
                            }
                          >
                            {formatNumber(prod.stockCurrentBaseUnit)} {prod.baseUnit}
                          </span>
                        </td>
                        <td className={`py-3 px-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                          <span className="font-semibold">{fullSacks}</span> {prod.saleUnit}s
                          {remainingBase > 0 && (
                            <div className="text-[10px] text-amber-500 font-medium">
                              + {remainingBase} {prod.baseUnit}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-500 font-semibold">
                          {formatFCFA(prod.cmp)}
                          <span className="text-[10px] text-slate-400">/{prod.baseUnit}</span>
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                          {formatFCFA(lineValue)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30">
                              {language === 'fr' ? 'Rupture' : 'Out of Stock'}
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              {language === 'fr' ? 'Stock Faible' : 'Low Stock'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                              {language === 'fr' ? 'Optimal' : 'Optimal'}
                            </span>
                          )}
                        </td>
                        {(currentUser.role === 'administrateur' ||
                          currentUser.role === 'responsable' ||
                          currentUser.role === 'magasinier' ||
                          currentUser.role === 'developpeur') && (
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedProductId(prod.id);
                                setAdjustType('entrée fournisseur');
                                setIsNegativeChange(false);
                                setJustification(language === 'fr' ? `Entrée de stock : ${prod.name}` : `Stock inward: ${prod.name}`);
                                setShowAdjustmentModal(true);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 mx-auto transition cursor-pointer ${
                                theme === 'dark'
                                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              }`}
                              title={language === 'fr' ? `Ajouter ou mettre à jour le stock entrant pour ${prod.name}` : `Add or update incoming stock for ${prod.name}`}
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>{language === 'fr' ? 'Entrée Stock' : 'Add Stock'}</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Movement Ledger */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement Filters */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={language === 'fr' ? 'Rechercher par produit, document, auteur...' : 'Search by product, doc, user...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Specific Date Filter */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
                movementDateFilter
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                  : theme === 'dark'
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <Calendar className={`w-3.5 h-3.5 shrink-0 ${movementDateFilter ? 'text-emerald-500' : 'text-slate-400'}`} />
                <input
                  type="date"
                  value={movementDateFilter}
                  onChange={e => setMovementDateFilter(e.target.value)}
                  title={language === 'fr' ? 'Filtrer par date précise (ex: 2026-09-08)' : 'Filter by specific date (e.g. 2026-09-08)'}
                  className={`bg-transparent focus:outline-none cursor-pointer text-xs font-medium ${
                    movementDateFilter
                      ? 'text-emerald-500 font-bold'
                      : theme === 'dark'
                      ? 'text-slate-300'
                      : 'text-slate-700'
                  }`}
                />
                {movementDateFilter && (
                  <button
                    type="button"
                    onClick={() => setMovementDateFilter('')}
                    className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    title={language === 'fr' ? 'Effacer la date' : 'Clear date'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {language === 'fr' ? 'Type :' : 'Type:'}
                </span>
                <select
                  value={movementFilter}
                  onChange={e => setMovementFilter(e.target.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-850'
                  }`}
                >
                  <option value="all">{language === 'fr' ? 'Tous les types' : 'All types'}</option>
                  <option value="entrée fournisseur">{language === 'fr' ? 'Entrée fournisseur' : 'Supplier reception'}</option>
                  <option value="vente">{language === 'fr' ? 'Vente' : 'Sale'}</option>
                  <option value="retour client">{language === 'fr' ? 'Retour client (Avoir)' : 'Customer return'}</option>
                  <option value="retour fournisseur">{language === 'fr' ? 'Retour fournisseur' : 'Supplier return'}</option>
                  <option value="correction d'inventaire">{language === 'fr' ? 'Correction inventaire' : 'Inventory correction'}</option>
                  <option value="produit endommagé">{language === 'fr' ? 'Produit endommagé' : 'Damaged goods'}</option>
                  <option value="perte">{language === 'fr' ? 'Perte' : 'Loss'}</option>
                  <option value="consommation interne">{language === 'fr' ? 'Consommation interne' : 'Internal use'}</option>
                </select>
              </div>
            </div>
          </div>

          {movementDateFilter && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-medium">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'fr'
                    ? `Filtre actif pour le ${formatDate(movementDateFilter)} : ${filteredMovements.length} mouvement(s) de stock`
                    : `Active filter for ${formatDate(movementDateFilter)}: ${filteredMovements.length} stock movement(s)`}
                </span>
              </div>
              <button
                onClick={() => setMovementDateFilter('')}
                className="text-xs hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <span>{language === 'fr' ? 'Effacer le filtre' : 'Clear filter'}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Movements Table */}
          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider ${
                    theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <th className="py-3 px-3">Date & Heure</th>
                    <th className="py-3 px-3">Produit</th>
                    <th className="py-3 px-3">Type Mouvement</th>
                    <th className="py-3 px-3 text-right">Variation Qté</th>
                    <th className="py-3 px-3 text-right">Stock Avant</th>
                    <th className="py-3 px-3 text-right">Stock Après</th>
                    <th className="py-3 px-3">Document Réf.</th>
                    <th className="py-3 px-3">Opérateur & Motif</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {filteredMovements.map(mov => {
                    const isPositive = mov.quantityBaseUnit > 0;
                    return (
                      <tr key={mov.id} className={`transition ${
                        theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                      }`}>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {mov.timestamp}
                        </td>
                        <td className="py-3 px-3">
                          <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{mov.productName}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {mov.productCode}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                              mov.type === 'entrée fournisseur' || mov.type === 'retour client'
                                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                : mov.type === 'vente'
                                ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            }`}
                          >
                            {mov.type}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold text-sm ${
                            isPositive ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatNumber(mov.quantityBaseUnit)} {mov.unit}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                          {formatNumber(mov.stockBefore)} {mov.unit}
                        </td>
                        <td className={`py-3 px-3 text-right font-semibold ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                        }`}>
                          {formatNumber(mov.stockAfter)} {mov.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {mov.referenceDocument}
                        </td>
                        <td className="py-3 px-3">
                          <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{mov.userName}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">
                            {mov.justification}
                          </div>
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

      {/* Manual Stock Adjustment / Damage Modal */}
      {showAdjustmentModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowAdjustmentModal(false)}
        >
          <div
            className={`border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-850'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`font-bold text-sm sm:text-base flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <Scale className="w-4 h-4 text-emerald-500" />
                {language === 'fr' ? 'Ajustement Manuel / Déclaration Perte & Dégradation' : 'Manual Stock Adjustment / Loss Declaration'}
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAdjustmentSubmit} className="p-4 space-y-3.5 text-xs">
              {adjustError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 rounded-lg">
                  {adjustError}
                </div>
              )}
              {adjustSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 rounded-lg">
                  {adjustSuccess}
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-200 mb-1.5 font-bold text-xs">
                  {language === 'fr' ? 'Produit concerné :' : 'Target Product:'}
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {products
                    .filter(p => p.status === 'actif')
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) — Stock: {p.stockCurrentBaseUnit} {p.baseUnit}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-200 mb-1.5 font-bold text-xs">
                    {language === 'fr' ? 'Motif opérationnel :' : 'Operational Reason:'}
                  </label>
                  <select
                    value={adjustType}
                    onChange={e => {
                      const val = e.target.value as any;
                      setAdjustType(val);
                      if (val === 'entrée fournisseur') {
                        setIsNegativeChange(false);
                        if (!justification) {
                          setJustification(language === 'fr' ? `Arrivage fournisseur : ${selectedProduct.name}` : `Supplier delivery: ${selectedProduct.name}`);
                        }
                      } else if (val === 'produit endommagé' || val === 'perte' || val === 'consommation interne') {
                        setIsNegativeChange(true);
                      }
                    }}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="entrée fournisseur">{language === 'fr' ? 'Entrée de Stock / Arrivage (+)' : 'Incoming stock / Delivery (+)'}</option>
                    <option value="produit endommagé">{language === 'fr' ? 'Produit endommagé' : 'Damaged goods'}</option>
                    <option value="perte">{language === 'fr' ? 'Perte / Vol' : 'Loss / Theft'}</option>
                    <option value="consommation interne">{language === 'fr' ? 'Consommation interne' : 'Internal use'}</option>
                    <option value="correction d'inventaire">{language === 'fr' ? 'Correction ponctuelle' : 'Ad-hoc correction'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-200 mb-1.5 font-bold text-xs">
                    {language === 'fr' ? 'Sens du flux :' : 'Flow Direction:'}
                  </label>
                  <select
                    value={isNegativeChange ? 'sortie' : 'entrée'}
                    disabled={adjustType === 'entrée fournisseur'}
                    onChange={e => setIsNegativeChange(e.target.value === 'sortie')}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      adjustType === 'entrée fournisseur' ? 'opacity-80' : ''
                    } ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="entrée">{language === 'fr' ? 'Entrée / Augmentation (+)' : 'Inflow / Increase (+)'}</option>
                    <option value="sortie">{language === 'fr' ? 'Sortie / Diminution (-)' : 'Outflow / Decrease (-)'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 mb-1.5 font-bold text-xs">
                  Quantité ({selectedProduct.saleUnit}s de {selectedProduct.conversionFactor}{' '}
                  {selectedProduct.baseUnit}) :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={adjustQtyCommercial}
                    onChange={e => setAdjustQtyCommercial(Number(e.target.value))}
                    className={`flex-1 rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                  <span className="text-slate-500 dark:text-slate-300 font-bold text-xs">
                    = {adjustQtyCommercial * selectedProduct.conversionFactor}{' '}
                    {selectedProduct.baseUnit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 mb-1.5 font-bold text-xs">
                  {language === 'fr' ? 'Justification détaillée (Obligatoire) :' : 'Detailed Justification (Required):'}
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder={language === 'fr' ? 'Ex: Sac déchiré lors du déchargement, perte au sol...' : 'E.g.: Bag torn during unloading...'}
                  className={`w-full rounded-xl p-3 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              <div className={`pt-3 border-t flex justify-end gap-2.5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  {language === 'fr' ? "Enregistrer l'Ajustement" : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
