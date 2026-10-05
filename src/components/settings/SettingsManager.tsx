import React, { useState } from 'react';
import {
  Settings,
  Building,
  Shield,
  Users,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Percent,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CompanySettings, Role } from '../../types';

export const SettingsManager: React.FC = () => {
  const {
    settings,
    updateSettings,
    users,
    currentUser,
    setCurrentUser,
    exportSystemBackup,
    restoreSystemBackup,
    resetToDefaultData,
    theme,
    language,
    t,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'security' | 'database'>('company');

  // Local state for company settings
  const [companyForm, setCompanyForm] = useState<CompanySettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupJson, setBackupJson] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(companyForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDownloadBackup = () => {
    const data = exportSystemBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `provenda_sauvegarde_complete_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError('');
    setRestoreSuccess('');

    if (!backupJson.trim()) {
      setRestoreError('Veuillez coller le contenu JSON de sauvegarde.');
      return;
    }

    const res = restoreSystemBackup(backupJson);
    if (!res.success) {
      setRestoreError(res.message || 'Erreur : structure JSON invalide ou corrompue.');
    } else {
      setRestoreSuccess('Base de données restaurée avec succès !');
      setBackupJson('');
    }
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'ATTENTION : Cette action va réinitialiser l\'application avec les données d\'exemple complètes de démarrage. Continuer ?'
      )
    ) {
      resetToDefaultData();
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
            <Settings className="w-6 h-6 text-emerald-500" />
            <span>Paramètres Système & Contrôles d'Accès</span>
          </h1>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Mentions légales, plafonds de remises, habilitations de profil et sauvegarde de l'activité.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b overflow-x-auto ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('company')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'company'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Fiche Provenderie & Documents</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Utilisateurs & Rôles ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Plafonds & Remises Contrôlées</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'database'
              ? 'border-emerald-500 text-emerald-500'
              : theme === 'dark'
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sauvegarde & Restauration</span>
        </button>
      </div>

      {/* TAB 1: COMPANY SETTINGS */}
      {activeTab === 'company' && (
        <form
          onSubmit={handleSaveCompany}
          className={`border rounded-xl p-5 space-y-4 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h2 className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Identité Fiscale & Coordonnées
          </h2>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Paramètres enregistrés avec succès !</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Nom de la Provenderie :
              </label>
              <input
                type="text"
                value={companyForm.name}
                onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                className={`w-full rounded-lg p-2 font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Forme Juridique :
              </label>
              <input
                type="text"
                value={companyForm.legalStatus}
                onChange={e => setCompanyForm({ ...companyForm, legalStatus: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Téléphone Principal :
              </label>
              <input
                type="text"
                value={companyForm.phone1}
                onChange={e => setCompanyForm({ ...companyForm, phone1: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Téléphone Secondaire :
              </label>
              <input
                type="text"
                value={companyForm.phone2 || ''}
                onChange={e => setCompanyForm({ ...companyForm, phone2: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Email Professionnel :
              </label>
              <input
                type="email"
                value={companyForm.email}
                onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Adresse & Ville :
              </label>
              <input
                type="text"
                value={companyForm.address}
                onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Numéro NIF :
              </label>
              <input
                type="text"
                value={companyForm.taxId}
                onChange={e => setCompanyForm({ ...companyForm, taxId: e.target.value })}
                className={`w-full rounded-lg p-2 font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Registre de Commerce (RCCM) :
              </label>
              <input
                type="text"
                value={companyForm.tradeRegisterNumber}
                onChange={e =>
                  setCompanyForm({ ...companyForm, tradeRegisterNumber: e.target.value })
                }
                className={`w-full rounded-lg p-2 font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
                required
              />
            </div>
          </div>

          <div className={`pt-4 border-t space-y-3 text-xs ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Mentions Légales sur les Pièces Imprimées
            </h3>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Pied de page des Factures Officielles (A4) :
              </label>
              <textarea
                rows={2}
                value={companyForm.invoiceFooterNotice}
                onChange={e =>
                  setCompanyForm({ ...companyForm, invoiceFooterNotice: e.target.value })
                }
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>
                Pied de page des Tickets de Caisse (Thermique 80mm) :
              </label>
              <input
                type="text"
                value={companyForm.ticketFooterNotice}
                onChange={e =>
                  setCompanyForm({ ...companyForm, ticketFooterNotice: e.target.value })
                }
                className={`w-full rounded-lg p-2 border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer transition"
            >
              Enregistrer les Mentions
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: USERS & ACTIVE SESSION */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className={`border rounded-xl p-5 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Session Active Actuelle
            </h2>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-3 ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {currentUser.name}
                  </div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Rôle actif :{' '}
                    <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Plafond remise accordé :{' '}
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {currentUser.role === 'administrateur'
                    ? '100% (Illimité)'
                    : `${currentUser.discountLimitPercent}%`}
                </span>
              </div>
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Comptes Utilisateurs Enregistrés
              </h2>
              <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Cliquez pour permuter instantanément d'opérateur
              </span>
            </div>

            <div className={`divide-y text-xs ${
              theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'
            }`}>
              {users.map(u => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <div
                    key={u.id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      theme === 'dark' ? 'hover:bg-slate-850' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            theme === 'dark'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            Connecté
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Identifiant : {u.email} · Rôle :{' '}
                        <span className={`font-semibold uppercase ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Remise max : <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{u.discountLimitPercent}%</strong>
                      </span>
                      {!isCurrent && (
                        <button
                          onClick={() => setCurrentUser(u)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-2xs'
                          }`}
                        >
                          Passer sur ce compte
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & DISCOUNT CAPS */}
      {activeTab === 'security' && (
        <form
          onSubmit={handleSaveCompany}
          className={`border rounded-xl p-5 space-y-4 text-xs shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h2 className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Plafonds de Remises Contrôlées par Rôle (Section 9.1 & 18)
          </h2>
          <p className={`leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Pour protéger la rentabilité de la provenderie et éviter les dérives de caisse, les
            remises sont strictement bornées selon l'habilitation hiérarchique de l'opérateur.
          </p>

          <div className="space-y-3 pt-2">
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Profil Caissier :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Par défaut fixé à 0% (Aucune remise sans accord de la hiérarchie).
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={companyForm.maxDiscountCaissier}
                  onChange={e =>
                    setCompanyForm({
                      ...companyForm,
                      maxDiscountCaissier: Number(e.target.value),
                    })
                  }
                  className={`w-20 rounded p-1 text-right font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>%</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Profil Responsable :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Plafond d'autorisation pour négociation commerciale directe (défaut : 15%).
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={companyForm.maxDiscountResponsable}
                  onChange={e =>
                    setCompanyForm({
                      ...companyForm,
                      maxDiscountResponsable: Number(e.target.value),
                    })
                  }
                  className={`w-20 rounded p-1 text-right font-bold border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>%</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Profil Administrateur :
                </div>
                <div className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Pouvoir discrétionnaire complet avec traçabilité obligatoire dans l'audit.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">100% (Illimité)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer transition"
            >
              Enregistrer les Plafonds
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: DATABASE BACKUP & RESTORE */}
      {activeTab === 'database' && (
        <div className="space-y-6 text-xs">
          {/* Export card */}
          <div className={`border rounded-xl p-5 space-y-3 shadow-xs ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Sauvegarde Totale des Données (Export JSON)</span>
            </h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Téléchargez un instantané complet et structuré de l'application : produits, stocks au
              CMP, clients, fournisseurs, factures, avoirs, mouvements et pistes d'audit.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>Générer le Fichier de Sauvegarde</span>
            </button>
          </div>

          {/* Import / Restore card */}
          <form
            onSubmit={handleRestoreSubmit}
            className={`border rounded-xl p-5 space-y-3 shadow-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>Restauration de la Base de Données</span>
            </h2>
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Collez ci-dessous le contenu d'un fichier de sauvegarde pour réinjecter l'ensemble des
              données de la provenderie.
            </p>

            {restoreError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-300 rounded-lg">
                {restoreError}
              </div>
            )}
            {restoreSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-lg">
                {restoreSuccess}
              </div>
            )}

            <textarea
              rows={4}
              value={backupJson}
              onChange={e => setBackupJson(e.target.value)}
              placeholder="Collez ici le JSON de sauvegarde..."
              className={`w-full rounded-lg p-2.5 font-mono text-[11px] border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition"
            >
              <Upload className="w-4 h-4" />
              <span>Restaurer les Données</span>
            </button>
          </form>

          {/* Reset card */}
          <div className={`border rounded-xl p-5 space-y-3 ${
            theme === 'dark'
              ? 'bg-rose-950/30 border-rose-800/60'
              : 'bg-rose-50/70 border-rose-200'
          }`}>
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-500" />
              <span>Réinitialisation Usine des Données de Test</span>
            </h2>
            <p className="text-rose-700/80 dark:text-rose-300">
              Réinitialise le stockage local avec les matières premières, formules d'aliments et
              historique d'exemple certifiés.
            </p>
            <button
              onClick={handleResetData}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm cursor-pointer transition"
            >
              Réinitialiser la Base
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
