import React from 'react';
import { CompanySettings, Expense, Invoice, Product, Purchase, SalesPoint, User } from '../../../types';
import { isDateInRange } from '../../../utils/dateFilterUtils';
import { formatFCFA, formatDate, formatNumber } from '../../../utils/formatters';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';

interface FinancialReportDocumentProps {
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  startDate: string;
  endDate: string;
  settings: CompanySettings;
  salesPoint: SalesPoint | null;
  currentUser: User;
  language?: 'fr' | 'en';
}

export const FinancialReportDocument: React.FC<FinancialReportDocumentProps> = ({
  invoices,
  purchases,
  expenses,
  products,
  startDate,
  endDate,
  settings,
  salesPoint,
  currentUser,
  language = 'fr',
}) => {
  const isEn = language === 'en';

  // 1. REVENUE (Invoices within date range)
  const validInvoices = invoices.filter(
    inv => inv.status !== 'annulée' && isDateInRange(inv.date, startDate, endDate)
  );

  const totalGrossRevenue = validInvoices.reduce((sum, inv) => sum + inv.subtotalGross, 0);
  const totalDiscounts = validInvoices.reduce((sum, inv) => sum + inv.totalDiscount, 0);
  const totalNetRevenue = validInvoices.reduce((sum, inv) => sum + inv.totalNet, 0);
  const totalCOGS = validInvoices.reduce((sum, inv) => sum + inv.totalCostOfGoodsSold, 0);
  const grossProfit = totalNetRevenue - totalCOGS;

  // Revenue by payment method
  let cashRevenue = 0;
  let mobileRevenue = 0;
  let bankRevenue = 0;
  let unpaidDebtRevenue = 0;

  validInvoices.forEach(inv => {
    (inv.payments || []).forEach(p => {
      if (p.method === 'espèces') cashRevenue += p.amount;
      else if (p.method === 'paiement mobile') mobileRevenue += p.amount;
      else if (p.method === 'virement') bankRevenue += p.amount;
    });
    if (inv.remainingBalance > 0) {
      unpaidDebtRevenue += inv.remainingBalance;
    }
  });

  // Revenue by product category
  const revenueByCategory: Record<string, { revenue: number; cogs: number; margin: number }> = {};
  validInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const cat = prod?.category || 'Aliments finis';
      if (!revenueByCategory[cat]) {
        revenueByCategory[cat] = { revenue: 0, cogs: 0, margin: 0 };
      }
      revenueByCategory[cat].revenue += item.totalNet;
      revenueByCategory[cat].cogs += item.costOfGoodsSold;
      revenueByCategory[cat].margin += item.grossMargin;
    });
  });

  // 2. PURCHASES (within date range)
  const validPurchases = purchases.filter(
    p => p.status === 'validé' && isDateInRange(p.receptionDate || p.orderDate, startDate, endDate)
  );
  const totalPurchasesAmount = validPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalTransportLandedCosts = validPurchases.reduce((sum, p) => sum + (p.transportFees || 0), 0);

  // Purchases by supplier
  const purchasesBySupplier: Record<string, { count: number; total: number }> = {};
  validPurchases.forEach(p => {
    const sName = p.supplierName || 'Fournisseur Inconnu';
    if (!purchasesBySupplier[sName]) {
      purchasesBySupplier[sName] = { count: 0, total: 0 };
    }
    purchasesBySupplier[sName].count += 1;
    purchasesBySupplier[sName].total += p.totalAmount;
  });

  // 3. OPERATING EXPENSES (within date range)
  const validExpenses = expenses.filter(e => isDateInRange(e.date, startDate, endDate));
  const totalOperatingExpenses = validExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Expenses by category
  const expensesByCategory: Record<string, number> = {};
  validExpenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
  });

  // 4. NET PROFITABILITY (Income Statement / Compte de Résultat Simplifié)
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = totalNetRevenue > 0 ? (netProfit / totalNetRevenue) * 100 : 0;

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between print:p-0 print:m-0 print:max-w-none">
      <div>
        {/* Header */}
        <ReportHeader
          title={isEn ? 'EXECUTIVE FINANCIAL & PROFITABILITY REPORT' : 'ÉTAT FINANCIER & COMPTE D\'EXPLOITATION'}
          subtitle={
            isEn
              ? 'Consolidated operational income statement: Revenues, Cost of Goods Sold (CMP), Purchases, Operating Charges and Net Income'
              : 'Compte de résultat analytique : Chiffre d\'affaires net, Coût des ventes (CMP), Achats, Charges d\'exploitation et Résultat net réel'
          }
          startDate={startDate}
          endDate={endDate}
          settings={settings}
          salesPoint={salesPoint}
          currentUser={currentUser}
          language={language}
        />

        {/* SECTION 1: MASTER INCOME STATEMENT / TABLEAU DE RÉSULTAT */}
        <div className="mb-6 border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50">
          <div className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between">
            <span>{isEn ? '1. INCOME STATEMENT (PROFIT & LOSS)' : '1. TABLEAU DE RÉSULTAT D\'EXPLOITATION'}</span>
            <span className="font-mono text-emerald-400">Période d'évaluation</span>
          </div>

          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-white">
                <td className="p-3 font-semibold text-slate-800">
                  Chiffre d'Affaires Brut (Facturations émises)
                </td>
                <td className="p-3 text-right font-mono font-bold text-slate-800">
                  {formatFCFA(totalGrossRevenue)}
                </td>
              </tr>
              <tr className="bg-slate-50/60 text-amber-800">
                <td className="p-3 pl-8">
                  - Rabais, remises et ristournes commerciales accordées
                </td>
                <td className="p-3 text-right font-mono font-semibold">
                  -{formatFCFA(totalDiscounts)}
                </td>
              </tr>
              <tr className="bg-emerald-50/70 font-bold text-slate-900 border-t border-slate-300">
                <td className="p-3 text-emerald-950 uppercase tracking-tight">
                  = CHIFFRE D'AFFAIRES NET COMMERCIAL
                </td>
                <td className="p-3 text-right font-mono text-emerald-900 text-sm">
                  {formatFCFA(totalNetRevenue)}
                </td>
              </tr>
              <tr className="bg-white text-slate-700">
                <td className="p-3 pl-8">
                  - Coût des Marchandises Vendues (CMV valorisé au CMP historique des sorties)
                </td>
                <td className="p-3 text-right font-mono text-slate-800">
                  -{formatFCFA(totalCOGS)}
                </td>
              </tr>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
                <td className="p-3 uppercase">
                  = MARGE BRUTE DÉGAGÉE SUR MARCHANDISES
                </td>
                <td className="p-3 text-right font-mono text-emerald-800 text-sm">
                  +{formatFCFA(grossProfit)}
                </td>
              </tr>
              <tr className="bg-rose-50/50 text-rose-900">
                <td className="p-3 pl-8">
                  - Charges d'exploitation décaissées (loyers, électricité, salaires, maintenance, sacs, etc.)
                </td>
                <td className="p-3 text-right font-mono font-semibold text-rose-700">
                  -{formatFCFA(totalOperatingExpenses)}
                </td>
              </tr>
              <tr className={`border-t-2 border-slate-900 text-sm font-black ${
                netProfit >= 0 ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
              }`}>
                <td className="p-3.5 uppercase tracking-wide">
                  = RÉSULTAT NET D'EXPLOITATION (BÉNÉFICE / PERTE)
                </td>
                <td className="p-3.5 text-right font-mono text-base">
                  {netProfit >= 0 ? `+${formatFCFA(netProfit)}` : formatFCFA(netProfit)}
                  <span className="block text-[10px] font-sans font-normal opacity-80">
                    Taux net : {netMarginPercent.toFixed(1)}% du CA
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 2: BREAKDOWN BY CATEGORIES & PAYMENT MODES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Revenue by category */}
          <div className="border border-slate-300 rounded-xl overflow-hidden p-3 bg-white">
            <h4 className="text-[11px] font-bold uppercase text-slate-800 border-b pb-1.5 mb-2">
              Ventes & Marges par Catégorie de Produit
            </h4>
            <table className="w-full text-[10.5px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[9px]">
                <tr>
                  <th className="p-1.5 text-left">Catégorie</th>
                  <th className="p-1.5 text-right">CA Net</th>
                  <th className="p-1.5 text-right">Marge Brute</th>
                  <th className="p-1.5 text-right">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {Object.entries(revenueByCategory).map(([cat, data]) => (
                  <tr key={cat}>
                    <td className="p-1.5 font-sans text-slate-800 font-medium truncate max-w-[120px]">{cat}</td>
                    <td className="p-1.5 text-right">{formatNumber(data.revenue)}</td>
                    <td className="p-1.5 text-right text-emerald-700 font-semibold">{formatNumber(data.margin)}</td>
                    <td className="p-1.5 text-right text-slate-500">
                      {data.revenue > 0 ? ((data.margin / data.revenue) * 100).toFixed(0) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Operating expenses by category */}
          <div className="border border-slate-300 rounded-xl overflow-hidden p-3 bg-white">
            <h4 className="text-[11px] font-bold uppercase text-slate-800 border-b pb-1.5 mb-2">
              Ventilation des Dépenses d'Exploitation
            </h4>
            <table className="w-full text-[10.5px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[9px]">
                <tr>
                  <th className="p-1.5 text-left">Poste de Dépense</th>
                  <th className="p-1.5 text-right">Montant (FCFA)</th>
                  <th className="p-1.5 text-right">Part (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {Object.entries(expensesByCategory).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-2 text-center text-slate-400 italic font-sans text-xs">
                      Aucune dépense enregistrée sur cette période
                    </td>
                  </tr>
                ) : (
                  Object.entries(expensesByCategory).map(([cat, amt]) => (
                    <tr key={cat}>
                      <td className="p-1.5 font-sans text-slate-800 font-medium truncate max-w-[140px]">{cat}</td>
                      <td className="p-1.5 text-right text-rose-700 font-semibold">{formatNumber(amt)}</td>
                      <td className="p-1.5 text-right text-slate-500">
                        {totalOperatingExpenses > 0 ? ((amt / totalOperatingExpenses) * 100).toFixed(0) : 0}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {totalOperatingExpenses > 0 && (
                <tfoot>
                  <tr className="border-t font-bold bg-slate-50 text-slate-900">
                    <td className="p-1.5 font-sans uppercase text-[9px]">Total Charges</td>
                    <td className="p-1.5 text-right font-mono text-rose-800">{formatFCFA(totalOperatingExpenses)}</td>
                    <td className="p-1.5 text-right font-mono">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* SECTION 3: PURCHASES & CASH INFLOW RECONCILIATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3.5 bg-slate-50/70 text-xs">
          <div>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-2">
              Approvisionnements Fournisseurs
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Bons de réceptions validés :</span>
                <span className="font-mono font-bold">{validPurchases.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Valeur totale des achats :</span>
                <span className="font-mono font-bold text-slate-900">{formatFCFA(totalPurchasesAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>Dont frais d'approche (Transport) :</span>
                <span className="font-mono">{formatFCFA(totalTransportLandedCosts)}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                * Les frais de transport et de déchargement sont directement incorporés dans la valorisation du CMP.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-800 mb-2">
              Structure des Règlements Clients
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Espèces en caisse :</span>
                <span className="font-mono font-bold text-slate-900">{formatFCFA(cashRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Paiement Mobile (MoMo / OM) :</span>
                <span className="font-mono font-bold text-emerald-800">{formatFCFA(mobileRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Virements bancaires :</span>
                <span className="font-mono font-bold">{formatFCFA(bankRevenue)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1 text-rose-800 font-bold">
                <span>Crédits / Solde restant dû :</span>
                <span className="font-mono">{formatFCFA(unpaidDebtRevenue)}</span>
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
