import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ArrowUpCircle } from 'lucide-react';
import { apiFetch, readApiError } from '../lib/api';

interface OpsItem { key: string; kind: 'out-of-stock' | 'low-stock' | 'expiring'; name: string; detail: string; severity: 'critical' | 'warning'; acknowledgedBy?: string; acknowledgedAt?: string; escalatedTo?: string; escalatedAt?: string; note?: string }

const badge = { 'out-of-stock': 'Out of stock', 'low-stock': 'Low stock', expiring: 'Expiring' } as const;

export function OpsQueuePanel() {
  const [items, setItems] = useState<OpsItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await apiFetch('/api/ops');
      if (!res.ok) throw Error(await readApiError(res));
      setItems((await res.json() as { data: OpsItem[] }).data);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load the ops queue'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const act = async (path: 'ack' | 'escalate', key: string) => {
    const note = window.prompt('Optional note') ?? '';
    const to = path === 'escalate' ? window.prompt('Escalate to (manager name or hub)') || '' : undefined;
    if (path === 'escalate' && !to) return;
    const res = await apiFetch(`/api/ops/${path}`, { method: 'POST', body: JSON.stringify({ key, note, ...(to ? { to } : {}) }) });
    if (!res.ok) { setError(await readApiError(res)); return; }
    await load();
  };

  return <section aria-label="Ops queue" className="rounded-surface border border-line bg-surface p-5">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-brand-strong">Shared ops queue</p><h2 className="font-display text-xl font-semibold">Stock signals</h2></div><button type="button" onClick={() => void load()} className="rounded-control border border-line px-3 py-2 text-sm font-semibold">Refresh</button></div>
    {loading ? <p className="text-sm text-ink-muted">Loading…</p> : items.length === 0 ? <p className="flex items-center gap-2 text-sm text-ink-muted"><CheckCircle2 className="h-4 w-4 text-status-success" /> No stock signals right now.</p> : items.map(i => <article key={i.key} className="mb-3 flex items-start gap-3 border-t border-line pt-3 last:mb-0">
      {i.severity === 'critical' ? <AlertTriangle className="mt-1 h-4 w-4 text-rose-600" /> : <Clock className="mt-1 h-4 w-4 text-amber-600" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><strong className="text-sm">{i.name}</strong><span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">{badge[i.kind]}</span></div>
        <p className="text-sm text-ink-muted">{i.detail}</p>
        {i.escalatedTo && <p className="text-xs text-rose-700">Escalated to {i.escalatedTo}{i.escalatedAt ? ` on ${new Date(i.escalatedAt).toLocaleDateString()}` : ''}</p>}
        {i.acknowledgedAt && <p className="text-xs text-ink-muted">Acknowledged{i.note ? `: ${i.note}` : ''}</p>}
        <div className="mt-2 flex gap-2"><button type="button" onClick={() => void act('ack', i.key)} className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold">Acknowledge</button><button type="button" onClick={() => void act('escalate', i.key)} className="flex items-center gap-1 rounded-control border border-line px-3 py-1.5 text-xs font-semibold"><ArrowUpCircle className="h-3.5 w-3.5" /> Escalate</button></div>
      </div>
    </article>)}
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
  </section>;
}
