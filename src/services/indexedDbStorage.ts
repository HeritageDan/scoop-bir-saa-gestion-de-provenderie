/**
 * Provenda - IndexedDB High-Capacity Local Storage Engine
 * 
 * Provides resilient, unlimited-quota offline storage for feed mill POS operations.
 * Operates with 13 dedicated object stores, auto-migration from localStorage,
 * and seamless asynchronous synchronization.
 */

const DB_NAME = 'provenda_offline_pos_db';
const DB_VERSION = 1;

export const STORES = [
  'products',
  'customers',
  'suppliers',
  'purchases',
  'invoices',
  'creditNotes',
  'stockMovements',
  'inventories',
  'expenses',
  'auditLogs',
  'salesPoints',
  'users',
  'appMetadata',
] as const;

export type StoreName = typeof STORES[number];

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes or returns the open IndexedDB database instance
 */
export const openDatabase = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      for (const storeName of STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          if (storeName === 'appMetadata') {
            db.createObjectStore(storeName, { keyPath: 'key' });
          } else {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            
            // Helpful indexes for fast offline queries
            if (['invoices', 'purchases', 'expenses', 'stockMovements'].includes(storeName)) {
              if (!store.indexNames.contains('salesPointId')) {
                store.createIndex('salesPointId', 'salesPointId', { unique: false });
              }
            }
            if (['invoices', 'purchases', 'expenses'].includes(storeName)) {
              if (!store.indexNames.contains('date')) {
                store.createIndex('date', 'date', { unique: false });
              }
            }
          }
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbInitPromise = null;
      };

      // Request browser to guarantee persistent storage (never auto-evict during low disk space)
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then((isPersisted) => {
          if (isPersisted) {
            console.log('[IndexedDB] Persistent storage granted (immunity to automatic browser eviction).');
          }
        }).catch(() => {});
      }

      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });

  return dbInitPromise;
};

/**
 * Persists an array of items into an object store (bulk overwrite)
 */
export const saveStoreItems = async <T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Clear existing records in this store to keep exact sync with in-memory state
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const item of items) {
          store.put(item);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn(`[IndexedDB] Failed to save store "${storeName}":`, error);
  }
};

/**
 * Loads all items from an object store
 */
export const loadStoreItems = async <T>(storeName: StoreName): Promise<T[]> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result || []) as T[]);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.warn(`[IndexedDB] Failed to load store "${storeName}":`, error);
    return [];
  }
};

/**
 * Saves a single key-value metadata record
 */
export const saveMetadata = async (key: string, value: any): Promise<void> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('appMetadata', 'readwrite');
      const store = transaction.objectStore('appMetadata');
      store.put({ key, value, updatedAt: new Date().toISOString() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn(`[IndexedDB] Failed to save metadata "${key}":`, error);
  }
};

/**
 * Loads a single key-value metadata record
 */
export const loadMetadata = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction('appMetadata', 'readonly');
      const store = transaction.objectStore('appMetadata');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? (request.result.value as T) : null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
};

/**
 * Returns counts of records in all object stores
 */
export const getDatabaseStats = async (): Promise<Record<string, number>> => {
  try {
    const db = await openDatabase();
    const stats: Record<string, number> = {};

    await Promise.all(
      STORES.map(
        (storeName) =>
          new Promise<void>((resolve) => {
            try {
              const tx = db.transaction(storeName, 'readonly');
              const store = tx.objectStore(storeName);
              const countReq = store.count();
              countReq.onsuccess = () => {
                stats[storeName] = countReq.result || 0;
                resolve();
              };
              countReq.onerror = () => {
                stats[storeName] = 0;
                resolve();
              };
            } catch {
              stats[storeName] = 0;
              resolve();
            }
          })
      )
    );

    return stats;
  } catch {
    return {};
  }
};

/**
 * Wipes all object stores (Factory Reset)
 */
export const clearAllIndexedDbStores = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES, 'readwrite');
      for (const store of STORES) {
        tx.objectStore(store).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Failed to clear stores:', error);
  }
};
