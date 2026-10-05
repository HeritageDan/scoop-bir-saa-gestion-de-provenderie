-- ==============================================================================
-- PROVENDA ERP - SCHEMA SQL INITIAL POUR SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Ce script crée l'ensemble des tables relationnelles nécessaires au fonctionnement
-- complet de Provenda sur Supabase avec Row Level Security (RLS) et réplication temps réel.
--
-- Instructions :
-- 1. Rendez-vous sur votre tableau de bord Supabase (https://supabase.com/dashboard)
-- 2. Allez dans le menu "SQL Editor" (icône terminal à gauche)
-- 3. Cliquez sur "New query"
-- 4. Collez l'intégralité de ce script et cliquez sur "Run" (Exécuter)
-- ==============================================================================

-- 1. Table des Points de Vente (Multi-magasins)
CREATE TABLE IF NOT EXISTS public.sales_points (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  "managerName" TEXT,
  "isMain" BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des Utilisateurs & Rôles
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL CHECK (role IN ('administrateur', 'responsable', 'caissier', 'magasinier')),
  active BOOLEAN DEFAULT true,
  phone TEXT,
  "discountLimitPercent" NUMERIC DEFAULT 0,
  "assignedSalesPointId" TEXT,
  "lastLogin" TIMESTAMPTZ
);

-- 3. Table des Fournisseurs
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  "contactPerson" TEXT,
  "suppliedProducts" JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des Clients & Plafonds de Crédit
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  email TEXT,
  type TEXT DEFAULT 'particulier',
  "creditLimit" NUMERIC DEFAULT 0,
  "currentDebt" NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des Articles & Produits (Moteur CMP)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  "baseUnit" TEXT NOT NULL,
  "saleUnit" TEXT NOT NULL,
  packaging TEXT,
  "conversionFactor" NUMERIC DEFAULT 1,
  "purchasePrice" NUMERIC DEFAULT 0,
  "salePrice" NUMERIC DEFAULT 0,
  cmp NUMERIC DEFAULT 0,
  "stockCurrentBaseUnit" NUMERIC DEFAULT 0,
  "minAlertThresholdBaseUnit" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'actif',
  description TEXT,
  "priceHistory" JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des Bons d'Achat & Approvisionnements
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  "referenceNumber" TEXT NOT NULL,
  "supplierDocumentRef" TEXT,
  "supplierId" TEXT,
  "supplierName" TEXT,
  status TEXT DEFAULT 'brouillon',
  "orderDate" TIMESTAMPTZ DEFAULT NOW(),
  "receptionDate" TIMESTAMPTZ,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  "transportFees" NUMERIC DEFAULT 0,
  "otherFees" NUMERIC DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  "salesPointId" TEXT,
  "salesPointName" TEXT,
  "userId" TEXT,
  "userName" TEXT,
  notes TEXT,
  "validatedAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "cancellationReason" TEXT
);

-- 7. Table des Factures de Vente (POS)
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  "saleId" TEXT,
  date TEXT,
  time TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  "subtotalGross" NUMERIC DEFAULT 0,
  "totalDiscount" NUMERIC DEFAULT 0,
  "discountDetails" JSONB,
  "totalNet" NUMERIC DEFAULT 0,
  "totalCostOfGoodsSold" NUMERIC DEFAULT 0,
  "grossMargin" NUMERIC DEFAULT 0,
  "marginRateCost" NUMERIC DEFAULT 0,
  "marginRateSales" NUMERIC DEFAULT 0,
  payments JSONB DEFAULT '[]'::jsonb,
  "amountPaid" NUMERIC DEFAULT 0,
  "remainingBalance" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'émise',
  "salesPointId" TEXT,
  "salesPointName" TEXT,
  "userId" TEXT,
  "userName" TEXT,
  "userRole" TEXT,
  notes TEXT,
  "isCredit" BOOLEAN DEFAULT false,
  "creditDueDate" TEXT,
  "cancelledAt" TIMESTAMPTZ,
  "cancelledBy" TEXT,
  "cancellationReason" TEXT,
  "creditNoteNumber" TEXT
);

-- 8. Table des Avoirs & Retours Clients
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  "originalInvoiceId" TEXT,
  "originalInvoiceNumber" TEXT,
  date TEXT,
  "customerId" TEXT,
  "customerName" TEXT,
  amount NUMERIC DEFAULT 0,
  reason TEXT,
  "authorizedBy" TEXT,
  "restockCompleted" BOOLEAN DEFAULT true,
  notes TEXT
);

-- 9. Table du Journal des Mouvements de Stock
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productCode" TEXT,
  type TEXT NOT NULL,
  "quantityBaseUnit" NUMERIC NOT NULL,
  unit TEXT,
  "stockBefore" NUMERIC,
  "stockAfter" NUMERIC,
  "costUnitCMP" NUMERIC DEFAULT 0,
  "totalValue" NUMERIC DEFAULT 0,
  "salesPointId" TEXT,
  "salesPointName" TEXT,
  "referenceDocument" TEXT,
  "userId" TEXT,
  "userName" TEXT,
  justification TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table des Sessions d'Inventaire Physique
CREATE TABLE IF NOT EXISTS public.inventory_sessions (
  id TEXT PRIMARY KEY,
  "referenceNumber" TEXT NOT NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  "categoryFilter" TEXT DEFAULT 'all',
  status TEXT DEFAULT 'en_cours',
  items JSONB DEFAULT '[]'::jsonb,
  "totalTheoreticalStockValue" NUMERIC DEFAULT 0,
  "totalPhysicalStockValue" NUMERIC DEFAULT 0,
  "totalVarianceValue" NUMERIC DEFAULT 0,
  "salesPointId" TEXT,
  "salesPointName" TEXT,
  "createdBy" TEXT,
  "validatedBy" TEXT,
  notes TEXT
);

-- 11. Table de la Piste d'Audit Immuable
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "userId" TEXT,
  "userName" TEXT,
  "userRole" TEXT,
  action TEXT NOT NULL,
  "targetObject" TEXT,
  "objectId" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  justification TEXT,
  "ipAddress" TEXT
);

-- 12. Table des Paramètres de l'Entreprise
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY,
  name TEXT,
  "legalStatus" TEXT,
  "taxId" TEXT,
  "tradeRegisterNumber" TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  phone1 TEXT,
  phone2 TEXT,
  email TEXT,
  currency TEXT DEFAULT 'FCFA',
  "taxRatePercent" NUMERIC DEFAULT 0,
  "isTaxEnabled" BOOLEAN DEFAULT false,
  "maxDiscountCaissier" NUMERIC DEFAULT 0,
  "maxDiscountResponsable" NUMERIC DEFAULT 15,
  "maxDiscountAdmin" NUMERIC DEFAULT 100,
  "autoBackupDays" NUMERIC DEFAULT 7,
  "sessionTimeoutMinutes" NUMERIC DEFAULT 30,
  "invoiceFooterNotice" TEXT,
  "ticketFooterNotice" TEXT,
  "transportFeesIntegratedInCMP" BOOLEAN DEFAULT true
);

-- ==============================================================================
-- SÉCURITÉ : ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Active RLS sur l'ensemble des tables et autorise les opérations complètes pour la clé anon
ALTER TABLE public.sales_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Création des politiques permissives pour le rôle 'anon' et 'authenticated'
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'sales_points', 'users', 'suppliers', 'customers', 'products',
      'purchases', 'invoices', 'credit_notes', 'stock_movements',
      'inventory_sessions', 'audit_logs', 'company_settings'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access to %I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow full access to %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END
$$;

-- Activation du Realtime (optionnel mais recommandé pour les notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.products, public.invoices, public.stock_movements;
