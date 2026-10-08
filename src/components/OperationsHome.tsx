import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, ClipboardList, Factory, Truck, WifiOff } from 'lucide-react';
import { Role, type UserClaims } from '../types/auth';
import { APP_ROUTE_PATH, type AppRoute } from '../lib/appRoutes';
import { OpsQueuePanel } from './OpsQueuePanel';

interface Metrics {
  rawPulpStockKg: number;
  processedSachetsStock: number;
  totalHarvestedKg: number;
  totalSachetsDistributed: number;
}

interface OperationsHomeProps {
  user: UserClaims;
  pendingCount: number;
  isOnline: boolean;
  metrics: Metrics;
  onNavigate: (path: string) => void;
}

const actions: Array<{ route: AppRoute; label: string; detail: string; icon: typeof Boxes; roles: Role[] }> = [
  { route: 'inventory', label: 'Manage inventory', detail: 'Products, lots, stock movements and labels', icon: Boxes, roles: [Role.PROCESSING_ADMIN, Role.DISTRIBUTION_MANAGER, Role.SUPER_ADMIN] },
  { route: 'harvest', label: 'Record sourcing', detail: 'Capture a harvest and verify its quality', icon: ClipboardList, roles: Object.values(Role) },
  { route: 'process', label: 'Record processing', detail: 'Convert pulp and review yield', icon: Factory, roles: [Role.PROCESSING_ADMIN, Role.DISTRIBUTION_MANAGER, Role.SUPER_ADMIN] },
  { route: 'distribute', label: 'Manage distribution', detail: 'Dispatch stock and record returns', icon: Truck, roles: [Role.PROCESSING_ADMIN, Role.DISTRIBUTION_MANAGER, Role.SUPER_ADMIN] },
];

export function OperationsHome({ user, pendingCount, isOnline, metrics, onNavigate }: OperationsHomeProps) {
  const firstName = user.name.split(/\s+/, 1)[0];
  const visibleActions = actions.filter(item => item.roles.includes(user.role));
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-feature border border-line bg-ink px-6 py-8 text-white shadow-frost sm:px-8 sm:py-10">
      <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_70%_40%,rgba(218,164,103,.22),transparent_62%)] sm:block" aria-hidden="true" />
      <div className="relative max-w-2xl"><p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-brand-soft">Today at Akudha</p><h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Good day, {firstName}.</h1><p className="mt-3 max-w-xl text-base leading-7 text-white/75">Review the work that needs attention, then continue with your assigned operations.</p></div>
    </section>

    <section aria-labelledby="attention-heading">
      <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand-strong">Work queue</p><h2 id="attention-heading" className="font-display text-2xl font-semibold">Needs attention</h2></div></div>
      <div className="grid gap-3 md:grid-cols-2">
        {pendingCount > 0 ? <article className="flex items-start gap-4 rounded-surface border border-status-warning/25 bg-status-warning-soft p-5"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning-ink" /><div><h3 className="font-semibold">{pendingCount} record{pendingCount === 1 ? '' : 's'} waiting to sync</h3><p className="mt-1 text-sm leading-6 text-ink-muted">{isOnline ? 'The connection is available and the queue can be retried.' : 'Your work is safe on this device and will sync when the connection returns.'}</p></div></article> : <article className="flex items-start gap-4 rounded-surface border border-status-success/20 bg-status-success-soft p-5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-success" /><div><h3 className="font-semibold">Records are up to date</h3><p className="mt-1 text-sm leading-6 text-ink-muted">There are no pending sourcing, processing or distribution records.</p></div></article>}
        {!isOnline && <article className="flex items-start gap-4 rounded-surface border border-line bg-surface p-5"><WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" /><div><h3 className="font-semibold">Working offline</h3><p className="mt-1 text-sm leading-6 text-ink-muted">You can continue capturing work. Akudha will synchronize it after reconnection.</p></div></article>}
      </div>
    </section>

    <section aria-labelledby="continue-heading">
      <div className="mb-4"><p className="text-sm font-semibold text-brand-strong">Workspace</p><h2 id="continue-heading" className="font-display text-2xl font-semibold">Continue your work</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{visibleActions.map(item => { const Icon = item.icon; return <button key={item.route} type="button" onClick={() => onNavigate(APP_ROUTE_PATH[item.route])} className="group min-h-40 rounded-surface border border-line bg-surface p-5 text-left shadow-inset transition-colors hover:border-brand/45 hover:bg-brand-soft focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand"><span className="mb-6 grid h-11 w-11 place-items-center rounded-control bg-surface-muted text-brand-strong"><Icon className="h-5 w-5" /></span><span className="flex items-center justify-between gap-3"><strong className="font-display text-lg font-semibold">{item.label}</strong><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span><span className="mt-2 block text-sm leading-6 text-ink-muted">{item.detail}</span></button>; })}</div>
    </section>

    <section aria-label="Operational overview" className="grid overflow-hidden rounded-surface border border-line bg-surface sm:grid-cols-2 xl:grid-cols-4">
      {[['Raw pulp', metrics.rawPulpStockKg.toFixed(1), 'kg available'], ['Finished sachets', metrics.processedSachetsStock.toLocaleString(), 'units available'], ['Harvested', metrics.totalHarvestedKg.toFixed(1), 'kg recorded'], ['Distributed', metrics.totalSachetsDistributed.toLocaleString(), 'units dispatched']].map(([label, value, unit]) => <div key={label} className="border-b border-line p-5 last:border-0 sm:border-r xl:border-b-0"><span className="text-sm text-ink-muted">{label}</span><strong className="mt-2 block font-display text-3xl font-semibold tracking-tight">{value}</strong><span className="mt-1 block text-sm text-ink-muted">{unit}</span></div>)}
    </section>

    <OpsQueuePanel />
  </div>;
}
