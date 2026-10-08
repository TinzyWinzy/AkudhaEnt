import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { deriveOpsItems } from '../../server/lib/opsQueue';

describe('deriveOpsItems', () => {
  const now = new Date('2026-10-08T00:00:00Z');
  it('flags out-of-stock and low-stock products', () => {
    const p1 = { id: new Types.ObjectId(), name: 'Empty', reorder: 5, quantityOnHand: 0 };
    const p2 = { id: new Types.ObjectId(), name: 'Low', reorder: 10, quantityOnHand: 3 };
    const p3 = { id: new Types.ObjectId(), name: 'Ok', reorder: 2, quantityOnHand: 50 };
    const items = deriveOpsItems([p1, p2, p3], [], now);
    expect(items.find(i => i.name === 'Empty')?.kind).toBe('out-of-stock');
    expect(items.find(i => i.name === 'Low')?.kind).toBe('low-stock');
    expect(items.find(i => i.name === 'Ok')).toBeUndefined();
  });
  it('flags lots expiring within 30 days', () => {
    const pid = new Types.ObjectId();
    const lots = [
      { id: new Types.ObjectId(), productId: pid, lot: 'L1', expiryDate: new Date('2026-10-20'), quantityOnHand: 4 },
      { id: new Types.ObjectId(), productId: pid, lot: 'L2', expiryDate: new Date('2027-01-01'), quantityOnHand: 9 },
    ];
    const items = deriveOpsItems([{ id: pid, name: 'Lots', reorder: 0, quantityOnHand: 13 }], lots, now);
    expect(items.filter(i => i.kind === 'expiring')).toHaveLength(1);
    expect(items[0].name).toBe('Lot L1');
  });
});
