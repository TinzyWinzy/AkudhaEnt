import { describe, expect, it } from 'vitest';
import { DEFAULT_ARTWORK_SIZE, getBarcodeSpec, getDefaultArtworkSize, printArtworkCss, printPageCss } from '../../src/lib/barcode';
import type { Product } from '../../src/lib/catalogue';

const product = (gtin = ''): Product => ({ id: 'p1', name: 'Baobab Oil', variant: '100 ml', sku: 'AKU-BAO-100', gtin, price: 8, cost: 3.5, reorder: 20 });

describe('barcode label configuration', () => {
  it('uses Code 128 for internal alphanumeric SKUs', () => {
    expect(getBarcodeSpec(product(), 'sku')).toEqual({ value: 'AKU-BAO-100', format: 'CODE128', label: 'Internal SKU · Code 128' });
  });

  it.each([
    ['12345670', 'EAN8'],
    ['036000291452', 'UPC'],
    ['4006381333931', 'EAN13'],
    ['10012345000017', 'ITF14'],
  ] as const)('maps GTIN %s to %s', (gtin, format) => {
    expect(getBarcodeSpec(product(gtin), 'gtin')?.format).toBe(format);
  });

  it('requires a GTIN before offering a retail barcode', () => {
    expect(getBarcodeSpec(product(), 'gtin')).toBeNull();
  });

  it('produces exact thermal and 21-up A4 print geometry', () => {
    expect(printPageCss('thermal-50x30')).toContain('size:50mm 30mm');
    expect(printPageCss('a4-63x38')).toContain('repeat(3,63.5mm)');
    expect(printPageCss('a4-63x38')).toContain('38.1mm');
  });

  it('uses the entered physical size for wrap artwork', () => {
    expect(printArtworkCss(210, 105)).toContain('size:210mm 105mm');
    expect(printArtworkCss(210, 105)).toContain('width:210mm;height:105mm');
    expect(() => printArtworkCss(0, 105)).toThrow(/valid finished label/);
  });

  it('uses the measured size only for the confirmed Baobab bottle', () => {
    expect(getDefaultArtworkSize('AKU-BAO-100')).toEqual({ widthMm: 140, heightMm: 55 });
    expect(getDefaultArtworkSize('AKU-KAL-100')).toEqual(DEFAULT_ARTWORK_SIZE);
    expect(DEFAULT_ARTWORK_SIZE).toEqual({ widthMm: 200, heightMm: 100 });
  });
});
