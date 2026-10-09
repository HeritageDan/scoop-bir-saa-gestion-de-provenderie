import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language } from '../types';
import { DEFAULT_APP_LOGO } from '../config/defaultLogo';

export function buildApplicationDocumentationPDF(language: Language = 'fr'): jsPDF {
  const isEn = language === 'en';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Corporate Color Palette (SCOOPS BIR SAA / Emerald & Slate)
  const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald 500
  const primaryDark: [number, number, number] = [6, 95, 70]; // Emerald 800
  const primaryLight: [number, number, number] = [209, 250, 229]; // Emerald 100
  const slateDark: [number, number, number] = [15, 23, 42]; // Slate 900
  const slateMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const slateLight: [number, number, number] = [241, 245, 249]; // Slate 100
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50

  // ----------------------------------------------------
  // COVER PAGE
  // ----------------------------------------------------
  // Top Emerald Accent Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 12, 'F');

  // Header Company Info & Logo
  let coverY = 20;
  try {
    if (DEFAULT_APP_LOGO) {
      doc.addImage(DEFAULT_APP_LOGO, 'PNG', margin, coverY, 22, 22);
    }
  } catch (e) {
    console.warn('Cover logo embedding skipped:', e);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryDark);
  doc.text('SCOOPS BIR - SAA', margin + 26, coverY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateMuted);
  doc.text(
    isEn
      ? 'Cooperative Society for Animal Husbandry & Feed Milling — Cameroon'
      : 'Société Coopérative Simplifiée d\'Élevage & Provenderie — Cameroun',
    margin + 26,
    coverY + 12
  );
  doc.text('Bafoussam / Douala — RCCM: RC/BFM/2026/B/452', margin + 26, coverY + 17);

  // Title Box
  coverY = 48;
  doc.setFillColor(...slateDark);
  doc.roundedRect(margin, coverY, contentWidth, 54, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(
    isEn ? 'PROVENDA - SYSTEM MANAGEMENT' : 'PROVENDA - GESTION COMPLÈTE',
    margin + 8,
    coverY + 18
  );

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.text(
    isEn
      ? 'EXHAUSTIVE FUNCTIONAL & TECHNICAL REFERENCE MANUAL (v2.5)'
      : 'MANUEL DE RÉFÉRENCE FONCTIONNEL & TECHNIQUE EXHAUSTIF (v2.5)',
    margin + 8,
    coverY + 28
  );

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(
    isEn
      ? 'Feed Mill ERP, Multi-tender POS, Real-Time CMP WAC Valuation, Cloud Sync & Hardware Drivers'
      : 'ERP Provenderie, Caisse POS, Moteur CMP, Synchro Supabase, Pilote Thermique & Rôles Développeur',
    margin + 8,
    coverY + 38
  );
  doc.text(
    isEn
      ? 'Offline-first architecture with permanent corporate branding & reverse chronological audit trail'
      : 'Architecture autonome locale, identité permanente en base64 & classement antéchronologique',
    margin + 8,
    coverY + 45
  );

  // Metadata Block
  let metaY = 110;
  doc.setFontSize(9);
  doc.setTextColor(...slateDark);

  const metadata = isEn
    ? [
        ['Enterprise & Brand:', 'SCOOPS BIR - SAA (Feed Mill & Livestock Supplies)'],
        ['Application Engine:', 'Provenda ERP & POS Desktop / Web Edition v2.5'],
        ['Accounting Currency:', 'CFA Franc (FCFA / XAF) — Space-separated notation (e.g. 1 250 000 FCFA)'],
        ['Valuation Standard:', 'Weighted Average Cost (WAC / CMP) incorporating landing freight fees'],
        ['Technical Stack:', 'React 19, TypeScript, Vite, Tailwind CSS, IndexedDB, Supabase & Electron'],
        ['Hardware Support:', '58 mm & 80 mm POS Thermal Receipt Printers (ESC/POS & Windows Spooler)'],
        ['Security & Control:', 'Strict Role-Based Access Control (Developer, Admin, Manager, Cashier, Stockist)'],
        ['Edition Date:', new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })],
      ]
    : [
        ['Entreprise & Marque :', 'SCOOPS BIR - SAA (Provenderie & Élevage Moderne)'],
        ['Système Logiciel :', 'Provenda ERP & Caisse POS Desktop / Web Edition v2.5'],
        ['Monnaie Comptable :', 'Franc CFA (FCFA / XAF) — Séparateur de milliers officiel (ex: 1 250 000 FCFA)'],
        ['Méthode de Valorisation :', 'Coût Moyen Pondéré (CMP) avec intégration des frais d\'approche'],
        ['Socle Technologique :', 'React 19, TypeScript, Vite, Tailwind CSS, IndexedDB, Supabase & Electron'],
        ['Matériel de Caisse :', 'Imprimantes Thermiques POS 58 mm & 80 mm (Spooler Windows, USB, Réseau)'],
        ['Contrôle & Sécurité :', 'Matrice RBAC stricte (Développeur, Administrateur, Responsable, Caissier, Magasinier)'],
        ['Date d\'Édition :', new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
      ];

  metadata.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + (isEn ? 45 : 50), metaY);
    metaY += 6.5;
  });

  // Table of Contents / Executive Summary
  metaY += 5;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, metaY, contentWidth, 88, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, metaY, contentWidth, 88, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? 'TABLE OF CONTENTS & DOCUMENT OUTLINE' : 'SOMMAIRE EXÉCUTIF & STRUCTURE DU MANUEL',
    margin + 6,
    metaY + 8
  );

  const chaptersOutline = isEn
    ? [
        '• Chapter 1: Global Architecture, Data Models & RBAC Hierarchy (Developer & Admin Separation)',
        '• Chapter 2: Stock Engine, Packaging Unit Conversions & Dynamic WAC / CMP Calculation',
        '• Chapter 3: Point of Sale Terminal (POS), Multi-tender Checkout & Controlled Discount Ceilings',
        '• Chapter 4: Supply Chain, Goods Receptions, Landing Freight Allocation & Supplier Registry',
        '• Chapter 5: Invoicing, Customer Credit Ledgers, Due Dates & Reversible Credit Notes (Avoirs)',
        '• Chapter 6: Physical Inventory Sessions & Quantitative/Financial Variance Reconciliation',
        '• Chapter 7: Thermal Receipt Printing Driver (58mm/80mm), Windows Spooler & Barcode Code 39',
        '• Chapter 8: Cloud Supabase Synchronization, Offline-First Engine & JSON System Backups',
        '• Chapter 9: Product Catalog & Dynamic Pricing Management ("Produits & Tarifs")',
        '• Chapter 10: Developer System Console, Zero-Data Client Reset & Reverse Chronological Sorting',
        '• Chapter 11: Financial Reports, CMP Stock Valuation & Immutable Security Audit Trail',
        '• Chapter 12: Comprehensive Codebase Function Directory (AppContext, Services & Signatures)',
      ]
    : [
        '• Chapitre 1 : Architecture Globale, Modèles & Hiérarchie RBAC (Séparation Développeur/Admin)',
        '• Chapitre 2 : Moteur de Stock, Conversion d\'Unités & Calcul Dynamique du CMP',
        '• Chapitre 3 : Terminal Point de Vente (POS), Encaissement Multi-Moyens & Plafonds de Remise',
        '• Chapitre 4 : Gestion des Achats, Réceptions BL, Frais d\'Approche & Fiches Fournisseurs',
        '• Chapitre 5 : Facturation, Crédits Clients, Échéances & Gestion des Avoirs (AVO)',
        '• Chapitre 6 : Sessions d\'Inventaire Physique & Rapprochement des Écarts au CMP',
        '• Chapitre 7 : Pilote d\'Imprimante Thermique POS (58mm/80mm), Spooler Windows & Code-barres 39',
        '• Chapitre 8 : Synchronisation Cloud Supabase, Mode Hors-Ligne & Sauvegardes JSON',
        '• Chapitre 9 : Gestion du Catalogue "Produits & Tarifs" & Historique des Révisions',
        '• Chapitre 10 : Console Développeur, Remise à Zéro Client & Classement Antéchronologique',
        '• Chapitre 11 : Rapports Financiers, Valorisation CMP & Piste d\'Audit Inaltérable',
        '• Chapitre 12 : Répertoire Exhaustif des Fonctions Code (AppContext, Services & Signatures)',
      ];

  let chapOutlineY = metaY + 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  chaptersOutline.forEach(chap => {
    doc.text(chap, margin + 6, chapOutlineY);
    chapOutlineY += 5.8;
  });

  // Footer Cover
  doc.setFontSize(7.5);
  doc.setTextColor(...slateMuted);
  doc.text(
    isEn
      ? 'SCOOPS BIR - SAA © 2026 — Provenda ERP & POS All-in-One Software System'
      : 'SCOOPS BIR - SAA © 2026 — Système Intégré Provenda ERP & Caisse POS',
    margin,
    pageHeight - 8
  );

  // ----------------------------------------------------
  // RUNNING PAGE BUILDER HELPER
  // ----------------------------------------------------
  function addPageWithHeader(title: string) {
    doc.addPage();
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 3.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryDark);
    doc.text(
      isEn ? 'SCOOPS BIR - SAA | PROVENDA ERP & POS REFERENCE' : 'SCOOPS BIR - SAA | PROVENDA ERP & CAISSE POS',
      margin,
      10
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(title, pageWidth - margin, 10, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 13, pageWidth - margin, 13);
  }

  // ----------------------------------------------------
  // CHAPTER 1 : ARCHITECTURE & RBAC HIERARCHY
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 1: Architecture & Roles' : 'Chapitre 1 : Architecture & Rôles');

  let curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '1. Global Architecture & Role-Based Access Control (RBAC)' : '1. Architecture Globale & Matrice de Sécurité (RBAC)',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pArch = isEn
    ? "Provenda is architected around a unified transactional React Context state engine (AppContext), " +
      "guaranteeing full atomic consistency across inventory ledgers, checkout registers, purchase receptions, customer debts " +
      "and the immutable audit trail. In accordance with strict internal security standards, the system distinguishes " +
      "five specific profiles: Developer, Administrator, Depot Manager, Cashier, and Stockist."
    : "Provenda est architecturé autour d'un gestionnaire d'état transactionnel centralisé (AppContext), " +
      "garantissant la cohérence atomique entre les stocks, les caisses, les réceptions fournisseurs, les créances clients " +
      "et le journal d'audit. Conformément aux exigences de sécurité, le système distingue cinq profils : " +
      "Développeur, Administrateur, Responsable de Dépôt, Caissier et Magasinier.";
  doc.text(doc.splitTextToSize(pArch, contentWidth), margin, curY);

  curY += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? '1.1 System Role Hierarchy & Exclusive Privileges' : '1.1 Hiérarchie des Rôles & Séparation des Privilèges',
    margin,
    curY
  );

  curY += 3;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Role Profile', 'Account Cardinality', 'Discount Limit', 'Key Scope & Permissions', 'Creation Authority']]
      : [['Profil Rôle', 'Cardinalité Compte', 'Plafond Remise', 'Périmètre & Droits Clés', 'Pouvoir de Création']],
    body: isEn
      ? [
          ['Developer', 'Exactly 1 (Protected)', '100% max', 'Full DB console, cloud sync setup, zero-data factory reset. Hidden from non-developers.', 'Can create Administrator & all other roles.'],
          ['Administrator', 'Exactly 1 (Active)', '100% max', 'Company parameters, catalog pricing, full stock/purchase validation, financial reports.', 'Can create Manager, Cashier, Stockist (not Admin).'],
          ['Depot Manager', '1 or more', '15% max', 'POS sales, purchase orders, goods receipt validation, stock adjustments, customer settlements.', 'Cannot create user accounts.'],
          ['Cashier', '1 or more per shift', '0% (Strict)', 'POS counter sales, multi-tender receipts, cash drawer, credit debt collection. View only.', 'Cannot create user accounts.'],
          ['Stockist / Warehouse', '1 or more', '0% (Blocked)', 'Physical goods reception (BL), stock counting, loss/damage adjustments with reason. No sales.', 'Cannot create user accounts.'],
        ]
      : [
          ['Développeur', 'Exactement 1 (Protégé)', '100% max', 'Console base de données, config Supabase, réinitialisation usine zéro-donnée. Masqué aux autres.', 'Peut créer l\'Administrateur et tous les rôles.'],
          ['Administrateur', 'Exactement 1 (Actif)', '100% max', 'Paramètres société, prix catalogue, validation achats/stocks, clôtures et rapports financiers.', 'Peut créer Responsable, Caissier, Magasinier.'],
          ['Responsable', '1 ou plusieurs', '15% max', 'Ventes POS, bons de commande, réceptions BL, régularisations stock, règlements créances.', 'Aucun droit de création d\'utilisateurs.'],
          ['Caissier', '1 ou plusieurs', '0% (Strict)', 'Ventes au comptoir, encaissements multi-moyens, consultation des stocks, recouvrement dettes.', 'Aucun droit de création d\'utilisateurs.'],
          ['Magasinier', '1 ou plusieurs', '0% (Interdit)', 'Réceptions physiques BL, inventaires physiques, ajustements perte/casse avec motif. Pas de vente.', 'Aucun droit de création d\'utilisateurs.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryDark, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  curY = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? '1.2 Core Data Models & Entities' : '1.2 Modèles de Données & Entités Métier',
    margin,
    curY
  );

  curY += 3;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Entity', 'Identifier Format', 'Critical Attributes', 'Business & Accounting Purpose']]
      : [['Entité', 'Format Identifiant', 'Attributs Critiques', 'Rôle Métier & Comptable']],
    body: isEn
      ? [
          ['Product', 'UUID / Code PRD-001', 'baseUnit, saleUnit, conversionFactor, cmp, stockCurrentBaseUnit', 'Feed mill article managed in kg or bag with dynamically updated WAC/CMP.'],
          ['Invoice', 'FAC-YYYY-XXXXXX', 'customerId, items[], totalNet, totalCostOfGoodsSold, grossMargin', 'Sales invoice with itemized profitability, taxes and payment allocations.'],
          ['Purchase', 'ACH-YYYY-XXXXXX', 'supplierId, items[], transportFees, otherFees, status', 'Supply order incorporating landed freight fees into product inventory valuation.'],
          ['StockMovement', 'MVT-YYYY-XXXXXX', 'productId, type, quantityBaseUnit, costUnitCMP, justification', 'Immutable ledger of every inbound, outbound and adjustment flow.'],
          ['InventorySession', 'INV-YYYY-XXXXXX', 'theoreticalStock, physicalStock, varianceQty, varianceValue', 'Physical stocktake session reconciling discrepancies valorized at CMP.'],
          ['Customer', 'CLI-001', 'creditLimit, currentDebt, type (farmer, cooperative, reseller)', 'Client account with strictly enforced debt ceilings and maturity dates.'],
          ['ReceiptPrinterConfig', 'Configuration object', 'paperWidth (58/80mm), printerName, autoPrint, showLogo', 'POS thermal printing driver settings for Windows spooler and desktop bridge.'],
          ['AuditLog', 'AUD-YYYY-XXXXXX', 'userId, action, targetObject, oldValue, newValue, justification', 'ISO-compliant non-repudiation audit trail for all sensitive financial operations.'],
        ]
      : [
          ['Product', 'UUID / Code PRD-001', 'baseUnit, saleUnit, conversionFactor, cmp, stockCurrentBaseUnit', 'Article provenderie géré au kg ou sac avec son CMP recalculé en temps réel.'],
          ['Invoice', 'FAC-AAAA-XXXXXX', 'customerId, items[], totalNet, totalCostOfGoodsSold, grossMargin', 'Facture de vente avec traçabilité marge brute, TVA et encaissements.'],
          ['Purchase', 'ACH-AAAA-XXXXXX', 'supplierId, items[], transportFees, otherFees, status', 'Bon d\'approvisionnement intégrant les frais d\'approche au coût de revient.'],
          ['StockMovement', 'MVT-AAAA-XXXXXX', 'productId, type, quantityBaseUnit, costUnitCMP, justification', 'Journal inaltérable de tous les flux physiques d\'entrée, sortie et ajustement.'],
          ['InventorySession', 'INV-AAAA-XXXXXX', 'theoreticalStock, physicalStock, varianceQty, varianceValue', 'Session de comptage physique valorisant les écarts constatés au CMP.'],
          ['Customer', 'CLI-001', 'creditLimit, currentDebt, type (éleveur, coopérative, revendeur)', 'Fiche tiers client et contrôle strict des plafonds de crédit et échéances.'],
          ['ReceiptPrinterConfig', 'Objet configuration', 'paperWidth (58/80mm), printerName, autoPrint, showLogo', 'Paramétrage du pilote d\'impression thermique POS Windows et bureau.'],
          ['AuditLog', 'AUD-AAAA-XXXXXX', 'userId, action, targetObject, oldValue, newValue, justification', 'Journal de conformité et de non-répudiation pour les opérations sensibles.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 2 : STOCK ENGINE & WAC / CMP
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 2: Stock Engine & WAC' : 'Chapitre 2 : Moteur de Stock & CMP');

  curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '2. Stock Engine & Weighted Average Cost (WAC / CMP) Calculation' : '2. Moteur de Stock & Calculateur du Coût Moyen Pondéré (CMP)',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(isEn ? '2.1 Official Mathematical WAC Formula' : '2.1 Formule Mathématique Officielle du CMP', margin, curY);

  curY += 4;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, curY, contentWidth, 27, 2, 2, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, curY, contentWidth, 27, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? 'RECALCULATION OF WEIGHTED AVERAGE COST UPON GOODS RECEIPT:' : 'RECALCUL DU COÛT MOYEN PONDÉRÉ LORS DE LA RÉCEPTION DE MARCHANDISE :',
    margin + 6,
    curY + 7
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn
      ? 'New_WAC = ( (Initial_Stock × Old_WAC) + Inbound_Cost ) / ( Initial_Stock + Received_Qty )'
      : 'Nouveau CMP = ( (Stock_Initial × Ancien_CMP) + Coût_Entrée ) / ( Stock_Initial + Qté_Reçue )',
    margin + 6,
    curY + 14
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    isEn
      ? 'Where Inbound_Cost = (Received_Qty × Unit_Price) + Transport_Fees + Handling_Landing_Fees'
      : 'Où Coût_Entrée = (Qté_Reçue × Prix_Achat_Unitaire) + Frais_Transport + Frais_Manutention_Déchargement',
    margin + 6,
    curY + 21
  );

  curY += 33;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? '2.2 Attribution of Inbound Landing & Freight Costs' : '2.2 Règle d\'Incorporation des Frais d\'Approche',
    margin,
    curY
  );

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pCmpExplanation = isEn
    ? "Under OHADA (SYSCOHADA) and international inventory valuation standards for agricultural processing units, " +
      "the acquisition cost of raw materials (Corn, Soya meal, Premixes) must include all direct expenditures necessary " +
      "to bring the inventory to its present location and condition. When goods are received in Provenda, transport fees " +
      "and offloading expenses are proportionally added to the product value, preventing any artificial inflation of margins."
    : "Conformément aux normes comptables SYSCOHADA applicables aux provenderies, le coût d'acquisition des matières " +
      "premières (Maïs, Tourteau de soja, Concentrés) intègre obligatoirement le prix facturé par le fournisseur ET les frais " +
      "accessoires d'approvisionnement (transport, manutention, déchargement). Dans Provenda, l'activation des frais d'approche " +
      "ventile ces montants au prorata des quantités reçues, garantissant un coût de revient exact et sincère.";
  doc.text(doc.splitTextToSize(pCmpExplanation, contentWidth), margin, curY);

  curY += 17;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? '2.3 Multi-Unit Packaging & Conversion Engine' : '2.3 Moteur de Conversion d\'Unités & Conditionnements',
    margin,
    curY
  );

  curY += 3;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Commercial Packaging', 'Sale Unit', 'Stock Base Unit', 'Conversion Factor', 'Operational Execution in POS']]
      : [['Conditionnement Commercial', 'Unité Vente', 'Unité Base Stock', 'Facteur de Conversion', 'Exécution Opérationnelle en Caisse']],
    body: isEn
      ? [
          ['50 kg Bag (Finisher / Broiler feed)', 'bag (sac)', 'kilogram (kg)', '50', 'Sale of 2 bags = Auto deduction of 100 kg in inventory at CMP.'],
          ['25 kg Bag (Starter chick feed)', 'bag (sac)', 'kilogram (kg)', '25', 'Sale of 4 bags = Auto deduction of 100 kg in inventory at CMP.'],
          ['Loose bulk retail by the kilo', 'kilogram (kg)', 'kilogram (kg)', '1', 'Sale of 12.5 kg = Exact reduction of 12.5 kg in inventory.'],
          ['20 Liter Jug (Liquid vitamins / Molasses)', 'jug (bidon)', 'liter (L)', '20', 'Receipt of 5 jugs = Auto increment of 100 L in warehouse.'],
          ['1 Ton Pallet (Bulk grain supplies)', 'pallet (palette)', 'kilogram (kg)', '1 000', 'Receipt of 2 pallets = Stock increment of 2 000 kg.'],
        ]
      : [
          ['Sac de 50 kg (Aliment Chair Finition)', 'sac', 'kilogramme (kg)', '50', 'Vente de 2 sacs = Déduction automatique de 100 kg en stock au CMP.'],
          ['Sac de 25 kg (Aliment Démarrage)', 'sac', 'kilogramme (kg)', '25', 'Vente de 4 sacs = Déduction automatique de 100 kg en stock au CMP.'],
          ['Vente au détail au kilo (Vrac)', 'kilogramme (kg)', 'kilogramme (kg)', '1', 'Vente de 12.5 kg = Déduction exacte de 12.5 kg en stock.'],
          ['Bidon de 20 Litres (Mélasse / Huile)', 'bidon', 'litre (L)', '20', 'Réception de 5 bidons = Augmentation de 100 L en stock.'],
          ['Palette de 1 Tonne (Approvisionnement)', 'palette', 'kilogramme (kg)', '1 000', 'Réception de 2 palettes = Incrément de 2 000 kg en magasin.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 3 : POS CHECKOUT & MARGIN ENGINE
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 3: POS Checkout & Sales' : 'Chapitre 3 : Caisse POS & Ventes');

  curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '3. Point of Sale Terminal (POS) & Checkout Engine' : '3. Terminal Point de Vente (POS) & Encaissement',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pPosDesc = isEn
    ? "The POS terminal is optimized for high-volume sales counters with instant barcode and product code lookup, " +
      "dynamic packaging unit selector, live profitability margin indicators, multi-tender payment splitting " +
      "(Cash, Orange Money, MTN MoMo, Bank Transfer, Customer Credit), and automatic thermal receipt generation."
    : "Le terminal de caisse POS est conçu pour un enregistrement rapide des commandes au comptoir : recherche instantanée " +
      "par nom ou code-barres, sélection du conditionnement, calcul de la marge en temps réel, encaissements fractionnés " +
      "(Espèces, Orange Money, MTN Mobile Money, Virement bancaire, Crédit client) et impression thermique automatique.";
  doc.text(doc.splitTextToSize(pPosDesc, contentWidth), margin, curY);

  curY += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? '3.1 Live Profitability & Gross Margin Formulas' : '3.1 Calculateur de Rentabilité & Marge Brute en Temps Réel',
    margin,
    curY
  );

  curY += 4;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(...primaryColor);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'S');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...slateDark);
  if (isEn) {
    doc.text('1. Gross Subtotal = Sum ( Line Quantity × Catalog Unit Sale Price )', margin + 6, curY + 6);
    doc.text('2. Net Invoice Revenue = Gross Subtotal - Total Approved Commercial Discount', margin + 6, curY + 12);
    doc.text('3. Cost of Goods Sold (COGS) = Sum ( Base Quantity × Product WAC / CMP )', margin + 6, curY + 18);
    doc.text('4. Gross Margin = Net Revenue - COGS   |   Margin Rate (%) = (Gross Margin / Net Revenue) × 100', margin + 6, curY + 24);
  } else {
    doc.text('1. Total Brut = Somme ( Quantité Ligne × Prix Unitaire Vente Catalogue )', margin + 6, curY + 6);
    doc.text('2. Chiffre d\'Affaires Net = Total Brut - Remise Commerciale Accordée', margin + 6, curY + 12);
    doc.text('3. Coût des Ventes (CMV) = Somme ( Quantité Base × CMP Historique du Produit )', margin + 6, curY + 18);
    doc.text('4. Marge Brute = CA Net - CMV   |   Taux de Marge (%) = (Marge Brute / CA Net) × 100', margin + 6, curY + 24);
  }

  curY += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryDark);
  doc.text(
    isEn ? '3.2 Commercial Discount Authorization Matrix' : '3.2 Matrice d\'Autorisation des Remises Commerciales',
    margin,
    curY
  );

  curY += 3;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['User Profile', 'Max Allowed Discount', 'Enforcement Mechanism', 'Audit & Exception Logging']]
      : [['Profil Utilisateur', 'Remise Maximale Autorisée', 'Mécanisme de Contrôle', 'Traçabilité & Dérogation Audit']],
    body: isEn
      ? [
          ['Cashier', '0% (Strictly Blocked)', 'Input locked to 0%. Any discount field is rejected by the transaction engine.', 'Impossible to checkout with discount without manager override.'],
          ['Depot Manager', 'Up to 15% maximum', 'Soft warning displayed above 10%. Hard block if discount exceeds 15%.', 'Manager identity, client code and discount justification logged on invoice.'],
          ['Administrator', 'Up to 100% (Full exception)', 'Full override capability with mandatory reason prompt for auditing.', 'Logged in immutable audit trail with before/after financial impact.'],
          ['Developer', '100% (Console)', 'Full override during testing and calibration mode.', 'Special developer maintenance flag recorded.'],
        ]
      : [
          ['Caissier', '0% (Interdit)', 'Champ remise verrouillé à 0%. Rejet automatique par le moteur de caisse.', 'Impossible d\'encaisser avec remise sans intervention d\'un supérieur.'],
          ['Responsable', 'Jusqu\'à 15% maximum', 'Avertissement au-delà de 10%. Blocage strict au-delà de 15%.', 'Nom du responsable, client et motif enregistrés sur la facture.'],
          ['Administrateur', 'Jusqu\'à 100% (Dérogation totale)', 'Libre dérogation avec saisie obligatoire d\'un motif de justification.', 'Enregistré dans le journal d\'audit avec impact sur la marge brute.'],
          ['Développeur', '100% (Mode Console)', 'Dérogation intégrale lors des phases de test et d\'étalonnage.', 'Marqueur spécifique d\'intervention développeur dans les logs.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 4 & 5 : PURCHASES & INVOICING / CREDIT
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 4 & 5: Supply Chain & Invoicing' : 'Chapitre 4 & 5 : Achats, Facturation & Crédits');

  curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '4. Supply Chain, Goods Receptions & Supplier Ledger' : '4. Achats, Réceptions BL & Gestion Fournisseurs',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pPurchases = isEn
    ? "Supply chain management ensures complete traceability of grain and feed input purchases. " +
      "Purchase orders originate as drafts (ACH-YYYY-XXXXXX). Upon physical delivery at the warehouse, " +
      "the goods receipt validation checks incoming quantities, allocates transport fees, automatically updates " +
      "the stock base units, recalculates each item's WAC/CMP, and marks the purchase as received."
    : "Le module d'approvisionnement assure la traçabilité complète des achats de matières premières. " +
      "Les commandes sont créées au statut brouillon (ACH-AAAA-XXXXXX). Lors de la livraison physique au magasin, " +
      "la validation du bon de réception vérifie les quantités, intègre les frais de transport, crédite automatiquement " +
      "les stocks en unité de base, recalcule le CMP unitaire de chaque produit et clôture le bon d'achat.";
  doc.text(doc.splitTextToSize(pPurchases, contentWidth), margin, curY);

  curY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '5. Invoicing, Customer Credit Ledgers & Credit Notes (Avoirs)' : '5. Facturation, Crédits Clients & Gestion des Avoirs (AVO)',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pInvoicing = isEn
    ? "Every completed counter transaction generates an official sequentially numbered invoice (FAC-YYYY-XXXXXX). " +
      "For partner farmers and cooperative members with approved credit facilities, the system monitors credit ceilings " +
      "and due dates. In the event of order cancellation or dispute, an official Credit Note (AVO-YYYY-XXXXXX) is generated, " +
      "reintegrating returned items into inventory and reversing customer receivables."
    : "Toute vente donne lieu à l'émission d'une facture numérotée séquentiellement (FAC-AAAA-XXXXXX). " +
      "Pour les éleveurs et coopératives bénéficiant d'un compte à terme, le système contrôle les plafonds de crédit " +
      "et les échéances. En cas d'annulation ou litige, un Avoir certifié (AVO-AAAA-XXXXXX) est généré, réintégrant " +
      "automatiquement les articles en stock au CMP et annulant la créance dans le compte client.";
  doc.text(doc.splitTextToSize(pInvoicing, contentWidth), margin, curY);

  curY += 15;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Invoice Status', 'Debt Balance', 'Stock Impact', 'Allowed Operational Action']]
      : [['Statut Facture', 'Solde Dû', 'Impact sur le Stock', 'Action Opérationnelle Autorisée']],
    body: isEn
      ? [
          ['Paid (Payée)', '0 FCFA', 'Decremented at sale at WAC', 'Print duplicate receipt, view A4 invoice.'],
          ['Credit (À crédit)', '> 0 FCFA (Full)', 'Decremented at sale at WAC', 'Record partial/full debt payment, send payment reminder.'],
          ['Partial (Partielle)', '> 0 FCFA (Balance)', 'Decremented at sale at WAC', 'Receive secondary payments until balance reaches 0 FCFA.'],
          ['Cancelled (Annulée)', '0 FCFA (Reversed)', 'Reintegrated via Credit Note', 'Historical viewing only. Stock returned to warehouse.'],
        ]
      : [
          ['Payée', '0 FCFA', 'Décrémenté au CMP lors de la vente', 'Impression duplicata ticket, consultation facture A4.'],
          ['À crédit', '> 0 FCFA (Totalité)', 'Décrémenté au CMP lors de la vente', 'Enregistrement des versements d\'acompte ou solde.'],
          ['Partielle', '> 0 FCFA (Reliquat)', 'Décrémenté au CMP lors de la vente', 'Encaissement des tranches jusqu\'à apurement total.'],
          ['Annulée', '0 FCFA (Annulée)', 'Réintégré en stock via Avoir', 'Consultation historique. Marchandises remises en rayon.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 6 & 7 : INVENTORY & THERMAL PRINTER DRIVER
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 6 & 7: Inventory & Thermal Printer' : 'Chapitre 6 & 7 : Inventaire & Imprimante Thermique');

  curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '6. Physical Inventory Sessions & Reconciliation at WAC' : '6. Sessions d\'Inventaire Physique & Rapprochement au CMP',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pInventory = isEn
    ? "Inventory management supports scheduled and spot physical counting sessions (INV-YYYY-XXXXXX). " +
      "The system freezes theoretical stock at session opening, compares it against field counts, and automatically computes " +
      "quantitative variances (Surplus/Deficit) and financial variances valorized at current WAC/CMP. Validating the session " +
      "creates balancing stock movements and records an audit log entry."
    : "Le module d'inventaire organise les comptages physiques périodiques ou inopinés (INV-AAAA-XXXXXX). " +
      "Le système capture le stock théorique à l'ouverture, le confronte aux relevés physiques de terrain et calcule " +
      "automatiquement les écarts quantitatifs (Excédents/Manquants) et financiers valorisés au CMP unitaire. " +
      "La validation génère les écritures de régularisation et consigne l'opération dans la piste d'audit.";
  doc.text(doc.splitTextToSize(pInventory, contentWidth), margin, curY);

  curY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '7. POS Thermal Receipt Printing Driver (58 mm & 80 mm)' : '7. Pilote d\'Impression Thermique POS (58 mm & 80 mm)',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pPrinter = isEn
    ? "Provenda includes a built-in POS thermal receipt printer driver supporting both 58 mm and 80 mm thermal paper formats. " +
      "The driver connects with the Windows print spooler, USB and network receipt printers, and the native Electron desktop bridge. " +
      "Every printed receipt includes the corporate logo, store header, tax credentials, itemized quantities and prices, " +
      "payment methods, cash tender change calculation, and an official Code 39 barcode."
    : "Provenda intègre un pilote de caisse pour imprimantes thermiques aux formats standard 58 mm et 80 mm. " +
      "Le moteur communique avec le spooler Windows, les ports USB, les imprimantes réseau et le pont natif Electron. " +
      "Chaque ticket imprimé inclut le logo officiel, l'en-tête de la coopérative, les mentions fiscales (NIF, RCCM), " +
      "le détail des articles, les modes de règlement, le rendu de monnaie et le code-barres Code 39 du numéro de ticket.";
  doc.text(doc.splitTextToSize(pPrinter, contentWidth), margin, curY);

  curY += 15;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Printer Capability', '58 mm Paper Width', '80 mm Standard POS Width', 'Operational Benefit']]
      : [['Caractéristique Pilote', 'Format 58 mm (Compact)', 'Format 80 mm (Standard POS)', 'Bénéfice Opérationnel']],
    body: isEn
      ? [
          ['Printable Columns', '32 characters per line', '42-48 characters per line', 'Adapts cleanly to small mobile Bluetooth printers and heavy-duty desktop terminals.'],
          ['Item Breakdown', '2-line compact stack per item', '4-column tabular alignment', 'Clear reading of quantities, unit prices, discounts and total line values.'],
          ['Barcode Generation', 'High-density Code 39', 'Standard Code 39 barcode', 'Allows instant ticket lookup and barcode scanning for returns and customer audits.'],
          ['Reprint Duplicate Marking', '*** DUPLICATA / RÉIMPRESSION ***', '*** DUPLICATA / RÉIMPRESSION ***', 'Prevents cash theft and fraudulent duplicate re-printing.'],
        ]
      : [
          ['Largeur d\'impression', '32 caractères par ligne', '42 à 48 caractères par ligne', 'S\'adapte aux imprimantes Bluetooth mobiles comme aux caisses fixes de provenderie.'],
          ['Affichage des articles', 'Format compact empilé sur 2 lignes', 'Tableau aligné en 4 colonnes', 'Lisibilité claire des désignations, quantités, remises et totaux.'],
          ['Code-barres Ticket', 'Code 39 haute densité', 'Code 39 standardisé', 'Permet le scan immédiat du ticket lors des vérifications ou des réclamations.'],
          ['Sécurité Réimpression', '*** DUPLICATA / RÉIMPRESSION ***', '*** DUPLICATA / RÉIMPRESSION ***', 'Empêche la fraude de caisse par réédition clandestine d\'un même ticket.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryDark, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 8 & 9 : CLOUD SYNC & PRODUCTS CATALOG
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 8 & 9: Cloud Sync & Products' : 'Chapitre 8 & 9 : Synchro Supabase & Produits');

  curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '8. Cloud Supabase Synchronization & Offline Local-First Engine' : '8. Synchronisation Cloud Supabase & Moteur Autonome Hors-Ligne',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pSync = isEn
    ? "Provenda functions with a 100% autonomous local-first architecture. All cash desk, inventory and sales operations " +
      "execute instantly in local memory and IndexedDB without requiring an internet connection. When network connectivity is active, " +
      "the background sync engine automatically transmits transactions to the cloud PostgreSQL database (Supabase) and pulls remote updates. " +
      "Default credentials in supabaseDefaultConfig.ts provide zero-configuration backup, complemented by manual JSON file export."
    : "Provenda fonctionne selon une architecture locale autonome (local-first). Toutes les ventes, encaissements et mouvements " +
      "de stock s'exécutent instantanément en mémoire locale et IndexedDB, sans aucune dépendance à Internet. Dès qu'une connexion " +
      "est disponible, le moteur d'arrière-plan synchronise automatiquement les données vers la base cloud PostgreSQL (Supabase) " +
      "et télécharge les nouveautés. Une configuration de secours intégrée garantit la synchronisation sans paramétrage complexe.";
  doc.text(doc.splitTextToSize(pSync, contentWidth), margin, curY);

  curY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '9. Product Catalog & Dynamic Pricing Management ("Produits & Tarifs")' : '9. Gestion du Catalogue "Produits & Tarifs" & Révision des Prix',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pCatalog = isEn
    ? "The dedicated 'Produits & Tarifs' module allows authorized managers and administrators to view, search, create and maintain " +
      "feed articles and raw materials. For each item, users configure the commercial packaging (50 kg bag, 25 kg bag, liter jug, loose kg), " +
      "stock conversion ratios, purchase costs, catalog sale prices and minimum safety alert thresholds. Every price revision is logged " +
      "in the historical price ledger with date, previous price, new price, user ID, and justification."
    : "Le module dédié 'Produits & Tarifs' permet aux responsables et administrateurs de consulter, rechercher, créer et administrer " +
      "l'ensemble des articles et matières premières. Pour chaque produit, l'utilisateur définit le conditionnement commercial " +
      "(sac 50 kg, sac 25 kg, bidon, vrac au kg), le ratio de conversion vers l'unité de base, le prix d'achat, le prix de vente catalogue " +
      "et le seuil d'alerte critique. Chaque modification de tarif est consignée dans l'historique avec date, ancien prix, nouveau prix et motif.";
  doc.text(doc.splitTextToSize(pCatalog, contentWidth), margin, curY);

  curY += 15;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Catalog Category', 'Sample Products', 'Stock Management Unit', 'Price Revision Rule']]
      : [['Catégorie Catalogue', 'Exemples d\'Articles', 'Unité Gestion Stock', 'Règle de Révision des Prix']],
    body: isEn
      ? [
          ['Raw Materials (Matières Premières)', 'Corn, Soya meal, Wheat bran, Oyster shells', 'Kilogram (kg) / Ton', 'Frequent price fluctuations based on agricultural harvest seasons.'],
          ['Finished Feed (Aliments Finis)', 'Broiler Starter, Broiler Finisher, Layer Feed, Pig Grower', 'Bag of 50 kg or 25 kg', 'Stable commercial price set to maintain targeted gross margin.'],
          ['Concentrates & Premixes', 'Concentrate 5%, Broiler Premix, Vitamin Mineral Premix', 'Kilogram (kg) or 25 kg sack', 'High-value input with precise weight monitoring.'],
          ['Supplies & Veterinary Additives', 'Liquid vitamins, Dewormers, Disinfectants, Molasses', 'Liter (L) / Unit', 'Packaged retail items with fixed catalog sale prices.'],
        ]
      : [
          ['Matières Premières', 'Maïs blanc/jaune, Tourteau soja, Son de blé, Coquilles', 'Kilogramme (kg) / Tonne', 'Fluctuations fréquentes selon les saisons agricoles et cours du marché.'],
          ['Aliments Finis', 'Chair Démarrage, Chair Finition, Pondeuse, Porc Croissance', 'Sac de 50 kg ou 25 kg', 'Tarif public calculé pour garantir la marge brute cible.'],
          ['Concentrés & Prémix', 'Concentré chair 5%, Prémix ponte, CMV volaille', 'Kilogramme (kg) / Sac 25 kg', 'Intrants à forte valeur ajoutée avec suivi rigoureux des quantités.'],
          ['Fournitures & Vétérinaire', 'Vitamines liquides, Vermifuges, Désinfectants, Mélasse', 'Litre (L) / Flacon / Unité', 'Articles conditionnés à prix catalogue stable.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 10 & 11 : DEVELOPER CONSOLE & AUDIT TRAIL
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 10 & 11: Developer Console & Reports' : 'Chapitre 10 & 11 : Console Développeur & Rapports');

  curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '10. Developer System Console, Zero-Data Reset & Sorting Standards' : '10. Console Développeur, Remise à Zéro Client & Normes de Tri',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pDevConsole = isEn
    ? "To guarantee a clean handover of the application to the final client, the Developer profile has an exclusive maintenance console. " +
      "The 'Réinitialiser aux Données Initiales' function performs a complete purge of all operational and transactional data " +
      "(receipts, invoices, purchases, stock movements, physical inventory sessions, expenses, credit notes) while preserving " +
      "the calibrated product catalog, company settings, and default logo. Additionally, all operational tables across the system " +
      "follow strict reverse chronological ordering (newest items first) and format currency with non-breaking space thousand separators."
    : "Pour garantir une livraison irréprochable au client final, le profil Développeur dispose d'une console de maintenance dédiée. " +
      "La fonction 'Réinitialiser aux Données Initiales' effectue une purge intégrale de toutes les données transactionnelles " +
      "(tickets de caisse, factures de vente, achats, mouvements de stock, sessions d'inventaire, dépenses, avoirs) tout en conservant " +
      "le catalogue d'articles, les paramètres de l'entreprise et le logo officiel en base64. De plus, tous les tableaux opérationnels " +
      "adoptent un classement antéchronologique rigoureux (les plus récents en tête) avec formatage officiel des montants en FCFA.";
  doc.text(doc.splitTextToSize(pDevConsole, contentWidth), margin, curY);

  curY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '11. Financial Reports, CMP Stock Valuation & Immutable Security Audit Trail' : '11. Rapports Financiers, Valorisation CMP & Piste d\'Audit',
    margin,
    curY
  );

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pReports = isEn
    ? "The reporting module provides real-time visibility into business performance: Stock Valuation at WAC/CMP (with high-contrast " +
      "totals row for crystal-clear readability), Sales Ledger & Margin Analysis, Cash Flow & Expense Summaries, and the ISO-compliant " +
      "Audit Trail. Every sensitive event (price changes, overrides, invoice cancellations, stock reconciliations) is logged with user timestamp, " +
      "old value, new value, and mandatory reason."
    : "Le module de rapports offre une visibilité financière complète : État valorisé du stock au CMP (avec ligne de totalisation contrastée " +
      "pour une lisibilité optimale à l'écran et à l'impression), Journal des ventes et analyse des marges, Suivi de trésorerie et dépenses, " +
      "et Piste d'audit de sécurité. Chaque action sensible (révision de prix, dérogation, annulation, ajustement) consigne l'horodatage, " +
      "l'identifiant utilisateur, l'ancienne et la nouvelle valeur, et le motif justificatif.";
  doc.text(doc.splitTextToSize(pReports, contentWidth), margin, curY);

  curY += 15;
  autoTable(doc, {
    startY: curY,
    head: isEn
      ? [['Official Report', 'Report Objective', 'Key Valuation Metric', 'Export Options']]
      : [['Rapport Officiel', 'Objectif du Rapport', 'Métrique Clé & Valorisation', 'Options d\'Exportation']],
    body: isEn
      ? [
          ['Stock & WAC Valuation', 'Instant audit of available warehouse stocks', 'Total stock value = Sum (Stock Base Qty × CMP)', 'Printable A4 PDF, Excel/CSV export, screen preview.'],
          ['Sales & Gross Margins', 'Commercial profitability by period and product', 'Gross Margin = Net Revenue - COGS at CMP', 'Date range filtering, cashier breakdown, printable PDF.'],
          ['Cash Flow & Expenses', 'Operating overhead tracking and net cash balance', 'Net Cash = Cash Receipts - Operating Expenses', 'Expense categorized breakdown, receipt vouchers.'],
          ['Audit Trail (Piste d\'Audit)', 'ISO forensic security and fraud prevention', 'Immutable log of all user interventions & overrides', 'Tamper-proof event log, developer/admin filters.'],
        ]
      : [
          ['Stocks & Valorisation CMP', 'Audit instantané de la valeur des stocks en magasin', 'Valeur Totale = Somme (Qté Stock × CMP)', 'Impression A4 PDF haute visibilité, export CSV, écran.'],
          ['Ventes & Marges Brutes', 'Rentabilité commerciale par période et produit', 'Marge Brute = CA Net - CMV au CMP', 'Filtres de dates, ventilation caissier, export PDF.'],
          ['Trésorerie & Dépenses', 'Contrôle des charges d\'exploitation et solde net', 'Solde Net = Recettes Caisse - Dépenses Payées', 'Ventilation par catégorie, reçus justificatifs.'],
          ['Piste d\'Audit (Audit Trail)', 'Sécurité légale, conformité et contrôle interne', 'Historique inaltérable de toutes les modifications', 'Traçabilité non répudiable, filtres par utilisateur.'],
        ],
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ----------------------------------------------------
  // CHAPTER 12 : COMPREHENSIVE CODEBASE FUNCTION DIRECTORY
  // ----------------------------------------------------
  addPageWithHeader(isEn ? 'Chapter 12: Codebase Directory' : 'Chapitre 12 : Répertoire des Fonctions Code');

  curY = 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...slateDark);
  doc.text(
    isEn ? '12. Comprehensive Codebase Function Directory (AppContext & Services)' : '12. Répertoire Exhaustif des Fonctions du Code Source (AppContext & Services)',
    margin,
    curY
  );

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const pDirectoryIntro = isEn
    ? "This technical directory specifies the core methods implemented in AppContext.tsx and surrounding services. " +
      "It documents TypeScript signatures, inputs, outputs, exceptions, and execution logic for engineers and auditors."
    : "Ce répertoire technique spécifie les principales fonctions implémentées dans AppContext.tsx et les services périphériques. " +
      "Il consigne les signatures TypeScript, paramètres d'entrée, valeurs de retour et algorithmes exécutés.";
  doc.text(doc.splitTextToSize(pDirectoryIntro, contentWidth), margin, curY);

  curY += 10;

  const appFunctionsBilingual = [
    {
      category: isEn ? 'Authentication, RBAC & Developer Role' : 'Authentification, Sécurité RBAC & Profil Développeur',
      funcs: isEn
        ? [
            ['login(email, password)', '(email: string, password: string) => { success: boolean; error?: string }', 'Authenticates user credentials, validates active account status, updates lastLogin timestamp, and creates user session.'],
            ['logout()', '() => void', 'Terminates active session, clears authentication state, and redirects user to secure login interface.'],
            ['switchRole(role)', '(role: Role) => void', 'Switches active role for testing privilege boundaries (developpeur, administrateur, responsable, caissier, magasinier).'],
            ['addUser(user)', '(user: Omit<User, "id"|"createdAt">) => { success: boolean; error?: string }', 'Creates an employee user. If Developer, can create Administrator. If Administrator, can create Manager, Cashier, Stockist.'],
            ['updateUser(user)', '(user: User) => void', 'Updates employee credentials, status, discount limits, or role with full audit traceability.'],
            ['deactivateUser(id)', '(id: string) => void', 'Deactivates an employee account immediately revoking access while preserving past transactional history.'],
          ]
        : [
            ['login(email, password)', '(email: string, password: string) => { success: boolean; error?: string }', 'Authentifie l\'utilisateur, valide le statut actif, met à jour l\'horodatage lastLogin et initialise la session.'],
            ['logout()', '() => void', 'Clôture la session active, nettoie les données d\'authentification et redirige vers la mire de connexion.'],
            ['switchRole(role)', '(role: Role) => void', 'Bascule de profil pour vérifier les habilitations (developpeur, administrateur, responsable, caissier, magasinier).'],
            ['addUser(user)', '(user: Omit<User, "id"|"createdAt">) => { success: boolean; error?: string }', 'Crée un compte utilisateur. Le Développeur peut créer l\'Administrateur. L\'Administrateur peut créer Responsable, Caissier, Magasinier.'],
            ['updateUser(user)', '(user: User) => void', 'Met à jour les identifiants, rôle, statut ou plafond de remise d\'un employé avec traçabilité d\'audit.'],
            ['deactivateUser(id)', '(id: string) => void', 'Désactive le compte d\'un employé en révoquant son accès sans altérer son historique de transactions.'],
          ],
    },
    {
      category: isEn ? 'Product Catalog & Dynamic Pricing' : 'Catalogue Produits & Révision des Tarifs',
      funcs: isEn
        ? [
            ['addProduct(product)', '(product: Omit<Product, "id"|"createdAt"|"updatedAt">) => { success: boolean; error?: string }', 'Creates new feed item or raw material with base units, packaging conversion factor, purchase price, catalog sale price and alert threshold.'],
            ['updateProduct(product)', '(product: Product) => { success: boolean; error?: string }', 'Updates product information, description, category, packaging and reorder thresholds with audit logging.'],
            ['updateProductPrice(id, newPrice, reason)', '(productId: string, newPrice: number, reason: string) => { success: boolean; error?: string }', 'Revises catalog sale price, logs change in priceHistory with previous price, author, date and mandatory reason.'],
            ['deleteProduct(id)', '(productId: string) => { success: boolean; error?: string }', 'Soft-archives product if no active transactions, preventing deletion of items with accounting history.'],
          ]
        : [
            ['addProduct(product)', '(product: Omit<Product, "id"|"createdAt"|"updatedAt">) => { success: boolean; error?: string }', 'Crée un nouvel article ou matière première avec unité de base, facteur de conversion, prix d\'achat, prix de vente et seuil d\'alerte.'],
            ['updateProduct(product)', '(product: Product) => { success: boolean; error?: string }', 'Met à jour la fiche produit, conditionnement, catégorie et paramètres d\'alerte avec traçabilité d\'audit.'],
            ['updateProductPrice(id, newPrice, reason)', '(productId: string, newPrice: number, reason: string) => { success: boolean; error?: string }', 'Réviser le prix de vente catalogue, archive l\'ancienne valeur dans priceHistory avec date, auteur et motif obligatoire.'],
            ['deleteProduct(id)', '(productId: string) => { success: boolean; error?: string }', 'Archive l\'article si aucune transaction liée, empêchant la suppression d\'articles ayant un historique comptable.'],
          ],
    },
    {
      category: isEn ? 'POS Sales, Checkout, Margins & Avoirs' : 'Ventes Caisse POS, Marges & Gestion des Avoirs',
      funcs: isEn
        ? [
            ['createSale(...)', '(customerId, items, discount?, payment?, notes?, isCredit?, creditDueDate?, spId?) => { success: boolean; invoiceId?: string; error?: string }', 'Executes atomic checkout transaction: validates stock, checks user discount ceiling, computes gross margin at WAC, generates FAC invoice, decrements stock, records payments and logs audit.'],
            ['cancelInvoiceWithCreditNote(id, reason)', '(invoiceId: string, reason: string) => { success: boolean; error?: string }', 'Cancels sale invoice: generates official Credit Note AVO-YYYY-XXXXXX, restocks inventory at WAC, reverses customer debt and records audit justification.'],
            ['recordDebtPayment(...)', '(invoiceId, amount, method, ref?, notes?) => { success: boolean; error?: string }', 'Records customer credit repayment: reduces invoice remaining balance, decrements total customer debt, and updates status to paid when balance reaches 0.'],
          ]
        : [
            ['createSale(...)', '(customerId, items, discount?, payment?, notes?, isCredit?, creditDueDate?, spId?) => { success: boolean; invoiceId?: string; error?: string }', 'Exécute la transaction de vente intégrale : vérifie le stock disponible, contrôle le plafond de remise, calcule la marge au CMP, génère la facture FAC, décrémente le stock, enregistre le paiement et déclenche l\'audit.'],
            ['cancelInvoiceWithCreditNote(id, reason)', '(invoiceId: string, reason: string) => { success: boolean; error?: string }', 'Annule une facture de vente : émet un Avoir officiel AVO-AAAA-XXXXXX, réintègre les articles en stock au CMP, annule la créance et consigne le motif.'],
            ['recordDebtPayment(...)', '(invoiceId, amount, method, ref?, notes?) => { success: boolean; error?: string }', 'Enregistre le règlement d\'une dette client : réduit le solde de la facture, diminue l\'encours client et passe la facture au statut soldé si solde nul.'],
          ],
    },
    {
      category: isEn ? 'Supply Chain, Goods Reception & WAC Engine' : 'Achats, Réceptions BL & Recalcul du CMP',
      funcs: isEn
        ? [
            ['createPurchaseDraft(p, spId)', '(purchase, targetSalesPointId?) => string', 'Generates draft purchase order with reference ACH-YYYY-XXXXXX, line items, and estimated landing freight fees.'],
            ['validatePurchaseReception(id)', '(purchaseId: string) => void', 'Core WAC calculation engine: recalculates new WAC/CMP per item, increments base unit inventory, and closes purchase order.'],
            ['cancelPurchase(id, reason)', '(purchaseId: string, reason: string) => void', 'Cancels purchase order with mandatory justification note. Physical stock is unaffected.'],
          ]
        : [
            ['createPurchaseDraft(p, spId)', '(purchase, targetSalesPointId?) => string', 'Génère un bon de commande au statut brouillon avec référence ACH-AAAA-XXXXXX, articles et frais d\'approche.'],
            ['validatePurchaseReception(id)', '(purchaseId: string) => void', 'Cœur du moteur CMP : calcule le nouveau CMP unitaire de chaque produit reçu, incrémente le stock en unité de base et clôture le bon.'],
            ['cancelPurchase(id, reason)', '(purchaseId: string, reason: string) => void', 'Passe le bon d\'achat au statut annulé avec motif obligatoire. Les stocks physiques ne sont pas modifiés.'],
          ],
    },
    {
      category: isEn ? 'Thermal POS Printing Driver (58mm/80mm)' : 'Pilote d\'Impression Thermique POS (58mm/80mm)',
      funcs: isEn
        ? [
            ['printReceipt(invoice, settings, cfg, isReprint)', '(invoice, settings, config, isReprint?) => Promise<{ success: boolean; error?: string }>', 'Dispatches formatted thermal ticket to physical printer via spooler, USB or isolated iframe printing.'],
            ['formatReceiptThermal58mm(...)', '(invoice, settings, config, isReprint?) => string', 'Generates high-contrast 32-column HTML ESC/POS document optimized for 58 mm mobile receipt printers.'],
            ['formatReceiptThermal80mm(...)', '(invoice, settings, config, isReprint?) => string', 'Generates standard 4-column 42-column HTML ESC/POS document for 80 mm POS counter printers.'],
            ['savePrinterConfig(config)', '(config: ReceiptPrinterConfig) => void', 'Persists thermal printer preferences (paper width, auto-print, logo display, printer name) to storage.'],
            ['printTestReceipt(settings, config)', '(settings, config) => Promise<{ success: boolean; error?: string }>', 'Sends a diagnostic test voucher to verify printer readiness, paper feed, alignment and barcode readability.'],
          ]
        : [
            ['printReceipt(invoice, settings, cfg, isReprint)', '(invoice, settings, config, isReprint?) => Promise<{ success: boolean; error?: string }>', 'Envoie le ticket formaté à l\'imprimante thermique via le spooler Windows, le port USB ou iframe isolée.'],
            ['formatReceiptThermal58mm(...)', '(invoice, settings, config, isReprint?) => string', 'Génère le document HTML thermique 32 colonnes optimisé pour imprimantes de poche 58 mm.'],
            ['formatReceiptThermal80mm(...)', '(invoice, settings, config, isReprint?) => string', 'Génère le document HTML thermique 42 colonnes avec tableau 4 colonnes pour imprimantes de caisse 80 mm.'],
            ['savePrinterConfig(config)', '(config: ReceiptPrinterConfig) => void', 'Sauvegarde les préférences d\'impression thermique (largeur papier, impression auto, logo, nom imprimante).'],
            ['printTestReceipt(settings, config)', '(settings, config) => Promise<{ success: boolean; error?: string }>', 'Émet un ticket de test technique pour valider la communication, l\'avance papier et le code-barres.'],
          ],
    },
    {
      category: isEn ? 'Cloud Supabase Sync & Zero-Data Client Reset' : 'Synchro Cloud Supabase & Remise à Zéro Client',
      funcs: isEn
        ? [
            ['performAutomaticSync()', '() => Promise<{ success: boolean; message?: string }>', 'Background engine: checks network, pushes local state changes to Supabase cloud, pulls remote updates.'],
            ['pushAllLocalDataToSupabase()', '() => Promise<{ success: boolean; message: string }>', 'Uploads all local tables (products, invoices, purchases, movements, customers, suppliers) to Supabase.'],
            ['pullAllDataFromSupabase()', '() => Promise<{ success: boolean; data?: any; message?: string }>', 'Downloads cloud state and restores local storage ensuring multi-device synchronization.'],
            ['resetToDefaultData()', '() => Promise<void>', 'Developer exclusive maintenance action: completely resets system to blank slate (purges products, customers, suppliers, non-dev users, transactions, inventories, expenses, and audit logs) while preserving developer account and system settings.'],
            ['exportSystemBackup()', '() => string', 'Generates timestamped JSON backup file containing all application state tables for disaster recovery.'],
            ['restoreSystemBackup(json)', '(jsonString: string) => { success: boolean; message?: string }', 'Validates JSON structure and restores full application state with audit logging.'],
          ]
        : [
            ['performAutomaticSync()', '() => Promise<{ success: boolean; message?: string }>', 'Moteur d\'arrière-plan : vérifie le réseau, pousse les modifications vers Supabase et télécharge les nouveautés.'],
            ['pushAllLocalDataToSupabase()', '() => Promise<{ success: boolean; message: string }>', 'Transfère l\'intégralité des tables locales vers la base cloud PostgreSQL Supabase.'],
            ['pullAllDataFromSupabase()', '() => Promise<{ success: boolean; data?: any; message?: string }>', 'Récupère les données cloud et met à jour le stockage local pour synchroniser plusieurs terminaux.'],
            ['resetToDefaultData()', '() => Promise<void>', 'Action Développeur exclusive : remise à zéro intégrale (purge produits, clients, fournisseurs, utilisateurs non-dev, transactions, inventaires, dépenses et piste d\'audit) en conservant uniquement le compte Développeur et les paramètres système.'],
            ['exportSystemBackup()', '() => string', 'Génère un fichier de sauvegarde JSON horodaté de toutes les tables applicatives.'],
            ['restoreSystemBackup(json)', '(jsonString: string) => { success: boolean; message?: string }', 'Vérifie l\'intégrité du fichier JSON et restaure la base complète avec consignation dans l\'audit.'],
          ],
    },
  ];

  appFunctionsBilingual.forEach(cat => {
    if (curY > pageHeight - 32) {
      addPageWithHeader(isEn ? 'Chapter 12: Code Functions (Continued)' : 'Chapitre 12 : Fonctions Code (Suite)');
      curY = 19;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryDark);
    doc.text(cat.category, margin, curY);
    curY += 2.5;

    autoTable(doc, {
      startY: curY,
      head: isEn
        ? [['Function', 'TypeScript Signature', 'Operational Logic & Algorithm']]
        : [['Fonction', 'Signature TypeScript', 'Description Opérationnelle & Algorithme']],
      body: cat.funcs,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 6.8 },
      bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore
    curY = (doc as any).lastAutoTable.finalY + 6;
  });

  // ----------------------------------------------------
  // RUNNING PAGE NUMBERS ACROSS ALL PAGES
  // ----------------------------------------------------
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateMuted);
    doc.text(
      isEn
        ? `SCOOPS BIR - SAA | Provenda ERP & POS Official Documentation — Page ${i} of ${totalPages}`
        : `SCOOPS BIR - SAA | Documentation Officielle Provenda ERP & POS — Page ${i} sur ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
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
