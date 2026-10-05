import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Receipt,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Building,
  Phone,
  Mail,
  Calendar,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Invoice } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatFCFA, formatDate, formatDateTime } from '../../utils/formatters';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onOpenPaymentModal?: (invoice: Invoice) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  onClose,
  onOpenPaymentModal,
}) => {
  const { settings, currentUser, cancelInvoiceWithCreditNote, theme, language } = useApp();
  const [printFormat, setPrintFormat] = useState<'a4' | 'ticket'>('a4');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCancelInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError('');
    if (!cancelReason.trim()) {
      setCancelError(language === 'fr' ? 'Un motif d\'annulation est obligatoire.' : 'A cancellation reason is required.');
      return;
    }

    const res = cancelInvoiceWithCreditNote(invoice.id, cancelReason);
    if (!res.success) {
      setCancelError(res.error || (language === 'fr' ? 'Erreur lors de l\'annulation' : 'Error cancelling invoice'));
    } else {
      setShowCancelPrompt(false);
      onClose();
    }
  };

  const canCancel =
    (currentUser.role === 'responsable' || currentUser.role === 'administrateur') &&
    invoice.status !== 'annulée';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className={`w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border animate-in fade-in zoom-in-95 duration-150 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-stone-50 border-stone-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className={`border-b px-4 py-3 flex items-center justify-between gap-3 shrink-0 print:hidden ${
          theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-stone-100 border-stone-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm sm:text-base flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <FileText className="w-4 h-4 text-emerald-500" />
              {language === 'fr' ? 'Facture N°' : 'Invoice #'} {invoice.number}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                invoice.status === 'payée'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : invoice.status === 'partielle'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : invoice.status === 'crédit'
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : 'bg-slate-500/10 text-slate-400 line-through border-slate-500/30'
              }`}
            >
              {invoice.status === 'partielle'
                ? (language === 'fr' ? 'Solde Partiel' : 'Partially Paid')
                : invoice.status === 'payée'
                ? (language === 'fr' ? 'Réglée' : 'Paid')
                : invoice.status === 'crédit'
                ? (language === 'fr' ? 'À Crédit' : 'Credit')
                : (language === 'fr' ? 'Annulée (Avoir)' : 'Cancelled (Credit Note)')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Format toggle: A4 vs Ticket */}
            <div className={`flex items-center p-1 rounded-lg border text-xs ${
              theme === 'dark' ? 'bg-slate-700/60 border-slate-600' : 'bg-stone-200 border-stone-300'
            }`}>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  printFormat === 'a4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Format A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('ticket')}
                className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                  printFormat === 'ticket'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'fr' ? 'Ticket 80mm' : '80mm Receipt'}
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'fr' ? 'Imprimer' : 'Print'}</span>
            </button>

            {invoice.remainingBalance > 0 && invoice.status !== 'annulée' && onOpenPaymentModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPaymentModal(invoice);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{language === 'fr' ? 'Régler Solde' : 'Pay Balance'}</span>
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelPrompt(true)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                title={language === 'fr' ? "Générer un avoir et réintégrer le stock" : "Generate credit note & restock"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'fr' ? 'Annuler / Avoir' : 'Cancel / Credit Note'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-stone-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cancellation Prompt Modal overlay */}
        {showCancelPrompt && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/30 text-rose-600 flex flex-col gap-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-rose-600">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>
                {language === 'fr'
                  ? `Confirmation d'annulation de la facture ${invoice.number} (Émission d'un Avoir)`
                  : `Confirm cancellation of invoice ${invoice.number} (Credit note issuance)`}
              </span>
            </div>
            <p className="text-xs text-rose-600">
              {language === 'fr'
                ? "Conformément à la règle de non-destructivité des transactions (Section 10), la facture sera conservée, un avoir officiel sera numéroté, et les marchandises seront automatiquement réintégrées au stock avec un mouvement tracé dans l'audit."
                : "Per non-destructive accounting standards, the invoice will be retained, an official credit note numbered, and goods returned to stock with tracked audit trail."}
            </p>
            {cancelError && (
              <div className="text-xs bg-rose-50 border border-rose-200 p-2 rounded text-rose-700">
                {cancelError}
              </div>
            )}
            <form onSubmit={handleCancelInvoice} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder={language === 'fr' ? "Motif obligatoire de l'annulation (ex: erreur saisie, désistement client...)" : "Mandatory cancellation reason (e.g. data error, return)..."}
                className={`flex-1 border border-rose-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                  theme === 'dark' ? 'bg-slate-900 text-white placeholder-slate-400' : 'bg-white text-slate-850 placeholder-slate-400'
                }`}
                required
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-xs"
                >
                  {language === 'fr' ? 'Confirmer Annulation & Créer Avoir' : 'Confirm Cancellation & Issue Credit Note'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                    theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-stone-200 hover:bg-stone-300 text-slate-700'
                  }`}
                >
                  {language === 'fr' ? 'Fermer' : 'Close'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Document Body */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center ${
          theme === 'dark' ? 'bg-slate-950/50' : 'bg-stone-200/50'
        }`}>
          {/* FORMAT A4 */}
          {printFormat === 'a4' && (
            <div
              id="printable-invoice-a4"
              className="w-full max-w-3xl bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-4 text-xs font-sans"
            >
              {/* Status Watermark for Cancelled */}
              {invoice.status === 'annulée' && (
                <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-lg flex items-center justify-between">
                  <div className="font-bold flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>{language === 'fr' ? 'FACTURE ANNULÉE PAR AVOIR N°' : 'INVOICE CANCELLED BY CREDIT NOTE #'} {invoice.creditNoteNumber || 'EN COURS'}</span>
                  </div>
                  <div className="text-[11px]">
                    {language === 'fr' ? 'Motif :' : 'Reason:'} {invoice.cancellationReason} ({language === 'fr' ? 'par' : 'by'} {invoice.cancelledBy})
                  </div>
                </div>
              )}

              {/* Company Header */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-5 mb-5">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {settings.name}
                  </h1>
                  <p className="text-slate-600 text-[11px] font-medium">{settings.legalStatus}</p>
                  <p className="text-slate-600 text-[11px] mt-1">{settings.address}, {settings.city}</p>
                  <p className="text-slate-600 text-[11px]">
                    {language === 'fr' ? 'Tél :' : 'Tel:'} {settings.phone1} {settings.phone2 ? `/ ${settings.phone2}` : ''}
                  </p>
                  <p className="text-slate-600 text-[11px]">Email : {settings.email}</p>
                  <div className="mt-2 text-[10px] text-slate-500 font-mono">
                    NIF: {settings.taxId} | RCCM: {settings.tradeRegisterNumber}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-sm font-bold tracking-wider mb-2">
                    {language === 'fr' ? 'FACTURE' : 'INVOICE'}
                  </div>
                  <div className="text-base font-extrabold text-slate-900">{invoice.number}</div>
                  <div className="text-slate-600 text-[11px] mt-1">
                    Date : <span className="font-semibold text-slate-800">{formatDate(invoice.date)}</span> {language === 'fr' ? 'à' : 'at'} {invoice.time}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    {language === 'fr' ? 'Caissier :' : 'Cashier:'} <span className="font-semibold text-slate-800">{invoice.userName}</span>
                  </div>
                  {invoice.salesPointName && (
                    <div className="text-emerald-700 text-[11px] font-semibold">
                      {language === 'fr' ? 'Point de vente :' : 'Sales Point:'} {invoice.salesPointName}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {language === 'fr' ? 'Facturé à :' : 'Billed to:'}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{invoice.customerName}</div>
                  {invoice.customerPhone && (
                    <div className="text-slate-600 text-[11px] mt-0.5">{language === 'fr' ? 'Tél :' : 'Tel:'} {invoice.customerPhone}</div>
                  )}
                </div>
                <div className="text-right text-[11px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {language === 'fr' ? 'Modalité de règlement :' : 'Payment Terms:'}
                  </span>
                  <div className="font-semibold text-slate-800 capitalize mt-0.5">
                    {invoice.payments && invoice.payments.length > 0
                      ? invoice.payments.map(p => p.method).join(', ')
                      : invoice.isCredit
                      ? (language === 'fr' ? 'Crédit client' : 'Customer credit')
                      : (language === 'fr' ? 'Comptant' : 'Cash')}
                  </div>
                  {invoice.isCredit && invoice.creditDueDate && (
                    <div className="text-rose-600 font-semibold text-[10px] mt-0.5">
                      {language === 'fr' ? 'Échéance :' : 'Due date:'} {formatDate(invoice.creditDueDate)}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse mb-5">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                    <th className="py-2 px-2">{language === 'fr' ? 'Réf.' : 'Ref.'}</th>
                    <th className="py-2 px-2">{language === 'fr' ? 'Désignation' : 'Description'}</th>
                    <th className="py-2 px-2 text-right">{language === 'fr' ? 'Qté' : 'Qty'}</th>
                    <th className="py-2 px-2 text-center">{language === 'fr' ? 'Unité' : 'Unit'}</th>
                    <th className="py-2 px-2 text-right">{language === 'fr' ? 'Prix Unitaire' : 'Unit Price'}</th>
                    <th className="py-2 px-2 text-right">{language === 'fr' ? 'Remise' : 'Discount'}</th>
                    <th className="py-2 px-2 text-right">{language === 'fr' ? 'Total Net' : 'Net Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono text-slate-500 text-[10px]">
                        {item.productCode}
                      </td>
                      <td className="py-2 px-2 font-medium text-slate-900">{item.productName}</td>
                      <td className="py-2 px-2 text-right font-semibold">{item.quantity}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{item.unit}</td>
                      <td className="py-2 px-2 text-right">{item.unitPrice.toLocaleString('fr-FR')} FCFA</td>
                      <td className="py-2 px-2 text-right text-slate-600">
                        {item.discountAmount > 0
                          ? `-${item.discountAmount.toLocaleString('fr-FR')} FCFA`
                          : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">
                        {item.totalNet.toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-between items-start border-t border-slate-300 pt-4 mb-6">
                <div className="max-w-xs text-[11px] text-slate-500">
                  {invoice.discountDetails && (
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded mb-2 text-amber-900 text-[10px]">
                      <span className="font-bold">{language === 'fr' ? 'Remise accordée :' : 'Discount granted:'}</span> {invoice.discountDetails.value}
                      {invoice.discountDetails.type === 'pourcentage' ? '%' : ' FCFA'} {language === 'fr' ? 'autorisée par' : 'authorized by'}{' '}
                      {invoice.discountDetails.authorName} ({invoice.discountDetails.reason})
                    </div>
                  )}
                  {invoice.notes && (
                    <div className="italic text-slate-600">Note : {invoice.notes}</div>
                  )}
                </div>

                <div className="w-64 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>{language === 'fr' ? 'Sous-total brut :' : 'Gross subtotal:'}</span>
                    <span className="font-semibold text-slate-800">
                      {invoice.subtotalGross.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  {invoice.totalDiscount > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>{language === 'fr' ? 'Remise totale :' : 'Total discount:'}</span>
                      <span className="font-bold">
                        -{invoice.totalDiscount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-300 pt-1.5">
                    <span>{language === 'fr' ? 'NET À PAYER :' : 'NET DUE:'}</span>
                    <span className="text-emerald-700">{formatFCFA(invoice.totalNet)}</span>
                  </div>

                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>{language === 'fr' ? 'Montant Encaissé :' : 'Amount Paid:'}</span>
                    <span className="font-bold text-slate-900">
                      {formatFCFA(invoice.amountPaid)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                    <span>{language === 'fr' ? 'Reste à payer (Solde) :' : 'Balance Due:'}</span>
                    <span
                      className={
                        invoice.remainingBalance > 0 ? 'text-rose-600 font-black' : 'text-slate-600'
                      }
                    >
                      {formatFCFA(invoice.remainingBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payments History on Invoice */}
              {invoice.payments && invoice.payments.length > 0 && (
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                    {language === 'fr' ? 'Règlements enregistrés :' : 'Recorded payments:'}
                  </div>
                  <div className="space-y-1">
                    {invoice.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-700">
                        <span>
                          {p.date} · <span className="capitalize font-medium">{p.method}</span> (Réf:{' '}
                          {p.reference || 'N/A'})
                        </span>
                        <span className="font-semibold">{formatFCFA(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Notice & Signatures */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div className="max-w-md">
                  <p>{settings.invoiceFooterNotice}</p>
                  <p className="mt-1">
                    {language === 'fr'
                      ? `Système Provenda OS • Règlements par chèque ou virement à l'ordre de `
                      : `Provenda OS System • Cheque or transfer payable to `}
                    <span className="font-semibold text-slate-700">{settings.name}</span>.
                  </p>
                </div>
                <div className="text-center w-36">
                  <div className="text-slate-400 mb-8">{language === 'fr' ? 'Cachet & Signature' : 'Stamp & Signature'}</div>
                  <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                    {language === 'fr' ? 'Pour la Direction' : 'Management'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT TICKET THERMIQUE 80MM */}
          {printFormat === 'ticket' && (
            <div
              id="printable-invoice-ticket"
              className="w-80 bg-white text-slate-900 p-4 rounded-lg shadow-md border border-slate-200 font-mono text-[11px] leading-tight print:shadow-none print:border-none print:m-0 print:p-2"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="font-black text-sm uppercase">{settings.name}</div>
                <div className="text-[10px]">{settings.address}</div>
                <div className="text-[10px]">{language === 'fr' ? 'Tél :' : 'Tel:'} {settings.phone1}</div>
                <div className="text-[9px] mt-0.5">NIF: {settings.taxId}</div>
                {invoice.salesPointName && (
                  <div className="text-[9px] font-bold text-emerald-800 mt-0.5">
                    {invoice.salesPointName}
                  </div>
                )}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[10px]">
                <div>
                  {language === 'fr' ? 'TICKET :' : 'RECEIPT:'} <span className="font-bold">{invoice.number}</span>
                </div>
                <div>
                  DATE : {formatDate(invoice.date)} {invoice.time}
                </div>
                <div>{language === 'fr' ? 'CAISSIER :' : 'CASHIER:'} {invoice.userName}</div>
                <div>{language === 'fr' ? 'CLIENT :' : 'CUSTOMER:'} {invoice.customerName}</div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="mb-1.5">
                    <div className="font-bold truncate">{item.productName}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>
                        {item.quantity} {item.unit} x {item.unitPrice.toLocaleString('fr-FR')}
                      </span>
                      <span>{item.totalNet.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-right text-[11px]">
                <div className="flex justify-between">
                  <span>{language === 'fr' ? 'BRUT :' : 'GROSS:'}</span>
                  <span>{invoice.subtotalGross.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>{language === 'fr' ? 'REMISE :' : 'DISCOUNT:'}</span>
                    <span>-{invoice.totalDiscount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>{language === 'fr' ? 'TOTAL NET :' : 'NET DUE:'}</span>
                  <span>{formatFCFA(invoice.totalNet)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'fr' ? 'PAYÉ :' : 'PAID:'}</span>
                  <span>{formatFCFA(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{language === 'fr' ? 'SOLDE DÛ :' : 'BALANCE DUE:'}</span>
                  <span>{formatFCFA(invoice.remainingBalance)}</span>
                </div>
              </div>

              <div className="pt-3 text-center text-[10px] text-slate-600">
                <p>{settings.ticketFooterNotice}</p>
                <p className="mt-1">
                  {language === 'fr' ? 'Merci pour votre confiance !' : 'Thank you for your business!'}
                </p>
                <div className="mt-2 text-[8px] text-slate-400 font-sans">
                  PROVENDA OS • V2.2
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
