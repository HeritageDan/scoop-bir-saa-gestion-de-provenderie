import React, { useState } from 'react';
import {
  Users,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Percent,
  Building2,
  MapPin,
  Phone,
  Store,
  Warehouse,
  Key,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, Role, SalesPoint } from '../../types';

export const UserManager: React.FC = () => {
  const {
    currentUser,
    users,
    addUser,
    updateUser,
    deactivateUser,
    salesPoints,
    addSalesPoint,
    updateSalesPoint,
    deleteSalesPoint,
    currentSalesPointId,
    setCurrentSalesPointId,
    theme,
    language,
    t,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'sales_points'>('users');

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'caissier' as Role,
    discountLimitPercent: 0,
    assignedSalesPointId: 'pos-1',
    active: true,
  });
  const [userFormError, setUserFormError] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState('');

  // Sales Point modal state
  const [isSpModalOpen, setIsSpModalOpen] = useState(false);
  const [editingSp, setEditingSp] = useState<SalesPoint | null>(null);
  const [spFormData, setSpFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    managerName: '',
    active: true,
  });
  const [spFormError, setSpFormError] = useState('');

  const isAdmin = currentUser.role === 'administrateur' || currentUser.role === 'developpeur';

  // Role preset discount limits helper
  const handleRoleChange = (selectedRole: Role) => {
    let limit = 0;
    if (selectedRole === 'developpeur' || selectedRole === 'administrateur') limit = 100;
    else if (selectedRole === 'responsable') limit = 15;
    else if (selectedRole === 'caissier') limit = 0;
    else if (selectedRole === 'magasinier') limit = 0;

    setUserFormData(prev => ({
      ...prev,
      role: selectedRole,
      discountLimitPercent: limit,
    }));
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'caissier',
      discountLimitPercent: 0,
      assignedSalesPointId: salesPoints[0]?.id || 'pos-1',
      active: true,
    });
    setUserFormError('');
    setUserSuccessMessage('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUserFormData({
      name: u.name,
      email: u.email,
      password: u.password || '',
      role: u.role,
      discountLimitPercent: u.discountLimitPercent,
      assignedSalesPointId: u.assignedSalesPointId || 'pos-1',
      active: u.active,
    });
    setUserFormError('');
    setUserSuccessMessage('');
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    setUserSuccessMessage('');

    if (!isAdmin) {
      setUserFormError(
        language === 'fr'
          ? "Seul l'administrateur a le privilège de créer des utilisateurs et d'assigner des rôles."
          : "Only the Administrator can create users and assign roles."
      );
      return;
    }

    if (!userFormData.name.trim()) {
      setUserFormError('Le nom complet est obligatoire.');
      return;
    }
    if (!userFormData.email.trim()) {
      setUserFormError("L'adresse email est obligatoire.");
      return;
    }
    if (userFormData.role === 'developpeur' && currentUser.role !== 'developpeur') {
      setUserFormError(
        language === 'fr'
          ? "Seul un Développeur peut assigner le rôle Développeur Système."
          : "Only a Developer can assign the System Developer role."
      );
      return;
    }

    if (editingUser) {
      updateUser({
        ...editingUser,
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        password: userFormData.password.trim() || editingUser.password || 'provenda123',
        role: userFormData.role,
        discountLimitPercent: Number(userFormData.discountLimitPercent),
        assignedSalesPointId: userFormData.assignedSalesPointId,
        active: userFormData.active,
      });
      setUserSuccessMessage(`Utilisateur ${userFormData.name} mis à jour avec succès.`);
      setIsUserModalOpen(false);
    } else {
      if (!userFormData.password.trim()) {
        setUserFormError('Un mot de passe de connexion initial est obligatoire.');
        return;
      }
      if (users.some(u => u.email.toLowerCase() === userFormData.email.trim().toLowerCase())) {
        setUserFormError(`Un utilisateur avec l'email ${userFormData.email} existe déjà.`);
        return;
      }

      const res = addUser({
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        password: userFormData.password.trim(),
        role: userFormData.role,
        discountLimitPercent: Number(userFormData.discountLimitPercent),
        assignedSalesPointId: userFormData.assignedSalesPointId,
        active: userFormData.active,
      });

      if (res && !res.success) {
        setUserFormError(res.error || 'Erreur lors de la création');
        return;
      }

      setUserSuccessMessage(`Utilisateur ${userFormData.name} créé avec le rôle ${userFormData.role}.`);
      setIsUserModalOpen(false);
    }
  };

  // Sales Point Handlers
  const handleOpenAddSp = () => {
    setEditingSp(null);
    setSpFormData({
      code: `PDV-${String(salesPoints.length + 1).padStart(2, '0')}`,
      name: '',
      address: '',
      city: 'Douala',
      phone: '',
      email: '',
      managerName: '',
      active: true,
    });
    setSpFormError('');
    setIsSpModalOpen(true);
  };

  const handleOpenEditSp = (sp: SalesPoint) => {
    setEditingSp(sp);
    setSpFormData({
      code: sp.code,
      name: sp.name,
      address: sp.address,
      city: sp.city || 'Douala',
      phone: sp.phone || '',
      email: sp.email || '',
      managerName: sp.managerName || '',
      active: sp.active,
    });
    setSpFormError('');
    setIsSpModalOpen(true);
  };

  const handleSpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSpFormError('');

    if (!spFormData.name.trim()) {
      setSpFormError('Le nom du point de vente est requis.');
      return;
    }
    if (!spFormData.code.trim()) {
      setSpFormError('Le code magasin est requis.');
      return;
    }

    if (editingSp) {
      updateSalesPoint({
        ...editingSp,
        code: spFormData.code.trim().toUpperCase(),
        name: spFormData.name.trim(),
        address: spFormData.address.trim(),
        city: spFormData.city.trim(),
        phone: spFormData.phone.trim(),
        email: spFormData.email.trim(),
        managerName: spFormData.managerName.trim(),
        active: spFormData.active,
      });
    } else {
      addSalesPoint({
        code: spFormData.code.trim().toUpperCase(),
        name: spFormData.name.trim(),
        address: spFormData.address.trim(),
        city: spFormData.city.trim(),
        phone: spFormData.phone.trim(),
        email: spFormData.email.trim(),
        managerName: spFormData.managerName.trim(),
        isMain: false,
        active: spFormData.active,
      });
    }

    setIsSpModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('user.title')}
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
              isAdmin
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}>
              {isAdmin ? (language === 'fr' ? 'Accès Administrateur' : 'Administrator Access') : (language === 'fr' ? 'Mode Consultation' : 'Read-only Mode')}
            </span>
          </div>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('user.subtitle')}
          </p>
        </div>

        {/* Action Button */}
        {isAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {activeSubTab === 'users' ? (
              <button
                onClick={handleOpenAddUser}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('action.new_user')}</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddSp}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('action.new_sales_point')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Admin Notice if not admin */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">
              {language === 'fr' ? "Privilège Restreint : Administrateur Requis" : "Restricted Privilege: Administrator Required"}
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              {language === 'fr'
                ? "L'administrateur et le développeur sont les seuls habilités à créer des comptes utilisateurs et à leur attribuer des rôles. Veuillez vous déconnecter et vous authentifier avec les identifiants d'un compte Administrateur."
                : "The Administrator and Developer are the only roles authorized to provision user accounts and assign roles. Please sign out and log in with Administrator credentials."}
            </div>
          </div>
        </div>
      )}

      {userSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{userSuccessMessage}</span>
        </div>
      )}

      {/* Sub Tabs: Users / Sales Points */}
      <div className={`flex border-b text-sm font-semibold ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition -mb-px cursor-pointer ${
            activeSubTab === 'users'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-slate-200'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === 'fr' ? 'Comptes Utilisateurs & Rôles' : 'User Accounts & Roles'} ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('sales_points')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition -mb-px cursor-pointer ${
            activeSubTab === 'sales_points'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-slate-200'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{t('sales_point.title')} ({salesPoints.length})</span>
        </button>
      </div>

      {/* Sub Tab 1: Users & Roles List */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => {
              const assignedPoint = salesPoints.find(sp => sp.id === u.assignedSalesPointId);
              const isSelf = currentUser.id === u.id;

              return (
                <div
                  key={u.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition hover:shadow-md ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Header: Avatar, Name, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                          {u.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className={`font-bold text-sm tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {u.name}
                            </h3>
                            {isSelf && (
                              <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                {language === 'fr' ? 'VOUS' : 'YOU'}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs mt-0.5 truncate max-w-[170px] ${
                            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {u.email}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        u.active
                          ? theme === 'dark'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : theme === 'dark'
                          ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {u.active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>

                    {/* Role & Privileges Box - high contrast in both dark and light */}
                    <div className={`mt-4 p-3.5 rounded-xl border space-y-2.5 text-xs ${
                      theme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/60'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Rôle attribué :
                        </span>
                        <span className="font-bold capitalize text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {t(`role.${u.role}`)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Remise commerciale max :
                        </span>
                        <span className={`font-mono font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                          {u.discountLimitPercent}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Magasin rattaché :
                        </span>
                        <span className={`font-semibold truncate max-w-[140px] ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>
                          {assignedPoint?.name || 'Tous les magasins'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Accès mot de passe :
                        </span>
                        <span className={`font-mono text-[11px] font-semibold tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          •••••••
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className={`mt-5 pt-3 border-t flex items-center justify-between ${
                    theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      ID: {u.id}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {(currentUser.role === 'developpeur' || u.role !== 'developpeur') && (
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                              theme === 'dark'
                                ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                            title={language === 'fr' ? "Modifier l'utilisateur et son rôle" : "Edit user and role"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isSelf && (currentUser.role === 'developpeur' || u.role !== 'developpeur') && (
                          <button
                            onClick={() => {
                              if (window.confirm(language === 'fr' ? `Désactiver le compte de ${u.name} ?` : `Deactivate account for ${u.name}?`)) {
                                deactivateUser(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition text-xs cursor-pointer"
                            title={language === 'fr' ? "Désactiver le compte" : "Deactivate account"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub Tab 2: Multi-Sales-Point Management */}
      {activeSubTab === 'sales_points' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesPoints.map(sp => {
              const isCurrent = sp.id === currentSalesPointId;
              const userCount = users.filter(u => u.assignedSalesPointId === sp.id).length;

              return (
                <div
                  key={sp.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition hover:shadow-md ${
                    isCurrent
                      ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                      : ''
                  } ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className={`font-bold text-sm tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {sp.name}
                            </h3>
                          </div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            Code : {sp.code} &middot; {sp.city}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase">
                          Actif
                        </span>
                      ) : (
                        <button
                          onClick={() => setCurrentSalesPointId(sp.id)}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white border border-slate-200'
                          }`}
                        >
                          Basculer
                        </button>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}>
                          {sp.address || 'Adresse non renseignée'}
                        </span>
                      </div>
                      {sp.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}>
                            {sp.phone}
                          </span>
                        </div>
                      )}
                      {sp.managerName && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}>
                            Responsable : {sp.managerName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`mt-5 pt-3 border-t flex items-center justify-between text-xs ${
                    theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                      {userCount} utilisateur(s) rattaché(s)
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditSp(sp)}
                          className={`p-1.5 rounded-lg border text-xs transition ${
                            theme === 'dark'
                              ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Modifier le point de vente"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {salesPoints.length > 1 && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Supprimer le point de vente "${sp.name}" ?`)) {
                                deleteSalesPoint(sp.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition text-xs"
                            title="Supprimer le point de vente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          onClick={() => setIsUserModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">
                  {editingUser ? 'Modifier Utilisateur' : t('user.create_title')}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="p-5 space-y-4">
              {userFormError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {userFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('user.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="Ex: Jean-Paul Mvondo"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('user.email')} *
                </label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="nom@provenda.net"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('user.password')} {editingUser ? '(Laisser vide pour ne pas modifier)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userFormData.password}
                  onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('user.role')} *
                </label>
                <select
                  value={userFormData.role}
                  onChange={e => handleRoleChange(e.target.value as Role)}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="caissier">
                    {t('role.caissier')} ({language === 'fr' ? 'Vente au comptoir, caisse, remise 0%' : 'POS, counter sales, checkout, 0% discount'})
                  </option>
                  <option value="magasinier">
                    {t('role.magasinier')} ({language === 'fr' ? 'Stock, réceptions, inventaires' : 'Stock, goods reception, inventory'})
                  </option>
                  <option value="responsable">
                    {t('role.responsable')} ({language === 'fr' ? 'Supervision, remises ≤ 15%, écarts' : 'Supervision, discounts ≤ 15%, variance'})
                  </option>
                  <option value="administrateur">
                    {t('role.administrateur')} ({language === 'fr' ? 'Contrôle total, création comptes' : 'Full business control, user management'})
                  </option>
                  {currentUser.role === 'developpeur' && (
                    <option value="developpeur">
                      {t('role.developpeur')} ({language === 'fr' ? 'Superadmin système, Sauvegardes & Restauration, Audit' : 'System Superadmin, Backups & Restoration, Audit'})
                    </option>
                  )}
                </select>
              </div>

              {/* Assigned Sales Point */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('user.assigned_sales_point')}
                </label>
                <select
                  value={userFormData.assignedSalesPointId}
                  onChange={e => setUserFormData({ ...userFormData, assignedSalesPointId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {salesPoints.map(sp => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.code}) - {sp.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount Limit */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('user.discount_limit')} (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={userFormData.discountLimitPercent}
                  onChange={e => setUserFormData({ ...userFormData, discountLimitPercent: Number(e.target.value) })}
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
                  id="userActive"
                  checked={userFormData.active}
                  onChange={e => setUserFormData({ ...userFormData, active: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="userActive" className="text-xs font-medium cursor-pointer">
                  {t('user.active')} (Compte autorisé à se connecter)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
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
                  {editingUser ? t('action.save') : t('action.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Sales Point Modal */}
      {isSpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          onClick={() => setIsSpModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden cursor-default ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">
                  {editingSp ? (language === 'fr' ? 'Modifier Point de Vente' : 'Edit Sales Point') : t('action.new_sales_point')}
                </h3>
              </div>
              <button
                onClick={() => setIsSpModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSpSubmit} className="p-5 space-y-4">
              {spFormError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {spFormError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                    {t('sales_point.code')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={spFormData.code}
                    onChange={e => setSpFormData({ ...spFormData, code: e.target.value })}
                    placeholder="PDV-03"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                    {t('sales_point.name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={spFormData.name}
                    onChange={e => setSpFormData({ ...spFormData, name: e.target.value })}
                    placeholder="Provenda Bafoussam - Dépôt Ouest"
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
                    {t('sales_point.city')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={spFormData.city}
                    onChange={e => setSpFormData({ ...spFormData, city: e.target.value })}
                    placeholder="Douala, Yaoundé..."
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                    {t('sales_point.phone')}
                  </label>
                  <input
                    type="text"
                    value={spFormData.phone}
                    onChange={e => setSpFormData({ ...spFormData, phone: e.target.value })}
                    placeholder="+237 670 00 00 00"
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
                  {t('sales_point.address')}
                </label>
                <input
                  type="text"
                  value={spFormData.address}
                  onChange={e => setSpFormData({ ...spFormData, address: e.target.value })}
                  placeholder="Quartier, Avenue, Repère"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {t('sales_point.manager')}
                </label>
                <input
                  type="text"
                  value={spFormData.managerName}
                  onChange={e => setSpFormData({ ...spFormData, managerName: e.target.value })}
                  placeholder="Nom du responsable local"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsSpModalOpen(false)}
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
                  {editingSp ? t('action.save') : t('action.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
