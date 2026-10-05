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
  statusCode?: number;
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

// Headers HTTP standard pour l'API REST Supabase (PostgREST)
function getSupabaseHeaders(anonKey: string): HeadersInit {
  return {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation,resolution=merge-duplicates',
  };
}

// Test complet de connectivité et de présence des tables Provenda dans Supabase
export async function testSupabaseConnection(overrideUrl?: string, overrideKey?: string): Promise<{
  success: boolean;
  message: string;
  statusCode?: number;
  tablesFound?: boolean;
  errorDetail?: string;
}> {
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
    // 1. Tester la racine REST
    const response = await fetch(`${config.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: 'Erreur 401/403 : Clé Anon invalide ou accès refusé. Vérifiez votre clé d\'API dans Supabase (Project Settings > API > anon key).',
        statusCode: response.status,
        tablesFound: false,
      };
    }

    if (!response.ok && response.status !== 200 && response.status !== 404) {
      return {
        success: false,
        message: `Réponse inattendue de Supabase (Code HTTP ${response.status}). Vérifiez l'URL de votre projet.`,
        statusCode: response.status,
        tablesFound: false,
      };
    }

    // 2. Tester l'existence réelle de la table 'sales_points'
    const tableRes = await fetch(`${config.url}/rest/v1/sales_points?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    if (tableRes.ok) {
      return {
        success: true,
        message: 'Connexion à Supabase établie avec succès et toutes les tables Provenda sont bien en place !',
        statusCode: 200,
        tablesFound: true,
      };
    }

    if (tableRes.status === 404) {
      const errText = await tableRes.text();
      return {
        success: false,
        message: 'Le serveur Supabase est bien connecté, mais la table "sales_points" n\'existe pas encore (Erreur 404). Vous devez exécuter le script SQL dans l\'onglet "SQL Editor" de votre tableau de bord Supabase.',
        statusCode: 404,
        tablesFound: false,
        errorDetail: errText,
      };
    }

    if (tableRes.status === 401 || tableRes.status === 403) {
      const errText = await tableRes.text();
      return {
        success: false,
        message: `La table "sales_points" existe mais l'accès en lecture est refusé (Code HTTP ${tableRes.status}). Assurez-vous d'avoir exécuté la section GRANT et les politiques RLS du script SQL.`,
        statusCode: tableRes.status,
        tablesFound: false,
        errorDetail: errText,
      };
    }

    const errText = await tableRes.text();
    return {
      success: false,
      message: `Statut inattendu lors de la vérification de la table sales_points (Code HTTP ${tableRes.status}).`,
      statusCode: tableRes.status,
      tablesFound: false,
      errorDetail: errText,
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
    const res = await fetch(`${config.url}/rest/v1/${tableName}?on_conflict=id`, {
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
        // Envoi avec on_conflict=id explicite pour un upsert PostgREST garanti sans ambiguïté
        const res = await fetch(`${config.url}/rest/v1/${table.name}?on_conflict=id`, {
          method: 'POST',
          headers: getSupabaseHeaders(config.anonKey),
          body: JSON.stringify(table.items),
        });

        if (!res.ok) {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const errJson = JSON.parse(errText);
            parsedMsg = errJson.message || errJson.error || errText;
            if (errJson.hint) parsedMsg += ` (Indice : ${errJson.hint})`;
            if (errJson.details) parsedMsg += ` [Détails : ${errJson.details}]`;
          } catch {}

          let userAdvice = '';
          if (res.status === 404) {
            userAdvice = ' La table n\'existe pas dans Supabase. Veuillez copier et ré-exécuter le script SQL dans le "SQL Editor" de Supabase en cliquant sur "Run".';
          } else if (res.status === 401 || res.status === 403) {
            userAdvice = ' Accès refusé (RLS ou Permissions). Assurez-vous d\'avoir exécuté la partie GRANT et les politiques RLS du script SQL.';
          } else if (res.status === 400) {
            userAdvice = ' Mismatch de colonnes ou contrainte de schéma PostgREST.';
          }

          return {
            success: false,
            message: `Erreur sur la table "${table.name}" (Code HTTP ${res.status}) : ${parsedMsg}.${userAdvice}`,
            error: `HTTP ${res.status}: ${errText}`,
            statusCode: res.status,
            details,
          };
        }
        details[table.name] = table.items.length;
      }
    }

    // Paramètres entreprise
    if (data.settings) {
      const settingsPayload = [{ id: 'company-settings-1', ...data.settings }];
      const res = await fetch(`${config.url}/rest/v1/company_settings?on_conflict=id`, {
        method: 'POST',
        headers: getSupabaseHeaders(config.anonKey),
        body: JSON.stringify(settingsPayload),
      });
      if (res.ok) {
        details['settings'] = true;
      } else {
        const errText = await res.text();
        console.warn('Erreur lors de la sauvegarde des paramètres dans Supabase:', errText);
      }
    }

    return {
      success: true,
      message: 'Toutes les données locales ont été synchronisées avec succès vers votre base Supabase !',
      details,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Échec de la synchronisation : ${error?.message || 'Erreur inattendue'}`,
      error: error?.toString(),
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
