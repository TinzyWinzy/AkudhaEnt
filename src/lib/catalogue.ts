export interface Product {
  id: string; name: string; variant: string; sku: string; gtin: string;
  price: number; cost: number; reorder: number;
}
export interface StockBatch {
  id: string; productId: string; lot: string; received: string; expiry: string; quantity: number;
}
export interface Movement {
  id: string; productId: string; batchId: string; type: 'receipt' | 'sale' | 'waste';
  quantity: number; unitPrice: number; at: string; note: string; transactionId: string;
}
export interface Catalogue { version: 1; products: Product[]; batches: StockBatch[]; movements: Movement[] }
export const CATALOGUE_KEY = 'akudha_catalogue_v1';
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const id = () => crypto.randomUUID();
export function newCatalogue(): Catalogue {
  return { version: 1, batches: [], movements: [], products: [
    ['Baobab Oil', '100 ml', 'AKU-BAO-100'], ['Kalahari Melon Oil', '100 ml', 'AKU-KAL-100'],
    ['Mongongo Oil', '100 ml', 'AKU-MON-100'], ['Mafura Butter', '250 g', 'AKU-MAF-250'],
  ].map(([name, variant, sku]) => ({ id: sku, name, variant, sku, gtin: '', price: 0, cost: 0, reorder: 0 })) };
}
const money = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1e9 && Math.abs(n * 100 - Math.round(n * 100)) < 0.0001;
const count = (n: number) => Number.isSafeInteger(n) && n >= 0 && n <= 1e9;
const date = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export function validGtin(value: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number); const check = digits.pop();
  return (10 - digits.reverse().reduce((n, d, i) => n + d * (i % 2 ? 1 : 3), 0) % 10) % 10 === check;
}
export function saveProduct(state: Catalogue, product: Product): Catalogue {
  const p = { ...product, name: product.name.trim(), variant: product.variant.trim(), sku: product.sku.trim().toUpperCase(), gtin: product.gtin.trim() };
  if (!p.name || p.name.length > 100 || !p.variant || p.variant.length > 60) throw Error('Enter a product name and size / variant.');
  if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(p.sku)) throw Error('SKU must contain 2–32 letters, numbers or hyphens.');
  if (p.gtin && !validGtin(p.gtin)) throw Error('Enter a valid GTIN with its check digit, or leave it empty.');
  if (!money(p.price) || !money(p.cost) || !count(p.reorder)) throw Error('Prices must be non-negative amounts with up to two decimals. Reorder level must be a whole number.');
  if (state.products.some(x => x.id !== p.id && (x.sku === p.sku || (p.gtin && x.gtin.padStart(14, '0') === p.gtin.padStart(14, '0')) || x.gtin === p.sku || (p.gtin && x.sku === p.gtin)))) throw Error('That SKU or GTIN is already assigned to another product.');
  const existing = state.products.find(x => x.id === p.id);
  if (existing && existing.sku !== p.sku && state.batches.some(b => b.productId === p.id)) throw Error('SKU cannot change after stock has been received.');
  return { ...state, products: existing ? state.products.map(x => x.id === p.id ? p : x) : [...state.products, p] };
}
export function receiveStock(state: Catalogue, productId: string, lot: string, quantity: number, expiry: string, day = today()): Catalogue {
  if (!state.products.some(p => p.id === productId)) throw Error('Choose a product.');
  if (!count(quantity) || quantity === 0) throw Error('Quantity must be a positive whole number.');
  if (!lot.trim() || lot.trim().length > 60) throw Error('Enter a batch / lot reference of up to 60 characters.');
  if (!date(expiry) || expiry <= day) throw Error('Expiry must be after today.');
  if (state.batches.some(b => b.productId === productId && b.lot.toUpperCase() === lot.trim().toUpperCase())) throw Error('This batch already exists. Use a unique batch reference.');
  const batch: StockBatch = { id: id(), productId, lot: lot.trim(), received: day, expiry, quantity };
  const movement: Movement = { id: id(), productId, batchId: batch.id, type: 'receipt', quantity, unitPrice: 0, at: new Date().toISOString(), note: 'Stock received', transactionId: id() };
  return { ...state, batches: [...state.batches, batch], movements: [...state.movements, movement] };
}
export function sellStock(state: Catalogue, productId: string, quantity: number, note: string, day = today()): Catalogue {
  const p = state.products.find(p => p.id === productId);
  if (!p || p.price <= 0) throw Error('Set a selling price before recording a sale.');
  if (!count(quantity) || quantity === 0) throw Error('Quantity must be a positive whole number.');
  const eligible = state.batches.filter(b => b.productId === productId && b.expiry > day && b.quantity > 0).sort((a, b) => a.expiry.localeCompare(b.expiry) || a.received.localeCompare(b.received));
  if (eligible.reduce((n, b) => n + b.quantity, 0) < quantity) throw Error('Not enough saleable stock. Expired batches cannot be sold.');
  let remaining = quantity;
  const allocations = new Map<string, number>(); const transactionId = id();
  for (const b of eligible) { const take = Math.min(remaining, b.quantity); if (take) allocations.set(b.id, take); remaining -= take; }
  return { ...state, batches: state.batches.map(b => ({ ...b, quantity: b.quantity - (allocations.get(b.id) ?? 0) })), movements: [...state.movements, ...Array.from(allocations, ([batchId, taken]): Movement => ({ id: id(), transactionId, productId, batchId, type: 'sale', quantity: taken, unitPrice: p.price, at: new Date().toISOString(), note: note.trim().slice(0, 200) }))] };
}
export function writeOff(state: Catalogue, batchId: string, quantity: number, note: string): Catalogue {
  const b = state.batches.find(b => b.id === batchId);
  if (!b || !count(quantity) || quantity === 0 || quantity > b.quantity) throw Error('Choose a batch and a quantity within its available stock.');
  if (!note.trim()) throw Error('Enter a reason for the write-off.');
  return { ...state, batches: state.batches.map(x => x.id === b.id ? { ...x, quantity: x.quantity - quantity } : x), movements: [...state.movements, { id: id(), transactionId: id(), batchId, productId: b.productId, type: 'waste', quantity, unitPrice: 0, at: new Date().toISOString(), note: note.trim().slice(0, 200) }] };
}
export function parseCatalogue(raw: string): Catalogue {
  try {
    const s = JSON.parse(raw) as Catalogue;
    if (s.version !== 1 || !Array.isArray(s.products) || !Array.isArray(s.batches) || !Array.isArray(s.movements)) throw Error();
    const ids = new Set<string>();
    const unique = (key: string) => { if (typeof key !== 'string' || !key || ids.has(key)) throw Error(); ids.add(key); };
    let validated: Catalogue = { version: 1, products: [], batches: [], movements: [] };
    for (const p of s.products) { unique(p.id); validated = saveProduct(validated, p); }
    const lots = new Set<string>();
    for (const b of s.batches) {
      unique(b.id);
      const key = `${b.productId}:${b.lot.trim().toUpperCase()}`;
      if (!s.products.some(p => p.id === b.productId) || !b.lot.trim() || b.lot.length > 60 || lots.has(key) || !count(b.quantity) || !date(b.expiry) || !date(b.received) || b.expiry <= b.received) throw Error();
      lots.add(key);
    }
    const balances = new Map<string, number>();
    for (const m of s.movements) {
      unique(m.id);
      if (!s.batches.some(b => b.id === m.batchId && b.productId === m.productId) || !['receipt', 'sale', 'waste'].includes(m.type) || !count(m.quantity) || !m.quantity || !money(m.unitPrice) || typeof m.note !== 'string' || m.note.length > 200 || typeof m.at !== 'string' || Number.isNaN(Date.parse(m.at)) || typeof m.transactionId !== 'string' || !m.transactionId) throw Error();
      const balance = (balances.get(m.batchId) ?? 0) + (m.type === 'receipt' ? m.quantity : -m.quantity);
      if (balance < 0) throw Error();
      balances.set(m.batchId, balance);
    }
    if (s.batches.some(b => b.quantity !== (balances.get(b.id) ?? 0))) throw Error();
    return { ...s, products: validated.products };
  } catch { throw Error('This is not a valid Akudha inventory backup. Existing records have not been changed.'); }
}
