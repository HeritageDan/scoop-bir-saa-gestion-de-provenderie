export type Role = 'developpeur' | 'administrateur' | 'responsable' | 'caissier' | 'magasinier';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
  phone?: string;
  discountLimitPercent: number; // e.g., 0% for caissier, 15% for responsable, 100% for admin
  assignedSalesPointId?: string;
  lastLogin?: string;
}

export interface SalesPoint {
  id: string;
  code: string; // e.g. "POS-01", "POS-02"
  name: string;
  address: string;
  city?: string;
  phone: string;
  email?: string;
  managerName?: string;
  isMain: boolean;
  active: boolean;
  createdAt: string;
}

export type Language = 'fr' | 'en';
export type Theme = 'dark' | 'light';

export type UnitType = 'kilogramme' | 'gramme' | 'litre' | 'sac' | 'boîte' | 'bidon' | 'unité' | 'tonne';

export interface UnitConversion {
  commercialUnit: UnitType;
  baseUnit: UnitType;
  factor: number; // e.g. 1 sac = 50 kg => factor = 50
  description: string;
}

export type ProductCategory =
  | 'Matières premières'
  | 'Concentrés, prémix et compléments'
  | 'Aliments finis'
  | 'Autres fournitures';

export type ProductStatus = 'actif' | 'masqué' | 'archivé';

export interface PriceHistory {
  date: string;
  purchasePrice: number;
  salePrice: number;
  detailPrice?: number;
  changedBy: string;
  reason?: string;
}

export interface Product {
  id: string;
  code: string; // unique code e.g. PRD-001
  name: string;
  category: ProductCategory;
  baseUnit: UnitType; // Unité de base de stock (e.g. kg)
  saleUnit: UnitType; // Unité commerciale de vente (e.g. sac or kg)
  packaging: string; // Conditionnement (e.g. "Sac de 50 kg", "Bidon de 20 L")
  conversionFactor: number; // Quantité en unité de base par unité commerciale (e.g. 50 kg/sac)
  purchasePrice: number; // Dernier prix d'achat catalogue (FCFA)
  salePrice: number; // Prix de vente unitaire catalogue (FCFA)
  allowDetailSale?: boolean; // Autoriser la vente au détail (au kg / unité de base)
  detailPrice?: number; // Prix de vente au détail unitaire (FCFA / kg)
  cmp: number; // Coût Moyen Pondéré unitaire en FCFA (recalculé à chaque entrée)
  stockCurrentBaseUnit: number; // Stock actuel en unité de base (ex: 5000 kg)
  minAlertThresholdBaseUnit: number; // Seuil minimum d'alerte en unité de base (ex: 500 kg)
  status: ProductStatus;
  description?: string;
  priceHistory: PriceHistory[];
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'entrée fournisseur'
  | 'vente'
  | 'retour client'
  | 'retour fournisseur'
  | 'perte'
  | 'produit endommagé'
  | 'consommation interne'
  | 'correction d\'inventaire';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: StockMovementType;
  quantityBaseUnit: number; // positif pour entrée, négatif pour sortie
  unit: UnitType;
  stockBefore: number;
  stockAfter: number;
  costUnitCMP: number; // CMP au moment du mouvement
  totalValue: number; // Valeur du mouvement
  salesPointId?: string;
  salesPointName?: string;
  referenceDocument: string; // ex: FAC-2026-000001, REC-2026-000012, INV-2026-000003
  userId: string;
  userName: string;
  justification: string;
  timestamp: string;
  syncStatus?: SyncStatus;
  deviceId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  suppliedProducts: string[]; // Product IDs or names
  active: boolean;
  notes?: string;
  createdAt: string;
}

export type PurchaseStatus = 'brouillon' | 'validé' | 'annulé';

export interface PurchaseItem {
  productId: string;
  productCode: string;
  productName: string;
  unit: UnitType;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number; // Prix d'achat unitaire (FCFA)
  totalPrice: number; // quantity * unitPrice
  stockBefore?: number;
  stockAfter?: number;
}

export interface Purchase {
  id: string;
  referenceNumber: string; // ex: ACH-2026-000001
  supplierDocumentRef: string; // Référence BL fournisseur
  supplierId: string;
  supplierName: string;
  status: PurchaseStatus;
  orderDate: string;
  receptionDate?: string;
  items: PurchaseItem[];
  subtotal: number;
  transportFees: number; // Frais attribuables incorporés au CMP
  otherFees: number;
  totalAmount: number; // subtotal + transport + otherFees
  salesPointId?: string;
  salesPointName?: string;
  userId: string;
  userName: string;
  notes?: string;
  validatedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  syncStatus?: SyncStatus;
  deviceId?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  type: 'particulier' | 'éleveur' | 'revendeur' | 'coopérative';
  creditLimit: number; // Plafond de crédit autorisé (FCFA)
  currentDebt: number; // Encours actuel (FCFA)
  active: boolean;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'espèces' | 'virement' | 'paiement mobile' | 'crédit client';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string; // N° transaction MoMo/OM ou virement
  date: string;
  userId: string;
  userName: string;
  notes?: string;
}

export type DiscountType = 'pourcentage' | 'montant';

export interface SaleDiscount {
  type: DiscountType;
  value: number; // % or FCFA
  calculatedAmount: number; // In FCFA
  authorId: string;
  authorName: string;
  reason: string;
  valueBefore: number;
  valueAfter: number;
}

export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  unit: UnitType;
  conversionFactor: number;
  quantity: number; // En unité de vente choisie
  quantityBaseUnit: number; // quantity * conversionFactor
  unitPrice: number; // Prix unitaire avant remise
  discountAmount: number; // Remise appliquée sur cette ligne
  netUnitPrice: number; // unitPrice - (discount / qty)
  totalNet: number; // quantity * netUnitPrice
  cmpAtSale: number; // Coût Moyen Pondéré au moment de la vente
  costOfGoodsSold: number; // cmpAtSale * quantityBaseUnit
  grossMargin: number; // totalNet - costOfGoodsSold
  saleMode?: 'gros' | 'detail'; // Mode de vente : 'gros' (au sac/conditionné) ou 'detail' (au kg/vrac)
}

export type InvoiceStatus = 'émise' | 'payée' | 'partielle' | 'crédit' | 'annulée';

export interface Invoice {
  id: string;
  number: string; // Unique seq: FAC-AAAA-XXXXXX
  saleId: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotalGross: number; // Somme des prix bruts
  totalDiscount: number; // Remises globales
  discountDetails?: SaleDiscount;
  totalNet: number; // Chiffre d'affaires net
  totalCostOfGoodsSold: number; // Somme des coûts des marchandises vendues (CMP)
  grossMargin: number; // totalNet - totalCostOfGoodsSold
  marginRateCost: number; // Marge / CMV * 100
  marginRateSales: number; // Marge / CA Net * 100
  payments: Payment[];
  amountPaid: number;
  remainingBalance: number; // Solde dû
  status: InvoiceStatus;
  salesPointId?: string;
  salesPointName?: string;
  userId: string;
  userName: string;
  userRole: Role;
  notes?: string;
  isCredit: boolean;
  creditDueDate?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  creditNoteNumber?: string; // ex: AVO-2026-XXXXXX si annulée
  syncStatus?: SyncStatus;
  deviceId?: string;
  updatedAt?: string;
}

export interface CreditNote {
  id: string;
  number: string; // AVO-AAAA-XXXXXX
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  restockCompleted: boolean;
  notes?: string;
}

export type InventoryStatus = 'en_cours' | 'validé' | 'annulé';

export interface InventoryItem {
  productId: string;
  productCode: string;
  productName: string;
  category: ProductCategory;
  baseUnit: UnitType;
  theoreticalStock: number;
  physicalStock: number;
  variance: number; // physicalStock - theoreticalStock
  cmp: number;
  varianceValue: number; // variance * cmp
  reason?: string;
}

export interface InventorySession {
  id: string;
  referenceNumber: string; // INV-AAAA-XXXXXX
  startDate: string;
  endDate?: string;
  categoryFilter?: ProductCategory | 'all';
  status: InventoryStatus;
  items: InventoryItem[];
  totalTheoreticalStockValue: number;
  totalPhysicalStockValue: number;
  totalVarianceValue: number;
  salesPointId?: string;
  salesPointName?: string;
  createdBy: string;
  validatedBy?: string;
  notes?: string;
}

export type AuditAction =
  | 'CRÉATION_PRODUIT'
  | 'MODIFICATION_PRODUIT'
  | 'MODIFICATION_PRIX'
  | 'RECEPTION_FOURNISSEUR'
  | 'MODIFICATION_ACHAT'
  | 'ANNULATION_RECEPTION'
  | 'VENTE_ENREGISTREE'
  | 'REMISE_ACCORDEE'
  | 'ANNULATION_FACTURE'
  | 'CREATION_AVOIR'
  | 'REGLEMENT_CREANCE'
  | 'INVENTAIRE_VALIDE'
  | 'AJUSTEMENT_STOCK'
  | 'ENREGISTREMENT_DEPENSE'
  | 'SUPPRESSION_DEPENSE'
  | 'MODIFICATION_UTILISATEUR'
  | 'MODIFICATION_PARAMETRES'
  | 'SAUVEGARDE_SYSTEME'
  | 'RESTAURATION_SYSTEME';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: AuditAction;
  targetObject: string; // e.g. "Produit: PRD-001", "Facture: FAC-2026-000012"
  objectId: string;
  oldValue?: string;
  newValue?: string;
  justification?: string;
  ipAddress?: string;
}

export type ExpenseCategory =
  | 'Loyer & Charges locatives'
  | 'Électricité & Eau'
  | 'Salaires & Primes du personnel'
  | 'Entretien & Réparation broyeur/mélangeur'
  | 'Transport & Carburant logistique'
  | 'Sacs, ficelles & Emballages'
  | 'Fournitures de bureau & Télécom'
  | 'Impôts, taxes & Droits de marché'
  | 'Frais financiers & Services bancaires'
  | 'Autres charges opérationnelles';

export type ExpensePaymentMethod = 'espèces' | 'virement' | 'paiement mobile' | 'chèque';

export interface Expense {
  id: string;
  referenceNumber: string; // e.g. DEP-2026-000001
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  category: ExpenseCategory;
  description: string;
  amount: number; // in FCFA
  paymentMethod: ExpensePaymentMethod;
  recordedBy: string; // User name
  userId: string;
  salesPointId?: string;
  salesPointName?: string;
  receiptReference?: string; // N° reçu, facture ou transaction
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  syncStatus?: SyncStatus;
  deviceId?: string;
}

export interface CompanySettings {
  name: string;
  legalStatus: string; // e.g. SARL, Etablissement
  taxId: string; // NIF / IFU
  tradeRegisterNumber: string; // RCCM
  address: string;
  city: string;
  country: string;
  phone1: string;
  phone2?: string;
  email: string;
  currency: string; // FCFA
  taxRatePercent: number; // e.g. 0% (feed exempted or 19.25%)
  isTaxEnabled: boolean;
  maxDiscountCaissier: number; // 0%
  maxDiscountResponsable: number; // 15%
  maxDiscountAdmin: number; // 100%
  autoBackupDays: number;
  sessionTimeoutMinutes: number;
  invoiceFooterNotice: string;
  ticketFooterNotice: string;
  transportFeesIntegratedInCMP: boolean;
  storeId?: string;
  deviceId?: string;
  logoUrl?: string; // Base64 data URL ou URL d'image personnalisée
}

export type ReceiptPaperWidth = '58mm' | '80mm';

export interface ReceiptPrinterConfig {
  autoPrintOnSale: boolean;
  paperWidth: ReceiptPaperWidth;
  printerName: string;
  numberOfCopies: number;
  copies?: number;
  feedLines?: number;
  headerMessage?: string;
  footerMessage: string;
  showBarcode: boolean;
  showLogo: boolean;
  soundBeepOnPrint: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

