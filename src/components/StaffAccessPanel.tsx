import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, RefreshCw, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { ZIM_REGIONS } from '../constants';
import { apiFetch, readApiError } from '../lib/api';
import { Role } from '../types/auth';

interface StaffUser {
  id: string;
  staffId: string;
  email: string;
  name: string;
  role: Role;
  region?: string;
  hubId?: string;
  active: boolean;
  lastLoginAt?: string;
}

const ROLE_LABELS: Record<Role, string> = {
  [Role.FIELD_COORDINATOR]: 'Field coordinator',
  [Role.PROCESSING_ADMIN]: 'Processing administrator',
  [Role.DISTRIBUTION_MANAGER]: 'Distribution manager',
  [Role.SUPER_ADMIN]: 'System administrator',
};

const EMPTY_FORM = { staffId: '', name: '', email: '', pin: '', role: Role.FIELD_COORDINATOR, region: 'Chimanimani', hubId: '' };

export function StaffAccessPanel() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resetId, setResetId] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const response = await apiFetch('/api/users');
    if (!response.ok) throw Error(await readApiError(response));
    setUsers((await response.json() as { data: StaffUser[] }).data);
  }, []);

  useEffect(() => { void load().catch(reason => { const message = reason instanceof Error ? reason.message : 'Unable to load staff.'; setError(message === 'Request failed (500)' ? 'The staff directory requires the connected server and database.' : message); }); }, [load]);

  const createStaff = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = { staffId: form.staffId, name: form.name, email: form.email, pin: form.pin, role: form.role, ...(form.role === Role.FIELD_COORDINATOR ? { region: form.region } : {}), ...(form.role === Role.DISTRIBUTION_MANAGER ? { hubId: form.hubId } : {}) };
      const response = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
      if (!response.ok) throw Error(await readApiError(response));
      setForm(EMPTY_FORM);
      setMessage('Staff account created. Share the staff ID and PIN privately.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create staff account.'); }
    finally { setBusy(false); }
  };

  const resetStaffPin = async (id: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await apiFetch(`/api/users/${id}/pin`, { method: 'PATCH', body: JSON.stringify({ pin: resetPin }) });
      if (!response.ok) throw Error(await readApiError(response));
      setResetId(''); setResetPin(''); setMessage('PIN reset. Existing sessions for that staff member have been revoked.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to reset the PIN.'); }
    finally { setBusy(false); }
  };

  const setStatus = async (user: StaffUser) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await apiFetch(`/api/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) });
      if (!response.ok) throw Error(await readApiError(response));
      setMessage(`${user.name} is now ${user.active ? 'inactive' : 'active'}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update staff access.'); }
    finally { setBusy(false); }
  };

  const pinValid = /^\d{6}$/.test(form.pin);
  const canCreate = /^[A-Z0-9][A-Z0-9-]{2,23}$/.test(form.staffId) && form.name.trim().length >= 2 && form.email.includes('@') && pinValid && (form.role !== Role.DISTRIBUTION_MANAGER || !!form.hubId.trim());

  return <section className="rounded-feature border border-line bg-surface p-5 sm:p-6" aria-labelledby="staff-access-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-brand-strong">Access control</p><h2 id="staff-access-title" className="mt-1 font-display text-2xl font-semibold">Staff IDs and PINs</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Create individual credentials, reset a forgotten PIN, or suspend access immediately.</p></div><ShieldCheck className="h-7 w-7 text-brand-strong" /></div>
    {(message || error) && <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-control p-3 text-sm ${error ? 'bg-status-danger-soft text-status-danger' : 'bg-status-success-soft text-status-success'}`}>{error || message}</p>}

    <div className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-surface border border-line bg-canvas p-4">
        <h3 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Add staff member</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Staff ID<input value={form.staffId} onChange={event => setForm(value => ({ ...value, staffId: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24) }))} placeholder="AKU-FIELD-01" className="mt-1 block min-h-11 w-full rounded-control border border-line bg-surface px-3 font-mono font-normal uppercase" /></label>
          <label className="text-sm font-semibold">Six-digit PIN<input value={form.pin} onChange={event => setForm(value => ({ ...value, pin: event.target.value.replace(/\D/g, '').slice(0, 6) }))} inputMode="numeric" type="password" className="mt-1 block min-h-11 w-full rounded-control border border-line bg-surface px-3 font-mono tracking-[.3em]" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Full name<input value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-control border border-line bg-surface px-3 font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Contact email<input value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))} type="email" className="mt-1 block min-h-11 w-full rounded-control border border-line bg-surface px-3 font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Role<select value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value as Role }))} className="mt-1 block min-h-11 w-full rounded-control border border-line bg-surface px-3 font-normal">{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {form.role === Role.FIELD_COORDINATOR && <label className="text-sm font-semibold sm:col-span-2">Assigned region<select value={form.region} onChange={event => setForm(value => ({ ...value, region: event.target.value }))} className="mt-1 block min-h-11 w-full rounded-control border border-line bg-surface px-3 font-normal">{ZIM_REGIONS.map(region => <option key={region}>{region}</option>)}</select></label>}
          {form.role === Role.DISTRIBUTION_MANAGER && <label className="text-sm font-semibold sm:col-span-2">Hub ID<input value={form.hubId} onChange={event => setForm(value => ({ ...value, hubId: event.target.value }))} placeholder="HUB-HARARE" className="mt-1 block min-h-11 w-full rounded-control border border-line bg-surface px-3 font-normal" /></label>}
        </div>
        <button type="button" disabled={!canCreate || busy} onClick={() => void createStaff()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45"><Plus className="h-4 w-4" /> Create staff account</button>
      </div>

      <div className="min-w-0"><div className="flex items-center justify-between"><h3 className="font-semibold">Current staff</h3><button type="button" onClick={() => void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to refresh staff.'))} className="grid h-11 w-11 place-items-center rounded-control border border-line" aria-label="Refresh staff"><RefreshCw className="h-4 w-4" /></button></div>
        <div className="mt-3 space-y-3">{users.map(user => <article key={user.id} className="rounded-surface border border-line p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{user.name}</strong><p className="mt-1 font-mono text-sm text-brand-strong">{user.staffId}</p><p className="mt-1 text-xs text-ink-muted">{ROLE_LABELS[user.role]}{user.region ? ` · ${user.region}` : ''}{user.hubId ? ` · ${user.hubId}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.active ? 'bg-status-success-soft text-status-success' : 'bg-surface-muted text-ink-muted'}`}>{user.active ? 'Active' : 'Inactive'}</span></div>
          {resetId === user.id ? <div className="mt-3 flex flex-wrap gap-2"><input value={resetPin} onChange={event => setResetPin(event.target.value.replace(/\D/g, '').slice(0, 6))} type="password" inputMode="numeric" placeholder="New 6-digit PIN" aria-label={`New PIN for ${user.name}`} className="min-h-11 min-w-0 flex-1 rounded-control border border-line px-3 font-mono" /><button type="button" disabled={!/^\d{6}$/.test(resetPin) || busy} onClick={() => void resetStaffPin(user.id)} className="min-h-11 rounded-control bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45">Save PIN</button><button type="button" onClick={() => { setResetId(''); setResetPin(''); }} className="min-h-11 rounded-control border border-line px-3 text-sm font-semibold">Cancel</button></div> : <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setResetId(user.id)} className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line px-3 text-sm font-semibold"><KeyRound className="h-4 w-4" /> Reset PIN</button><button type="button" disabled={busy} onClick={() => void setStatus(user)} className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line px-3 text-sm font-semibold">{user.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}{user.active ? 'Deactivate' : 'Activate'}</button></div>}
        </article>)}</div>
      </div>
    </div>
  </section>;
}
