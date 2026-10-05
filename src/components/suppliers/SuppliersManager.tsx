import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
  Edit2,
  Trash2,
  CheckCircle2,
  Package,
  ShoppingBag,
  ExternalLink,
  X,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Supplier } from '../../types';

interface SuppliersManagerProps {
  onNavigateTab?: (tab: string) => void;
}

export const SuppliersManager: React.FC<SuppliersManagerProps> = ({ onNavigateTab }) => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    purchases,
    products,
    theme,
    language,
    t,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // New Supplier form state
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    suppliedProducts: '',
    notes: '',
    active: true,
  });

  const [formError, setFormError] = useState('');

  const filteredSuppliers = suppliers.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.contactPerson.toLowerCase().includes(term) ||
      s.address.toLowerCase().includes(term) ||
      s.phone.includes(term) ||
      s.suppliedProducts.some(p => p.toLowerCase().includes(term))
    );
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      suppliedProducts: '',
      notes: '',
      active: true,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      suppliedProducts: sup.suppliedProducts.join(', '),
      notes: sup.notes || '',
      active: sup.active,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Le nom du fournisseur est obligatoire.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Le numéro de téléphone est obligatoire.');
      return;
    }

    const suppliedList = formData.suppliedProducts
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (editingSupplier) {
      updateSupplier({
        ...editingSupplier,
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        suppliedProducts: suppliedList,
        notes: formData.notes.trim(),
        active: formData.active,
      });
    } else {
      addSupplier({
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        suppliedProducts: suppliedList,
        notes: formData.notes.trim(),
        active: formData.active,
      });
    }

    setIsAddModalOpen(false);
    setEditingSupplier(null);
  };

  const handleDelete = (sup: Supplier) => {
    const count = purchases.filter(p => p.supplierId === sup.id).length;
    const msg = count > 0
      ? `Ce fournisseur est associé à ${count} commande(s) d'approvisionnement. Confirmer la suppression ?`
      : `Voulez-vous vraiment supprimer le fournisseur "${sup.name}" ?`;

    if (window.confirm(msg)) {
      deleteSupplier(sup.id);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('supplier.title')}
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
              theme === 'dark'
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {suppliers.length} {language === 'fr' ? 'partenaires' : 'partners'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('supplier.subtitle')}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('action.new_supplier')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full sm:w-96">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === 'fr' ? 'Rechercher par nom, ville, produit fourni, téléphone...' : 'Search by name, city, supplied product, phone...'}
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          {language === 'fr' ? 'Affichage de' : 'Showing'} <span className="font-semibold">{filteredSuppliers.length}</span> {language === 'fr' ? 'fournisseur(s)' : 'supplier(s)'}
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map(sup => {
          const supplierPurchases = purchases.filter(p => p.supplierId === sup.id);
          const totalBought = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

          return (
            <div
              key={sup.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition hover:shadow-md ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base tracking-tight">{sup.name}</h3>
                      <div className="text-xs text-emerald-500 font-medium">
                        Contact : {sup.contactPerson || 'Direction'}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    sup.active
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}>
                    {sup.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}>
                      {sup.phone}
                    </span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}>
                        {sup.email}
                      </span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}>
                        {sup.address}
                      </span>
                    </div>
                  )}
                </div>

                {/* Supplied Products Badges */}
                {sup.suppliedProducts && sup.suppliedProducts.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      {t('supplier.supplied_products')} :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sup.suppliedProducts.map((prod, idx) => (
                        <span
                          key={idx}
                          className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                            theme === 'dark'
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {sup.notes && (
                  <div className={`mt-3 p-2.5 rounded-lg text-xs italic ${
                    theme === 'dark' ? 'bg-slate-800/40 text-slate-400' : 'bg-slate-50 text-slate-600'
                  }`}>
                    &ldquo;{sup.notes}&rdquo;
                  </div>
                )}
              </div>

              {/* Bottom Actions and Stats */}
              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">
                    {supplierPurchases.length} commande(s)
                  </span>
                  <div className="font-semibold text-xs text-emerald-500">
                    {totalBought.toLocaleString()} FCFA
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('purchases')}
                      title="Créer un approvisionnement"
                      className={`p-1.5 rounded-lg border text-xs transition ${
                        theme === 'dark'
                          ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(sup)}
                    title={t('action.edit')}
                    className={`p-1.5 rounded-lg border text-xs transition ${
                      theme === 'dark'
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(sup)}
                    title={t('action.delete')}
                    className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className={`p-12 text-center rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Truck className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold">Aucun fournisseur trouvé</h3>
          <p className="text-sm text-slate-400 mt-1">
            Modifiez votre recherche ou ajoutez un nouveau partenaire fournisseur.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('action.new_supplier')}</span>
          </button>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">
                  {editingSupplier ? 'Modifier le Fournisseur' : t('action.new_supplier')}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('supplier.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: SOCAPALM / Céréales du Nord"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                    {t('supplier.contact')}
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Ex: M. Ousmane"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                    {t('supplier.phone')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+237 699 00 00 00"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                    {t('supplier.email')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@fournisseur.cm"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                    {t('supplier.address')}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ville, Quartier, Zone"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('supplier.supplied_products')} (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.suppliedProducts}
                  onChange={e => setFormData({ ...formData, suppliedProducts: e.target.value })}
                  placeholder="Maïs jaune, Tourteau de soja, Huile de palme..."
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('supplier.notes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Modalités de paiement, délais de livraison, escomptes..."
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="supplierActive"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="supplierActive" className="text-xs font-medium cursor-pointer">
                  Fournisseur actif et disponible pour les commandes
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                    theme === 'dark'
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t('action.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
                >
                  {editingSupplier ? t('action.save') : t('action.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
