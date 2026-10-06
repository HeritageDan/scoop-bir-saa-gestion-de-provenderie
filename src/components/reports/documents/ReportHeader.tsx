import React from 'react';
import { CompanySettings, SalesPoint, User } from '../../../types';
import { formatHumanDateRange } from '../../../utils/dateFilterUtils';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  settings: CompanySettings;
  salesPoint: SalesPoint | null;
  currentUser: User;
  language?: 'fr' | 'en';
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  startDate,
  endDate,
  settings,
  salesPoint,
  currentUser,
  language = 'fr',
}) => {
  const isEn = language === 'en';
  const now = new Date();
  const printDateStr = now.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const printTimeStr = now.toTimeString().slice(0, 5);

  return (
    <div className="border-b-2 border-slate-900 pb-4 mb-6 text-slate-900 font-sans">
      {/* Top Banner */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          {settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt={settings.name || 'COOPS BIR SAA'}
              className="w-16 h-16 object-contain rounded border border-slate-300 p-1 bg-white shrink-0"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-emerald-800 uppercase">
                {settings.name || 'COOPS BIR SAA'}
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                {settings.legalStatus || 'PROVENDERIE'}
              </span>
            </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {salesPoint?.name ? `${salesPoint.name} — ` : ''}
            {salesPoint?.address || settings.address || 'Zone Industrielle Bassa, Douala'}
          </p>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 mt-1">
              <span>Tél: {salesPoint?.phone || settings.phone1}</span>
              {settings.email && <span>Email: {settings.email}</span>}
              {settings.taxId && <span>NIF: {settings.taxId}</span>}
              {settings.tradeRegisterNumber && <span>RCCM: {settings.tradeRegisterNumber}</span>}
            </div>
          </div>
        </div>

        {/* Document Generation Metadata */}
        <div className="text-right text-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isEn ? 'OFFICIAL BUSINESS REPORT' : 'DOCUMENT DE GESTION OFFICIEL'}
          </div>
          <div className="font-semibold text-slate-800 mt-1">
            {isEn ? 'Date of Issue:' : 'Date d\'édition :'} <span className="font-mono">{printDateStr} à {printTimeStr}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {isEn ? 'Issued by:' : 'Édité par :'} <span className="font-medium text-slate-700">{currentUser.name}</span> ({currentUser.role})
          </div>
        </div>
      </div>

      {/* Title & Selected Period Badge */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 self-start sm:self-auto text-right">
          <div className="text-[10px] uppercase font-bold text-slate-500">
            {isEn ? 'Selected Period' : 'Période d\'analyse'}
          </div>
          <div className="text-xs font-bold text-emerald-900 font-mono">
            {formatHumanDateRange(startDate, endDate, language)}
          </div>
        </div>
      </div>
    </div>
  );
};
