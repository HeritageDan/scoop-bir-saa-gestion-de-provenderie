import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Expense, Invoice, Product, Purchase, SalesPoint, User } from '../types';
import { isDateInRange, formatHumanDateRange } from './dateFilterUtils';
import { formatFCFA, formatDate, formatNumber, formatUnit } from './formatters';
import { DEFAULT_APP_LOGO } from '../config/defaultLogo';

// Common Palette for SCOOPS BIR SAA Reports
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
  const isEn = language === 'en';
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // Top banner line
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(margin, 10, pageWidth - margin * 2, 2.5, 'F');

  // Logo rendering
  const logo = settings.logoUrl || DEFAULT_APP_LOGO;
  const logoX = margin;
  const logoY = 15;
  const logoWidth = 18;
  const logoHeight = 18;
  let textX = margin;

  if (logo) {
    try {
      // Subtle neat rounded frame for the logo
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 1.5, 1.5, 'FD');

      const format = typeof logo === 'string' && (logo.includes('image/jpeg') || logo.includes('image/jpg')) ? 'JPEG' : 'PNG';
      doc.addImage(logo, format, logoX + 1, logoY + 1, logoWidth - 2, logoHeight - 2);
      textX = margin + logoWidth + 4;
    } catch (e) {
      console.warn('Report header logo embedding skipped:', e);
      textX = margin;
    }
  }

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...PRIMARY_COLOR);
  const companyName = settings.name || 'SCOOPS BIR SAA';
  doc.text(companyName, textX, 20.5);

  // Legal Status Tag
  const legalStatus = settings.legalStatus || 'PROVENDERIE';
  const nameWidth = doc.getTextWidth(companyName);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(legalStatus) + 4;
  if (textX + nameWidth + 3 + badgeWidth < pageWidth - margin - 45) {
    doc.setFillColor(209, 250, 229);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(textX + nameWidth + 3, 16.8, badgeWidth, 4.5, 1, 1, 'FD');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(legalStatus, textX + nameWidth + 5, 20.2);
  }

  // Legal & Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SECONDARY_COLOR);
  const locationText = `${salesPoint?.name ? salesPoint.name + ' — ' : ''}${salesPoint?.address || settings.address || 'Zone Industrielle Bassa, Douala'}`;
  doc.text(locationText, textX, 25.5);

  const contactText = `${isEn ? 'Phone' : 'Tél'}: ${salesPoint?.phone || settings.phone1 || '+237 699 00 11 22'}  |  Email: ${settings.email || 'contact@scoops-bir-saa.cm'}  |  NIF: ${settings.taxId || 'M082612345678P'}  |  RCCM: ${settings.tradeRegisterNumber || 'RC/DLA/2026/B/100'}`;
  doc.setFontSize(7.2);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(contactText, textX, 29.8);

  // Metadata block (top right)
  const now = new Date();
  const dateStr = now.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toTimeString().slice(0, 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(isEn ? 'OFFICIAL BUSINESS REPORT' : 'DOCUMENT DE GESTION OFFICIEL', pageWidth - margin, 18.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${isEn ? 'Issued:' : 'Édité le :'} ${dateStr} ${isEn ? 'at' : 'à'} ${timeStr}`, pageWidth - margin, 23.5, { align: 'right' });
  doc.text(`${isEn ? 'By:' : 'Par :'} ${currentUser.name} (${currentUser.role})`, pageWidth - margin, 28, { align: 'right' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 36.5, pageWidth - margin, 36.5);

  // Title & Period Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...SECONDARY_COLOR);
  doc.text(title, margin, 43.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_COLOR);
  const periodText = formatHumanDateRange(startDate, endDate, language);
  doc.text(`${isEn ? 'Selected Period:' : 'Période d\'analyse :'} ${periodText}`, margin, 48.5);

  return 53; // Return next Y position
}

function addSignaturesToDoc(doc: jsPDF, startY: number, language: 'fr' | 'en' = 'fr') {
  const isEn = language === 'en';
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const boxWidth = (pageWidth - margin * 2 - 10) / 2;

  let sigY = startY;
  if (sigY + 30 > pageHeight - 16) {
    doc.addPage();
    sigY = 20;
  }

  // Box 1: Caissier
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, sigY, boxWidth, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(isEn ? 'PREPARED BY / CASHIER' : 'ÉTABLI PAR / LE CAISSIER', margin + boxWidth / 2, sigY + 6.5, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(isEn ? 'Date, stamp & signature' : 'Date, visa & signature', margin + boxWidth / 2, sigY + 19.5, { align: 'center' });

  // Box 2: Responsable d'Exploitation
  const rightBoxX = margin + boxWidth + 10;
  doc.roundedRect(rightBoxX, sigY, boxWidth, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(isEn ? 'VERIFIED BY / STORE MANAGER' : 'VÉRIFIÉ PAR / LE RESPONSABLE D\'EXPLOITATION', rightBoxX + boxWidth / 2, sigY + 6.5, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(isEn ? 'Date, stamp & signature' : 'Date, visa & signature', rightBoxX + boxWidth / 2, sigY + 19.5, { align: 'center' });
}

function addReportFooterToDoc(doc: jsPDF, language: 'fr' | 'en' = 'fr') {
  const isEn = language === 'en';
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      isEn
        ? 'SCOOPS BIR SAA • Integrated Feed Mill Management System'
        : 'SCOOPS BIR SAA • Système Intégré de Gestion de Provenderie',
      margin,
      pageHeight - 9
    );
    doc.text(
      isEn ? `Page ${i} of ${pageCount}` : `Page ${i} sur ${pageCount}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: 'right' }
    );
  }
}

/**
 * 1. Generate Sales Report PDF (Includes SYNTHÈSE COMMERCIALE & RÉCAPITULATIF DE CAISSE + EXPENSES + SIGNATURES)
 */
export function generateSalesReportPDF(
  invoices: Invoice[],
  startDate: string,
  endDate: string,
  settings: CompanySettings,
  salesPoint: SalesPoint | null,
  currentUser: User,
  language: 'fr' | 'en' = 'fr',
  expenses: Expense[] = []
) {
  const isEn = language === 'en';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    isEn ? 'SALES & CASH RECEIPTS DETAILED REPORT' : 'JOURNAL DÉTAILLÉ DES VENTES & ENCAISSEMENTS',
    startDate,
    endDate,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const filtered = invoices
    .filter(inv => inv.status !== 'annulée' && isDateInRange(inv.date, startDate, endDate))
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return timeB - timeA;
    });

  const transactionCount = filtered.length;
  const grossSales = filtered.reduce((s, i) => s + i.subtotalGross, 0);
  const totalDiscounts = filtered.reduce((s, i) => s + i.totalDiscount, 0);
  const netSales = filtered.reduce((s, i) => s + i.totalNet, 0);
  const totalCOGS = filtered.reduce((s, i) => s + i.totalCostOfGoodsSold, 0);
  const totalGrossMargin = netSales - totalCOGS;
  const marginRateSales = netSales > 0 ? (totalGrossMargin / netSales) * 100 : 0;
  const avgBasket = transactionCount > 0 ? Math.round(netSales / transactionCount) : 0;

  let totalQtySold = 0;
  filtered.forEach(inv => {
    inv.items.forEach(item => {
      totalQtySold += item.quantity;
    });
  });

  let cashSales = 0;
  let mobileSales = 0;
  let bankSales = 0;
  let remainingCredit = 0;

  filtered.forEach(inv => {
    (inv.payments || []).forEach(p => {
      if (p.method === 'espèces') cashSales += p.amount;
      else if (p.method === 'paiement mobile') mobileSales += p.amount;
      else if (p.method === 'virement') bankSales += p.amount;
    });
    if (inv.remainingBalance > 0) {
      remainingCredit += inv.remainingBalance;
    }
  });

  // Period Expenses accounting
  const validExpenses = (expenses || []).filter(e => isDateInRange(e.date, startDate, endDate));
  const totalExpenses = validExpenses.reduce((s, e) => s + e.amount, 0);
  const netOperatingIncome = totalGrossMargin - totalExpenses;
  const netCashInTill = cashSales - totalExpenses;

  // Table Body mapping
  const tableBody = filtered.map(inv => {
    const itemsSummary = inv.items
      .map(it => `${it.productName} (${it.quantity} ${it.unit})`)
      .join(', ');

    let paymentMethod = isEn ? 'Credit' : 'Crédit';
    if (inv.payments && inv.payments.length > 0) {
      const pm = inv.payments[0].method;
      if (pm === 'espèces') paymentMethod = isEn ? 'Cash' : 'Espèces';
      else if (pm === 'paiement mobile') paymentMethod = isEn ? 'Mobile' : 'Mobile';
      else if (pm === 'virement') paymentMethod = isEn ? 'Transfer' : 'Virement';
      else paymentMethod = pm;
    }

    let statusLabel = inv.status;
    if (inv.status === 'payée') statusLabel = isEn ? 'Paid' : 'Payée';
    else if (inv.status === 'partielle') statusLabel = isEn ? 'Partial' : 'Partielle';
    else if (inv.status === 'en_attente') statusLabel = isEn ? 'Pending' : 'En attente';

    return [
      `${formatDate(inv.date)}\n${inv.time || ''}`,
      inv.number,
      inv.customerName,
      itemsSummary,
      formatNumber(inv.subtotalGross),
      inv.totalDiscount > 0 ? `-${formatNumber(inv.totalDiscount)}` : '0',
      formatNumber(inv.totalNet),
      paymentMethod,
      statusLabel,
    ];
  });

  autoTable(doc, {
    startY,
    margin: { left: 10, right: 10 },
    head: [
      isEn
        ? ['Date / Time', 'Invoice #', 'Customer', 'Items & Qty', 'Gross', 'Discount', 'Net (FCFA)', 'Payment', 'Status']
        : ['Date / Heure', 'N° Facture', 'Client', 'Articles & Qté', 'Brut', 'Remise', 'Net (FCFA)', 'Règlement', 'Statut'],
    ],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 42 },
      4: { halign: 'right', cellWidth: 17 },
      5: { halign: 'right', cellWidth: 15 },
      6: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      7: { cellWidth: 14 },
      8: { halign: 'center', cellWidth: 12 },
    },
    foot: [
      [
        { content: isEn ? 'PERIOD TOTALS:' : 'TOTAUX PÉRIODE :', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: formatNumber(grossSales), styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: totalDiscounts > 0 ? `-${formatNumber(totalDiscounts)}` : '0', styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: formatFCFA(netSales), styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: isEn ? `${filtered.length} invoices` : `${filtered.length} factures`, colSpan: 2, styles: { halign: 'center', fontSize: 7, textColor: [71, 85, 105] } },
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  // Section 2: SYNTHÈSE COMMERCIALE & RÉCAPITULATIF DE CAISSE (WITH EXPENSES)
  let currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 50;
  if (currentY + 85 > doc.internal.pageSize.getHeight() - 25) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PRIMARY_COLOR);
  const summaryTitle = isEn
    ? 'SALES & FINANCIAL PERFORMANCE SUMMARY (CASH & EXPENSES RECAP)'
    : 'SYNTHÈSE COMMERCIALE & RÉCAPITULATIF DE CAISSE';
  doc.text(summaryTitle, 10, currentY);
  currentY += 3.5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    head: [[
      isEn ? "Activity Volumes" : "Volumes d'Activité",
      isEn ? "Turnover (Sales)" : "Chiffre d'Affaires",
      isEn ? "Profitability & Operations" : "Rentabilité & Exploitation",
      isEn ? "Actual Cash Flow & Till" : "Encaissements & Caisse"
    ]],
    body: [
      [
        `${isEn ? 'Transactions' : 'Transactions'} : ${transactionCount}`,
        `${isEn ? 'Gross Total' : 'Total Brut'} : ${formatFCFA(grossSales)}`,
        `${isEn ? 'Cost of Goods (CMV)' : 'Coût revient (CMV)'} : ${formatFCFA(totalCOGS)}`,
        `${isEn ? 'Cash Receipts' : 'Espèces'} : ${formatFCFA(cashSales)}`,
      ],
      [
        `${isEn ? 'Total units sold' : 'Total unités vendues'} : ${formatNumber(totalQtySold)}`,
        `${isEn ? 'Total Discounts' : 'Total Remises'} : -${formatFCFA(totalDiscounts)}`,
        `${isEn ? 'Gross Margin' : 'Marge Brute'} : +${formatFCFA(totalGrossMargin)}`,
        `${isEn ? 'Mobile Money' : 'Paiement Mobile'} : ${formatFCFA(mobileSales)}`,
      ],
      [
        `${isEn ? 'Average basket' : 'Panier moyen'} : ${formatFCFA(avgBasket)}`,
        `${isEn ? 'Net Commercial' : 'Net Commercial'} : ${formatFCFA(netSales)}`,
        `${isEn ? 'Margin Rate' : 'Taux de marque'} : ${marginRateSales.toFixed(1)}%`,
        `${isEn ? 'Bank Transfers' : 'Virements'} : ${formatFCFA(bankSales)}`,
      ],
      [
        ``,
        ``,
        `${isEn ? 'Period Expenses' : 'Dépenses Période'} : -${formatFCFA(totalExpenses)}`,
        `${isEn ? 'Credit / Balance due' : 'Crédits / Solde dû'} : ${formatFCFA(remainingCredit)}`,
      ],
      [
        ``,
        ``,
        `${isEn ? 'Net Operating Profit' : 'Résultat Net Exploit.'} : ${netOperatingIncome >= 0 ? '+' : ''}${formatFCFA(netOperatingIncome)}`,
        `${isEn ? 'Net Cash in Till' : 'Solde Net Caisse'} : ${formatFCFA(netCashInTill)}`,
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [15, 23, 42] },
    headStyles: { fillColor: SECONDARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 47 },
      1: { cellWidth: 47 },
      2: { cellWidth: 48, fontStyle: 'bold' },
      3: { cellWidth: 48, fontStyle: 'bold' },
    },
  });

  // Section 3: Official Signatures Footer Block
  const sigStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : currentY + 45;
  addSignaturesToDoc(doc, sigStartY, language);

  addReportFooterToDoc(doc, language);
  doc.save(`rapport_ventes_${startDate}_${endDate}.pdf`);
}

/**
 * 2. Generate Financial Report PDF (Income Statement + Category breakdowns + Signatures)
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
  const isEn = language === 'en';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    isEn ? 'EXECUTIVE FINANCIAL & PROFITABILITY REPORT' : 'ÉTAT FINANCIER & COMPTE D\'EXPLOITATION ANALYTIQUE',
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
    margin: { left: 10, right: 10 },
    head: [
      isEn
        ? ['Accounting / Analytical Item', 'Amount (FCFA)', 'Observations']
        : ['Poste Comptable & Analytique', 'Montant (FCFA)', 'Observations'],
    ],
    body: [
      [
        isEn ? 'Gross Sales Turnover' : 'Chiffre d\'Affaires Brut',
        formatFCFA(totalGross),
        isEn ? `${validInvoices.length} invoices issued` : `${validInvoices.length} factures émises`,
      ],
      [
        isEn ? '- Commercial rebates & discounts' : '- Remises & Rabais commerciaux accordés',
        `-${formatFCFA(totalDiscounts)}`,
        isEn ? 'Strict role cap' : 'Plafonnement RBAC',
      ],
      [
        isEn ? '= Net Commercial Sales' : '= Chiffre d\'Affaires Net Commercial',
        formatFCFA(totalNet),
        isEn ? 'Taxable basis' : 'Base nette taxable',
      ],
      [
        isEn ? '- Cost of Goods Sold (CMP / COGS)' : '- Coût des Marchandises Vendues (CMV au CMP)',
        `-${formatFCFA(totalCOGS)}`,
        isEn ? 'Outputs valued at CMP' : 'Valorisation sorties au CMP',
      ],
      [
        isEn ? '= Gross Margin on Merchandise' : '= Marge Brute sur Marchandises',
        `+${formatFCFA(grossProfit)}`,
        `${totalNet > 0 ? ((grossProfit / totalNet) * 100).toFixed(1) : 0}% ${isEn ? 'of Net Sales' : 'du CA Net'}`,
      ],
      [
        isEn ? '- Operational Operating Charges (Expenses)' : '- Charges Opérationnelles d\'Exploitation',
        `-${formatFCFA(totalExpenses)}`,
        isEn ? `${validExpenses.length} entries recorded` : `${validExpenses.length} décaissements saisis`,
      ],
      [
        isEn ? '= NET OPERATING INCOME' : '= RÉSULTAT NET D\'EXPLOITATION',
        `${netIncome >= 0 ? '+' : ''}${formatFCFA(netIncome)}`,
        netIncome >= 0 ? (isEn ? 'OPERATING PROFIT' : 'BÉNÉFICE D\'EXPLOITATION') : (isEn ? 'OPERATING DEFICIT' : 'DÉFICIT D\'EXPLOITATION'),
      ],
    ],
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
      2: { cellWidth: 45, textColor: TEXT_MUTED },
    },
  });

  const sigStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 60;
  addSignaturesToDoc(doc, sigStartY, language);

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
  const isEn = language === 'en';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const todayStr = new Date().toISOString().slice(0, 10);
  const startY = addReportHeaderToDoc(
    doc,
    isEn ? 'PHYSICAL STOCK INVENTORY & CMP VALUATION' : 'ÉTAT DU STOCK PHYSIQUE & VALORISATION ACTIF (CMP)',
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

  const tableBody = filtered.map(p => {
    let stateLabel = 'NORMAL';
    if (p.stockCurrentBaseUnit <= 0) stateLabel = isEn ? 'STOCKOUT' : 'RUPTURE';
    else if (p.stockCurrentBaseUnit <= p.minAlertThresholdBaseUnit) stateLabel = isEn ? 'ALERT' : 'ALERTE';

    return [
      p.code,
      p.name,
      p.category,
      `${formatNumber(p.stockCurrentBaseUnit)} ${formatUnit(p.baseUnit)}`,
      formatNumber(p.cmp),
      formatNumber(p.salePrice),
      formatFCFA(p.stockCurrentBaseUnit * p.cmp),
      `${formatNumber(p.minAlertThresholdBaseUnit)} ${formatUnit(p.baseUnit)}`,
      stateLabel,
    ];
  });

  autoTable(doc, {
    startY,
    margin: { left: 10, right: 10 },
    head: [
      isEn
        ? ['Code', 'Product', 'Category', 'Stock Avail.', 'CMP (U)', 'Sale Price', 'CMP Asset Value', 'Min Alert', 'Status']
        : ['Code', 'Article', 'Catégorie', 'Stock Dispo', 'CMP (U)', 'Prix Vente', 'Valeur Actif', 'Seuil', 'État'],
    ],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 38 },
      2: { cellWidth: 25 },
      3: { halign: 'right', cellWidth: 19, fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 15 },
      6: { halign: 'right', cellWidth: 23, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 18 },
    },
    foot: [
      [
        { content: isEn ? 'TOTAL INVENTORY VALUE (CMP):' : 'VALEUR TOTALE DU STOCK (CMP) :', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: formatFCFA(totalValuation), styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: isEn ? `${filtered.length} items` : `${filtered.length} articles`, colSpan: 2, styles: { halign: 'center', fontSize: 7, textColor: [71, 85, 105] } },
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  const sigStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 60;
  addSignaturesToDoc(doc, sigStartY, language);

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
  const isEn = language === 'en';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    isEn ? 'SUPPLIER PURCHASES & PROCUREMENT JOURNAL' : 'JOURNAL DES APPROVISIONNEMENTS & ACHATS FOURNISSEURS',
    startDate,
    endDate,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const filtered = purchases
    .filter(p => {
      const d = p.receptionDate || p.orderDate;
      return isDateInRange(d, startDate, endDate);
    })
    .sort((a, b) => {
      const timeA = new Date(a.receptionDate || a.orderDate).getTime();
      const timeB = new Date(b.receptionDate || b.orderDate).getTime();
      return timeB - timeA;
    });

  const totalAmount = filtered.reduce((s, p) => s + p.totalAmount, 0);

  const tableBody = filtered.map(p => {
    const items = p.items.map(it => `${it.productName} (${it.quantityReceived} ${it.unit})`).join(', ');
    let statusLabel = p.status;
    if (p.status === 'validé') statusLabel = isEn ? 'Validated' : 'Validé';
    else if (p.status === 'brouillon') statusLabel = isEn ? 'Draft' : 'Brouillon';

    return [
      p.referenceNumber,
      formatDate(p.receptionDate || p.orderDate),
      `${p.supplierName} (${p.supplierDocumentRef || '—'})`,
      items,
      formatNumber(p.subtotal),
      p.transportFees > 0 ? `+${formatNumber(p.transportFees)}` : '0',
      formatFCFA(p.totalAmount),
      statusLabel,
    ];
  });

  autoTable(doc, {
    startY,
    margin: { left: 10, right: 10 },
    head: [
      isEn
        ? ['PO Ref', 'Date', 'Supplier & Note', 'Items & Qty', 'Subtotal', 'Transport', 'Total Net (FCFA)', 'Status']
        : ['Réf Bon', 'Date', 'Fournisseur & BL', 'Articles & Qté', 'Sous-total', 'Transport', 'Total TTC', 'Statut'],
    ],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 18 },
      2: { cellWidth: 32 },
      3: { cellWidth: 42 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 16 },
    },
    foot: [
      [
        { content: isEn ? 'TOTAL PURCHASES:' : 'TOTAL ACHATS :', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: formatFCFA(totalAmount), styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: isEn ? `${filtered.length} orders` : `${filtered.length} bons`, styles: { halign: 'center', fontSize: 7, textColor: [71, 85, 105] } },
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  const sigStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 60;
  addSignaturesToDoc(doc, sigStartY, language);

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
  const isEn = language === 'en';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addReportHeaderToDoc(
    doc,
    isEn ? 'DETAILED OPERATING EXPENSES JOURNAL' : 'JOURNAL DÉTAILLÉ DES DÉPENSES D\'EXPLOITATION',
    startDate,
    endDate,
    settings,
    salesPoint,
    currentUser,
    language
  );

  const filtered = expenses
    .filter(e => isDateInRange(e.date, startDate, endDate))
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });
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
    margin: { left: 10, right: 10 },
    head: [
      isEn
        ? ['Ref', 'Date', 'Category', 'Description', 'Amount', 'Payment', 'Recorded by', 'Receipt Ref']
        : ['Réf', 'Date', 'Catégorie', 'Description', 'Montant', 'Règlement', 'Auteur', 'Pièce Justif'],
    ],
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold', fontSize: 7.5 }, // Rose 900
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 18 },
      2: { cellWidth: 26 },
      3: { cellWidth: 44 },
      4: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
    },
    foot: [
      [
        { content: isEn ? 'TOTAL EXPENSES:' : 'TOTAL DÉPENSES :', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: formatFCFA(totalAmount), styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: isEn ? `${filtered.length} entries` : `${filtered.length} écriture(s)`, colSpan: 3, styles: { halign: 'center', fontSize: 7, textColor: [71, 85, 105] } },
      ],
    ],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  const sigStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : startY + 60;
  addSignaturesToDoc(doc, sigStartY, language);

  addReportFooterToDoc(doc, language);
  doc.save(`rapport_depenses_${startDate}_${endDate}.pdf`);
}
