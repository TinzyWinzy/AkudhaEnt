import { describe, expect, it } from 'vitest';
import { systemTemplatesForProduct } from '../../server/lib/labelTemplates';

describe('system label templates', () => {
  it('approves the built-in wrap and all clean print stocks for known products', () => {
    const templates = systemTemplatesForProduct({ sku: 'AKU-BAO-100', name: 'Baobab Oil' });
    expect(templates).toHaveLength(4);
    expect(templates.map(template => template.version)).toEqual([5, 2, 3, 4]);
    expect(templates[0]).toMatchObject({ artworkUrl: '/labels/baobab-oil.png?master=2', widthMm: 140, heightMm: 55 });
    expect(templates.map(template => template.artworkChecksum).every(checksum => /^[a-f0-9]{64}$/.test(checksum))).toBe(true);
  });

  it('does not apply the Baobab container measurement to another product', () => {
    const templates = systemTemplatesForProduct({ sku: 'AKU-KAL-100', name: 'Kalahari Melon Oil' });
    expect(templates[0]).toMatchObject({ version: 1, widthMm: 200, heightMm: 100 });
    expect(templates[0].name).toContain('size to confirm');
  });

  it('provides clean label templates for newly created products', () => {
    const templates = systemTemplatesForProduct({ sku: 'AKU-NEW-100', name: 'New Product' });
    expect(templates).toHaveLength(3);
    expect(templates.map(template => template.artworkUrl)).toEqual([
      'akudha://clean-label/thermal-50x30',
      'akudha://clean-label/thermal-70x40',
      'akudha://clean-label/a4-63x38',
    ]);
  });
});
