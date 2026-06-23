import { useState } from 'react';
import { Wifi, FileJson, X } from 'lucide-react';
import { SyncPayload } from '../types';

interface SyncRegistryProps {
  offlineQueue: SyncPayload[];
  onClearLogs: () => void;
}

export function SyncRegistry({ offlineQueue, onClearLogs }: SyncRegistryProps) {
  const [inspectedPayload, setInspectedPayload] = useState<SyncPayload | null>(null);

  const pendingCount = offlineQueue.filter(q => q.status === 'PENDING').length;
  const syncedCount = offlineQueue.filter(q => q.status === 'SYNCED').length;

  return (
    <>
      <div className="rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="offline-sync-ledger-panel">
        <div className="flex items-center justify-between border-b border-charcoal-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ochre-500" />
            </span>
            <h3 className="font-display font-bold text-charcoal-900 text-sm">Service Worker Sync Registry</h3>
          </div>
        </div>

        {offlineQueue.length === 0 ? (
          <div className="py-8 text-center" id="empty-queue-display">
            <Wifi className="h-8 w-8 mx-auto text-charcoal-200 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-gray-500">All local service-worker cache synced successfully.</p>
            <p className="text-[10px] text-gray-400 mt-1">There are no pending transaction mutations.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1" id="queued-items-list">
            {offlineQueue.map((item, index) => {
              const statusColors = item.status === 'SYNCED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : item.status === 'FAILED' ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse';
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer ${inspectedPayload?.uuid === item.uuid ? 'ring-2 ring-ochre-500 border-transparent' : 'border-charcoal-100 hover:border-black/25'}`}
                  onClick={() => setInspectedPayload(item)}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded-[4px] font-mono font-bold tracking-wider text-[9px] uppercase ${item.type === 'HARVEST' ? 'bg-amber-100 text-amber-800' : item.type === 'PROCESSING' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{item.type}</span>
                      <span className="font-mono text-zinc-500">[{item.uuid.substring(0, 8)}]</span>
                    </div>
                    <span className={`px-1.5 py-0.3 rounded-full font-mono text-[9px] font-bold uppercase ${statusColors}`}>{item.status}</span>
                  </div>
                  <div className="text-[11.5px] text-charcoal-800 flex justify-between items-center">
                    <span className="font-medium truncate max-w-[200px]">
                      {item.type === 'HARVEST' && `Source raw ${item.payload.raw_weight_kg} kg pulp`}
                      {item.type === 'PROCESSING' && `Convert ${item.payload.raw_weight_kg} kg pulp`}
                      {item.type === 'CONSIGNMENT' && `Dispatch ${item.payload.sachets_dispatched} units to ${item.payload.vendor_name}`}
                    </span>
                    <span className="text-[9.5px] text-gray-500 shrink-0">{new Date(item.offline_created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {offlineQueue.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-charcoal-100 pt-3">
            <button onClick={onClearLogs} className="text-[10px] font-bold font-mono text-gray-500 hover:text-ochre-700 uppercase">Clear synced logs</button>
            <span className="text-[10.5px] font-mono text-charcoal-700">
              <strong>{pendingCount}</strong> queued &bull; <strong>{syncedCount}</strong> synced
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm" id="schema-payload-inspector">
        <div className="flex items-center gap-1.5 border-b border-charcoal-100 pb-3 mb-4">
          <FileJson className="h-4 w-4 text-charcoal-700" />
          <h3 className="font-display font-bold text-charcoal-900 text-sm">Service-Worker Intercepted JSON Payload</h3>
        </div>
        {inspectedPayload ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-zinc-500">Idempotency UUID: <strong className="text-charcoal-900 font-mono">{inspectedPayload.uuid}</strong></span>
              <button onClick={() => setInspectedPayload(null)} className="p-1 rounded hover:bg-charcoal-100 text-gray-500"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="rounded-lg bg-charcoal-950 p-3.5 font-mono text-[10.5px] text-emerald-400 overflow-x-auto border border-charcoal-200 max-h-[190px]">
              <pre>{JSON.stringify(inspectedPayload.payload, null, 2)}</pre>
            </div>
            <div className="text-[10.5px] text-gray-500 italic bg-amber-50 rounded p-2.5 border border-amber-200">
              <strong>Schema Verification Protocol:</strong> Matches central Mongoose distribution validation templates.
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <FileJson className="h-8 w-8 mx-auto text-charcoal-200 mb-2 stroke-[1.5]" />
            <p className="text-xs text-gray-500">No payload selected.</p>
            <p className="text-[10px] text-gray-400 mt-1">Select any queued transaction above to audit.</p>
          </div>
        )}
      </div>
    </>
  );
}
