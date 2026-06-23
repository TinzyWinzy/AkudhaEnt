import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { HarvesterRecord, SyncPayload, QualityGrade } from '../types';
import { INITIAL_HARVESTERS } from '../initialData';
import { ZIM_REGIONS, ETHICAL_BASE_PRICES } from '../constants';
import { validateEthicalPayout } from '../lib/pricing';
import { useAuth, usePermission } from '../hooks/useAuth';
import { PermissionGate, RegionMask } from './auth/PermissionGate';
import { Role } from '../types/auth';

interface SourcingPanelProps {
  syncedHarvests: HarvesterRecord[];
  isOnline: boolean;
  onAddHarvest: (record: HarvesterRecord) => void;
  onQueueOffline: (payload: SyncPayload) => void;
  onAddLog: (text: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export function SourcingPanel({ syncedHarvests, isOnline, onAddHarvest, onQueueOffline, onAddLog }: SourcingPanelProps) {
  const { user } = useAuth();
  const { canEdit, isSuperAdmin } = usePermission('sourcing');
  const [harvesterId, setHarvesterId] = useState('H-001');
  const [region, setRegion] = useState(user?.region ?? 'Chimanimani');
  const [weight, setWeight] = useState('45.0');
  const [grade, setGrade] = useState<QualityGrade>(QualityGrade.A);
  const [payout, setPayout] = useState('67.50');
  const [autoPrice, setAutoPrice] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = user ? canEdit('harvester_id') : true;
  const isProcessingOnly = user?.role === Role.PROCESSING_ADMIN;

  useEffect(() => {
    if (autoPrice) {
      const w = parseFloat(weight) || 0;
      const rate = ETHICAL_BASE_PRICES[grade];
      setPayout((w * rate).toFixed(2));
    }
  }, [weight, grade, autoPrice]);

  useEffect(() => {
    if (user?.region) {
      setRegion(user.region);
    }
  }, [user?.region]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const harvester = INITIAL_HARVESTERS.find(h => h.id === harvesterId);
    const w = parseFloat(weight);
    const p = parseFloat(payout);

    if (!harvesterId || !region || isNaN(w) || isNaN(p)) {
      setFormError('State mutation rejected: Incomplete transaction data.');
      onAddLog('Validation Failure: Harvest transaction is missing mandated fields.', 'error');
      return;
    }
    if (w <= 0) {
      setFormError('Raw weight must be greater than 0 kg.');
      return;
    }

    const { valid, deficit, minimumRequired } = validateEthicalPayout(w, grade, p);
    if (!valid) {
      setFormError(`ETHICAL AUDIT FAILED: Payout ($${p.toFixed(2)} USD) is below the ethical premium floor in Zimbabwe for Grade ${grade} ($${minimumRequired.toFixed(2)} USD). Minimum missing stipend: $${deficit.toFixed(2)} USD.`);
      onAddLog(`Validation Error: Harvester payout does not meet ethical minimum. Payout rejected.`, 'error');
      return;
    }

    const newRecord: HarvesterRecord = {
      harvester_id: harvesterId,
      harvester_name: harvester?.name || 'Unknown',
      region,
      raw_weight_kg: w,
      quality_grade: grade,
      payout_amount_usd: p,
      idempotent_uuid: `harv_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      offline_created_at: new Date().toISOString(),
      is_synced: isOnline,
    };

    if (isOnline) {
      onAddHarvest(newRecord);
      onAddLog(`REST API: Success POST /api/harvests with UUID: [${newRecord.idempotent_uuid.substring(0, 8)}...]`, 'success');
    } else {
      onQueueOffline({
        uuid: newRecord.idempotent_uuid,
        type: 'HARVEST',
        action: 'CREATE',
        payload: newRecord,
        offline_created_at: newRecord.offline_created_at,
        status: 'PENDING',
      });
      onAddLog(`ServiceWorker: Intercepted offline POST. Indexed payload idempotently with UUID ${newRecord.idempotent_uuid.substring(0, 8)}`, 'warn');
    }

    setWeight('0');
    setPayout('0.00');
    onAddLog(`Inbound Sourced: Successfully recorded ${w} kg harvested in ${region}.`, 'success');
  };

  return (
    <div id="harvest-ledger-panel">
      <div className="mb-6">
        <h3 className="font-display text-lg font-bold text-charcoal-900">Inbound Baobab Sourcing (The Harvester Ledger)</h3>
        <p className="text-xs text-charcoal-700">
          {isProcessingOnly
            ? 'Read-only view of sourcing weights. Payout data is restricted.'
            : 'Record premium raw baobab fruit collections directly from rural regions in Zimbabwe.'}
        </p>
      </div>

      {canCreate && (
        <form onSubmit={handleSubmit} className="space-y-4" id="harvest-transaction-form">
          <AnimatePresence>
            {formError && (
              <motion.div
                className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 flex items-start gap-2"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">TRANSACTION REFUSED:</span> {formError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Harvester Profile ID *</label>
              <select value={harvesterId} onChange={(e) => setHarvesterId(e.target.value)}
                className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none">
                {INITIAL_HARVESTERS.map(h => (
                  <option key={h.id} value={h.id}>{h.id} - {h.name} ({h.region})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Harvest Sourcing Region *</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none">
                {user?.region
                  ? <option value={user.region}>{user.region}</option>
                  : ZIM_REGIONS.map(r => <option key={r} value={r}>{r}</option>)
                }
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Raw Sourced Weight (KG) *</label>
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Quality Grade *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(QualityGrade).map(g => (
                  <button key={g} type="button" onClick={() => setGrade(g)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all ${grade === g ? 'bg-ochre-500 border-ochre-600 text-charcoal-900 font-bold' : 'border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50'}`}>
                    <span className="block text-sm font-bold">Grade {g}</span>
                    <span className="text-[10px] block opacity-80">${ETHICAL_BASE_PRICES[g].toFixed(2)}/kg</span>
                  </button>
                ))}
              </div>
            </div>
            <PermissionGate panel="sourcing" field="payout_amount_usd">
              <div className="sm:col-span-2">
                <div className="rounded-xl bg-charcoal-50 border border-charcoal-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Harvester Financial Payout</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={autoPrice} onChange={(e) => setAutoPrice(e.target.checked)}
                        className="rounded text-ochre-500 focus:ring-ochre-500" />
                      <span className="text-xs font-medium text-charcoal-700">Auto-Calculate Ethical Premium</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <input type="number" step="0.01" disabled={autoPrice} value={payout} onChange={(e) => setPayout(e.target.value)}
                        className={`w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none ${autoPrice ? 'bg-charcoal-100 text-gray-500 cursor-not-allowed' : ''}`} />
                      <p className="mt-1 text-[10px] text-gray-500">
                        Ethical minimum: Grade {grade} at {(parseFloat(weight) || 0).toFixed(1)}kg * ${ETHICAL_BASE_PRICES[grade].toFixed(2)} = <strong>${((parseFloat(weight) || 0) * ETHICAL_BASE_PRICES[grade]).toFixed(2)} USD</strong>
                      </p>
                    </div>
                    <div className="flex flex-col justify-center border-l-0 sm:border-l border-charcoal-200 pl-0 sm:pl-4">
                      <span className="text-[11px] text-gray-500 uppercase tracking-widest block">Audit Status</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-mono text-xs font-bold text-emerald-700">Ethical Minimum Satisfied</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PermissionGate>
          </div>

          <button type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-xs font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase tracking-wider">
            <Plus className="h-4 w-4" />
            Commit Raw Harvest to {isOnline ? 'Direct Cloud Ledger' : 'Local Offline Queue'}
          </button>
        </form>
      )}

      {isProcessingOnly && (
        <div className="rounded-xl bg-charcoal-50 border border-charcoal-200 p-4 mb-6 flex items-center gap-3">
          <Eye className="h-5 w-5 text-charcoal-500" />
          <div>
            <p className="text-sm font-semibold text-charcoal-900">Read-Only Weights View</p>
            <p className="text-xs text-charcoal-600">Processing admins can verify sourcing weights for vault reconciliation. Payout data is not visible.</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display font-semibold text-charcoal-900">Recent Harvest Logs</h4>
          <span className="text-slate-500 font-mono text-[11px]">Database Count: {syncedHarvests.length} records</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-charcoal-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-charcoal-50 text-charcoal-900 uppercase font-mono tracking-widest text-[10px]">
              <tr>
                <th className="px-4 py-3">UUID</th>
                <th className="px-4 py-3">Harvester</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Payout</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-200">
              {syncedHarvests.map((h, i) => (
                <tr key={i} className="hover:bg-charcoal-50">
                  <RegionMask recordRegion={h.region}>
                    <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{h.idempotent_uuid.substring(0, 8)}...</td>
                    <td className="px-4 py-3 font-medium text-charcoal-900">{h.harvester_name}</td>
                    <td className="px-4 py-3">{h.region}</td>
                    <td className="px-4 py-3 font-semibold">{h.raw_weight_kg.toFixed(1)} kg</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.quality_grade === 'A' ? 'bg-amber-100 text-amber-800' : h.quality_grade === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>Grade {h.quality_grade}</span></td>
                    <PermissionGate panel="sourcing" field="payout_amount_usd" fallback={
                      <td className="px-4 py-3 font-bold text-charcoal-300 flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> masked
                      </td>
                    }>
                      <td className="px-4 py-3 font-bold text-emerald-700">${h.payout_amount_usd.toFixed(2)}</td>
                    </PermissionGate>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 font-mono text-[10px] uppercase font-semibold ${h.is_synced ? 'text-emerald-500' : 'text-amber-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${h.is_synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {h.is_synced ? 'Cloud' : 'Cached'}
                      </span>
                    </td>
                  </RegionMask>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
