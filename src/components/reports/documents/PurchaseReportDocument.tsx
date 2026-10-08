import React from 'react';
import { CompanySettings, Purchase, SalesPoint, User } from '../../../types';
import { isDateInRange } from '../../../utils/dateFilterUtils';
import { formatFCFA, formatDate, formatNumber } from '../../../utils/formatters';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';

interface PurchaseReportDocumentProps {
  purchases: Purchase[];
  startDate: string;
  endDate: string;
  settings: CompanySettings;
  salesPoint: SalesPoint | null;
  currentUser: User;
  language?: 'fr' | 'en';
}

export const PurchaseReportDocument: React.FC<PurchaseReportDocumentProps> = ({
  purchases,
  startDate,
  endDate,
  settings,
  salesPoint,
  currentUser,
  language = 'fr',
}) => {
  const isEn = language === 'en';

  // Filter purchases strictly by receptionDate or orderDate in range
  const filteredPurchases = purchases
    .filter(p => {
      const d = p.receptionDate || p.orderDate;
      return isDateInRange(d, startDate, endDate);
    })
    .sort((a, b) => {
      const timeA = new Date(a.receptionDate || a.orderDate).getTime();
      const timeB = new Date(b.receptionDate || b.orderDate).getTime();
      return timeB - timeA;
    });

  const totalLinesValue = filteredPurchases.reduce((sum, p) => sum + p.subtotal, 0);
  const totalTransportFees = filteredPurchases.reduce((sum, p) => sum + (p.transportFees || 0), 0);
  const totalOtherFees = filteredPurchases.reduce((sum, p) => sum + (p.otherFees || 0), 0);
  const grandTotal = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between print:p-0 print:m-0 print:max-w-none">
      <div>
        <ReportHeader
          title={isEn ? 'PURCHASE ORDERS & RECEPTIONS REPORT' : 'JOURNAL DES APPROVISIONNEMENTS & ACHATS FOURNISSEURS'}
          subtitle={
            isEn
              ? 'Complete ledger of purchase deliveries, attributable transport fees and landed cost impact'
              : 'Répertoire détaillé des réceptions de matières premières, frais de transport et coûts de revient d\'entrée'
          }
          startDate={startDate}
          endDate={endDate}
          settings={settings}
          salesPoint={salesPoint}
          currentUser={currentUser}
          language={language}
        />

        {/* Purchases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[9px] border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">Réf. Bon</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">Date Réception</th>
                <th className="p-2 border-r border-slate-300">Fournisseur & Réf BL</th>
                <th className="p-2 border-r border-slate-300">Articles Réceptionnés</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">Sous-total (FCFA)</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">Transport (Frais)</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap font-bold">Total TTC (FCFA)</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">Réceptionné par</th>
                <th className="p-2 text-center whitespace-nowrap">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500 italic">
                    Aucun achat ou approvisionnement sur cette période.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p, idx) => (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap text-[10px]">
                      {p.referenceNumber}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-700 whitespace-nowrap font-mono text-[10px]">
                      {formatDate(p.receptionDate || p.orderDate)}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-medium">
                      <span className="text-slate-900">{p.supplierName}</span>
                      {p.supplierDocumentRef && (
                        <span className="block text-[9.5px] font-mono text-slate-500">
                          BL: {p.supplierDocumentRef}
                        </span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="space-y-1">
                        {p.items.map((item, i) => (
                          <div key={i} className="text-[10px] flex justify-between gap-1">
                            <span className="text-slate-700 truncate max-w-[130px]">{item.productName}</span>
                            <span className="font-mono text-slate-900 whitespace-nowrap">
                              {item.quantityReceived} {item.unit} × {formatNumber(item.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-800 whitespace-nowrap">
                      {formatNumber(p.subtotal)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-amber-800 whitespace-nowrap">
                      {p.transportFees > 0 ? `+${formatNumber(p.transportFees)}` : '0'}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap bg-emerald-50/40">
                      {formatFCFA(p.totalAmount)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-600 text-[10px] whitespace-nowrap">
                      {p.userName}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase ${
                          p.status === 'validé'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : p.status === 'brouillon'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredPurchases.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-400">
                  <td colSpan={4} className="p-2.5 uppercase tracking-wider text-right border-r border-slate-300">
                    TOTAUX ACHATS DE LA PÉRIODE :
                  </td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-300 whitespace-nowrap">
                    {formatFCFA(totalLinesValue)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-amber-900 border-r border-slate-300 whitespace-nowrap">
                    {formatFCFA(totalTransportFees)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-900 border-r border-slate-300 whitespace-nowrap text-xs bg-emerald-100/70">
                    {formatFCFA(grandTotal)}
                  </td>
                  <td colSpan={2} className="p-2.5 text-right text-[10px] text-slate-600 font-mono">
                    {filteredPurchases.length} bon(s) d'achat
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <ReportFooter language={language} showSignatures={true} />
    </div>
  );
};
