import { AlertTriangle, ArrowRight, Check, CloudOff, Sprout, Factory, Truck } from 'lucide-react';
import type { HarvesterRecord, OutboundConsignment, ProcessingBatch, SyncPayload } from '../types';
import type { AppRoute } from '../lib/appRoutes';

interface Props {
  harvests: HarvesterRecord[];
  batches: ProcessingBatch[];
  consignments: OutboundConsignment[];
  queue: SyncPayload[];
  onNavigate: (path: string) => void;
}

const newest = <T extends { offline_created_at: string }>(items: T[]) => [...items].sort((a, b) => b.offline_created_at.localeCompare(a.offline_created_at))[0];

export function OperationalTraceability({ harvests, batches, consignments, queue, onNavigate }: Props) {
  const harvest = newest(harvests);
  const batch = newest(batches);
  const consignment = newest(consignments);
  const pending = queue.filter(item => item.status !== 'SYNCED');
  const anomalies = batches.filter(item => item.is_anomalous);
  const stages: Array<{ route: AppRoute; title: string; id: string; detail: string; ready: boolean; icon: typeof Sprout }> = [
    { route: 'harvest', title: 'Sourced', id: harvest?.idempotent_uuid.slice(0, 8).toUpperCase() || 'No record', detail: harvest ? `${harvest.raw_weight_kg.toFixed(1)} kg · ${harvest.region}` : 'Record a harvest', ready: !!harvest, icon: Sprout },
    { route: 'process', title: 'Processed', id: batch?.batch_id || 'No batch', detail: batch ? `${batch.total_175ml_sachets_produced} sachets · ${batch.yield_ratio}/kg` : 'Record a processing batch', ready: !!batch, icon: Factory },
    { route: 'distribute', title: 'Dispatched', id: consignment?.consignment_id || 'No dispatch', detail: consignment ? `${consignment.sachets_dispatched} units · ${consignment.vendor_name}` : 'Create a consignment', ready: !!consignment, icon: Truck },
  ];
  const work = [
    ...(anomalies.length ? [{ title: `${anomalies.length} yield ${anomalies.length === 1 ? 'variance' : 'variances'} to review`, owner: 'Processing admin', route: 'process' as AppRoute, tone: 'warning' }] : []),
    ...(pending.length ? [{ title: `${pending.length} ${pending.length === 1 ? 'record is' : 'records are'} waiting to sync`, owner: 'Operations admin', route: 'operations' as AppRoute, tone: 'warning' }] : []),
  ];

  return <section className="ops-trace" aria-labelledby="traceability-title">
    <div className="ops-trace__heading"><div><p className="ops-kicker">CURRENT OPERATING SEQUENCE</p><h2 id="traceability-title">From source to dispatch</h2><p>Latest records from each stage. Stage identifiers remain independent until explicit source links are added.</p></div><span className="ops-status-pill"><Check size={14} /> {work.length ? `${work.length} item${work.length === 1 ? '' : 's'} need attention` : 'Flow is clear'}</span></div>
    <div className="ops-trace__flow">{stages.map((stage, index) => { const Icon = stage.icon; return <div className="ops-trace__stage" key={stage.route}><button type="button" onClick={() => onNavigate(`/app/${stage.route === 'harvest' ? 'sourcing' : stage.route === 'process' ? 'processing' : 'distribution'}`)}><span className="ops-trace__icon"><Icon size={18} /></span><span><small>{stage.title}</small><strong>{stage.id}</strong><em>{stage.detail}</em></span></button>{index < stages.length - 1 && <ArrowRight className="ops-trace__arrow" size={18} aria-hidden="true" />}</div>})}</div>
    <div className="ops-work"><h3>Action queue</h3>{work.length === 0 ? <p className="ops-work__empty"><Check size={16} /> No yield or synchronization exceptions need action.</p> : work.map(item => <button type="button" key={item.title} onClick={() => onNavigate(`/app/${item.route === 'process' ? 'processing' : 'operations'}`)}><span>{item.tone === 'warning' ? <AlertTriangle size={17} /> : <CloudOff size={17} />}</span><span><strong>{item.title}</strong><small>Owner: {item.owner}</small></span><ArrowRight size={16} /></button>)}</div>
  </section>;
}
