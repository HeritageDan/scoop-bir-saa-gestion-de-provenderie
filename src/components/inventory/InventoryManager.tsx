import React, { useState } from 'react';
import {
  ClipboardList,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Search,
  Scale,
  Calendar,
  X,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InventorySession, ProductCategory } from '../../types';
import { formatFCFA, formatDate, formatNumber } from '../../utils/formatters';

export const InventoryManager: React.FC = () => {
  const {
    inventories,
    products,
    currentUser,
    createInventorySession,
    validateInventorySession,
    theme,
    language,
    t,
  } = useApp();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCatFilter, setNewCatFilter] = useState<string>('all');

  // Count inputs during active session: productId -> { physicalStock, reason }
  const [counts, setCounts] = useState<Record<string, { physicalStock: number; reason: string }>>({});
  const [validationNotes, setValidationNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const sortedInventories = [...inventories].sort((a, b) => {
    const timeA = new Date(a.startDate).getTime();
    const timeB = new Date(b.startDate).getTime();
    return timeB - timeA;
  });

  const activeSession = inventories.find(s => s.id === activeSessionId) || null;

  const handleOpenSession = (session: InventorySession) => {
    setActiveSessionId(session.id);
    const initialCounts: Record<string, { physicalStock: number; reason: string }> = {};
    session.items.forEach(item => {
      initialCounts[item.productId] = {
        physicalStock: item.physicalStock,
        reason: item.reason || '',
      };
    });
    setCounts(initialCounts);
    setValidationNotes(session.notes || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleStartNewInventory = () => {
    const id = createInventorySession(newCatFilter);
    setShowCreateModal(false);
    const createdSession = inventories.find(s => s.id === id);
    if (createdSession) {
      handleOpenSession(createdSession);
    }
  };

  const handleCountChange = (productId: string, val: number) => {
    setCounts(prev => ({
      ...prev,
      [productId]: {
        physicalStock: val,
        reason: prev[productId]?.reason || '',
      },
    }));
  };

  const handleReasonChange = (productId: string, reason: string) => {
    setCounts(prev => ({
      ...prev,
      [productId]: {
        physicalStock: prev[productId]?.physicalStock ?? 0,
        reason,
      },
    }));
  };

  const handleValidateSession = () => {
    if (!activeSession) return;
    setErrorMsg('');

    // Check permission
    if (currentUser.role !== 'responsable' && currentUser.role !== 'administrateur' && currentUser.role !== 'developpeur') {
      setErrorMsg(
        language === 'fr'
          ? "Seul un Responsable, un Administrateur ou le Développeur peut valider les ajustements d'inventaire."
          : 'Only a Manager, Administrator or Developer can validate inventory adjustments.'
      );
      return;
    }

    const payload = Object.entries(counts).map(([productId, val]) => ({
      productId,
      physicalStock: Number(val.physicalStock),
      reason: val.reason,
    }));

    const res = validateInventorySession(activeSession.id, payload, validationNotes);
    if (!res.success) {
      setErrorMsg(res.error || 'Erreur lors de la validation');
    } else {
      setSuccessMsg(
        language === 'fr'
          ? "Inventaire validé avec succès ! Mouvements d'ajustement et audit créés."
          : 'Inventory validated successfully! Adjustment movements and audit logged.'
      );
      setTimeout(() => {
        setActiveSessionId(null);
      }, 1500);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <ClipboardList className="w-6 h-6 text-emerald-500" />
            <span>Inventaires Physiques & Gestion des Écarts</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Contrôle contradictoire, calcul des écarts magasin/théorique et régularisation auditée.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(currentUser.role === 'administrateur' ||
            currentUser.role === 'responsable' ||
            currentUser.role === 'magasinier' ||
            currentUser.role === 'developpeur') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Démarrer un Inventaire</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!activeSession ? (
        /* List of Inventory Sessions */
        <div className="space-y-4">
          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Sessions d'Inventaires Récentes
              </h2>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {inventories.length} session(s) enregistrée(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                    theme === 'dark'
                      ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                      : 'bg-slate-50/80 border-slate-200 text-slate-600'
                  }`}>
                    <th className="py-3 px-3">{language === 'fr' ? 'Réf. Session' : 'Session Ref'}</th>
                    <th className="py-3 px-3">{language === 'fr' ? 'Période / Date' : 'Period / Date'}</th>
                    <th className="py-3 px-3">{language === 'fr' ? 'Périmètre' : 'Scope'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'Valeur Théorique' : 'Theoretical Value'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'Valeur Physique' : 'Counted Value'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'Écart Financier' : 'Financial Variance'}</th>
                    <th className="py-3 px-3 text-center">{language === 'fr' ? 'Statut' : 'Status'}</th>
                    <th className="py-3 px-3 text-right">{language === 'fr' ? 'Action' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {sortedInventories.map(inv => (
                    <tr
                      key={inv.id}
                      className={`transition ${
                        theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`py-3 px-3 font-mono font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        {inv.referenceNumber}
                      </td>
                      <td className={`py-3 px-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {inv.startDate} {inv.endDate ? `au ${inv.endDate.slice(11)}` : ''}
                      </td>
                      <td className={`py-3 px-3 capitalize ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {inv.categoryFilter === 'all' ? 'Magasin complet' : inv.categoryFilter}
                      </td>
                      <td className={`py-3 px-3 text-right ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {formatFCFA(inv.totalTheoreticalStockValue)}
                      </td>
                      <td className={`py-3 px-3 text-right font-semibold ${
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-900'
                      }`}>
                        {formatFCFA(inv.totalPhysicalStockValue)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          inv.totalVarianceValue < 0
                            ? 'text-rose-500 dark:text-rose-400'
                            : inv.totalVarianceValue > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {inv.totalVarianceValue > 0 ? '+' : ''}
                        {formatFCFA(inv.totalVarianceValue)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            inv.status === 'validé'
                              ? theme === 'dark'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                              : theme === 'dark'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold'
                          }`}
                        >
                          {inv.status === 'validé' ? 'Validé & Ajusté' : 'En cours de saisie'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenSession(inv)}
                          className={`px-3 py-1 rounded text-xs transition cursor-pointer font-medium ${
                            theme === 'dark'
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {inv.status === 'en_cours' ? 'Poursuivre Saisie' : 'Consulter Écarts'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Active Counting Session View */
        <div className="space-y-4">
          <div className={`border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Session d'Inventaire : {activeSession.referenceNumber}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    activeSession.status === 'validé'
                      ? theme === 'dark'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : theme === 'dark'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {activeSession.status === 'validé' ? 'Validé' : 'En cours'}
                </span>
              </div>
              <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Initié le {activeSession.startDate} par {activeSession.createdBy} · Périmètre :{' '}
                {activeSession.categoryFilter === 'all'
                  ? 'Tous les produits'
                  : activeSession.categoryFilter}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSessionId(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Retour à la liste
              </button>

              {activeSession.status === 'en_cours' && (
                <button
                  onClick={handleValidateSession}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Valider les Écarts & Mettre à Jour le Stock</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Counting Table */}
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
                    <th className="py-3 px-3">Produit</th>
                    <th className="py-3 px-3 text-right">Stock Théorique (Système)</th>
                    <th className="py-3 px-3 text-right">Stock Physique Constaté</th>
                    <th className="py-3 px-3 text-right">Écart Quantité</th>
                    <th className="py-3 px-3 text-right">CMP Réf.</th>
                    <th className="py-3 px-3 text-right">Impact Financier</th>
                    <th className="py-3 px-3">Justification Obligatoire de l'Écart</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {activeSession.items.map(item => {
                    const countEntry = counts[item.productId] || {
                      physicalStock: item.physicalStock,
                      reason: item.reason || '',
                    };
                    const currentPhys =
                      activeSession.status === 'en_cours'
                        ? countEntry.physicalStock
                        : item.physicalStock;
                    const variance = currentPhys - item.theoreticalStock;
                    const varianceValue = variance * item.cmp;

                    return (
                      <tr
                        key={item.productId}
                        className={`transition ${
                          theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {item.productName}
                          </div>
                          <div className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.productCode}
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-right font-medium ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {formatNumber(item.theoreticalStock)} {item.baseUnit}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {activeSession.status === 'en_cours' ? (
                            <input
                              type="number"
                              value={currentPhys}
                              onChange={e =>
                                handleCountChange(item.productId, Number(e.target.value))
                              }
                              className={`w-24 rounded px-2 py-1 text-right font-bold text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                              }`}
                            />
                          ) : (
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {formatNumber(currentPhys)} {item.baseUnit}
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold text-sm ${
                            variance < 0
                              ? 'text-rose-500 dark:text-rose-400'
                              : variance > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {variance > 0 ? '+' : ''}
                          {formatNumber(variance)} {item.baseUnit}
                        </td>
                        <td className={`py-3 px-3 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatFCFA(item.cmp)}/{item.baseUnit}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold ${
                            varianceValue < 0
                              ? 'text-rose-500 dark:text-rose-400'
                              : varianceValue > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {varianceValue > 0 ? '+' : ''}
                          {formatFCFA(varianceValue)}
                        </td>
                        <td className="py-3 px-3 min-w-[200px]">
                          {activeSession.status === 'en_cours' ? (
                            <input
                              type="text"
                              value={countEntry.reason}
                              onChange={e => handleReasonChange(item.productId, e.target.value)}
                              placeholder={
                                variance !== 0
                                  ? 'Ex: Sac percé, erreur précédente...'
                                  : 'Conforme'
                              }
                              className={`w-full rounded px-2 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                variance !== 0 && !countEntry.reason
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          ) : (
                            <span className={`italic ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                              {item.reason || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE INVENTORY MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center border-b pb-3 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
                <span>Lancer une Campagne d'Inventaire</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-1 rounded-lg transition ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className={`leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Cette opération figera la photo théorique des stocks du magasin pour comparaison
                avec le comptage physique.
              </p>

              <div>
                <label className={`block font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Périmètre de l'inventaire :
                </label>
                <select
                  value={newCatFilter}
                  onChange={e => setNewCatFilter(e.target.value)}
                  className={`w-full rounded-lg p-2 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                  }`}
                >
                  <option value="all">Inventaire complet (Toutes les familles de produits)</option>
                  <option value="Matières premières">Matières premières uniquement</option>
                  <option value="Concentrés, prémix et compléments">
                    Concentrés, prémix et compléments
                  </option>
                  <option value="Aliments finis">Aliments finis uniquement</option>
                </select>
              </div>

              <div className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                theme === 'dark'
                  ? 'bg-slate-850 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Règles de conformité (Section 12) :
                </div>
                <div>• Le stock n'est pas modifié pendant la saisie.</div>
                <div>• Tout écart nécessite un motif consigné dans l'audit.</div>
                <div>• La validation finale est réservée au Responsable ou Administrateur.</div>
              </div>
            </div>

            <div className={`flex justify-end gap-2 pt-2 border-t ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleStartNewInventory}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm cursor-pointer transition"
              >
                Créer la Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
