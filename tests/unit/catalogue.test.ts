import { describe, expect, it } from 'vitest';
import { newCatalogue, parseCatalogue, receiveStock, saveProduct, sellStock, validGtin, writeOff } from '../../src/lib/catalogue';

const day = '2026-09-25';
function stocked() {
  let s = newCatalogue(); s = saveProduct(s, { ...s.products[0], price: 8, cost: 3.5, reorder: 20 });
  s = receiveStock(s, s.products[0].id, 'LATER', 10, '2028-09-01', day);
  return receiveStock(s, s.products[0].id, 'EARLIER', 4, '2027-01-01', day);
}
describe('product inventory', () => {
  it('starts with four products, without invented prices or stock', () => {
    const s = newCatalogue(); expect(s.products).toHaveLength(4); expect(s.batches).toHaveLength(0); expect(s.products.every(p => p.price === 0)).toBe(true);
  });
  it('allocates one sale across batches in expiry order and keeps an audit trail', () => {
    const original = stocked(); const s = sellStock(original, original.products[0].id, 6, 'INV-1', day);
    expect(s.batches.map(b => b.quantity)).toEqual([8, 0]); expect(original.batches.map(b => b.quantity)).toEqual([10, 4]);
    const sales = s.movements.filter(m => m.type === 'sale'); expect(sales.map(m => m.quantity)).toEqual([4, 2]);
    expect(new Set(sales.map(m => m.transactionId)).size).toBe(1); expect(sales.reduce((n, m) => n + m.quantity * m.unitPrice, 0)).toBe(48);
  });
  it('rejects overselling and excludes batches expiring today', () => {
    const s = stocked(); expect(() => sellStock(s, s.products[0].id, 15, '', day)).toThrow('Not enough');
    expect(() => sellStock(s, s.products[0].id, 11, '', '2027-01-01')).toThrow('Not enough');
    expect(sellStock(s, s.products[0].id, 10, '', '2027-01-01').batches.map(b => b.quantity)).toEqual([0, 4]);
  });
  it('requires a price, valid quantities, and non-expired receipts', () => {
    const s = newCatalogue(); expect(() => sellStock(s, s.products[0].id, 1, '', day)).toThrow('selling price');
    for (const quantity of [0, -1, 1.5, NaN, Infinity]) expect(() => receiveStock(s, s.products[0].id, 'A', quantity, '2028-01-01', day)).toThrow();
    expect(() => receiveStock(s, s.products[0].id, 'A', 1, day, day)).toThrow('Expiry');
    expect(() => receiveStock(s, s.products[0].id, 'A', 1, '2027-02-30', day)).toThrow('Expiry');
  });
  it('rejects duplicate batches and identifiers and preserves printed SKUs after receipt', () => {
    const s = stocked(); expect(() => receiveStock(s, s.products[0].id, ' later ', 1, '2028-01-01', day)).toThrow('already exists');
    expect(() => saveProduct(s, { ...s.products[1], sku: s.products[0].sku })).toThrow('already assigned');
    expect(() => saveProduct(s, { ...s.products[0], sku: 'NEW-SKU' })).toThrow('cannot change');
    expect(validGtin('4006381333931')).toBe(true); expect(validGtin('4006381333932')).toBe(false);
  });
  it('records write-offs with a reason and prevents excessive deductions', () => {
    const s = stocked(); expect(() => writeOff(s, s.batches[0].id, 11, 'Damage')).toThrow();
    expect(() => writeOff(s, s.batches[0].id, 1, '')).toThrow('reason');
    const next = writeOff(s, s.batches[0].id, 2, 'Damaged'); expect(next.batches[0].quantity).toBe(8); expect(next.movements.at(-1)?.note).toBe('Damaged');
  });
  it('round-trips backups and rejects broken balances and foreign batch links', () => {
    const s = sellStock(stocked(), 'AKU-BAO-100', 6, '', day); expect(parseCatalogue(JSON.stringify(s))).toEqual(s);
    const damaged = structuredClone(s); damaged.batches[0].quantity = 999; expect(() => parseCatalogue(JSON.stringify(damaged))).toThrow('valid Akudha');
    damaged.batches[0].quantity = s.batches[0].quantity; damaged.movements[0].productId = 'missing'; expect(() => parseCatalogue(JSON.stringify(damaged))).toThrow();
    expect(() => parseCatalogue('{"version":1}')).toThrow();
  });
});
