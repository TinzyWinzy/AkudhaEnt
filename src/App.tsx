import { useCallback, useEffect, useRef, useState } from 'react';
import { Leaf } from 'lucide-react';
import { HarvesterRecord, OutboundConsignment, ProcessingBatch, SyncPayload } from './types';
import { HISTORICAL_BATCHES, HISTORICAL_CONSIGNMENTS, HISTORICAL_HARVESTS } from './initialData';
import { LOCALSTORAGE_KEYS } from './constants';
import { useIndexedDbCache, useInventory, useLogging } from './hooks';
import { AppShell, DashboardCards, DistributionPanel, LandingPage, OperationsHome, OperationsPage, ProcessingPanel, RegionalAnalytics, SourcingPanel } from './components';
import { InventoryPanel } from './components/InventoryPanel';
import { LoginOverlay } from './components/auth';
import { useAuth } from './hooks/useAuth';
import { APP_ROUTE_PATH, canAccessRoute, defaultRouteFor, routeFromPath, type AppRoute } from './lib/appRoutes';
import { usePathname } from './hooks/usePathname';
import { apiFetch, readApiError } from './lib/api';
import { useCatalogue } from './hooks/useCatalogue';
import { OperationalTraceability } from './components/OperationalTraceability';

export default function App() {
  const { user, loading: authLoading, login, loginDemo, logout } = useAuth();
  const { pathname, navigate } = usePathname();
  const [syncedHarvests, setSyncedHarvests] = useIndexedDbCache<HarvesterRecord[]>(LOCALSTORAGE_KEYS.SYNCED_HARVESTS, HISTORICAL_HARVESTS);
  const [syncedBatches, setSyncedBatches] = useIndexedDbCache<ProcessingBatch[]>(LOCALSTORAGE_KEYS.SYNCED_BATCHES, HISTORICAL_BATCHES);
  const [syncedConsignments, setSyncedConsignments] = useIndexedDbCache<OutboundConsignment[]>(LOCALSTORAGE_KEYS.SYNCED_CONSIGNMENTS, HISTORICAL_CONSIGNMENTS);
  const [offlineQueue, setOfflineQueue] = useIndexedDbCache<SyncPayload[]>(LOCALSTORAGE_KEYS.OFFLINE_QUEUE, []);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const catalogue = useCatalogue();
  const onlineRef = useRef(isOnline);
  const lastAutomaticSyncRef = useRef('');
  const inventory = useInventory(syncedHarvests, syncedBatches, syncedConsignments, offlineQueue);
  const { logs, addLog } = useLogging([
    { time: new Date().toLocaleTimeString(), text: 'Akudha Operations is ready.', type: 'info' },
    { time: new Date().toLocaleTimeString(), text: navigator.onLine ? 'This device is online.' : 'This device is offline. Unsynced work remains safe here.', type: 'info' },
  ]);

  const requestedRoute = routeFromPath(pathname);
  const isAppPath = pathname === '/app' || pathname.startsWith('/app/');
  const currentRoute: AppRoute = user && requestedRoute && canAccessRoute(user, requestedRoute) ? requestedRoute : user ? defaultRouteFor(user) : 'home';

  useEffect(() => {
    const handleOnline = () => {
      if (!onlineRef.current) {
        setIsOnline(true);
        onlineRef.current = true;
      }
    };
    const handleOffline = () => {
      if (onlineRef.current) {
        setIsOnline(false);
        setServerAvailable(false);
        onlineRef.current = false;
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    setServerAvailable(null);
    apiFetch('/api/health')
      .then(response => {
        const available = response.ok;
        setServerAvailable(available);
        if (available) addLog('Server connection confirmed.', 'success');
      })
      .catch(() => setServerAvailable(false));
  }, [addLog, isOnline]);

  useEffect(() => {
    if (!user) return;
    if (pathname === '/sign-in') {
      navigate('/app', true);
      return;
    }
    if (isAppPath && (!requestedRoute || !canAccessRoute(user, requestedRoute))) {
      navigate(APP_ROUTE_PATH[defaultRouteFor(user)], true);
    }
  }, [isAppPath, navigate, pathname, requestedRoute, user]);

  const queueOffline = useCallback((payload: SyncPayload) => {
    setOfflineQueue(previous => [...previous, payload]);
  }, [setOfflineQueue]);

  const triggerSyncAll = useCallback(async () => {
    if (!isOnline) {
      addLog('Synchronization will resume when this device is online.', 'warn');
      return;
    }
    const pending = offlineQueue.filter(item => item.status !== 'SYNCED');
    if (pending.length === 0) {
      addLog('All records are saved.', 'info');
      return;
    }

    addLog(`Synchronizing ${pending.length} queued record${pending.length === 1 ? '' : 's'}…`, 'info');
    try {
      const payloads = pending.map(({ uuid, type, action, payload, offline_created_at }) => ({ uuid, type, action, payload, offline_created_at }));
      const response = await apiFetch('/api/sync', { method: 'POST', body: JSON.stringify({ payloads }) });
      if (!response.ok) throw Error(await readApiError(response));
      const { results } = await response.json() as { results: Array<{ uuid: string; status: 'synced' | 'duplicate' | 'error'; error?: string }> };
      const byId = new Map(results.map(result => [result.uuid, result]));
      for (const item of pending) {
        const result = byId.get(item.uuid);
        if (!result || result.status === 'error') {
          setOfflineQueue(previous => previous.map(record => record.uuid === item.uuid ? { ...record, status: 'FAILED' as const, error_message: result?.error || 'No synchronization result returned' } : record));
          addLog(`Could not save ${item.type.toLowerCase()} record ${item.uuid.substring(0, 8)}. ${result?.error || 'The server did not return a result.'}`, 'error');
          continue;
        }
        if (item.type === 'HARVEST') setSyncedHarvests(previous => previous.some(record => record.idempotent_uuid === item.uuid) ? previous.map(record => record.idempotent_uuid === item.uuid ? { ...record, is_synced: true } : record) : [{ ...item.payload, is_synced: true }, ...previous]);
        if (item.type === 'PROCESSING') setSyncedBatches(previous => previous.some(record => record.idempotent_uuid === item.uuid) ? previous.map(record => record.idempotent_uuid === item.uuid ? { ...record, is_synced: true } : record) : [{ ...item.payload, is_synced: true }, ...previous]);
        if (item.type === 'CONSIGNMENT') setSyncedConsignments(previous => previous.some(record => record.idempotent_uuid === item.uuid) ? previous.map(record => record.idempotent_uuid === item.uuid ? { ...record, is_synced: true } : record) : [{ ...item.payload, is_synced: true }, ...previous]);
        setOfflineQueue(previous => previous.map(record => record.uuid === item.uuid ? { ...record, status: 'SYNCED' as const, error_message: undefined } : record));
        addLog(result.status === 'duplicate' ? `Record ${item.uuid.substring(0, 8)} was already saved.` : `${item.type.toLowerCase()} record ${item.uuid.substring(0, 8)} saved.`, result.status === 'duplicate' ? 'warn' : 'success');
      }
      setServerAvailable(true);
    } catch (reason) {
      setServerAvailable(false);
      addLog(`Synchronization stopped. ${reason instanceof Error ? reason.message : 'The server is unavailable.'}`, 'error');
    }
  }, [addLog, isOnline, offlineQueue, setOfflineQueue, setSyncedBatches, setSyncedConsignments, setSyncedHarvests]);

  const pendingSignature = offlineQueue.filter(item => item.status === 'PENDING').map(item => item.uuid).sort().join('|');
  useEffect(() => {
    if (!isOnline) {
      lastAutomaticSyncRef.current = '';
      return;
    }
    if (!pendingSignature || user?.id === 'local-demo' || pendingSignature === lastAutomaticSyncRef.current) return;
    lastAutomaticSyncRef.current = pendingSignature;
    void triggerSyncAll();
  }, [isOnline, pendingSignature, triggerSyncAll, user?.id]);

  const injectDuplicatePayload = useCallback(() => {
    if (syncedHarvests.length === 0) {
      addLog('Create a sourcing record before running the duplicate test.', 'error');
      return;
    }
    const source = syncedHarvests[0];
    setOfflineQueue(previous => [...previous, { uuid: source.idempotent_uuid, type: 'HARVEST', action: 'CREATE', payload: source, offline_created_at: source.offline_created_at, status: 'PENDING' }]);
    addLog(`Duplicate test queued for record ${source.idempotent_uuid.substring(0, 8)}.`, 'warn');
  }, [addLog, setOfflineQueue, syncedHarvests]);

  const handleResetData = useCallback(() => {
    if (!confirm('Reset this device to the initial demonstration records?')) return;
    setSyncedHarvests(HISTORICAL_HARVESTS);
    setSyncedBatches(HISTORICAL_BATCHES);
    setSyncedConsignments(HISTORICAL_CONSIGNMENTS);
    setOfflineQueue([]);
    addLog('Local demonstration records restored.', 'info');
  }, [addLog, setOfflineQueue, setSyncedBatches, setSyncedConsignments, setSyncedHarvests]);

  const handleClearQueueLogs = useCallback(() => {
    setOfflineQueue(previous => previous.filter(item => item.status === 'PENDING'));
    addLog('Completed synchronization entries cleared.', 'info');
  }, [addLog, setOfflineQueue]);

  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify({ version: '1.0-akudha', export_timestamp: new Date().toISOString(), harvester_ledger: syncedHarvests, processing_batches: syncedBatches, vendor_consignments: syncedConsignments, offline_sync_queue: offlineQueue }, null, 2);
    const link = document.createElement('a');
    link.href = `data:text/json;charset=utf-8,${encodeURIComponent(data)}`;
    link.download = `akudha-operations-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    addLog('Local operational records exported.', 'success');
  }, [addLog, offlineQueue, syncedBatches, syncedConsignments, syncedHarvests]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/', true);
  }, [logout, navigate]);

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center bg-canvas px-6"><div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-feature bg-ink text-brand-soft"><Leaf className="h-7 w-7" /></span><p className="mt-4 font-display text-xl font-semibold text-ink">Opening Akudha…</p></div></div>;
  }

  if (pathname === '/') {
    return <LandingPage onGetStarted={() => navigate(user ? '/app' : '/sign-in')} />;
  }

  if (!user) {
    const loginDestination = isAppPath ? pathname : '/app';
    return <div className="min-h-screen bg-canvas"><div className="mx-auto flex min-h-screen max-w-6xl items-center px-6"><div className="max-w-lg"><span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-brand-strong"><Leaf className="h-4 w-4" /> Akudha Enterprises</span><h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Your operations workspace.</h1><p className="mt-4 text-lg leading-8 text-ink-muted">Sign in to manage products, inventory, sourcing, processing, distribution and label printing.</p></div></div><LoginOverlay open onLogin={login} onDemoLogin={loginDemo} onAuthenticated={() => navigate(loginDestination, true)} onClose={() => navigate('/', true)} /></div>;
  }

  const pendingCount = offlineQueue.filter(item => item.status !== 'SYNCED').length;
  const operationalOverview = currentRoute === 'harvest' || currentRoute === 'process' || currentRoute === 'distribute';
  const shellSyncState = user.id === 'local-demo' ? 'offline' as const
    : !isOnline ? (pendingCount > 0 || catalogue.syncStatus === 'pending' ? 'waiting' as const : 'offline' as const)
      : catalogue.syncStatus === 'syncing' ? 'syncing' as const
        : catalogue.syncStatus === 'error' || serverAvailable === false ? 'attention' as const
          : pendingCount > 0 || catalogue.syncStatus === 'pending' ? 'waiting' as const
            : serverAvailable === null || catalogue.syncStatus === 'loading' ? 'checking' as const
              : 'saved' as const;
  const syncEverything = () => { void Promise.all([triggerSyncAll(), catalogue.syncNow(true)]); };

  return <AppShell user={user} route={currentRoute} isOnline={isOnline} serverAvailable={serverAvailable} syncState={shellSyncState} onNavigate={navigate} onSync={syncEverything} onLogout={handleLogout}>
    {currentRoute === 'home' && <OperationsHome user={user} pendingCount={pendingCount} isOnline={isOnline} metrics={inventory} onNavigate={navigate} />}

    {operationalOverview && <div className="mb-6"><DashboardCards rawPulpStockKg={inventory.rawPulpStockKg} processedSachetsStock={inventory.processedSachetsStock} totalEthicalPayoutUSD={inventory.totalEthicalPayoutUSD} totalVendorRevenueUSD={inventory.totalVendorRevenueUSD} totalHarvestedKg={inventory.totalHarvestedKg} totalSachetsDistributed={inventory.totalSachetsDistributed} totalSachetsSold={inventory.totalSachetsSold} /></div>}
    {operationalOverview && <OperationalTraceability harvests={syncedHarvests} batches={syncedBatches} consignments={syncedConsignments} queue={offlineQueue} onNavigate={navigate} />}

    {currentRoute === 'inventory' && <section className="rounded-feature border border-line bg-surface p-4 shadow-inset sm:p-6"><InventoryPanel catalogue={catalogue} /></section>}
    {currentRoute === 'harvest' && <div className="space-y-6"><section className="rounded-feature border border-line bg-surface p-5 shadow-inset sm:p-6"><SourcingPanel syncedHarvests={syncedHarvests} isOnline={isOnline} onAddHarvest={record => { setSyncedHarvests(previous => [record, ...previous]); queueOffline({ uuid: record.idempotent_uuid, type: 'HARVEST', action: 'CREATE', payload: record, offline_created_at: record.offline_created_at, status: 'PENDING' }); }} onQueueOffline={queueOffline} onAddLog={addLog} /></section><RegionalAnalytics syncedHarvests={syncedHarvests} offlineQueue={offlineQueue} /></div>}
    {currentRoute === 'process' && <section className="rounded-feature border border-line bg-surface p-5 shadow-inset sm:p-6"><ProcessingPanel syncedBatches={syncedBatches} rawPulpStockKg={inventory.rawPulpStockKg} isOnline={isOnline} onAddBatch={record => { setSyncedBatches(previous => [record, ...previous]); queueOffline({ uuid: record.idempotent_uuid, type: 'PROCESSING', action: 'CREATE', payload: record, offline_created_at: record.offline_created_at, status: 'PENDING' }); }} onQueueOffline={queueOffline} onAddLog={addLog} /></section>}
    {currentRoute === 'distribute' && <section className="rounded-feature border border-line bg-surface p-5 shadow-inset sm:p-6"><DistributionPanel syncedConsignments={syncedConsignments} processedSachetsStock={inventory.processedSachetsStock} isOnline={isOnline} onAddConsignment={record => { setSyncedConsignments(previous => [record, ...previous]); queueOffline({ uuid: record.idempotent_uuid, type: 'CONSIGNMENT', action: 'CREATE', payload: record, offline_created_at: record.offline_created_at, status: 'PENDING' }); }} onQueueOffline={queueOffline} onAddLog={addLog} /></section>}
    {currentRoute === 'operations' && <OperationsPage offlineQueue={offlineQueue} logs={logs} onClearLogs={handleClearQueueLogs} onExport={handleExportJSON} onReset={handleResetData} onInjectDuplicate={injectDuplicatePayload} catalogue={catalogue} />}
  </AppShell>;
}
