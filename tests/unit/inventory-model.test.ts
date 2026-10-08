import { describe, expect, it } from 'vitest';
import { ProductModel } from '../../server/models/Inventory';

describe('inventory product indexes', () => {
  it('enforces GTIN uniqueness only when a GTIN string is present', () => {
    const indexes = ProductModel.schema.indexes() as Array<[Record<string, number>, Record<string, unknown>]>;
    const gtinIndex = indexes.find(([keys]) => keys.organizationId === 1 && keys.gtin === 1);
    expect(gtinIndex?.[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { gtin: { $type: 'string' } },
    });
    expect(gtinIndex?.[1].sparse).not.toBe(true);
  });
});
