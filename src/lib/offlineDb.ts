import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { apiFetch, readApiError } from './api';
import { CATALOGUE_KEY, newCatalogue, parseCatalogue, type Catalogue } from './catalogue';

interface CatalogueOutboxRecord {
  id: 'catalogue-sync';
  catalogue: Catalogue;
  updatedAt: string;
  attempts: number;
  lastError: string;
  nextAttemptAt?: string;
  terminal?: boolean;
}

interface CacheRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

interface AkudhaOperationsDb extends DBSchema {
  catalogue: { key: 'current'; value: Catalogue };
  outbox: { key: string; value: CatalogueOutboxRecord };
  metadata: { key: string; value: { key: string; value: string } };
  cache: { key: string; value: CacheRecord };
}

let databasePromise: Promise<IDBPDatabase<AkudhaOperationsDb>> | undefined;
const database = () => databasePromise ??= openDB<AkudhaOperationsDb>('akudha-operations', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('catalogue')) db.createObjectStore('catalogue');
    if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata', { keyPath: 'key' });
    if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' });
  },
});

export async function loadCacheValue<T>(key: string): Promise<T | undefined> {
  const db = await database();
  const record = await db.get('cache', key);
  if (record) return record.value as T;
  const legacy = localStorage.getItem(key);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as T;
      await saveCacheValue(key, parsed);
      localStorage.removeItem(key);
      return parsed;
    } catch {
      localStorage.removeItem(key);
    }
  }
  return undefined;
}

export async function saveCacheValue<T>(key: string, value: T): Promise<void> {
  const db = await database();
  await db.put('cache', { key, value, updatedAt: new Date().toISOString() });
}

export async function loadOfflineCatalogue(): Promise<Catalogue> {
  const db = await database();
  const current = await db.get('catalogue', 'current');
  if (current) return parseCatalogue(JSON.stringify(current));
  const legacy = localStorage.getItem(CATALOGUE_KEY);
  const catalogue = newCatalogue();
  const transaction = db.transaction(['catalogue', 'outbox', 'metadata'], 'readwrite');
  await transaction.objectStore('catalogue').put(catalogue, 'current');
  if (!legacy) await transaction.objectStore('outbox').put({ id: 'catalogue-sync', catalogue, updatedAt: new Date().toISOString(), attempts: 0, lastError: '' });
  await transaction.objectStore('metadata').put({ key: 'migration', value: legacy ? 'legacy-pending' : 'fresh-v1' });
  await transaction.done;
  return catalogue;
}

export async function getLegacyCatalogue(): Promise<Catalogue | null> {
  const db = await database();
  const migration = await db.get('metadata', 'migration');
  const legacy = localStorage.getItem(CATALOGUE_KEY);
  return migration?.value === 'legacy-pending' && legacy ? parseCatalogue(legacy) : null;
}

export async function importLegacyCatalogue(): Promise<Catalogue> {
  const legacy = await getLegacyCatalogue();
  if (!legacy) throw Error('No previous browser inventory is available to import.');
  await saveOfflineCatalogue(legacy);
  await (await database()).put('metadata', { key: 'migration', value: 'localStorage-imported-v1' });
  return legacy;
}

export async function saveOfflineCatalogue(catalogue: Catalogue, queueSync = true): Promise<void> {
  const validated = parseCatalogue(JSON.stringify(catalogue));
  const db = await database();
  const transaction = db.transaction(['catalogue', 'outbox'], 'readwrite');
  await transaction.objectStore('catalogue').put(validated, 'current');
  if (queueSync) await transaction.objectStore('outbox').put({ id: 'catalogue-sync', catalogue: validated, updatedAt: new Date().toISOString(), attempts: 0, lastError: '' });
  await transaction.done;
}

export async function hasPendingCatalogueSync(): Promise<boolean> {
  return !!(await database()).get('outbox', 'catalogue-sync');
}

export async function getCatalogueSyncInfo(): Promise<CatalogueOutboxRecord | undefined> {
  return (await database()).get('outbox', 'catalogue-sync');
}

export async function syncOfflineCatalogue(): Promise<Catalogue | null> {
  const db = await database();
  const pending = await db.get('outbox', 'catalogue-sync');
  try {
    if (pending) {
      const response = await apiFetch('/api/inventory/sync', { method: 'POST', body: JSON.stringify({ catalogue: pending.catalogue }) });
      if (!response.ok) throw Error(await readApiError(response));
    }
    const snapshotResponse = await apiFetch('/api/inventory/snapshot');
    if (!snapshotResponse.ok) throw Error(await readApiError(snapshotResponse));
    const snapshot = parseCatalogue(JSON.stringify((await snapshotResponse.json() as { catalogue: Catalogue }).catalogue));
    const transaction = db.transaction(['catalogue', 'outbox', 'metadata'], 'readwrite');
    await transaction.objectStore('catalogue').put(snapshot, 'current');
    await transaction.objectStore('outbox').delete('catalogue-sync');
    await transaction.objectStore('metadata').put({ key: 'last-sync', value: new Date().toISOString() });
    await transaction.done;
    return snapshot;
  } catch (error) {
    if (pending) {
      const message = error instanceof Error ? error.message : 'Synchronization failed';
      const shouldRetry = !/Authentication required|Session expired|Invalid staff ID|Forbidden/.test(message);
      if (shouldRetry) pending.attempts += 1;
      pending.lastError = message;
      pending.terminal = shouldRetry && pending.attempts >= 8;
      pending.nextAttemptAt = shouldRetry && !pending.terminal ? new Date(Date.now() + Math.min(1_000 * 2 ** Math.max(0, pending.attempts - 1), 60_000)).toISOString() : undefined;
      await db.put('outbox', pending);
    }
    throw error;
  }
}
