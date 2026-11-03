import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Percent,
  Tag,
  ShieldAlert,
  Building2,
  Printer,
  RefreshCw,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory, Customer, Invoice } from '../../types';
import { formatFCFA, formatNumber } from '../../utils/formatters';
import {
  getPrinterConfig,
  printReceipt,
} from '../../services/receiptPrinterService';
import { ReceiptPrintModal } from '../receipts/ReceiptPrintModal';

interface PosTerminalProps {
  onSaleCompleted?: (invoice: Invoice) => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({ onSaleCompleted }) => {
  const {
    products,
    customers,
    currentUser,
    settings,
    createSale,
    invoices,
    addCustomer,
    salesPoints,
    currentSalesPointId,
    theme,
    language,
    t,
  } = useApp();

  // Admin Sales Point Selection
  const [targetSalesPointId, setTargetSalesPointId] = useState<string>(() =>
    currentSalesPointId === 'all' ? (salesPoints[0]?.id || 'pos-1') : currentSalesPointId
  );

  useEffect(() => {
    if (currentSalesPointId && currentSalesPointId !== 'all') {
      setTargetSalesPointId(currentSalesPointId);
    }
  }, [currentSalesPointId]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cst-0'); // Default to Comptant
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustType, setNewCustType] = useState<Customer['type']>('éleveur');
  const [newCustLimit, setNewCustLimit] = useState(500000);

  // Cart
  interface CartItem {
    id: string; // `${productId}_${saleMode}`
    product: Product;
    quantity: number; // in sale unit or base unit
    unitPrice: number;
    saleMode: 'gros' | 'detail';
    unit: UnitType;
    conversionFactor: number;
    discountType?: 'pourcentage' | 'montant';
    discountValue?: number;
    discountAmount?: number;
    discountReason?: string;
    isDiscountOpen?: boolean;
  }
  const [cart, setCart] = useState<CartItem[]>([]);

  // Calculate base quantity consumed in cart for a specific product
  const getBaseQtyInCartForProduct = (productId: string, excludeItemId?: string) => {
    return cart
      .filter(item => item.product.id === productId && item.id !== excludeItemId)
      .reduce((sum, item) => sum + item.quantity * item.conversionFactor, 0);
  };

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'espèces' | 'virement' | 'paiement mobile' | 'crédit client'>('espèces');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [creditDueDate, setCreditDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );

  // Status and errors
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Printing State
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [printAlert, setPrintAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    invoice: Invoice;
  } | null>(null);
  const [isRetryingPrint, setIsRetryingPrint] = useState(false);

  const handleRetryPrint = async (inv: Invoice) => {
    setIsRetryingPrint(true);
    const cfg = getPrinterConfig();
    const res = await printReceipt(inv, settings, cfg, false);
    setIsRetryingPrint(false);
    if (res.success) {
      setPrintAlert({
        type: 'success',
        message: language === 'fr' ? 'Ticket de caisse imprimé avec succès !' : 'Receipt printed successfully!',
        invoice: inv,
      });
      setTimeout(() => setPrintAlert(null), 3500);
    } else {
      setPrintAlert({
        type: 'error',
        message: res.error || (language === 'fr' ? "Échec d'impression du ticket. Vérifiez l'imprimante thermique." : 'Print failed. Check thermal printer.'),
        invoice: inv,
      });
    }
  };

  // Selected customer object
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0] || null;

  // Filter products: only active products
  const filteredProducts = products.filter(p => {
    if (p.status !== 'actif') return false;
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Allowed discount limit according to current role
  const roleDiscountLimit =
    currentUser.role === 'caissier'
      ? settings.maxDiscountCaissier
      : currentUser.role === 'responsable'
      ? settings.maxDiscountResponsable
      : settings.maxDiscountAdmin;

  // Add product to cart with support for Wholesale (Sac) and Detail (kg)
  const handleAddToCart = (product: Product, mode: 'gros' | 'detail' = 'gros') => {
    setErrorMsg('');
    const lineId = `${product.id}_${mode}`;
    const existingIndex = cart.findIndex(item => item.id === lineId);
    const currentQtyInLine = existingIndex >= 0 ? cart[existingIndex].quantity : 0;
    const nextQty = currentQtyInLine + 1;
    const factor = mode === 'detail' ? 1 : (product.conversionFactor || 1);
    const neededBaseForThisLine = nextQty * factor;
    const baseInOtherLines = getBaseQtyInCartForProduct(product.id, lineId);

    if (baseInOtherLines + neededBaseForThisLine > product.stockCurrentBaseUnit) {
      const remainingBase = Math.max(0, product.stockCurrentBaseUnit - baseInOtherLines);
      const remainingInUnit = mode === 'detail'
        ? `${remainingBase} ${product.baseUnit}`
        : `${Math.floor(remainingBase / (product.conversionFactor || 1))} ${product.saleUnit}`;
      setErrorMsg(
        language === 'fr'
          ? `Stock insuffisant pour "${product.name}". Disponible pour ce mode : ${remainingInUnit} (Stock total restant : ${remainingBase} ${product.baseUnit}).`
          : `Insufficient stock for "${product.name}". Available: ${remainingInUnit} (Total stock left: ${remainingBase} ${product.baseUnit}).`
      );
      return;
    }

    const unitPrice = mode === 'detail'
      ? (product.detailPrice || Math.round(product.salePrice / (product.conversionFactor || 1)))
      : product.salePrice;
    const unit = mode === 'detail' ? product.baseUnit : product.saleUnit;

    if (existingIndex >= 0) {
      setCart(prev =>
        prev.map((item, idx) => (idx === existingIndex ? { ...item, quantity: nextQty } : item))
      );
    } else {
      setCart(prev => [
        ...prev,
        {
          id: lineId,
          product,
          quantity: 1,
          unitPrice,
          saleMode: mode,
          unit,
          conversionFactor: factor,
        },
      ]);
    }
  };

  const handleUpdateQty = (lineId: string, newQty: number) => {
    setErrorMsg('');
    if (newQty <= 0) {
      handleRemoveItem(lineId);
      return;
    }

    const item = cart.find(i => i.id === lineId);
    if (!item) return;

    const baseNeededForThisLine = newQty * item.conversionFactor;
    const baseInOtherLines = getBaseQtyInCartForProduct(item.product.id, lineId);

    if (baseInOtherLines + baseNeededForThisLine > item.product.stockCurrentBaseUnit) {
      const maxAvailableBase = Math.max(0, item.product.stockCurrentBaseUnit - baseInOtherLines);
      const maxUnits = item.saleMode === 'detail'
        ? maxAvailableBase
        : Math.floor(maxAvailableBase / (item.product.conversionFactor || 1));
      setErrorMsg(
        language === 'fr'
          ? `Quantité supérieure au stock disponible pour "${item.product.name}". Max disponible : ${maxUnits} ${item.unit}.`
          : `Quantity exceeds available stock for "${item.product.name}". Max available: ${maxUnits} ${item.unit}.`
      );
      return;
    }

    setCart(prev =>
      prev.map(i => {
        if (i.id !== lineId) return i;
        const lineGross = newQty * i.unitPrice;
        let lineDiscount = 0;
        if (i.discountValue && i.discountValue > 0) {
          if (i.discountType === 'pourcentage') {
            lineDiscount = Math.round((lineGross * i.discountValue) / 100);
          } else {
            // Unit deduction (e.g. 200 FCFA per unit) multiplied by new quantity
            const unitDiscount = Math.min(i.discountValue, i.unitPrice);
            lineDiscount = Math.round(unitDiscount * newQty);
          }
        }
        return { ...i, quantity: newQty, discountAmount: lineDiscount };
      })
    );
  };

  const handleRemoveItem = (lineId: string) => {
    setCart(prev => prev.filter(i => i.id !== lineId));
  };

  const handleToggleItemDiscount = (lineId: string) => {
    setCart(prev =>
      prev.map(item =>
        item.id === lineId ? { ...item, isDiscountOpen: !item.isDiscountOpen } : item
      )
    );
  };

  const handleUpdateItemDiscount = (
    lineId: string,
    type: 'pourcentage' | 'montant',
    val: number,
    reason?: string
  ) => {
    setErrorMsg('');
    setCart(prev =>
      prev.map(item => {
        if (item.id !== lineId) return item;
        const lineGross = item.quantity * item.unitPrice;
        let safeVal = isNaN(val) ? 0 : Math.max(0, val);
        let calcDiscount = 0;

        if (type === 'pourcentage') {
          if (safeVal > roleDiscountLimit) {
            setErrorMsg(
              language === 'fr'
                ? `Remise maximale autorisée pour votre profil (${currentUser.role}) : ${roleDiscountLimit}%`
                : `Maximum discount allowed for your role (${currentUser.role}): ${roleDiscountLimit}%`
            );
            safeVal = roleDiscountLimit;
          }
          calcDiscount = Math.round((lineGross * safeVal) / 100);
        } else {
          // Amount deduction PER UNIT (e.g. 200 FCFA/unit)
          // Limit unit discount to max permitted percentage of unit price
          const maxUnitDiscount = Math.round((item.unitPrice * roleDiscountLimit) / 100);
          if (safeVal > maxUnitDiscount) {
            setErrorMsg(
              language === 'fr'
                ? `Remise maximale autorisée pour votre profil (${currentUser.role}) : ${roleDiscountLimit}% (soit max ${formatFCFA(maxUnitDiscount)} / ${item.unit})`
                : `Maximum discount allowed for your role (${currentUser.role}): ${roleDiscountLimit}% (max ${formatFCFA(maxUnitDiscount)} / ${item.unit})`
            );
            safeVal = maxUnitDiscount;
          }
          safeVal = Math.min(safeVal, item.unitPrice);
          // Total discount for this cart line is unit deduction multiplied by item quantity
          calcDiscount = Math.round(safeVal * item.quantity);
        }

        return {
          ...item,
          discountType: type,
          discountValue: safeVal,
          discountAmount: calcDiscount,
          discountReason: reason !== undefined ? reason : item.discountReason,
        };
      })
    );
  };

  const handleRemoveItemDiscount = (lineId: string) => {
    setCart(prev =>
      prev.map(item =>
        item.id === lineId
          ? {
              ...item,
              discountType: 'pourcentage',
              discountValue: 0,
              discountAmount: 0,
              discountReason: '',
              isDiscountOpen: false,
            }
          : item
      )
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setErrorMsg('');
  };

  // Calculations
  const grossSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const netTotal = Math.max(0, grossSubtotal - totalDiscount);

  // Set default received amount when netTotal changes or method changes
  const effectivePaidAmount =
    paymentMethod === 'crédit client'
      ? amountReceived // can be partial downpayment
      : netTotal;

  const changeDue =
    paymentMethod === 'espèces' && amountReceived > netTotal ? amountReceived - netTotal : 0;

  const remainingBalance = Math.max(0, netTotal - effectivePaidAmount);

  // Keep amountReceived updated when netTotal changes for cash payments
  useEffect(() => {
    if (paymentMethod !== 'crédit client') {
      setAmountReceived(netTotal);
    }
  }, [netTotal, paymentMethod]);

  // Handle Quick Client Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    addCustomer({
      code: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newCustName,
      phone: newCustPhone || 'Non renseigné',
      type: newCustType,
      creditLimit: Number(newCustLimit),
      active: true,
      notes: 'Créé depuis la caisse rapide',
    });

    setNewCustName('');
    setNewCustPhone('');
    setShowNewCustomerForm(false);
  };

  // Submit Sale
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    if (cart.length === 0) {
      setErrorMsg('Veuillez ajouter au moins un produit au panier.');
      setIsSubmitting(false);
      return;
    }

    if (!selectedCustomer) {
      setErrorMsg(language === 'fr' ? 'Veuillez enregistrer ou sélectionner un client avant d\'effectuer une vente.' : 'Please register or select a customer before completing a sale.');
      setIsSubmitting(false);
      return;
    }

    // Role discount verification per item
    for (const item of cart) {
      const itemGross = item.quantity * item.unitPrice;
      const itemDisc = item.discountAmount || 0;
      const itemPercent = itemGross > 0 ? (itemDisc / itemGross) * 100 : 0;
      if (itemPercent > roleDiscountLimit + 0.01) {
        setErrorMsg(
          `Remise refusée pour "${item.product.name}" : votre rôle (${currentUser.role}) ne peut pas accorder plus de ${roleDiscountLimit}%. Remise demandée : ${itemPercent.toFixed(1)}%.`
        );
        setIsSubmitting(false);
        return;
      }
    }

    // Credit rules
    if (paymentMethod === 'crédit client' || remainingBalance > 0) {
      if (selectedCustomerId === 'cst-0') {
        setErrorMsg('Une vente à crédit doit être nominative. Sélectionnez un client régulier.');
        setIsSubmitting(false);
        return;
      }
    }

    const saleItems = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount || 0,
      saleMode: item.saleMode,
      unit: item.unit,
      conversionFactor: item.conversionFactor,
    }));

    const result = createSale(
      selectedCustomerId,
      saleItems,
      totalDiscount > 0
        ? {
            type: 'montant',
            value: totalDiscount,
            reason: 'Remises par article appliquées en caisse',
          }
        : undefined,
      {
        amount: paymentMethod === 'crédit client' ? amountReceived : netTotal,
        method: paymentMethod === 'crédit client' ? 'espèces' : paymentMethod,
        reference: paymentReference,
      },
      saleNotes,
      paymentMethod === 'crédit client',
      paymentMethod === 'crédit client' ? creditDueDate : undefined,
      (currentUser.role === 'administrateur' || currentUser.role === 'developpeur') ? targetSalesPointId : undefined
    );

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Erreur lors de la validation de la vente.');
    } else {
      // Find created invoice
      const createdInv = result.invoice || invoices.find(i => i.id === result.invoiceId) || invoices[0];
      handleClearCart();
      setAmountReceived(0);
      setPaymentReference('');
      setSaleNotes('');

      if (createdInv) {
        setLastInvoice(createdInv);

        if (onSaleCompleted) {
          onSaleCompleted(createdInv);
        }

        const printerConfig = getPrinterConfig();
        if (printerConfig.autoPrintOnSale) {
          printReceipt(createdInv, settings, printerConfig, false).then(printRes => {
            if (!printRes.success) {
              setPrintAlert({
                type: 'error',
                message: language === 'fr'
                  ? `Vente ${createdInv.number} validée avec succès, mais l'impression automatique du ticket a échoué (${printRes.error || "imprimante non détectée"}).`
                  : `Sale ${createdInv.number} saved successfully, but auto-printing failed (${printRes.error || "printer offline"}).`,
                invoice: createdInv,
              });
            } else {
              setPrintAlert({
                type: 'success',
                message: language === 'fr'
                  ? `Vente ${createdInv.number} enregistrée et ticket thermique imprimé !`
                  : `Sale ${createdInv.number} saved and thermal receipt printed!`,
                invoice: createdInv,
              });
              setTimeout(() => setPrintAlert(null), 4000);
            }
          });
        } else {
          // Open receipt preview modal directly
          setShowReceiptModal(true);
        }
      }
    }
  };

  const categories: ProductCategory[] = [
    'Matières premières',
    'Concentrés, prémix et compléments',
    'Aliments finis',
  ];

  return (
    <div className={`h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden relative ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-transparent text-slate-850'
    }`}>
      {/* Thermal Receipt Print Alert Banner (Floating / Non-blocking) */}
      {printAlert && (
        <div className={`absolute top-2 left-4 right-4 z-40 p-3 rounded-xl border shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
          printAlert.type === 'error'
            ? 'bg-rose-950/95 border-rose-500/50 text-rose-100'
            : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100'
        }`}>
          <div className="flex items-center gap-2 text-xs">
            {printAlert.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-semibold">{printAlert.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {printAlert.type === 'error' && (
              <button
                type="button"
                disabled={isRetryingPrint}
                onClick={() => handleRetryPrint(printAlert.invoice)}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRetryingPrint ? 'animate-spin' : ''}`} />
                <span>{language === 'fr' ? 'Réessayer l\'impression' : 'Retry Print'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setLastInvoice(printAlert.invoice);
                setShowReceiptModal(true);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-700"
            >
              <Printer className="w-3 h-3 text-emerald-400" />
              <span>{language === 'fr' ? 'Aperçu Ticket' : 'Receipt View'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintAlert(null)}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* LEFT COLUMN: Catalog Picker (Responsive) */}
      <div className={`flex-1 flex flex-col overflow-hidden border-r ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {/* Search & Category Filter Header */}
        <div className={`p-3 border-b space-y-2.5 shrink-0 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-2.5 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-400'
              }`} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('pos.search_placeholder')}
                className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Quick clean button */}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`text-xs px-2 py-1 rounded cursor-pointer transition ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                {language === 'fr' ? 'Effacer' : 'Clear'}
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : theme === 'dark'
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'fr' ? 'Tous' : 'All'} ({products.filter(p => p.status === 'actif').length})
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.status === 'actif' && p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : theme === 'dark'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 content-start">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-500">
              {language === 'fr'
                ? 'Aucun produit actif ne correspond à cette recherche.'
                : 'No active products match this search.'}
            </div>
          ) : (
            filteredProducts.map(product => {
              const isOutOfStock = product.stockCurrentBaseUnit <= 0;
              const isLowStock =
                product.stockCurrentBaseUnit > 0 &&
                product.stockCurrentBaseUnit <= product.minAlertThresholdBaseUnit;

              // Total sacks available
              const unitsAvailable = Math.floor(
                product.stockCurrentBaseUnit / (product.conversionFactor || 1)
              );
              const allowDetail = Boolean(product.allowDetailSale && (product.conversionFactor || 1) > 1);
              const detailPrice = product.detailPrice || Math.round(product.salePrice / (product.conversionFactor || 1));

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && handleAddToCart(product, 'gros')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all select-none ${
                    isOutOfStock
                      ? theme === 'dark'
                        ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                        : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-slate-900 border-slate-800 hover:border-emerald-600 hover:bg-slate-850 cursor-pointer shadow-xs active:scale-[0.99]'
                      : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-slate-50 cursor-pointer shadow-xs active:scale-[0.99]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className={`font-bold text-xs leading-tight line-clamp-1 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        {product.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {product.code}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mb-2 line-clamp-1">
                      {product.packaging} ({product.conversionFactor} {product.baseUnit}/
                      {product.saleUnit})
                    </div>
                  </div>

                  <div>
                    <div className={`pt-2 border-t flex items-end justify-between ${
                      theme === 'dark' ? 'border-slate-800/80' : 'border-slate-100'
                    }`}>
                      <div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'fr' ? 'Stock dispo :' : 'Available:'}{' '}
                          <span
                            className={`font-semibold ${
                              isOutOfStock
                                ? 'text-rose-500'
                                : isLowStock
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                            }`}
                          >
                            {isOutOfStock
                              ? (language === 'fr' ? 'RUPTURE' : 'OUT OF STOCK')
                              : `${unitsAvailable} ${product.saleUnit}s (${formatNumber(
                                  product.stockCurrentBaseUnit
                                )} ${product.baseUnit})`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'fr' ? 'CMP réf :' : 'Ref MAC:'} {formatFCFA(product.cmp)}/{product.baseUnit}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-emerald-500 text-sm">
                          {formatFCFA(product.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">/{product.saleUnit}</div>
                        {allowDetail && (
                          <div className="text-[10px] text-amber-500 font-semibold mt-0.5">
                            {language === 'fr' ? 'Détail :' : 'Retail:'} {formatFCFA(detailPrice)}/{product.baseUnit}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Action Buttons */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          !isOutOfStock && handleAddToCart(product, 'gros');
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                        title={`Ajouter 1 ${product.saleUnit}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ {product.saleUnit}</span>
                      </button>

                      {allowDetail && (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            !isOutOfStock && handleAddToCart(product, 'detail');
                          }}
                          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer ${
                            isOutOfStock
                              ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                          }`}
                          title={`Ajouter 1 ${product.baseUnit} au détail`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Détail ({product.baseUnit})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout Terminal */}
      <div className={`w-full lg:w-[450px] xl:w-[480px] flex flex-col justify-between overflow-hidden shadow-xl shrink-0 border-l ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-850'
      }`}>
        {/* Cart Top: Customer selector & Sales Point */}
        <div className={`p-3 border-b space-y-2 shrink-0 ${
          theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Admin / Dev Sales Point Selector */}
          {(currentUser.role === 'administrateur' || currentUser.role === 'developpeur') && (
            <div className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs ${
              theme === 'dark'
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                  {language === 'fr' ? 'Site Vente (Admin / Dev) :' : 'Sales Point (Admin / Dev):'}
                </span>
              </div>
              <select
                value={targetSalesPointId}
                onChange={e => setTargetSalesPointId(e.target.value)}
                className={`rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 border cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-850'
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

          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <User className="w-3.5 h-3.5 text-emerald-500" />
              {language === 'fr' ? 'Client Facturé' : 'Customer'}
            </span>

            <button
              onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
              className="text-[11px] text-emerald-500 hover:text-emerald-600 font-medium cursor-pointer"
            >
              {showNewCustomerForm ? (language === 'fr' ? 'Annuler' : 'Cancel') : `+ ${language === 'fr' ? 'Nouveau Client' : 'New Customer'}`}
            </button>
          </div>

          {/* Quick Create Customer Drawer */}
          {showNewCustomerForm ? (
            <form
              onSubmit={handleCreateCustomer}
              className={`p-2.5 rounded-lg border space-y-2 text-xs ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
              }`}
            >
              <div>
                <input
                  type="text"
                  placeholder={language === 'fr' ? "Nom de l'éleveur / ferme / coopérative *" : "Breeder / farm / cooperative name *"}
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className={`w-full rounded px-2.5 py-1 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                  }`}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={language === 'fr' ? "Téléphone (+237...)" : "Phone (+237...)"}
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className={`border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                  }`}
                />
                <select
                  value={newCustType}
                  onChange={e => setNewCustType(e.target.value as any)}
                  className={`border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-850'
                  }`}
                >
                  <option value="éleveur">{language === 'fr' ? 'Éleveur' : 'Farmer'}</option>
                  <option value="revendeur">{language === 'fr' ? 'Revendeur' : 'Reseller'}</option>
                  <option value="coopérative">{language === 'fr' ? 'Coopérative' : 'Cooperative'}</option>
                  <option value="particulier">{language === 'fr' ? 'Particulier' : 'Individual'}</option>
                </select>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {language === 'fr' ? 'Plafond Crédit :' : 'Credit Limit:'}
                </span>
                <input
                  type="number"
                  value={newCustLimit}
                  onChange={e => setNewCustLimit(Number(e.target.value))}
                  className={`w-28 border rounded px-2 py-0.5 text-right font-semibold ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-850'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1 rounded cursor-pointer transition shadow-xs"
              >
                {language === 'fr' ? 'Enregistrer Client' : 'Save Customer'}
              </button>
            </form>
          ) : customers.length === 0 ? (
            <div className="text-xs text-amber-500 italic py-1.5 px-2 border border-dashed border-amber-500/30 rounded-lg">
              {language === 'fr' ? 'Aucun client enregistré (utilisez le bouton + pour en ajouter)' : 'No customer registered (use the + button to add)'}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-850'
                }`}
              >
                {customers.map(cst => (
                  <option key={cst.id} value={cst.id}>
                    {cst.name} {cst.currentDebt > 0 ? `(${language === 'fr' ? 'Dette :' : 'Debt:'} ${formatFCFA(cst.currentDebt)})` : ''}
                  </option>
                ))}
              </select>

              {selectedCustomer && selectedCustomer.id !== 'cst-0' && selectedCustomer.currentDebt > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] px-2 py-1 rounded font-semibold whitespace-nowrap">
                  {language === 'fr' ? 'Dette :' : 'Debt:'} {formatFCFA(selectedCustomer.currentDebt)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
              <ShoppingCart className="w-12 h-12 text-slate-400 mb-2 opacity-50" />
              <div className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {language === 'fr' ? 'Le panier de caisse est vide.' : 'The shopping cart is empty.'}
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                {language === 'fr'
                  ? "Cliquez sur un produit à gauche pour l'ajouter à la vente. Le stock sera vérifié en temps réel."
                  : "Click any product on the left to add it. Stock is verified in real-time."}
              </p>
            </div>
          ) : (
            cart.map(item => {
              const lineGross = item.quantity * item.unitPrice;
              const itemDiscount = item.discountAmount || 0;
              const itemNet = Math.max(0, lineGross - itemDiscount);
              const baseInOtherLines = getBaseQtyInCartForProduct(item.product.id, item.id);
              const remainingBaseForThisItem = Math.max(0, item.product.stockCurrentBaseUnit - baseInOtherLines);
              const maxUnitsAvailable = item.saleMode === 'detail'
                ? remainingBaseForThisItem
                : Math.floor(remainingBaseForThisItem / (item.conversionFactor || 1));

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-2.5 text-xs transition-colors ${
                    theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {item.product.name}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          item.saleMode === 'detail'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        }`}>
                          {item.saleMode === 'detail' ? (language === 'fr' ? 'Détail' : 'Retail') : (language === 'fr' ? 'Gros' : 'Bulk')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-500">{formatFCFA(item.unitPrice)}</span>
                        <span className="text-[10px]">/{item.unit}</span>
                        <span>·</span>
                        <span className="text-[10px]">
                          {language === 'fr' ? 'Dispo :' : 'Avail:'} {maxUnitsAvailable} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className={`flex items-center gap-1 border rounded-lg p-1 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                    }`}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        className={`p-1 rounded cursor-pointer transition ${
                          theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step={item.saleMode === 'detail' ? 'any' : '1'}
                        value={item.quantity}
                        onChange={e => handleUpdateQty(item.id, parseFloat(e.target.value) || 0)}
                        className={`w-12 text-center font-bold text-xs focus:outline-none ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        className={`p-1 rounded cursor-pointer transition ${
                          theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="text-right min-w-[75px]">
                      {itemDiscount > 0 ? (
                        <>
                          <div className="text-[10px] text-slate-400 line-through font-mono">
                            {formatFCFA(lineGross)}
                          </div>
                          <div className="font-bold text-xs font-mono text-emerald-500">
                            {formatFCFA(itemNet)}
                          </div>
                          <div className="text-[10px] text-amber-500 font-semibold font-mono">
                            -{formatFCFA(itemDiscount)}
                          </div>
                        </>
                      ) : (
                        <div className={`font-bold text-xs font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {formatFCFA(lineGross)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-500 transition p-0.5 cursor-pointer mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 ml-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Per-Product Discount Section */}
                  {!item.isDiscountOpen ? (
                    itemDiscount > 0 ? (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                          <Tag className="w-3 h-3 shrink-0" />
                          <span>
                            {language === 'fr' ? 'Remise :' : 'Discount:'}{' '}
                            {item.discountType === 'pourcentage' ? (
                              `-${item.discountValue}% (Total: -${formatFCFA(itemDiscount)})`
                            ) : item.quantity > 1 ? (
                              `-${formatFCFA(item.discountValue || 0)} / ${item.unit} (Total: -${formatFCFA(itemDiscount)})`
                            ) : (
                              `-${formatFCFA(itemDiscount)}`
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleItemDiscount(item.id)}
                            className="text-[10px] text-blue-500 hover:underline font-semibold cursor-pointer"
                          >
                            {language === 'fr' ? 'Modifier' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemDiscount(item.id)}
                            className="text-[10px] text-rose-500 hover:underline font-semibold cursor-pointer"
                          >
                            {language === 'fr' ? 'Retirer' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 pt-1 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleItemDiscount(item.id)}
                          className="text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{language === 'fr' ? '+ Remise sur cet article' : '+ Discount on this item'}</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className={`mt-2 pt-2 border-t space-y-2 text-xs ${
                      theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-500">
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{language === 'fr' ? 'Remise par produit' : 'Product discount'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({language === 'fr' ? 'Max autorisé :' : 'Max allowed:'} {roleDiscountLimit}%)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.discountType || 'pourcentage'}
                          onChange={e => handleUpdateItemDiscount(item.id, e.target.value as any, item.discountValue || 0, item.discountReason)}
                          style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                          className={`rounded-lg px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="pourcentage">%</option>
                          <option value="montant">FCFA / {item.unit}</option>
                        </select>

                        <input
                          type="number"
                          min="0"
                          max={item.discountType === 'montant' ? item.unitPrice : roleDiscountLimit}
                          step={item.discountType === 'montant' ? '50' : '1'}
                          value={item.discountValue || ''}
                          onChange={e => handleUpdateItemDiscount(item.id, item.discountType || 'pourcentage', parseFloat(e.target.value) || 0, item.discountReason)}
                          placeholder={item.discountType === 'pourcentage' ? `0 à ${roleDiscountLimit}%` : `FCFA / ${item.unit}`}
                          className={`w-28 rounded-lg px-2 py-1 text-xs border font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />

                        <input
                          type="text"
                          value={item.discountReason || ''}
                          onChange={e => handleUpdateItemDiscount(item.id, item.discountType || 'pourcentage', item.discountValue || 0, e.target.value)}
                          placeholder={language === 'fr' ? 'Motif (optionnel)...' : 'Reason (optional)...'}
                          className={`flex-1 rounded-lg px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => handleToggleItemDiscount(item.id)}
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                        >
                          OK
                        </button>
                      </div>

                      {/* Dynamic calculation preview */}
                      {item.discountValue && item.discountValue > 0 && (
                        <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                          <span>
                            {item.discountType === 'montant' ? (
                              language === 'fr' ? (
                                <>Déduction : <strong>-{formatFCFA(item.discountValue)}</strong> / {item.unit} {item.quantity > 1 ? `× ${item.quantity} = -${formatFCFA(itemDiscount)}` : ''}</>
                              ) : (
                                <>Deduction: <strong>-{formatFCFA(item.discountValue)}</strong> / {item.unit} {item.quantity > 1 ? `× ${item.quantity} = -${formatFCFA(itemDiscount)}` : ''}</>
                              )
                            ) : (
                              language === 'fr' ? (
                                <>Déduction : <strong>{item.discountValue}%</strong> = <strong>-{formatFCFA(itemDiscount)}</strong></>
                              ) : (
                                <>Deduction: <strong>{item.discountValue}%</strong> = <strong>-{formatFCFA(itemDiscount)}</strong></>
                              )
                            )}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {language === 'fr' ? 'Nouveau prix :' : 'New price:'}{' '}
                            <strong>{formatFCFA(item.unitPrice - (item.discountType === 'montant' ? item.discountValue : Math.round((item.unitPrice * item.discountValue) / 100)))}</strong> / {item.unit}
                          </span>
                        </div>
                      )}

                      {roleDiscountLimit === 0 && currentUser.role === 'caissier' && (
                        <div className="text-[10px] text-amber-500 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          <span>{language === 'fr' ? 'Profil Caissier : remise interdite (0%) sans accord superviseur.' : 'Cashier role: 0% discount without supervisor.'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="mx-3 my-1 p-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Checkout Bottom Settings & Totals */}
        <div className={`border-t p-3 space-y-2.5 shrink-0 ${
          theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <div className={`text-[11px] font-semibold uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {language === 'fr' ? 'Mode de Règlement' : 'Payment Method'}
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(
                [
                  { id: 'espèces', label: language === 'fr' ? 'Espèces' : 'Cash', icon: Banknote },
                  { id: 'paiement mobile', label: language === 'fr' ? 'Mobile' : 'Mobile Pay', icon: Smartphone },
                  { id: 'virement', label: language === 'fr' ? 'Virement' : 'Transfer', icon: CreditCard },
                  { id: 'crédit client', label: language === 'fr' ? 'À Crédit' : 'Credit', icon: Calendar },
                ] as const
              ).map(mode => {
                const Icon = mode.icon;
                const isSelected = paymentMethod === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(mode.id);
                      if (mode.id === 'crédit client') {
                        setAmountReceived(0);
                      } else {
                        setAmountReceived(netTotal);
                      }
                    }}
                    className={`py-2 px-1 rounded-lg border font-medium flex flex-col items-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                        : theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] leading-tight">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Specific Details */}
          {paymentMethod === 'espèces' && (
            <div className={`flex items-center justify-between text-xs p-2 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                {language === 'fr' ? 'Montant reçu :' : 'Amount received:'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amountReceived || ''}
                  onChange={e => setAmountReceived(Number(e.target.value))}
                  placeholder={netTotal.toString()}
                  className={`w-28 rounded px-2 py-1 text-right font-semibold text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                  }`}
                />
                {changeDue > 0 && (
                  <span className="text-[11px] text-emerald-500 font-bold">
                    {language === 'fr' ? 'Rendre :' : 'Change:'} {formatFCFA(changeDue)}
                  </span>
                )}
              </div>
            </div>
          )}

          {paymentMethod === 'paiement mobile' && (
            <div className="text-xs space-y-1">
              <input
                type="text"
                placeholder={language === 'fr' ? "Réf Transaction MoMo / Orange Money (ex: TXN-88391)" : "Mobile Money Txn Ref (e.g.: TXN-88391)"}
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                className={`w-full rounded px-2.5 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-850 placeholder-slate-400'
                }`}
              />
            </div>
          )}

          {paymentMethod === 'virement' && (
            <div className="text-xs space-y-1">
              <input
                type="text"
                placeholder={language === 'fr' ? "Numéro de virement / bordereau bancaire" : "Bank transfer ref / slip number"}
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                className={`w-full rounded px-2.5 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-850 placeholder-slate-400'
                }`}
              />
            </div>
          )}

          {paymentMethod === 'crédit client' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-500 font-medium">
                  {language === 'fr' ? "Acompte versé aujourd'hui :" : "Initial downpayment:"}
                </span>
                <input
                  type="number"
                  value={amountReceived || 0}
                  onChange={e => setAmountReceived(Number(e.target.value))}
                  className={`w-28 rounded px-2 py-0.5 text-right font-semibold border ${
                    theme === 'dark' ? 'bg-slate-900 border-amber-700 text-white' : 'bg-white border-amber-300 text-slate-850'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-500 font-medium">
                  {language === 'fr' ? "Date d'échéance :" : "Due date:"}
                </span>
                <input
                  type="date"
                  value={creditDueDate}
                  onChange={e => setCreditDueDate(e.target.value)}
                  className={`rounded px-2 py-0.5 border ${
                    theme === 'dark' ? 'bg-slate-900 border-amber-700 text-white' : 'bg-white border-amber-300 text-slate-850'
                  }`}
                />
              </div>
              <div className="text-[10px] text-amber-500 font-medium">
                {language === 'fr' ? 'Solde différé :' : 'Deferred balance:'}{' '}
                <span className="font-bold">{formatFCFA(Math.max(0, netTotal - amountReceived))}</span>{' '}
                {language === 'fr' ? 'ajouté aux créances du client.' : 'added to customer account debt.'}
              </div>
            </div>
          )}

          {/* Financial Summary & Pay Action Button */}
          <div className={`pt-2 border-t space-y-1.5 ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className={`flex justify-between text-xs ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <span>{language === 'fr' ? 'Sous-total brut :' : 'Gross subtotal:'}</span>
              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-850'}`}>{formatFCFA(grossSubtotal)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-xs text-amber-500 font-semibold">
                <span>{language === 'fr' ? 'Total remises par article :' : 'Total item discounts:'}</span>
                <span>-{formatFCFA(totalDiscount)}</span>
              </div>
            )}

            <div className={`flex justify-between text-base font-black pt-1 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <span>{language === 'fr' ? 'NET À PAYER :' : 'NET DUE:'}</span>
              <span className="text-emerald-500">{formatFCFA(netTotal)}</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition disabled:opacity-40 ${
                  theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {language === 'fr' ? 'Annuler' : 'Clear'}
              </button>

              <button
                type="button"
                onClick={handleSubmitSale}
                disabled={cart.length === 0 || isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'fr' ? 'Valider la Vente' : 'Validate Sale'} ({formatFCFA(netTotal)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Thermal Receipt Printing & Preview Modal */}
      {showReceiptModal && lastInvoice && (
        <ReceiptPrintModal
          invoice={lastInvoice}
          onClose={() => setShowReceiptModal(false)}
          isReprint={false}
        />
      )}
    </div>
  );
};
