import React from 'react';
import { CompanySettings, Invoice, SalesPoint, User } from '../../../types';
import { isDateInRange } from '../../../utils/dateFilterUtils';
import { formatFCFA, formatDate, formatNumber } from '../../../utils/formatters';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';

interface SalesReportDocumentProps {
  invoices: Invoice[];
  startDate: string;
  endDate: string;
  settings: CompanySettings;
  salesPoint: SalesPoint | null;
  currentUser: User;
  language?: 'fr' | 'en';
}

export const SalesReportDocument: React.FC<SalesReportDocumentProps> = ({
  invoices,
  startDate,
  endDate,
  settings,
  salesPoint,
  currentUser,
  language = 'fr',
}) => {
  const isEn = language === 'en';

  // Filter invoices strictly within selected date range
  const filteredInvoices = invoices
    .filter(inv => {
      if (inv.status === 'annulée') return false;
      return isDateInRange(inv.date, startDate, endDate);
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeB - timeA;
    });

  // Calculate aggregates
  const transactionCount = filteredInvoices.length;
  const grossSales = filteredInvoices.reduce((sum, inv) => sum + inv.subtotalGross, 0);
  const totalDiscounts = filteredInvoices.reduce((sum, inv) => sum + inv.totalDiscount, 0);
  const netSales = filteredInvoices.reduce((sum, inv) => sum + inv.totalNet, 0);
  const totalCOGS = filteredInvoices.reduce((sum, inv) => sum + inv.totalCostOfGoodsSold, 0);
  const totalGrossMargin = netSales - totalCOGS;
  const marginRateSales = netSales > 0 ? (totalGrossMargin / netSales) * 100 : 0;
  const avgBasket = transactionCount > 0 ? Math.round(netSales / transactionCount) : 0;

  let totalQtySold = 0;
  filteredInvoices.forEach(inv => {
    inv.items.forEach(item => {
      totalQtySold += item.quantity;
    });
  });

  // Tender breakdowns
  let cashSales = 0;
  let mobileSales = 0;
  let bankSales = 0;
  let remainingCredit = 0;

  filteredInvoices.forEach(inv => {
    (inv.payments || []).forEach(p => {
      if (p.method === 'espèces') cashSales += p.amount;
      else if (p.method === 'paiement mobile') mobileSales += p.amount;
      else if (p.method === 'virement') bankSales += p.amount;
    });
    if (inv.remainingBalance > 0) {
      remainingCredit += inv.remainingBalance;
    }
  });

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between print:p-0 print:m-0 print:max-w-none">
      <div>
        {/* Official Header */}
        <ReportHeader
          title={isEn ? 'SALES & CASH RECEIPTS REPORT' : 'JOURNAL DÉTAILLÉ DES VENTES & ENCAISSEMENTS'}
          subtitle={
            isEn
              ? 'Complete chronological register of completed commercial sales, applied discounts and gross margin'
              : 'Registre chronologique exhaustif des ventes comptoir, remises accordées et marges brutes'
          }
          startDate={startDate}
          endDate={endDate}
          settings={settings}
          salesPoint={salesPoint}
          currentUser={currentUser}
          language={language}
        />

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[9.5px] border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">Date / Heure</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">N° Facture</th>
                <th className="p-2 border-r border-slate-300">Client</th>
                <th className="p-2 border-r border-slate-300">Articles & Qté</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">Brut (FCFA)</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">Remise</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap font-bold">Net (FCFA)</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">Règlement</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">Caissier</th>
                <th className="p-2 text-center whitespace-nowrap">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500 italic">
                    {isEn
                      ? 'No sales recorded for this period.'
                      : 'Aucune vente enregistrée sur cette période.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <tr key={inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-2 border-r border-slate-200 whitespace-nowrap font-mono text-[10px]">
                      {formatDate(inv.date)}
                      <span className="block text-slate-500">{inv.time}</span>
                    </td>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {inv.number}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-medium">
                      {inv.customerName}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="space-y-1">
                        {inv.items.map((item, i) => (
                          <div key={i} className="text-[10px] leading-tight flex justify-between gap-1">
                            <span className="truncate max-w-[140px] text-slate-700">
                              {item.productName}
                            </span>
                            <span className="font-mono text-slate-900 whitespace-nowrap">
                              {item.quantity} {item.unit} × {formatNumber(item.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatNumber(inv.subtotalGross)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-amber-700 whitespace-nowrap">
                      {inv.totalDiscount > 0 ? `-${formatNumber(inv.totalDiscount)}` : '—'}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap bg-emerald-50/50">
                      {formatNumber(inv.totalNet)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-[10px] whitespace-nowrap capitalize">
                      {inv.payments && inv.payments.length > 0 ? (
                        inv.payments.map((p, pi) => (
                          <div key={pi}>
                            <span className="font-medium">{p.method}</span> ({formatNumber(p.amount)})
                          </div>
                        ))
                      ) : (
                        <span className="text-rose-700 font-semibold">À crédit</span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-[10px] whitespace-nowrap text-slate-600">
                      {inv.userName}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inv.status === 'payée'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : inv.status === 'partielle'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-400">
                  <td colSpan={4} className="p-2.5 uppercase tracking-wider text-right border-r border-slate-300">
                    {isEn ? 'TOTALS FOR SELECTED PERIOD:' : 'TOTAUX DE LA PÉRIODE SÉLECTIONNÉE :'}
                  </td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-300 whitespace-nowrap">
                    {formatFCFA(grossSales)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-amber-800 border-r border-slate-300 whitespace-nowrap">
                    {formatFCFA(totalDiscounts)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-900 border-r border-slate-300 whitespace-nowrap text-xs bg-emerald-100/60">
                    {formatFCFA(netSales)}
                  </td>
                  <td colSpan={3} className="p-2.5 text-right font-mono text-[10px] text-slate-600">
                    {transactionCount} {isEn ? 'invoices' : 'factures'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Section 6 Summary Card: SALES SUMMARY */}
        <div className="mt-8 p-4 bg-slate-50 border border-slate-300 rounded-xl break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3">
            {isEn ? 'SALES & FINANCIAL PERFORMANCE SUMMARY' : 'SYNTHÈSE COMMERCIALE & RÉCAPITULATIF DE CAISSE'}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {/* Column 1: Volumes */}
            <div className="space-y-1.5 border-r border-slate-200 pr-3">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Volumes d'Activité</div>
              <div className="flex justify-between">
                <span>Transactions :</span>
                <span className="font-bold font-mono">{transactionCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total unités vendues :</span>
                <span className="font-bold font-mono">{formatNumber(totalQtySold)}</span>
              </div>
              <div className="flex justify-between">
                <span>Panier moyen :</span>
                <span className="font-bold font-mono text-emerald-800">{formatFCFA(avgBasket)}</span>
              </div>
            </div>

            {/* Column 2: CA & Marges */}
            <div className="space-y-1.5 border-r border-slate-200 pr-3">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Chiffre d'Affaires</div>
              <div className="flex justify-between">
                <span>Total Brut :</span>
                <span className="font-mono">{formatFCFA(grossSales)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Total Remises :</span>
                <span className="font-mono">-{formatFCFA(totalDiscounts)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-900 border-t pt-1">
                <span>Net Commercial :</span>
                <span className="font-mono">{formatFCFA(netSales)}</span>
              </div>
            </div>

            {/* Column 3: Rentabilité Brute */}
            <div className="space-y-1.5 border-r border-slate-200 pr-3">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Rentabilité Marchandises</div>
              <div className="flex justify-between">
                <span>Coût revient (CMV) :</span>
                <span className="font-mono">{formatFCFA(totalCOGS)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Marge Brute :</span>
                <span className="font-mono">+{formatFCFA(totalGrossMargin)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taux de marque :</span>
                <span className="font-mono font-bold">{marginRateSales.toFixed(1)}%</span>
              </div>
            </div>

            {/* Column 4: Encaissements */}
            <div className="space-y-1.5">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Encaissements Effectifs</div>
              <div className="flex justify-between">
                <span>Espèces :</span>
                <span className="font-mono font-bold">{formatFCFA(cashSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paiement Mobile :</span>
                <span className="font-mono font-bold text-amber-800">{formatFCFA(mobileSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Virements :</span>
                <span className="font-mono">{formatFCFA(bankSales)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-semibold border-t pt-1">
                <span>Crédits / Solde dû :</span>
                <span className="font-mono">{formatFCFA(remainingCredit)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Signatures Footer */}
      <ReportFooter language={language} showSignatures={true} />
    </div>
  );
};
