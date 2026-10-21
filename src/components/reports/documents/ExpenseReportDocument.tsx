import React from 'react';
import { CompanySettings, Expense, SalesPoint, User } from '../../../types';
import { isDateInRange } from '../../../utils/dateFilterUtils';
import { formatFCFA, formatDate, formatNumber } from '../../../utils/formatters';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';

interface ExpenseReportDocumentProps {
  expenses: Expense[];
  startDate: string;
  endDate: string;
  settings: CompanySettings;
  salesPoint: SalesPoint | null;
  currentUser: User;
  language?: 'fr' | 'en';
}

export const ExpenseReportDocument: React.FC<ExpenseReportDocumentProps> = ({
  expenses,
  startDate,
  endDate,
  settings,
  salesPoint,
  currentUser,
  language = 'fr',
}) => {
  const isEn = language === 'en';

  const filteredExpenses = expenses
    .filter(e => isDateInRange(e.date, startDate, endDate))
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Totals by category
  const categoryTotals: Record<string, { count: number; total: number }> = {};
  filteredExpenses.forEach(e => {
    if (!categoryTotals[e.category]) {
      categoryTotals[e.category] = { count: 0, total: 0 };
    }
    categoryTotals[e.category].count += 1;
    categoryTotals[e.category].total += e.amount;
  });

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between print:p-0 print:m-0 print:max-w-none">
      <div>
        <ReportHeader
          title={isEn ? 'OPERATING EXPENSES & CHARGES REPORT' : 'JOURNAL DÉTAILLÉ DES DÉPENSES D\'EXPLOITATION'}
          subtitle={
            isEn
              ? 'Itemized register of operating expenses, utilities, payroll, repairs and packaging'
              : 'Registre des décaissements d\'exploitation, énergie, loyers, salaires, entretien matériel et emballages'
          }
          startDate={startDate}
          endDate={endDate}
          settings={settings}
          salesPoint={salesPoint}
          currentUser={currentUser}
          language={language}
        />

        {/* Category Breakdown Summary Box */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-300 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3">
            {isEn ? 'OPERATING EXPENSES SUMMARY BY CATEGORY' : 'RÉCAPITULATIF DES DÉPENSES PAR POSTE'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {Object.entries(categoryTotals).map(([cat, data]) => (
              <div key={cat} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-500 block truncate" title={cat}>
                  {cat}
                </span>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="font-mono font-bold text-rose-700 text-sm">{formatFCFA(data.total)}</span>
                  <span className="text-[10px] text-slate-400">
                    {data.count} {isEn ? 'entry/entries' : 'écriture(s)'} ({((data.total / (totalAmount || 1)) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Itemized Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[9px] border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">{isEn ? 'Ref' : 'Réf.'}</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">{isEn ? 'Date & Time' : 'Date & Heure'}</th>
                <th className="p-2 border-r border-slate-300">{isEn ? 'Expense Category' : 'Catégorie de Charge'}</th>
                <th className="p-2 border-r border-slate-300">{isEn ? 'Description / Justification' : 'Description / Justification'}</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap font-bold">{isEn ? 'Amount (FCFA)' : 'Montant (FCFA)'}</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">{isEn ? 'Payment Method' : 'Règlement'}</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">{isEn ? 'Recorded by' : 'Enregistré par'}</th>
                <th className="p-2 whitespace-nowrap">{isEn ? 'Receipt / Invoice Ref' : 'Réf. Reçu / Facture'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                    {isEn ? 'No expenses recorded for this period.' : 'Aucune dépense enregistrée sur cette période.'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-rose-800 whitespace-nowrap text-[10px]">
                      {exp.referenceNumber}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-700 whitespace-nowrap font-mono text-[10px]">
                      {formatDate(exp.date)} {exp.time ? `(${exp.time})` : ''}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                      {exp.category}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-800">
                      {exp.description}
                      {exp.notes && (
                        <span className="block text-[9.5px] text-slate-500 italic">{isEn ? 'Note:' : 'Note:'} {exp.notes}</span>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-rose-700 whitespace-nowrap bg-rose-50/40">
                      {formatFCFA(exp.amount)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-600 text-[10px] capitalize whitespace-nowrap">
                      {exp.paymentMethod === 'espèces' ? (isEn ? 'Cash' : 'espèces') : exp.paymentMethod === 'paiement mobile' ? (isEn ? 'Mobile' : 'paiement mobile') : exp.paymentMethod === 'virement' ? (isEn ? 'Transfer' : 'virement') : exp.paymentMethod}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-700 text-[10px] whitespace-nowrap">
                      {exp.recordedBy}
                    </td>
                    <td className="p-2 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                      {exp.receiptReference || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-400">
                  <td colSpan={4} className="p-2.5 uppercase tracking-wider text-right border-r border-slate-300">
                    {isEn ? 'TOTAL OPERATING EXPENSES:' : 'TOTAL DES DÉPENSES D\'EXPLOITATION :'}
                  </td>
                  <td className="p-2.5 text-right font-mono text-rose-800 border-r border-slate-300 whitespace-nowrap text-xs bg-rose-100/70">
                    {formatFCFA(totalAmount)}
                  </td>
                  <td colSpan={3} className="p-2.5 text-right text-[10px] text-slate-600 font-mono">
                    {filteredExpenses.length} {isEn ? 'expense(s)' : 'dépense(s)'}
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
