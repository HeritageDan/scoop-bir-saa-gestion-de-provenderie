import React, { useState } from 'react';
import {
  MonitorDown,
  Download,
  CheckCircle2,
  X,
  ExternalLink,
  Laptop,
  Layers,
  Sparkles,
  HelpCircle,
  FileCode,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_APP_LOGO } from '../../config/defaultLogo';

interface DesktopInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopInstallModal: React.FC<DesktopInstallModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    theme,
    language,
    canInstallPwa,
    isStandalone,
    installPwa,
  } = useApp();

  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'downloads'>('pwa');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await installPwa();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const appName = settings.name || 'SCOOPS BIR SAA';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl border transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={settings.logoUrl || DEFAULT_APP_LOGO}
              alt={appName}
              className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  {language === 'fr' ? 'Application de Bureau' : 'Desktop Application'}
                </h3>
                <span className="text-[10px] uppercase font-bold text-sky-500 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded">
                  Windows / PC
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {appName} — {language === 'fr' ? 'Accès Bureau direct & Caisse POS' : 'Direct Desktop Access & POS Terminal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="px-5 pt-4">
          {isStandalone ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>
                {language === 'fr'
                  ? 'SCOOPS BIR SAA est actuellement exécuté en mode Bureau autonome.'
                  : 'SCOOPS BIR SAA is currently running in standalone Desktop mode.'}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs flex items-center gap-2.5">
              <Laptop className="w-4 h-4 shrink-0 text-sky-500" />
              <span>
                {language === 'fr'
                  ? 'Exécution dans le navigateur web. Installez l\'icône sur votre Bureau Windows pour un accès instantané.'
                  : 'Running in web browser. Install the icon on your Windows Desktop for instant access.'}
              </span>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 flex gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pwa'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'fr' ? '1. Installation Directe (Recommandé)' : '1. Direct Install (Recommended)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('downloads')}
            className={`pb-2 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'downloads'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'fr' ? '2. Fichiers & Lanceurs Windows (.bat)' : '2. Windows Files & Launchers (.bat)'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'pwa' ? (
            <div className="space-y-4">
              {installSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-sm text-emerald-600 dark:text-emerald-300">
                    {language === 'fr' ? 'Installation réussie !' : 'Installation successful!'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === 'fr'
                      ? 'SCOOPS BIR SAA est maintenant installé sur votre Bureau et dans le menu Démarrer.'
                      : 'SCOOPS BIR SAA is now installed on your Desktop and Start menu.'}
                  </p>
                </div>
              ) : canInstallPwa ? (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0">
                      <MonitorDown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {language === 'fr' ? 'Installation instantanée en 1 clic' : '1-Click Instant Installation'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {language === 'fr'
                          ? 'Installez SCOOPS BIR SAA comme application autonome. Fonctionne sans barre de navigation, démarre immédiatement et est 100% opérationnelle hors ligne.'
                          : 'Install SCOOPS BIR SAA as a standalone application. Runs without browser address bar, starts instantly and is 100% functional offline.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleInstallClick}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <MonitorDown className="w-4 h-4" />
                    <span>{language === 'fr' ? 'Installer SCOOPS BIR SAA sur mon PC' : 'Install SCOOPS BIR SAA on this PC'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'fr' ? 'Comment installer depuis votre navigateur' : 'How to install from your browser'}</span>
                    </h4>

                    <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                          1
                        </span>
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">Google Chrome :</strong>{' '}
                          {language === 'fr'
                            ? 'Cliquez sur l\'icône d\'écran dans la barre d\'adresse (à droite de l\'URL) OU ouvrez le menu (⋮) en haut à droite > "Installer SCOOPS BIR SAA".'
                            : 'Click the monitor icon in the address bar (right side) OR open the menu (⋮) > "Install SCOOPS BIR SAA".'}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                          2
                        </span>
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">Microsoft Edge :</strong>{' '}
                          {language === 'fr'
                            ? 'Cliquez sur l\'icône (+) dans la barre d\'adresse OU ouvrez le menu (...) > Applications > "Installer ce site en tant qu\'application".'
                            : 'Click the (+) icon in the address bar OR open menu (...) > Apps > "Install this site as an app".'}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                          3
                        </span>
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">Résultat :</strong>{' '}
                          {language === 'fr'
                            ? 'L\'icône officielle SCOOPS BIR SAA apparaît sur votre Bureau Windows et barre des tâches.'
                            : 'The official SCOOPS BIR SAA icon appears on your Windows Desktop and taskbar.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Benefits list */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Fenêtre Bureau sans barre URL</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>100% opérationnel hors-ligne</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Impression tickets thermiques</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Icône Bureau personnalisée</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Option: Download Lancer_SCOOPS_BIR_SAA.bat */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-500 shrink-0 mt-0.5">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      Lancer_SCOOPS_BIR_SAA.bat
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fr'
                        ? 'Lanceur de bureau Windows : active le serveur local et ouvre la fenêtre POS en mode autonome.'
                        : 'Windows desktop launcher: activates local server and opens POS window in standalone mode.'}
                    </p>
                  </div>
                </div>

                <a
                  href="/Lancer_SCOOPS_BIR_SAA.bat"
                  download="Lancer_SCOOPS_BIR_SAA.bat"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shrink-0 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'fr' ? 'Télécharger' : 'Download'}</span>
                </a>
              </div>

              {/* Option: Download Installer_Raccourci_Bureau.bat */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0 mt-0.5">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      Installer_Raccourci_Bureau.bat
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fr'
                        ? 'Génère automatiquement le raccourci officiel avec l\'icône SCOOPS BIR SAA sur votre Bureau Windows.'
                        : 'Automatically generates the official shortcut with the SCOOPS BIR SAA icon on your Windows Desktop.'}
                    </p>
                  </div>
                </div>

                <a
                  href="/Installer_Raccourci_Bureau.bat"
                  download="Installer_Raccourci_Bureau.bat"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'fr' ? 'Télécharger' : 'Download'}</span>
                </a>
              </div>

              {/* Option: Download app_icon.ico */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-500 shrink-0 mt-0.5">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      app_icon.ico (Icône Windows HD)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fr'
                        ? 'Fichier d\'icône officiel haute résolution pour Windows (256x256 multi-calque).'
                        : 'Official high-resolution icon file for Windows (256x256 multi-layer).'}
                    </p>
                  </div>
                </div>

                <a
                  href="/assets/app_icon.ico"
                  download="SCOOPS_BIR_SAA_icon.ico"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'fr' ? 'Télécharger' : 'Download'}</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Version Bureau v2.2 — POS Hors-ligne</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            {language === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
