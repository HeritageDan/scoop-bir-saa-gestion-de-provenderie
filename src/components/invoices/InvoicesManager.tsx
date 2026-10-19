import React, { useState } from 'react';
import {
  FileText,
  Search,
  Printer,
  RotateCcw,
  CreditCard,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Filter,
  DollarSign,
  Receipt,
  Building2,
  Calendar,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { formatFCFA, formatDate, formatDateTime } from '../../utils/formatters';
import { ReceiptPrintModal } from '../receipts/ReceiptPrintModal';

interface InvoicesManagerProps {
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onOpenPaymentModal: (invoice: Invoice) => void;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  onOpenInvoiceModal,
  onOpenPaymentModal,
}) => {
  const { invoices, creditNotes, currentUser, theme, language, t, currentSalesPointId } = useApp();

  const [activeTab, setActiveTab] = useState<'invoices' | 'creditNotes'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'payée' | 'partielle' | 'crédit' | 'annulée'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [receiptModalInvoice, setReceiptModalInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices
    .filter(inv => {
      const matchesPoint =
        currentSalesPointId === 'all' ||
        !inv.salesPointId ||
        inv.salesPointId === currentSalesPointId;
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesDate = !dateFilter || inv.date === dateFilter;
      const matchesSearch =
        inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.salesPointName && inv.salesPointName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesPoint && matchesStatus && matchesDate && matchesSearch;
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeB - timeA;
    });

  const filteredCreditNotes = creditNotes
    .filter(cn => {
      // If scoped, match original invoice salesPointId
      const originalInv = invoices.find(i => i.number === cn.originalInvoiceNumber || i.id === cn.originalInvoiceId);
      if (currentSalesPointId !== 'all' && originalInv && (originalInv.salesPointId || 'pos-1') !== currentSalesPointId) {
        return false;
      }
      const matchesDate = !dateFilter || (cn.date && cn.date.slice(0, 10) === dateFilter);
      return (
        matchesDate &&
        (cn.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cn.originalInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cn.authorizedBy.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return timeB - timeA;
    });

  const exportInvoicesCSV = () => {
    const headers = [
      'N° Facture',
      'Date',
      'Heure',
      'Point de Vente',
      'Client',
      'Caissier',
      'Sous-total Brut',
      'Remise Totale',
      'Total Net (FCFA)',
      'Montant Encaissé',
      'Solde Restant Dû',
      'Statut',
      'N° Avoir (si annulée)',
    ];

    const rows = invoices.map(inv => [
      `"${inv.number}"`,
      `"${inv.date}"`,
      `"${inv.time}"`,
      `"${inv.salesPointName || ''}"`,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      `"${inv.userName}"`,
      inv.subtotalGross,
      inv.totalDiscount,
      inv.totalNet,
      inv.amountPaid,
      inv.remainingBalance,
      `"${inv.status}"`,
      `"${inv.creditNoteNumber || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_facturation_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Receipt className="w-6 h-6 text-emerald-500" />
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {t('invoices.title')}
            </h1>
            {currentSalesPointId === 'all' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                {t('sales_point.global_badge')}
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('invoices.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportInvoicesCSV}
            className={`border px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>{language === 'fr' ? 'Exporter Journal CSV' : 'Export CSV Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'invoices'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          {language === 'fr' ? 'Factures Émises' : 'Issued Invoices'} ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('creditNotes')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'creditNotes'
              ? 'border-rose-500 text-rose-500'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{language === 'fr' ? 'Avoirs & Annulations' : 'Credit Notes & Cancellations'} ({creditNotes.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border shadow-xs ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              activeTab === 'invoices'
                ? (language === 'fr' ? 'Rechercher par N° facture, client, caissier...' : 'Search by invoice #, customer, cashier...')
                : (language === 'fr' ? 'Rechercher par N° avoir, client, motif...' : 'Search by credit note #, customer, reason...')
            }
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
              title={language === 'fr' ? 'Filtrer par date précise (ex: 2026-09-08)' : 'Filter by specific date (e.g. 2026-09-08)'}
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

          {activeTab === 'invoices' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">
                {language === 'fr' ? 'Statut :' : 'Status:'}
              </span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className={`rounded-lg px-2.5 py-1.5 text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-850'
                }`}
              >
                <option value="all">{language === 'fr' ? 'Tous les règlements' : 'All statuses'}</option>
                <option value="payée">{language === 'fr' ? 'Payée / Réglée' : 'Paid / Cleared'}</option>
                <option value="partielle">{language === 'fr' ? 'Solde Partiel' : 'Partially Paid'}</option>
                <option value="crédit">{language === 'fr' ? 'À Crédit (Totalité due)' : 'On Credit (Full due)'}</option>
                <option value="annulée">{language === 'fr' ? 'Annulée (Avoir)' : 'Cancelled (Credit Note)'}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {dateFilter && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              {language === 'fr'
                ? `Filtre actif pour le ${formatDate(dateFilter)} : ${activeTab === 'invoices' ? filteredInvoices.length + ' facture(s)' : filteredCreditNotes.length + ' avoir(s)'}`
                : `Active filter for ${formatDate(dateFilter)}: ${activeTab === 'invoices' ? filteredInvoices.length + ' invoice(s)' : filteredCreditNotes.length + ' credit note(s)'}`}
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

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div className={`border rounded-xl overflow-hidden shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider ${
                  theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <th className="py-3 px-3">{language === 'fr' ? 'N° Facture' : 'Invoice #'}</th>
                  <th className="py-3 px-3">{language === 'fr' ? 'Date & Heure' : 'Date & Time'}</th>
                  <th className="py-3 px-3">{language === 'fr' ? 'Client' : 'Customer'}</th>
                  <th className="py-3 px-3 text-right">{language === 'fr' ? 'Sous-total Brut' : 'Gross Subtotal'}</th>
                  <th className="py-3 px-3 text-right">{language === 'fr' ? 'Remise' : 'Discount'}</th>
                  <th className="py-3 px-3 text-right">{language === 'fr' ? 'Net à Payer' : 'Net Due'}</th>
                  <th className="py-3 px-3 text-right">{language === 'fr' ? 'Reste Dû' : 'Balance Due'}</th>
                  <th className="py-3 px-3 text-center">{language === 'fr' ? 'Statut' : 'Status'}</th>
                  <th className="py-3 px-3 text-right">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      {language === 'fr' ? 'Aucune facture ne correspond à ces critères.' : 'No invoices match these criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => (
                    <tr key={inv.id} className={`transition ${
                      theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                    }`}>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{inv.number}</span>
                        {inv.salesPointName && currentSalesPointId === 'all' && (
                          <div className="text-[10px] text-emerald-500 font-normal flex items-center gap-0.5 mt-0.5">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>{inv.salesPointName}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(inv.date)} {inv.time}
                      </td>
                      <td className="py-3 px-3">
                        <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {inv.customerName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'fr' ? 'Caissier :' : 'Cashier:'} {inv.userName}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {formatFCFA(inv.subtotalGross)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-500 font-medium">
                        {inv.totalDiscount > 0 ? `-${formatFCFA(inv.totalDiscount)}` : '-'}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        {formatFCFA(inv.totalNet)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={inv.remainingBalance > 0 ? 'text-rose-500' : 'text-slate-400'}>
                          {inv.remainingBalance > 0 ? formatFCFA(inv.remainingBalance) : '0 FCFA'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            inv.status === 'payée'
                              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                              : inv.status === 'partielle'
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : inv.status === 'crédit'
                              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                              : 'bg-slate-500/20 text-slate-400 line-through border border-slate-500/30'
                          }`}
                        >
                          {inv.status === 'payée' ? (language === 'fr' ? 'Payée' : 'Paid') :
                           inv.status === 'partielle' ? (language === 'fr' ? 'Partielle' : 'Partial') :
                           inv.status === 'crédit' ? (language === 'fr' ? 'À Crédit' : 'Credit') :
                           (language === 'fr' ? 'Annulée' : 'Cancelled')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setReceiptModalInvoice(inv)}
                            className={`p-1.5 rounded transition cursor-pointer ${
                              theme === 'dark'
                                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-slate-100'
                            }`}
                            title={language === 'fr' ? 'Imprimer / Réimprimer Ticket POS' : 'Print / Reprint POS Receipt'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenInvoiceModal(inv)}
                            className={`p-1.5 rounded transition cursor-pointer ${
                              theme === 'dark'
                                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title={language === 'fr' ? 'Consulter et Imprimer Facture A4' : 'View and Print A4 Invoice'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {inv.remainingBalance > 0 && inv.status !== 'annulée' && (
                            <button
                              onClick={() => onOpenPaymentModal(inv)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                              title={language === 'fr' ? 'Encaisser un règlement complémentaire' : 'Collect partial payment'}
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{language === 'fr' ? 'Encaisser' : 'Collect'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREDIT NOTES LIST */}
      {activeTab === 'creditNotes' && (
        <div className={`border rounded-xl overflow-hidden shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider ${
                  theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <th className="py-3 px-3">{language === 'fr' ? 'N° Avoir' : 'Credit Note #'}</th>
                  <th className="py-3 px-3">{language === 'fr' ? 'Date & Heure' : 'Date & Time'}</th>
                  <th className="py-3 px-3">{language === 'fr' ? 'Facture Origine' : 'Original Invoice'}</th>
                  <th className="py-3 px-3">{language === 'fr' ? 'Client' : 'Customer'}</th>
                  <th className="py-3 px-3">{language === 'fr' ? 'Motif Annulation' : 'Cancellation Reason'}</th>
                  <th className="py-3 px-3 text-right">{language === 'fr' ? 'Montant Remboursé' : 'Refunded Amount'}</th>
                  <th className="py-3 px-3">{language === 'fr' ? 'Validé Par' : 'Authorized By'}</th>
                  <th className="py-3 px-3 text-center">{language === 'fr' ? 'Réintégration Stock' : 'Restock Status'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredCreditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      {language === 'fr' ? 'Aucun avoir émis pour l\'instant.' : 'No credit notes issued yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredCreditNotes.map(cn => (
                    <tr key={cn.id} className={`transition ${
                      theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                    }`}>
                      <td className="py-3 px-3 font-mono font-bold text-rose-500">
                        {cn.number}
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(cn.date)}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{cn.originalInvoiceNumber}</span>
                      </td>
                      <td className={`py-3 px-3 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {cn.customerName}
                      </td>
                      <td className="py-3 px-3 text-amber-500 italic max-w-xs truncate">
                        "{cn.reason}"
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-500">
                        -{formatFCFA(cn.amount)}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{cn.authorizedBy}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{language === 'fr' ? 'Réintégré' : 'Restocked'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POS Thermal Receipt Modal for Reprinting */}
      {receiptModalInvoice && (
        <ReceiptPrintModal
          invoice={receiptModalInvoice}
          onClose={() => setReceiptModalInvoice(null)}
          isReprint={true}
        />
      )}
    </div>
  );
};
