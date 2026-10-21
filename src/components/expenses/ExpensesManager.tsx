import React, { useState } from 'react';
import {
  Wallet,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Calendar,
  Building,
  CreditCard,
  FileText,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  X,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense, ExpenseCategory, ExpensePaymentMethod } from '../../types';
import { formatFCFA, formatDate } from '../../utils/formatters';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Loyer & Charges locatives',
  'Électricité & Eau',
  'Salaires & Primes du personnel',
  'Entretien & Réparation broyeur/mélangeur',
  'Transport & Carburant logistique',
  'Sacs, ficelles & Emballages',
  'Fournitures de bureau & Télécom',
  'Impôts, taxes & Droits de marché',
  'Frais financiers & Services bancaires',
  'Autres charges opérationnelles',
];

interface ExpensesManagerProps {
  onOpenReport?: (type: 'expenses') => void;
}

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({ onOpenReport }) => {
  const {
    expenses,
    addExpense,
    deleteExpense,
    currentUser,
    currentSalesPointId,
    salesPoints,
    theme,
    language,
    t,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month' | 'specific'>('month');
  const [specificDate, setSpecificDate] = useState<string>('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Électricité & Eau');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('espèces');
  const [receiptReference, setReceiptReference] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete confirmation modal
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  // Filtered expenses
  const filteredExpenses = expenses
    .filter(exp => {
      const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
      const matchesSearch =
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.receiptReference && exp.receiptReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        exp.recordedBy.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = exp.date === todayStr;
      } else if (dateFilter === 'month') {
        matchesDate = exp.date.startsWith(currentMonthStr);
      } else if (dateFilter === 'specific') {
        matchesDate = specificDate ? exp.date === specificDate : true;
      }

      return matchesCategory && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown for summary
  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (amount <= 0) {
      setErrorMsg(language === 'fr' ? 'Le montant doit être supérieur à 0 FCFA.' : 'Amount must be greater than 0.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg(language === 'fr' ? 'La description du motif est obligatoire.' : 'Description is required.');
      return;
    }

    addExpense({
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      category,
      description: description.trim(),
      amount,
      paymentMethod,
      recordedBy: currentUser.name,
      userId: currentUser.id,
      receiptReference: receiptReference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setSuccessMsg(language === 'fr' ? 'Dépense enregistrée avec succès.' : 'Expense recorded successfully.');
    setDescription('');
    setAmount(0);
    setReceiptReference('');
    setNotes('');
    setShowAddModal(false);

    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleConfirmDelete = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id, deleteReason || 'Suppression autorisée');
    setExpenseToDelete(null);
    setDeleteReason('');
  };

  const exportCSV = () => {
    const headers = ['Référence', 'Date', 'Catégorie', 'Description', 'Montant (FCFA)', 'Mode de Règlement', 'Auteur', 'Réf Pièce', 'Notes'];
    const rows = filteredExpenses.map(e => [
      `"${e.referenceNumber}"`,
      `"${e.date}"`,
      `"${e.category}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.paymentMethod}"`,
      `"${e.recordedBy}"`,
      `"${e.receiptReference || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `depenses_provenda_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canManage = currentUser.role === 'administrateur' || currentUser.role === 'responsable' || currentUser.role === 'developpeur';

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
            <Wallet className="w-6 h-6 text-rose-500" />
            <span>Gestion des Dépenses d'Exploitation</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Suivi des charges opérationnelles (loyers, énergie, salaires, maintenance, sacs, carburant) pour le calcul exact du résultat net.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenReport && (
            <button
              onClick={() => onOpenReport('expenses')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              <Printer className="w-4 h-4 text-emerald-500" />
              <span>Imprimer le Rapport</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouvelle Dépense</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>
              {dateFilter === 'specific' && specificDate
                ? (language === 'fr' ? `Dépenses du ${formatDate(specificDate)}` : `Expenses for ${formatDate(specificDate)}`)
                : 'Dépenses Filtrées'}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-2 font-mono">
            {formatFCFA(totalFilteredAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {filteredExpenses.length} écriture(s) sur la sélection
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Ce Mois-ci</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-2 font-mono">
            {formatFCFA(
              expenses
                .filter(e => e.date.startsWith(currentMonthStr))
                .reduce((sum, e) => sum + e.amount, 0)
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Mois de {new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Poste Principal</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          {Object.keys(categoryTotals).length > 0 ? (
            (() => {
              const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  <div className="text-lg font-bold text-slate-200 mt-2 truncate" title={topCategory[0]}>
                    {topCategory[0]}
                  </div>
                  <div className="text-[11px] text-amber-400 font-mono mt-1">
                    {formatFCFA(topCategory[1])} ({((topCategory[1] / (totalFilteredAmount || 1)) * 100).toFixed(0)}%)
                  </div>
                </>
              );
            })()
          ) : (
            <div className="text-xs text-slate-400 mt-3">Aucune charge enregistrée</div>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`p-3 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par libellé, N° dépense, référence reçu..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <option value="all">Toutes les catégories</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Date Filter Buttons */}
          <div className={`flex rounded-xl p-1 border text-xs ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => {
                setDateFilter('month');
                setSpecificDate('');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                dateFilter === 'month'
                  ? 'bg-rose-600 text-white'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => {
                setDateFilter('today');
                setSpecificDate('');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-rose-600 text-white'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => {
                setDateFilter('all');
                setSpecificDate('');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-rose-600 text-white'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Specific Date Filter */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition ${
            dateFilter === 'specific'
              ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/30'
              : theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${dateFilter === 'specific' ? 'text-rose-500' : 'text-slate-400'}`} />
            <input
              type="date"
              value={specificDate}
              onChange={e => {
                const val = e.target.value;
                setSpecificDate(val);
                if (val) {
                  setDateFilter('specific');
                } else {
                  setDateFilter('month');
                }
              }}
              title={language === 'fr' ? 'Filtrer par date précise (ex: 2026-09-08)' : 'Filter by specific date (e.g. 2026-09-08)'}
              className={`bg-transparent focus:outline-none cursor-pointer text-xs font-medium ${
                dateFilter === 'specific'
                  ? 'text-rose-500 font-bold'
                  : theme === 'dark'
                  ? 'text-slate-300'
                  : 'text-slate-700'
              }`}
            />
            {specificDate && (
              <button
                type="button"
                onClick={() => {
                  setSpecificDate('');
                  setDateFilter('month');
                }}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title={language === 'fr' ? 'Effacer la date' : 'Clear date'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {dateFilter === 'specific' && specificDate && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              {language === 'fr'
                ? `Filtre actif pour le ${formatDate(specificDate)} : ${filteredExpenses.length} dépense(s) (${formatFCFA(totalFilteredAmount)})`
                : `Active filter for ${formatDate(specificDate)}: ${filteredExpenses.length} expense(s) (${formatFCFA(totalFilteredAmount)})`}
            </span>
          </div>
          <button
            onClick={() => {
              setSpecificDate('');
              setDateFilter('month');
            }}
            className="text-xs hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <span>{language === 'fr' ? 'Effacer le filtre' : 'Clear filter'}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expenses Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
              theme === 'dark' ? 'bg-slate-800/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4">{language === 'fr' ? 'Réf.' : 'Ref'}</th>
                <th className="py-3 px-4">{language === 'fr' ? 'Date' : 'Date'}</th>
                <th className="py-3 px-4">{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                <th className="py-3 px-4">{language === 'fr' ? 'Description / Motif' : 'Description / Purpose'}</th>
                <th className="py-3 px-4 text-right">{language === 'fr' ? 'Montant' : 'Amount'}</th>
                <th className="py-3 px-4">{language === 'fr' ? 'Règlement' : 'Payment'}</th>
                <th className="py-3 px-4">{language === 'fr' ? 'Enregistré par' : 'Recorded by'}</th>
                <th className="py-3 px-4">{language === 'fr' ? 'Réf. Justif' : 'Receipt Ref'}</th>
                {canManage && <th className="py-3 px-4 text-center">{language === 'fr' ? 'Action' : 'Action'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-slate-400">
                    {language === 'fr' ? 'Aucune dépense ne correspond aux critères de recherche.' : 'No expenses match the search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr
                    key={exp.id}
                    className={`transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-rose-400 whitespace-nowrap">
                      {exp.referenceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(exp.date)} {exp.time ? `(${exp.time})` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate" title={exp.description}>
                      {exp.description}
                      {exp.notes && (
                        <span className="block text-[10px] text-slate-500 truncate" title={exp.notes}>
                          Note: {exp.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-500 whitespace-nowrap">
                      {formatFCFA(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 capitalize whitespace-nowrap">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {exp.recordedBy}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {exp.receiptReference || '—'}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Supprimer la dépense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Expense */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 animate-in fade-in zoom-in-95 duration-150 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-rose-500" />
                <span>Enregistrer une Dépense d'Exploitation</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Catégorie de Charge *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Description / Justification du motif *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Facture électricité force motrice broyeurs"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Montant Décaissé (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="Ex: 2000"
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-rose-400' : 'bg-slate-50 border-slate-200 text-rose-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Mode de Règlement
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="espèces">Espèces (Caisse)</option>
                    <option value="paiement mobile">Paiement Mobile (MoMo/OM)</option>
                    <option value="virement">Virement Bancaire</option>
                    <option value="chèque">Chèque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  N° Pièce Justificative (Reçu, Facture, Réf Transaction)
                </label>
                <input
                  type="text"
                  placeholder="Ex: RECU-ENEO-9921 ou TX-MOMO-882"
                  value={receiptReference}
                  onChange={e => setReceiptReference(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Notes Complémentaires (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Détails supplémentaires..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Valider la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-sm font-bold text-rose-500 mb-2">
              Confirmer la suppression de la dépense
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Êtes-vous sûr de vouloir supprimer la dépense <strong className="text-white">{expenseToDelete.referenceNumber}</strong> ({formatFCFA(expenseToDelete.amount)}) ? Cette action sera tracée dans le journal d'audit.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Motif de suppression
              </label>
              <input
                type="text"
                placeholder="Ex: Erreur de saisie / Doublon"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
