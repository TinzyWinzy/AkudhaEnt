import type { Product } from './catalogue';

export type BarcodeMode = 'sku' | 'gtin';
export type LabelPreset = 'thermal-50x30' | 'thermal-70x40' | 'a4-63x38';
export interface BarcodeSpec { value: string; format: 'CODE128' | 'EAN8' | 'UPC' | 'EAN13' | 'ITF14'; label: string }

export const DEFAULT_ARTWORK_SIZE = { widthMm: 200, heightMm: 100 } as const;

const PRODUCT_ARTWORK_SIZES: Record<string, { widthMm: number; heightMm: number }> = {
  'AKU-BAO-100': { widthMm: 140, heightMm: 55 },
};

export function getDefaultArtworkSize(sku: string): { widthMm: number; heightMm: number } {
  return PRODUCT_ARTWORK_SIZES[sku] ?? DEFAULT_ARTWORK_SIZE;
}

export const LABEL_PRESETS: Record<LabelPreset, { label: string; widthMm: number; heightMm: number; page: string }> = {
  'thermal-50x30': { label: 'Thermal · 50 × 30 mm', widthMm: 50, heightMm: 30, page: '50mm 30mm' },
  'thermal-70x40': { label: 'Thermal · 70 × 40 mm', widthMm: 70, heightMm: 40, page: '70mm 40mm' },
  'a4-63x38': { label: 'A4 sheet · 63.5 × 38.1 mm (21-up)', widthMm: 63.5, heightMm: 38.1, page: 'A4' },
};

export function getBarcodeSpec(product: Product, mode: BarcodeMode): BarcodeSpec | null {
  if (mode === 'sku') return { value: product.sku, format: 'CODE128', label: 'Internal SKU · Code 128' };
  const value = product.gtin;
  if (!value) return null;
  if (value.length === 8) return { value, format: 'EAN8', label: 'Retail GTIN-8 · EAN-8' };
  if (value.length === 12) return { value, format: 'UPC', label: 'Retail GTIN-12 · UPC-A' };
  if (value.length === 13) return { value, format: 'EAN13', label: 'Retail GTIN-13 · EAN-13' };
  if (value.length === 14) return { value, format: 'ITF14', label: 'Case GTIN-14 · ITF-14' };
  return null;
}

export function printPageCss(preset: LabelPreset): string {
  const p = LABEL_PRESETS[preset];
  if (preset === 'a4-63x38') return `@page{size:A4;margin:14.85mm 7.75mm}@media print{body>*:not(.stock-print-sheet){display:none!important}.stock-print-sheet{display:grid!important;grid-template-columns:repeat(3,63.5mm);grid-auto-rows:38.1mm;gap:0 2.5mm}.stock-label{page-break-inside:avoid}}`;
  return `@page{size:${p.page};margin:0}@media print{body>*:not(.stock-print-sheet){display:none!important}.stock-print-sheet{display:block!important}.stock-print-sheet .stock-label{page-break-after:always;page-break-inside:avoid}.stock-print-sheet .stock-label:last-child{page-break-after:auto}}`;
}

export function printArtworkCss(widthMm: number, heightMm: number): string {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0 || widthMm > 1000 || heightMm > 1000) {
    throw Error('Enter a valid finished label width and height in millimetres.');
  }
  return `@page{size:${widthMm}mm ${heightMm}mm;margin:0}@media print{body>*:not(.stock-print-sheet){display:none!important}.stock-print-sheet{display:block!important}.stock-print-sheet .stock-label{width:${widthMm}mm;height:${heightMm}mm;page-break-after:always;page-break-inside:avoid}.stock-print-sheet .stock-label:last-child{page-break-after:auto}}`;
}
