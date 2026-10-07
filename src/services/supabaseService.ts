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

export interface KeyInspection {
  isValidJwt: boolean;
  role?: string;
  projectRef?: string;
  urlRef?: string;
  mismatch?: boolean;
  hint?: string;
}

/**
 * Normalise l'URL Supabase pour éviter l'erreur courante PGRST125 (Invalid path specified in request URL).
 * Supprime les espaces, les guillemets et tout sous-chemin comme /rest/v1 ou /rest collé par inadvertance.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let clean = rawUrl.trim();
  clean = clean.replace(/^["']+|["']+$/g, '');
  clean = clean.replace(/\/+$/, '');
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/rest\/?$/i, '');
  clean = clean.replace(/\/auth\/v1\/?$/i, '');
  return clean.replace(/\/+$/, '');
}

/**
 * Nettoie la clé d'API Supabase (retire guillemets, retours à la ligne, espaces accidentels).
 */
export function normalizeSupabaseKey(rawKey: string): string {
  if (!rawKey) return '';
  let clean = rawKey.trim();
  clean = clean.replace(/^["']+|["']+$/g, '').trim();
  clean = clean.replace(/[\r\n\t\s]+/g, '').trim();
  return clean;
}

/**
 * Normalise un tableau d'objets pour l'API PostgREST de Supabase (Bulk Insert).
 * PostgREST exige que tous les objets d'un même tableau partagent exactement
 * le même ensemble de clés (règle PGRST102 : "All object keys must match").
 * Cette fonction calcule l'union de toutes les clés et attribue 'null'
 * aux propriétés absentes ou undefined de chaque objet.
 */
export function normalizePostgrestPayload(items: any[]): any[] {
  if (!items || items.length === 0) return [];

  const keySet = new Set<string>();
  for (const item of items) {
    if (item && typeof item === 'object') {
      for (const k of Object.keys(item)) {
        keySet.add(k);
      }
    }
  }
  const allKeys = Array.from(keySet);

  return items.map(item => {
    if (!item || typeof item !== 'object') return item;
    const normalized: Record<string, any> = {};
    for (const key of allKeys) {
      const val = (item as any)[key];
      normalized[key] = val === undefined ? null : val;
    }
    return normalized;
  });
}

/**
 * Analyse et valide le format d'une clé API Supabase (doit être un JWT avec le rôle 'anon').
 * Détecte les inversions avec le mot de passe de base, le JWT Secret ou un autre projet Supabase.
 */
export function inspectSupabaseKey(key: string, expectedUrl?: string): KeyInspection {
  const clean = normalizeSupabaseKey(key);
  if (!clean) {
    return { isValidJwt: false, hint: 'La clé API est vide.' };
  }

  const parts = clean.split('.');
  if (parts.length !== 3) {
    if (clean.startsWith('sbp_')) {
      return {
        isValidJwt: false,
        hint: 'Cette clé commence par "sbp_" (Personal Access Token). Vous devez utiliser la clé "anon / public" commençant par "ey..." (dans Project Settings > API).',
      };
    }
    return {
      isValidJwt: false,
      hint: 'La clé ne respecte pas le format JWT (elle doit être composée de 3 blocs séparés par des points et commencer par "ey..."). Vous avez probablement copié le mot de passe de la base de données ou le JWT Secret au lieu de la clé publique anon.',
    };
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonStr);

    let urlRef: string | undefined;
    if (expectedUrl) {
      const match = expectedUrl.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
      if (match) urlRef = match[1].toLowerCase();
    }

    const projectRef = payload.ref ? String(payload.ref).toLowerCase() : undefined;
    const role = payload.role;
    const mismatch = Boolean(urlRef && projectRef && urlRef !== projectRef);

    let hint = '';
    if (mismatch) {
      hint = `Incohérence de projet : Cette clé appartient au projet Supabase "${projectRef}", alors que l'URL cible le projet "${urlRef}". Assurez-vous d'utiliser l'URL et la clé du même projet.`;
    } else if (role && role !== 'anon' && role !== 'service_role') {
      hint = `Cette clé possède le rôle "${role}" au lieu du rôle attendu "anon".`;
    }

    return {
      isValidJwt: true,
      role,
      projectRef,
      urlRef,
      mismatch,
      hint: hint || undefined,
    };
  } catch {
    return {
      isValidJwt: false,
      hint: 'Impossible de décoder la clé JWT. Vérifiez que la clé n\'a pas été tronquée lors de la copie.',
    };
  }
}

// Récupération des valeurs configurées dans les variables d'environnement Vercel
export function getVercelEnvConfig(): { url: string; anonKey: string; isAvailable: boolean } {
  const envUrl = normalizeSupabaseUrl((import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL || '');
  const envKey = normalizeSupabaseKey((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY || '');
  return {
    url: envUrl,
    anonKey: envKey,
    isAvailable: Boolean(envUrl && envKey),
  };
}

// Récupération de la configuration Supabase (priorité au localStorage personnalisé s'il existe, sinon variables d'environnement Vercel)
export function getSupabaseConfig(): SupabaseConfig {
  const localUrl = normalizeSupabaseUrl(localStorage.getItem('provenda_supabase_url') || '');
  const localKey = normalizeSupabaseKey(localStorage.getItem('provenda_supabase_key') || '');

  if (localUrl && localKey) {
    return {
      url: localUrl,
      anonKey: localKey,
      isConfigured: true,
      source: 'localStorage',
    };
  }

  const env = getVercelEnvConfig();
  if (env.isAvailable) {
    return {
      url: env.url,
      anonKey: env.anonKey,
      isConfigured: true,
      source: 'env',
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
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = normalizeSupabaseKey(anonKey);
  localStorage.setItem('provenda_supabase_url', cleanUrl);
  localStorage.setItem('provenda_supabase_key', cleanKey);
}

// Suppression de la configuration Supabase dans le localStorage (revient aux variables Vercel si existantes)
export function clearSupabaseConfig(): void {
  localStorage.removeItem('provenda_supabase_url');
  localStorage.removeItem('provenda_supabase_key');
}

// Headers HTTP standard pour l'API REST Supabase (PostgREST)
function getSupabaseHeaders(anonKey: string): HeadersInit {
  const cleanKey = normalizeSupabaseKey(anonKey);
  return {
    'apikey': cleanKey,
    'Authorization': `Bearer ${cleanKey}`,
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
  inspection?: KeyInspection;
}> {
  const config = overrideUrl && overrideKey
    ? {
        url: normalizeSupabaseUrl(overrideUrl),
        anonKey: normalizeSupabaseKey(overrideKey),
        isConfigured: true,
        source: 'localStorage' as const,
      }
    : getSupabaseConfig();

  if (!config.isConfigured || !config.url || !config.anonKey) {
    return {
      success: false,
      message: 'Aucune clé ou URL Supabase configurée. Renseignez l\'URL du projet et la clé publique Anon.',
    };
  }

  // 0. Analyse préventive de la clé API
  const inspection = inspectSupabaseKey(config.anonKey, config.url);
  if (!inspection.isValidJwt) {
    return {
      success: false,
      message: `Format de clé invalide : ${inspection.hint}`,
      statusCode: 400,
      tablesFound: false,
      inspection,
    };
  }

  if (inspection.mismatch) {
    return {
      success: false,
      message: inspection.hint || 'Incohérence entre l\'URL et le projet de la clé.',
      statusCode: 400,
      tablesFound: false,
      inspection,
    };
  }

  try {
    // 1. Tester la racine REST de l'API Supabase
    const response = await fetch(`${config.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const j = JSON.parse(errText);
        parsedErr = j.message || j.error_description || j.error || errText;
      } catch {}

      let guidance = 'La clé n\'est pas reconnue par ce projet Supabase.';
      if (inspection.hint) {
        guidance = inspection.hint;
      } else {
        guidance = 'Rendez-vous dans Supabase > Project Settings > API > section "Project API keys" et copiez le champ "anon / public" (en cliquant sur l\'icône Copier).';
      }

      return {
        success: false,
        message: `Erreur ${response.status} (${parsedErr}) : ${guidance}`,
        statusCode: response.status,
        tablesFound: false,
        errorDetail: errText,
        inspection,
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        message: `Impossible de joindre l'API Supabase à l'adresse "${config.url}/rest/v1/" (Code HTTP ${response.status}). Vérifiez l'URL de votre projet (doit être https://xyz.supabase.co sans /rest/v1).`,
        statusCode: response.status,
        tablesFound: false,
        errorDetail: errText,
        inspection,
      };
    }

    // 2. Tester l'existence réelle de la table 'sales_points' (ou 'salespoint')
    let detectedTable = 'sales_points';
    let tableRes = await fetch(`${config.url}/rest/v1/sales_points?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    // Fallback: tester si la table a été nommée 'salespoint' (sans underscore)
    if (tableRes.status === 404) {
      const singularRes = await fetch(`${config.url}/rest/v1/salespoint?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`,
        },
      });
      if (singularRes.ok) {
        detectedTable = 'salespoint';
        tableRes = singularRes;
      }
    }

    if (tableRes.ok) {
      return {
        success: true,
        message: `Connexion à Supabase réussie ! La table "${detectedTable}" et l'API PostgREST sont pleinement fonctionnelles.`,
        statusCode: 200,
        tablesFound: true,
        inspection,
      };
    }

    const errText = await tableRes.text();
    let errJson: any = null;
    try {
      errJson = JSON.parse(errText);
    } catch {}

    if (errJson?.code === 'PGRST125') {
      return {
        success: false,
        message: 'Erreur PGRST125 (Chemin d\'URL invalide) : L\'URL Supabase contient un sous-chemin en trop. L\'URL doit être uniquement l\'URL de base (ex: https://xyz.supabase.co) sans "/rest/v1".',
        statusCode: 404,
        tablesFound: false,
        errorDetail: errText,
        inspection,
      };
    }

    if (tableRes.status === 404) {
      return {
        success: false,
        message: 'Le serveur Supabase est bien connecté, mais la table "sales_points" est introuvable (Erreur 404). Exécutez le script SQL supabase-schema.sql dans Supabase SQL Editor.',
        statusCode: 404,
        tablesFound: false,
        errorDetail: errText,
        inspection,
      };
    }

    if (tableRes.status === 401 || tableRes.status === 403) {
      return {
        success: false,
        message: `La table "sales_points" existe mais l'accès est refusé (Code HTTP ${tableRes.status}). Assurez-vous d'avoir exécuté la partie GRANT et les politiques RLS du script SQL.`,
        statusCode: tableRes.status,
        tablesFound: false,
        errorDetail: errText,
        inspection,
      };
    }

    return {
      success: false,
      message: `Statut inattendu lors de la vérification de la table sales_points (Code HTTP ${tableRes.status}).`,
      statusCode: tableRes.status,
      tablesFound: false,
      errorDetail: errText,
      inspection,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Impossible de contacter Supabase : ${error?.message || 'Erreur réseau (CORS ou URL inaccessible)'}.`,
      inspection,
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

// Récupération d'une table complète depuis Supabase (avec fallback singulier/pluriel pour sales_points)
export async function fetchTableFromSupabase<T>(tableName: string): Promise<T[] | null> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    let res = await fetch(`${config.url}/rest/v1/${tableName}?select=*`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    // Fallback sales_points -> salespoint
    if (!res.ok && tableName === 'sales_points') {
      const fallbackRes = await fetch(`${config.url}/rest/v1/salespoint?select=*`, {
        method: 'GET',
        headers: {
          'apikey': config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`,
        },
      });
      if (fallbackRes.ok) {
        return await fallbackRes.json();
      }
    }

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
    // Vérifier si la table des points de vente s'appelle 'sales_points' ou 'salespoint'
    let salesPointsTable = 'sales_points';
    try {
      const checkRes = await fetch(`${config.url}/rest/v1/sales_points?select=id&limit=1`, {
        method: 'GET',
        headers: { 'apikey': config.anonKey, 'Authorization': `Bearer ${config.anonKey}` },
      });
      if (checkRes.status === 404) {
        const checkSingular = await fetch(`${config.url}/rest/v1/salespoint?select=id&limit=1`, {
          method: 'GET',
          headers: { 'apikey': config.anonKey, 'Authorization': `Bearer ${config.anonKey}` },
        });
        if (checkSingular.ok) {
          salesPointsTable = 'salespoint';
        }
      }
    } catch {}

    const tablesToPush = [
      { name: salesPointsTable, items: data.salesPoints },
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
        // Normaliser les clés de tous les objets pour satisfaire la règle PostgREST PGRST102
        const normalizedPayload = normalizePostgrestPayload(table.items);

        // 1. Essai d'insertion groupée (Batch PostgREST ultra-rapide)
        let res = await fetch(`${config.url}/rest/v1/${table.name}?on_conflict=id`, {
          method: 'POST',
          headers: getSupabaseHeaders(config.anonKey),
          body: JSON.stringify(normalizedPayload),
        });

        // 2. Si l'insertion groupée échoue (ex: PGRST102 ou contrainte spécifique), repli automatique en insertion unitaire
        if (!res.ok) {
          const batchErrText = await res.text();
          let fallbackSuccess = true;
          let fallbackErr = '';

          for (const item of table.items) {
            const singleRes = await fetch(`${config.url}/rest/v1/${table.name}?on_conflict=id`, {
              method: 'POST',
              headers: getSupabaseHeaders(config.anonKey),
              body: JSON.stringify(item),
            });
            if (!singleRes.ok) {
              fallbackSuccess = false;
              fallbackErr = await singleRes.text();
              break;
            }
          }

          if (fallbackSuccess) {
            details[table.name] = table.items.length;
            continue; // Réussite grâce au repli unitaire !
          }

          let parsedMsg = fallbackErr || batchErrText;
          try {
            const errJson = JSON.parse(parsedMsg);
            parsedMsg = errJson.message || errJson.error || parsedMsg;
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
            error: `HTTP ${res.status}: ${fallbackErr || batchErrText}`,
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

// Supprimer tous les enregistrements d'une table Supabase
export async function clearSupabaseTable(tableName: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return false;

  try {
    const res = await fetch(`${config.url}/rest/v1/${tableName}?id=neq.placeholder_none`, {
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

// Nettoyer toutes les tables de transactions pour la mise en production client
export async function clearAllSupabaseTransactions(): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return false;

  try {
    const transactionTables = [
      'credit_notes',
      'invoices',
      'stock_movements',
      'inventory_sessions',
      'purchases',
      'expenses',
    ];
    for (const tbl of transactionTables) {
      await clearSupabaseTable(tbl);
    }
    return true;
  } catch {
    return false;
  }
}

