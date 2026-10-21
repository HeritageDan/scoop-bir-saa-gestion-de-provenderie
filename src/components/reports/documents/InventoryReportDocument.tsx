import React from 'react';
import { CompanySettings, Product, SalesPoint, User } from '../../../types';
import { formatFCFA, formatNumber } from '../../../utils/formatters';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';

interface InventoryReportDocumentProps {
  products: Product[];
  categoryFilter?: string;
  settings: CompanySettings;
  salesPoint: SalesPoint | null;
  currentUser: User;
  language?: 'fr' | 'en';
}

export const InventoryReportDocument: React.FC<InventoryReportDocumentProps> = ({
  products,
  categoryFilter = 'all',
  settings,
  salesPoint,
  currentUser,
  language = 'fr',
}) => {
  const isEn = language === 'en';
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter products
  const filteredProducts = products.filter(p => {
    if (p.status === 'archivé') return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  // Aggregates
  const totalProductsCount = filteredProducts.length;
  const totalStockQtyBase = filteredProducts.reduce((sum, p) => sum + p.stockCurrentBaseUnit, 0);
  const totalStockValuation = filteredProducts.reduce((sum, p) => sum + p.stockCurrentBaseUnit * p.cmp, 0);
  const totalSaleValue = filteredProducts.reduce(
    (sum, p) => sum + (p.stockCurrentBaseUnit / (p.conversionFactor || 1)) * p.salePrice,
    0
  );
  const potentialGrossMargin = totalSaleValue - totalStockValuation;

  const lowStockCount = filteredProducts.filter(
    p => p.stockCurrentBaseUnit > 0 && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit
  ).length;

  const outOfStockCount = filteredProducts.filter(p => p.stockCurrentBaseUnit <= 0).length;

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between print:p-0 print:m-0 print:max-w-none">
      <div>
        <ReportHeader
          title={isEn ? 'PHYSICAL INVENTORY & ASSET VALUATION REPORT (CMP)' : 'ÉTAT DU STOCK PHYSIQUE & VALORISATION ACTIF (CMP)'}
          subtitle={
            isEn
              ? 'Complete stock inventory valued at Weighted Average Cost (WAC / CMP) and commercial value'
              : 'Inventaire physique intégral valorisé au Coût Moyen Pondéré (CMP) avec alertes de sécurité'
          }
          startDate={todayStr}
          endDate={todayStr}
          settings={settings}
          salesPoint={salesPoint}
          currentUser={currentUser}
          language={language}
        />

        {/* Inventory Summary Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {isEn ? 'Total Referenced Items' : 'Total Articles Référencés'}
            </span>
            <span className="text-base font-bold font-mono text-slate-900">
              {totalProductsCount} {isEn ? 'items' : 'références'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {isEn ? 'WAC Stock Valuation' : 'Valeur Actif Stock (CMP)'}
            </span>
            <span className="text-base font-bold font-mono text-emerald-800">{formatFCFA(totalStockValuation)}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {isEn ? 'Estimated Sales Value' : 'Valeur Vente Estimée'}
            </span>
            <span className="text-base font-bold font-mono text-slate-800">{formatFCFA(totalSaleValue)}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              {isEn ? 'Alerts & Shortages' : 'Alertes & Ruptures'}
            </span>
            <span className="text-xs font-bold font-mono">
              <span className="text-amber-700">{lowStockCount} {isEn ? 'alert(s)' : 'alerte(s)'}</span> • <span className="text-rose-700">{outOfStockCount} {isEn ? 'out of stock' : 'rupture(s)'}</span>
            </span>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[9px] border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">Code</th>
                <th className="p-2 border-r border-slate-300">{isEn ? 'Product Description' : 'Désignation Produit'}</th>
                <th className="p-2 border-r border-slate-300">{isEn ? 'Category' : 'Catégorie'}</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">{isEn ? 'Avail. Stock' : 'Stock Dispo'}</th>
                <th className="p-2 border-r border-slate-300 whitespace-nowrap">{isEn ? 'Pack.' : 'Condit.'}</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">{isEn ? 'Unit WAC' : 'CMP Unitaire'}</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">{isEn ? 'Sale Price' : 'Prix Vente'}</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap font-bold">{isEn ? 'WAC Value (FCFA)' : 'Valeur CMP (FCFA)'}</th>
                <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">{isEn ? 'Min Alert' : 'Seuil Mini'}</th>
                <th className="p-2 text-center whitespace-nowrap">{isEn ? 'State' : 'État'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map((p, idx) => {
                const stockVal = p.stockCurrentBaseUnit * p.cmp;
                const isOutOfStock = p.stockCurrentBaseUnit <= 0;
                const isLowStock = p.stockCurrentBaseUnit > 0 && p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit;
                const commercialQty = (p.stockCurrentBaseUnit / (p.conversionFactor || 1)).toFixed(1);

                return (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap text-[10px]">
                      {p.code}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-semibold text-slate-800">
                      {p.name}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-600 text-[10px]">
                      {p.category}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatNumber(p.stockCurrentBaseUnit)} {p.baseUnit}
                      <span className="block text-[9.5px] text-slate-500 font-normal">
                        (~{commercialQty} {p.saleUnit})
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-slate-600 text-[10px] whitespace-nowrap">
                      {p.packaging || `${p.conversionFactor} ${p.baseUnit}/${p.saleUnit}`}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatNumber(p.cmp)} FCFA
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-900 whitespace-nowrap">
                      {formatNumber(p.salePrice)} FCFA
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-900 whitespace-nowrap bg-emerald-50/40">
                      {formatFCFA(stockVal)}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-500 whitespace-nowrap">
                      {formatNumber(p.minAlertThresholdBaseUnit)} {p.baseUnit}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      {isOutOfStock ? (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                          {isEn ? 'Out of stock' : 'Rupture'}
                        </span>
                      ) : isLowStock ? (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                          {isEn ? 'Alert' : 'Alerte'}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {isEn ? 'Normal' : 'Normal'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="p-2.5 uppercase tracking-wider text-right border-r border-slate-300">
                  {isEn ? 'GLOBAL STOCK TOTALS:' : 'TOTAUX GLOBAUX DU STOCK :'}
                </td>
                <td className="p-2.5 text-right font-mono border-r border-slate-300 whitespace-nowrap">
                  {formatNumber(totalStockQtyBase)} kg/L
                </td>
                <td colSpan={3} className="border-r border-slate-300"></td>
                <td className="p-2.5 text-right font-mono text-slate-900 font-bold border-r border-slate-300 whitespace-nowrap text-xs bg-slate-200">
                  {formatFCFA(totalStockValuation)}
                </td>
                <td colSpan={2} className="p-2.5 text-right text-[10px] text-slate-600 font-mono">
                  {isEn ? 'Potential margin:' : 'Marge potentielle:'} {formatFCFA(potentialGrossMargin)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <ReportFooter language={language} showSignatures={true} />
    </div>
  );
};
