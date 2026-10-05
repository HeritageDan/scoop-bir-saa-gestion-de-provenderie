/**
 * Service d'intégration Supabase pour Provenda ERP
 * Fournit une communication directe, sécurisée et sans dépendance externe
 * via l'API REST PostgREST officielle de Supabase.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'localStorage' | 'none';
}

export interface SupabaseSyncResult {
  success: boolean;
  message: string;
  details?: {
    products?: number;
    customers?: number;
    suppliers?: number;
    invoices?: number;
    purchases?: number;
    stockMovements?: number;
    inventories?: number;
    users?: number;
    salesPoints?: number;
    auditLogs?: number;
    settings?: boolean;
  };
  error?: string;
}

// Récupération de la configuration Supabase (Environment variables prioritaires, fallback localStorage)
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return {
      url: envUrl.trim().replace(/\/$/, ''),
      anonKey: envKey.trim(),
      isConfigured: true,
      source: 'env',
    };
  }

  const localUrl = localStorage.getItem('provenda_supabase_url') || '';
  const localKey = localStorage.getItem('provenda_supabase_key') || '';

  if (localUrl && localKey) {
    return {
      url: localUrl.trim().replace(/\/$/, ''),
      anonKey: localKey.trim(),
      isConfigured: true,
      source: 'localStorage',
    };
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

// Enregistrement manuel de la configuration Supabase dans le navigateur
export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = anonKey.trim();
  localStorage.setItem('provenda_supabase_url', cleanUrl);
  localStorage.setItem('provenda_supabase_key', cleanKey);
}

// Suppression de la configuration Supabase (retour au mode local)
export function clearSupabaseConfig(): void {
  localStorage.removeItem('provenda_supabase_url');
  localStorage.removeItem('provenda_supabase_key');
}

// Headers HTTP standard pour l'API REST Supabase
function getSupabaseHeaders(anonKey: string): HeadersInit {
  return {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation,resolution=merge-duplicates',
  };
}

// Test de connectivité à Supabase
export async function testSupabaseConnection(overrideUrl?: string, overrideKey?: string): Promise<{ success: boolean; message: string; statusCode?: number }> {
  const config = overrideUrl && overrideKey
    ? { url: overrideUrl.trim().replace(/\/$/, ''), anonKey: overrideKey.trim(), isConfigured: true }
    : getSupabaseConfig();

  if (!config.isConfigured || !config.url || !config.anonKey) {
    return {
      success: false,
      message: 'Aucune clé ou URL Supabase configurée. Renseignez l\'URL du projet et la clé publique Anon.',
    };
  }

  try {
    // Ping la racine REST de Supabase
    const response = await fetch(`${config.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    if (response.ok || response.status === 200 || response.status === 404) {
      return {
        success: true,
        message: 'Connexion à Supabase établie avec succès !',
        statusCode: response.status,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: 'Erreur 401/403 : Clé Anon invalide ou accès refusé. Vérifiez votre clé d\'API dans Supabase.',
        statusCode: response.status,
      };
    }

    return {
      success: false,
      message: `Réponse du serveur Supabase inattendue (Code HTTP ${response.status}). Vérifiez l'URL de votre projet.`,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Impossible de contacter Supabase : ${error?.message || 'Erreur réseau (CORS ou URL inaccessible)'}.`,
    };
  }
}

// Envoi d'un enregistrement unique à Supabase (pour synchronisation temps réel)
export async function upsertRecordToSupabase(tableName: string, record: any): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return false;

  try {
    const res = await fetch(`${config.url}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: getSupabaseHeaders(config.anonKey),
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Suppression d'un enregistrement dans Supabase
export async function deleteRecordFromSupabase(tableName: string, id: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return false;

  try {
    const res = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Récupération d'une table complète depuis Supabase
export async function fetchTableFromSupabase<T>(tableName: string): Promise<T[] | null> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    const res = await fetch(`${config.url}/rest/v1/${tableName}?select=*`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Pousser l'ensemble des données locales vers Supabase (Migration initiale)
export async function pushAllLocalDataToSupabase(data: {
  products: any[];
  customers: any[];
  suppliers: any[];
  purchases: any[];
  invoices: any[];
  creditNotes: any[];
  stockMovements: any[];
  inventories: any[];
  users: any[];
  salesPoints: any[];
  auditLogs: any[];
  settings: any;
}): Promise<SupabaseSyncResult> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      message: 'Supabase n\'est pas encore configuré. Renseignez l\'URL et la clé Anon d\'abord.',
    };
  }

  const details: Record<string, any> = {};

  try {
    const tablesToPush = [
      { name: 'sales_points', items: data.salesPoints },
      { name: 'users', items: data.users },
      { name: 'suppliers', items: data.suppliers },
      { name: 'customers', items: data.customers },
      { name: 'products', items: data.products },
      { name: 'purchases', items: data.purchases },
      { name: 'invoices', items: data.invoices },
      { name: 'credit_notes', items: data.creditNotes },
      { name: 'stock_movements', items: data.stockMovements },
      { name: 'inventory_sessions', items: data.inventories },
      { name: 'audit_logs', items: data.auditLogs },
    ];

    for (const table of tablesToPush) {
      if (table.items && table.items.length > 0) {
        const res = await fetch(`${config.url}/rest/v1/${table.name}`, {
          method: 'POST',
          headers: getSupabaseHeaders(config.anonKey),
          body: JSON.stringify(table.items),
        });

        if (!res.ok) {
          const errText = await res.text();
          return {
            success: false,
            message: `Erreur lors de l'envoi de la table "${table.name}". Assurez-vous d'avoir exécuté le script SQL supabase-schema.sql dans Supabase.`,
            error: errText,
            details,
          };
        }
        details[table.name] = table.items.length;
      }
    }

    // Settings
    if (data.settings) {
      const settingsPayload = [{ id: 'company-settings-1', ...data.settings }];
      const res = await fetch(`${config.url}/rest/v1/company_settings`, {
        method: 'POST',
        headers: getSupabaseHeaders(config.anonKey),
        body: JSON.stringify(settingsPayload),
      });
      if (res.ok) {
        details['settings'] = true;
      }
    }

    return {
      success: true,
      message: 'Toutes les données ont été synchronisées avec succès vers votre base Supabase !',
      details,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Échec de la synchronisation : ${error?.message || 'Erreur inattendue'}`,
      details,
    };
  }
}

// Télécharger l'ensemble des données depuis Supabase pour hydrater l'application
export async function pullAllDataFromSupabase(): Promise<{
  success: boolean;
  message: string;
  data?: {
    products?: any[];
    customers?: any[];
    suppliers?: any[];
    purchases?: any[];
    invoices?: any[];
    creditNotes?: any[];
    stockMovements?: any[];
    inventories?: any[];
    users?: any[];
    salesPoints?: any[];
    auditLogs?: any[];
    settings?: any;
  };
}> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      message: 'Supabase n\'est pas configuré.',
    };
  }

  try {
    const [
      products,
      customers,
      suppliers,
      purchases,
      invoices,
      creditNotes,
      stockMovements,
      inventories,
      users,
      salesPoints,
      auditLogs,
      settingsArray,
    ] = await Promise.all([
      fetchTableFromSupabase('products'),
      fetchTableFromSupabase('customers'),
      fetchTableFromSupabase('suppliers'),
      fetchTableFromSupabase('purchases'),
      fetchTableFromSupabase('invoices'),
      fetchTableFromSupabase('credit_notes'),
      fetchTableFromSupabase('stock_movements'),
      fetchTableFromSupabase('inventory_sessions'),
      fetchTableFromSupabase('users'),
      fetchTableFromSupabase('sales_points'),
      fetchTableFromSupabase('audit_logs'),
      fetchTableFromSupabase('company_settings'),
    ]);

    const result: any = {};
    if (products) result.products = products;
    if (customers) result.customers = customers;
    if (suppliers) result.suppliers = suppliers;
    if (purchases) result.purchases = purchases;
    if (invoices) result.invoices = invoices;
    if (creditNotes) result.creditNotes = creditNotes;
    if (stockMovements) result.stockMovements = stockMovements;
    if (inventories) result.inventories = inventories;
    if (users) result.users = users;
    if (salesPoints) result.salesPoints = salesPoints;
    if (auditLogs) result.auditLogs = auditLogs;
    if (settingsArray && settingsArray.length > 0) result.settings = settingsArray[0];

    return {
      success: true,
      message: 'Données récupérées depuis Supabase avec succès !',
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erreur lors de la récupération des données Supabase : ${error?.message || 'Erreur réseau'}`,
    };
  }
}
