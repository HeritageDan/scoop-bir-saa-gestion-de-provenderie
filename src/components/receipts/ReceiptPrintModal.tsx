import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Settings2,
  Sliders,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { Invoice, ReceiptPrinterConfig, ReceiptPaperWidth } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatFCFA, formatUnit } from '../../utils/formatters';
import {
  getPrinterConfig,
  savePrinterConfig,
  printReceipt,
} from '../../services/receiptPrinterService';
import { DEFAULT_APP_LOGO } from '../../config/defaultLogo';

interface ReceiptPrintModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  isReprint?: boolean;
  autoPrint?: boolean;
  onOpenA4?: (invoice: Invoice) => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  invoice,
  onClose,
  isReprint = false,
  autoPrint = false,
  onOpenA4,
}) => {
  const { settings, salesPoints, theme, language } = useApp();
  const [config, setConfig] = useState<ReceiptPrinterConfig>(getPrinterConfig());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{
    success?: boolean;
    error?: string;
    message?: string;
  }>({});

  const is58mm = config.paperWidth === '58mm';
  const subTotalGross = invoice?.subtotalGross || invoice?.totalNet || 0;
  const discountTotal = invoice?.totalDiscount || 0;
  const netDue = invoice?.totalNet || 0;
  const amountPaid = invoice?.amountPaid ?? netDue;
  const amountReceived = invoice?.amountReceived ?? (invoice?.changeGiven ? netDue + invoice.changeGiven : amountPaid);
  const changeDue = invoice?.changeGiven !== undefined ? invoice.changeGiven : Math.max(0, amountReceived - netDue);
  const remainingDue = invoice?.remainingBalance || 0;
  const isCredit = invoice?.isCredit || remainingDue > 0;
  const mainPaymentMethod = invoice?.payments?.[0]?.method || (isCredit ? 'crédit client' : 'espèces');

  const handlePrint = async () => {
    if (!invoice) return;
    setIsPrinting(true);
    setPrintStatus({});

    const result = await printReceipt(invoice, settings, config, isReprint);
    setIsPrinting(false);

    if (result.success) {
      setPrintStatus({
        success: true,
        message: language === 'fr' ? 'Ticket envoyé avec succès à l\'imprimante !' : 'Receipt sent successfully to printer!',
      });
      setTimeout(() => {
        setPrintStatus({});
      }, 3500);
    } else {
      setPrintStatus({
        success: false,
        error: result.error || (language === 'fr' ? 'Échec spooler, ouverture dialogue système...' : 'Spooler failed, opening system dialog...'),
      });
      // Fallback: browser native print dialog
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  // Auto-trigger printing when opened right after a sale
  useEffect(() => {
    if (autoPrint && invoice) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, invoice]);

  if (!invoice) return null;

  const matchedSp = salesPoints.find(sp => sp.id === invoice.salesPointId);
  const displaySalesPointName = matchedSp?.name || (salesPoints.length === 1 ? salesPoints[0].name : invoice.salesPointName);
  const fullAddress = [settings.address, settings.city, settings.country].filter(Boolean).join(', ');

  const handleWidthChange = (width: ReceiptPaperWidth) => {
    const updated = { ...config, paperWidth: width };
    setConfig(updated);
    savePrinterConfig(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border animate-in fade-in zoom-in-95 duration-150 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div
          className={`border-b px-4 py-3 flex items-center justify-between gap-3 shrink-0 ${
            theme === 'dark' ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className={`font-bold text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <span>{language === 'fr' ? 'Ticket de Caisse POS' : 'POS Cash Receipt'}</span>
                {isReprint && (
                  <span className="text-[10px] uppercase font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    {language === 'fr' ? 'Réimpression' : 'Reprint'}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {invoice.number} &middot; {invoice.date} {invoice.time}
              </div>
            </div>
          </div>

          {/* Width Selector Toggle */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center p-1 rounded-xl border text-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
            }`}>
              <button
                type="button"
                onClick={() => handleWidthChange('58mm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                  is58mm
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => handleWidthChange('80mm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                  !is58mm
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                80 mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status notification */}
        {printStatus.message && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{printStatus.message}</span>
          </div>
        )}

        {printStatus.error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{printStatus.error}</span>
            </div>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-500 transition cursor-pointer shrink-0"
            >
              {language === 'fr' ? 'Réessayer' : 'Retry'}
            </button>
          </div>
        )}

        {/* Center: Thermal Paper Canvas Preview */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center ${
          theme === 'dark' ? 'bg-slate-950/60' : 'bg-slate-100'
        }`}>
          {/* Authentic Thermal Slip Simulator */}
          <div
            id="pos-thermal-receipt-slip"
            className={`bg-white text-black font-mono shadow-2xl select-none border border-slate-300 rounded-xs transition-all relative ${
              is58mm ? 'w-[270px] p-3 text-[10px]' : 'w-[370px] p-4 text-[11px]'
            }`}
            style={{
              fontFamily: "'Courier New', Courier, 'Lucida Console', monospace",
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2)',
            }}
          >
            {/* Top clean thermal paper roll notch */}
            <div className="border-t-2 border-dashed border-slate-300 mb-2" />

            {/* Logo if configured */}
            {config.showLogo && (
              <div className="text-center mb-2">
                <img
                  src={settings.logoUrl || DEFAULT_APP_LOGO}
                  alt={settings.name || 'SCOOPS BIR SAA'}
                  className="max-h-12 max-w-[180px] mx-auto object-contain filter grayscale contrast-150"
                />
              </div>
            )}

            {/* Store Header */}
            <div className="text-center space-y-0.5">
              <div className="font-black text-sm tracking-wide">{settings.name || 'SCOOPS BIR SAA'}</div>
              {settings.legalStatus && <div className="text-[9px] opacity-80">{settings.legalStatus}</div>}
              {fullAddress && <div className="text-[9.5px]">{fullAddress}</div>}
              {settings.phone1 && (
                <div className="text-[9px]">
                  {language === 'fr' ? 'Tél :' : 'Tel:'} {settings.phone1} {settings.phone2 ? `/ ${settings.phone2}` : ''}
                </div>
              )}
              {(settings.taxId || settings.tradeRegisterNumber) && (
                <div className="text-[8.5px]">
                  {settings.taxId ? `NIF : ${settings.taxId}` : ''}
                  {settings.taxId && settings.tradeRegisterNumber ? ' | ' : ''}
                  {settings.tradeRegisterNumber ? `RCCM : ${settings.tradeRegisterNumber}` : ''}
                </div>
              )}
              {displaySalesPointName && (
                <div className="font-bold text-[9.5px] mt-1">
                  {language === 'fr' ? 'Point de vente :' : 'Sales Point:'} {displaySalesPointName}
                </div>
              )}
            </div>

            <div className="border-b-2 border-black my-2" />

            {/* Receipt Identification */}
            <div className="space-y-0.5 text-[9.5px]">
              {isReprint && (
                <div className="text-center font-bold border border-black py-0.5 my-1">
                  *** {language === 'fr' ? 'DUPLICATA / RÉIMPRESSION' : 'DUPLICATE / REPRINT'} ***
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>{language === 'fr' ? 'TICKET N° :' : 'RECEIPT NO:'}</span>
                <span>{invoice.number}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'fr' ? 'Date :' : 'Date:'} {invoice.date}</span>
                <span>{language === 'fr' ? 'Heure :' : 'Time:'} {invoice.time || '10:00'}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'fr' ? 'Caissier :' : 'Cashier:'} {invoice.userName}</span>
                <span className="capitalize">{invoice.userRole}</span>
              </div>
              <div className="truncate">
                {language === 'fr' ? 'Client :' : 'Customer:'} <b>{invoice.customerName}</b>
                {invoice.customerPhone && <span className="opacity-75"> ({invoice.customerPhone})</span>}
              </div>
            </div>

            <div className="border-b border-dashed border-black my-2" />

            {/* Line items list */}
            {!is58mm ? (
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-black">
                    <th className="text-left pb-1 font-bold">
                      {language === 'fr' ? 'Désignation' : 'Description'}
                    </th>
                    <th className="text-center pb-1 font-bold">
                      {language === 'fr' ? 'Qté' : 'Qty'}
                    </th>
                    <th className="text-right pb-1 font-bold">
                      {language === 'fr' ? 'P.U' : 'U.P'}
                    </th>
                    <th className="text-right pb-1 font-bold">
                      {language === 'fr' ? 'Total' : 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => {
                    const lineTotal = item.totalNet || item.quantity * item.unitPrice;
                    return (
                      <tr key={idx} className="border-b border-dotted border-black/20">
                        <td className="py-1 pr-1 break-words font-medium">
                          {item.productName}
                          {item.discountAmount > 0 && (
                            <div className="text-[8.5px] opacity-75">
                              (Rem: -{formatFCFA(item.discountAmount)})
                            </div>
                          )}
                        </td>
                        <td className="py-1 px-1 text-center whitespace-nowrap">
                          {item.quantity} {formatUnit(item.unit)}
                        </td>
                        <td className="py-1 px-1 text-right whitespace-nowrap">
                          {formatFCFA(item.unitPrice).replace(' FCFA', '')}
                        </td>
                        <td className="py-1 pl-1 text-right font-bold whitespace-nowrap">
                          {formatFCFA(lineTotal).replace(' FCFA', '')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="space-y-1.5 text-[9.5px]">
                {invoice.items.map((item, idx) => {
                  const lineTotal = item.totalNet || item.quantity * item.unitPrice;
                  return (
                    <div key={idx} className="space-y-0.5 border-b border-dotted border-black/20 pb-1">
                      <div className="font-bold leading-tight break-words">{item.productName}</div>
                      <div className="flex justify-between">
                        <span>
                          {item.quantity} {formatUnit(item.unit)} x {formatFCFA(item.unitPrice).replace(' FCFA', '')}
                        </span>
                        <span className="font-bold">
                          {formatFCFA(lineTotal).replace(' FCFA', '')}
                        </span>
                      </div>
                      {item.discountAmount > 0 && (
                        <div className="text-[8.5px] opacity-75">
                          Remise: -{formatFCFA(item.discountAmount)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-b border-dashed border-black my-2" />

            {/* Financial Summary */}
            <div className="space-y-1">
              {discountTotal > 0 && (
                <>
                  <div className="flex justify-between text-[9.5px]">
                    <span>{language === 'fr' ? 'Sous-total brut :' : 'Gross Subtotal:'}</span>
                    <span>{formatFCFA(subTotalGross)}</span>
                  </div>
                  <div className="flex justify-between text-[9.5px]">
                    <span>{language === 'fr' ? 'Remise déduite :' : 'Discount deducted:'}</span>
                    <span>-{formatFCFA(discountTotal)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-sm sm:text-base font-black border-y-2 border-black py-1 my-1">
                <span>{language === 'fr' ? 'NET À PAYER :' : 'NET TO PAY:'}</span>
                <span>{formatFCFA(netDue)}</span>
              </div>

              {/* Payment Settlement */}
              <div className="text-[9.5px] space-y-1 pt-0.5">
                <div className="flex justify-between">
                  <span>{language === 'fr' ? 'Règlement :' : 'Payment:'}</span>
                  <span className="font-bold uppercase">
                    {isCredit
                      ? (amountPaid > 0 ? (language === 'fr' ? 'Crédit (avec acompte)' : 'Credit (partial)') : (language === 'fr' ? 'À Crédit' : 'Credit'))
                      : mainPaymentMethod}
                  </span>
                </div>

                {isCredit ? (
                  <div className="mt-1 pt-1 border-t border-dotted border-black space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>{language === 'fr' ? 'Acompte versé :' : 'Downpayment paid:'}</span>
                      <span>{formatFCFA(amountPaid)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-black border-y border-dashed border-black py-0.5 my-0.5">
                      <span>{language === 'fr' ? 'Reste à payer (Dette) :' : 'Balance due (Debt):'}</span>
                      <span>{formatFCFA(remainingDue)}</span>
                    </div>
                    {invoice.creditDueDate && (
                      <div className="text-[8.5px] mt-0.5">
                        {language === 'fr' ? 'Date d\'échéance :' : 'Due date:'} {invoice.creditDueDate}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {mainPaymentMethod === 'espèces' && (
                      <>
                        <div className="flex justify-between">
                          <span>{language === 'fr' ? 'Espèces reçues :' : 'Cash received:'}</span>
                          <span className="font-bold">{formatFCFA(amountReceived)}</span>
                        </div>
                        {changeDue > 0 ? (
                          <>
                            <div className="flex justify-between font-bold text-black border-y border-dashed border-black py-0.5 my-0.5">
                              <span>{language === 'fr' ? 'Monnaie rendue :' : 'Change given:'}</span>
                              <span>{formatFCFA(changeDue)}</span>
                            </div>
                            <div className="flex justify-between opacity-80 text-[8.5px]">
                              <span>{language === 'fr' ? 'Net encaissé :' : 'Net tendered:'}</span>
                              <span>{formatFCFA(netDue)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between opacity-80 text-[8.5px]">
                            <span>{language === 'fr' ? 'Compte exact' : 'Exact amount tendered'}</span>
                            <span>{formatFCFA(netDue)}</span>
                          </div>
                        )}
                      </>
                    )}

                    {mainPaymentMethod !== 'espèces' && (
                      <>
                        <div className="flex justify-between">
                          <span>{language === 'fr' ? 'Montant réglé :' : 'Amount paid:'}</span>
                          <span className="font-bold">{formatFCFA(netDue)}</span>
                        </div>
                        {invoice.payments?.[0]?.reference && (
                          <div className="flex justify-between opacity-80 text-[8.5px]">
                            <span>{language === 'fr' ? 'Réf transaction :' : 'Ref:'}</span>
                            <span className="font-mono">{invoice.payments[0].reference}</span>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="border-b border-black my-2" />

            {/* Footer Message */}
            <div className="text-center text-[8.5px] space-y-1 leading-tight">
              <div>{config.footerMessage || settings.ticketFooterNotice || (language === 'fr' ? 'Merci de votre fidélité !' : 'Thank you for your business!')}</div>
              <div className="text-[8px] opacity-80">SCOOPS BIR SAA POS &middot; {language === 'fr' ? 'Provenderie Certifiée' : 'Certified Feed Mill'}</div>
            </div>

            {/* Simulated Barcode */}
            {config.showBarcode && (
              <div className="mt-2 text-center border-t border-dashed border-black pt-2">
                <div className="font-mono text-xs tracking-widest font-bold">
                  *||| | |||| | ||| |||| |*
                </div>
                <div className="text-[8px] font-mono mt-0.5">{invoice.number}</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div
          className={`border-t p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            theme === 'dark' ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>Format actif : <b>{config.paperWidth}</b></span>
            <span>&middot;</span>
            <span>{config.printerName}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenA4 && (
              <button
                type="button"
                onClick={() => onOpenA4(invoice)}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                }`}
                title={language === 'fr' ? 'Afficher au format Facture A4' : 'View in A4 Invoice format'}
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>{language === 'fr' ? 'Facture A4' : 'A4 Invoice'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              {language === 'fr' ? 'Fermer' : 'Close'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className={`w-4 h-4 ${isPrinting ? 'animate-bounce' : ''}`} />
              <span>
                {isPrinting
                  ? (language === 'fr' ? 'Impression...' : 'Printing...')
                  : isReprint
                  ? (language === 'fr' ? 'Réimprimer le Ticket' : 'Reprint Receipt')
                  : (language === 'fr' ? 'Imprimer le Ticket' : 'Print Receipt')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #pos-thermal-receipt-slip, #pos-thermal-receipt-slip * {
            visibility: visible !important;
          }
          #pos-thermal-receipt-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${is58mm ? '58mm' : '80mm'} !important;
            max-width: ${is58mm ? '58mm' : '80mm'} !important;
            box-shadow: none !important;
            border: none !important;
            padding: 2mm !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
