import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Search,
  BookOpen,
  ShieldCheck,
  Calculator,
  ShoppingCart,
  Truck,
  Receipt,
  ClipboardList,
  BarChart3,
  History,
  Settings,
  Code,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  ExternalLink,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateApplicationDocumentationPDF } from '../../utils/pdfGenerator';

interface FunctionItem {
  name: string;
  moduleFr: string;
  moduleEn: string;
  signature: string;
  descriptionFr: string;
  descriptionEn: string;
  inputsFr: string;
  inputsEn: string;
  outputsFr: string;
  outputsEn: string;
  businessRuleFr: string;
  businessRuleEn: string;
}

export const DocumentationManager: React.FC = () => {
  const { theme, language } = useApp();
  const isEn = language === 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'architecture' | 'roles' | 'cmp' | 'pos' | 'purchases' | 'invoicing' | 'inventory' | 'reports' | 'functions'>('all');
  const [copiedFunction, setCopiedFunction] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      generateApplicationDocumentationPDF(language);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 1000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = (signature: string, funcName: string) => {
    navigator.clipboard.writeText(signature);
    setCopiedFunction(funcName);
    setTimeout(() => setCopiedFunction(null), 2000);
  };

  const allFunctions: FunctionItem[] = [
    // Theme & State
    {
      name: 'toggleTheme',
      moduleFr: 'Interface & Préférences',
      moduleEn: 'UI & Preferences',
      signature: 'toggleTheme(): void',
      descriptionFr: 'Bascule le thème visuel entre mode sombre (dark) et mode clair (light). Sauvegarde l\'état dans localStorage (\'provenda_theme\') et applique les styles dynamiques.',
      descriptionEn: 'Toggles visual theme between dark and light modes. Persists preference to localStorage (\'provenda_theme\') and updates dynamic classes.',
      inputsFr: 'Aucun paramètre.',
      inputsEn: 'No parameters.',
      outputsFr: 'void (Met à jour le state theme dans AppContext).',
      outputsEn: 'void (Updates theme state in AppContext).',
      businessRuleFr: 'Le mode sombre est le défaut recommandé pour les environnements de caisse. Le mode clair utilise une teinte crème douce #FAF7F2 avec un contraste élevé.',
      businessRuleEn: 'Dark mode is default for low-light cashier desks. Light mode uses an ergonomic soft cream #FAF7F2 tone with high contrast.',
    },
    {
      name: 'setLanguage',
      moduleFr: 'Internationalisation (i18n)',
      moduleEn: 'Internationalization (i18n)',
      signature: 'setLanguage(lang: "fr" | "en"): void',
      descriptionFr: 'Définit la langue active de l\'application (Français ou Anglais), persiste le choix dans localStorage et rafraîchit tous les libellés de l\'interface.',
      descriptionEn: 'Sets application active language (French or English), persists selection to localStorage, and immediately updates all UI strings.',
      inputsFr: 'lang: "fr" | "en"',
      inputsEn: 'lang: "fr" | "en"',
      outputsFr: 'void (Met à jour language).',
      outputsEn: 'void (Updates language state).',
      businessRuleFr: 'Traduction dynamique de plus de 250 clés de traduction via src/utils/i18n.ts avec repli automatique sur le français si clé absente.',
      businessRuleEn: 'Dynamic translation across 250+ localized keys in src/utils/i18n.ts with automatic fallback to French if key is absent.',
    },
    {
      name: 't',
      moduleFr: 'Internationalisation (i18n)',
      moduleEn: 'Internationalization (i18n)',
      signature: 't(key: string): string',
      descriptionFr: 'Fonction de résolution de clé de traduction renvoyant le libellé localisé selon la langue courante.',
      descriptionEn: 'Translation resolution helper returning localized string according to current language.',
      inputsFr: 'key: string (ex: "nav.pos", "stock.cmp", "role.administrateur")',
      inputsEn: 'key: string (e.g. "nav.pos", "stock.cmp", "role.administrateur")',
      outputsFr: 'string (Texte traduit).',
      outputsEn: 'string (Translated text).',
      businessRuleFr: 'Permet une séparation stricte des libellés UI et garantit le multilinguisme sur l\'ensemble des écrans et tickets imprimables.',
      businessRuleEn: 'Ensures strict UI separation of concerns and guarantees full bilingual fidelity across all screens and receipts.',
    },

    // Multi-Magasins
    {
      name: 'setCurrentSalesPointId',
      moduleFr: 'Multi-Magasins (Points de Vente)',
      moduleEn: 'Multi-Store (POS Branches)',
      signature: 'setCurrentSalesPointId(id: string): void',
      descriptionFr: 'Change le point de vente ou dépôt actif de travail. Filtre instantanément l\'affichage des stocks, mouvements, caisses et sessions d\'inventaire.',
      descriptionEn: 'Switches the active work branch or depot. Instantly filters views of inventory, stock movements, checkout sessions and physical stocktakes.',
      inputsFr: 'id: string (Identifiant du point de vente, ex: "pos-1")',
      inputsEn: 'id: string (Sales point ID, e.g. "pos-1")',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Un caissier assigné à un magasin donné ne peut basculer de site sans autorisation administrative. L\'administrateur bénéficie d\'une vue consolidée.',
      businessRuleEn: 'Cashiers assigned to a specific branch cannot switch locations without administrative approval. Administrators have global consolidated views.',
    },
    {
      name: 'addSalesPoint',
      moduleFr: 'Multi-Magasins (Points de Vente)',
      moduleEn: 'Multi-Store (POS Branches)',
      signature: 'addSalesPoint(sp: Omit<SalesPoint, "id" | "createdAt">): void',
      descriptionFr: 'Crée un nouveau point de vente ou entrepôt avec son code unique (ex: POS-03), adresse, contact téléphonique et responsable désigné.',
      descriptionEn: 'Creates a new branch or depot with unique code (e.g. POS-03), address, phone contact and appointed manager.',
      inputsFr: 'sp: { code, name, address, city, phone, email, managerName, isMain, active }',
      inputsEn: 'sp: { code, name, address, city, phone, email, managerName, isMain, active }',
      outputsFr: 'void (Génère un identifiant unique et horodatage).',
      outputsEn: 'void (Generates unique ID and timestamp).',
      businessRuleFr: 'Génère automatiquement une entrée dans la piste d\'audit (AuditLog). Un seul point de vente peut être marqué comme principal (isMain).',
      businessRuleEn: 'Generates an automated immutable AuditLog entry. Only one store can be marked as primary (isMain).',
    },
    {
      name: 'updateSalesPoint',
      moduleFr: 'Multi-Magasins (Points de Vente)',
      moduleEn: 'Multi-Store (POS Branches)',
      signature: 'updateSalesPoint(sp: SalesPoint): void',
      descriptionFr: 'Met à jour les coordonnées, statut actif/inactif et informations de gestion d\'un point de vente.',
      descriptionEn: 'Updates contact details, active/inactive status and operational information of an existing store location.',
      inputsFr: 'sp: SalesPoint complet avec id.',
      inputsEn: 'sp: Full SalesPoint object with id.',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Enregistre les modifications d\'adresse ou de contact dans la piste d\'audit.',
      businessRuleEn: 'Records any changes to address, phone or manager in the audit trail.',
    },
    {
      name: 'deleteSalesPoint',
      moduleFr: 'Multi-Magasins (Points de Vente)',
      moduleEn: 'Multi-Store (POS Branches)',
      signature: 'deleteSalesPoint(id: string): void',
      descriptionFr: 'Supprime un point de vente inactif ou secondaire.',
      descriptionEn: 'Deletes an inactive or secondary store branch.',
      inputsFr: 'id: string',
      inputsEn: 'id: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Interdit formellement de supprimer le magasin principal (isMain).',
      businessRuleEn: 'Strictly forbids deleting the primary store (isMain).',
    },

    // Authentification & RBAC
    {
      name: 'login',
      moduleFr: 'Sécurité & Authentification',
      moduleEn: 'Security & Authentication',
      signature: 'login(email: string, password: string): { success: boolean; error?: string }',
      descriptionFr: 'Authentifie un utilisateur par ses identifiants. Vérifie l\'état actif du compte et actualise le timestamp lastLogin.',
      descriptionEn: 'Authenticates user credentials. Verifies active account status and updates lastLogin timestamp.',
      inputsFr: 'email: string, password: string',
      inputsEn: 'email: string, password: string',
      outputsFr: '{ success: boolean, error?: string }',
      outputsEn: '{ success: boolean, error?: string }',
      businessRuleFr: 'Bloque l\'accès aux comptes inactifs ou désactivés. En cas de succès, stocke l\'ID utilisateur dans localStorage (\'provenda_current_user_id\').',
      businessRuleEn: 'Denies access to deactivated accounts. Upon success, stores user ID in localStorage (\'provenda_current_user_id\').',
    },
    {
      name: 'logout',
      moduleFr: 'Sécurité & Authentification',
      moduleEn: 'Security & Authentication',
      signature: 'logout(): void',
      descriptionFr: 'Déconnecte la session courante, purge les clés d\'accès locales et redirige vers l\'écran de connexion.',
      descriptionEn: 'Logs out current session, clears stored credentials and redirects to login screen.',
      inputsFr: 'Aucun.',
      inputsEn: 'None.',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Efface la session sans altérer les données de la base ni les brouillons enregistrés.',
      businessRuleEn: 'Clears active session without destroying any persisted database records or saved drafts.',
    },
    {
      name: 'switchRole',
      moduleFr: 'Sécurité & Authentification',
      moduleEn: 'Security & Authentication',
      signature: 'switchRole(role: Role): void',
      descriptionFr: 'Permet la bascule dynamique de casquette pour tester ou opérer avec un profil d\'habilitation particulier (administrateur, responsable, caissier, magasinier).',
      descriptionEn: 'Allows dynamic profile switching to test or operate under specific role permissions (administrator, manager, cashier, stockist).',
      inputsFr: 'role: "administrateur" | "responsable" | "caissier" | "magasinier"',
      inputsEn: 'role: "administrateur" | "responsable" | "caissier" | "magasinier"',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Ajuste instantanément les plafonds de remise autorisés (0% caissier, 15% responsable, 100% admin) et les restrictions de menu.',
      businessRuleEn: 'Instantly applies role-based discount ceilings (0% cashier, 15% manager, 100% admin) and navigation menu filters.',
    },
    {
      name: 'addUser',
      moduleFr: 'Administration des Utilisateurs',
      moduleEn: 'User Administration',
      signature: 'addUser(user: Omit<User, "id">): { success: boolean; error?: string }',
      descriptionFr: 'Crée un nouveau compte utilisateur avec attribution du rôle, magasin de rattachement, mot de passe et plafond de remise.',
      descriptionEn: 'Creates a new employee account with assigned role, branch location, credentials and customized discount limit.',
      inputsFr: 'user: { name, email, password, role, active, phone, discountLimitPercent, assignedSalesPointId }',
      inputsEn: 'user: { name, email, password, role, active, phone, discountLimitPercent, assignedSalesPointId }',
      outputsFr: '{ success: boolean, error?: string }',
      outputsEn: '{ success: boolean, error?: string }',
      businessRuleFr: 'Vérifie l\'unicité de l\'adresse email. Enregistre l\'action "MODIFICATION_UTILISATEUR" dans la piste d\'audit.',
      businessRuleEn: 'Enforces unique email constraint. Records "MODIFICATION_UTILISATEUR" in the audit trail.',
    },
    {
      name: 'updateUser',
      moduleFr: 'Administration des Utilisateurs',
      moduleEn: 'User Administration',
      signature: 'updateUser(user: User): void',
      descriptionFr: 'Met à jour le rôle, mot de passe, numéro de téléphone, statut ou plafond de remise d\'un employé.',
      descriptionEn: 'Updates credentials, role, status or discount limits for an existing employee account.',
      inputsFr: 'user: User complet.',
      inputsEn: 'user: Full User object.',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Toute modification des droits ou statuts est consignée dans le journal d\'audit avec l\'ancienne et la nouvelle valeur.',
      businessRuleEn: 'Any changes to privileges or active status are logged with previous and updated values in the audit trail.',
    },
    {
      name: 'deactivateUser',
      moduleFr: 'Administration des Utilisateurs',
      moduleEn: 'User Administration',
      signature: 'deactivateUser(userId: string): void',
      descriptionFr: 'Désactive le compte d\'un employé, révoquant instantanément son droit de connexion.',
      descriptionEn: 'Deactivates an employee account, instantly revoking authentication privileges.',
      inputsFr: 'userId: string',
      inputsEn: 'userId: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Conserve l\'historique intégral de toutes les factures, réceptions et inventaires validés par cet utilisateur pour l\'audit.',
      businessRuleEn: 'Preserves complete historic traceability of all invoices, goods receipts and stocktakes approved by this user.',
    },

    // Produits & Catalogue
    {
      name: 'addProduct',
      moduleFr: 'Catalogue & Produits',
      moduleEn: 'Catalog & Products',
      signature: 'addProduct(product: Omit<Product, ...>, initialStock?: number, initialCmp?: number): void',
      descriptionFr: 'Crée un nouvel article provenderie avec code séquentiel automatique (ex: PRD-008), paramétrage des unités (sac/kg), facteur de conversion et stock initial valorisé au CMP.',
      descriptionEn: 'Creates a new feed mill item with auto-generated sequential code (e.g. PRD-008), unit packaging configs (bag/kg), conversion factors and initial stock valued at WAC.',
      inputsFr: 'product: données de base, initialStock: number (optionnel), initialCmp: number (optionnel)',
      inputsEn: 'product: core fields, initialStock: number (optional), initialCmp: number (optional)',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Si un stock initial positif est renseigné, un mouvement de stock de type "entrée fournisseur" ou "correction d\'inventaire" est automatiquement créé et valorisé au CMP.',
      businessRuleEn: 'If initial stock is positive, an automated stock movement is generated and valued at the specified initial WAC.',
    },
    {
      name: 'updateProduct',
      moduleFr: 'Catalogue & Produits',
      moduleEn: 'Catalog & Products',
      signature: 'updateProduct(product: Product, reason?: string): void',
      descriptionFr: 'Modifie les données d\'un produit (nom, conditionnement, seuil d\'alerte, prix d\'achat ou prix de vente).',
      descriptionEn: 'Updates product specifications (name, packaging, low stock alert threshold, purchase or retail price).',
      inputsFr: 'product: Product, reason?: string (Justification)',
      inputsEn: 'product: Product, reason?: string (Justification)',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Si les prix d\'achat ou de vente sont modifiés, enregistre une nouvelle entrée dans l\'historique de prix (priceHistory) avec date, auteur et motif, et trace dans la piste d\'audit.',
      businessRuleEn: 'If purchase or retail prices change, appends a new record to priceHistory with timestamp, author, and reason, and logs audit action.',
    },
    {
      name: 'archiveProduct',
      moduleFr: 'Catalogue & Produits',
      moduleEn: 'Catalog & Products',
      signature: 'archiveProduct(productId: string): void',
      descriptionFr: 'Passe un produit au statut "archivé", le masquant des recherches de caisse et de commande sans briser l\'historique comptable.',
      descriptionEn: 'Sets product status to "archivé", hiding it from active checkout while preserving all historic accounting data.',
      inputsFr: 'productId: string',
      inputsEn: 'productId: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Un produit archivé conserve tous ses mouvements passés et peut être réactivé à tout moment.',
      businessRuleEn: 'An archived product retains its full ledger history and can be unarchived at any time.',
    },
    {
      name: 'unarchiveProduct',
      moduleFr: 'Catalogue & Produits',
      moduleEn: 'Catalog & Products',
      signature: 'unarchiveProduct(productId: string): void',
      descriptionFr: 'Réactive un produit archivé pour le rendre à nouveau disponible dans le catalogue actif.',
      descriptionEn: 'Restores an archived product back to active sales catalog status.',
      inputsFr: 'productId: string',
      inputsEn: 'productId: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Bascule le statut du produit à "actif" et trace dans l\'audit.',
      businessRuleEn: 'Flips product status to "actif" and records an audit log.',
    },
    {
      name: 'maskProduct',
      moduleFr: 'Catalogue & Produits',
      moduleEn: 'Catalog & Products',
      signature: 'maskProduct(productId: string): void',
      descriptionFr: 'Masque temporairement un produit de la caisse POS sans archiver sa fiche (ex: rupture saisonnière).',
      descriptionEn: 'Temporarily masks a product from POS checkout without archiving its master record (e.g. seasonal shortages).',
      inputsFr: 'productId: string',
      inputsEn: 'productId: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Passe le statut du produit à "masqué".',
      businessRuleEn: 'Sets product status to "masqué".',
    },

    // Achats & Réceptions (Moteur CMP)
    {
      name: 'createPurchaseDraft',
      moduleFr: 'Approvisionnements & Achats',
      moduleEn: 'Supply Chain & Purchases',
      signature: 'createPurchaseDraft(purchase: Omit<Purchase, ...>, targetSalesPointId?: string): string',
      descriptionFr: 'Génère un bon de commande fournisseur au statut "brouillon" avec référence ACH-AAAA-XXXXXX, quantités commandées, prix unitaires négociés et frais d\'approche prévus.',
      descriptionEn: 'Generates a draft purchase order with reference ACH-YYYY-XXXXXX, ordered quantities, negotiated unit prices, and estimated landing fees.',
      inputsFr: 'purchase: données de la commande, targetSalesPointId?: string',
      inputsEn: 'purchase: order payload, targetSalesPointId?: string',
      outputsFr: 'string (Identifiant du bon d\'achat créé).',
      outputsEn: 'string (Created purchase order ID).',
      businessRuleFr: 'N\'impacte pas le stock physique tant que la réception magasin n\'a pas été officiellement validée.',
      businessRuleEn: 'Does not impact physical stock until goods receipt is officially confirmed and validated at the depot.',
    },
    {
      name: 'validatePurchaseReception',
      moduleFr: 'Approvisionnements (Moteur CMP)',
      moduleEn: 'Supply Chain (WAC Engine)',
      signature: 'validatePurchaseReception(purchaseId: string): void',
      descriptionFr: 'Exécute l\'algorithme central de valorisation du stock au Coût Moyen Pondéré (CMP). Incrémente les stocks physiques en unité de base et clôture le bon de réception.',
      descriptionEn: 'Executes the core Weighted Average Cost (WAC/CMP) inventory engine. Increments base unit inventory and marks purchase receipt as completed.',
      inputsFr: 'purchaseId: string',
      inputsEn: 'purchaseId: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Applique la formule mathématique : Nouveau_CMP = ((Stock_Actuel × CMP_Actuel) + (Qté_Reçue × Prix_Achat + Frais_Approche)) / (Stock_Actuel + Qté_Reçue). Enregistre les mouvements "entrée fournisseur".',
      businessRuleEn: 'Applies mathematical formula: New_WAC = ((Current_Stock × Old_WAC) + (Received_Qty × Unit_Price + Inbound_Fees)) / (Current_Stock + Received_Qty). Logs inbound movements.',
    },
    {
      name: 'cancelPurchase',
      moduleFr: 'Approvisionnements & Achats',
      moduleEn: 'Supply Chain & Purchases',
      signature: 'cancelPurchase(purchaseId: string, reason: string): void',
      descriptionFr: 'Annule un bon d\'achat au statut brouillon avec justification obligatoire.',
      descriptionEn: 'Cancels a draft purchase order with mandatory justification note.',
      inputsFr: 'purchaseId: string, reason: string',
      inputsEn: 'purchaseId: string, reason: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Passe le statut à "annulé" et enregistre une action ANNULATION_RECEPTION dans la piste d\'audit.',
      businessRuleEn: 'Sets status to "annulé" and logs ANNULATION_RECEPTION in the audit trail.',
    },

    // Ventes & Facturation (POS)
    {
      name: 'createSale',
      moduleFr: 'Caisse & Facturation (POS)',
      moduleEn: 'POS Checkout & Invoicing',
      signature: 'createSale(customerId, items, discount?, payment?, notes?, isCredit?, creditDueDate?, targetSalesPointId?): { success, invoiceId?, error? }',
      descriptionFr: 'Fonction transactionnelle de vente complète : valide le stock disponible en unité de base, applique les facteurs de conversion, contrôle le plafond de remise de l\'utilisateur, valide l\'encours crédit du client, calcule le CMV au CMP, décrémente les stocks, enregistre les règlements et édite la facture FAC-AAAA-XXXXXX.',
      descriptionEn: 'Atomic sales transaction: validates base stock availability, applies conversion factors, enforces user discount ceiling, checks customer credit solvency, calculates COGS at WAC, decrements physical stock, records payments and issues invoice FAC-YYYY-XXXXXX.',
      inputsFr: 'customerId, items (id, qté, prix, remise), discount, payment, notes, isCredit, creditDueDate, targetSalesPointId',
      inputsEn: 'customerId, items (id, qty, price, discount), discount, payment, notes, isCredit, creditDueDate, targetSalesPointId',
      outputsFr: '{ success: boolean, invoiceId?: string, error?: string }',
      outputsEn: '{ success: boolean, invoiceId?: string, error?: string }',
      businessRuleFr: 'Si remise > plafond du rôle : transaction rejetée. Si vente à crédit dépasse le plafond de crédit du client : alerte ou blocage. Calcule la marge brute = Total_Net - (Qté_Base × CMP). Déclenche notification de stock bas.',
      businessRuleEn: 'If discount > role limit: transaction rejected. If credit sale exceeds client limit: warning or blocked. Calculates gross margin = Net_Revenue - (Base_Qty × WAC). Triggers low stock alert if threshold reached.',
    },
    {
      name: 'cancelInvoiceWithCreditNote',
      moduleFr: 'Facturation & Avoirs',
      moduleEn: 'Invoicing & Credit Notes',
      signature: 'cancelInvoiceWithCreditNote(invoiceId: string, reason: string): { success: boolean; error?: string }',
      descriptionFr: 'Annule une facture émise en générant un Avoir officiel (AVO-AAAA-XXXXXX), réintègre les quantités en stock avec mouvement "retour client", et diminue l\'encours dette du client.',
      descriptionEn: 'Cancels an issued invoice by generating an official Credit Note (AVO-YYYY-XXXXXX), returns stock with "retour client" movement, and reduces client outstanding debt.',
      inputsFr: 'invoiceId: string, reason: string (Motif obligatoire)',
      inputsEn: 'invoiceId: string, reason: string (Mandatory reason)',
      outputsFr: '{ success: boolean, error?: string }',
      outputsEn: '{ success: boolean, error?: string }',
      businessRuleFr: 'Interdit la suppression brute des factures pour respecter les principes de non-effacement comptable. Trace l\'événement dans l\'audit avec mention de l\'auteur.',
      businessRuleEn: 'Prohibits hard deletion of invoices in compliance with financial anti-fraud standards. Logs audit entry with author and reason.',
    },
    {
      name: 'recordDebtPayment',
      moduleFr: 'Recouvrement des Créances',
      moduleEn: 'Receivables & Debt Recovery',
      signature: 'recordDebtPayment(invoiceId: string, amount: number, method: PaymentMethod, reference?: string, notes?: string): { success: boolean; error?: string }',
      descriptionFr: 'Enregistre le règlement partiel ou total d\'une facture à crédit par un client. Met à jour le solde restant dû (remainingBalance) et réduit l\'encours dette du client.',
      descriptionEn: 'Records partial or full debt payment against a credit invoice. Updates remaining invoice balance and reduces customer total outstanding debt.',
      inputsFr: 'invoiceId, amount, method (espèces/virement/momo), reference?, notes?',
      inputsEn: 'invoiceId, amount, method (cash/transfer/momo), reference?, notes?',
      outputsFr: '{ success: boolean, error?: string }',
      outputsEn: '{ success: boolean, error?: string }',
      businessRuleFr: 'Bascule le statut de la facture de "partielle" ou "crédit" à "payée" si le solde atteint 0 FCFA. Trace l\'action REGLEMENT_CREANCE.',
      businessRuleEn: 'Flips invoice status from "partielle" or "crédit" to "payée" once balance reaches 0 FCFA. Logs REGLEMENT_CREANCE.',
    },

    // Stocks & Inventaires
    {
      name: 'recordStockAdjustment',
      moduleFr: 'Mouvements & Ajustements de Stock',
      moduleEn: 'Inventory Movements & Adjustments',
      signature: 'recordStockAdjustment(productId, quantityChangeBaseUnit, type, justification): { success: boolean; error?: string }',
      descriptionFr: 'Effectue une régularisation manuelle de stock en cas de casse, avarie, perte, échantillon, autoconsommation interne ou correction.',
      descriptionEn: 'Executes manual inventory adjustments for breakage, spoilage, shrinkage, internal farm consumption or inventory reconciliations.',
      inputsFr: 'productId, quantityChangeBaseUnit (positif ou négatif), type, justification',
      inputsEn: 'productId, quantityChangeBaseUnit (positive or negative), type, justification',
      outputsFr: '{ success: boolean, error?: string }',
      outputsEn: '{ success: boolean, error?: string }',
      businessRuleFr: 'Exige obligatoirement une justification textuelle. Crée un StockMovement valorisé au CMP unitaire actuel et enregistre l\'action AJUSTEMENT_STOCK dans l\'audit.',
      businessRuleEn: 'Mandates justification note. Generates a StockMovement valued at current WAC and records AJUSTEMENT_STOCK in audit.',
    },
    {
      name: 'createInventorySession',
      moduleFr: 'Inventaires Physiques',
      moduleEn: 'Physical Stocktakes',
      signature: 'createInventorySession(categoryFilter?: string): string',
      descriptionFr: 'Démarre une session d\'inventaire physique avec capture instantanée du stock théorique de tous les produits (ou filtrés par catégorie).',
      descriptionEn: 'Initializes a physical stocktake session, capturing an instantaneous theoretical stock snapshot for all products or selected category.',
      inputsFr: 'categoryFilter?: string (optionnel)',
      inputsEn: 'categoryFilter?: string (optional)',
      outputsFr: 'string (Identifiant unique de la session INV-AAAA-XXXXXX).',
      outputsEn: 'string (Session ID INV-YYYY-XXXXXX).',
      businessRuleFr: 'Génère un numéro de référence unique et fige le stock théorique à l\'instant T pour comparaison future avec le comptage physique.',
      businessRuleEn: 'Generates unique reference number and locks theoretical stock at timestamp T for objective comparison with physical counts.',
    },
    {
      name: 'validateInventorySession',
      moduleFr: 'Inventaires Physiques',
      moduleEn: 'Physical Stocktakes',
      signature: 'validateInventorySession(sessionId: string, countedItems: Array<...>, notes?: string): { success: boolean; error?: string }',
      descriptionFr: 'Clôture et valide la session d\'inventaire : confronte le stock compté au stock théorique, calcule les écarts de stock et la valeur totale de l\'écart en FCFA au CMP, applique les corrections et trace dans l\'audit.',
      descriptionEn: 'Validates and closes physical inventory session: compares counted vs theoretical stock, computes unit and monetary variances at WAC, applies stock corrections and logs audit.',
      inputsFr: 'sessionId, countedItems: [{ productId, physicalStock, reason }], notes',
      inputsEn: 'sessionId, countedItems: [{ productId, physicalStock, reason }], notes',
      outputsFr: '{ success: boolean, error?: string }',
      outputsEn: '{ success: boolean, error?: string }',
      businessRuleFr: 'Pour chaque écart détecté (positif ou négatif), ajuste le stock actuel du produit pour égaler exactement le comptage physique et crée un mouvement "correction d\'inventaire".',
      businessRuleEn: 'For each discrepancy, updates current stock to match physical count exactly and creates a "correction d\'inventaire" movement.',
    },

    // Tiers : Clients & Fournisseurs
    {
      name: 'addCustomer',
      moduleFr: 'Fichier Clients & Créances',
      moduleEn: 'Customer Accounts & Credit',
      signature: 'addCustomer(customer: Omit<Customer, "id" | "createdAt" | "currentDebt">): void',
      descriptionFr: 'Enregistre un nouveau client (particulier, éleveur, revendeur, coopérative) avec code automatique (ex: CLI-006) et plafond de crédit autorisé.',
      descriptionEn: 'Registers a new customer (individual, poultry farmer, reseller, cooperative) with code CLI-XXX and authorized credit ceiling.',
      inputsFr: 'customer: { name, phone, address, email, type, creditLimit, active, notes }',
      inputsEn: 'customer: { name, phone, address, email, type, creditLimit, active, notes }',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Initialise la dette courante (currentDebt) à 0 FCFA. Trace la création dans la piste d\'audit.',
      businessRuleEn: 'Initializes current debt to 0 FCFA. Records customer creation in the audit trail.',
    },
    {
      name: 'updateCustomer',
      moduleFr: 'Fichier Clients & Créances',
      moduleEn: 'Customer Accounts & Credit',
      signature: 'updateCustomer(customer: Customer): void',
      descriptionFr: 'Met à jour les informations de contact, type ou plafond de crédit d\'un client.',
      descriptionEn: 'Updates contact details, customer classification, or authorized credit ceiling.',
      inputsFr: 'customer: Customer complet.',
      inputsEn: 'customer: Full Customer object.',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Conserve l\'encours de dette actuel et trace les modifications de plafond de crédit.',
      businessRuleEn: 'Preserves current debt balance while tracking changes to credit limits in the audit trail.',
    },
    {
      name: 'addSupplier',
      moduleFr: 'Fournisseurs & Approvisionnements',
      moduleEn: 'Suppliers & Vendors',
      signature: 'addSupplier(supplier: Omit<Supplier, "id" | "createdAt">): void',
      descriptionFr: 'Crée un nouveau fournisseur avec ses coordonnées, personne de contact et catalogue des matières premières livrées.',
      descriptionEn: 'Creates a vendor account with contact information, key representatives, and list of supplied raw materials.',
      inputsFr: 'supplier: { name, phone, email, address, contactPerson, suppliedProducts, active, notes }',
      inputsEn: 'supplier: { name, phone, email, address, contactPerson, suppliedProducts, active, notes }',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Rattache le fournisseur aux articles du catalogue pour simplifier la saisie des commandes d\'achat.',
      businessRuleEn: 'Links supplier to relevant feed catalog items to expedite purchase order entry.',
    },
    {
      name: 'updateSupplier',
      moduleFr: 'Fournisseurs & Approvisionnements',
      moduleEn: 'Suppliers & Vendors',
      signature: 'updateSupplier(supplier: Supplier): void',
      descriptionFr: 'Met à jour la fiche d\'un fournisseur.',
      descriptionEn: 'Updates master records for an active supplier.',
      inputsFr: 'supplier: Supplier complet.',
      inputsEn: 'supplier: Full Supplier object.',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Trace les modifications dans le journal d\'audit.',
      businessRuleEn: 'Logs vendor updates in the audit trail.',
    },
    {
      name: 'deleteSupplier',
      moduleFr: 'Fournisseurs & Approvisionnements',
      moduleEn: 'Suppliers & Vendors',
      signature: 'deleteSupplier(supplierId: string): void',
      descriptionFr: 'Supprime un fournisseur s\'il n\'a pas de commande bloquante.',
      descriptionEn: 'Deletes a supplier record provided no active purchase orders depend on it.',
      inputsFr: 'supplierId: string',
      inputsEn: 'supplierId: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Désactive le fournisseur et trace dans la piste d\'audit.',
      businessRuleEn: 'Deactivates vendor and logs event in the audit trail.',
    },

    // Audit & Notifications
    {
      name: 'addAuditLog',
      moduleFr: 'Piste d\'Audit (Audit Trail)',
      moduleEn: 'Audit Trail & Compliance',
      signature: 'addAuditLog(action, targetObject, objectId, oldValue?, newValue?, justification?): void',
      descriptionFr: 'Mécanisme central d\'audit enregistrant chaque événement sensible dans une table inaltérable avec horodatage, utilisateur, rôle et justification.',
      descriptionEn: 'Core audit mechanism appending sensitive operational events to an immutable log with exact timestamps, user ID, role and justifications.',
      inputsFr: 'action: AuditAction, targetObject: string, objectId: string, oldValue?, newValue?, justification?',
      inputsEn: 'action: AuditAction, targetObject: string, objectId: string, oldValue?, newValue?, justification?',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Les entrées d\'audit ne peuvent être ni modifiées ni supprimées manuellement depuis l\'interface, garantissant une conformité légale totale.',
      businessRuleEn: 'Audit entries cannot be manually modified or deleted from the UI, ensuring full ISO financial compliance.',
    },
    {
      name: 'markNotificationAsRead',
      moduleFr: 'Notifications & Alertes',
      moduleEn: 'Notifications & Alerts',
      signature: 'markNotificationAsRead(id: string): void',
      descriptionFr: 'Marque une alerte système (stock faible, rupture, échéance de crédit) comme lue par l\'utilisateur.',
      descriptionEn: 'Marks a system alert (low inventory, stockout, credit due date) as read by the user.',
      inputsFr: 'id: string',
      inputsEn: 'id: string',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Met à jour l\'indicateur visuel de notifications dans l\'en-tête.',
      businessRuleEn: 'Updates the visual notification counter badge in the top header.',
    },
    {
      name: 'clearAllNotifications',
      moduleFr: 'Notifications & Alertes',
      moduleEn: 'Notifications & Alerts',
      signature: 'clearAllNotifications(): void',
      descriptionFr: 'Marque toutes les notifications actives comme lues en une seule action.',
      descriptionEn: 'Marks all active notifications as read in a single click.',
      inputsFr: 'Aucun.',
      inputsEn: 'None.',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Réinitialise le compteur de badges non lus à zéro.',
      businessRuleEn: 'Resets unread notification count badge to zero.',
    },

    // Paramètres & Sauvegardes
    {
      name: 'updateSettings',
      moduleFr: 'Paramètres Généraux de l\'Entreprise',
      moduleEn: 'Company System Settings',
      signature: 'updateSettings(newSettings: CompanySettings): void',
      descriptionFr: 'Met à jour les paramètres légaux (NIF, RCCM, adresse), le taux de TVA, les plafonds de remise par rôle, et l\'option d\'incorporation des frais d\'approche au CMP.',
      descriptionEn: 'Updates company legal data (Tax ID, Trade Registry, address), VAT rates, role discount ceilings, and the landing cost WAC incorporation toggle.',
      inputsFr: 'newSettings: CompanySettings',
      inputsEn: 'newSettings: CompanySettings',
      outputsFr: 'void.',
      outputsEn: 'void.',
      businessRuleFr: 'Trace l\'action MODIFICATION_PARAMETRES dans l\'audit. Impacte immédiatement les calculs de facturation et de commande.',
      businessRuleEn: 'Logs MODIFICATION_PARAMETRES in the audit trail. Immediately affects new invoicing and purchasing computations.',
    },
    {
      name: 'exportSystemBackup',
      moduleFr: 'Sauvegarde & Restauration',
      moduleEn: 'Backup & Disaster Recovery',
      signature: 'exportSystemBackup(): string',
      descriptionFr: 'Exporte l\'intégralité des tables applicatives sous forme de chaîne JSON structurée et horodatée.',
      descriptionEn: 'Exports entire application state across all tables into a structured timestamped JSON string.',
      inputsFr: 'Aucun.',
      inputsEn: 'None.',
      outputsFr: 'string (JSON complet téléchargeable).',
      outputsEn: 'string (Downloadable JSON string).',
      businessRuleFr: 'Trace l\'opération "SAUVEGARDE_SYSTEME" dans le journal d\'audit avec date et utilisateur.',
      businessRuleEn: 'Logs SAUVEGARDE_SYSTEME in the audit trail with timestamp and executing user.',
    },
    {
      name: 'restoreSystemBackup',
      moduleFr: 'Sauvegarde & Restauration',
      moduleEn: 'Backup & Disaster Recovery',
      signature: 'restoreSystemBackup(jsonString: string): { success: boolean; message: string }',
      descriptionFr: 'Restaure l\'intégralité des données de l\'application à partir d\'un fichier de sauvegarde JSON valide.',
      descriptionEn: 'Restores complete application state from a valid JSON backup file.',
      inputsFr: 'jsonString: string (Contenu du fichier JSON)',
      inputsEn: 'jsonString: string (JSON file content)',
      outputsFr: '{ success: boolean, message: string }',
      outputsEn: '{ success: boolean, message: string }',
      businessRuleFr: 'Vérifie rigoureusement la présence et l\'intégrité des tables requises avant d\'écraser l\'état local. Enregistre l\'action RESTAURATION_SYSTEME.',
      businessRuleEn: 'Rigorously verifies schema integrity before overwriting local state. Records RESTAURATION_SYSTEME in audit.',
    },
    {
      name: 'resetToDefaultData',
      moduleFr: 'Console Développeur & Maintenance',
      moduleEn: 'Developer Console & Maintenance',
      signature: 'resetToDefaultData(): void',
      descriptionFr: 'Action exclusive réservée au profil Développeur : purge complète de toutes les données transactionnelles (ventes, tickets de caisse, factures, achats, mouvements de stock, sessions d\'inventaire, dépenses d\'exploitation) pour livrer un système vierge au client final, tout en conservant le catalogue de base, les paramètres de l\'entreprise et le logo officiel en base64.',
      descriptionEn: 'Developer exclusive maintenance action: completely purges all transactional data (sales, receipts, invoices, purchases, stock movements, inventory sessions, operating expenses) to deliver a clean system to the client, while retaining the baseline catalog, company parameters and official base64 logo.',
      inputsFr: 'Aucun.',
      inputsEn: 'None.',
      outputsFr: 'void (Réinitialise l\'état local et déclenche l\'audit).',
      outputsEn: 'void (Resets local state and records audit log).',
      businessRuleFr: 'Strictement protégé par le profil Développeur. Ne peut être déclenché par un simple administrateur ou caissier.',
      businessRuleEn: 'Strictly restricted to Developer profile. Cannot be executed by administrators or cashiers.',
    },
    {
      name: 'performAutomaticSync',
      moduleFr: 'Synchronisation Cloud Supabase',
      moduleEn: 'Supabase Cloud Sync',
      signature: 'performAutomaticSync(): Promise<{ success: boolean; message?: string }>',
      descriptionFr: 'Moteur de synchronisation bidirectionnelle automatique en arrière-plan avec la base cloud PostgreSQL Supabase dès la détection d\'un accès Internet.',
      descriptionEn: 'Automated background bi-directional synchronization engine with the Supabase PostgreSQL cloud database upon internet detection.',
      inputsFr: 'Aucun (Utilise la configuration active ou les clés de secours).',
      inputsEn: 'None (Uses active configuration or embedded fallbacks).',
      outputsFr: 'Promise<{ success: boolean, message?: string }>',
      outputsEn: 'Promise<{ success: boolean, message?: string }>',
      businessRuleFr: 'Assure le fonctionnement 100% hors-ligne avec réconciliation automatique à la reconnexion.',
      businessRuleEn: 'Guarantees 100% offline-first capability with automatic reconciliation upon reconnection.',
    },
    {
      name: 'printReceipt',
      moduleFr: 'Pilote Imprimante Thermique POS',
      moduleEn: 'POS Thermal Printer Driver',
      signature: 'printReceipt(invoice, settings, config, isReprint?): Promise<{ success: boolean; error?: string }>',
      descriptionFr: 'Envoie un ticket de caisse formaté à l\'imprimante thermique physique (58 mm ou 80 mm) via le spooler Windows, le port USB ou conteneur d\'impression isolé.',
      descriptionEn: 'Dispatches formatted receipt to physical thermal printer (58 mm or 80 mm) via Windows spooler, USB port or isolated print container.',
      inputsFr: 'invoice: Invoice, settings: CompanySettings, config: ReceiptPrinterConfig, isReprint?: boolean',
      inputsEn: 'invoice: Invoice, settings: CompanySettings, config: ReceiptPrinterConfig, isReprint?: boolean',
      outputsFr: 'Promise<{ success: boolean, error?: string }>',
      outputsEn: 'Promise<{ success: boolean, error?: string }>',
      businessRuleFr: 'Si isReprint est vrai, imprime automatiquement la mention de sécurité indélébile *** DUPLICATA / RÉIMPRESSION *** pour prévenir la fraude.',
      businessRuleEn: 'If isReprint is true, automatically imprints the tamper-proof security warning *** DUPLICATA / RÉIMPRESSION ***.',
    },
    {
      name: 'updateProductPrice',
      moduleFr: 'Catalogue Produits & Tarifs',
      moduleEn: 'Product Catalog & Pricing',
      signature: 'updateProductPrice(id: string, newPrice: number, reason: string): { success: boolean; error?: string }',
      descriptionFr: 'Met à jour le prix de vente catalogue d\'un article en consignant l\'ancien prix, le nouveau prix, la date, l\'utilisateur et le motif obligatoire dans l\'historique.',
      descriptionEn: 'Updates catalog selling price while logging previous price, new price, timestamp, author and mandatory justification in history.',
      inputsFr: 'id: string, newPrice: number, reason: string',
      inputsEn: 'id: string, newPrice: number, reason: string',
      outputsFr: '{ success: boolean, error?: string }',
      outputsEn: '{ success: boolean, error?: string }',
      businessRuleFr: 'Exige un motif obligatoire pour garantir la traçabilité comptable et préserver la conformité d\'audit.',
      businessRuleEn: 'Requires a mandatory reason to ensure accounting traceability and audit compliance.',
    },
    {
      name: 'getLowStockProducts',
      moduleFr: 'Sélecteurs & Calculs Métier',
      moduleEn: 'Selectors & Business Logic',
      signature: 'getLowStockProducts(): Product[]',
      descriptionFr: 'Retourne la liste des articles dont le stock actuel en unité de base est inférieur ou égal au seuil minimum d\'alerte.',
      descriptionEn: 'Returns active products where current stock in base units is less than or equal to minimum threshold.',
      inputsFr: 'Aucun.',
      inputsEn: 'None.',
      outputsFr: 'Product[] (Articles en alerte stock).',
      outputsEn: 'Product[] (Low stock items).',
      businessRuleFr: 'Alimente les indicateurs d\'alerte du tableau de bord et le badge du menu latéral.',
      businessRuleEn: 'Powers dashboard alert widgets and the sidebar low-stock notification badge.',
    },
    {
      name: 'getOutOfStockProducts',
      moduleFr: 'Sélecteurs & Calculs Métier',
      moduleEn: 'Selectors & Business Logic',
      signature: 'getOutOfStockProducts(): Product[]',
      descriptionFr: 'Retourne la liste des articles actifs dont le stock actuel est strictement épuisé (<= 0).',
      descriptionEn: 'Returns active products where current stock is completely exhausted (<= 0).',
      inputsFr: 'Aucun.',
      inputsEn: 'None.',
      outputsFr: 'Product[] (Articles en rupture totale).',
      outputsEn: 'Product[] (Depleted items).',
      businessRuleFr: 'Empêche la vente en caisse si le stock est insuffisant.',
      businessRuleEn: 'Prevents checkout sales when stock is depleted.',
    },
  ];

  const filteredFunctions = allFunctions.filter(fn => {
    const moduleText = isEn ? fn.moduleEn : fn.moduleFr;
    const descText = isEn ? fn.descriptionEn : fn.descriptionFr;
    const ruleText = isEn ? fn.businessRuleEn : fn.businessRuleFr;

    const matchesSearch =
      searchQuery === '' ||
      fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      moduleText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      descText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ruleText.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'architecture' && (fn.moduleFr.includes('Multi-Magasins') || fn.moduleFr.includes('Interface') || fn.moduleFr.includes('Internationalisation'))) return true;
    if (activeTab === 'roles' && (fn.moduleFr.includes('Sécurité') || fn.moduleFr.includes('Utilisateurs'))) return true;
    if (activeTab === 'cmp' && (fn.moduleFr.includes('CMP') || fn.moduleFr.includes('Catalogue'))) return true;
    if (activeTab === 'pos' && (fn.moduleFr.includes('Caisse') || fn.moduleFr.includes('Vente'))) return true;
    if (activeTab === 'purchases' && (fn.moduleFr.includes('Approvisionnements') || fn.moduleFr.includes('Fournisseurs'))) return true;
    if (activeTab === 'invoicing' && (fn.moduleFr.includes('Facturation') || fn.moduleFr.includes('Créances') || fn.moduleFr.includes('Clients'))) return true;
    if (activeTab === 'inventory' && (fn.moduleFr.includes('Inventaires') || fn.moduleFr.includes('Mouvements'))) return true;
    if (activeTab === 'reports' && (fn.moduleFr.includes('Audit') || fn.moduleFr.includes('Paramètres') || fn.moduleFr.includes('Sauvegarde'))) return true;
    if (activeTab === 'functions') return true;

    return true;
  });

  const staticPdfFilename = isEn
    ? 'Documentation_Fonctionnalites_Provenda_EN.pdf'
    : 'Documentation_Fonctionnalites_Provenda_FR.pdf';

  return (
    <div className={`p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 ${
      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
    }`}>
      {/* Top Banner / Header */}
      <div className={`rounded-2xl p-6 sm:p-8 border shadow-sm relative overflow-hidden transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/40 border-slate-700/80'
          : 'bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/20 border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {isEn
                  ? 'Official Manual & Complete Functional Specification'
                  : 'Manuel Officiel & Spécification Fonctionnelle Complète'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {isEn
                ? 'Provenda Application Full Documentation'
                : 'Documentation Intégrale de l\'Application Provenda'}
            </h1>
            <p className={`text-sm sm:text-base leading-relaxed ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {isEn
                ? 'Comprehensive guide to every software function, accounting algorithm (WAC/CMP, margins), RBAC permission matrix, POS checkout cycle, supply chain, and physical inventory sessions.'
                : 'Guide exhaustif de chaque fonction logicielle, algorithme comptable (CMP, marges), matrice de droits (RBAC), cycle de vente POS, approvisionnements et sessions d\'inventaire physique.'}
            </p>
          </div>

          {/* Action Buttons: PDF Download & Print */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingPdf
                  ? (isEn ? 'Generating PDF...' : 'Génération...')
                  : (isEn ? 'Download PDF' : 'Télécharger PDF')}
              </span>
            </button>

            <a
              href={`/${staticPdfFilename}`}
              download={staticPdfFilename}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-emerald-700 shadow-xs'
              }`}
              title={isEn ? 'Direct link to pre-compiled PDF file' : 'Lien direct fichier PDF pré-généré'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isEn ? 'PDF File' : 'Fichier PDF'}</span>
            </a>

            <button
              onClick={handlePrint}
              className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{isEn ? 'Print' : 'Imprimer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Code className="w-4 h-4" />
            <span>{isEn ? 'Documented Functions' : 'Fonctions Répertoriées'}</span>
          </div>
          <div className="text-2xl font-bold mt-1">{allFunctions.length}</div>
          <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {isEn ? '100% with signature & rule' : '100% avec signature & règle'}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{isEn ? 'Security Profiles (RBAC)' : 'Profils de Sécurité (RBAC)'}</span>
          </div>
          <div className="text-2xl font-bold mt-1">{isEn ? '4 Roles' : '4 Rôles'}</div>
          <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {isEn ? 'Admin, Manager, Cashier, Stockist' : 'Admin, Responsable, Caisse, Dépôt'}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Calculator className="w-4 h-4" />
            <span>{isEn ? 'Valuation Engine' : 'Moteur Valorisation'}</span>
          </div>
          <div className="text-2xl font-bold mt-1">{isEn ? 'WAC + Fees' : 'CMP + Frais'}</div>
          <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {isEn ? 'Landing costs attribution' : 'Attribution des coûts d\'approche'}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <History className="w-4 h-4" />
            <span>{isEn ? 'Audit Trail (ISO)' : 'Piste d\'Audit (ISO)'}</span>
          </div>
          <div className="text-2xl font-bold mt-1">16 Actions</div>
          <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {isEn ? 'Complete immutable traceability' : 'Traçabilité inaltérable complète'}
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-medium">
            {[
              { id: 'all', label: isEn ? 'All Functions' : 'Toutes les Fonctions' },
              { id: 'cmp', label: isEn ? 'WAC & Stock Engine' : 'Moteur CMP & Stock' },
              { id: 'pos', label: isEn ? 'POS Checkout & Sales' : 'Caisse & Ventes (POS)' },
              { id: 'purchases', label: isEn ? 'Purchases & Goods Receipt' : 'Achats & Réceptions' },
              { id: 'invoicing', label: isEn ? 'Invoicing & Debts' : 'Facturation & Dettes' },
              { id: 'inventory', label: isEn ? 'Physical Inventory' : 'Inventaires Physiques' },
              { id: 'roles', label: isEn ? 'Roles & Security' : 'Rôles & Sécurité' },
              { id: 'architecture', label: isEn ? 'Multi-Store & i18n' : 'Multi-Magasins & i18n' },
              { id: 'reports', label: isEn ? 'Audit & Backups' : 'Audit & Sauvegardes' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : theme === 'dark'
                      ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search function, rule or formula...' : 'Rechercher une fonction, règle ou formule...'}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* CORE SECTIONS BREAKDOWN */}
      {/* 1. MOTEUR CMP / WAC & FORMULES MATHÉMATIQUES */}
      {(activeTab === 'all' || activeTab === 'cmp') && (
        <section className={`p-6 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEn
                  ? 'Stock Engine & Official Mathematical WAC Formula'
                  : 'Moteur de Stock & Formule Mathématique Officielle du CMP'}
              </h2>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {isEn
                  ? 'Feed mill inventory valuation method with landing cost attribution'
                  : 'Méthode de valorisation comptable des stocks en provenderie avec attribution des frais d\'approche'}
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border mb-4 font-mono text-xs ${
            theme === 'dark' ? 'bg-slate-950 border-emerald-900/60 text-emerald-300' : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
          }`}>
            <div className="font-bold text-sm mb-1 text-emerald-600 dark:text-emerald-400">
              {isEn
                ? 'Weighted Average Cost Recalculation Formula (executed by validatePurchaseReception):'
                : 'Formule de Recalcul du Coût Moyen Pondéré (exécutée par validatePurchaseReception) :'}
            </div>
            <div className="p-3 bg-black/10 dark:bg-black/40 rounded-lg text-xs sm:text-sm">
              {isEn
                ? 'New_WAC = [ (Base_Initial_Stock × Old_WAC) + (Received_Qty × Unit_Purchase_Price) + Transport_Fees + Other_Landing_Fees ] / [ Base_Initial_Stock + Received_Qty ]'
                : 'Nouveau_CMP = [ (Stock_Initial_Base × Ancien_CMP) + (Quantité_Reçue × Prix_Achat_Unitaire) + Frais_Transport + Autres_Frais ] / [ Stock_Initial_Base + Quantité_Reçue ]'}
            </div>
            <div className="mt-2 text-[11px] opacity-80">
              {isEn
                ? '* Where Received_Qty and Initial_Stock are always calculated in the base inventory unit (e.g. Kilograms).'
                : '* Où Quantité_Reçue et Stock_Initial sont toujours exprimés en unité de base (ex: Kilogrammes pour les matières premières et sacs d\'aliments finis).'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {isEn ? '1. Conversion Factor' : '1. Facteur de Conversion'}
              </div>
              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                {isEn
                  ? 'Enables selling in 50 kg bags or loose by the kilo. The system immediately converts each quantity to kilograms for stock movements.'
                  : 'Permet la vente par sacs de 50 kg ou au détail au kilo. Le système convertit immédiatement chaque quantité en kilogrammes pour les mouvements physiques.'}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {isEn ? '2. Attributable Landing Costs' : '2. Frais d\'Approche Incorporés'}
              </div>
              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                {isEn
                  ? 'Inbound freight and offloading fees are integrated into the acquisition cost, ensuring true, undistorted profit margins.'
                  : 'Le camion de maïs intègre le transport et la manutention directement dans le coût d\'entrée, garantissant une marge réelle non faussée.'}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {isEn ? '3. Real-Time Gross Margin' : '3. Marge Brute en Temps Réel'}
              </div>
              <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                {isEn
                  ? 'Gross Margin = Net Revenue - COGS. Margin Rate (%) = (Gross Margin / Net Revenue) × 100.'
                  : 'Marge = CA Net - CMV (Coût des Marchandises Vendues). Taux de marge (%) = (Marge Brute / CA Net) × 100.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. MATRICE RBAC & SÉCURITÉ */}
      {(activeTab === 'all' || activeTab === 'roles') && (
        <section className={`p-6 rounded-2xl border ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEn
                  ? 'RBAC Permissions Matrix (Role-Based Access Control)'
                  : 'Matrice des Habilitations RBAC (Role-Based Access Control)'}
              </h2>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {isEn
                  ? 'Permission boundaries and commercial discount ceilings per role'
                  : 'Règles de restriction par rôle et plafonds de remise commerciale'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className={theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}>
                  <th className="p-3 font-semibold rounded-l-lg">{isEn ? 'Role' : 'Rôle'}</th>
                  <th className="p-3 font-semibold">{isEn ? 'Discount Limit' : 'Plafond Remise'}</th>
                  <th className="p-3 font-semibold">{isEn ? 'POS Checkout' : 'Ventes & Caisse POS'}</th>
                  <th className="p-3 font-semibold">{isEn ? 'Catalog & Pricing' : 'Catalogue & Prix'}</th>
                  <th className="p-3 font-semibold">{isEn ? 'Goods Receipts' : 'Réceptions BL'}</th>
                  <th className="p-3 font-semibold">{isEn ? 'Stocktaking' : 'Inventaires Physiques'}</th>
                  <th className="p-3 font-semibold rounded-r-lg">{isEn ? 'System & Backups' : 'Sauvegarde & Système'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                <tr>
                  <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                    {isEn ? 'Administrator' : 'Administrateur'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600">
                      {isEn ? '100% (Full)' : '100% (Libre)'}
                    </span>
                  </td>
                  <td className="p-3">{isEn ? 'Full Access' : 'Accès Total'}</td>
                  <td className="p-3">{isEn ? 'Create, Edit, Archive' : 'Création, Édition, Archivage'}</td>
                  <td className="p-3">{isEn ? 'Create & Validate' : 'Création & Validation'}</td>
                  <td className="p-3">{isEn ? 'Create & Validate' : 'Création & Validation'}</td>
                  <td className="p-3">{isEn ? 'Full Access & Multi-Store' : 'Accès Total & Multi-Magasins'}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                    {isEn ? 'Depot Manager' : 'Responsable de Dépôt'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600">
                      {isEn ? '15% Max' : '15% Max'}
                    </span>
                  </td>
                  <td className="p-3">{isEn ? 'Full Access' : 'Accès Total'}</td>
                  <td className="p-3">{isEn ? 'View & Adjustments' : 'Consultation & Mouvements'}</td>
                  <td className="p-3">{isEn ? 'Validate Receipt' : 'Validation Réception'}</td>
                  <td className="p-3">{isEn ? 'Validate Variances' : 'Validation des Écarts'}</td>
                  <td className="p-3">{isEn ? 'Reports & Audit' : 'Rapports & Audit'}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-amber-600 dark:text-amber-400">
                    {isEn ? 'Cashier' : 'Caissier'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600">
                      {isEn ? '0% (Blocked)' : '0% (Interdit)'}
                    </span>
                  </td>
                  <td className="p-3">{isEn ? 'Sales & Checkout' : 'Vente & Encaissement'}</td>
                  <td className="p-3">{isEn ? 'View stock only' : 'Consultation Stock seul'}</td>
                  <td className="p-3 text-red-500 font-semibold">{isEn ? 'Denied' : 'Refusé'}</td>
                  <td className="p-3 text-red-500 font-semibold">{isEn ? 'Denied' : 'Refusé'}</td>
                  <td className="p-3 text-red-500 font-semibold">{isEn ? 'Denied' : 'Refusé'}</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-purple-600 dark:text-purple-400">
                    {isEn ? 'Stockist / Warehouse' : 'Magasinier'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-slate-500/10 text-slate-500">
                      {isEn ? '0% (Blocked)' : '0% (Interdit)'}
                    </span>
                  </td>
                  <td className="p-3 text-red-500 font-semibold">{isEn ? 'Denied' : 'Refusé'}</td>
                  <td className="p-3">{isEn ? 'Movements & Adjustments' : 'Mouvements & Ajustements'}</td>
                  <td className="p-3">{isEn ? 'Physical Receipt on Site' : 'Réception physique BL'}</td>
                  <td className="p-3">{isEn ? 'Enter Physical Counts' : 'Saisie des comptages'}</td>
                  <td className="p-3 text-red-500 font-semibold">{isEn ? 'Denied' : 'Refusé'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. LISTE EXHAUSTIVE DE TOUTES LES FONCTIONS AVEC RECHERCHE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {isEn
                ? 'Exhaustive Codebase Function Directory'
                : 'Répertoire Exhaustif de Toutes les Fonctions Code'}
            </h2>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {isEn
                ? `Displaying ${filteredFunctions.length} documented function(s)`
                : `Affichage de ${filteredFunctions.length} fonction(s) documentée(s)`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredFunctions.map(func => {
            const moduleName = isEn ? func.moduleEn : func.moduleFr;
            const description = isEn ? func.descriptionEn : func.descriptionFr;
            const inputs = isEn ? func.inputsEn : func.inputsFr;
            const outputs = isEn ? func.outputsEn : func.outputsFr;
            const businessRule = isEn ? func.businessRuleEn : func.businessRuleFr;

            return (
              <div
                key={func.name}
                className={`p-5 rounded-xl border transition-all hover:shadow-md ${
                  theme === 'dark'
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {func.name}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        theme === 'dark' ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {moduleName}
                      </span>
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      {description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopyCode(func.signature, func.name)}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border font-mono shrink-0 transition-colors cursor-pointer ${
                      copiedFunction === func.name
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                    title={isEn ? 'Copy signature' : 'Copier la signature'}
                  >
                    {copiedFunction === func.name ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Copied!' : 'Copié !'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Copy' : 'Copier'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Signature Code Box */}
                <div className={`p-2.5 rounded-lg font-mono text-xs mb-3 overflow-x-auto ${
                  theme === 'dark' ? 'bg-slate-950 text-emerald-400 border border-slate-800' : 'bg-slate-50 text-emerald-700 border border-slate-200'
                }`}>
                  <code>{func.signature}</code>
                </div>

                {/* Functional & Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800/40 dark:border-slate-800/80">
                  <div>
                    <span className={`font-semibold block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isEn ? 'Inputs:' : 'Entrées (Inputs) :'}
                    </span>
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                      {inputs}
                    </span>
                  </div>

                  <div>
                    <span className={`font-semibold block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isEn ? 'Outputs:' : 'Sorties (Outputs) :'}
                    </span>
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                      {outputs}
                    </span>
                  </div>

                  <div>
                    <span className={`font-semibold block mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isEn ? 'Business Rule & Validation:' : 'Règle Métier & Validation :'}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {businessRule}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
