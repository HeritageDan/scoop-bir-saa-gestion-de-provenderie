# PROVENDA - Manuel Fonctionnel & Spécification Technique Complète
**Version :** 2.2  
**Date d'édition :** 25 Septembre 2026  
**Auteur :** Équipe d'Ingénierie & Architecture Provenda  
**Cible :** Administrateurs, Développeurs, Auditeurs Comptables et Responsables d'Exploitation  
**Monnaie :** Franc CFA (FCFA / XAF)  
**Format d'export PDF :** Généré dynamiquement via `jspdf` et `jspdf-autotable`

---

## Sommaire Exécutif

L'application **Provenda** est un progiciel de gestion intégré (ERP) et terminal de point de vente (POS) conçu spécialement pour les unités de fabrication et de distribution d'aliments pour bétail et volaille (provenderies).

Le système garantit l'intégrité comptable et financière des flux de matières premières et d'aliments finis à travers :
1. **Un moteur de stock au Coût Moyen Pondéré (CMP)** intégrant automatiquement les frais d'approche (transport, déchargement).
2. **Un contrôle strict des marges commerciales** calculées ligne par ligne et en global lors des ventes.
3. **Une séparation hermétique des privilèges (RBAC)** empêchant les remises non autorisées et les suppressions de documents.
4. **Une traçabilité complète (Audit Trail)** consignant chaque modification de prix, annulation et régularisation.
5. **Une gestion multi-magasins** permettant le pilotage consolidé ou décentralisé de plusieurs points de vente.

---

## 1. Architecture du Système & Modèles de Données

### 1.1 Architecture Technique
- **Framework Frontend :** React 19 SPA optimisé par Vite.
- **Typage Statique :** TypeScript strict garantissant la cohérence des modèles et l'absence de régressions à l'exécution.
- **Gestionnaire d'État :** React Context unifié (`AppContext.tsx`) assurant l'atomicité des transactions (vente, encaissement, décrément de stock et audit exécutés de manière synchrone).
- **Persistance :** LocalStorage avec validation de schéma et moteur d'import/export de sauvegarde JSON intégrale.
- **Génération de PDF :** Moteur vectoriel client `jsPDF` avec formatage automatisé des tableaux via `jspdf-autotable`.

### 1.2 Entités Métier Principales

#### `Product` (Article de Provenderie)
- `id`: Identifiant unique UUID.
- `code`: Code produit séquentiel normalisé (ex: `PRD-001`).
- `name`: Libellé commercial (ex: `Aliment Chair Finition`).
- `category`: Catégorie (`Matières premières`, `Concentrés, prémix et compléments`, `Aliments finis`, `Autres fournitures`).
- `baseUnit`: Unité de référence du stock physique (`kilogramme`, `litre`, `sac`, `unité`, `tonne`).
- `saleUnit`: Unité commerciale par défaut sur le terminal de vente.
- `packaging`: Libellé du conditionnement (ex: `Sac de 50 kg`).
- `conversionFactor`: Ratio entre l'unité de vente et l'unité de base (ex: 1 sac = 50 kg => facteur = `50`).
- `purchasePrice`: Dernier prix d'achat unitaire de référence (FCFA).
- `salePrice`: Prix de vente public standard (FCFA).
- `cmp`: Coût Moyen Pondéré unitaire en FCFA, recalculé lors de chaque réception de marchandise.
- `stockCurrentBaseUnit`: Stock physique disponible exprimé dans l'unité de base.
- `minAlertThresholdBaseUnit`: Seuil critique déclenchant les alertes de réapprovisionnement.
- `status`: Statut opérationnel (`actif`, `masqué`, `archivé`).
- `priceHistory`: Tableau horodaté des variations de prix avec auteur et motif de révision.

#### `Invoice` (Facture de Vente)
- `id`: UUID.
- `number`: Numérotation séquentielle certifiée (format `FAC-AAAA-XXXXXX`).
- `date` / `time`: Horodatage de l'opération.
- `customerId` / `customerName`: Tiers acheteur.
- `items`: Lignes d'articles vendus (quantité, prix unitaire, remise ligne, CMP historique, CMV, marge brute).
- `subtotalGross`: Chiffre d'affaires brut avant remise.
- `totalDiscount`: Montant total des rabais accordés.
- `totalNet`: Montant net à payer par le client.
- `totalCostOfGoodsSold`: Coût de revient total (CMV) calculé sur la base du CMP lors de la vente.
- `grossMargin`: Marge brute dégagée (`totalNet - totalCostOfGoodsSold`).
- `marginRateSales`: Taux de marge sur chiffre d'affaires (`grossMargin / totalNet * 100`).
- `payments`: Tableau des encaissements reçus (Espèces, MoMo, Orange Money, Virement).
- `amountPaid`: Somme totale encaissée.
- `remainingBalance`: Solde restant dû en cas de crédit ou paiement partiel.
- `status`: État de la créance (`émise`, `payée`, `partielle`, `crédit`, `annulée`).
- `isCredit`: Indicateur de vente à terme.
- `creditDueDate`: Date limite de paiement négociée avec l'éleveur.

---

## 2. Matrice des Rôles & Sécurité d'Accès (RBAC)

L'application distingue quatre profils utilisateurs afin de prévenir la fraude interne et sécuriser la trésorerie :

| Fonctionnalité / Droit | Administrateur | Responsable | Caissier | Magasinier |
| :--- | :---: | :---: | :---: | :---: |
| **Plafond de remise unitaire & globale** | Jusqu'à 100% | Jusqu'à 15% max | **0% (Interdit)** | **0% (Interdit)** |
| **Enregistrement de vente POS** | Oui | Oui | Oui | Non |
| **Encaissement multi-moyens** | Oui | Oui | Oui | Non |
| **Création / Édition de produits** | Oui | Non (Lecture) | Non (Lecture) | Non (Lecture) |
| **Modification des prix catalogue** | Oui | Non | Non | Non |
| **Saisie de commande d'achat (Brouillon)** | Oui | Oui | Non | Non |
| **Validation de réception (BL & recalcul CMP)** | Oui | Oui | Non | Oui (Sur site) |
| **Ajustement manuel de stock (Perte/Casse)** | Oui | Oui | Non | Oui (Avec motif) |
| **Sessions d'inventaire physique** | Création & Validation | Validation | Non | Comptage terrain |
| **Annulation de facture & Avoirs (AVO)** | Oui | Oui (Avec motif) | Non | Non |
| **Règlement des créances clients** | Oui | Oui | Oui | Non |
| **Consultation des marges et rapports financiers** | Oui | Oui | Non | Non |
| **Piste d'audit (Audit Trail)** | Oui | Oui (Consultation) | Non | Non |
| **Sauvegarde / Restauration de base** | Oui | Non | Non | Non |
| **Gestion multi-magasins** | Oui | Magasin assigné | Magasin assigné | Magasin assigné |

---

## 3. Moteur de Stock & Calculateur du CMP (Coût Moyen Pondéré)

### 3.1 Algorithme Mathématique du CMP
Le CMP est l'unique méthode de valorisation des sorties et des stocks de clôture retenue pour refléter fidèlement les coûts d'achat volatils des céréales et tourteaux.

Lors de la validation d'une réception fournisseur (`validatePurchaseReception`) :
```
Coût_Entrée = ( Quantité_Reçue × Prix_Achat_Unitaire ) + Frais_Transport_Attribués + Autres_Frais_Approche

Nouveau_CMP = [ ( Stock_Actuel_Base × Ancien_CMP ) + Coût_Entrée ] / [ Stock_Actuel_Base + Quantité_Reçue ]
```

### 3.2 Incorporation des Frais d'Approche
Conformément aux directives de gestion de provenderie :
- Si un camion livre 10 tonnes de maïs à 180 FCFA/kg avec 150 000 FCFA de frais de transport et 50 000 FCFA de déchargement :
  - Coût d'achat direct : 1 800 000 FCFA.
  - Frais d'approche : 200 000 FCFA.
  - Coût de revient réel d'entrée : 2 000 000 FCFA (soit 200 FCFA/kg réel).
- Le système impute automatiquement ces 200 000 FCFA dans la valeur entrée du stock, empêchant ainsi la provenderie de vendre à perte en croyant que son coût de revient n'était que de 180 FCFA.

### 3.3 Règle de Non-Régression du CMP sur Stock Nul ou Négatif
Si le stock initial était à 0 ou suite à une rupture physique :
```
Nouveau_CMP = Coût_Entrée / Quantité_Reçue
```

---

## 4. Module Caisse & Terminal Point de Vente (POS)

### 4.1 Processus de Saisie d'une Vente
1. **Sélection de l'Article :** Par recherche rapide textuelle ou catégorie.
2. **Choix du Conditionnement :** Sac ou Kilo. Le facteur de conversion calcule instantanément la déduction en stock de base.
3. **Application de Remise :**
   - Si l'utilisateur est Caissier et tente de renseigner une remise > 0%, l'action est bloquée avec invite à faire valider par un Responsable.
   - Si l'utilisateur est Responsable et tente une remise > 15%, blocage système exigeant l'accord de l'Administrateur.
4. **Calcul de la Marge en Temps Réel :**
   - `CMV = Quantité_Base × Produit.cmp`
   - `Marge = Total_Net - CMV`
   - Le système affiche la rentabilité brute de la vente avant même l'encaissement.

### 4.2 Multi-Modes de Paiement & Crédits Clients
- **Espèces :** Saisie du montant remis par le client, calcul automatique de la monnaie à rendre.
- **Paiement Mobile (MoMo / Orange Money) :** Saisie obligatoire du numéro d'opération/transaction pour rapprochement.
- **Virement :** Référence bancaire requise.
- **Vente à Crédit :**
  - Contrôle du plafond de crédit autorisé du client (`customer.creditLimit`).
  - Vérification de l'encours déjà existant (`customer.currentDebt`).
  - Si `currentDebt + totalNet > creditLimit`, le système alerte sur le dépassement de solvabilité.
  - Fixation obligatoire d'une date d'échéance de règlement.

---

## 5. Facturation, Recouvrement & Avoirs

### 5.1 Sérialisation Unique des Documents
- Les factures suivent le format inviolable : `FAC-[ANNÉE]-[NUMÉRO_6_CHIFFRES]`.
- Les avoirs suivent le format : `AVO-[ANNÉE]-[NUMÉRO_6_CHIFFRES]`.
- Les sessions d'inventaire : `INV-[ANNÉE]-[NUMÉRO_6_CHIFFRES]`.
- Les bons de réception : `ACH-[ANNÉE]-[NUMÉRO_6_CHIFFRES]`.

### 5.2 Annulation de Facture & Génération d'Avoir
1. Une facture validée ne peut être physiquement détruite.
2. Pour l'annuler, l'utilisateur exécute `cancelInvoiceWithCreditNote` en fournissant un motif obligatoire.
3. Le système crée automatiquement un document d'Avoir (`CreditNote`).
4. Les stocks de matières premières ou d'aliments sont immédiatement réintégrés au CMP de la vente avec un mouvement `retour client`.
5. Si la facture était à crédit ou partiellement payée, l'encours de dette du client est diminué du solde correspondant.

---

## 6. Inventaires Physiques & Régularisations

### 6.1 Workflow d'une Session d'Inventaire
1. **Création (`createInventorySession`) :** Fige le stock théorique calculé par les flux informatiques à l'instant précis du lancement.
2. **Comptage :** Saisie des quantités réellement dénombrées dans les hangars et magasins.
3. **Calcul des Écarts :**
   - `Écart Quantité = Stock_Physique_Compté - Stock_Théorique`
   - `Valeur de l'Écart (FCFA) = Écart_Quantité × CMP`
4. **Validation (`validateInventorySession`) :**
   - Ajuste le stock physique disponible pour égaler le comptage.
   - Génère les mouvements de stock de type `correction d'inventaire`.
   - Clôture définitivement la session avec archivage des écarts financiers.

---

## 7. Répertoire Exhaustif des Fonctions du Code Source (AppContext)

Chaque fonction ci-dessous constitue l'API du contexte applicatif global de Provenda :

### 7.1 Fonctions d'Environnement & Multi-Magasins
- `toggleTheme()`: Alterne entre thèmes sombre et clair (crème `#FAF7F2`) avec persistance `localStorage`.
- `setLanguage(lang: 'fr' | 'en')`: Modifie la langue applicative.
- `t(key: string)`: Traduit les chaînes de caractères via le dictionnaire multilingue.
- `setCurrentSalesPointId(id: string)`: Change la succursale active de travail.
- `addSalesPoint(sp)`: Crée un point de vente secondaire avec nom, adresse et gérant.
- `updateSalesPoint(sp)`: Modifie les paramètres d'un point de vente.
- `deleteSalesPoint(id)`: Supprime un point de vente non principal.

### 7.2 Fonctions de Sécurité & Authentification
- `login(email, password)`: Contrôle les identifiants, vérifie l'état du compte et met à jour `lastLogin`.
- `logout()`: Réinitialise la session active.
- `switchRole(role)`: Bascule dynamique de rôle pour vérification des habilitations.
- `addUser(user)`: Enregistre un nouvel employé avec rôle, magasin et plafond de remise.
- `updateUser(user)`: Modifie le profil d'un employé.
- `deactivateUser(id)`: Bloque l'accès d'un compte sans effacer son historique comptable.

### 7.3 Fonctions Catalogue & Gestion des Prix
- `addProduct(prod, initialStock, initialCmp)`: Génère le code article `PRD-XXX`, paramètre le conditionnement et valorise le stock d'ouverture au CMP.
- `updateProduct(prod, reason)`: Modifie la fiche produit. Si le prix change, consigne une entrée dans `priceHistory` et dans l'audit.
- `archiveProduct(id)`: Archive un produit obsolète sans altérer les factures passées.
- `unarchiveProduct(id)`: Réactive un article archivé.
- `maskProduct(id)`: Masque un produit temporairement indisponible.

### 7.4 Fonctions Achats & Réceptions (Moteur CMP)
- `createPurchaseDraft(purchase, targetSalesPointId)`: Enregistre une commande fournisseur `ACH-AAAA-XXXXXX` sans impact immédiat sur le stock.
- `validatePurchaseReception(purchaseId)`: **Algorithme central CMP**. Calcule le nouveau coût moyen pondéré, incrémente les stocks en unité de base, crée les mouvements `entrée fournisseur` et valide le bon.
- `cancelPurchase(purchaseId, reason)`: Annule une commande fournisseur en attente avec motif.

### 7.5 Fonctions Caisse, Ventes & Facturation
- `createSale(...)`: Transaction atomique de vente. Vérifie la disponibilité des stocks, contrôle les plafonds de remise du vendeur, valide l'encours du client, calcule la marge brute, génère la facture `FAC-AAAA-XXXXXX`, décrémente les stocks au CMP, enregistre le paiement et trace dans l'audit.
- `cancelInvoiceWithCreditNote(invoiceId, reason)`: Annule une facture avec émission d'un avoir `AVO-AAAA-XXXXXX`, restockage physique et régularisation de la dette client.
- `recordDebtPayment(...)`: Encaisse un règlement partiel ou total de dette client, déduit le solde de la facture et réduit l'encours du client.

### 7.6 Fonctions Stocks, Ajustements & Inventaires
- `recordStockAdjustment(productId, qtyChange, type, justification)`: Ajuste manuellement le stock pour perte, casse, autoconsommation d'élevage ou correction.
- `createInventorySession(categoryFilter)`: Ouvre une session `INV-AAAA-XXXXXX` et fige le stock théorique.
- `validateInventorySession(sessionId, countedItems, notes)`: Compare comptage et théorique, valorise les écarts au CMP, ajuste les stocks réels et clôture l'inventaire.

### 7.7 Fonctions Tiers (Clients & Fournisseurs)
- `addCustomer(customer)`: Crée un tiers client avec son plafond de crédit initial.
- `updateCustomer(customer)`: Actualise les données d'un client.
- `addSupplier(supplier)`: Référence un fournisseur de matières premières ou emballages.
- `updateSupplier(supplier)`: Met à jour les coordonnées d'un fournisseur.
- `deleteSupplier(supplierId)`: Désactive un fournisseur.

### 7.8 Fonctions Audit, Sauvegardes & Paramètres
- `addAuditLog(action, target, id, oldVal, newVal, reason)`: Écrit une ligne inaltérable dans le registre de sécurité.
- `updateSettings(newSettings)`: Enregistre les coordonnées de l'entreprise, NIF/RCCM, taux de TVA et plafonds globaux.
- `exportSystemBackup()`: Génère une archive JSON complète et horodatée de l'ensemble de la base.
- `restoreSystemBackup(json)`: Valide et réinjecte une sauvegarde complète dans le système.
- `resetToDefaultData()`: Rétablit les données d'usine pré-calibrées pour la formation.
- `getLowStockProducts()`: Détecte en temps réel les produits ayant atteint leur seuil d'alerte.
- `getOutOfStockProducts()`: Identifie les ruptures de stock critiques.

---

## 8. Exportation & Téléchargement PDF

Le système intègre deux méthodes directes de génération PDF :
1. **Téléchargement Direct du PDF Haute Définition :** Accessible via le bouton *"Télécharger le Manuel PDF"* dans l'interface de documentation ou le composant `generateApplicationDocumentationPDF()`. Le document est compilé côté client en format A4 vectoriel avec en-têtes, numérotation de pages `Page X sur Y`, table des matières et tableaux de synthèse.
2. **Impression Optimisée du Navigateur :** Compatible avec la boîte de dialogue d'impression standard (Ctrl+P / Cmd+P), supprimant les barres de navigation et optimisant les sauts de page pour les rapports d'audit et la documentation.

---
*Fin du document de spécification fonctionnelle et technique - Provenda v2.2.*
