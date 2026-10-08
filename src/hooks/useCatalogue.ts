import { useCallback, useEffect, useState } from 'react';
import { newCatalogue, type Catalogue } from '../lib/catalogue';
import { getCatalogueSyncInfo, getLegacyCatalogue, hasPendingCatalogueSync, importLegacyCatalogue, loadOfflineCatalogue, saveOfflineCatalogue, syncOfflineCatalogue } from '../lib/offlineDb';
import { useAuth } from './useAuth';

export type CatalogueSyncStatus = 'loading' | 'local' | 'pending' | 'syncing' | 'synced' | 'error';

export function useCatalogue() {
  const { user } = useAuth();
  const serverSyncEnabled = !!user && user.id !== 'local-demo';
  const [state, setState] = useState<Catalogue>(newCatalogue);
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState<CatalogueSyncStatus>('loading');
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const current = await loadOfflineCatalogue();
      setState(current); setError('');
      setLegacyAvailable(!!(await getLegacyCatalogue()));
      setSyncStatus(await hasPendingCatalogueSync() ? 'pending' : 'local');
    } catch (reason) {
      setError(`Unable to open offline inventory. ${reason instanceof Error ? reason.message : 'Storage is unavailable.'}`);
      setSyncStatus('error');
    }
  }, []);

  const syncNow = useCallback(async (force = false) => {
    if (!navigator.onLine) return;
    if (!serverSyncEnabled) { setSyncStatus(await hasPendingCatalogueSync() ? 'pending' : 'local'); setError(''); return; }
    const pending = await getCatalogueSyncInfo();
    if (pending?.terminal && !force) {
      setSyncStatus('error');
      setError(`Inventory remains saved on this device after repeated synchronization failures. ${pending.lastError}`);
      return;
    }
    const nextAttempt = pending?.nextAttemptAt ? Date.parse(pending.nextAttemptAt) : 0;
    if (!force && nextAttempt > Date.now()) { setRetryAt(nextAttempt); setSyncStatus('pending'); return; }
    setSyncStatus('syncing');
    try {
      const remote = await syncOfflineCatalogue();
      if (remote) setState(remote);
      setSyncStatus('synced'); setError(''); setRetryAt(null);
    } catch (reason) {
      const info = await getCatalogueSyncInfo();
      setSyncStatus(info?.terminal ? 'error' : 'pending');
      if (info?.nextAttemptAt) setRetryAt(Date.parse(info.nextAttemptAt));
      if (reason instanceof Error && !/Authentication required|Session expired|Failed to fetch/.test(reason.message)) setError(`Inventory is saved offline but has not synchronized. ${reason.message}`);
    }
  }, [serverSyncEnabled]);

  useEffect(() => {
    if (!retryAt) return;
    const timeout = window.setTimeout(() => { setRetryAt(null); void syncNow(); }, Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [retryAt, syncNow]);

  useEffect(() => {
    void refresh().then(() => syncNow());
    const channel = new BroadcastChannel('akudha-catalogue');
    channel.onmessage = () => void refresh();
    const online = () => void syncNow();
    window.addEventListener('online', online);
    return () => { channel.close(); window.removeEventListener('online', online); };
  }, [refresh, syncNow]);

  const update = useCallback(async (change: (current: Catalogue) => Catalogue) => {
    if (!navigator.locks) throw Error('Use a current browser on localhost to save inventory safely.');
    await navigator.locks.request('akudha_catalogue_v1', async () => {
      const current = await loadOfflineCatalogue();
      const next = change(current);
      await saveOfflineCatalogue(next);
      setState(next); setError(''); setSyncStatus('pending');
      const channel = new BroadcastChannel('akudha-catalogue');
      channel.postMessage('updated');
      channel.close();
    });
    if (navigator.onLine) void syncNow();
  }, [syncNow]);

  const importLegacy = useCallback(async () => {
    const imported = await importLegacyCatalogue();
    setState(imported); setLegacyAvailable(false); setSyncStatus('pending');
    if (navigator.onLine) void syncNow(true);
  }, [syncNow]);

  return { state, update, storageError: error, syncStatus, syncNow, legacyAvailable, importLegacy };
}
