import React, { useState } from 'react';
import {
  Truck,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  Calendar,
  Building,
  FileText,
  Search,
  X,
  Plus,
  Trash2,
  DollarSign,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Purchase, PurchaseItem } from '../../types';
import { formatFCFA, formatDate, formatDateTime } from '../../utils/formatters';

export const PurchasesManager: React.FC = () => {
  const {
    purchases,
    suppliers,
    products,
    currentUser,
    settings,
    salesPoints,
    currentSalesPointId,
    theme,
    language,
    t,
    createPurchaseDraft,
    updatePurchase,
    validatePurchaseReception,
    cancelPurchase,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'validé' | 'brouillon' | 'annulé'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Sales Point selector for Admin
  const [adminSalesPointId, setAdminSalesPointId] = useState<string>(() =>
    currentSalesPointId === 'all' ? (salesPoints[0]?.id || 'pos-1') : currentSalesPointId
  );

  // Synchronize adminSalesPointId when active point of sale changes in Header
  React.useEffect(() => {
    if (currentSalesPointId !== 'all') {
      setAdminSalesPointId(currentSalesPointId);
    }
  }, [currentSalesPointId]);

  // Modal for new reception
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierDocRef, setSupplierDocRef] = useState('');
  const [transportFees, setTransportFees] = useState<number>(0);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const handleOpenNewModal = () => {
    if (currentSalesPointId !== 'all') {
      setAdminSalesPointId(currentSalesPointId);
    } else if (salesPoints.length > 0 && !salesPoints.some(s => s.id === adminSalesPointId)) {
      setAdminSalesPointId(salesPoints[0]?.id || 'pos-1');
    }
    if (suppliers.length > 0 && (!selectedSupplierId || !suppliers.some(s => s.id === selectedSupplierId))) {
      setSelectedSupplierId(suppliers[0]?.id || '');
    }
    setErrorMsg('');
    setShowNewModal(true);
  };

  // Items in new reception
  interface FormItem {
    productId: string;
    quantity: number; // in saleUnit
    unitPrice: number; // unit purchase price (FCFA)
  }
  const [formItems, setFormItems] = useState<FormItem[]>([
    {
      productId: products[0]?.id || '',
      quantity: 10,
      unitPrice: products[0]?.purchasePrice || 15000,
    },
  ]);

  // Selected Purchase for detailed view / print
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Cancellation modal
  const [cancelModalPurchase, setCancelModalPurchase] = useState<Purchase | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredPurchases = purchases
    .filter(p => {
      const matchesSalesPoint =
        currentSalesPointId === 'all' || !p.salesPointId || p.salesPointId === currentSalesPointId;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesDate =
        !dateFilter ||
        (p.receptionDate && p.receptionDate.slice(0, 10) === dateFilter) ||
        (p.orderDate && p.orderDate.slice(0, 10) === dateFilter) ||
        (p.createdAt && p.createdAt.slice(0, 10) === dateFilter);
      const ref = (p.referenceNumber || '').toLowerCase();
      const sup = (p.supplierName || '').toLowerCase();
      const doc = (p.supplierDocumentRef || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || ref.includes(term) || sup.includes(term) || doc.includes(term);
      return matchesSalesPoint && matchesStatus && matchesDate && matchesSearch;
    })
    .sort((a, b) => {
      const timeA = new Date(a.receptionDate || a.orderDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.receptionDate || b.orderDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  const handleAddItemRow = () => {
    setFormItems(prev => [
      ...prev,
      {
        productId: products[0]?.id || '',
        quantity: 10,
        unitPrice: products[0]?.purchasePrice || 15000,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof FormItem, val: any) => {
    setFormItems(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'productId') {
          const prd = products.find(p => p.id === val);
          return {
            ...item,
            productId: val,
            unitPrice: prd ? prd.purchasePrice : item.unitPrice,
          };
        }
        return { ...item, [field]: val };
      })
    );
  };

  // Calculations for new reception
  const subtotal = formItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalAmount = subtotal + Number(transportFees || 0);

  const handleSavePurchase = (validateDirectly = false) => {
    setErrorMsg('');
    if (formItems.length === 0) {
      setErrorMsg(language === 'fr' ? 'Veuillez ajouter au moins une ligne de produit.' : 'Please add at least one product line.');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
    if (!supplier) {
      setErrorMsg(language === 'fr' ? 'Veuillez sélectionner un fournisseur.' : 'Please select a supplier.');
      return;
    }

    // Validate items
    for (const item of formItems) {
      if (!item.productId) {
        setErrorMsg(language === 'fr' ? 'Veuillez sélectionner un produit pour chaque ligne.' : 'Please select a product for each line.');
        return;
      }
      if (item.quantity <= 0) {
        setErrorMsg(language === 'fr' ? 'La quantité doit être strictement positive.' : 'Quantity must be strictly positive.');
        return;
      }
      if (item.unitPrice < 0) {
        setErrorMsg(language === 'fr' ? 'Le prix unitaire ne peut pas être négatif.' : 'Unit price cannot be negative.');
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const dateCode = nowIso.slice(0, 10).replace(/-/g, '');
    const finalDocRef = supplierDocRef.trim() || `ENTREE-${dateCode}-${Date.now().toString().slice(-4)}`;

    const purchaseItems: PurchaseItem[] = formItems
      .map(item => {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) return null;
        const qty = Number(item.quantity || 0);
        const price = Number(item.unitPrice || 0);
        return {
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          unit: prod.saleUnit,
          quantityOrdered: qty,
          quantityReceived: qty,
          unitPrice: price,
          totalPrice: qty * price,
        };
      })
      .filter((it): it is PurchaseItem => it !== null);

    if (purchaseItems.length === 0) {
      setErrorMsg(language === 'fr' ? 'Aucun produit valide dans le formulaire.' : 'No valid product in form.');
      return;
    }

    const calculatedSubtotal = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const finalTransportFees = Math.max(0, Number(transportFees || 0));
    const calculatedTotalAmount = calculatedSubtotal + finalTransportFees;

    const targetSpId = (currentUser.role === 'administrateur' || currentUser.role === 'developpeur')
      ? (adminSalesPointId || (currentSalesPointId !== 'all' ? currentSalesPointId : (salesPoints[0]?.id || 'pos-1')))
      : (currentUser.assignedSalesPointId || 'pos-1');

    try {
      const newPurchase = createPurchaseDraft({
        supplierDocumentRef: finalDocRef,
        supplierId: supplier.id,
        supplierName: supplier.name,
        orderDate: nowIso,
        items: purchaseItems,
        subtotal: calculatedSubtotal,
        transportFees: finalTransportFees,
        otherFees: 0,
        totalAmount: calculatedTotalAmount,
        userId: currentUser.id,
        userName: currentUser.name,
        notes: purchaseNotes.trim(),
      }, targetSpId);

      if (validateDirectly) {
        validatePurchaseReception(newPurchase);
      }

      setShowNewModal(false);
      setSupplierDocRef('');
      setTransportFees(0);
      setPurchaseNotes('');
      setFormItems([
        {
          productId: products[0]?.id || '',
          quantity: 10,
          unitPrice: products[0]?.purchasePrice || 15000,
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err?.message || (language === 'fr' ? 'Erreur lors de l\'enregistrement de la réception.' : 'Error saving goods reception.'));
    }
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalPurchase) return;
    if (!cancelReason.trim()) {
      alert('Un motif d\'annulation est obligatoire.');
      return;
    }
    cancelPurchase(cancelModalPurchase.id, cancelReason);
    setCancelModalPurchase(null);
    setCancelReason('');
  };

  // Edit Purchase / Incoming Stock Modal State
  const [editModalPurchase, setEditModalPurchase] = useState<Purchase | null>(null);
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editDocRef, setEditDocRef] = useState('');
  const [editTransportFees, setEditTransportFees] = useState<number>(0);
  const [editPurchaseNotes, setEditPurchaseNotes] = useState('');
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editFormItems, setEditFormItems] = useState<FormItem[]>([]);
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  const handleOpenEditModal = (pur: Purchase) => {
    setEditModalPurchase(pur);
    setEditSupplierId(pur.supplierId);
    setEditDocRef(pur.supplierDocumentRef);
    setEditTransportFees(pur.transportFees || 0);
    setEditPurchaseNotes(pur.notes || '');
    setEditOrderDate(pur.orderDate || '');
    setEditFormItems(
      pur.items.map(item => ({
        productId: item.productId,
        quantity: item.quantityReceived || item.quantityOrdered,
        unitPrice: item.unitPrice,
      }))
    );
    setEditErrorMsg('');
    setEditSuccessMsg('');
  };

  const handleAddItemRowEdit = () => {
    setEditFormItems(prev => [
      ...prev,
      {
        productId: products[0]?.id || '',
        quantity: 10,
        unitPrice: products[0]?.purchasePrice || 15000,
      },
    ]);
  };

  const handleRemoveItemRowEdit = (idx: number) => {
    if (editFormItems.length <= 1) return;
    setEditFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChangeEdit = (idx: number, field: keyof FormItem, val: any) => {
    setEditFormItems(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'productId') {
          const prd = products.find(p => p.id === val);
          return {
            ...item,
            productId: val,
            unitPrice: prd ? prd.purchasePrice : item.unitPrice,
          };
        }
        return { ...item, [field]: val };
      })
    );
  };

  const editSubtotal = editFormItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const editTotalAmount = editSubtotal + Number(editTransportFees || 0);

  const handleSaveEdit = (andValidate = false) => {
    if (!editModalPurchase) return;
    setEditErrorMsg('');
    setEditSuccessMsg('');

    if (!editDocRef.trim()) {
      setEditErrorMsg(language === 'fr' ? 'La référence du document fournisseur (N° BL) est obligatoire.' : 'Supplier document reference is required.');
      return;
    }

    if (editFormItems.length === 0) {
      setEditErrorMsg(language === 'fr' ? 'Veuillez ajouter au moins une ligne de produit.' : 'Please add at least one product row.');
      return;
    }

    const supplier = suppliers.find(s => s.id === editSupplierId);
    const purchaseItems: PurchaseItem[] = editFormItems.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productCode: prod?.code || '',
        productName: prod?.name || '',
        unit: prod?.saleUnit || 'sac',
        quantityOrdered: item.quantity,
        quantityReceived: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      };
    });

    const res = updatePurchase(editModalPurchase.id, {
      supplierId: supplier?.id || editModalPurchase.supplierId,
      supplierName: supplier?.name || editModalPurchase.supplierName,
      supplierDocumentRef: editDocRef.trim(),
      orderDate: editOrderDate || editModalPurchase.orderDate,
      transportFees: Number(editTransportFees || 0),
      notes: editPurchaseNotes.trim(),
      items: purchaseItems,
      subtotal: editSubtotal,
      totalAmount: editTotalAmount,
    });

    if (!res.success) {
      setEditErrorMsg(res.error || (language === 'fr' ? 'Erreur lors de la mise à jour.' : 'Error updating reception.'));
      return;
    }

    if (andValidate && editModalPurchase.status === 'brouillon') {
      validatePurchaseReception(editModalPurchase.id);
    }

    setEditSuccessMsg(language === 'fr' ? 'Réception d\'approvisionnement mise à jour avec succès !' : 'Incoming stock updated successfully!');
    setTimeout(() => {
      setEditModalPurchase(null);
      setEditSuccessMsg('');
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <Truck className="w-6 h-6 text-emerald-500" />
            <span>{language === 'fr' ? 'Approvisionnements & Réceptions Fournisseurs' : 'Procurement & Supplier Receptions'}</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {language === 'fr'
              ? 'Enregistrement des arrivages, répercussion du transport et recalcul automatique du CMP.'
              : 'Record deliveries, integrate attributable transport and automatically recalculate WAC (CMP).'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(currentUser.role === 'administrateur' ||
            currentUser.role === 'responsable' ||
            currentUser.role === 'magasinier' ||
            currentUser.role === 'developpeur') && (
            <button
              onClick={handleOpenNewModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'fr' ? 'Nouvelle Réception' : 'New Goods Reception'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={language === 'fr' ? 'Rechercher par N° réception, fournisseur, BL...' : 'Search by reception #, supplier, doc ref...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Specific Date Filter */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
            dateFilter
              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
              : theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${dateFilter ? 'text-emerald-500' : 'text-slate-400'}`} />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              title={language === 'fr' ? 'Filtrer par date de réception (ex: 2026-09-08)' : 'Filter by reception date (e.g. 2026-09-08)'}
              className={`bg-transparent focus:outline-none cursor-pointer text-xs font-medium ${
                dateFilter
                  ? 'text-emerald-500 font-bold'
                  : theme === 'dark'
                  ? 'text-slate-300'
                  : 'text-slate-700'
              }`}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title={language === 'fr' ? 'Effacer la date' : 'Clear date'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs hidden sm:inline ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {language === 'fr' ? 'Statut :' : 'Status:'}
            </span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="all">{language === 'fr' ? 'Tous les statuts' : 'All statuses'}</option>
              <option value="validé">{language === 'fr' ? 'Validé (Stock & CMP mis à jour)' : 'Validated (Stock & CMP updated)'}</option>
              <option value="brouillon">{language === 'fr' ? 'Brouillon en attente' : 'Pending draft'}</option>
              <option value="annulé">{language === 'fr' ? 'Annulé' : 'Cancelled'}</option>
            </select>
          </div>
        </div>
      </div>

      {dateFilter && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              {language === 'fr'
                ? `Filtre actif pour le ${formatDate(dateFilter)} : ${filteredPurchases.length} arrivage(s) trouvé(s)`
                : `Active filter for ${formatDate(dateFilter)}: ${filteredPurchases.length} reception(s) found`}
            </span>
          </div>
          <button
            onClick={() => setDateFilter('')}
            className="text-xs hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <span>{language === 'fr' ? 'Effacer le filtre' : 'Clear filter'}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Purchases Table */}
      <div className={`border rounded-xl overflow-hidden shadow-xs ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                theme === 'dark'
                  ? 'bg-slate-850 border-slate-800 text-slate-400'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <th className="py-3 px-3">{language === 'fr' ? 'N° Réception' : 'Reception #'}</th>
                {currentSalesPointId === 'all' && (
                  <th className="py-3 px-3">{language === 'fr' ? 'Site / Dépôt' : 'Branch / Site'}</th>
                )}
                <th className="py-3 px-3">{language === 'fr' ? 'Fournisseur & Réf BL' : 'Supplier & Doc Ref'}</th>
                <th className="py-3 px-3">{language === 'fr' ? 'Date Réception' : 'Date'}</th>
                <th className="py-3 px-3">{language === 'fr' ? 'Produits Réceptionnés' : 'Received Products'}</th>
                <th className="py-3 px-3 text-right">{language === 'fr' ? 'Frais Transport' : 'Transport Fees'}</th>
                <th className="py-3 px-3 text-right">{language === 'fr' ? 'Montant Total' : 'Total Amount'}</th>
                <th className="py-3 px-3 text-center">{language === 'fr' ? 'Statut' : 'Status'}</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={currentSalesPointId === 'all' ? 9 : 8} className="py-8 text-center text-slate-500">
                    {language === 'fr' ? 'Aucun bon de réception trouvé.' : 'No goods reception records found.'}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(pur => (
                  <tr key={pur.id} className={`transition ${
                    theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                  }`}>
                    <td className={`py-3 px-3 font-mono font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {pur.referenceNumber}
                    </td>
                    {currentSalesPointId === 'all' && (
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {pur.salesPointName || pur.salesPointId || 'Siège'}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-3">
                      <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{pur.supplierName}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {language === 'fr' ? 'BL Fournisseur :' : 'Doc ref:'} {pur.supplierDocumentRef}
                      </div>
                    </td>
                    <td className={`py-3 px-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {pur.receptionDate || pur.orderDate}
                    </td>
                    <td className="py-3 px-3">
                      <div className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                        {pur.items
                          .map(i => `${i.quantityReceived} ${i.unit} ${i.productName}`)
                          .join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {pur.transportFees > 0 ? formatFCFA(pur.transportFees) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-500 text-sm">
                      {formatFCFA(pur.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          pur.status === 'validé'
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            : pur.status === 'brouillon'
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : 'bg-slate-500/20 text-slate-400 line-through border border-slate-500/30'
                        }`}
                      >
                        {pur.status === 'validé'
                          ? (language === 'fr' ? 'Validé' : 'Validated')
                          : pur.status === 'brouillon'
                          ? (language === 'fr' ? 'Brouillon' : 'Draft')
                          : (language === 'fr' ? 'Annulé' : 'Cancelled')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPurchase(pur)}
                        className={`px-2 py-1 rounded text-xs transition cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title={language === 'fr' ? 'Consulter le Bon de Réception' : 'View Goods Reception Note'}
                      >
                        {language === 'fr' ? 'Détails' : 'Details'}
                      </button>

                      {pur.status !== 'annulé' &&
                        (currentUser.role === 'magasinier' ||
                          currentUser.role === 'responsable' ||
                          currentUser.role === 'administrateur' ||
                          currentUser.role === 'developpeur') && (
                          <button
                            onClick={() => handleOpenEditModal(pur)}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-2 py-1 rounded text-xs transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                            title={language === 'fr' ? 'Modifier / Mettre à jour la réception de stock' : 'Edit / Update incoming stock'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>{language === 'fr' ? 'Modifier' : 'Edit'}</span>
                          </button>
                        )}

                      {pur.status === 'brouillon' &&
                        (currentUser.role === 'magasinier' ||
                          currentUser.role === 'responsable' ||
                          currentUser.role === 'administrateur' ||
                          currentUser.role === 'developpeur') && (
                          <button
                            onClick={() => validatePurchaseReception(pur.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded text-xs transition shadow-xs cursor-pointer"
                          >
                            {language === 'fr' ? 'Valider Entrée & CMP' : 'Validate & Update CMP'}
                          </button>
                        )}

                      {pur.status === 'validé' &&
                        (currentUser.role === 'responsable' ||
                          currentUser.role === 'administrateur' ||
                          currentUser.role === 'developpeur') && (
                          <button
                            onClick={() => setCancelModalPurchase(pur)}
                            className={`p-1 rounded transition cursor-pointer ${
                              theme === 'dark'
                                ? 'text-rose-400 hover:text-rose-300 hover:bg-slate-800'
                                : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                            title={language === 'fr' ? 'Annuler réception et inverser les stocks' : 'Cancel reception and reverse stocks'}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW RECEPTION MODAL */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className={`border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`font-bold text-base flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <Truck className="w-5 h-5 text-emerald-500" />
                <span>{language === 'fr' ? 'Nouvelle Réception Marchandises & Approvisionnement' : 'New Goods Reception & Stock Inward'}</span>
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Top supplier info */}
              <div className={`grid grid-cols-1 ${(currentUser.role === 'administrateur' || currentUser.role === 'developpeur') ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-3 p-3 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {(currentUser.role === 'administrateur' || currentUser.role === 'developpeur') && (
                  <div>
                    <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {language === 'fr' ? 'Site Récepteur (Admin / Dev) :' : 'Receiving Site (Admin / Dev):'}
                    </label>
                    <select
                      value={adminSalesPointId}
                      onChange={e => setAdminSalesPointId(e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-1.5 border font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {salesPoints.map(sp => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({sp.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Fournisseur :' : 'Supplier:'}
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {suppliers
                      .filter(s => s.active)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Items Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold uppercase text-[11px] tracking-wider ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    {language === 'fr' ? 'Lignes de Réception & Contrôle Avant / Après' : 'Reception Lines & Before/After Stock Check'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-500 hover:text-emerald-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Ajouter une ligne' : 'Add product line'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((row, idx) => {
                    const prod = products.find(p => p.id === row.productId);
                    if (!prod) return null;

                    const rowSubtotal = row.quantity * row.unitPrice;
                    const stockBefore = prod.stockCurrentBaseUnit;
                    const qtyBaseAdded = row.quantity * prod.conversionFactor;
                    const stockAfter = stockBefore + qtyBaseAdded;

                    // Simulated line transport allocation
                    const lineProp = subtotal > 0 ? rowSubtotal / subtotal : 0;
                    const lineTransport = Number(transportFees || 0) * lineProp;
                    const entryVal = rowSubtotal + lineTransport;
                    const simNewCMP =
                      stockAfter > 0
                        ? Math.round(
                            ((stockBefore * prod.cmp + entryVal) / stockAfter) * 100
                          ) / 100
                        : prod.cmp;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl p-3 space-y-2 border ${
                          theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <label className={`text-[10px] block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {language === 'fr' ? 'Produit' : 'Product'}
                            </label>
                            <select
                              value={row.productId}
                              onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                              className={`w-full rounded px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              {products
                                .filter(p => p.status === 'actif')
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.code}) — {p.saleUnit} {language === 'fr' ? 'de' : 'of'} {p.conversionFactor}{' '}
                                    {p.baseUnit}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className={`text-[10px] block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {language === 'fr' ? `Qté (${prod.saleUnit}s)` : `Qty (${prod.saleUnit}s)`}
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={e =>
                                handleItemChange(idx, 'quantity', Number(e.target.value))
                              }
                              className={`w-full rounded px-2 py-1 text-xs text-right font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className={`text-[10px] block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {language === 'fr' ? 'Prix Achat Unitaire (FCFA)' : 'Unit Purchase Price (FCFA)'}
                            </label>
                            <input
                              type="number"
                              value={row.unitPrice}
                              onChange={e =>
                                handleItemChange(idx, 'unitPrice', Number(e.target.value))
                              }
                              className={`w-full rounded px-2 py-1 text-xs text-right font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-between pt-4 sm:pt-0">
                            <div className="text-right flex-1 sm:mr-2">
                              <span className={`text-[10px] block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {language === 'fr' ? 'Total ligne' : 'Line total'}
                              </span>
                              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatFCFA(rowSubtotal)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              disabled={formItems.length === 1}
                              className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1 cursor-pointer transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* CMP & Stock Impact Preview */}
                        <div className={`rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-[11px] border ${
                          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                              {language === 'fr' ? 'Stock :' : 'Stock:'}
                            </span>
                            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                              {stockBefore} {prod.baseUnit}
                            </span>
                            <ArrowRight className="w-3 h-3 text-emerald-500" />
                            <span className="font-bold text-emerald-500">
                              {stockAfter} {prod.baseUnit} (+{qtyBaseAdded} {prod.baseUnit})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                              {language === 'fr' ? 'Impact CMP :' : 'CMP Impact:'}
                            </span>
                            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                              {formatFCFA(prod.cmp)}/kg
                            </span>
                            <ArrowRight className="w-3 h-3 text-emerald-500" />
                            <span className="font-bold text-amber-500">
                              {language === 'fr' ? 'Nouveau :' : 'New:'} {formatFCFA(simNewCMP)}/kg
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr' ? 'Observations de réception / Contrôle qualité :' : 'Reception notes / Quality check:'}
                </label>
                <textarea
                  rows={2}
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  placeholder={language === 'fr' ? 'ex: Sacs en bon état, contrôle hygrométrie et pesée conformes...' : 'e.g.: Bags intact, weight and quality verified...'}
                  className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Financial Totals */}
              <div className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                    {language === 'fr' ? 'Total lignes : ' : 'Lines total: '}
                  </span>
                  <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {formatFCFA(subtotal)}
                  </span>
                </div>

                <div className="text-right">
                  <span className={`text-xs mr-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'TOTAL ENTRÉE STOCK :' : 'TOTAL STOCK INWARD:'}
                  </span>
                  <span className="text-base font-black text-emerald-500">
                    {formatFCFA(subtotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-4 border-t flex justify-between items-center ${
              theme === 'dark' ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePurchase(false)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
                  }`}
                >
                  {language === 'fr' ? 'Enregistrer Brouillon' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePurchase(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Valider Réception Immédiate' : 'Validate Immediate Reception'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL (Bon de Réception) */}
      {selectedPurchase && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPurchase(null)}
        >
          <div
            className={`border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex justify-between items-start border-b pb-3 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'fr' ? 'Bon de Réception' : 'Goods Reception Note'} N° {selectedPurchase.referenceNumber}
                </h3>
                {selectedPurchase.salesPointName && (
                  <div className="text-xs text-emerald-500 font-semibold mt-0.5">
                    {language === 'fr' ? 'Site / Dépôt :' : 'Site / Branch:'} {selectedPurchase.salesPointName}
                  </div>
                )}
                <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr' ? 'Fournisseur :' : 'Supplier:'}{' '}
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {selectedPurchase.supplierName}
                  </span>
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr' ? 'BL Fournisseur :' : 'Doc Ref:'}{' '}
                  <span className="font-mono text-emerald-500 font-semibold">{selectedPurchase.supplierDocumentRef}</span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    selectedPurchase.status === 'validé'
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  }`}
                >
                  {selectedPurchase.status === 'validé'
                    ? (language === 'fr' ? 'Validé' : 'Validated')
                    : (language === 'fr' ? 'Brouillon' : 'Draft')}
                </span>
                <div className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'fr' ? 'Reçu par' : 'Received by'} {selectedPurchase.userName}
                </div>
              </div>
            </div>

            {/* Table of items */}
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[10px] uppercase font-bold ${
                  theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                }`}>
                  <th className="py-2">{language === 'fr' ? 'Produit' : 'Product'}</th>
                  <th className="py-2 text-right">{language === 'fr' ? 'Qté Reçue' : 'Qty Received'}</th>
                  <th className="py-2 text-right">{language === 'fr' ? 'Prix Unitaire' : 'Unit Price'}</th>
                  <th className="py-2 text-right">{language === 'fr' ? 'Total Ligne' : 'Line Total'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {selectedPurchase.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.productName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.productCode}</div>
                    </td>
                    <td className={`py-2 text-right font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      {item.quantityReceived} {item.unit}
                    </td>
                    <td className={`py-2 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {formatFCFA(item.unitPrice)}
                    </td>
                    <td className={`py-2 text-right font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {formatFCFA(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={`pt-3 border-t space-y-1 text-xs ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className={`flex justify-between ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>{language === 'fr' ? 'Frais de Transport :' : 'Transport Fees:'}</span>
                <span>{formatFCFA(selectedPurchase.transportFees)}</span>
              </div>
              <div className={`flex justify-between text-sm font-bold pt-1 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <span>{language === 'fr' ? 'TOTAL RÉCEPTION :' : 'TOTAL INWARD COST:'}</span>
                <span className="text-emerald-500">{formatFCFA(selectedPurchase.totalAmount)}</span>
              </div>
              {selectedPurchase.notes && (
                <div className={`text-[11px] italic pt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'fr' ? 'Observations :' : 'Observations:'} {selectedPurchase.notes}
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-2 pt-2 border-t ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                onClick={() => window.print()}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Imprimer Bon' : 'Print Note'}</span>
              </button>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                {language === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancelModalPurchase && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setCancelModalPurchase(null)}
        >
          <div
            className={`border w-full max-w-md rounded-2xl shadow-2xl p-4 space-y-3 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-rose-800' : 'bg-white border-rose-300'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-rose-500 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>
                {language === 'fr'
                  ? `Annulation de la réception ${cancelModalPurchase.referenceNumber}`
                  : `Cancel goods reception ${cancelModalPurchase.referenceNumber}`}
              </span>
            </h3>
            <p className={`text-xs ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>
              {language === 'fr'
                ? 'Cette action générera des mouvements de retour fournisseur inverses et déduira le stock reçu. Veuillez saisir le motif obligatoire :'
                : 'This will generate reverse supplier return movements and deduct the received stock. Please provide the required justification:'}
            </p>
            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder={language === 'fr' ? 'Motif (ex: erreur de saisie du bon de livraison, livraison refusée...)' : 'Reason (e.g.: delivery error, damaged batch...)'}
                className={`w-full rounded-lg p-2 text-xs border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalPurchase(null)}
                  className={`px-3 py-1.5 rounded text-xs cursor-pointer transition ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {language === 'fr' ? 'Abandonner' : 'Dismiss'}
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded text-xs cursor-pointer"
                >
                  {language === 'fr' ? 'Confirmer Annulation' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INCOMING STOCK / RECEPTION MODAL */}
      {editModalPurchase && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
          onClick={() => setEditModalPurchase(null)}
        >
          <div
            className={`border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span>
                      {language === 'fr'
                        ? `Modifier Réception : ${editModalPurchase.referenceNumber}`
                        : `Edit Goods Inward: ${editModalPurchase.referenceNumber}`}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        editModalPurchase.status === 'validé'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {editModalPurchase.status === 'validé'
                        ? (language === 'fr' ? 'Réception Validée' : 'Validated Inward')
                        : (language === 'fr' ? 'Brouillon' : 'Draft')}
                    </span>
                  </h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'fr'
                      ? 'Mettre à jour les quantités reçues, les prix d\'achat ou les frais de transport.'
                      : 'Update received quantities, unit purchase prices or transport costs.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalPurchase(null)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {editErrorMsg && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              {editSuccessMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              {editModalPurchase.status === 'validé' && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-bold">
                      {language === 'fr' ? 'Ajustement d\'un arrivage déjà réceptionné en magasin :' : 'Modifying an already validated inward batch:'}
                    </span>
                    <span className="block mt-0.5">
                      {language === 'fr'
                        ? 'Toute modification de quantité ajustera le stock physique du magasin et mettra à jour automatiquement le Coût Moyen Pondéré (CMP).'
                        : 'Any change in quantities will automatically adjust on-hand warehouse inventory and update Weighted Average Cost (CMP).'}
                    </span>
                  </div>
                </div>
              )}

              {/* Form Metadata */}
              <div className={`grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Fournisseur :' : 'Supplier:'}
                  </label>
                  <select
                    value={editSupplierId}
                    onChange={e => setEditSupplierId(e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {suppliers
                      .filter(s => s.active || s.id === editSupplierId)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'N° BL Fournisseur :' : 'Supplier BL # / Ref:'}
                  </label>
                  <input
                    type="text"
                    value={editDocRef}
                    onChange={e => setEditDocRef(e.target.value)}
                    placeholder="ex: BL-FOURN-2026-981"
                    className={`w-full rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Date de Réception :' : 'Reception Date:'}
                  </label>
                  <input
                    type="date"
                    value={editOrderDate ? editOrderDate.slice(0, 10) : ''}
                    onChange={e => setEditOrderDate(e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'Frais Transport (FCFA) :' : 'Transport Cost (FCFA):'}
                  </label>
                  <input
                    type="number"
                    value={editTransportFees || ''}
                    onChange={e => setEditTransportFees(Number(e.target.value))}
                    placeholder="0"
                    className={`w-full rounded-lg px-2.5 py-1.5 font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Items Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold uppercase text-[11px] tracking-wider ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    {language === 'fr' ? 'Lignes de Produits Arrivés' : 'Incoming Product Lines'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRowEdit}
                    className="text-emerald-500 hover:text-emerald-600 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'fr' ? 'Ajouter une ligne' : 'Add product line'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editFormItems.map((row, idx) => {
                    const prod = products.find(p => p.id === row.productId);
                    const rowSubtotal = row.quantity * row.unitPrice;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl p-3 border ${
                          theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <label className={`text-[10px] block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {language === 'fr' ? 'Produit' : 'Product'}
                            </label>
                            <select
                              value={row.productId}
                              onChange={e => handleItemChangeEdit(idx, 'productId', e.target.value)}
                              className={`w-full rounded px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              {products
                                .filter(p => p.status === 'actif' || p.id === row.productId)
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.code}) — {p.saleUnit}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className={`text-[10px] block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {language === 'fr' ? `Qté (${prod?.saleUnit || 'u'})` : `Qty (${prod?.saleUnit || 'u'})`}
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={e =>
                                handleItemChangeEdit(idx, 'quantity', Number(e.target.value))
                              }
                              className={`w-full rounded px-2 py-1 text-xs text-right font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className={`text-[10px] block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              {language === 'fr' ? 'Prix Achat Unitaire (FCFA)' : 'Unit Purchase Price (FCFA)'}
                            </label>
                            <input
                              type="number"
                              value={row.unitPrice}
                              onChange={e =>
                                handleItemChangeEdit(idx, 'unitPrice', Number(e.target.value))
                              }
                              className={`w-full rounded px-2 py-1 text-xs text-right font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-between pt-4 sm:pt-0">
                            <div className="text-right flex-1 sm:mr-2">
                              <span className={`text-[10px] block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {language === 'fr' ? 'Total ligne' : 'Line total'}
                              </span>
                              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {formatFCFA(rowSubtotal)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRowEdit(idx)}
                              disabled={editFormItems.length === 1}
                              className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1 cursor-pointer transition"
                              title={language === 'fr' ? 'Supprimer la ligne' : 'Delete line'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr' ? 'Observations & Justificatif de modification :' : 'Notes & Modification Reason:'}
                </label>
                <textarea
                  rows={2}
                  value={editPurchaseNotes}
                  onChange={e => setEditPurchaseNotes(e.target.value)}
                  placeholder={language === 'fr' ? 'ex: Correction quantité selon pesée contradictoire...' : 'e.g.: Corrected quantity per scale check...'}
                  className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Financial Totals */}
              <div className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                    {language === 'fr' ? 'Total lignes : ' : 'Lines total: '}
                  </span>
                  <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {formatFCFA(editSubtotal)}
                  </span>
                  {editTransportFees > 0 && (
                    <span className={`ml-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      + {language === 'fr' ? 'Transport' : 'Freight'} : {formatFCFA(editTransportFees)}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className={`text-xs mr-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {language === 'fr' ? 'NOUVEAU TOTAL APPROVISIONNEMENT :' : 'NEW TOTAL COST:'}
                  </span>
                  <span className="text-base font-black text-emerald-500">
                    {formatFCFA(editTotalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className={`p-4 border-t flex justify-between items-center ${
              theme === 'dark' ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setEditModalPurchase(null)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveEdit(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'fr' ? 'Enregistrer les Modifications' : 'Save Changes'}</span>
                </button>
                {editModalPurchase.status === 'brouillon' && (
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{language === 'fr' ? 'Enregistrer & Valider Entrée' : 'Save & Validate Inward'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
