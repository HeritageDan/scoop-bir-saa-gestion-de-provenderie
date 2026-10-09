/**
 * SCOOPS BIR SAA - Thermal Receipt Printing Engine
 * 
 * High-performance POS thermal printer driver supporting:
 * - 58 mm and 80 mm paper formats
 * - Windows spooler, USB and Network thermal receipt printers
 * - Native desktop bridge (Tauri) & offline isolated iframe printing
 * - Complete transaction safety (sale saved before printing attempt)
 */

import { Invoice, ReceiptPrinterConfig, ReceiptPaperWidth, CompanySettings } from '../types';
import { formatFCFA, formatDate, formatDateTime } from '../utils/formatters';
import { DEFAULT_APP_LOGO } from '../config/defaultLogo';

export const DEFAULT_PRINTER_CONFIG: ReceiptPrinterConfig = {
  autoPrintOnSale: true,
  paperWidth: '80mm',
  printerName: 'Imprimante Windows par défaut',
  numberOfCopies: 1,
  headerMessage: 'SCOOPS BIR SAA — Provenderie & Élevage',
  footerMessage: 'Merci pour votre fidélité ! Aliments de qualité supérieure pour volailles, porcs et bétail.',
  showBarcode: true,
  showLogo: true,
  soundBeepOnPrint: true,
};

const STORAGE_KEY = 'coops_receipt_printer_config';

/**
 * Loads current thermal receipt printer configuration from local storage
 */
export const getPrinterConfig = (): ReceiptPrinterConfig => {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error reading printer config:', e);
  }
  return DEFAULT_PRINTER_CONFIG;
};

/**
 * Saves printer preferences to local storage
 */
export const savePrinterConfig = (config: ReceiptPrinterConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving printer config:', e);
  }
};

/**
 * Detects available printers (via Tauri if running natively, or Windows standard names)
 */
export const getAvailablePrinters = async (): Promise<string[]> => {
  const fallbackPrinters = [
    'Imprimante Windows par défaut',
    'POS-80 Thermal Receipt Printer',
    'POS-58 Thermal Receipt Printer',
    'EPSON TM-T20 / TM-T88 (USB/Réseau)',
    'Xprinter XP-N160I / XP-58',
    'Zijiang ZJ-58 / ZJ-80 USB',
    'Bixolon SRP-350 Thermal',
  ];

  // If running in Tauri desktop environment, query native printer plugin
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    try {
      const { invoke } = (window as any).__TAURI__.core || (window as any).__TAURI__;
      if (invoke) {
        const nativePrinters = await invoke('get_printers');
        if (Array.isArray(nativePrinters) && nativePrinters.length > 0) {
          return nativePrinters;
        }
      }
    } catch {
      // Fall back to standard list
    }
  }

  return fallbackPrinters;
};

/**
 * Generates pure thermal HTML optimized for 58mm or 80mm continuous roll
 */
export const buildThermalReceiptHtml = (
  invoice: Invoice,
  settings: CompanySettings,
  config: ReceiptPrinterConfig,
  isReprint = false
): string => {
  const is58mm = config.paperWidth === '58mm';
  const widthMm = is58mm ? '58mm' : '80mm';
  const contentWidthMm = is58mm ? '48mm' : '72mm';
  const fontSize = is58mm ? '10px' : '11px';
  const titleSize = is58mm ? '13px' : '15px';
  const subTotalGross = invoice.subtotalGross || invoice.totalNet;
  const discountTotal = invoice.totalDiscount || 0;
  const netDue = invoice.totalNet;
  const amountPaid = invoice.amountPaid || netDue;
  const changeDue = Math.max(0, amountPaid - netDue);
  const remainingDue = invoice.remainingBalance || 0;
  const isCredit = invoice.isCredit || remainingDue > 0;

  // Primary payment method
  const mainPaymentMethod = invoice.payments?.[0]?.method || (isCredit ? 'crédit client' : 'espèces');

  // Separator lines
  const sepChar = '-';
  const sepLine = is58mm ? sepChar.repeat(32) : sepChar.repeat(42);
  const doubleSepLine = is58mm ? '='.repeat(32) : '='.repeat(42);

  // Logo rendering
  const effectiveReceiptLogo = settings.logoUrl || DEFAULT_APP_LOGO;
  const logoHtml =
    config.showLogo && effectiveReceiptLogo
      ? `<div style="text-align: center; margin-bottom: 4px;">
          <img src="${effectiveReceiptLogo}" alt="${settings.name || 'SCOOPS BIR SAA'}" style="max-height: 42px; max-width: ${is58mm ? '44mm' : '65mm'}; object-fit: contain; filter: grayscale(100%) contrast(150%);" />
        </div>`
      : '';

  // Items table
  const itemsHtml = invoice.items
    .map(item => {
      const lineTotal = item.totalNet || item.quantity * item.unitPrice;
      const unitPriceFormatted = formatFCFA(item.unitPrice).replace(' FCFA', '');
      const totalFormatted = formatFCFA(lineTotal).replace(' FCFA', '');

      if (is58mm) {
        return `
          <div style="margin-bottom: 3px;">
            <div style="font-weight: bold; word-break: break-word;">${item.productName}</div>
            <div style="display: flex; justify-content: space-between; font-size: 9.5px;">
              <span>${item.quantity} ${item.unit} x ${unitPriceFormatted}</span>
              <span style="font-weight: bold;">${totalFormatted}</span>
            </div>
            ${item.discountAmount > 0 ? `<div style="font-size: 8.5px; color: #333;">Remise: -${formatFCFA(item.discountAmount)}</div>` : ''}
          </div>
        `;
      } else {
        return `
          <tr style="vertical-align: top;">
            <td style="padding: 2px 0; word-break: break-word; max-width: 36mm;">
              ${item.productName}
              ${item.discountAmount > 0 ? `<br><small style="font-size: 9px;">(Rem: -${formatFCFA(item.discountAmount)})</small>` : ''}
            </td>
            <td style="text-align: center; padding: 2px 2px;">${item.quantity}</td>
            <td style="text-align: right; padding: 2px 2px;">${unitPriceFormatted}</td>
            <td style="text-align: right; font-weight: bold; padding: 2px 0;">${totalFormatted}</td>
          </tr>
        `;
      }
    })
    .join('');

  // Barcode / QR generation code (Base64 SVG barcode fallback)
  const barcodeNumber = invoice.number.replace(/[^A-Za-z0-9]/g, '');
  const barcodeHtml = config.showBarcode
    ? `
      <div style="text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #666;">
        <div style="font-family: 'Libre Barcode 39', 'Courier New', monospace; font-size: 16px; letter-spacing: 2px;">*${barcodeNumber}*</div>
        <div style="font-size: 9px; font-family: monospace;">${invoice.number}</div>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket ${invoice.number}</title>
      <style>
        @page {
          size: ${widthMm} auto;
          margin: 0;
        }
        @media print {
          html, body {
            width: ${widthMm};
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          .receipt-container {
            width: ${contentWidthMm} !important;
            max-width: ${contentWidthMm} !important;
            margin: 0 auto !important;
            padding: 2mm 0 8mm 0 !important;
          }
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui;
          font-size: ${fontSize};
          line-height: 1.25;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-container {
          width: ${contentWidthMm};
          margin: 0 auto;
          padding: 3mm 0;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .sep {
          margin: 3px 0;
          border: none;
          border-top: 1px dashed #000;
        }
        .double-sep {
          margin: 4px 0;
          border: none;
          border-top: 2px solid #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        ${logoHtml}

        <!-- Store Header -->
        <div class="text-center">
          <div style="font-size: ${titleSize}; font-weight: 900; letter-spacing: 0.5px;">${settings.name || 'SCOOPS BIR SAA'}</div>
          ${settings.legalStatus ? `<div style="font-size: 8.5px; margin-top: 1px;">${settings.legalStatus}</div>` : ''}
          <div style="font-size: 9px; margin-top: 2px;">${settings.address || 'Bafoussam, Cameroun'}</div>
          ${settings.phone1 ? `<div style="font-size: 9px;">Tél: ${settings.phone1} ${settings.phone2 ? '/ ' + settings.phone2 : ''}</div>` : ''}
          ${settings.taxId ? `<div style="font-size: 8.5px;">NIF: ${settings.taxId} | RCCM: ${settings.tradeRegisterNumber || 'RC/BFM/2026/B/452'}</div>` : ''}
          ${invoice.salesPointName ? `<div style="font-size: 9px; font-weight: bold; margin-top: 2px;">${invoice.salesPointName}</div>` : ''}
        </div>

        <div class="double-sep"></div>

        <!-- Ticket Info -->
        <div>
          ${isReprint ? `<div class="text-center font-bold" style="font-size: 11px; padding: 1px 0; border: 1px solid #000; margin-bottom: 3px;">*** DUPLICATA / RÉIMPRESSION ***</div>` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span>TICKET N°:</span>
            <span class="font-bold">${invoice.number}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px;">
            <span>Date: ${invoice.date}</span>
            <span>Heure: ${invoice.time || '10:00'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px;">
            <span>Caissier: ${invoice.userName}</span>
            <span>Rôle: ${invoice.userRole}</span>
          </div>
          ${invoice.customerName && invoice.customerName !== 'Client Comptant'
            ? `<div style="font-size: 9.5px; margin-top: 1px;">
                <span>Client: <b>${invoice.customerName}</b></span>
                ${invoice.customerPhone ? `<span style="font-size: 8.5px;"> (${invoice.customerPhone})</span>` : ''}
              </div>`
            : `<div style="font-size: 9.5px;">Client: Comptant</div>`}
        </div>

        <div class="sep"></div>

        <!-- Items Section -->
        ${
          is58mm
            ? `<div>${itemsHtml}</div>`
            : `
            <table>
              <thead>
                <tr style="border-bottom: 1px dashed #000; font-size: 9.5px;">
                  <th style="text-align: left; padding-bottom: 2px;">Désignation</th>
                  <th style="text-align: center; padding-bottom: 2px;">Qté</th>
                  <th style="text-align: right; padding-bottom: 2px;">P.U</th>
                  <th style="text-align: right; padding-bottom: 2px;">Total</th>
                </tr>
              </thead>
              <tbody style="font-size: 10px;">
                ${itemsHtml}
              </tbody>
            </table>
          `
        }

        <div class="sep"></div>

        <!-- Financial Totals -->
        <div style="font-size: ${fontSize};">
          ${
            discountTotal > 0
              ? `
              <div style="display: flex; justify-content: space-between; font-size: 9.5px;">
                <span>Sous-total brut:</span>
                <span>${formatFCFA(subTotalGross)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9.5px;">
                <span>Remise déduite:</span>
                <span>-${formatFCFA(discountTotal)}</span>
              </div>
            `
              : ''
          }
          
          <div style="display: flex; justify-content: space-between; font-size: ${is58mm ? '12px' : '14px'}; font-weight: 900; margin: 3px 0; padding: 2px 0; border-top: 1px solid #000; border-bottom: 1px solid #000;">
            <span>NET À PAYER:</span>
            <span>${formatFCFA(netDue)}</span>
          </div>

          <!-- Payment Details -->
          <div style="font-size: 9.5px; margin-top: 2px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Règlement:</span>
              <span class="font-bold" style="text-transform: uppercase;">${mainPaymentMethod}</span>
            </div>
            
            ${
              mainPaymentMethod === 'espèces'
                ? `
                <div style="display: flex; justify-content: space-between;">
                  <span>Reçu en caisse:</span>
                  <span>${formatFCFA(amountPaid)}</span>
                </div>
                ${
                  changeDue > 0
                    ? `
                  <div style="display: flex; justify-content: space-between; font-weight: bold;">
                    <span>Monnaie rendue:</span>
                    <span>${formatFCFA(changeDue)}</span>
                  </div>
                `
                    : ''
                }
              `
                : ''
            }

            ${
              isCredit
                ? `
                <div style="display: flex; justify-content: space-between; font-weight: bold; color: #000;">
                  <span>Acompte versé:</span>
                  <span>${formatFCFA(amountPaid)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; color: #000;">
                  <span>Reste à payer (Dette):</span>
                  <span>${formatFCFA(remainingDue)}</span>
                </div>
                ${invoice.creditDueDate ? `<div style="font-size: 8.5px;">Échéance prévue: ${invoice.creditDueDate}</div>` : ''}
              `
                : ''
            }
          </div>
        </div>

        <div class="double-sep"></div>

        <!-- Footer Notice -->
        <div class="text-center" style="font-size: 8.5px; margin-top: 3px; line-height: 1.3;">
          <div>${config.footerMessage || settings.ticketFooterNotice || 'Merci de votre fidélité !'}</div>
          <div style="margin-top: 2px; font-size: 8px;">Les provendes de qualité supérieure certifiées</div>
          <div style="font-size: 7.5px; color: #444; margin-top: 2px;">SCOOPS BIR SAA POS v2.2 - Mode Hors-Ligne</div>
        </div>

        ${barcodeHtml}

        <!-- Feed paper space for cutter -->
        <div style="height: 18mm;"></div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Executes direct thermal receipt printing through an isolated DOM iframe
 */
export const printReceipt = async (
  invoice: Invoice,
  settings: CompanySettings,
  config?: ReceiptPrinterConfig,
  isReprint = false
): Promise<{ success: boolean; error?: string }> => {
  const activeConfig = config || getPrinterConfig();

  try {
    // Sound beep prompt if enabled
    if (activeConfig.soundBeepOnPrint && typeof window !== 'undefined' && (window as any).AudioContext) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => {
          osc.stop();
          audioCtx.close();
        }, 120);
      } catch {
        // Audio beep is non-blocking
      }
    }

    // Native Tauri print support (if desktop app wrapper is active)
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const { invoke } = (window as any).__TAURI__.core || (window as any).__TAURI__;
        if (invoke) {
          const rawHtml = buildThermalReceiptHtml(invoice, settings, activeConfig, isReprint);
          const result = await invoke('print_thermal_receipt', {
            html: rawHtml,
            printerName: activeConfig.printerName,
            width: activeConfig.paperWidth,
          });
          if (result && result.success !== false) {
            return { success: true };
          }
        }
      } catch (tauriErr) {
        console.warn('Native Tauri print error, falling back to spooler:', tauriErr);
      }
    }

    // Universal Isolated Print Spooler (Desktop & Web Offline-First)
    return new Promise((resolve) => {
      const htmlContent = buildThermalReceiptHtml(invoice, settings, activeConfig, isReprint);

      // Create an invisible iframe for printing to avoid interfering with current UI
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = activeConfig.paperWidth === '58mm' ? '58mm' : '80mm';
      iframe.style.height = '100px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        resolve({
          success: false,
          error: 'Impossible d\'initialiser le canal d\'impression du système.',
        });
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();

            // Cleanup iframe after spooling
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              resolve({ success: true });
            }, 1000);
          } catch (printErr: any) {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve({
              success: false,
              error: `Erreur du spooler d'impression : ${printErr?.message || 'Imprimante indisponible ou déconnectée.'}`,
            });
          }
        }, 300);
      };
    });
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erreur inconnue lors de l\'envoi vers l\'imprimante POS.',
    };
  }
};

/**
 * Prints a test receipt to verify thermal cutter, alignment and width
 */
export const printTestReceipt = async (
  settings: CompanySettings,
  config?: ReceiptPrinterConfig
): Promise<{ success: boolean; error?: string }> => {
  const activeConfig = config || getPrinterConfig();
  const testInvoice: Invoice = {
    id: 'test-inv',
    number: 'TEST-POS-000001',
    saleId: 'sale-test',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    customerId: 'cst-0',
    customerName: 'Client Comptant (Test)',
    items: [
      {
        productId: 'prd-test-1',
        productCode: 'AF-FIN-VOL',
        productName: 'Aliment Finition Volailles 50kg',
        unit: 'sac',
        conversionFactor: 50,
        quantity: 2,
        quantityBaseUnit: 100,
        unitPrice: 18500,
        discountAmount: 0,
        netUnitPrice: 18500,
        totalNet: 37000,
        cmpAtSale: 310,
        costOfGoodsSold: 31000,
        grossMargin: 6000,
      },
      {
        productId: 'prd-test-2',
        productCode: 'CP-VIT-MIN',
        productName: 'Concentré Ponte 10%',
        unit: 'sac',
        conversionFactor: 25,
        quantity: 1,
        quantityBaseUnit: 25,
        unitPrice: 22000,
        discountAmount: 1000,
        netUnitPrice: 21000,
        totalNet: 21000,
        cmpAtSale: 750,
        costOfGoodsSold: 18750,
        grossMargin: 2250,
      },
    ],
    subtotalGross: 59000,
    totalDiscount: 1000,
    totalNet: 58000,
    totalCostOfGoodsSold: 49750,
    grossMargin: 8250,
    marginRateCost: 16.58,
    marginRateSales: 14.22,
    payments: [
      {
        id: 'pmt-test',
        invoiceId: 'FAC-TEST-001',
        invoiceNumber: 'FAC-TEST-001',
        date: new Date().toISOString().slice(0, 10),
        amount: 60000,
        method: 'espèces',
        userId: 'usr-dev',
        userName: 'Développeur Système',
      },
    ],
    amountPaid: 60000,
    remainingBalance: 0,
    status: 'payée',
    userId: 'usr-1',
    userName: 'Caissier Principal',
    userRole: 'caissier',
    isCredit: false,
    salesPointId: 'pos-1',
    salesPointName: 'Point de Vente Test (Bafoussam)',
  };

  return printReceipt(testInvoice, settings, activeConfig, false);
};
