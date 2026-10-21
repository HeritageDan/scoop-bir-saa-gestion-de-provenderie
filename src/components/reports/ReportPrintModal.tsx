import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SalesReportDocument } from './documents/SalesReportDocument';
import { FinancialReportDocument } from './documents/FinancialReportDocument';
import { InventoryReportDocument } from './documents/InventoryReportDocument';
import { PurchaseReportDocument } from './documents/PurchaseReportDocument';
import { ExpenseReportDocument } from './documents/ExpenseReportDocument';
import {
  generateSalesReportPDF,
  generateFinancialReportPDF,
  generateInventoryReportPDF,
  generatePurchaseReportPDF,
  generateExpenseReportPDF,
} from '../../utils/reportPdfGenerator';

export type ReportDocType = 'sales' | 'financial' | 'inventory' | 'purchases' | 'expenses';

interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportDocType;
  startDate: string;
  endDate: string;
  categoryFilter?: string;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  reportType,
  startDate,
  endDate,
  categoryFilter = 'all',
}) => {
  const {
    invoices,
    purchases,
    expenses,
    products,
    settings,
    currentSalesPoint,
    currentUser,
    language,
    theme,
  } = useApp();

  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExporting, setIsExporting] = useState(false);

  const isEn = language === 'en';

  if (!isOpen) return null;

  const handlePrint = () => {
    // Triggers browser print dialog. CSS rules in index.css isolate #report-print-root.
    window.print();
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      if (reportType === 'sales') {
        generateSalesReportPDF(invoices, startDate, endDate, settings, currentSalesPoint, currentUser, language, expenses);
      } else if (reportType === 'financial') {
        generateFinancialReportPDF(invoices, purchases, expenses, products, startDate, endDate, settings, currentSalesPoint, currentUser, language);
      } else if (reportType === 'inventory') {
        generateInventoryReportPDF(products, categoryFilter, settings, currentSalesPoint, currentUser, language);
      } else if (reportType === 'purchases') {
        generatePurchaseReportPDF(purchases, startDate, endDate, settings, currentSalesPoint, currentUser, language);
      } else if (reportType === 'expenses') {
        generateExpenseReportPDF(expenses, startDate, endDate, settings, currentSalesPoint, currentUser, language);
      }
    } catch (err) {
      console.error('Error generating PDF report:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'sales':
        return isEn ? 'Detailed Sales & Cash Receipts Journal' : 'Journal Détaillé des Ventes & Encaissements';
      case 'financial':
        return isEn ? 'Financial Statement & Analytical Income Report' : 'État Financier & Compte d\'Exploitation Analytique';
      case 'inventory':
        return isEn ? 'Physical Inventory & WAC Asset Valuation' : 'État du Stock Physique & Valorisation CMP';
      case 'purchases':
        return isEn ? 'Purchases & Supplies Journal' : 'Journal des Approvisionnements & Achats';
      case 'expenses':
        return isEn ? 'Detailed Operating Expenses Journal' : 'Journal Détaillé des Dépenses d\'Exploitation';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/85 backdrop-blur-xs flex flex-col">
      {/* Top Floating Control Bar (Hidden on print) */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0 print:hidden shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isEn ? 'Close preview' : 'Fermer la prévisualisation'}
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
                {getReportTitle()}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {isEn ? `Period: ${startDate} to ${endDate}` : `Période du ${startDate} au ${endDate}`}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
              className="p-1.5 hover:text-white text-slate-400 transition"
              title={isEn ? 'Zoom out' : 'Réduire'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-slate-300 font-bold">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
              className="p-1.5 hover:text-white text-slate-400 transition"
              title={isEn ? 'Zoom in' : 'Agrandir'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:text-white text-slate-400 transition border-l border-slate-700 ml-0.5"
              title={isEn ? 'Actual size (100%)' : 'Taille réelle (100%)'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>
              {isExporting
                ? (isEn ? 'Generating...' : 'Génération...')
                : (isEn ? 'Download PDF' : 'Télécharger PDF')}
            </span>
          </button>

          {/* Native Print Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/30"
          >
            <Printer className="w-4 h-4" />
            <span>{isEn ? 'Print Report' : 'Imprimer le Rapport'}</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container with realistic paper canvas */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950 flex justify-center print:p-0 print:m-0 print:bg-white print:overflow-visible">
        <div
          id="report-print-root"
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            transformOrigin: 'top center',
          }}
          className="shadow-2xl rounded-sm transition-transform duration-100 ease-out bg-white print:shadow-none print:transform-none print:w-full"
        >
          {reportType === 'sales' && (
            <SalesReportDocument
              invoices={invoices}
              startDate={startDate}
              endDate={endDate}
              settings={settings}
              salesPoint={currentSalesPoint}
              currentUser={currentUser}
              language={language}
              expenses={expenses}
            />
          )}

          {reportType === 'financial' && (
            <FinancialReportDocument
              invoices={invoices}
              purchases={purchases}
              expenses={expenses}
              products={products}
              startDate={startDate}
              endDate={endDate}
              settings={settings}
              salesPoint={currentSalesPoint}
              currentUser={currentUser}
              language={language}
            />
          )}

          {reportType === 'inventory' && (
            <InventoryReportDocument
              products={products}
              categoryFilter={categoryFilter}
              settings={settings}
              salesPoint={currentSalesPoint}
              currentUser={currentUser}
              language={language}
            />
          )}

          {reportType === 'purchases' && (
            <PurchaseReportDocument
              purchases={purchases}
              startDate={startDate}
              endDate={endDate}
              settings={settings}
              salesPoint={currentSalesPoint}
              currentUser={currentUser}
              language={language}
            />
          )}

          {reportType === 'expenses' && (
            <ExpenseReportDocument
              expenses={expenses}
              startDate={startDate}
              endDate={endDate}
              settings={settings}
              salesPoint={currentSalesPoint}
              currentUser={currentUser}
              language={language}
            />
          )}
        </div>
      </div>
    </div>
  );
};
