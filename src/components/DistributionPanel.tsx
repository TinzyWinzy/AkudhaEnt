import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, AlertCircle, EyeOff } from 'lucide-react';
import { OutboundConsignment, SyncPayload } from '../types';
import { INITIAL_VENDORS, INITIAL_HUBS, INITIAL_DISPATCHERS } from '../initialData';
import { TARGET_MARGIN_MIN, TARGET_MARGIN_MAX, SACHET_RETAIL_PRICE, SACHET_VENDOR_COST } from '../constants';
import { calculateVendorMargins, validateConsignment } from '../lib/margins';
import { validateVaultLimit } from '../lib/validation';
import { usePermission } from '../hooks/useAuth';
import { PermissionGate } from './auth/PermissionGate';
import { Role } from '../types/auth';

interface DistributionPanelProps {
  syncedConsignments: OutboundConsignment[];
  processedSachetsStock: number;
  isOnline: boolean;
  onAddConsignment: (consignment: OutboundConsignment) => void;
  onQueueOffline: (payload: SyncPayload) => void;
  onAddLog: (text: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export function DistributionPanel({ syncedConsignments, processedSachetsStock, isOnline, onAddConsignment, onQueueOffline, onAddLog }: DistributionPanelProps) {
  const { canEdit, canSee, role } = usePermission('distribution');
  const [hubId, setHubId] = useState('HUB-HARARE');
  const [dispatcherId, setDispatcherId] = useState('DIS-09');
  const [vendorId, setVendorId] = useState('V-101');
  const [dispatched, setDispatched] = useState('80');
  const [returned, setReturned] = useState('2');
  const [sold, setSold] = useState('75');
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = canEdit('consignment_id');
  const isProcessingView = role === Role.PROCESSING_ADMIN;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const d = parseInt(dispatched);
    const r = parseInt(returned);
    const s = parseInt(sold);
    const vendorObj = INITIAL_VENDORS.find(v => v.vendor_id === vendorId);

    if (isNaN(d) || isNaN(r) || isNaN(s)) {
      setFormError('Distribution fields must contain valid whole numbers.');
      return;
    }

    const consignmentError = validateConsignment(s, r, d);
    if (consignmentError) {
      setFormError(consignmentError);
      return;
    }

    const vaultError = validateVaultLimit(d, processedSachetsStock, 'Dispatch request');
    if (vaultError) {
      setFormError(vaultError);
      onAddLog(`Validation Reject: Dispatched count (${d}) exceeds stock vault (${processedSachetsStock}).`, 'error');
      return;
    }

    const newConsignment: OutboundConsignment = {
      consignment_id: `C-${Math.floor(100 + Math.random() * 900)}`,
      hub_id: hubId,
      dispatcher_id: dispatcherId,
      vendor_id: vendorId,
      vendor_name: vendorObj?.name || 'Unknown Vendor',
      sachets_dispatched: d,
      sachets_returned_spoiled: r,
      sachets_sold: s,
      idempotent_uuid: `cons_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      offline_created_at: new Date().toISOString(),
      is_synced: isOnline,
    };

    if (isOnline) {
      onAddConsignment(newConsignment);
      onAddLog(`REST API: Success POST /api/consignments with UUID: [${newConsignment.idempotent_uuid.substring(0, 8)}...]`, 'success');
    } else {
      onQueueOffline({
        uuid: newConsignment.idempotent_uuid,
        type: 'CONSIGNMENT',
        action: 'CREATE',
        payload: newConsignment,
        offline_created_at: newConsignment.offline_created_at,
        status: 'PENDING',
      });
      onAddLog(`ServiceWorker: Intercepted offline dispatch. UUID: ${newConsignment.idempotent_uuid.substring(0, 8)}`, 'warn');
    }

    onAddLog(`Outbound Dispatched: Sent ${d} units to ${vendorObj?.name || 'Vendor'}.`, 'success');
    setDispatched('0');
    setReturned('0');
    setSold('0');
  };

  const margins = calculateVendorMargins(parseInt(dispatched) || 0, parseInt(sold) || 0, parseInt(returned) || 0);
  const sustenanceColor = margins.sustenanceLevel === 'target' ? 'text-emerald-700 bg-emerald-50 border border-emerald-300'
    : margins.sustenanceLevel === 'exceptional' ? 'text-purple-700 bg-purple-50 border border-purple-300'
    : 'text-amber-700 bg-amber-50 border border-amber-300';
  const sustenanceLabel = margins.sustenanceLevel === 'target' ? `Trophy Sustainable Daily Threshold Met ($${TARGET_MARGIN_MIN.toFixed(2)} - $${TARGET_MARGIN_MAX.toFixed(2)} range secured)`
    : margins.sustenanceLevel === 'exceptional' ? 'Fire Exceptional Daily Return (Target premium exceeded!)'
    : `Warning Below Daily Threshold (Goal: $${TARGET_MARGIN_MIN.toFixed(2)} - $${TARGET_MARGIN_MAX.toFixed(2)} USD)`;

  if (isProcessingView) {
    const totalDispatched = syncedConsignments.reduce((sum, c) => sum + c.sachets_dispatched, 0);
    return (
      <div id="vendor-hub-panel">
        <div className="mb-6">
          <h3 className="font-display text-lg font-bold text-charcoal-900">Dispatch Overview</h3>
          <p className="text-xs text-charcoal-700">Read-only view of total sachets dispatched from vault.</p>
        </div>
        <div className="rounded-xl border border-charcoal-200 bg-charcoal-50 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Available in Vault</span>
              <span className="font-mono text-2xl font-bold text-charcoal-900">{processedSachetsStock} <span className="text-sm">units</span></span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-charcoal-200 text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Total Dispatched to Vendors</span>
              <span className="font-mono text-2xl font-bold text-emerald-700">{totalDispatched} <span className="text-sm">units</span></span>
            </div>
          </div>
          <p className="mt-4 text-xs text-charcoal-500 text-center">Financial margin data is managed by the distribution team.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="vendor-hub-panel">
      <div className="mb-6">
        <h3 className="font-display text-lg font-bold text-charcoal-900">Consignment Sachet Ledger (The Vendor Hub)</h3>
        <p className="text-xs text-charcoal-700">Manage outbound consignment flow of baobab drinks assigned to the network of informal micro-vendors.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" id="distribution-consignment-form">
        <AnimatePresence>
          {formError && (
            <motion.div
              className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 flex items-start gap-2"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div><span className="font-bold">DISPATCH REFUSED:</span> {formError}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Depot Hub *</label>
            <select value={hubId} onChange={(e) => setHubId(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none">
              {INITIAL_HUBS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Dispatcher *</label>
            <select value={dispatcherId} onChange={(e) => setDispatcherId(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none">
              {INITIAL_DISPATCHERS.map(d => <option key={d.id} value={d.id}>{d.id} - {d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Micro-Vendor *</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm bg-white focus:border-ochre-500 focus:outline-none">
              {INITIAL_VENDORS.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_id} - {v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Dispatched *</label>
            <input type="number" value={dispatched} onChange={(e) => setDispatched(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none" />
            <p className="mt-1 text-[10px]">Stock: <strong>{processedSachetsStock} units</strong></p>
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Returned / Spoiled *</label>
            <input type="number" value={returned} onChange={(e) => setReturned(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-1">Sold *</label>
            <input type="number" value={sold} onChange={(e) => setSold(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm focus:border-ochre-500 focus:outline-none" />
          </div>

          <PermissionGate panel="distribution" field="grossCollectedUsd">
            <div className="sm:col-span-3">
              <div className="rounded-xl border border-charcoal-200 bg-charcoal-50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                    <span className="text-[10px] text-gray-500 uppercase block">Consumer Turnover</span>
                    <span className="font-mono text-base font-bold text-charcoal-900">${margins.grossCollectedUsd.toFixed(2)} USD</span>
                    <span className="text-[10px] text-gray-400 block">@${SACHET_RETAIL_PRICE.toFixed(2)} / unit</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Net Family Margin</span>
                    <span className="font-mono text-base font-bold text-emerald-700">${margins.netVendorMarginUsd.toFixed(2)} USD</span>
                    <span className="text-[10px] text-emerald-500 block">direct profit stipend</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-charcoal-200">
                    <span className="text-[10px] text-gray-500 uppercase block">Spoilage Loss</span>
                    <span className="font-mono text-base font-bold text-rose-700">-${margins.spoilageDebit.toFixed(2)} USD</span>
                    <span className="text-[10px] text-gray-400 block">{returned || 0} spoiled returns</span>
                  </div>
                  <div className={`p-3 rounded-lg flex flex-col justify-center ${sustenanceColor}`}>
                    <span className="text-[10px] font-bold uppercase block">Sustenance Audit</span>
                    <span className="font-mono text-[10.5px] font-bold leading-tight mt-0.5">{sustenanceLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </PermissionGate>
        </div>

        {canCreate && (
          <button type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-charcoal-900 py-3 text-xs font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase tracking-wider">
            <Plus className="h-4 w-4" />
            Commit Consignment Ledger to {isOnline ? 'Direct Cloud Ledger' : 'Local Offline Queue'}
          </button>
        )}
      </form>

      <div className="mt-8">
        <h4 className="font-display font-semibold text-charcoal-900 mb-4">Current Active Consignment Flow</h4>
        <div className="overflow-x-auto rounded-lg border border-charcoal-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-charcoal-50 text-charcoal-900 uppercase font-mono tracking-widest text-[10px]">
              <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Dispatched</th><th className="px-4 py-3">Returns</th><th className="px-4 py-3">Sold</th><PermissionGate panel="distribution" field="netVendorMarginUsd"><th className="px-4 py-3">Margin</th></PermissionGate><th className="px-4 py-3">State</th></tr>
            </thead>
            <tbody className="divide-y divide-charcoal-200">
              {syncedConsignments.map((c, i) => {
                const profit = (c.sachets_sold * 0.25) - (c.sachets_returned_spoiled * 0.25);
                return (
                  <tr key={i} className="hover:bg-charcoal-50">
                    <td className="px-4 py-3 font-mono text-charcoal-900">{c.consignment_id}</td>
                    <td className="px-4 py-3 font-semibold">{c.vendor_name}<span className="block text-[10px] text-gray-500">{c.hub_id}</span></td>
                    <td className="px-4 py-3 font-mono">{c.sachets_dispatched}</td>
                    <td className="px-4 py-3 font-mono text-rose-600">-{c.sachets_returned_spoiled}</td>
                    <td className="px-4 py-3 font-mono text-emerald-700 font-bold">{c.sachets_sold}</td>
                    <PermissionGate panel="distribution" field="netVendorMarginUsd" fallback={<td className="px-4 py-3 text-charcoal-300"><EyeOff className="h-3 w-3 inline" /></td>}>
                      <td className="px-4 py-3 font-bold">${profit.toFixed(2)}<span className={`block text-[10px] uppercase font-bold ${profit >= 6 ? 'text-emerald-600' : 'text-amber-500'}`}>{profit >= 6 ? 'Target Secure' : 'Below Baseline'}</span></td>
                    </PermissionGate>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 font-mono text-[10px] uppercase font-semibold ${c.is_synced ? 'text-emerald-500' : 'text-amber-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${c.is_synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {c.is_synced ? 'Synced' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
