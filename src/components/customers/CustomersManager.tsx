import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  CreditCard,
  Phone,
  MapPin,
  Mail,
  AlertCircle,
  Receipt,
  Search,
  CheckCircle2,
  X,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, Invoice } from '../../types';
import { formatFCFA, formatDate, formatDateTime } from '../../utils/formatters';

interface CustomersManagerProps {
  onSelectInvoice: (invoice: Invoice) => void;
  openPaymentForInvoice?: Invoice | null;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({
  onSelectInvoice,
  openPaymentForInvoice,
}) => {
  const {
    customers,
    invoices,
    currentUser,
    addCustomer,
    updateCustomer,
    recordDebtPayment,
    theme,
    language,
    t,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [onlyWithDebt, setOnlyWithDebt] = useState(false);

  // Customer Modal
  const [showCustModal, setShowCustModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custType, setCustType] = useState<Customer['type']>('éleveur');
  const [custCreditLimit, setCustCreditLimit] = useState(1000000);
  const [custNotes, setCustNotes] = useState('');

  // Payment Settlement Modal
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(
    openPaymentForInvoice || null
  );
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'espèces' | 'virement' | 'paiement mobile'>('espèces');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  // Calculations
  const totalDebt = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
  const debtorsCount = customers.filter(c => (c.currentDebt || 0) > 0).length;

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    const matchesDebt = !onlyWithDebt || c.currentDebt > 0;
    return matchesSearch && matchesType && matchesDebt;
  });

  const handleOpenNewCustModal = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustEmail('');
    setCustType('éleveur');
    setCustCreditLimit(1000000);
    setCustNotes('');
    setShowCustModal(true);
  };

  const handleOpenEditCustModal = (c: Customer) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustPhone(c.phone);
    setCustAddress(c.address || '');
    setCustEmail(c.email || '');
    setCustType(c.type);
    setCustCreditLimit(c.creditLimit);
    setCustNotes(c.notes || '');
    setShowCustModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    if (editingCustomer) {
      updateCustomer({
        ...editingCustomer,
        name: custName,
        phone: custPhone,
        address: custAddress,
        email: custEmail,
        type: custType,
        creditLimit: Number(custCreditLimit),
        notes: custNotes,
      });
    } else {
      addCustomer({
        code: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        name: custName,
        phone: custPhone,
        address: custAddress,
        email: custEmail,
        type: custType,
        creditLimit: Number(custCreditLimit),
        active: true,
        notes: custNotes,
      });
    }

    setShowCustModal(false);
  };

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoiceForPay(inv);
    setPayAmount(inv.remainingBalance);
    setPayMethod('espèces');
    setPayRef('');
    setPayNotes('');
    setPayError('');
    setPaySuccess('');
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');

    if (!selectedInvoiceForPay) return;
    if (payAmount <= 0) {
      setPayError('Le montant du paiement doit être supérieur à 0 FCFA.');
      return;
    }

    const res = recordDebtPayment(
      selectedInvoiceForPay.id,
      Number(payAmount),
      payMethod,
      payRef,
      payNotes
    );

    if (!res.success) {
      setPayError(res.error || 'Erreur lors du versement');
    } else {
      setPaySuccess('Règlement validé ! Le solde de la créance a été mis à jour.');
      setTimeout(() => {
        setSelectedInvoiceForPay(null);
      }, 1200);
    }
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
            <Users className="w-6 h-6 text-emerald-500" />
            <span>{language === 'fr' ? 'Clients & Suivi des Créances' : 'Customers & Receivables'}</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {language === 'fr'
              ? 'Gestion du compte client, encours de crédit, plafonds autorisés et encaissement des échéances.'
              : 'Customer account management, credit exposure, authorized limits, and debt collection.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenNewCustModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'fr' ? 'Nouveau Client' : 'New Customer'}</span>
          </button>
        </div>
      </div>

      {/* Debt Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`border rounded-xl p-4 shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400">{language === 'fr' ? 'Total des Créances Magasin' : 'Total Receivables'}</div>
          <div className="text-2xl font-black text-rose-500 mt-1">{formatFCFA(totalDebt)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{language === 'fr' ? 'Montant total dû par les clients' : 'Total outstanding balance owed by customers'}</div>
        </div>

        <div className={`border rounded-xl p-4 shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400">{language === 'fr' ? 'Comptes Clients Débiteurs' : 'Debtor Accounts'}</div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {debtorsCount} {language === 'fr' ? 'compte(s) avec dette' : 'account(s) with debt'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'fr' ? `Sur ${customers.length} clients enregistrés` : `Out of ${customers.length} registered customers`}
          </div>
        </div>

        <div className={`border rounded-xl p-4 shadow-xs ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs text-slate-400">{language === 'fr' ? 'Plafond de Crédit Moyen' : 'Average Credit Limit'}</div>
          <div className={`text-2xl font-black mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {formatFCFA(
              customers.length > 0
                ? customers.reduce((s, c) => s + c.creditLimit, 0) / customers.length
                : 0
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {language === 'fr' ? 'Autorisé selon profil éleveur/revendeur' : 'Authorized according to client profile'}
          </div>
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
            placeholder={language === 'fr' ? 'Rechercher par nom, téléphone, code...' : 'Search by name, phone, code...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className={`rounded-lg px-2.5 py-1.5 text-xs border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-850'
            }`}
          >
            <option value="all">{language === 'fr' ? 'Tous les types de clients' : 'All customer types'}</option>
            <option value="éleveur">{language === 'fr' ? 'Éleveurs' : 'Farmers / Breeders'}</option>
            <option value="revendeur">{language === 'fr' ? 'Revendeurs' : 'Resellers'}</option>
            <option value="coopérative">{language === 'fr' ? 'Coopératives' : 'Cooperatives'}</option>
            <option value="particulier">{language === 'fr' ? 'Particuliers' : 'Individuals'}</option>
          </select>

          <label className={`flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1.5 rounded-lg border ${
            theme === 'dark'
              ? 'bg-slate-800 text-slate-300 border-slate-700'
              : 'bg-slate-50 text-slate-700 border-slate-300'
          }`}>
            <input
              type="checkbox"
              checked={onlyWithDebt}
              onChange={e => setOnlyWithDebt(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <span>{language === 'fr' ? 'Uniquement avec créances' : 'Only with debt'}</span>
          </label>
        </div>
      </div>

      {/* Customers List Table */}
      <div className={`border rounded-xl overflow-hidden shadow-xs ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                theme === 'dark'
                  ? 'bg-slate-850 border-slate-800 text-slate-400'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">{language === 'fr' ? 'Nom du Client / Ferme' : 'Customer / Farm Name'}</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">{language === 'fr' ? 'Contact Téléphonique' : 'Phone Contact'}</th>
                <th className="py-3 px-3 text-right">{language === 'fr' ? 'Plafond Crédit' : 'Credit Limit'}</th>
                <th className="py-3 px-3 text-right">{language === 'fr' ? 'Créance Actuelle' : 'Current Debt'}</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {filteredCustomers.map(cst => {
                const hasDebt = cst.currentDebt > 0;
                // Unpaid invoices for this client
                const clientUnpaidInvoices = invoices.filter(
                  inv => inv.customerId === cst.id && inv.remainingBalance > 0 && inv.status !== 'annulée'
                );

                return (
                  <tr key={cst.id} className={`transition ${
                    theme === 'dark' ? 'hover:bg-slate-850/60' : 'hover:bg-slate-50'
                  }`}>
                    <td className="py-3 px-3 font-mono text-slate-400 font-semibold">{cst.code}</td>
                    <td className="py-3 px-3">
                      <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{cst.name}</div>
                      {cst.address && <div className="text-[10px] text-slate-400">{cst.address}</div>}
                    </td>
                    <td className={`py-3 px-3 capitalize ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{cst.type}</td>
                    <td className={`py-3 px-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{cst.phone}</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {cst.creditLimit > 0 ? formatFCFA(cst.creditLimit) : (language === 'fr' ? 'Aucun' : 'None')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-sm">
                      <span className={hasDebt ? 'text-rose-500' : 'text-slate-400'}>
                        {formatFCFA(cst.currentDebt)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {hasDebt && clientUnpaidInvoices.length > 0 && (
                        <button
                          onClick={() => handleOpenPayment(clientUnpaidInvoices[0])}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded text-xs transition shadow-xs cursor-pointer"
                          title={language === 'fr' ? 'Régler solde facture' : 'Collect invoice payment'}
                        >
                          {language === 'fr' ? 'Encaisser' : 'Collect'}
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditCustModal(cst)}
                        className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {language === 'fr' ? 'Modifier' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Form Modal (Add / Edit) */}
      {showCustModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowCustModal(false)}
        >
          <div
            className={`border w-full max-w-lg rounded-2xl shadow-2xl p-5 space-y-4 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center border-b pb-3 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {editingCustomer
                  ? `${language === 'fr' ? 'Modifier' : 'Edit'} ${editingCustomer.name}`
                  : (language === 'fr' ? 'Nouveau Compte Client' : 'New Customer Account')}
              </h3>
              <button onClick={() => setShowCustModal(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {language === 'fr' ? 'Nom / Raison Sociale * :' : 'Name / Company Name * :'}
                </label>
                <input
                  type="text"
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  placeholder={language === 'fr' ? 'ex: Ferme Avicole Saint-Michel' : 'e.g.: Sunrise Poultry Farm'}
                  className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'fr' ? 'Téléphone * :' : 'Phone * :'}
                  </label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    placeholder="+237 ..."
                    className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'fr' ? 'Profil :' : 'Profile :'}
                  </label>
                  <select
                    value={custType}
                    onChange={e => setCustType(e.target.value as any)}
                    className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-850'
                    }`}
                  >
                    <option value="éleveur">{language === 'fr' ? 'Éleveur' : 'Farmer / Breeder'}</option>
                    <option value="revendeur">{language === 'fr' ? 'Revendeur' : 'Reseller'}</option>
                    <option value="coopérative">{language === 'fr' ? 'Coopérative' : 'Cooperative'}</option>
                    <option value="particulier">{language === 'fr' ? 'Particulier' : 'Individual'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'fr' ? 'Adresse / Ville :' : 'Address / City :'}
                  </label>
                  <input
                    type="text"
                    value={custAddress}
                    onChange={e => setCustAddress(e.target.value)}
                    placeholder={language === 'fr' ? 'Ville, quartier...' : 'City, district...'}
                    className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'fr' ? 'Plafond Crédit (FCFA) :' : 'Credit Limit (FCFA) :'}
                  </label>
                  <input
                    type="number"
                    value={custCreditLimit}
                    onChange={e => setCustCreditLimit(Number(e.target.value))}
                    className={`w-full rounded-lg p-2 border font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-850'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {language === 'fr' ? 'Notes & Informations :' : 'Notes & Details :'}
                </label>
                <textarea
                  rows={2}
                  value={custNotes}
                  onChange={e => setCustNotes(e.target.value)}
                  placeholder={language === 'fr' ? "Informations sur l'élevage (nombre de têtes, espèces élevées...)" : 'Livestock flock size, breeding type...'}
                  className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-2 border-t ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowCustModal(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  {editingCustomer
                    ? (language === 'fr' ? 'Enregistrer Modifications' : 'Save Changes')
                    : (language === 'fr' ? 'Créer le Compte' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal (Règlement de Créance) */}
      {selectedInvoiceForPay && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedInvoiceForPay(null)}
        >
          <div
            className={`border w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex justify-between items-center border-b pb-3 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`font-bold text-base flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  {language === 'fr' ? 'Règlement de Créance Facture' : 'Invoice Debt Settlement'}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  {language === 'fr' ? 'Facture N°' : 'Invoice #'} <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedInvoiceForPay.number}</span> ({selectedInvoiceForPay.customerName})
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPay(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3 text-xs">
              {payError && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg">
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-lg">
                  {paySuccess}
                </div>
              )}

              <div className={`p-3 rounded-xl border space-y-1.5 ${
                theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between text-slate-400">
                  <span>{language === 'fr' ? 'Montant Total Facture :' : 'Total Invoice Amount :'}</span>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {formatFCFA(selectedInvoiceForPay.totalNet)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{language === 'fr' ? 'Déjà Réglé :' : 'Already Paid :'}</span>
                  <span className="text-emerald-500 font-semibold">
                    {formatFCFA(selectedInvoiceForPay.amountPaid)}
                  </span>
                </div>
                <div className={`flex justify-between text-sm font-bold pt-1 border-t ${
                  theme === 'dark' ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
                }`}>
                  <span>{language === 'fr' ? 'Solde Restant Dû :' : 'Remaining Balance :'}</span>
                  <span className="text-rose-500">
                    {formatFCFA(selectedInvoiceForPay.remainingBalance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {language === 'fr' ? 'Montant Versé (FCFA) * :' : 'Amount Paid (FCFA) * :'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoiceForPay.remainingBalance}
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className={`w-full rounded-lg p-2 font-bold text-sm border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-850'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'fr' ? 'Moyen de Paiement :' : 'Payment Method :'}
                  </label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as any)}
                    className={`w-full rounded-lg p-2 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-850'
                    }`}
                  >
                    <option value="espèces">{language === 'fr' ? 'Espèces' : 'Cash'}</option>
                    <option value="paiement mobile">{language === 'fr' ? 'Paiement Mobile (MoMo/OM)' : 'Mobile Money (MTN/OM)'}</option>
                    <option value="virement">{language === 'fr' ? 'Virement bancaire' : 'Bank Transfer'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    {language === 'fr' ? 'Référence / Reçu :' : 'Reference / Receipt :'}
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={e => setPayRef(e.target.value)}
                    placeholder="ex: MoMo-99120"
                    className={`w-full rounded-lg p-2 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {language === 'fr' ? 'Observations :' : 'Notes :'}
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder={language === 'fr' ? 'Versement en caisse...' : 'Payment notes...'}
                  className={`w-full rounded-lg p-2 text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-300 text-slate-850 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-2 border-t ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'fr' ? "Enregistrer l'Encaissement" : 'Save Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
