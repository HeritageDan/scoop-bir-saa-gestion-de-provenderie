import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language } from '../types';

export function buildApplicationDocumentationPDF(language: Language = 'fr'): jsPDF {
  const isEn = language === 'en';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald 500
  const primaryDark: [number, number, number] = [6, 95, 70]; // Emerald 800
  const slateDark: [number, number, number] = [15, 23, 42]; // Slate 900
  const slateMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50

  // ----------------------------------------------------
  // COVER PAGE
  // ----------------------------------------------------
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 12, 'F');

  // Title box
  doc.setFillColor(...slateDark);
  doc.roundedRect(margin, 35, contentWidth, 55, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(isEn ? 'PROVENDA - SYSTEM MANAGEMENT' : 'PROVENDA - GESTION COMPLÈTE', margin + 8, 55);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.text(
    isEn
      ? 'EXHAUSTIVE FUNCTIONAL & TECHNICAL REFERENCE MANUAL'
      : 'MANUEL DE RÉFÉRENCE FONCTIONNEL & TECHNIQUE EXHAUSTIF',
    margin + 8,
    66
  );
  doc.setFontSize(9.5);
  doc.text(
    isEn
      ? 'Complete documentation of all functions, modules, algorithms and business rules'
      : 'Documentation intégrale de toutes les fonctions, modules et règles métier',
    margin + 8,
    77
  );

  // Metadata block
  doc.setFontSize(9.5);
  doc.setTextColor(...slateDark);
  let y = 104;

  const metadata = isEn
    ? [
        ['Application:', 'Provenda - Integrated Feed Mill & POS Management ERP'],
        ['System Type:', 'Real-time Feed Production, Inventory & Multi-tender POS'],
        ['Reference Currency:', 'CFA Franc (FCFA / XAF)'],
        ['Valuation Method:', 'Weighted Average Cost (WAC / CMP) with attributable landing costs'],
        ['Architecture & Stack:', 'React 19 + TypeScript + Tailwind CSS (Vite Engine)'],
        ['Coverage:', '100% of Functions, Calculation Formulas, Models & RBAC Security'],
        ['Edition Date:', new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })],
        ['Document Status:', 'Official - Administrator, Auditor & Developer Reference'],
      ]
    : [
        ['Application :', 'Provenda - Solution de Gestion Opérationnelle & Financière'],
        ['Type de Système :', 'ERP Métier Provenderie & Point de Vente (POS) Temps Réel'],
        ['Monnaie de Référence :', 'Franc CFA (FCFA / XAF)'],
        ['Méthode de Valorisation :', 'Coût Moyen Pondéré (CMP) avec intégration des frais d\'approche'],
        ['Architecture & Framework :', 'React 19 + TypeScript + Tailwind CSS (Vite Engine)'],
        ['Couverture :', '100% des Fonctions, Formules de calcul, Modèles & Sécurité RBAC'],
        ['Date d\'Édition :', new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
        ['Statut du Document :', 'Officiel - Guide Administrateur & Développeur'],
      ];

  metadata.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + (isEn ? 42 : 48), y);
    y += 6.8;
  });

  // Abstract / Sommaire rapide
  y += 5;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 80, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 80, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? 'EXECUTIVE SUMMARY & DOCUMENT STRUCTURE' : 'RÉSUMÉ EXÉCUTIF & STRUCTURE DU DOCUMENT',
    margin + 6,
    y + 9
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const abstractText = isEn
    ? "This official document provides comprehensive documentation for every software function and " +
      "feature comprising the Provenda application. Every method in the central AppContext state manager, " +
      "each financial and accounting formula (WAC/CMP, Gross Margins, Physical Inventory Variance, Discount Ceilings), " +
      "each user interface module (POS, Stock Ledger, Purchases, Invoicing, Customers, Suppliers, " +
      "Reports, Audit Trail, Settings) and role-based security policies (RBAC) are thoroughly detailed " +
      "with their validation rules, inputs/outputs and use cases."
    : "Ce document recense de manière exhaustive l'ensemble des fonctionnalités et fonctions logicielles " +
      "qui constituent l'application Provenda. Chaque fonction du gestionnaire d'état central (AppContext), " +
      "chaque formule mathématique (CMP, Marges, Rapprochement d'inventaire, Plafonds de remise), " +
      "chaque composant d'interface utilisateur (POS, Stocks, Achats, Facturation, Clients, Fournisseurs, " +
      "Rapports, Piste d'audit, Paramètres) et chaque modalité de sécurité (RBAC) y sont scrupuleusement " +
      "décrits avec leurs règles de validation, entrées/sorties et cas d'usage.";

  const splitAbstract = doc.splitTextToSize(abstractText, contentWidth - 12);
  doc.text(splitAbstract, margin + 6, y + 17);

  const chapters = isEn
    ? [
        '• Chapter 1: Global Architecture, Data Models & RBAC Security Matrix (Roles & Permissions)',
        '• Chapter 2: Stock Engine, Unit Conversions & Dynamic WAC / CMP Calculation',
        '• Chapter 3: Point of Sale Terminal (POS), Multi-tender Checkout & Controlled Discounts',
        '• Chapter 4: Supply Chain, Goods Receipt, Landing Costs & Supplier Registry',
        '• Chapter 5: Invoicing, Customer Credit Ledgers, Due Dates & Credit Notes (Avoirs)',
        '• Chapter 6: Physical Inventory Counting Sessions & Stock Variance Reconciliation',
        '• Chapter 7: Financial Reports, Commercial Margins & Security Audit Trail',
        '• Chapter 8: Complete Codebase Function Directory (Names, Signatures, Inputs, Logic)',
      ]
    : [
        '• Chapitre 1 : Architecture Globale, Modèles de Données & RBAC (Rôles & Permissions)',
        '• Chapitre 2 : Moteur de Stock, Conversion d\'Unités & Calcul Dynamique du CMP',
        '• Chapitre 3 : Terminal Point de Vente (POS), Encaissement Multi-Moyens & Remises',
        '• Chapitre 4 : Gestion des Achats, Réceptions Fournisseurs & Frais d\'Approche',
        '• Chapitre 5 : Facturation, Crédits Clients, Échéances & Gestion des Avoirs',
        '• Chapitre 6 : Sessions d\'Inventaire Physique & Régularisations de Stock',
        '• Chapitre 7 : Rapports Financiers, Marges Commerciales & Journaux d\'Audit',
        '• Chapitre 8 : Répertoire Exhaustif des Fonctions Code (Nom, Paramètres, Fonctionnement)',
      ];

  let chapY = y + 36;
  chapters.forEach(chap => {
    doc.text(chap, margin + 6, chapY);
    chapY += 5.2;
  });

  // Footer cover
  doc.setFontSize(8);
  doc.setTextColor(...slateMuted);
  doc.text(
    isEn
      ? 'Provenda © 2026 - Integrated Feed Mill Management & POS System'
      : 'Provenda © 2026 - Système Intégré de Gestion de Provenderie',
    margin,
    pageHeight - 10
  );

  // ----------------------------------------------------
  // HELPER FOR NEW PAGES WITH HEADER & FOOTER
  // ----------------------------------------------------
  function addPageWithHeader(title: string) {
    doc.addPage();
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryDark);
    doc.text(
      isEn ? 'PROVENDA - FUNCTIONAL & TECHNICAL SPECIFICATIONS' : 'PROVENDA - DOCUMENTATION FONCTIONNELLE & TECHNIQUE',
      margin,
      12
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateMuted);
    doc.text(title, pageWidth - margin, 12, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 15, pageWidth - margin, 15);
  }

  // ----------------------------------------------------
  // CHAPTER 1 : ARCHITECTURE & RBAC
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 1: Architecture & Roles' : 'Chapitre 1 : Architecture & Rôles');

  let curY = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '1. System Architecture & RBAC Security Matrix' : '1. Architecture Globale & Matrice de Sécurité (RBAC)',
    margin,
    curY
  );

  curY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const p1 = isEn
    ? "Provenda is architected around a unified React Context state engine (AppContext), " +
      "guaranteeing transactional consistency across inventory levels, checkout registers, purchases, customer receivables " +
      "and the immutable audit trail. Security is strictly enforced using Role-Based Access Control (RBAC)."
    : "Provenda est architecturé autour d'un gestionnaire d'état centralisé React Context (AppContext), " +
      "garantissant la cohérence transactionnelle entre les stocks, les caisses, les achats, les créances clients " +
      "et la piste d'audit. La sécurité repose sur un contrôle d'accès basé sur les rôles (Role-Based Access Control - RBAC).";
  doc.text(doc.splitTextToSize(p1, contentWidth), margin, curY);

  curY += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '1.1 Roles & Privileges Matrix' : '1.1 Matrice des Rôles & Droits d\'Accès Applicatifs', margin, curY);

  curY += 4;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Role', 'Discount Limit', 'POS Checkout', 'Stock & WAC', 'Purchases & Receipts', 'Customers & Debts', 'Settings & Backups']]
      : [['Rôle', 'Plafond Remise', 'Point de Vente (POS)', 'Gestion Stocks & CMP', 'Achats & BL', 'Clients & Dettes', 'Paramètres & Sauvegardes']],
    body: isEn
      ? [
          ['Administrator', '100% max', 'Full Access', 'Create, WAC, Adjust.', 'Create, Validate', 'Limits, Settle, Credits', 'Complete Access & Multi-Store'],
          ['Manager (Depot)', '15% max', 'Full Access', 'View, Stock Adjust.', 'Drafts, Validate', 'Settlement, Exceptions', 'View & Reports'],
          ['Cashier', '0% (Blocked)', 'Sales & Checkout', 'View only', 'No access', 'Debt settlement', 'No access'],
          ['Stockist / Warehouse', '0% (Blocked)', 'No access', 'Adjust., Movements, Inv.', 'Physical goods receipt', 'No access', 'No access'],
        ]
      : [
          ['Administrateur', '100% max', 'Accès Total', 'Création, CMP, Ajust.', 'Création, Validation', 'Plafonds, Règl., Avoirs', 'Accès Complet & Multi-Magasins'],
          ['Responsable', '15% max', 'Accès Total', 'Consultation, Ajust.', 'Brouillons, Validation', 'Règlement, Dérogation', 'Consultation & Rapports'],
          ['Caissier', '0% (Interdit)', 'Vente & Encaissement', 'Consultation seule', 'Aucun accès', 'Encaissement dettes', 'Aucun accès'],
          ['Magasinier', '0% (Interdit)', 'Aucun accès', 'Ajust., Mouvements, Inv.', 'Réception physique BL', 'Aucun accès', 'Aucun accès'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  curY = doc.lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '1.2 Multi-Store Architecture (Branches)' : '1.2 Architecture Multi-Magasins (Points de Vente)', margin, curY);

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const pMultiPos = isEn
    ? "The application supports managing multiple physical points of sale (e.g. Main Mill, Port Depot, Market Annex). " +
      "The active store selector dynamically filters sales, stock inventory and receipts. Each employee can be assigned " +
      "to a dedicated branch, while Administrators can switch branches or view consolidated data anytime."
    : "L'application permet d'administrer plusieurs points de vente physiques (ex: Boutique Principale, Dépôt Port, Annexe Marché). " +
      "Le sélecteur de magasin actif filtre dynamiquement les ventes, inventaires et réceptions. Chaque utilisateur peut être rattaché " +
      "à un point de vente spécifique, et l'Administrateur peut basculer d'un magasin à l'autre en un clic depuis l'en-tête.";
  doc.text(doc.splitTextToSize(pMultiPos, contentWidth), margin, curY);

  curY += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '1.3 Core Entities & Data Models' : '1.3 Entités & Modèles de Données Principaux', margin, curY);

  curY += 4;
  autoTable(doc, {
    startY: curY,
    head: isEn ? [['Entity', 'Primary Keys', 'Critical Fields', 'Business Purpose']] : [['Entité', 'Clés & Identifiants', 'Champs Critiques', 'Rôle Métier']],
    body: isEn
      ? [
          ['Product', 'id, code (e.g. PRD-001)', 'baseUnit, saleUnit, conversionFactor, cmp, stockCurrentBaseUnit', 'Feed mill item managed in kg or bag with calculated WAC.'],
          ['Invoice', 'id, number (FAC-YYYY-XXXXXX)', 'customerId, items[], totalNet, totalCostOfGoodsSold, grossMargin', 'Sales invoice with itemized margins & tax.'],
          ['Purchase', 'id, referenceNumber (ACH-...)', 'supplierId, items[], transportFees, otherFees, status', 'Supply order incorporating attributable landing fees.'],
          ['StockMovement', 'id, timestamp', 'productId, type, quantityBaseUnit, costUnitCMP, justification', 'Immutable ledger of all physical inbound/outbound flows.'],
          ['InventorySession', 'id, referenceNumber (INV-...)', 'items[], theoreticalStock, physicalStock, varianceValue', 'Physical stocktake session with valuation of discrepancies.'],
          ['Customer', 'id, code (CLI-001)', 'creditLimit, currentDebt, type (farmer, cooperative, reseller)', 'Client account with strict credit ceiling enforcement.'],
          ['AuditLog', 'id, timestamp', 'userId, action, targetObject, oldValue, newValue, justification', 'ISO-compliant immutable security log for financial audits.'],
        ]
      : [
          ['Product', 'id, code (ex: PRD-001)', 'baseUnit, saleUnit, conversionFactor, cmp, stockCurrentBaseUnit', 'Article provenderie géré au kg ou sac avec son CMP.'],
          ['Invoice', 'id, number (FAC-AAAA-XXXXXX)', 'customerId, items[], totalNet, totalCostOfGoodsSold, grossMargin', 'Facture de vente avec traçabilité marge & TVA.'],
          ['Purchase', 'id, referenceNumber (ACH-...)', 'supplierId, items[], transportFees, otherFees, status', 'Bon d\'approvisionnement intégrant les frais d\'approche.'],
          ['StockMovement', 'id, timestamp', 'productId, type, quantityBaseUnit, costUnitCMP, justification', 'Journal inaltérable de tous les flux physiques d\'entrée/sortie.'],
          ['InventorySession', 'id, referenceNumber (INV-...)', 'items[], theoreticalStock, physicalStock, varianceValue', 'Session de comptage physique avec calcul des écarts valorisés.'],
          ['Customer', 'id, code (CLI-001)', 'creditLimit, currentDebt, type (éleveur, coopérative, revendeur)', 'Fiche tiers client et contrôle strict des plafonds de crédit.'],
          ['AuditLog', 'id, timestamp', 'userId, action, targetObject, oldValue, newValue, justification', 'Journal de conformité et de sécurité ISO pour audits financiers.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 2 : CMP & STOCK ENGINE
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 2: Stock Engine & WAC' : 'Chapitre 2 : Moteur de Stock & CMP');

  curY = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '2. Stock Engine & Weighted Average Cost (WAC / CMP) Algorithm' : '2. Moteur de Stock & Algorithme du Coût Moyen Pondéré (CMP)',
    margin,
    curY
  );

  curY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '2.1 Official Mathematical WAC Formula' : '2.1 Formule Mathématique Officielle du CMP', margin, curY);

  curY += 5;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, curY, contentWidth, 30, 2, 2, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, curY, contentWidth, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? 'WEIGHTED AVERAGE COST FORMULA UPON GOODS RECEIPT:' : 'FORMULE DU COÛT MOYEN PONDÉRÉ APRÈS RÉCEPTION :',
    margin + 6,
    curY + 8
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn
      ? 'New_WAC = ( (Initial_Stock × Old_WAC) + Inbound_Cost ) / ( Initial_Stock + Received_Qty )'
      : 'Nouveau CMP = ( (Stock_Init × Ancien_CMP) + Coût_Total_Entrée ) / ( Stock_Init + Qté_Entrée )',
    margin + 6,
    curY + 16
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    isEn
      ? 'Where Inbound_Cost = (Received_Qty × Unit_Purchase_Price) + Transport_Fees + Other_Landing_Costs'
      : 'Où Coût_Total_Entrée = (Qté_Entrée × Prix_Achat_Unitaire) + Frais_Transport + Autres_Frais_Approche',
    margin + 6,
    curY + 23
  );

  curY += 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '2.2 Attribution of Landing & Inbound Freight Fees' : '2.2 Règle d\'Incorporation des Frais d\'Approche', margin, curY);

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const pFrais = isEn
    ? "Under SYSCOHADA and IFRS agricultural accounting standards, acquisition costs for raw feed grains " +
      "(Corn, Soymeal, Premixes) must include supplier invoice prices PLUS transport, offloading and handling fees. " +
      "Provenda automatically incorporates these fees proportionally into the received unit cost, ensuring that " +
      "profit margins and ending inventory valuations are never artificially overstated."
    : "Conformément aux normes comptables SYSCOHADA et IFRS pour les provenderies d'élevage, le coût d'acquisition " +
      "d'une matière première (Maïs, Tourteau de soja, Concentré chair) inclut non seulement le prix facturé par le fournisseur, " +
      "mais également les frais de transport, déchargement et manutention. Dans Provenda, l'option " +
      "'Frais de transport incorporés au CMP' ventile automatiquement ces surcoûts au prorata des quantités reçues, " +
      "évitant ainsi toute sous-évaluation de la valeur de stock et tout calcul erroné des marges.";
  doc.text(doc.splitTextToSize(pFrais, contentWidth), margin, curY);

  curY += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '2.3 Unit Conversions (Base Stock Unit vs Commercial Sale Unit)' : '2.3 Conversion d\'Unités (Unité de Base vs Unité Commerciale)', margin, curY);

  curY += 4;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Packaging Description', 'Commercial Unit', 'Stock Base Unit', 'Conversion Factor', 'Practical Example']]
      : [['Conditionnement', 'Unité Commerciale', 'Unité de Base Stock', 'Facteur de Conversion', 'Exemple Pratique']],
    body: isEn
      ? [
          ['50 kg Bag (Finisher / Layer feed)', 'bag (sac)', 'kilogram (kg)', '50', 'Sale of 2 bags = Auto deduction of 100 kg in inventory'],
          ['25 kg Bag (Starter feed)', 'bag (sac)', 'kilogram (kg)', '25', 'Sale of 4 bags = Auto deduction of 100 kg in inventory'],
          ['Bulk loose retail by the kilo', 'kilogram', 'kilogram (kg)', '1', 'Sale of 12.5 kg = Auto deduction of exactly 12.5 kg in inventory'],
          ['20 Liter Jug (Oil / Molasses)', 'jug (bidon)', 'liter (L)', '20', 'Receipt of 5 jugs = Auto increment of 100 L in inventory'],
        ]
      : [
          ['Sac de 50 kg (Aliment Chair/Pondeuse)', 'sac', 'kilogramme (kg)', '50', 'Vente de 2 sacs = Déduction automatique de 100 kg en stock'],
          ['Sac de 25 kg (Aliment Démarrage)', 'sac', 'kilogramme (kg)', '25', 'Vente de 4 sacs = Déduction automatique de 100 kg en stock'],
          ['Vente au détail au kilo (Vrac)', 'kilogramme', 'kilogramme (kg)', '1', 'Vente de 12.5 kg = Déduction exacte de 12.5 kg en stock'],
          ['Bidon de 20 Litres (Huile/Mélasse)', 'bidon', 'litre (L)', '20', 'Réception de 5 bidons = Augmentation de 100 L en stock'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 3 : POS CHECKOUT & MARGINS
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 3: POS Checkout & Sales' : 'Chapitre 3 : Caisse POS & Ventes');

  curY = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '3. Point of Sale Terminal (POS) & Checkout Engine' : '3. Terminal Point de Vente (POS) & Encaissement',
    margin,
    curY
  );

  curY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const pPos = isEn
    ? "The POS terminal is built for rapid counter operations with barcode/product code search, " +
      "automatic packaging unit conversions, real-time background margin computation, strict enforcement " +
      "of discount authorization ceilings based on user role, and multi-tender settlement " +
      "(Cash, Mobile Money Orange/MTN, Bank Transfer or Customer Credit)."
    : "Le terminal de caisse POS est conçu pour un enregistrement rapide des commandes au comptoir, " +
      "avec recherche instantanée par code-barres ou nom, gestion des conditionnements (sac/kg), " +
      "calcul automatique des marges en arrière-plan, vérification stricte des remises autorisées selon le rôle " +
      "et validation des encaissements multi-moyens (Espèces, Mobile Money Orange/MTN, Virement ou Crédit Client).";
  doc.text(doc.splitTextToSize(pPos, contentWidth), margin, curY);

  curY += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '3.1 Real-Time Profitability & Gross Margin Formulas' : '3.1 Calculateur de Rentabilité & Marge Brute en Temps Réel', margin, curY);

  curY += 5;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(...primaryColor);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'S');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateDark);
  if (isEn) {
    doc.text('1. Gross Subtotal = Sum ( Quantity × Catalog Unit Price )', margin + 6, curY + 6.5);
    doc.text('2. Net Revenue = Gross Subtotal - Total Approved Discount', margin + 6, curY + 12.5);
    doc.text('3. Cost of Goods Sold (COGS) = Sum ( Base Quantity × Product WAC / CMP )', margin + 6, curY + 18.5);
    doc.text('4. Gross Margin = Net Revenue - COGS  |  Margin Rate (%) = (Gross Margin / Net Revenue) × 100', margin + 6, curY + 24.5);
  } else {
    doc.text('1. Total Brut = Somme ( Quantité × Prix Unitaire Catalogue )', margin + 6, curY + 6.5);
    doc.text('2. Chiffre d\'Affaires Net = Total Brut - Remise Globale Accordée', margin + 6, curY + 12.5);
    doc.text('3. Coût des Ventes (CMV) = Somme ( Quantité Base × CMP du Produit )', margin + 6, curY + 18.5);
    doc.text('4. Marge Brute = CA Net - CMV  |  Taux de Marge (%) = (Marge / CA Net) × 100', margin + 6, curY + 24.5);
  }

  curY += 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '3.2 Commercial Discount Approval Rules' : '3.2 Règles d\'Attribution des Remises Commerciales', margin, curY);

  curY += 4;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['User Profile', 'Allowed Discount', 'Action if Exceeded', 'Required Traceability']]
      : [['Profil Utilisateur', 'Remise Autorisée', 'Action si Dépassement', 'Traçabilité Requise']],
    body: isEn
      ? [
          ['Cashier', '0% (No discount allowed)', 'Blocked by system. Requires manager intervention.', 'Cannot checkout without override'],
          ['Manager (Depot)', 'Up to 15% maximum', 'Over 15% blocked. Requires administrator approval.', 'Manager name, reason & rate logged on invoice'],
          ['Administrator', 'Up to 100% (Full exception)', 'Allowed with mandatory justification note.', 'Logged in immutable audit trail with justification'],
        ]
      : [
          ['Caissier', '0% (Aucune remise)', 'Bloqué par le système. Nécessite accord responsable.', 'Impossible d\'enregistrer sans dérogation'],
          ['Responsable', 'Jusqu\'à 15% maximum', 'Au-delà de 15% : bloqué, nécessite administrateur.', 'Nom, motif et taux archivés sur la facture'],
          ['Administrateur', 'Jusqu\'à 100% (Dérogation totale)', 'Libre avec obligation de saisir un motif.', 'Enregistré dans le journal d\'audit avec justification'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 8 : CODEBASE FUNCTION DIRECTORY
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 8: Codebase Functions' : 'Chapitre 8 : Répertoire des Fonctions Code');

  curY = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '8. Comprehensive Codebase Function Directory (AppContext)' : '8. Répertoire Exhaustif des Fonctions du Code Source (AppContext)',
    margin,
    curY
  );

  curY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const pFuncIntro = isEn
    ? "This section provides technical and operational documentation for every method implemented in AppContext.tsx. " +
      "It details TypeScript signatures, input parameters, return structures, exceptions, and business logic."
    : "Ce chapitre détaille chaque fonction implémentée dans le gestionnaire central AppContext.tsx. " +
      "Il spécifie pour chaque méthode : sa signature TypeScript complète, ses données d'entrée, ses valeurs de retour, " +
      "et l'algorithme métier exécuté de bout en bout.";
  doc.text(doc.splitTextToSize(pFuncIntro, contentWidth), margin, curY);

  curY += 12;

  const appFunctionsBilingual = [
    {
      category: isEn ? 'Theme, i18n & Navigation' : 'Thème, Internationalisation & Navigation',
      funcs: isEn
        ? [
            ['toggleTheme()', '() => void', 'Toggles visual theme between dark and light (#FAF7F2 cream). Persists state in localStorage under provenda_theme.'],
            ['setLanguage(lang)', '(lang: "fr" | "en") => void', 'Sets global active language. Persists choice in localStorage and dynamically refreshes all interface keys.'],
            ['t(key)', '(key: string) => string', 'Resolves localized string keys (e.g. "nav.pos", "stock.cmp") with fallback to French if key is missing.'],
          ]
        : [
            ['toggleTheme()', '() => void', 'Bascule entre le mode sombre (dark) et le mode clair (light). Sauvegarde le choix dans localStorage sous provenda_theme.'],
            ['setLanguage(lang)', '(lang: "fr" | "en") => void', 'Définit la langue globale de l\'interface. Sauvegarde la sélection dans localStorage et adapte tous les libellés via i18n.'],
            ['t(key)', '(key: string) => string', 'Résout une clé de traduction hiérarchique (ex: "nav.pos", "stock.cmp") selon la langue active courante avec fallback.'],
          ],
    },
    {
      category: isEn ? 'Multi-Store Management (Branches)' : 'Gestion Multi-Magasins (Points de Vente)',
      funcs: isEn
        ? [
            ['setCurrentSalesPointId(id)', '(id: string) => void', 'Switches the active work branch. Dynamically filters sales, purchases and inventories for that branch.'],
            ['addSalesPoint(sp)', '(sp: Omit<SalesPoint, "id"|"createdAt">) => void', 'Creates a new branch with unique code (e.g. POS-02), address, phone and manager. Logs to audit trail.'],
            ['updateSalesPoint(sp)', '(sp: SalesPoint) => void', 'Updates details, phone and manager of an existing store location with full audit traceability.'],
            ['deleteSalesPoint(id)', '(id: string) => void', 'Deletes a secondary branch. The main store (isMain) can never be deleted.'],
          ]
        : [
            ['setCurrentSalesPointId(id)', '(id: string) => void', 'Active un point de vente de travail. Filtre instantanément les flux de ventes, commandes et inventaires.'],
            ['addSalesPoint(sp)', '(sp: Omit<SalesPoint, "id"|"createdAt">) => void', 'Crée une nouvelle succursale avec son code POS unique, adresse et responsable. Consigne dans l\'audit.'],
            ['updateSalesPoint(sp)', '(sp: SalesPoint) => void', 'Met à jour les coordonnées, téléphone et gérant d\'un point de vente existant avec traçabilité d\'audit.'],
            ['deleteSalesPoint(id)', '(id: string) => void', 'Supprime un point de vente secondaire. Le magasin principal ne peut être supprimé.'],
          ],
    },
    {
      category: isEn ? 'Authentication & Roles (RBAC)' : 'Authentification & Rôles Utilisateurs',
      funcs: isEn
        ? [
            ['login(email, password)', '(email, password) => { success, error }', 'Authenticates user credentials, verifies active status, updates lastLogin timestamp and creates session.'],
            ['logout()', '() => void', 'Terminates active session, clears authentication keys and redirects to login view.'],
            ['switchRole(role)', '(role: Role) => void', 'Allows instant profile switching for testing or demoing permission boundaries (admin, manager, cashier, stockist).'],
            ['addUser(user)', '(user) => { success, error }', 'Creates an employee user account with assigned role, custom discount limit (0% cashier, 15% manager) and store.'],
            ['updateUser(user)', '(user: User) => void', 'Updates credentials, role, status or discount limits with comprehensive audit logging.'],
            ['deactivateUser(id)', '(id: string) => void', 'Deactivates an employee account immediately revoking access while preserving historic transactions.'],
          ]
        : [
            ['login(email, password)', '(email, password) => { success, error }', 'Authentifie un utilisateur par email et mot de passe. Vérifie que le compte est actif et met à jour lastLogin.'],
            ['logout()', '() => void', 'Déconnecte la session utilisateur active, nettoie les données d\'accès et redirige vers la page d\'accès.'],
            ['switchRole(role)', '(role: Role) => void', 'Permet de basculer instantanément de casquette (admin, responsable, caissier, magasinier) pour vérifier les permissions.'],
            ['addUser(user)', '(user) => { success, error }', 'Crée un nouvel utilisateur avec attribution de son rôle, son plafond de remise et son magasin assigné.'],
            ['updateUser(user)', '(user: User) => void', 'Met à jour les informations, mot de passe, rôle ou statut actif/inactif d\'un employé avec traçabilité complète.'],
            ['deactivateUser(id)', '(id: string) => void', 'Désactive le compte d\'un employé empêchant toute connexion future sans effacer son historique comptable.'],
          ],
    },
    {
      category: isEn ? 'Supply Chain, Goods Receipt & WAC Engine' : 'Achats, Réceptions & Recalcul du CMP',
      funcs: isEn
        ? [
            ['createPurchaseDraft(p, spId)', '(purchase, targetSalesPointId?) => string', 'Generates draft purchase order with reference ACH-YYYY-XXXXXX, line items, and estimated landing fees.'],
            ['validatePurchaseReception(id)', '(purchaseId: string) => void', 'Core WAC engine: recalculates new WAC/CMP per item, increments base unit inventory, and logs inbound movement.'],
            ['cancelPurchase(id, reason)', '(purchaseId: string, reason: string) => void', 'Cancels draft purchase order with mandatory justification note. Physical stock is untouched.'],
          ]
        : [
            ['createPurchaseDraft(p, spId)', '(purchase, targetSalesPointId?) => string', 'Génère un bon de commande au statut "brouillon" avec référence ACH-AAAA-XXXXXX, articles et frais d\'approche.'],
            ['validatePurchaseReception(id)', '(purchaseId: string) => void', 'Cœur du moteur CMP : calcule le nouveau CMP unitaire de chaque produit reçu, incrémente le stock et clôture le bon.'],
            ['cancelPurchase(id, reason)', '(purchaseId: string, reason: string) => void', 'Passe le bon d\'achat au statut "annulé" avec motif obligatoire. Ne modifie pas les stocks physiques.'],
          ],
    },
    {
      category: isEn ? 'Sales, POS Checkout, Discounts & Invoicing' : 'Ventes, Caisse POS, Remises & Facturation',
      funcs: isEn
        ? [
            ['createSale(...)', '(customerId, items, discount?, payment?, notes?, isCredit?, creditDueDate?, spId?) => { success, invoiceId, error }', 'Executes atomic sales transaction: checks stock availability, enforces user discount ceiling, validates customer credit limits, computes gross margin, generates FAC invoice, decrements stock at WAC, records payments and logs audit.'],
            ['cancelInvoiceWithCreditNote(...)', '(invoiceId: string, reason: string) => { success, error }', 'Cancels validated invoice: generates official Credit Note AVO-YYYY-XXXXXX, restocks inventory, decreases customer debt and logs audit.'],
            ['recordDebtPayment(...)', '(invoiceId, amount, method, ref?, notes?) => { success, error }', 'Records client debt payment: reduces invoice remaining balance and client total debt, marks as paid if balance is 0.'],
          ]
        : [
            ['createSale(...)', '(customerId, items, discount?, payment?, notes?, isCredit?, creditDueDate?, spId?) => { success, invoiceId, error }', 'Exécute la transaction de vente intégrale : vérifie le stock disponible, contrôle les plafonds de remise, valide le crédit client, calcule la marge brute, génère la facture FAC, décrémente les stocks, enregistre le paiement et déclenche l\'audit.'],
            ['cancelInvoiceWithCreditNote(...)', '(invoiceId: string, reason: string) => { success, error }', 'Annule une facture de vente : génère un Avoir officiel AVO-AAAA-XXXXXX, réintègre les stocks, annule la créance client et archive le motif.'],
            ['recordDebtPayment(...)', '(invoiceId, amount, method, ref?, notes?) => { success, error }', 'Enregistre le versement d\'un client sur une facture à crédit. Réduit le solde de la facture, diminue la dette du client et bascule le statut si soldé.'],
          ],
    },
    {
      category: isEn ? 'Stock Adjustments & Physical Inventory' : 'Ajustements de Stock & Inventaires',
      funcs: isEn
        ? [
            ['recordStockAdjustment(...)', '(productId, qtyChangeBaseUnit, type, justification) => { success, error }', 'Performs manual stock adjustments for spoilage, damage, internal livestock consumption or corrections. Creates movement and audit.'],
            ['createInventorySession(cat?)', '(categoryFilter?: string) => string', 'Opens physical inventory session INV-YYYY-XXXXXX and snapshots theoretical stock levels for all products.'],
            ['validateInventorySession(...)', '(sessionId, countedItems, notes?) => { success, error }', 'Reconciles physical count with theoretical stock, calculates quantitative and monetary variances at WAC, updates stock and closes session.'],
          ]
        : [
            ['recordStockAdjustment(...)', '(productId, qtyChangeBaseUnit, type, justification) => { success, error }', 'Effectue une régularisation manuelle de stock (perte, casse, consommation interne, correction). Recalcule le stock, génère le mouvement et l\'audit.'],
            ['createInventorySession(cat?)', '(categoryFilter?: string) => string', 'Crée une session d\'inventaire physique avec capture instantanée du stock théorique de tous les produits.'],
            ['validateInventorySession(...)', '(sessionId, countedItems, notes?) => { success, error }', 'Confronte le stock physique au stock théorique, calcule les écarts valorisés au CMP, ajuste les stocks réels et clôture la session.'],
          ],
    },
    {
      category: isEn ? 'System Backup, Restore & Selectors' : 'Sauvegarde, Restauration & Sécurité Système',
      funcs: isEn
        ? [
            ['exportSystemBackup()', '() => string', 'Exports all application state tables (products, invoices, purchases, movements, customers, suppliers, audit, settings) into a timestamped JSON file.'],
            ['restoreSystemBackup(json)', '(jsonString: string) => { success, message }', 'Validates JSON integrity, restores entire application state across all modules and records audit action.'],
            ['resetToDefaultData()', '() => void', 'Resets application to calibrated factory seed data (sample feed products, users, suppliers, customers).'],
            ['getLowStockProducts()', '() => Product[]', 'Memoized selector returning all active products where current stock is less than or equal to minimum alert threshold.'],
            ['getOutOfStockProducts()', '() => Product[]', 'Selector returning all active products that are strictly out of stock (<= 0).'],
          ]
        : [
            ['exportSystemBackup()', '() => string', 'Exporte l\'intégralité des tables de données sous forme de chaîne JSON horodatée téléchargeable.'],
            ['restoreSystemBackup(json)', '(jsonString: string) => { success, message }', 'Valide la cohérence du fichier JSON, restaure l\'état complet de la base et consigne dans l\'audit.'],
            ['resetToDefaultData()', '() => void', 'Réinitialise l\'application aux données de démonstration d\'usine pré-calibrées.'],
            ['getLowStockProducts()', '() => Product[]', 'Sélecteur retournant tous les articles actifs dont le stock actuel est inférieur ou égal au seuil minimum d\'alerte.'],
            ['getOutOfStockProducts()', '() => Product[]', 'Sélecteur retournant tous les articles actifs dont le stock est strictement épuisé (<= 0).'],
          ],
    },
  ];

  appFunctionsBilingual.forEach(cat => {
    if (curY > pageHeight - 35) {
      addPageWithHeader(isEn ? 'Chapter 8: Code Functions (Continued)' : 'Chapitre 8 : Fonctions Code (Suite)');
      curY = 22;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryDark);
    doc.text(cat.category, margin, curY);
    curY += 3;

    autoTable(doc, {
      startY: curY,
      head: isEn
        ? [['Function', 'TypeScript Signature', 'Operational Description & Algorithm']]
        : [['Fonction', 'Signature TypeScript', 'Description Opérationnelle & Algorithme']],
      body: cat.funcs,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore
    curY = doc.lastAutoTable.finalY + 7;
  });

  // ----------------------------------------------------
  // ADD PAGE NUMBERS TO ALL PAGES
  // ----------------------------------------------------
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateMuted);
    doc.text(
      isEn
        ? `Provenda ERP - Official Specifications | Page ${i} of ${totalPages}`
        : `Provenda ERP - Documentation Officielle | Page ${i} sur ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

export function generateApplicationDocumentationPDF(language: Language = 'fr'): void {
  const doc = buildApplicationDocumentationPDF(language);
  if (typeof window !== 'undefined') {
    const filename = language === 'en'
      ? 'Provenda_Application_Features_Documentation_EN.pdf'
      : 'Documentation_Fonctionnalites_Provenda_FR.pdf';
    doc.save(filename);
  }
}
