import { useEffect, useRef, type RefObject } from 'react';
import JsBarcode from 'jsbarcode';
import type { Product, StockBatch } from '../lib/catalogue';
import { getBarcodeSpec, type BarcodeMode, type LabelPreset } from '../lib/barcode';

interface BarcodeLabelProps {
  product: Product;
  batch?: StockBatch;
  mode: BarcodeMode;
  preset: LabelPreset;
  showPrice: boolean;
  showBatch: boolean;
  labelRef?: RefObject<SVGSVGElement | null>;
}

export function BarcodeLabel({ product, batch, mode, preset, showPrice, showBatch, labelRef }: BarcodeLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const spec = getBarcodeSpec(product, mode);
  const compact = preset === 'thermal-50x30';
  useEffect(() => {
    if (!barcodeRef.current || !spec) return;
    JsBarcode(barcodeRef.current, spec.value, { format: spec.format, width: 2, height: compact ? 64 : 76, displayValue: true, font: 'Arial', fontSize: compact ? 20 : 22, textMargin: 7, margin: 0, background: '#ffffff', lineColor: '#000000', flat: true });
    const generatedWidth = Number.parseFloat(barcodeRef.current.getAttribute('width') ?? '600');
    const generatedHeight = Number.parseFloat(barcodeRef.current.getAttribute('height') ?? '150');
    const maxWidth = 610; const maxHeight = compact ? 178 : 200;
    const scale = Math.min(maxWidth / generatedWidth, maxHeight / generatedHeight);
    const renderedWidth = generatedWidth * scale; const renderedHeight = generatedHeight * scale;
    barcodeRef.current.setAttribute('viewBox', `0 0 ${generatedWidth} ${generatedHeight}`);
    barcodeRef.current.setAttribute('x', String((700 - renderedWidth) / 2));
    barcodeRef.current.setAttribute('y', String(137 + (maxHeight - renderedHeight) / 2));
    barcodeRef.current.setAttribute('width', String(renderedWidth));
    barcodeRef.current.setAttribute('height', String(renderedHeight));
    barcodeRef.current.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }, [compact, spec?.format, spec?.value]);

  if (!spec) return null;
  const batchLine = showBatch && batch ? `LOT ${batch.lot}  ·  EXP ${batch.expiry}` : '';
  return <svg ref={labelRef} className={`stock-label stock-label--${preset}`} viewBox="0 0 700 400" role="img" aria-label={`${spec.label} barcode label for ${product.name}`} xmlns="http://www.w3.org/2000/svg">
    <rect width="700" height="400" fill="#fff" />
    <text x="350" y="50" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="700" letterSpacing="7">AKUDHA</text>
    <text x="350" y="87" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={compact ? 23 : 25} fontWeight="700">{product.name}</text>
    <text x="350" y="116" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18">{product.variant}{showPrice && product.price > 0 ? `  ·  $${product.price.toFixed(2)}` : ''}</text>
    <svg ref={barcodeRef} x="45" y="137" />
    <text x="350" y="340" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" letterSpacing="1.4">{spec.label.toUpperCase()}</text>
    {batchLine && <text x="350" y="374" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700">{batchLine}</text>}
  </svg>;
}
