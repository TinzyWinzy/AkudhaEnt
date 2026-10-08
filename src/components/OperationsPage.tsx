import { AlertTriangle, Database, Download, ShieldCheck, Trash2 } from 'lucide-react';
import type { LogEntry } from '../hooks/useLogging';
import type { SyncPayload } from '../types';
import { AiInsightsPanel } from './AiInsightsPanel';
import { SyncRegistry } from './SyncRegistry';
import { Terminal } from './Terminal';
import { InventoryMaintenance } from './InventoryMaintenance';
import type { useCatalogue } from '../hooks/useCatalogue';
import { StaffAccessPanel } from './StaffAccessPanel';

interface OperationsPageProps {
  offlineQueue: SyncPayload[];
  logs: LogEntry[];
  onClearLogs: () => void;
  onExport: () => void;
  onReset: () => void;
  onInjectDuplicate: () => void;
  catalogue: ReturnType<typeof useCatalogue>;
}

export function OperationsPage({ offlineQueue, logs, onClearLogs, onExport, onReset, onInjectDuplicate, catalogue }: OperationsPageProps) {
  return <div className="space-y-8">
    <header className="max-w-3xl"><p className="text-sm font-semibold text-brand-strong">Administrator workspace</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Operations and system health</h1><p className="mt-3 text-base leading-7 text-ink-muted">Review synchronization, inspect system activity and use protected maintenance tools.</p></header>

    <StaffAccessPanel />

    <section aria-labelledby="maintenance-title"><div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-control bg-brand-soft text-brand-strong"><ShieldCheck className="h-5 w-5" /></span><div><h2 id="maintenance-title" className="font-display text-2xl font-semibold">Maintenance tools</h2><p className="text-sm text-ink-muted">Actions in this section affect local operational data.</p></div></div>
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-surface border border-line bg-surface p-5"><Download className="h-5 w-5 text-brand-strong" /><h3 className="mt-4 font-semibold">Export local state</h3><p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">Download the sourcing, processing, distribution and queue records held on this device.</p><button type="button" onClick={onExport} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-ink px-4 text-sm font-semibold text-white hover:bg-brand-strong"><Download className="h-4 w-4" /> Export records</button></article>
        <article className="rounded-surface border border-line bg-surface p-5"><AlertTriangle className="h-5 w-5 text-status-warning-ink" /><h3 className="mt-4 font-semibold">Test duplicate handling</h3><p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">Queue a known identifier to verify that synchronization remains idempotent.</p><button type="button" onClick={onInjectDuplicate} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-status-warning/35 bg-status-warning-soft px-4 text-sm font-semibold text-status-warning-ink hover:bg-status-warning/15"><AlertTriangle className="h-4 w-4" /> Run test</button></article>
        <article className="rounded-surface border border-status-danger/20 bg-surface p-5"><Trash2 className="h-5 w-5 text-status-danger" /><h3 className="mt-4 font-semibold">Reset local records</h3><p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">Restore the local sourcing, processing and distribution records to their initial values.</p><button type="button" onClick={onReset} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-status-danger/25 bg-status-danger-soft px-4 text-sm font-semibold text-status-danger hover:bg-status-danger/10"><Trash2 className="h-4 w-4" /> Reset local data</button></article>
      </div>
      <div className="mt-3"><InventoryMaintenance catalogue={catalogue} /></div>
    </section>

    <section aria-labelledby="sync-title"><div className="mb-4"><h2 id="sync-title" className="font-display text-2xl font-semibold">Synchronization and activity</h2><p className="mt-1 text-sm text-ink-muted">Detailed records for diagnosing delayed or failed work.</p></div><div className="grid gap-5 xl:grid-cols-2"><SyncRegistry offlineQueue={offlineQueue} onClearLogs={onClearLogs} /><Terminal logs={logs} /></div></section>

    <section aria-labelledby="agents-title"><div className="mb-4"><h2 id="agents-title" className="font-display text-2xl font-semibold">Decision support</h2><p className="mt-1 text-sm text-ink-muted">Optional analysis tools for administrators.</p></div><div className="rounded-surface border border-line bg-surface p-5"><AiInsightsPanel /></div></section>

    <details className="rounded-surface border border-line bg-surface p-5"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 font-semibold"><Database className="h-5 w-5 text-brand-strong" /> Data structure reference</summary><div className="mt-4 overflow-x-auto rounded-control bg-ink p-4 font-mono text-sm leading-7 text-brand-soft"><p>HarvesterRecord: harvester, region, weight, grade, payout, idempotency ID</p><p>ProcessingBatch: batch, raw weight, output, yield, anomaly, idempotency ID</p><p>OutboundConsignment: consignment, vendor, dispatched, returned, sold, idempotency ID</p></div></details>
  </div>;
}
