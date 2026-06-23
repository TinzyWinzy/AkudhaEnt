import { useState, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, Download, Trash2, BookOpen } from 'lucide-react';
import { HarvesterRecord, ProcessingBatch, OutboundConsignment, SyncPayload } from './types';
import { HISTORICAL_HARVESTS, HISTORICAL_BATCHES, HISTORICAL_CONSIGNMENTS } from './initialData';
import { DEFAULT_SYNC_DELAY_MS, LOCALSTORAGE_KEYS } from './constants';
import { useLocalStorage, useInventory, useLogging } from './hooks';
import { Header, DashboardCards, TabNav, SourcingPanel, ProcessingPanel, DistributionPanel, SyncRegistry, PendingBanner, RegionalAnalytics, Terminal } from './components';
import { AiInsightsPanel } from './components/AiInsightsPanel';
import { LoginOverlay } from './components/auth';
import { useAuth } from './hooks/useAuth';
import { VISIBLE_TABS } from './lib/permissions';
import type { TabId } from './components';

export default function App() {
  const { user, login } = useAuth();
  const [syncedHarvests, setSyncedHarvests] = useLocalStorage<HarvesterRecord[]>(LOCALSTORAGE_KEYS.SYNCED_HARVESTS, HISTORICAL_HARVESTS);
  const [syncedBatches, setSyncedBatches] = useLocalStorage<ProcessingBatch[]>(LOCALSTORAGE_KEYS.SYNCED_BATCHES, HISTORICAL_BATCHES);
  const [syncedConsignments, setSyncedConsignments] = useLocalStorage<OutboundConsignment[]>(LOCALSTORAGE_KEYS.SYNCED_CONSIGNMENTS, HISTORICAL_CONSIGNMENTS);
  const [offlineQueue, setOfflineQueue] = useLocalStorage<SyncPayload[]>(LOCALSTORAGE_KEYS.OFFLINE_QUEUE, []);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [activeTab, setActiveTab] = useState<TabId>('harvest');
  const [showLogin, setShowLogin] = useState(true);
  const onlineRef = useRef(isOnline);

  useEffect(() => {
    if (user) {
      const allowed = VISIBLE_TABS[user.role] ?? ['harvest'];
      if (!allowed.includes(activeTab)) {
        setActiveTab(allowed[0] as TabId);
      }
    }
  }, [user, activeTab]);

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

  const [simulatedDelay, setSimulatedDelay] = useState<number>(DEFAULT_SYNC_DELAY_MS);
  const { logs, addLog } = useLogging([
    { time: new Date().toLocaleTimeString(), text: 'Akudha Agri-Logistics Engine Initialized.', type: 'info' },
    { time: new Date().toLocaleTimeString(), text: `Device is ${navigator.onLine ? 'online' : 'offline'}. Data stored in localStorage.`, type: 'info' }
  ]);

  const inventory = useInventory(syncedHarvests, syncedBatches, syncedConsignments, offlineQueue);

  const queueOffline = useCallback((payload: SyncPayload) => {
    setOfflineQueue(prev => [...prev, payload]);
  }, [setOfflineQueue]);

  const triggerSyncAll = useCallback(async () => {
    if (!isOnline) { addLog('Cannot sync: Engine is currently set to OFFLINE mode.', 'error'); return; }
    const pending = offlineQueue.filter(q => q.status === 'PENDING');
    if (pending.length === 0) { addLog('Sync completed: Queue has no pending items.', 'info'); return; }

    addLog(`Offline Sync requested. Syncing ${pending.length} payloads with ${simulatedDelay}ms network latency...`, 'info');

    for (const item of pending) {
      await new Promise(resolve => setTimeout(resolve, simulatedDelay));
      let alreadyExists = false;
      if (item.type === 'HARVEST') {
        alreadyExists = syncedHarvests.some(h => h.idempotent_uuid === item.uuid);
        if (!alreadyExists) setSyncedHarvests(prev => [{ ...item.payload, is_synced: true }, ...prev]);
      } else if (item.type === 'PROCESSING') {
        alreadyExists = syncedBatches.some(b => b.idempotent_uuid === item.uuid);
        if (!alreadyExists) setSyncedBatches(prev => [{ ...item.payload, is_synced: true }, ...prev]);
      } else if (item.type === 'CONSIGNMENT') {
        alreadyExists = syncedConsignments.some(c => c.idempotent_uuid === item.uuid);
        if (!alreadyExists) setSyncedConsignments(prev => [{ ...item.payload, is_synced: true }, ...prev]);
      }
      setOfflineQueue(prev => prev.map(p => p.uuid === item.uuid ? { ...p, status: 'SYNCED' as const } : p));
      addLog(alreadyExists ? `IDEMPOTENT DE-DUPLICATION: UUID [${item.uuid.substring(0, 8)}] was duplicate.` : `Sync Successful: ${item.type} [${item.uuid.substring(0, 8)}].`, alreadyExists ? 'warn' : 'success');
    }
  }, [isOnline, offlineQueue, syncedHarvests, syncedBatches, syncedConsignments, simulatedDelay, addLog, setSyncedHarvests, setSyncedBatches, setSyncedConsignments, setOfflineQueue]);

  const injectDuplicatePayload = useCallback(() => {
    if (syncedHarvests.length === 0) { addLog('Create a transaction first to duplicate.', 'error'); return; }
    const source = syncedHarvests[0];
    setOfflineQueue(prev => [...prev, {
      uuid: source.idempotent_uuid, type: 'HARVEST', action: 'CREATE', payload: source,
      offline_created_at: new Date().toISOString(), status: 'PENDING'
    }]);
    addLog(`Diagnostic: Injected duplicate payload of ${source.harvester_name} with UUID [${source.idempotent_uuid.substring(0, 8)}].`, 'warn');
  }, [syncedHarvests, setOfflineQueue, addLog]);

  const handleResetData = useCallback(() => {
    if (confirm('Restore databases to default benchmarks?')) {
      setSyncedHarvests(HISTORICAL_HARVESTS);
      setSyncedBatches(HISTORICAL_BATCHES);
      setSyncedConsignments(HISTORICAL_CONSIGNMENTS);
      setOfflineQueue([]);
      addLog('Databases reset to initial historical seed values.', 'info');
    }
  }, [setSyncedHarvests, setSyncedBatches, setSyncedConsignments, setOfflineQueue, addLog]);

  const handleClearQueueLogs = useCallback(() => {
    setOfflineQueue(prev => prev.filter(q => q.status === 'PENDING'));
    addLog('Cleared processed transaction logs from synchronization ledger.', 'info');
  }, [setOfflineQueue, addLog]);

  const handleExportJSON = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      version: "1.0-akudha", export_timestamp: new Date().toISOString(),
      harvester_ledger: syncedHarvests, processing_batches: syncedBatches,
      vendor_consignments: syncedConsignments, offline_sync_queue: offlineQueue
    }, null, 2));
    const a = document.createElement('a');
    a.href = dataStr; a.download = `akudha_logistics_backup_${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    addLog('Relational data package exported successfully.', 'success');
  }, [syncedHarvests, syncedBatches, syncedConsignments, offlineQueue, addLog]);

  const pendingCount = offlineQueue.filter(q => q.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-charcoal-50 font-sans text-charcoal-900 selection:bg-ochre-400 selection:text-white">
      <Header
        isOnline={isOnline}
        pendingCount={pendingCount}
        simulatedDelay={simulatedDelay}
        onToggleNetwork={() => { setIsOnline(!isOnline); addLog(`Network: Switched to ${!isOnline ? 'OFFLINE' : 'ONLINE'} mode.`, !isOnline ? 'warn' : 'info'); }}
        onSync={triggerSyncAll}
        onDelayChange={setSimulatedDelay}
      />

      {user && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-2">
          <div className="flex items-center justify-between bg-charcoal-50 border border-charcoal-200 rounded-lg px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-charcoal-900">{user.name}</span>
              {user.region && <span className="text-charcoal-600">| {user.region}</span>}
            </div>
            <button
              onClick={() => setShowLogin(true)}
              className="text-ochre-600 hover:text-ochre-800 font-bold uppercase tracking-wider text-[10px]"
            >
              Switch Role
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <DashboardCards
          rawPulpStockKg={inventory.rawPulpStockKg}
          processedSachetsStock={inventory.processedSachetsStock}
          totalEthicalPayoutUSD={inventory.totalEthicalPayoutUSD}
          totalVendorRevenueUSD={inventory.totalVendorRevenueUSD}
          totalHarvestedKg={inventory.totalHarvestedKg}
          totalSachetsDistributed={inventory.totalSachetsDistributed}
          totalSachetsSold={inventory.totalSachetsSold}
        />

        <PendingBanner pendingCount={pendingCount} isOnline={isOnline} onSync={triggerSyncAll} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="rounded-b-xl border-x border-b border-charcoal-200 bg-white p-6 shadow-sm min-h-[500px]">
              {activeTab === 'harvest' && (
                <SourcingPanel
                  syncedHarvests={syncedHarvests}
                  isOnline={isOnline}
                  onAddHarvest={(r) => setSyncedHarvests(prev => [r, ...prev])}
                  onQueueOffline={queueOffline}
                  onAddLog={addLog}
                />
              )}
              {activeTab === 'process' && (
                <ProcessingPanel
                  syncedBatches={syncedBatches}
                  rawPulpStockKg={inventory.rawPulpStockKg}
                  isOnline={isOnline}
                  onAddBatch={(b) => setSyncedBatches(prev => [b, ...prev])}
                  onQueueOffline={queueOffline}
                  onAddLog={addLog}
                />
              )}
              {activeTab === 'distribute' && (
                <DistributionPanel
                  syncedConsignments={syncedConsignments}
                  processedSachetsStock={inventory.processedSachetsStock}
                  isOnline={isOnline}
                  onAddConsignment={(c) => setSyncedConsignments(prev => [c, ...prev])}
                  onQueueOffline={queueOffline}
                  onAddLog={addLog}
                />
              )}
              {(activeTab === 'diagnostics' || activeTab === 'schemas') && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-lg font-bold text-charcoal-900">Database Controls &amp; Schema Viewer</h3>
                    <p className="text-xs text-charcoal-700">Verify structural integrity, export state, or reset data.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-charcoal-50 p-4 rounded-xl border border-charcoal-200">
                    <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                      <span className="block text-xs font-bold mb-1">State Export</span>
                      <p className="text-[11px] text-gray-500 mb-2">Export entire offline state as JSON backup.</p>
                      <button onClick={handleExportJSON} className="w-full flex items-center justify-center gap-1.5 bg-charcoal-900 text-white rounded py-1.5 px-3 text-xs font-bold hover:bg-ochre-500 hover:text-charcoal-900 transition-colors uppercase">
                        <Download className="h-3 w-3" /> Export
                      </button>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                      <span className="block text-xs font-bold mb-1">Reset Database</span>
                      <p className="text-[11px] text-gray-500 mb-2">Reset to initial seed data.</p>
                      <button onClick={handleResetData} className="w-full flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-300 text-rose-700 rounded py-1.5 px-3 text-xs font-bold hover:bg-rose-100 transition-colors uppercase">
                        <Trash2 className="h-3 w-3" /> Reset
                      </button>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                      <span className="block text-xs font-bold mb-1">Duplicate Injector</span>
                      <p className="text-[11px] text-gray-500 mb-2">Simulate network retry with existing UUID.</p>
                      <button onClick={injectDuplicatePayload} className="w-full flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-700 rounded py-1.5 px-3 text-xs font-bold hover:bg-amber-100 transition-colors uppercase">
                        <AlertTriangle className="h-3 w-3" /> Inject Duplicate
                      </button>
                    </div>
                  </div>
                  {activeTab === 'schemas' && (
                    <div className="border border-charcoal-200 rounded-xl overflow-hidden bg-white">
                      <div className="bg-charcoal-900 px-4 py-3 text-white flex justify-between items-center text-xs">
                        <span className="font-mono font-bold tracking-wider uppercase">Mongoose Schema Definitions</span>
                        <span className="text-[11px] text-ochre-400">Strict Validation</span>
                      </div>
                      <div className="p-4 bg-charcoal-950 font-mono text-[11px] text-amber-100/90 overflow-x-auto">
                        <div><span className="text-emerald-400">// 1. HarvesterRecord</span><pre className="mt-1">{`{ harvester_id, region, raw_weight_kg, quality_grade, payout_amount_usd, idempotent_uuid, offline_created_at }`}</pre></div>
                        <div className="border-t border-charcoal-800 pt-3 mt-3"><span className="text-emerald-400">// 2. ProcessingBatch</span><pre className="mt-1">{`{ batch_id, raw_weight_kg, total_175ml_sachets_produced, yield_ratio, is_anomalous, idempotent_uuid }`}</pre></div>
                        <div className="border-t border-charcoal-800 pt-3 mt-3"><span className="text-emerald-400">// 3. OutboundConsignment</span><pre className="mt-1">{`{ consignment_id, vendor_id, sachets_dispatched, sachets_returned_spoiled, sachets_sold, idempotent_uuid }`}</pre></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'backlog' && (
                <div className="text-center py-12 text-charcoal-500">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-ochre-400" />
                  <p className="font-display font-bold text-charcoal-900 mb-2">Agile Backlog</p>
                  <p className="text-xs">See <code className="font-mono bg-charcoal-100 px-1 rounded">Agile_Backlog.md</code> for full backlog with 6 user stories across 3 epics.</p>
                </div>
              )}
              {activeTab === 'ai' && <AiInsightsPanel />}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <SyncRegistry offlineQueue={offlineQueue} onClearLogs={handleClearQueueLogs} />
            <Terminal logs={logs} />
          </div>
        </div>

        <RegionalAnalytics syncedHarvests={syncedHarvests} offlineQueue={offlineQueue} />
      </main>

      <LoginOverlay open={showLogin} onLogin={login} onClose={() => setShowLogin(false)} />

      <footer className="bg-charcoal-900 text-charcoal-200 px-6 py-6 border-t border-charcoal-800 mt-12 text-center text-xs">
        <p className="font-display font-semibold tracking-wide">AKUDHA ENTERPRISES ZIMBABWE (PVT) LTD</p>
        <p className="mt-1 text-charcoal-400 max-w-xl mx-auto leading-relaxed">Stewardship-driven ecological raw baobab sourcing, value chain conversion, and informal trade expansion.</p>
        <p className="mt-4 font-mono text-[10px] text-charcoal-500">This system enforces ethical premium pricing protocols and sachet density metrics. All rights reserved.</p>
      </footer>
    </div>
  );
}
