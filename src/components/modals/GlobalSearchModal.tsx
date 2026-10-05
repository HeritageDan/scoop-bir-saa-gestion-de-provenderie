import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Package,
  Receipt,
  Users,
  Building2,
  Boxes,
  History,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatFCFA, formatDate } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (type: string, id: string, extra?: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectEntity,
}) => {
  const {
    products,
    invoices,
    customers,
    suppliers,
    stockMovements,
    auditLogs,
    currentUser,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectEntity('search', '');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelectEntity]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search across modules with role permissions respected
  const matchedProducts = q
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : [];

  const matchedInvoices =
    q && currentUser.role !== 'magasinier'
      ? invoices.filter(
          i =>
            i.number.toLowerCase().includes(q) ||
            i.customerName.toLowerCase().includes(q) ||
            i.userName.toLowerCase().includes(q)
        )
      : [];

  const matchedCustomers =
    q && currentUser.role !== 'magasinier'
      ? customers.filter(
          c =>
            c.name.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q)
        )
      : [];

  const matchedSuppliers =
    q && currentUser.role !== 'caissier'
      ? suppliers.filter(
          s =>
            s.name.toLowerCase().includes(q) ||
            s.phone.toLowerCase().includes(q) ||
            s.contactPerson.toLowerCase().includes(q)
        )
      : [];

  const matchedMovements = q
    ? stockMovements.filter(
        m =>
          m.productName.toLowerCase().includes(q) ||
          m.productCode.toLowerCase().includes(q) ||
          m.referenceDocument.toLowerCase().includes(q) ||
          m.justification.toLowerCase().includes(q)
      )
    : [];

  const matchedAudits =
    q && (currentUser.role === 'administrateur' || currentUser.role === 'responsable')
      ? auditLogs.filter(
          a =>
            a.targetObject.toLowerCase().includes(q) ||
            a.action.toLowerCase().includes(q) ||
            a.userName.toLowerCase().includes(q)
        )
      : [];

  const totalResults =
    matchedProducts.length +
    matchedInvoices.length +
    matchedCustomers.length +
    matchedSuppliers.length +
    matchedMovements.length +
    matchedAudits.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher par nom de produit, code, n° facture, client, fournisseur..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              Saisissez au moins un caractère pour explorer l'ensemble de la provenderie.
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Aucun résultat correspondant à « <span className="text-white font-medium">{query}</span> »
            </div>
          ) : (
            <>
              {/* Products */}
              {matchedProducts.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    Produits ({matchedProducts.length})
                  </div>
                  <div className="space-y-1">
                    {matchedProducts.slice(0, 5).map(prod => (
                      <div
                        key={prod.id}
                        onClick={() => {
                          onSelectEntity('product', prod.id, prod);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-600 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{prod.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              [{prod.code}]
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{prod.category}</span>
                            <span>·</span>
                            <span>Stock: {prod.stockCurrentBaseUnit} {prod.baseUnit}</span>
                            <span>·</span>
                            <span>CMP: {formatFCFA(prod.cmp)}/{prod.baseUnit}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-400">
                            {formatFCFA(prod.salePrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            /{prod.saleUnit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {matchedInvoices.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-amber-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    Factures ({matchedInvoices.length})
                  </div>
                  <div className="space-y-1">
                    {matchedInvoices.slice(0, 5).map(inv => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          onSelectEntity('invoice', inv.id, inv);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-600 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{inv.number}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                inv.status === 'payée'
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : inv.status === 'partielle'
                                  ? 'bg-amber-950 text-amber-300'
                                  : 'bg-rose-950 text-rose-300'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Client : {inv.customerName} · {formatDate(inv.date)} à {inv.time}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white">{formatFCFA(inv.totalNet)}</span>
                          {inv.remainingBalance > 0 && (
                            <span className="text-[10px] text-rose-400 block">
                              Solde : {formatFCFA(inv.remainingBalance)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {matchedCustomers.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-blue-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Clients ({matchedCustomers.length})
                  </div>
                  <div className="space-y-1">
                    {matchedCustomers.slice(0, 4).map(cst => (
                      <div
                        key={cst.id}
                        onClick={() => {
                          onSelectEntity('customer', cst.id, cst);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{cst.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {cst.phone} · <span className="capitalize">{cst.type}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {cst.currentDebt > 0 ? (
                            <span className="text-rose-400 font-bold">
                              Dû: {formatFCFA(cst.currentDebt)}
                            </span>
                          ) : (
                            <span className="text-slate-400">À jour</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppliers */}
              {matchedSuppliers.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-purple-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Fournisseurs ({matchedSuppliers.length})
                  </div>
                  <div className="space-y-1">
                    {matchedSuppliers.slice(0, 3).map(sup => (
                      <div
                        key={sup.id}
                        onClick={() => {
                          onSelectEntity('supplier', sup.id, sup);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{sup.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Contact : {sup.contactPerson} · {sup.phone}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Movements */}
              {matchedMovements.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-emerald-300 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5" />
                    Mouvements de Stock ({matchedMovements.length})
                  </div>
                  <div className="space-y-1">
                    {matchedMovements.slice(0, 4).map(mov => (
                      <div
                        key={mov.id}
                        onClick={() => {
                          onSelectEntity('movement', mov.id, mov);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{mov.productName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({mov.referenceDocument})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            <span className="capitalize">{mov.type}</span> · {mov.justification}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-bold ${
                              mov.quantityBaseUnit > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {mov.quantityBaseUnit > 0 ? '+' : ''}
                            {mov.quantityBaseUnit} {mov.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{mov.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audits */}
              {matchedAudits.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase text-indigo-400 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Traces d'Audit ({matchedAudits.length})
                  </div>
                  <div className="space-y-1">
                    {matchedAudits.slice(0, 3).map(aud => (
                      <div
                        key={aud.id}
                        onClick={() => {
                          onSelectEntity('audit', aud.id, aud);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between cursor-pointer transition text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {aud.action} · {aud.targetObject}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Par {aud.userName} ({aud.userRole}) · {aud.justification}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">{aud.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
