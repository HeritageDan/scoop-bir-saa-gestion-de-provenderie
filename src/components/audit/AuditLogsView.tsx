import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  Shield,
  User,
  Calendar,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuditLog } from '../../types';
import { formatDate } from '../../utils/formatters';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, theme, language, t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = auditLogs
    .filter(log => {
      const matchesSearch =
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.targetObject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.justification || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || log.userRole === roleFilter;
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesDate = !dateFilter || (log.timestamp && log.timestamp.slice(0, 10) === dateFilter);
      return matchesSearch && matchesRole && matchesAction && matchesDate;
    })
    .sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

  const exportAuditCSV = () => {
    const headers = [
      'Date & Heure',
      'Action',
      'Objet / Document',
      'Utilisateur',
      'Rôle',
      'Justification / Contexte',
      'Données Avant',
      'Données Après',
    ];

    const rows = auditLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.targetObject}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${(l.justification || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.oldValue || {}).replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.newValue || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_audit_securite_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <History className="w-6 h-6 text-emerald-500" />
            <span>Piste d'Audit & Journal de Sécurité (Section 16)</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Traçabilité inaltérable de chaque vente, remise, annulation d'avoir, réception fournisseur et inventaire.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportAuditCSV}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Exporter Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border shadow-xs ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher action, objet, utilisateur..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Specific Date Filter */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
            dateFilter
              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
              : theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${dateFilter ? 'text-emerald-500' : 'text-slate-400'}`} />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              title={language === 'fr' ? 'Filtrer par date précise (ex: 2026-09-08)' : 'Filter by specific date (e.g. 2026-09-08)'}
              className={`bg-transparent focus:outline-none cursor-pointer text-xs font-medium ${
                dateFilter
                  ? 'text-emerald-500 font-bold'
                  : theme === 'dark'
                  ? 'text-slate-300'
                  : 'text-slate-700'
              }`}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title={language === 'fr' ? 'Effacer la date' : 'Clear date'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className={`rounded-lg px-2.5 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Tous les profils</option>
            <option value="administrateur">Administrateur</option>
            <option value="responsable">Responsable</option>
            <option value="caissier">Caissier</option>
            <option value="magasinier">Magasinier</option>
          </select>
        </div>
      </div>

      {dateFilter && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              {language === 'fr'
                ? `Filtre actif pour le ${formatDate(dateFilter)} : ${filteredLogs.length} événement(s) d'audit`
                : `Active filter for ${formatDate(dateFilter)}: ${filteredLogs.length} audit log(s)`}
            </span>
          </div>
          <button
            onClick={() => setDateFilter('')}
            className="text-xs hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <span>{language === 'fr' ? 'Effacer le filtre' : 'Clear filter'}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Audit Log Table */}
      <div className={`border rounded-xl overflow-hidden shadow-xs ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                theme === 'dark'
                  ? 'bg-slate-850 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <th className="py-3 px-3">Horodatage</th>
                <th className="py-3 px-3">Opérateur & Rôle</th>
                <th className="py-3 px-3">Action Réalisée</th>
                <th className="py-3 px-3">Cible / Référence</th>
                <th className="py-3 px-3">Justification & Détails</th>
                <th className="py-3 px-3 text-right">Détails</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredLogs.map(log => (
                <tr
                  key={log.id}
                  className={`transition ${
                    theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className={`py-3 px-3 font-mono whitespace-nowrap ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {log.userName}
                    </div>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                        log.userRole === 'administrateur'
                          ? theme === 'dark'
                            ? 'bg-purple-950 text-purple-300 border border-purple-850'
                            : 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                          : log.userRole === 'responsable'
                          ? theme === 'dark'
                            ? 'bg-blue-950 text-blue-300 border border-blue-850'
                            : 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                          : log.userRole === 'caissier'
                          ? theme === 'dark'
                            ? 'bg-amber-950 text-amber-300 border border-amber-850'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                          : theme === 'dark'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-850'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                      }`}
                    >
                      {log.userRole}
                    </span>
                  </td>
                  <td className={`py-3 px-3 font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    {log.action}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {log.targetObject}
                  </td>
                  <td className={`py-3 px-3 max-w-xs truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    {log.justification || '-'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      title="Inspecter les données JSON"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspection Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center border-b pb-3 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Trace d'Audit : {selectedLog.action}
                </h3>
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedLog.timestamp} par {selectedLog.userName} ({selectedLog.userRole})
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className={`block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Cible :
                </span>
                <span className={`font-mono font-bold px-2 py-1 rounded inline-block ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {selectedLog.targetObject}
                </span>
              </div>

              <div>
                <span className={`block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Justification :
                </span>
                <div className={`p-2.5 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {selectedLog.justification || 'Aucune justification fournie'}
                </div>
              </div>

              {selectedLog.oldValue && (
                <div>
                  <span className={`block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    État Précédent (Avant) :
                  </span>
                  <pre className={`p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto border ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-amber-300'
                  }`}>
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <span className={`block mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Nouvel État (Après) :
                  </span>
                  <pre className={`p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto border ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-emerald-300'
                  }`}>
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className={`flex justify-end pt-3 border-t ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                onClick={() => setSelectedLog(null)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
