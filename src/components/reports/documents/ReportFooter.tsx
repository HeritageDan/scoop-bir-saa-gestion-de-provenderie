import React from 'react';

interface ReportFooterProps {
  language?: 'fr' | 'en';
  showSignatures?: boolean;
}

export const ReportFooter: React.FC<ReportFooterProps> = ({
  language = 'fr',
  showSignatures = true,
}) => {
  const isEn = language === 'en';

  return (
    <div className="mt-8 pt-4 border-t border-slate-300 text-slate-700 text-xs font-sans break-inside-avoid">
      {/* Signatures block */}
      {showSignatures && (
        <div className="grid grid-cols-2 gap-8 mb-8 pt-4 text-center">
          <div className="border border-slate-300 rounded-lg p-3 min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-600">
              {isEn ? 'Prepared by / Cashier' : 'Établi par / Le Caissier'}
            </span>
            <span className="text-[10px] text-slate-400 italic">
              {isEn ? 'Date & Signature' : 'Date, visa & signature'}
            </span>
          </div>

          <div className="border border-slate-300 rounded-lg p-3 min-h-[90px] flex flex-col justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-600">
              {isEn ? 'Verified by / Store Manager' : 'Vérifié par / Le Responsable d\'Exploitation'}
            </span>
            <span className="text-[10px] text-slate-400 italic">
              {isEn ? 'Date & Signature' : 'Date, visa & signature'}
            </span>
          </div>
        </div>
      )}

      {/* Legal & App Watermark */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-1 border-t border-slate-100 pt-2">
        <span>
          {isEn
            ? 'Provenda Management System • Certified Financial & Inventory Engine'
            : 'Provenda Management System • Logiciel Certifié de Gestion de Provenderie & POS'}
        </span>
        <span className="italic">
          {isEn
            ? 'Confidential - Strictly for internal operational and audit use'
            : 'Document confidentiel à usage exclusif de gestion interne et audit'}
        </span>
      </div>
    </div>
  );
};
