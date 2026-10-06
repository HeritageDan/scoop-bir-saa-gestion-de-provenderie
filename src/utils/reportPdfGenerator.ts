import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Expense, Invoice, Product, Purchase, SalesPoint, User } from '../types';
import { isDateInRange, formatHumanDateRange } from './dateFilterUtils';
import { formatFCFA, formatDate, formatNumber } from './formatters';

// Common Palette for Provenda Reports
const PRIMARY_COLOR: [number, number, number] = [6, 95, 70]; // Emerald 800
const SECONDARY_COLOR: [number, number, number] = [15, 23, 42]; // Slate 900
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // Slate 500

function addReportHeaderToDoc(
  doc: jsPDF,
  title: string,
  startDate: string,
  endDate: string,
  settings: CompanySettings,
  salesPoint: SalesPoint | null,
  currentUser: User,
  language: 'fr' | 'en' = 'fr'
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Top banner line
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(margin, 12, pageWidth - margin * 2, 2.5, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(settings.name || 'PROVENDA', margin, 22);

  // Legal & Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SECONDARY_COLOR);
  const locationText = `${salesPoint?.name ? salesPoint.name + ' — ' : ''}${salesPoint?.address || settings.address || 'Douala'}`;
  doc.text(locationText, margin, 27);

  const contactText = `Tél: ${salesPoint?.phone || settings.phone1 || '+237 699 00 11 22'}  |  Email: ${settings.email || 'contact@provenda.net'}  |  NIF: ${settings.taxId || 'M12000000000X'}`;
  doc.text(contactText, margin, 31.5);

  // Metadata block (top right)
  const now = new Date();
  const dateStr = now.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toTimeString().slice(0, 5);

  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Édité le : ${dateStr} à ${timeStr}`, pageWidth - margin, 22, { align: 'right' });
  doc.text(`Par : ${currentUser.name} (${currentUser.role})`, pageWidth - margin, 26.5, { align: 'right' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 35, pageWidth - margin, 35);

  // Title & Period Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(title, margin, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY_COLOR);
  const periodText = formatHumanDateRange(startDate, endDate, language);
  doc.text(`Période : ${periodText}`, margin, 47);

  return 52; // Return next Y position
}

function addReportFooterToDoc(doc: jsPDF, language: 'fr' | 'en' = 'fr') {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Provenda Management System • Logiciel Certifié de Gestion de Provenderie', margin, pageHeight - 9);
    doc.text(`Page ${i} sur ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }
}

/**
 * 1. Generate Sales Report PDF
 */
export function generateSalesReportPDF(
  invoices: Invoice[],
  startDate: string,
  endDate: string,
  settings: CompanySettings,
  salesPoint: SalesPoint | null,
  currentUser: User,
  language: 'fr' | 'en' = 'fr'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    'JOURNAL DÉTAILLÉ DES VENTES & ENCAISSEMENTS',
    startDate,
    endDate,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const filtered = invoices.filter(
    inv => inv.status !== 'annulée' && isDateInRange(inv.date, startDate, endDate)
  );

  const grossSales = filtered.reduce((s, i) => s + i.subtotalGross, 0);
  const totalDiscounts = filtered.reduce((s, i) => s + i.totalDiscount, 0);
  const netSales = filtered.reduce((s, i) => s + i.totalNet, 0);

  const tableBody = filtered.map(inv => {
    const itemsSummary = inv.items
      .map(it => `${it.productName} (${it.quantity} ${it.unit})`)
      .join(', ');
    return [
      `${formatDate(inv.date)}\n${inv.time || ''}`,
      inv.number,
      inv.customerName,
      itemsSummary,
      formatNumber(inv.subtotalGross),
      inv.totalDiscount > 0 ? `-${formatNumber(inv.totalDiscount)}` : '0',
      formatNumber(inv.totalNet),
      inv.payments && inv.payments.length > 0 ? inv.payments[0].method : 'Crédit',
      inv.status,
    ];
  });

  autoTable(doc, {
    startY,
    head: [['Date', 'N° Facture', 'Client', 'Articles', 'Brut', 'Remise', 'Net (FCFA)', 'Paiement', 'Statut']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 42 },
      4: { halign: 'right', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 15 },
      6: { halign: 'right', cellWidth: 18, fontStyle: 'bold' },
      7: { cellWidth: 18 },
      8: { halign: 'center', cellWidth: 14 },
    },
    foot: [
      [
        { content: 'TOTAUX PÉRIODE :', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatNumber(grossSales), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `-${formatNumber(totalDiscounts)}`, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatFCFA(netSales), styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245] } },
        { content: `${filtered.length} factures`, colSpan: 2, styles: { halign: 'center', fontSize: 7 } },
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
  });

  addReportFooterToDoc(doc, language);
  doc.save(`rapport_ventes_${startDate}_${endDate}.pdf`);
}

/**
 * 2. Generate Financial Report PDF
 */
export function generateFinancialReportPDF(
  invoices: Invoice[],
  purchases: Purchase[],
  expenses: Expense[],
  products: Product[],
  startDate: string,
  endDate: string,
  settings: CompanySettings,
  salesPoint: SalesPoint | null,
  currentUser: User,
  language: 'fr' | 'en' = 'fr'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    'ÉTAT FINANCIER & COMPTE D\'EXPLOITATION ANALYTIQUE',
    startDate,
    endDate,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const validInvoices = invoices.filter(
    inv => inv.status !== 'annulée' && isDateInRange(inv.date, startDate, endDate)
  );
  const totalGross = validInvoices.reduce((s, i) => s + i.subtotalGross, 0);
  const totalDiscounts = validInvoices.reduce((s, i) => s + i.totalDiscount, 0);
  const totalNet = validInvoices.reduce((s, i) => s + i.totalNet, 0);
  const totalCOGS = validInvoices.reduce((s, i) => s + i.totalCostOfGoodsSold, 0);
  const grossProfit = totalNet - totalCOGS;

  const validExpenses = expenses.filter(e => isDateInRange(e.date, startDate, endDate));
  const totalExpenses = validExpenses.reduce((s, e) => s + e.amount, 0);
  const netIncome = grossProfit - totalExpenses;

  // Master Income Statement Table
  autoTable(doc, {
    startY,
    head: [['Poste Comptable & Analytique', 'Montant (FCFA)', 'Observations']],
    body: [
      ['Chiffre d\'Affaires Brut', formatFCFA(totalGross), `${validInvoices.length} factures émises`],
      ['- Remises & Rabais commerciaux accordés', `-${formatFCFA(totalDiscounts)}`, 'Plafonnement RBAC'],
      ['= Chiffre d\'Affaires Net Commercial', formatFCFA(totalNet), 'Base nette taxable'],
      ['- Coût des Marchandises Vendues (CMV au CMP)', `-${formatFCFA(totalCOGS)}`, 'Valorisation sorties au CMP'],
      ['= Marge Brute sur Marchandises', `+${formatFCFA(grossProfit)}`, `${totalNet > 0 ? ((grossProfit / totalNet) * 100).toFixed(1) : 0}% du CA Net`],
      ['- Charges Opérationnelles d\'Exploitation', `-${formatFCFA(totalExpenses)}`, `${validExpenses.length} décaissements saisis`],
      ['= RÉSULTAT NET D\'EXPLOITATION', `${netIncome >= 0 ? '+' : ''}${formatFCFA(netIncome)}`, netIncome >= 0 ? 'BÉNÉFICE D\'EXPLOITATION' : 'DÉFICIT D\'EXPLOITATION'],
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
      2: { cellWidth: 45, textColor: TEXT_MUTED },
    },
  });

  addReportFooterToDoc(doc, language);
  doc.save(`rapport_financier_${startDate}_${endDate}.pdf`);
}

/**
 * 3. Generate Inventory Report PDF
 */
export function generateInventoryReportPDF(
  products: Product[],
  categoryFilter: string,
  settings: CompanySettings,
  salesPoint: SalesPoint | null,
  currentUser: User,
  language: 'fr' | 'en' = 'fr'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const todayStr = new Date().toISOString().slice(0, 10);
  const startY = addReportHeaderToDoc(
    doc,
    'ÉTAT DU STOCK PHYSIQUE & VALORISATION ACTIF (CMP)',
    todayStr,
    todayStr,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const filtered = products.filter(p => {
    if (p.status === 'archivé') return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  const totalValuation = filtered.reduce((s, p) => s + p.stockCurrentBaseUnit * p.cmp, 0);

  const tableBody = filtered.map(p => [
    p.code,
    p.name,
    p.category,
    `${formatNumber(p.stockCurrentBaseUnit)} ${p.baseUnit}`,
    formatNumber(p.cmp),
    formatNumber(p.salePrice),
    formatFCFA(p.stockCurrentBaseUnit * p.cmp),
    `${p.minAlertThresholdBaseUnit} ${p.baseUnit}`,
    p.stockCurrentBaseUnit <= 0 ? 'RUPTURE' : p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit ? 'ALERTE' : 'NORMAL',
  ]);

  autoTable(doc, {
    startY,
    head: [['Code', 'Article', 'Catégorie', 'Stock Dispo', 'CMP (U)', 'Prix Vente', 'Valeur Actif', 'Seuil', 'État']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 28 },
      3: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 14 },
      8: { halign: 'center', cellWidth: 16 },
    },
    foot: [
      [
        { content: 'VALEUR TOTALE DU STOCK (CMP) :', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatFCFA(totalValuation), styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245] } },
        { content: `${filtered.length} articles`, colSpan: 2, styles: { halign: 'center', fontSize: 7 } },
      ],
    ],
  });

  addReportFooterToDoc(doc, language);
  doc.save(`inventaire_stock_cmp_${todayStr}.pdf`);
}

/**
 * 4. Generate Purchase Report PDF
 */
export function generatePurchaseReportPDF(
  purchases: Purchase[],
  startDate: string,
  endDate: string,
  settings: CompanySettings,
  salesPoint: SalesPoint | null,
  currentUser: User,
  language: 'fr' | 'en' = 'fr'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    'JOURNAL DES APPROVISIONNEMENTS & ACHATS FOURNISSEURS',
    startDate,
    endDate,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const filtered = purchases.filter(p => {
    const d = p.receptionDate || p.orderDate;
    return isDateInRange(d, startDate, endDate);
  });

  const totalAmount = filtered.reduce((s, p) => s + p.totalAmount, 0);

  const tableBody = filtered.map(p => {
    const items = p.items.map(it => `${it.productName} (${it.quantityReceived} ${it.unit})`).join(', ');
    return [
      p.referenceNumber,
      formatDate(p.receptionDate || p.orderDate),
      `${p.supplierName} (${p.supplierDocumentRef || '—'})`,
      items,
      formatNumber(p.subtotal),
      p.transportFees > 0 ? `+${formatNumber(p.transportFees)}` : '0',
      formatFCFA(p.totalAmount),
      p.status,
    ];
  });

  autoTable(doc, {
    startY,
    head: [['Réf Bon', 'Date', 'Fournisseur & BL', 'Articles', 'Sous-total', 'Transport', 'Total TTC', 'Statut']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 20 },
      2: { cellWidth: 35 },
      3: { cellWidth: 42 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 15 },
    },
    foot: [
      [
        { content: 'TOTAL ACHATS :', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatFCFA(totalAmount), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `${filtered.length} bons`, styles: { halign: 'center', fontSize: 7 } },
      ],
    ],
  });

  addReportFooterToDoc(doc, language);
  doc.save(`rapport_achats_${startDate}_${endDate}.pdf`);
}

/**
 * 5. Generate Expense Report PDF
 */
export function generateExpenseReportPDF(
  expenses: Expense[],
  startDate: string,
  endDate: string,
  settings: CompanySettings,
  salesPoint: SalesPoint | null,
  currentUser: User,
  language: 'fr' | 'en' = 'fr'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    'JOURNAL DÉTAILLÉ DES DÉPENSES D\'EXPLOITATION',
    startDate,
    endDate,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const filtered = expenses.filter(e => isDateInRange(e.date, startDate, endDate));
  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  const tableBody = filtered.map(e => [
    e.referenceNumber,
    formatDate(e.date),
    e.category,
    e.description,
    formatFCFA(e.amount),
    e.paymentMethod,
    e.recordedBy,
    e.receiptReference || '—',
  ]);

  autoTable(doc, {
    startY,
    head: [['Réf', 'Date', 'Catégorie', 'Description', 'Montant', 'Règlement', 'Auteur', 'Pièce Justif']],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold' }, // Rose 900
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold' },
      1: { cellWidth: 20 },
      2: { cellWidth: 35 },
      3: { cellWidth: 45 },
      4: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
      7: { cellWidth: 18 },
    },
    foot: [
      [
        { content: 'TOTAL DÉPENSES :', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatFCFA(totalAmount), styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 241, 242] } },
        { content: `${filtered.length} écriture(s)`, colSpan: 3, styles: { halign: 'center', fontSize: 7 } },
      ],
    ],
  });

  addReportFooterToDoc(doc, language);
  doc.save(`rapport_depenses_${startDate}_${endDate}.pdf`);
}
