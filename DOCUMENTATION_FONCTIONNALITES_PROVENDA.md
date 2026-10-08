# COOPS BIR - SAA | PROVENDA — Manuel Fonctionnel & Spécification Technique Complète
**Version :** 2.5 (Édition Officielle)  
**Date d'édition :** Octobre 2026  
**Société :** COOPS BIR - SAA (Société Coopérative Simplifiée d'Élevage et Provenderie)  
**Siège :** Bafoussam / Douala, Cameroun — RCCM : RC/BFM/2026/B/452  
**Cible :** Administrateurs, Développeurs, Auditeurs Comptables, Responsables d'Exploitation et Caissiers  
**Monnaie de Référence :** Franc CFA (FCFA / XAF) avec séparateur de milliers officiel (ex: `1 250 000 FCFA`)  
**Moteur d'Export PDF :** Compilé dynamiquement côté client via `jsPDF` vectoriel et `jspdf-autotable`

---

## Sommaire Exécutif

L'application **Provenda** est un progiciel de gestion intégré (ERP) et terminal de point de vente (POS) développé sur mesure pour les unités de fabrication d'aliments pour bétail et volaille (provenderies modernes) et leurs points de distribution.

Le système garantit l'intégrité opérationnelle, comptable et financière des flux de matières premières et d'aliments finis à travers :
1. **Un moteur de stock au Coût Moyen Pondéré (CMP / WAC)** intégrant automatiquement les frais d'approche (fret routier, déchargement et manutention).
2. **Un terminal point de vente (POS) en temps réel** avec calcul instantané des marges brutes (CA Net - Coût des Ventes au CMP) et encaissements multi-moyens (Espèces, Orange Money, MTN MoMo, Virement bancaire, Vente à terme / Crédit client).
3. **Un pilote d'impression thermique POS dédié** prenant en charge les tickets de caisse en formats 58 mm et 80 mm, le spooler Windows, les codes-barres Code 39 et la sécurisation des réimpressions (marquage duplicata).
4. **Une synchronisation cloud automatique avec Supabase (PostgreSQL)** complétant une architecture 100% autonome hors-ligne (local-first).
5. **Une hiérarchie de sécurité RBAC hermétique à 5 niveaux** distinguant strictement le rôle Développeur (console système et purge transactionnelle), l'Administrateur, les Responsables de dépôt, les Caissiers et les Magasiniers.
6. **Un catalogue "Produits & Tarifs" dédié** avec gestion des unités (kg/litre vs sac/palette), conditionnements et historique des révisions tarifaires.
7. **La pérennité inaltérable de l'identité de marque** via l'encapsulation du logo officiel de la coopérative en Base64 autonome, assurant un affichage instantané sur tout nouveau poste, navigateur ou installation hors-ligne.
8. **Un classement antéchronologique universel** organisant l'ensemble des documents (tickets, factures, achats, mouvements de stock, inventaires, dépenses, journaux d'audit) de manière décroissante (le plus récent en tête).

---

## 1. Architecture Globale & Matrice de Sécurité (RBAC)

### 1.1 Socle Technique & Performance
- **Framework Frontend :** React 19 SPA optimisé par Vite.
- **Typage Statique :** TypeScript 5.8+ strict pour l'élimination des régressions à l'exécution.
- **Gestionnaire d'État :** React Context unifié (`AppContext.tsx`) garantissant l'atomicité transactionnelle synchrone.
- **Stockage Local-First :** LocalStorage et IndexedDB pour une disponibilité 100% autonome hors-ligne.
- **Synchronisation Cloud :** Moteur d'arrière-plan Supabase JS avec base de données PostgreSQL managée.
- **Moteur d'Impression :** Pilote thermique hybride (`receiptPrinterService.ts`) pour formats 58 mm et 80 mm.
- **Packaging Desktop :** Electron avec scripts d'installation autonome et raccourci bureau Windows.

---

### 1.2 Matrice Complète des Rôles & Séparation des Privilèges

Le système applique une séparation stricte des fonctions :

| Fonctionnalité / Droit d'Accès | Développeur | Administrateur | Responsable | Caissier | Magasinier |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Visibilité du compte dans la liste** | **Lui seul** | Masqué | Masqué | Masqué | Masqué |
| **Création d'utilisateurs** | Tous rôles | Resp, Caiss, Mag | Aucun | Aucun | Aucun |
| **Plafond de remise unitaire / globale** | 100% | 100% max | 15% max | **0% (Interdit)** | **0% (Interdit)** |
| **Enregistrement de vente POS** | Oui | Oui | Oui | Oui | Non |
| **Encaissement multi-moyens de caisse** | Oui | Oui | Oui | Oui | Non |
| **Gestion du catalogue "Produits & Tarifs"**| Oui | Oui | Consultation | Consultation | Consultation |
| **Modification des prix catalogue** | Oui | Oui (Avec motif)| Non | Non | Non |
| **Saisie de bon d'achat (Brouillon)** | Oui | Oui | Oui | Non | Non |
| **Validation réception BL & recalcul CMP** | Oui | Oui | Oui | Non | Oui (Sur site) |
| **Sessions d'inventaire physique** | Oui | Création/Validation| Validation | Non | Comptage terrain |
| **Régularisation perte/casse manuelle** | Oui | Oui | Oui | Non | Oui (Avec motif) |
| **Annulation de facture & Avoirs (AVO)** | Oui | Oui (Avec motif)| Oui (Avec motif)| Non | Non |
| **Recouvrement créances clients** | Oui | Oui | Oui | Oui | Non |
| **Rapports financiers & Valorisation CMP** | Oui | Oui | Oui | Non | Non |
| **Piste d'audit inaltérable (Audit Trail)**| Oui | Oui | Consultation | Non | Non |
| **Configuration Cloud Supabase** | Oui | Consultation | Non | Non | Non |
| **Réinitialisation usine (Purge client)** | **Oui (Exclusif)**| Non | Non | Non | Non |

> **Règle de Gouvernance :** Le compte Développeur est un compte d'ingénierie et de maintenance. Pour préserver l'autorité de l'entreprise, il est masqué dans les listes d'utilisateurs pour tous les autres profils. Il n'existe qu'un seul compte Développeur et un seul compte Administrateur actif à la fois.

---

## 2. Moteur de Stock & Calculateur Dynamique du CMP (WAC)

### 2.1 Formule Mathématique Officielle du CMP
Le Coût Moyen Pondéré est l'unique méthode de valorisation retenue pour refléter fidèlement les coûts d'acquisition volatils des céréales, tourteaux et concentrés.

Lors de la validation de la réception d'une commande d'achat (`validatePurchaseReception`) :
```
Coût_Entrée = ( Quantité_Reçue × Prix_Achat_Unitaire ) + Frais_Transport_Attribués + Frais_Déchargement_Approche

Nouveau_CMP = [ ( Stock_Initial_Base × Ancien_CMP ) + Coût_Entrée ] / [ Stock_Initial_Base + Quantité_Reçue ]
```

### 2.2 Incorporation des Frais d'Approche
Conformément aux normes comptables SYSCOHADA :
- Les frais de transport routier et de déchargement sont obligatoirement imputés dans le coût d'entrée des stocks au prorata des quantités livrées.
- Cela évite toute surévaluation trompeuse de la marge brute et empêche la provenderie de vendre en dessous de son coût de revient complet.

### 2.3 Moteur de Conversion d'Unités & Conditionnements
Chaque produit associe son **unité de base de stockage** (kg, litre) à une **unité commerciale de vente** (sac de 50 kg, sac de 25 kg, bidon de 20 L, vrac au kg) :
- `1 sac de 50 kg` vendu en caisse déduit instantanément `50 kg` du stock physique de l'entrepôt valorisés au CMP unitaire.
- `1 sac de 25 kg` déduit `25 kg` de stock physique.
- Le prix de vente s'applique directement au conditionnement commercial sélectionné sur le terminal POS.

---

## 3. Terminal Point de Vente (POS) & Encaissement Multi-Moyens

### 3.1 Cycle d'Enregistrement d'une Vente
1. **Recherche Instantanée :** Par code produit normalisé (`PRD-XXX`), désignation commerciale ou catégorie.
2. **Choix du Conditionnement :** Sélection instantanée sac / kilo avec ajustement automatique du prix unitaire.
3. **Contrôle Strict des Remises :**
   - Caissier : champ remise verrouillé à 0%.
   - Responsable : plafond bloqué à 15% maximum.
   - Administrateur : dérogation jusqu'à 100% avec motif obligatoire consigné dans l'audit.
4. **Calcul de Rentabilité en Temps Réel :**
   - `Coût des Ventes (CMV) = Quantité_Base × CMP`
   - `Chiffre d'Affaires Net = Total_Brut - Remise`
   - `Marge Brute = CA_Net - CMV`
   - `Taux de Marge (%) = (Marge_Brute / CA_Net) × 100`

### 3.2 Modalités de Règlement Fractionné & Crédits
- **Espèces :** Saisie du versement client avec calcul instantané du rendu de monnaie.
- **Mobile Money (Orange Money / MTN MoMo) :** Saisie du numéro de transaction pour traçabilité du relevé financier.
- **Virement Bancaire :** Enregistrement de la référence du bordereau de banque.
- **Vente à Crédit / Compte à Terme :**
   - Contrôle du plafond de crédit (`creditLimit`).
   - Vérification de l'encours de dette existant (`currentDebt`).
   - Blocage si le cumul dépasse le plafond autorisé.
   - Fixation obligatoire d'une date d'échéance de remboursement.

---

## 4. Pilote d'Impression Thermique POS (58 mm & 80 mm)

### 4.1 Caractéristiques Techniques du Pilote
Le module d'impression thermique (`receiptPrinterService.ts`) fournit une passerelle haute performance pour l'édition de tickets de caisse :
- **Formats Supportés :** 58 mm (imprimantes mobiles Bluetooth / USB) et 80 mm (caisses POS de comptoir).
- **Architecture d'Impression :** Support natif du spooler Windows, imprimantes USB / réseau et conteneur iframe d'impression isolée.
- **Éléments du Ticket :**
  - Logo officiel de l'entreprise.
  - En-tête de la coopérative et coordonnées fiscales (NIF, RCCM).
  - Identification du caissier, date, heure et client.
  - Tableau des articles détaillant désignation, quantité, prix unitaire et montant total.
  - Récapitulatif financier (Total brut, remises, total net à payer, montants perçus, rendu de monnaie).
  - Code-barres Code 39 du numéro de ticket pour scan optique ultérieur.
- **Sécurité Anti-Fraude :** En cas de réimpression, mention automatique indélébile `*** DUPLICATA / RÉIMPRESSION ***`.
- **Outil de Diagnostic :** Bouton de test matériel dans les paramètres pour vérifier la connectivité et l'alignement.

---

## 5. Synchronisation Cloud Supabase & Architecture Hors-Ligne

### 5.1 Fonctionnement Local-First Autonome
Provenda est conçu pour fonctionner sans interruption, même en cas de coupure totale d'Internet :
- Les ventes, encaissements, mouvements de stock et écritures d'inventaire sont immédiatement enregistrés en local (IndexedDB / LocalStorage).
- Dès que le réseau est détecté, le moteur d'arrière-plan déclenche la synchronisation automatique (`performAutomaticSync`) vers la base PostgreSQL Supabase hébergée dans le cloud.
- Un jeu de clés de secours est configuré dans `src/config/supabaseDefaultConfig.ts`, garantissant le raccordement immédiat sans saisie manuelle préalable.

### 5.2 Sauvegarde & Restauration Système
- **Export JSON Intégral :** Téléchargement instantané d'une archive complète et horodatée de toutes les tables applicatives.
- **Restauration Intelligente :** Contrôle de schéma, validation d'intégrité et réinjection automatique des données.

---

## 6. Catalogue "Produits & Tarifs" & Historique des Prix

Le module **Produits & Tarifs** (`ProductCatalog.tsx`) centralise la gestion commerciale :
- Création rapide d'articles avec code automatique `PRD-XXX`.
- Attribution des catégories : Matières premières, Aliments finis, Concentrés & Prémix, Fournitures vétérinaires.
- Définition des unités d'achat et de vente, ratios de conversion et conditionnements (sacs de 50 kg, 25 kg, vrac au kg, bidons).
- Révision des prix de vente : chaque modification enregistre l'ancien prix, le nouveau prix, la date, l'utilisateur et le motif dans l'historique `priceHistory` et dans la piste d'audit.
- Uniformité des contrastes en mode sombre et clair pour une parfaite lisibilité en milieu industriel.

---

## 7. Console Développeur, Remise à Zéro Client & Normes de Tri

### 7.1 Réinitialisation Usine ("Zéro Donnée Client")
Pour permettre à l'intégrateur ou au développeur de livrer une application propre et vierge au client final :
- La fonction **"Réinitialiser aux Données Initiales"** supprime l'intégralité des écritures transactionnelles : factures, tickets de caisse, commandes d'achats, mouvements de stock, sessions d'inventaire, dépenses d'exploitation et avoirs.
- Elle préserve intacts le catalogue des produits, les utilisateurs de base, les paramètres de l'entreprise et le logo officiel en base64.
- Le client final démarre son exploitation avec une comptabilité vierge sans résidus de tests.

### 7.2 Classement Antéchronologique Universel
Tous les écrans opérationnels de l'application classent systématiquement les flux par **date et heure de création décroissante** (les plus récents en premier) :
- Ventes & factures de caisse
- Commandes d'achats & réceptions fournisseurs
- Mouvements du grand livre de stock
- Sessions d'inventaire physique
- Dépenses de trésorerie
- Journal de la piste d'audit

### 7.3 Formatage Standard des Devises
Les montants financiers en Franc CFA adoptent la norme typographique officielle avec **espace insécable comme séparateur de milliers** (ex: `1 250 000 FCFA` au lieu de barres obliques ou de virgules erronées).

---

## 8. Rapports Financiers, Valorisation CMP & Piste d'Audit

### 8.1 Rapport "Stocks & Valorisation CMP"
- Audit instantané des quantités physiques disponibles en magasin.
- Valorisation au CMP unitaire réel de chaque matière première et aliment fini.
- **Ligne de totalisation contrastée :** La valeur totale du stock s'affiche sur un fond sombre uniforme avec texte clair, garantissant une lisibilité optimale à l'écran et sur document imprimé.

### 8.2 Journal des Ventes & Marges
- Chiffre d'affaires brut, remises accordées, chiffre d'affaires net.
- Coût des ventes (CMV) calculé ligne par ligne sur la base du CMP lors de la vente.
- Marge brute en valeur absolue et taux de marge commercial (%).

### 8.3 Piste d'Audit Inaltérable (Audit Trail)
- Enregistrement forensique de tout événement sensible : horodatage, utilisateur, entité cible, ancienne valeur, nouvelle valeur et justification.
- Non-répudiation des actes de gestion pour le contrôle interne et les audits comptables.

---

## 9. Répertoire des Fonctions du Code Source (AppContext & Services)

### Authentification & Sécurité RBAC
- `login(email, password)`: Authentifie l'utilisateur, vérifie l'état actif du compte et met à jour `lastLogin`.
- `logout()`: Clôture la session active et redirige vers la page d'accès.
- `switchRole(role)`: Bascule temporairement de rôle pour tester les autorisations.
- `addUser(user)`: Enregistre un utilisateur selon la hiérarchie Développeur > Administrateur > Opérationnels.
- `updateUser(user)`: Met à jour coordonnées, rôle, mot de passe ou plafond de remise d'un employé.
- `deactivateUser(id)`: Bloque l'accès d'un collaborateur sans supprimer son historique de vente.

### Gestion du Catalogue
- `addProduct(product)`: Crée un nouvel article ou intrant avec unité de base, conversion et prix de vente.
- `updateProduct(product)`: Modifie la fiche produit et ses paramètres d'approvisionnement.
- `updateProductPrice(id, newPrice, reason)`: Réviser le prix catalogue avec archivage dans `priceHistory` et audit.
- `deleteProduct(id)`: Archive un produit obsolète sans impacter les factures antérieures.

### Moteur de Caisse POS & Ventes
- `createSale(...)`: Transaction atomique de vente. Vérifie le stock, applique les plafonds de remise, calcule la marge au CMP, décrémente le stock, génère `FAC-AAAA-XXXXXX` et imprime le ticket.
- `cancelInvoiceWithCreditNote(id, reason)`: Annule une vente avec émission d'un avoir `AVO-AAAA-XXXXXX`, réintégration en stock au CMP et ajustement de créance.
- `recordDebtPayment(...)`: Encaisse un versement sur une créance client et ajuste le solde restant dû.

### Achats, Approvisionnements & Moteur CMP
- `createPurchaseDraft(p, spId)`: Crée un bon de commande `ACH-AAAA-XXXXXX` avec estimation des frais d'approche.
- `validatePurchaseReception(id)`: Moteur central du CMP. Intègre les frais de fret, calcule le nouveau CMP unitaire, crédite le stock et valide le bon de livraison.
- `cancelPurchase(id, reason)`: Annule une commande en attente avec motif justificatif.

### Pilote Thermique POS
- `printReceipt(invoice, settings, config, isReprint)`: Transmet le ticket formaté à l'imprimante thermique via spooler ou iframe.
- `formatReceiptThermal58mm(...)`: Génère le template HTML compact 32 colonnes pour imprimante 58 mm.
- `formatReceiptThermal80mm(...)`: Génère le template HTML standardisé 42 colonnes pour caisse POS 80 mm.
- `savePrinterConfig(config)`: Sauvegarde la configuration du matériel d'encaissement.
- `printTestReceipt(settings, config)`: Émet un ticket de diagnostic pour valider le fonctionnement de l'imprimante.

### Synchro Supabase & Maintenance
- `performAutomaticSync()`: Synchronise automatiquement les tables locales vers la base cloud PostgreSQL.
- `pushAllLocalDataToSupabase()`: Force l'envoi de la totalité des données locales vers Supabase.
- `pullAllDataFromSupabase()`: Télécharge l'état cloud le plus récent sur la machine locale.
- `resetToDefaultData()`: Console développeur : purge complète des données transactionnelles de test pour livraison au client.
- `exportSystemBackup()`: Génère l'archive JSON téléchargeable de l'état système.
- `restoreSystemBackup(json)`: Restaure l'application à partir d'un fichier de sauvegarde JSON.

---

## 10. Génération & Téléchargement du Document PDF

1. **Génération Vectorielle Intégrée :** Le manuel est disponible au format PDF A4 officiel en français et en anglais via le module `buildApplicationDocumentationPDF()`.
2. **Téléchargement dans l'Application :** Accessible directement depuis le menu **Documentation** de l'interface utilisateur en cliquant sur *"Télécharger la Documentation Complète (PDF)"*.
3. **Mise à Jour Automatisée par Script :** La commande `npm run docs` régénère instantanément les fichiers PDF statiques dans les dossiers `/public` et `/dist`.

---
*Document officiel de référence fonctionnelle et technique — COOPS BIR - SAA | Provenda ERP v2.5.*
