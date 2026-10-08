import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { useCatalogue } from '../hooks/useCatalogue';
import { parseCatalogue, today } from '../lib/catalogue';

interface InventoryMaintenanceProps { catalogue: ReturnType<typeof useCatalogue> }

export function InventoryMaintenance({ catalogue }: InventoryMaintenanceProps) {
  const { state, update, storageError } = catalogue;
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const backup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `akudha-inventory-${today()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Inventory backup downloaded.');
  };

  const restore = async (file?: File) => {
    if (!file) return;
    setError(''); setMessage('');
    try {
      if (file.size > 5_000_000) throw Error('Backup is too large (maximum 5 MB).');
      const imported = parseCatalogue(await file.text());
      if (!confirm(`Replace this device's inventory with ${imported.products.length} products, ${imported.batches.length} batches and ${imported.movements.length} movements?`)) return;
      await update(() => imported);
      setMessage('Inventory backup restored and queued for synchronization.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to restore inventory.');
    }
  };

  return <article className="rounded-surface border border-line bg-surface p-5">
    <Download className="h-5 w-5 text-brand-strong" />
    <h3 className="mt-4 font-semibold">Inventory backup</h3>
    <p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">Download or restore this device's complete product, batch and movement history.</p>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={backup} className="flex min-h-11 items-center justify-center gap-2 rounded-control bg-ink px-4 text-sm font-semibold text-white hover:bg-brand-strong"><Download className="h-4 w-4" /> Backup</button>
      <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-control border border-line px-4 text-sm font-semibold hover:bg-canvas"><Upload className="h-4 w-4" /> Restore</button>
    </div>
    <input ref={inputRef} hidden type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void restore(file); }} />
    {(error || storageError) && <p className="mt-3 text-sm text-status-danger" role="alert">{error || storageError}</p>}
    {message && <p className="mt-3 text-sm text-status-success-ink" role="status">{message}</p>}
  </article>;
}
