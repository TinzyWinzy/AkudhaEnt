import { useEffect, useRef, type RefObject } from 'react';
import JsBarcode from 'jsbarcode';
import type { Product } from '../lib/catalogue';
import { getBarcodeSpec, type BarcodeMode } from '../lib/barcode';

interface ArtworkLabelProps {
  product: Product;
  mode: BarcodeMode;
  artwork: string;
  batchNumber: string;
  manufacturedDate: string;
  expiryDate: string;
  widthMm?: number;
  heightMm?: number;
  labelRef?: RefObject<SVGSVGElement | null>;
}

export function ArtworkLabel({ product, mode, artwork, batchNumber, manufacturedDate, expiryDate, widthMm, heightMm, labelRef }: ArtworkLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const spec = getBarcodeSpec(product, mode);

  useEffect(() => {
    if (!barcodeRef.current || !spec) return;
    JsBarcode(barcodeRef.current, spec.value, { format: spec.format, width: 2, height: 66, displayValue: true, font: 'Arial', fontSize: 17, textMargin: 5, margin: 0, background: 'transparent', lineColor: '#000000', flat: true });
    const sourceWidth = Number.parseFloat(barcodeRef.current.getAttribute('width') ?? '200');
    const sourceHeight = Number.parseFloat(barcodeRef.current.getAttribute('height') ?? '90');
    const scale = Math.min(176 / sourceWidth, 82 / sourceHeight);
    const width = sourceWidth * scale; const height = sourceHeight * scale;
    barcodeRef.current.setAttribute('viewBox', `0 0 ${sourceWidth} ${sourceHeight}`);
    barcodeRef.current.setAttribute('x', String(848 - width / 2));
    barcodeRef.current.setAttribute('y', String(397 + (82 - height) / 2));
    barcodeRef.current.setAttribute('width', String(width));
    barcodeRef.current.setAttribute('height', String(height));
    barcodeRef.current.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }, [spec?.format, spec?.value]);

  if (!spec) return null;
  const physical = widthMm && heightMm ? { width: `${widthMm}mm`, height: `${heightMm}mm` } : {};
  return <svg ref={labelRef} className="stock-label artwork-label" viewBox="0 0 1000 500" role="img" aria-label={`Print label artwork for ${product.name}`} xmlns="http://www.w3.org/2000/svg" {...physical}>
    <rect width="1000" height="500" fill="#f8f1df" />
    <image href={artwork} x="0" y="0" width="1000" height="500" preserveAspectRatio="xMidYMid meet" />
    {(batchNumber || manufacturedDate || expiryDate) && <rect x="815" y="191" width="158" height="75" rx="5" fill="#fff8e9" fillOpacity="0.96" />}
    {batchNumber && <text x="825" y="211" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" fill="#2f1c12">{batchNumber}</text>}
    {manufacturedDate && <text x="825" y="234" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" fill="#2f1c12">{manufacturedDate}</text>}
    {expiryDate && <text x="825" y="257" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" fill="#2f1c12">{expiryDate}</text>}
    <svg ref={barcodeRef} x="760" y="394" />
  </svg>;
}
