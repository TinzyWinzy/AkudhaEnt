import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, RefreshCw, ScanLine, X } from 'lucide-react';
import { useCatalogue } from '../hooks/useCatalogue';
import { receiveStock, saveProduct, sellStock, today, writeOff, type Product } from '../lib/catalogue';
import { BarcodeGenerator } from './BarcodeGenerator';
import './inventory.css';
import { useAuth } from '../hooks/useAuth';

const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const emptyProduct = (): Product => ({ id: crypto.randomUUID(), name: '', variant: '', sku: '', gtin: '', price: 0, cost: 0, reorder: 0 });
type Action = 'receive' | 'sale' | 'waste' | 'labels';
type Filter = 'all' | 'low' | 'expiring' | 'out';
interface Receipt { action: string; quantity: number; product: string; reference: string; at: string }

interface InventoryPanelProps {
  catalogue: ReturnType<typeof useCatalogue>;
}

export function InventoryPanel({ catalogue }: InventoryPanelProps) {
  const { user } = useAuth();
  const { state, update, storageError, syncStatus, syncNow, legacyAvailable, importLegacy } = catalogue;
  const [selectedId, setSelectedId] = useState('AKU-BAO-100');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mobileDetail, setMobileDetail] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [action, setAction] = useState<Action>('receive');
  const [editor, setEditor] = useState<Product | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const selected = state.products.find(p => p.id === selectedId) ?? state.products[0];
  const day = today();
  const stock = (productId: string, saleable = false) => state.batches.filter(b => b.productId === productId && (!saleable || b.expiry > day)).reduce((n, b) => n + b.quantity, 0);
  const batches = state.batches.filter(b => b.productId === selected?.id).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const daysTo = (date: string) => (Date.parse(date) - Date.parse(day)) / 86400000;
  const isExpiring = (productId: string) => state.batches.some(b => b.productId === productId && b.quantity > 0 && daysTo(b.expiry) > 0 && daysTo(b.expiry) <= 30);
  const products = state.products.filter(p => {
    const matches = `${p.name} ${p.sku} ${p.gtin} ${p.variant}`.toLowerCase().includes(query.toLowerCase().trim());
    const available = stock(p.id, true);
    return matches && (filter === 'all' || filter === 'low' && available > 0 && available <= p.reorder || filter === 'out' && available === 0 || filter === 'expiring' && isExpiring(p.id));
  });
  const low = state.products.filter(p => stock(p.id, true) <= p.reorder).length;
  const expired = state.batches.filter(b => b.expiry <= day).reduce((n, b) => n + b.quantity, 0);
  const sales = state.movements.filter(m => m.type === 'sale').reduce((n, m) => n + m.quantity * Math.round(m.unitPrice * 100), 0) / 100;
  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); return false; }
    finally { setBusy(false); }
  };
  const submitStock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!selected) return;
    const form = e.currentTarget; const data = new FormData(form); const quantity = Number(data.get('quantity'));
    const ok = await run(() => update(s => action === 'receive'
      ? receiveStock(s, selected.id, String(data.get('lot')), quantity, String(data.get('expiry')))
      : action === 'sale' ? sellStock(s, selected.id, quantity, String(data.get('note') ?? ''))
      : writeOff(s, String(data.get('batch')), quantity, String(data.get('note') ?? ''))), action === 'sale' ? `Sale recorded: ${quantity} × ${selected.name}, ${usd(quantity * selected.price)}.` : 'Stock movement saved.');
    if (ok) {
      setReceipt({ action: action === 'receive' ? 'Stock received' : action === 'sale' ? 'Sale recorded' : 'Write-off recorded', quantity, product: selected.name, reference: String(data.get(action === 'receive' ? 'lot' : action === 'waste' ? 'note' : 'note') || 'No reference'), at: new Date().toLocaleString() });
      form.reset();
    }
  };
  const scan = (e: FormEvent) => {
    e.preventDefault(); const value = query.trim().toUpperCase();
    const match = state.products.find(p => p.sku === value || (p.gtin && /^\d+$/.test(value) && p.gtin.padStart(14, '0') === value.padStart(14, '0')));
    if (match) { setSelectedId(match.id); setQuery(''); setAction('sale'); setMobileDetail(true); setError(''); setMessage(`${match.name} selected. Enter the quantity to record a sale.`); }
    else { setError('No exact SKU or GTIN match. Search by product name or add the product first.'); setMessage(''); }
  };
  return <section className="stock-workspace" aria-label="Product inventory">
    <div className="stock-heading"><div><p className="stock-eyebrow">AKUDHA / PRODUCT OPERATIONS</p><h1>Products & inventory</h1><p>Your oils, butters and every batch in between.</p></div><button className="stock-primary" onClick={() => setEditor(emptyProduct())}><Plus size={16} /> Add product</button></div>
    <div className="stock-notice" role="status">{user?.id === 'local-demo' ? 'Ready for offline work.' : syncStatus === 'syncing' ? 'Syncing inventory…' : syncStatus === 'synced' ? 'Inventory saved.' : syncStatus === 'pending' ? 'Waiting to sync. Your work is safe on this device.' : syncStatus === 'error' ? 'Inventory needs attention. Your work is safe on this device.' : syncStatus === 'loading' ? 'Preparing inventory…' : 'Ready for offline work.'}</div>
    {legacyAvailable && <div className="stock-notice"><strong>Previous inventory found.</strong> Import the catalogue and movement history saved by the earlier browser version. <button onClick={() => void run(importLegacy, 'Previous browser inventory imported and queued for synchronization.')}>Import previous inventory</button></div>}
    <div className="stock-stats"><div><span>Products</span><strong>{state.products.length}</strong></div><div><span>Units on hand</span><strong>{state.batches.reduce((n, b) => n + b.quantity, 0)}</strong></div><div><span>At reorder level</span><strong>{low}</strong></div><div><span>Sales recorded · USD</span><strong>{usd(sales)}</strong></div></div>
    {expired > 0 && <p className="stock-error">{expired} expired units are excluded from sales. Select their product to write them off.</p>}
    {(error || storageError) && <p role="alert" className="stock-error">{error || storageError}</p>}
    {message && <p role="status" className="stock-success">{message}</p>}
    {receipt && <aside className="stock-receipt" role="status"><div><p className="stock-eyebrow">MOVEMENT RECEIPT</p><strong>{receipt.action}</strong><p>{receipt.quantity} × {receipt.product} · {receipt.reference}</p><small>{receipt.at}</small></div><button type="button" aria-label="Dismiss receipt" onClick={() => setReceipt(null)}><X size={16} /></button></aside>}
    <div className="stock-tools"><form onSubmit={scan} className="stock-search"><ScanLine size={18} /><input ref={scanRef} aria-label="Search or scan SKU or GTIN" placeholder="Search products, or scan SKU / GTIN + Enter" value={query} onChange={e => setQuery(e.target.value)} /><button type="submit">Find</button></form>{(syncStatus === 'pending' || syncStatus === 'error') && <div className="stock-backups"><button onClick={() => void syncNow(true)} disabled={!navigator.onLine}><RefreshCw size={15} /> {syncStatus === 'error' ? 'Retry sync' : 'Sync now'}</button></div>}</div>
    <div className="stock-filters" aria-label="Filter products">{([['all', 'All'], ['low', 'Low stock'], ['expiring', 'Expiring soon'], ['out', 'Out of stock']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className={`stock-layout ${mobileDetail ? 'has-mobile-detail' : ''}`}><div className="stock-catalogue"><div className="stock-list-heading"><h2>Product catalogue</h2><span>{products.length} products</span></div>
      {products.length === 0 && <p className="stock-empty">No matching products. Clear the search or add a product.</p>}
      {products.map(p => { const available = stock(p.id, true); const status = available === 0 ? 'Out of stock' : isExpiring(p.id) ? 'Expiring soon' : available <= p.reorder ? 'Low stock' : 'Available'; return <button className={`stock-product ${p.id === selected?.id ? 'is-selected' : ''}`} key={p.id} onClick={() => { setSelectedId(p.id); setMobileDetail(true); setError(''); setMessage(''); }}><div><strong>{p.name}</strong><span>{p.variant} · {p.sku}</span><small>{p.price ? usd(p.price) : 'Set selling price'} <em className={`stock-badge stock-badge--${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</em></small></div><div className="stock-quantity"><strong>{available}</strong><span>saleable</span></div></button>})}
    </div><div className="stock-detail">{selected ? <><button type="button" className="stock-mobile-back" onClick={() => setMobileDetail(false)}><ArrowLeft size={17} /> Products</button><div className="stock-detail-heading"><div><p className="stock-eyebrow">{selected.sku}</p><h2>{selected.name}</h2><p>{selected.variant} · {usd(selected.price)} / unit · {stock(selected.id)} on hand</p></div><button onClick={() => setEditor({ ...selected })}>Edit product</button></div>
      <div className="stock-actions" aria-label="Inventory actions">{(['receive', 'sale', 'waste', 'labels'] as const).map(a => <button key={a} aria-pressed={action === a} onClick={() => { setAction(a); setError(''); setMessage(''); }}>{({ receive: 'Receive stock', sale: 'Record sale', waste: 'Write off', labels: 'Label maker' })[a]}</button>)}</div>
      {action === 'labels' ? <BarcodeGenerator product={selected} batches={batches} /> : <form key={`${action}-${selected.id}`} onSubmit={submitStock} className="stock-form">
        <p>{action === 'receive' ? 'Add a new batch with its expiry date.' : action === 'sale' ? 'Stock is allocated from the earliest expiry first. Batches expiring today or earlier cannot be sold.' : 'Remove damaged, expired or missing units and record the reason.'}</p>
        <div className="stock-fields">{action === 'receive' && <><label>Batch / lot reference<input name="lot" required maxLength={60} placeholder="e.g. BAO-260925" /></label><label>Expiry date<input name="expiry" type="date" required /></label></>}
        {action === 'waste' && <label className="stock-wide">Batch<select name="batch" required><option value="">Choose batch</option>{batches.filter(b => b.quantity > 0).map(b => <option key={b.id} value={b.id}>{b.lot} · {b.quantity} units · expires {b.expiry}</option>)}</select></label>}
        <label>Quantity (units)<input name="quantity" type="number" min="1" max="1000000000" step="1" required defaultValue="1" /></label>
        {action !== 'receive' && <label>{action === 'waste' ? 'Reason' : 'Sale reference (optional)'}<input name="note" required={action === 'waste'} maxLength={200} placeholder={action === 'waste' ? 'e.g. Expired stock' : 'e.g. Invoice 001'} /></label>}</div>
        <button className="stock-primary" disabled={busy || !!storageError}>{busy ? 'Saving…' : action === 'receive' ? 'Receive batch' : action === 'sale' ? 'Confirm sale' : 'Record write-off'}</button>
      </form>}
      <div className="stock-batches"><h3>Batch stock</h3>{batches.length === 0 ? <p className="stock-empty">No batches yet. Receive your opening stock to get started.</p> : <div className="stock-table-wrap"><table><thead><tr><th>Batch</th><th>Expiry</th><th>On hand</th><th>Status</th></tr></thead><tbody>{batches.map(b => <tr key={b.id}><td>{b.lot}</td><td>{b.expiry}</td><td>{b.quantity}</td><td>{b.quantity === 0 ? 'Depleted' : b.expiry <= day ? 'Expired' : (Date.parse(b.expiry) - Date.parse(day)) / 86400000 <= 30 ? 'Expires soon' : 'Available'}</td></tr>)}</tbody></table></div>}</div>
    </> : <p className="stock-empty">Add your first product to get started.</p>}</div></div>
    <section className="stock-history"><h2>Stock movement history</h2><p>Receipts, sales and write-offs. A sale spanning multiple batches has one row per batch.</p>{state.movements.length === 0 ? <p className="stock-empty">Your first stock movement will appear here.</p> : <div className="stock-table-wrap"><table><thead><tr><th>Date</th><th>Product / batch</th><th>Movement</th><th>Units</th><th>Sale value</th><th>Reference</th></tr></thead><tbody>{state.movements.slice(-100).reverse().map(m => <tr key={m.id}><td>{new Date(m.at).toLocaleString()}</td><td>{state.products.find(p => p.id === m.productId)?.name}<small>{state.batches.find(b => b.id === m.batchId)?.lot}</small></td><td>{m.type === 'waste' ? 'Write-off' : m.type}</td><td>{m.type === 'receipt' ? '+' : '−'}{m.quantity}</td><td>{m.type === 'sale' ? usd(m.quantity * m.unitPrice) : '—'}</td><td>{m.note || '—'}</td></tr>)}</tbody></table>{state.movements.length > 100 && <p>Showing the latest 100 movements. Backups contain the complete history.</p>}</div>}</section>
    {editor && <div className="stock-modal"><section role="dialog" aria-modal="true" aria-labelledby="product-editor-title" onKeyDown={e => {
      if (e.key === 'Escape' && !busy) { setEditor(null); setError(''); }
      if (e.key === 'Tab') {
        const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('input, select, button:not(:disabled)'));
        const first = fields[0]; const last = fields.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}><h2 id="product-editor-title">{state.products.some(p => p.id === editor.id) ? 'Edit product' : 'Add product'}</h2><form onSubmit={async e => {
      e.preventDefault(); const ok = await run(() => update(s => saveProduct(s, editor)), 'Product saved.'); if (ok) { setSelectedId(editor.id); setEditor(null); }
    }}><div className="stock-fields">{([{ key: 'name', label: 'Product name' }, { key: 'variant', label: 'Size / variant' }, { key: 'sku', label: 'Internal SKU' }, { key: 'gtin', label: 'GTIN (optional)' }] as const).map(({ key, label }) => <label key={key}>{label}<input autoFocus={key === 'name'} required={key !== 'gtin'} maxLength={key === 'name' ? 100 : key === 'variant' ? 60 : key === 'gtin' ? 14 : 32} value={editor[key]} onChange={e => setEditor({ ...editor, [key]: e.target.value })} /></label>)}
    {([{ key: 'price', label: 'Selling price · USD' }, { key: 'cost', label: 'Unit cost · USD' }, { key: 'reorder', label: 'Reorder level · units' }] as const).map(({ key, label }) => <label key={key}>{label}<input type="number" min="0" max="1000000000" step={key === 'reorder' ? '1' : '0.01'} required value={editor[key]} onChange={e => setEditor({ ...editor, [key]: e.target.value === '' ? '' : Number(e.target.value) } as Product)} /></label>)}</div><p>Use a GTIN you already own. Leave it blank to use your internal SKU barcode.</p>{error && <p className="stock-error" role="alert">{error}</p>}<div className="stock-inline"><button className="stock-primary" disabled={busy || !!storageError}>Save product</button><button type="button" onClick={() => { setEditor(null); setError(''); }}>Cancel</button></div></form></section></div>}
  </section>;
}
