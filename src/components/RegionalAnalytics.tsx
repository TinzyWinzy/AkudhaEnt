import { HarvesterRecord, SyncPayload } from '../types';
import { ZIM_REGIONS } from '../constants';

interface RegionalAnalyticsProps {
  syncedHarvests: HarvesterRecord[];
  offlineQueue: SyncPayload[];
}

export function RegionalAnalytics({ syncedHarvests, offlineQueue }: RegionalAnalyticsProps) {
  return (
    <div className="mt-8 rounded-xl border border-charcoal-200 bg-white p-6 shadow-sm" id="zimbabwe-regional-analytics">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-charcoal-900">Zimbabwe dryland districts sourcing analytics</h3>
          <p className="text-xs text-charcoal-700">Daily premium aggregation volumes tracked across designated baobab ecological collection sectors.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-ochre-500"></span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-charcoal-800">Target: 50.0 KG</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5" id="regional-charts-container">
        {ZIM_REGIONS.map(region => {
          const regionWeight = syncedHarvests.filter(h => h.region === region).reduce((sum, h) => sum + h.raw_weight_kg, 0);
          const pendingWeight = offlineQueue.filter(q => q.status === 'PENDING' && q.type === 'HARVEST' && q.payload.region === region).reduce((sum, q) => sum + q.payload.raw_weight_kg, 0);
          const totalRegionWeight = regionWeight + pendingWeight;
          const percentOfTarget = Math.round((totalRegionWeight / 300) * 100);
          return (
            <div key={region} className="rounded-lg bg-charcoal-50 p-4 border border-charcoal-200">
              <div className="flex justify-between items-start mb-1 text-xs">
                <span className="font-bold text-charcoal-900">{region}</span>
                <span className="font-mono font-bold text-ochre-700 text-[10.5px]">{percentOfTarget}%</span>
              </div>
              <div className="font-display font-bold text-lg text-charcoal-900 mt-2">{totalRegionWeight.toFixed(1)} <span className="font-sans font-medium text-xs text-gray-500">KG</span></div>
              <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden mt-3">
                <div className="bg-ochre-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(8, percentOfTarget))}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500 border-t border-charcoal-100 pt-2 font-mono">
                <span>Pending:</span>
                <span className={pendingWeight > 0 ? 'text-amber-600 font-bold' : 'text-gray-400'}>{pendingWeight.toFixed(1)} kg</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
