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
    product: Product;
    quantity: number; // in saleUnit (e.g. sacs)
    unitPrice: number;
  }
  const [cart, setCart] = useState<CartItem[]>([]);

  // Discount
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'pourcentage' | 'montant'>('pourcentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');

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

  // Add product to cart with strict stock availability checking
  const handleAddToCart = (product: Product) => {
    setErrorMsg('');
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    const currentQtyInCart = existingIndex >= 0 ? cart[existingIndex].quantity : 0;
    const nextQty = currentQtyInCart + 1;

    // Check availability in base stock
    const nextQtyBase = nextQty * product.conversionFactor;
    if (nextQtyBase > product.stockCurrentBaseUnit) {
      setErrorMsg(
        `Impossible d'ajouter plus d'unités pour "${product.name}". Stock total disponible: ${
          product.stockCurrentBaseUnit
        } ${product.baseUnit} (~${(
          product.stockCurrentBaseUnit / product.conversionFactor
        ).toFixed(1)} ${product.saleUnit}).`
      );
      return;
    }

    if (existingIndex >= 0) {
      setCart(prev =>
        prev.map((item, idx) => (idx === existingIndex ? { ...item, quantity: nextQty } : item))
      );
    } else {
      setCart(prev => [...prev, { product, quantity: 1, unitPrice: product.salePrice }]);
    }
  };

  const handleUpdateQty = (productId: string, newQty: number) => {
    setErrorMsg('');
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const requestedBaseQty = newQty * item.product.conversionFactor;
    if (requestedBaseQty > item.product.stockCurrentBaseUnit) {
      setErrorMsg(
        `Quantité supérieure au stock disponible pour "${item.product.name}". Stock max: ${
          item.product.stockCurrentBaseUnit
        } ${item.product.baseUnit} (~${(
          item.product.stockCurrentBaseUnit / item.product.conversionFactor
        ).toFixed(1)} ${item.product.saleUnit}).`
      );
      return;
    }

    setCart(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setErrorMsg('');
    setDiscountValue(0);
    setDiscountReason('');
  };

  // Calculations
  const grossSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  let discountAmount = 0;
  if (applyDiscount && discountValue > 0) {
    if (discountType === 'pourcentage') {
      discountAmount = Math.round((grossSubtotal * discountValue) / 100);
    } else {
      discountAmount = Math.min(discountValue, grossSubtotal);
    }
  }

  const netTotal = Math.max(0, grossSubtotal - discountAmount);

  // Set default received amount when netTotal changes or method changes
  const effectivePaidAmount =
    paymentMethod === 'crédit client'
      ? amountReceived // can be partial downpayment
      : netTotal;

  const changeDue =
    paymentMethod === 'espèces' && amountReceived > netTotal ? amountReceived - netTotal : 0;

  const remainingBalance = Math.max(0, netTotal - effectivePaidAmount);

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

    // Role discount verification
    if (applyDiscount && discountValue > 0) {
      const discountPercent =
        discountType === 'pourcentage' ? discountValue : (discountAmount / grossSubtotal) * 100;
      if (discountPercent > roleDiscountLimit) {
        setErrorMsg(
          `Remise refusée : votre rôle (${currentUser.role}) ne peut pas accorder plus de ${roleDiscountLimit}%. Remise actuelle : ${discountPercent.toFixed(1)}%.`
        );
        setIsSubmitting(false);
        return;
      }
      if (!discountReason.trim()) {
        setErrorMsg('Veuillez renseigner le motif de la remise (obligatoire pour l\'audit).');
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
    }));

    const result = createSale(
      selectedCustomerId,
      saleItems,
      applyDiscount && discountValue > 0
        ? {
            type: discountType,
            value: discountValue,
            reason: discountReason,
          }
        : undefined,
      {
        amount: paymentMethod === 'crédit client' ? amountReceived : netTotal,
        method: paymentMethod,
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

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && handleAddToCart(product)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all select-none ${
                    isOutOfStock
                      ? theme === 'dark'
                        ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                        : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-slate-900 border-slate-800 hover:border-emerald-600 hover:bg-slate-850 cursor-pointer shadow-xs active:scale-[0.98]'
                      : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-slate-50 cursor-pointer shadow-xs active:scale-[0.98]'
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
                      <span className="text-[10px] text-slate-400">/{product.saleUnit}</span>
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
              const lineTotal = item.quantity * item.unitPrice;
              const maxUnits = Math.floor(
                item.product.stockCurrentBaseUnit / item.product.conversionFactor
              );

              return (
                <div
                  key={item.product.id}
                  className={`border rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs ${
                    theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {item.product.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>{formatFCFA(item.unitPrice)}</span>
                      <span>·</span>
                      <span>
                        {language === 'fr' ? 'Stock dispo :' : 'Available:'} {maxUnits} {item.product.saleUnit}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className={`flex items-center gap-1.5 border rounded-lg p-1 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                  }`}>
                    <button
                      onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                      className={`p-1 rounded cursor-pointer transition ${
                        theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={maxUnits}
                      value={item.quantity}
                      onChange={e => handleUpdateQty(item.product.id, Number(e.target.value))}
                      className={`w-10 text-center font-bold text-xs focus:outline-none ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                    <button
                      onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                      className={`p-1 rounded cursor-pointer transition ${
                        theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="text-right min-w-[75px]">
                    <div className={`font-bold text-xs ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {formatFCFA(lineTotal)}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.product.id)}
                      className="text-slate-400 hover:text-rose-500 transition p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
          {/* Discount Section (Remises Contrôlées) */}
          <div className={`border rounded-lg p-2 ${
            theme === 'dark' ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setApplyDiscount(!applyDiscount)}
                className={`flex items-center gap-1.5 font-medium cursor-pointer transition ${
                  theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'fr' ? 'Appliquer une remise' : 'Apply discount'}</span>
                <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  ({language === 'fr' ? 'Max autorisé :' : 'Max allowed:'} {roleDiscountLimit}%)
                </span>
              </button>

              {applyDiscount && (
                <span className="text-[11px] text-amber-500 font-semibold">
                  -{formatFCFA(discountAmount)}
                </span>
              )}
            </div>

            {applyDiscount && (
              <div className={`mt-2 space-y-2 pt-2 border-t text-xs ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className={`border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                    }`}
                  >
                    <option value="pourcentage">{language === 'fr' ? 'Pourcentage (%)' : 'Percentage (%)'}</option>
                    <option value="montant">{language === 'fr' ? 'Montant (FCFA)' : 'Fixed Amount (FCFA)'}</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    max={discountType === 'pourcentage' ? roleDiscountLimit : grossSubtotal}
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    placeholder={discountType === 'pourcentage' ? `0 à ${roleDiscountLimit}%` : 'FCFA'}
                    className={`flex-1 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                    }`}
                  />
                </div>

                <input
                  type="text"
                  value={discountReason}
                  onChange={e => setDiscountReason(e.target.value)}
                  placeholder={language === 'fr' ? "Motif de la remise (obligatoire pour audit)..." : "Discount justification (mandatory for audit)..."}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                  }`}
                />

                {currentUser.role === 'caissier' && (
                  <div className="text-[10px] text-amber-500 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>{language === 'fr' ? 'Profil Caissier : accord superviseur requis.' : 'Cashier role: supervisor approval required.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

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

            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-amber-500">
                <span>{language === 'fr' ? 'Remise déduite :' : 'Discount deducted:'}</span>
                <span>-{formatFCFA(discountAmount)}</span>
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
