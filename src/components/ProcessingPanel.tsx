import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, AlertCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { ProcessingBatch, SyncPayload } from '../types';
import { calculateYield } from '../lib/yield';
import { validateVaultLimit } from '../lib/validation';
import { usePermission } from '../hooks/useAuth';
import { PermissionGate } from './auth/PermissionGate';
import { Role } from '../types/auth';

interface ProcessingPanelProps {
  syncedBatches: ProcessingBatch[];
  rawPulpStockKg: number;
  isOnline: boolean;
  onAddBatch: (batch: ProcessingBatch) => void;
  onQueueOffline: (payload: SyncPayload) => void;
  onAddLog: (text: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export function ProcessingPanel({ syncedBatches, rawPulpStockKg, isOnline, onAddBatch, onQueueOffline, onAddLog }: ProcessingPanelProps) {
  const { canEdit, canSee, role } = usePermission('processing');
  const [rawWeight, setRawWeight] = useState('25.0');
  const [sachetsProduced, setSachetsProduced] = useState('250');
  const [formError, setFormError] = useState<string | null>(null);

  const yieldResult = calculateYield(parseFloat(rawWeight) || 0, parseInt(sachetsProduced) || 0);
  const canCreate = canEdit('batch_id');
  const isStockOnly = role === Role.DISTRIBUTION_MANAGER;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const rawInput = parseFloat(rawWeight);
    const sachets = parseInt(sachetsProduced);

    if (isNaN(rawInput) || isNaN(sachets) || rawInput <= 0 || sachets < 0) {
      setFormError('State mutation rejected: Weight and sachet production must be positive numeric values.');
      return;
    }

    const vaultError = validateVaultLimit(rawInput, rawPulpStockKg, 'Processing');
    if (vaultError) {
      setFormError(vaultError);
      onAddLog(`Validation Reject: processing weight (${rawInput}kg) exceeds current vault stock (${rawPulpStockKg}kg).`, 'error');
      return;
    }

    const newBatch: ProcessingBatch = {
      batch_id: `B-${Math.floor(100 + Math.random() * 900)}`,
      raw_weight_kg: rawInput,
      total_175ml_sachets_produced: sachets,
      date_processed: new Date().toISOString().split('T')[0],
      idempotent_uuid: `proc_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      offline_created_at: new Date().toISOString(),
      is_synced: isOnline,
      yield_ratio: yieldResult.ratio,
      is_anomalous: yieldResult.isAnomalous,
      waste_percentage: yieldResult.wastePercentage,
    };

    if (isOnline) {
      onAddBatch(newBatch);
      onAddLog(`REST API: Success POST /api/batches with UUID: [${newBatch.idempotent_uuid.substring(0, 8)}...]`, 'success');
    } else {
      onQueueOffline({
        uuid: newBatch.idempotent_uuid,
        type: 'PROCESSING',
        action: 'CREATE',
        payload: newBatch,
        offline_created_at: newBatch.offline_created_at,
        status: 'PENDING',
      });
      onAddLog(`ServiceWorker: Queued Processing Batch offline. UUID: ${newBatch.idempotent_uuid.substring(0, 8)}`, 'warn');
    }

    if (yieldResult.isAnomalous) {
      onAddLog(`YIELD DEVIATION DETECTED: Batch yield is ${yieldResult.ratio.toFixed(1)} sachets/kg (${yieldResult.deviationPercent.toFixed(1)}% variance). Flagged in Zimbabwean Ledger.`, 'warn');
    } else {
      onAddLog(`Transformation Bridge: Success. Processed ${rawInput} kg pulp into ${sachets} sachets.`, 'success');
    }

    setRawWeight('0');
    setSachetsProduced('0');
  };

  if (isStockOnly) {
    const totalSachets = syncedBatches.reduce((sum, b) => sum + b.total_175ml_sachets_produced, 0);
    return (
      <div id="processing-bridge-panel">
        <div className="mb-6">
          <h3 className="font-display text-lg font-bold text-charcoal-900">Vault Stock Overview</h3>
          <p className="text-xs text-charcoal-700">Read-only view of processing vault stock for dispatch planning.</p>
        </div>
        <div className="rounded-xl border border-charcoal-200 bg-charcoal-50 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Raw Pulp Stock</span>
              <span className="font-mono text-2xl font-bold text-charcoal-900">{rawPulpStockKg.toFixed(1)} <span className="text-sm">kg</span></span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Total Sachets Produced</span>
              <span className="font-mono text-2xl font-bold text-emerald-700">{totalSachets} <span className="text-sm">units</span></span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Available for Dispatch</span>
              <span className="font-mono text-2xl font-bold text-ochre-600">{totalSachets} <span className="text-sm">units</span></span>
            </div>
          </div>
          <p className="mt-4 text-xs text-charcoal-500 text-center">Processing details are managed by the processing admin team.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="processing-bridge-panel">
      <div className="mb-6">
        <h3 className="font-display text-lg font-bold text-charcoal-900">Physical Sachet Conversion (The Transformation Bridge)</h3>
        <p className="text-xs text-charcoal-700">Govern the physical conversion of raw baobab pulp inventory into consumer sachet beverage stocks.</p>
      </div>

      {canCreate && (
        <form onSubmit={handleSubmit} className="space-y-4" id="processing-mutation-form">
          <AnimatePresence>
            {formError && (
              <motion.div
                className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 flex items-start gap-2"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div><span className="font-bold">CONVERSION REFUSED:</span> {formError}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Raw Material Pulp Depleted *</label>
              <input type="number" step="0.1" value={rawWeight} onChange={(e) => setRawWeight(e.target.value)}
                className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none" />
              <p className="mt-1 text-[10px] text-charcoal-700">Available: <strong>{rawPulpStockKg.toFixed(1)} kg</strong></p>
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Produced 175ml Sachets *</label>
              <input type="number" value={sachetsProduced} onChange={(e) => setSachetsProduced(e.target.value)}
                className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none" />
              <p className="mt-1 text-[10px] text-gray-500">Target yield: <strong>{((parseFloat(rawWeight) || 0) * 10).toFixed(0)} units</strong></p>
            </div>

            <div className="sm:col-span-2">
              <div className={`rounded-xl border p-4 transition-colors ${yieldResult.isAnomalous ? 'bg-amber-50 border-amber-300' : 'bg-charcoal-50 border-charcoal-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Yield Audit Diagnostics</span>
                  {yieldResult.isAnomalous && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-charcoal-950 px-2 py-0.5 rounded uppercase">
                      <AlertTriangle className="h-3 w-3" /> Yield Variance Warning
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                    <span className="text-[10px] text-gray-500 uppercase block">Yield Ratio</span>
                    <span className="font-mono text-lg font-bold text-charcoal-900">{yieldResult.ratio || 0}</span>
                    <span className="text-[10px] text-gray-500 block">sachets per 1kg pulp</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                    <span className="text-[10px] text-gray-500 uppercase block">Variance Benchmark</span>
                    <span className={`font-mono text-lg font-bold block ${yieldResult.deviationPercent === 0 ? 'text-charcoal-900' : yieldResult.deviationPercent > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {yieldResult.deviationPercent > 0 ? `+${yieldResult.deviationPercent}` : yieldResult.deviationPercent}%
                    </span>
                    <span className="text-[10px] text-gray-500 block">deviation from 10x baseline</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-charcoal-200 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 uppercase block">Process Quality Status</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${yieldResult.isAnomalous ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="font-mono text-xs font-bold uppercase">{yieldResult.isAnomalous ? 'Anomalous Waste' : 'Optimum Yield'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-xs font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase tracking-wider">
            <Plus className="h-4 w-4" />
            Commit Processing Batch to {isOnline ? 'Direct Cloud Ledger' : 'Local Offline Queue'}
          </button>
        </form>
      )}

      <div className="mt-8">
        <h4 className="font-display font-semibold text-charcoal-900 mb-4">Historical Processing Batches</h4>
        <div className="overflow-x-auto rounded-lg border border-charcoal-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-charcoal-50 text-charcoal-900 uppercase font-mono tracking-widest text-[10px]">
              <tr><th className="px-4 py-3">Batch ID</th><th className="px-4 py-3">Raw</th><th className="px-4 py-3">Sachets</th><PermissionGate panel="processing" field="yield_ratio"><th className="px-4 py-3">Yield</th></PermissionGate><PermissionGate panel="processing" field="waste_percentage"><th className="px-4 py-3">Waste</th></PermissionGate><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-charcoal-200">
              {syncedBatches.map((b, i) => (
                <tr key={i} className="hover:bg-charcoal-50">
                  <td className="px-4 py-3 font-mono font-semibold text-charcoal-900">{b.batch_id}</td>
                  <td className="px-4 py-3">{b.raw_weight_kg.toFixed(1)} kg</td>
                  <td className="px-4 py-3 font-bold">{b.total_175ml_sachets_produced} units</td>
                  <PermissionGate panel="processing" field="yield_ratio" fallback={<td className="px-4 py-3 text-charcoal-300"><EyeOff className="h-3 w-3 inline" /></td>}>
                    <td className="px-4 py-3 font-mono">{b.yield_ratio} / kg</td>
                  </PermissionGate>
                  <PermissionGate panel="processing" field="waste_percentage" fallback={<td className="px-4 py-3 text-charcoal-300"><EyeOff className="h-3 w-3 inline" /></td>}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.is_anomalous ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-50 text-emerald-800'}`}>
                        {b.is_anomalous ? 'ANOMALOUS' : 'OPTIMAL'}
                      </span>
                    </td>
                  </PermissionGate>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 font-mono text-[10px] uppercase font-semibold ${b.is_synced ? 'text-emerald-500' : 'text-amber-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${b.is_synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {b.is_synced ? 'Synced' : 'Offline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
