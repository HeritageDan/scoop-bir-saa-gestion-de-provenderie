import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Edit,
  History,
  Archive,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Eye,
  EyeOff,
  DollarSign,
  Tag,
  Layers,
  ArrowUpDown,
  X,
  Info,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory, ProductStatus, UnitType } from '../../types';
import { formatFCFA, formatDate, formatNumber, formatUnit } from '../../utils/formatters';

export const ProductsManager: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    archiveProduct,
    unarchiveProduct,
    maskProduct,
    currentUser,
    theme,
    language,
    t,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'salePrice' | 'margin' | 'stock'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal: New Product
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Aliments finis');
  const [newBaseUnit, setNewBaseUnit] = useState<UnitType>('kilogramme');
  const [newSaleUnit, setNewSaleUnit] = useState<UnitType>('sac');
  const [newPackaging, setNewPackaging] = useState('Sac de 50 kg');
  const [newConversionFactor, setNewConversionFactor] = useState<number>(50);
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(15000);
  const [newSalePrice, setNewSalePrice] = useState<number>(19000);
  const [newInitialStock, setNewInitialStock] = useState<number>(0);
  const [newInitialCmp, setNewInitialCmp] = useState<number>(300);
  const [newMinAlert, setNewMinAlert] = useState<number>(500);
  const [newDescription, setNewDescription] = useState('');
  const [newError, setNewError] = useState('');

  // Modal: Edit Product & Pricing
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('Aliments finis');
  const [editPackaging, setEditPackaging] = useState('');
  const [editBaseUnit, setEditBaseUnit] = useState<UnitType>('kilogramme');
  const [editSaleUnit, setEditSaleUnit] = useState<UnitType>('sac');
  const [editConversionFactor, setEditConversionFactor] = useState<number>(50);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editSalePrice, setEditSalePrice] = useState<number>(0);
  const [editMinAlert, setEditMinAlert] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');
  const [editPriceReason, setEditPriceReason] = useState('');
  const [editError, setEditError] = useState('');

  // Modal: Price History
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Quick stats
  const activeProducts = products.filter(p => p.status === 'actif');
  const totalValue = activeProducts.reduce((sum, p) => sum + p.stockCurrentBaseUnit * p.cmp, 0);
  const lowStockCount = activeProducts.filter(p => p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit).length;
  
  // Average commercial margin rate
  const avgMarginRate = activeProducts.length > 0
    ? activeProducts.reduce((sum, p) => {
        const margin = p.salePrice - p.purchasePrice;
        const rate = p.salePrice > 0 ? (margin / p.salePrice) * 100 : 0;
        return sum + rate;
      }, 0) / activeProducts.length
    : 0;

  // Filter & sort
  const filteredProducts = products
    .filter(p => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchStatus && matchSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'code') comparison = a.code.localeCompare(b.code);
      else if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'salePrice') comparison = a.salePrice - b.salePrice;
      else if (sortBy === 'stock') comparison = a.stockCurrentBaseUnit - b.stockCurrentBaseUnit;
      else if (sortBy === 'margin') {
        const marginA = a.salePrice > 0 ? (a.salePrice - a.purchasePrice) / a.salePrice : 0;
        const marginB = b.salePrice > 0 ? (b.salePrice - b.purchasePrice) / b.salePrice : 0;
        comparison = marginA - marginB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Handlers
  const handleOpenNewModal = () => {
    const nextSeq = products.length + 1;
    setNewCode(`PRD-${String(nextSeq).padStart(3, '0')}`);
    setNewName('');
    setNewCategory('Aliments finis');
    setNewBaseUnit('kilogramme');
    setNewSaleUnit('sac');
    setNewPackaging('Sac de 50 kg');
    setNewConversionFactor(50);
    setNewPurchasePrice(15000);
    setNewSalePrice(19000);
    setNewInitialStock(0);
    setNewInitialCmp(300);
    setNewMinAlert(500);
    setNewDescription('');
    setNewError('');
    setShowNewModal(true);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setNewError('');

    if (!newCode.trim() || !newName.trim()) {
      setNewError(language === 'fr' ? 'Le code et le nom du produit sont obligatoires.' : 'Code and name are required.');
      return;
    }

    if (products.some(p => p.code.trim().toUpperCase() === newCode.trim().toUpperCase())) {
      setNewError(language === 'fr' ? 'Ce code produit existe déjà dans le catalogue.' : 'This product code already exists.');
      return;
    }

    if (newSalePrice < 0 || newPurchasePrice < 0) {
      setNewError(language === 'fr' ? 'Les prix ne peuvent pas être négatifs.' : 'Prices cannot be negative.');
      return;
    }

    if (newConversionFactor <= 0) {
      setNewError(language === 'fr' ? 'Le facteur de conversion doit être supérieur à zéro.' : 'Conversion factor must be > 0.');
      return;
    }

    const calculatedCmp = newInitialStock > 0 && newInitialCmp > 0
      ? newInitialCmp
      : Math.round((newPurchasePrice / newConversionFactor) * 10) / 10;

    addProduct(
      {
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        category: newCategory,
        baseUnit: newBaseUnit,
        saleUnit: newSaleUnit,
        packaging: newPackaging.trim() || `Sac de ${newConversionFactor} ${newBaseUnit}`,
        conversionFactor: newConversionFactor,
        purchasePrice: newPurchasePrice,
        salePrice: newSalePrice,
        minAlertThresholdBaseUnit: newMinAlert,
        status: 'actif',
        description: newDescription.trim() || undefined,
      },
      newInitialStock,
      calculatedCmp
    );

    setShowNewModal(false);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditPackaging(product.packaging);
    setEditBaseUnit(product.baseUnit);
    setEditSaleUnit(product.saleUnit);
    setEditConversionFactor(product.conversionFactor || 1);
    setEditPurchasePrice(product.purchasePrice);
    setEditSalePrice(product.salePrice);
    setEditMinAlert(product.minAlertThresholdBaseUnit);
    setEditDescription(product.description || '');
    setEditPriceReason('');
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditError('');

    if (!editName.trim()) {
      setEditError(language === 'fr' ? 'Le nom du produit est obligatoire.' : 'Product name is required.');
      return;
    }

    if (editSalePrice < 0 || editPurchasePrice < 0) {
      setEditError(language === 'fr' ? 'Les prix ne peuvent pas être négatifs.' : 'Prices cannot be negative.');
      return;
    }

    if (editConversionFactor <= 0) {
      setEditError(language === 'fr' ? 'Le facteur de conversion doit être supérieur à 0.' : 'Conversion factor must be > 0.');
      return;
    }

    const priceChanged =
      editingProduct.purchasePrice !== editPurchasePrice ||
      editingProduct.salePrice !== editSalePrice;

    if (priceChanged && !editPriceReason.trim()) {
      setEditError(
        language === 'fr'
          ? 'Veuillez saisir un motif pour justifier la modification de tarif dans la piste d\'audit.'
          : 'Please enter a justification for the price change in the audit trail.'
      );
      return;
    }

    updateProduct(
      {
        ...editingProduct,
        name: editName.trim(),
        category: editCategory,
        packaging: editPackaging.trim() || `${editConversionFactor} ${editBaseUnit}`,
        baseUnit: editBaseUnit,
        saleUnit: editSaleUnit,
        conversionFactor: editConversionFactor,
        purchasePrice: editPurchasePrice,
        salePrice: editSalePrice,
        minAlertThresholdBaseUnit: editMinAlert,
        description: editDescription.trim() || undefined,
      },
      editPriceReason.trim() || undefined
    );

    setShowEditModal(false);
  };

  const exportProductsCSV = () => {
    const headers = [
      'Code',
      'Désignation',
      'Catégorie',
      'Conditionnement',
      'Unité Vente',
      'Unité Base',
      'Facteur Conversion',
      'Prix Achat (FCFA)',
      'Prix Vente (FCFA)',
      'Marge Brute (FCFA)',
      'Taux Marge (%)',
      'CMP Unitaire (FCFA)',
      'Stock Base',
      'Stock Commercial',
      'Seuil Alerte',
      'Statut',
    ];

    const rows = filteredProducts.map(p => {
      const margin = p.salePrice - p.purchasePrice;
      const marginRate = p.salePrice > 0 ? ((margin / p.salePrice) * 100).toFixed(1) : '0';
      const commStock = (p.stockCurrentBaseUnit / (p.conversionFactor || 1)).toFixed(1);
      return [
        `"${p.code}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.packaging.replace(/"/g, '""')}"`,
        `"${p.saleUnit}"`,
        `"${p.baseUnit}"`,
        p.conversionFactor,
        p.purchasePrice,
        p.salePrice,
        margin,
        `${marginRate}%`,
        p.cmp,
        p.stockCurrentBaseUnit,
        commStock,
        p.minAlertThresholdBaseUnit,
        `"${p.status}"`,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `catalogue_produits_tarifs_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <div className="flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-500" />
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {language === 'fr' ? 'Produits & Tarifs' : 'Products & Pricing'}
              </h1>
              <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {language === 'fr'
                  ? 'Gestion du catalogue, fixation des tarifs d\'achat/vente, unités de mesure et marges'
                  : 'Product catalog management, purchase/sale pricing, units and margin controls'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={exportProductsCSV}
            className={`border px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>{language === 'fr' ? 'Export Catalogue CSV' : 'Export CSV'}</span>
          </button>

          {(currentUser.role === 'administrateur' ||
            currentUser.role === 'responsable' ||
            currentUser.role === 'developpeur') && (
            <button
              onClick={handleOpenNewModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'fr' ? 'Nouveau Produit' : 'New Product'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'fr' ? 'Total Références' : 'Total Products'}
            </span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {products.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-500 font-bold">{activeProducts.length} actifs</span>
            <span>•</span>
            <span>{products.filter(p => p.status === 'archivé').length} archivés</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'fr' ? 'Marge Moyenne' : 'Average Margin'}
            </span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-500">
            {avgMarginRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'fr' ? 'Taux de marque moyen catalogue' : 'Average catalog margin rate'}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'fr' ? 'Valeur Stock (CMP)' : 'Stock Value (CMP)'}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {formatFCFA(totalValue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'fr' ? 'Valorisation aux coûts réels' : 'Real CMP inventory valuation'}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {language === 'fr' ? 'Alertes & Ruptures' : 'Alerts & Stockouts'}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-black font-mono ${lowStockCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lowStockCount === 0
              ? (language === 'fr' ? 'Tous les stocks sont optimaux' : 'All stock levels optimal')
              : (language === 'fr' ? 'Articles sous le seuil minimum' : 'Items under min threshold')}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'fr' ? 'Rechercher par nom, code, descriptif...' : 'Search by code, name...'}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className={`rounded-xl px-3 py-2 text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">{language === 'fr' ? 'Toutes les familles' : 'All Categories'}</option>
              <option value="Matières premières">{language === 'fr' ? 'Matières premières' : 'Raw materials'}</option>
              <option value="Concentrés, prémix et compléments">
                {language === 'fr' ? 'Concentrés & Prémix' : 'Concentrates & Premixes'}
              </option>
              <option value="Aliments finis">{language === 'fr' ? 'Aliments finis' : 'Finished feeds'}</option>
              <option value="Autres fournitures">{language === 'fr' ? 'Autres fournitures' : 'Other supplies'}</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className={`rounded-xl px-3 py-2 text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">{language === 'fr' ? 'Tous les statuts' : 'All statuses'}</option>
              <option value="actif">{language === 'fr' ? 'Actifs uniquement' : 'Active only'}</option>
              <option value="masqué">{language === 'fr' ? 'Masqués uniquement' : 'Hidden only'}</option>
              <option value="archivé">{language === 'fr' ? 'Archivés uniquement' : 'Archived only'}</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className={`rounded-xl px-3 py-2 text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="code">{language === 'fr' ? 'Trier : Code' : 'Sort: Code'}</option>
              <option value="name">{language === 'fr' ? 'Trier : Nom' : 'Sort: Name'}</option>
              <option value="salePrice">{language === 'fr' ? 'Trier : Prix Vente' : 'Sort: Sale Price'}</option>
              <option value="margin">{language === 'fr' ? 'Trier : Marge' : 'Sort: Margin'}</option>
              <option value="stock">{language === 'fr' ? 'Trier : Stock' : 'Sort: Stock'}</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className={`p-2 rounded-xl border cursor-pointer transition ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title={sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className={`border rounded-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                theme === 'dark' ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <th className="py-3.5 px-3.5">{language === 'fr' ? 'Code / Réf' : 'Code / Ref'}</th>
                <th className="py-3.5 px-3.5">{language === 'fr' ? 'Désignation' : 'Product Name'}</th>
                <th className="py-3.5 px-3.5">{language === 'fr' ? 'Conditionnement & Unités' : 'Packaging & Units'}</th>
                <th className="py-3.5 px-3.5 text-right">{language === 'fr' ? 'Prix Achat' : 'Purchase Price'}</th>
                <th className="py-3.5 px-3.5 text-right">{language === 'fr' ? 'Prix Vente' : 'Sale Price'}</th>
                <th className="py-3.5 px-3.5 text-right">{language === 'fr' ? 'Marge Brute' : 'Gross Margin'}</th>
                <th className="py-3.5 px-3.5 text-right">{language === 'fr' ? 'Stock Actuel' : 'Current Stock'}</th>
                <th className="py-3.5 px-3.5 text-center">{language === 'fr' ? 'Statut' : 'Status'}</th>
                <th className="py-3.5 px-3.5 text-center">{language === 'fr' ? 'Actions' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                    <p className="font-semibold">{language === 'fr' ? 'Aucun produit trouvé' : 'No products found'}</p>
                    <p className="text-[11px] mt-1">
                      {language === 'fr'
                        ? 'Cliquez sur « Nouveau Produit » pour créer votre première référence commerciale.'
                        : 'Click "New Product" to register your first product.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  const marginAmount = prod.salePrice - prod.purchasePrice;
                  const marginPercent = prod.salePrice > 0 ? (marginAmount / prod.salePrice) * 100 : 0;
                  const commUnits = (prod.stockCurrentBaseUnit / (prod.conversionFactor || 1)).toFixed(1);
                  const isLow = prod.status === 'actif' && prod.stockCurrentBaseUnit <= prod.minAlertThresholdBaseUnit;
                  const isOut = prod.status === 'actif' && prod.stockCurrentBaseUnit <= 0;

                  return (
                    <tr
                      key={prod.id}
                      className={`transition ${
                        theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-400">
                        {prod.code}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {prod.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                            prod.category === 'Aliments finis'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              : prod.category === 'Matières premières'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                          }`}>
                            {prod.category}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                          {prod.packaging}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          1 {prod.saleUnit} = {prod.conversionFactor} {formatUnit(prod.baseUnit)}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono">
                        <div className={`font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {formatFCFA(prod.purchasePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          /{prod.saleUnit}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono">
                        <div className="font-bold text-emerald-500">
                          {formatFCFA(prod.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          /{prod.saleUnit}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono">
                        <div className={`font-bold ${marginAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {marginAmount >= 0 ? '+' : ''}{formatFCFA(marginAmount)}
                        </div>
                        <div className={`text-[10px] font-bold ${
                          marginPercent >= 20 ? 'text-emerald-500' : marginPercent >= 10 ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {marginPercent.toFixed(1)}%
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className={`font-bold font-mono ${
                          isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                          {formatNumber(prod.stockCurrentBaseUnit)} {formatUnit(prod.baseUnit)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ≈ {commUnits} {prod.saleUnit}s
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        {prod.status === 'actif' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {language === 'fr' ? 'Actif' : 'Active'}
                          </span>
                        ) : prod.status === 'masqué' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            {language === 'fr' ? 'Masqué' : 'Hidden'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            {language === 'fr' ? 'Archivé' : 'Archived'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                            title={language === 'fr' ? 'Modifier le produit & les tarifs' : 'Edit product & prices'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setHistoryProduct(prod)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition cursor-pointer"
                            title={language === 'fr' ? 'Voir l\'historique des prix' : 'View price history'}
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              maskProduct(prod.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                            title={prod.status === 'masqué' ? (language === 'fr' ? 'Afficher' : 'Unhide') : (language === 'fr' ? 'Masquer' : 'Hide')}
                          >
                            {prod.status === 'masqué' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => {
                              if (prod.status === 'archivé') {
                                unarchiveProduct(prod.id);
                              } else {
                                archiveProduct(prod.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title={prod.status === 'archivé' ? 'Désarchiver' : 'Archiver'}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOUVEAU PRODUIT */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 my-8 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'fr' ? 'Créer un Nouveau Produit' : 'Create New Product'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'fr' ? 'Définition des caractéristiques, tarifs et unités de vente' : 'Define specifications, prices and sales units'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-4">
              {newError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{newError}</span>
                </div>
              )}

              {/* Grid 2 Cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? 'Code / Référence unique *' : 'Unique Code *'}
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    required
                    placeholder="ex: PRD-001"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? 'Famille de produit *' : 'Product Category *'}
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Aliments finis">{language === 'fr' ? 'Aliments finis' : 'Finished feeds'}</option>
                    <option value="Matières premières">{language === 'fr' ? 'Matières premières' : 'Raw materials'}</option>
                    <option value="Concentrés, prémix et compléments">{language === 'fr' ? 'Concentrés, prémix & compléments' : 'Concentrates & premixes'}</option>
                    <option value="Autres fournitures">{language === 'fr' ? 'Autres fournitures' : 'Other supplies'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {language === 'fr' ? 'Désignation commerciale complète *' : 'Full Commercial Name *'}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  placeholder="ex: Aliment Démarrage Poussin 50kg"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Units & Packaging */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>{language === 'fr' ? 'Unités & Conditionnement' : 'Units & Packaging'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'fr' ? 'Unité de Vente' : 'Sales Unit'}
                    </label>
                    <select
                      value={newSaleUnit}
                      onChange={e => setNewSaleUnit(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="sac">Sac</option>
                      <option value="kilogramme">Kilogramme (kg)</option>
                      <option value="litre">Litre (L)</option>
                      <option value="boîte">Boîte</option>
                      <option value="unité">Unité</option>
                      <option value="tonne">Tonne</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'fr' ? 'Unité de Stock (Base)' : 'Base Stock Unit'}
                    </label>
                    <select
                      value={newBaseUnit}
                      onChange={e => setNewBaseUnit(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="kilogramme">Kilogramme (kg)</option>
                      <option value="litre">Litre (L)</option>
                      <option value="sac">Sac</option>
                      <option value="boîte">Boîte</option>
                      <option value="unité">Unité</option>
                      <option value="tonne">Tonne</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'fr' ? 'Facteur de conversion' : 'Conversion Factor'}
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={newConversionFactor}
                      onChange={e => setNewConversionFactor(parseFloat(e.target.value) || 1)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Règle de conversion : <strong className="text-slate-900 dark:text-white">1 {newSaleUnit}</strong> contiendra <strong className="text-slate-900 dark:text-white">{newConversionFactor} {newBaseUnit}(s)</strong> lors de la facturation et du décompte stock.
                  </span>
                </div>
              </div>

              {/* Pricing & Margins */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>{language === 'fr' ? 'Tarification & Marge Commerciale' : 'Pricing & Margins'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'fr' ? 'Prix d\'Achat Catalogue (FCFA) *' : 'Purchase Price (FCFA) *'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newPurchasePrice}
                      onChange={e => setNewPurchasePrice(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'fr' ? 'Prix de Vente Unitaire (FCFA) *' : 'Sales Price (FCFA) *'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newSalePrice}
                      onChange={e => setNewSalePrice(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Marge brute unitaire estimée :</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                    {formatFCFA(newSalePrice - newPurchasePrice)} / {newSaleUnit} ({newSalePrice > 0 ? (((newSalePrice - newPurchasePrice) / newSalePrice) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              {/* Stock Initial & Seuil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? `Stock Initial (${newBaseUnit})` : `Initial Stock (${newBaseUnit})`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newInitialStock}
                    onChange={e => setNewInitialStock(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? `Seuil Alerte Stock Bas (${newBaseUnit})` : `Min Alert Threshold (${newBaseUnit})`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newMinAlert}
                    onChange={e => setNewMinAlert(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {language === 'fr' ? 'Fiche technique / Description (Optionnel)' : 'Description (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Composition nutritionnelle, recommandations d'élevage..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Créer le Produit' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFIER PRODUIT & TARIFS */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 my-8 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'fr' ? `Modifier le Produit : ${editingProduct.code}` : `Edit Product : ${editingProduct.code}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'fr' ? 'Mise à jour des tarifs, du conditionnement et des marges' : 'Update prices, packaging and margins'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 pt-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? 'Désignation Produit *' : 'Product Name *'}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? 'Catégorie *' : 'Category *'}
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Aliments finis">{language === 'fr' ? 'Aliments finis' : 'Finished feeds'}</option>
                    <option value="Matières premières">{language === 'fr' ? 'Matières premières' : 'Raw materials'}</option>
                    <option value="Concentrés, prémix et compléments">{language === 'fr' ? 'Concentrés, prémix & compléments' : 'Concentrates & premixes'}</option>
                    <option value="Autres fournitures">{language === 'fr' ? 'Autres fournitures' : 'Other supplies'}</option>
                  </select>
                </div>
              </div>

              {/* Tarifs Achat & Vente */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span>{language === 'fr' ? 'Révision Tarifaire (FCFA)' : 'Price Revision (FCFA)'}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    CMP Actuel : {formatFCFA(editingProduct.cmp)}/{editingProduct.baseUnit}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'fr' ? 'Prix d\'Achat Catalogue (FCFA)' : 'Purchase Price (FCFA)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editPurchasePrice}
                      onChange={e => setEditPurchasePrice(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'fr' ? 'Prix de Vente Unitaire (FCFA)' : 'Sales Price (FCFA)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editSalePrice}
                      onChange={e => setEditSalePrice(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Justification de prix */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'fr' ? 'Motif de révision tarifaire (Piste d\'audit) *' : 'Reason for price revision (Audit trail) *'}
                  </label>
                  <input
                    type="text"
                    value={editPriceReason}
                    onChange={e => setEditPriceReason(e.target.value)}
                    placeholder="ex: Ajustement cours des intrants, négociation volume..."
                    className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Conditionnement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? 'Libellé Conditionnement' : 'Packaging'}
                  </label>
                  <input
                    type="text"
                    value={editPackaging}
                    onChange={e => setEditPackaging(e.target.value)}
                    placeholder="ex: Sac de 50 kg"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    {language === 'fr' ? `Seuil Alerte Stock Bas (${editingProduct.baseUnit})` : `Min Alert (${editingProduct.baseUnit})`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editMinAlert}
                    onChange={e => setEditMinAlert(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {language === 'fr' ? 'Description' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Enregistrer les Modifications' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIQUE DES PRIX */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 my-8 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'fr' ? 'Historique des Tarifs' : 'Price History'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {historyProduct.name} ({historyProduct.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-4">
              {historyProduct.priceHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {language === 'fr' ? 'Aucune révision tarifaire enregistrée pour ce produit.' : 'No price revisions recorded.'}
                </div>
              ) : (
                historyProduct.priceHistory.map((h, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">{formatDate(h.date)}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold">• par {h.changedBy}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                        « {h.reason || 'Modification de tarif'} »
                      </p>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                        Vente : {formatFCFA(h.salePrice)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-300">
                        Achat : {formatFCFA(h.purchasePrice)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
              >
                {language === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
