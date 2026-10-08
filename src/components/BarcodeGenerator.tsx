import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Expand, ImagePlus, Printer, ScanLine, Trash2, X } from 'lucide-react';
import type { Product, StockBatch } from '../lib/catalogue';
import { apiFetch, readApiError } from '../lib/api';
import { getBarcodeSpec, getDefaultArtworkSize, LABEL_PRESETS, printArtworkCss, printPageCss, type BarcodeMode, type LabelPreset } from '../lib/barcode';
import { useAuth } from '../hooks/useAuth';
import { ArtworkLabel } from './ArtworkLabel';
import { BarcodeLabel } from './BarcodeLabel';

interface BarcodeGeneratorProps { product: Product; batches: StockBatch[] }
type LabelDesign = 'artwork' | 'clean';
interface ApprovedTemplate { id: string; productId: string; name: string; artworkUrl: string; artworkChecksum: string; widthMm: number; heightMm: number; version: number; status: 'draft' | 'approved' | 'retired' }
interface PrintJob { id: string; templateId: string; templateVersion: number; barcodeValue: string; widthMm: number; heightMm: number; copies: number; printedBy: string; reprintReason?: string; createdAt: string }

const PRODUCT_ARTWORK: Record<string, { source: string; name: string }> = {
  'AKU-BAO-100': { source: '/labels/baobab-oil.png?master=2', name: 'Akudha Baobab Oil design' },
  'AKU-KAL-100': { source: '/labels/kalahari-melon-oil.png?master=2', name: 'Akudha Kalahari Melon Oil design' },
  'AKU-MON-100': { source: '/labels/mongongo-oil.png?master=2', name: 'Akudha Mongongo Oil design' },
  'AKU-MAF-250': { source: '/labels/mafura-butter.png?master=2', name: 'Akudha Mafura Butter design' },
};
const MAX_ARTWORK_BYTES = 8_000_000;

function safeFilename(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'akudha-label';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(Error('Unable to read the label artwork.'));
    reader.onerror = () => reject(Error('Unable to read the label artwork.'));
    reader.readAsDataURL(file);
  });
}

export function BarcodeGenerator({ product, batches }: BarcodeGeneratorProps) {
  const { user } = useAuth();
  const defaultArtworkSize = getDefaultArtworkSize(product.sku);
  const [design, setDesign] = useState<LabelDesign>('clean');
  const [mode, setMode] = useState<BarcodeMode>('sku');
  const [preset, setPreset] = useState<LabelPreset>('thermal-50x30');
  const [batchId, setBatchId] = useState('');
  const [showPrice, setShowPrice] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [copies, setCopies] = useState(1);
  const [artwork, setArtwork] = useState('');
  const [artworkTemplateUrl, setArtworkTemplateUrl] = useState('');
  const [artworkName, setArtworkName] = useState('');
  const [artworkError, setArtworkError] = useState('');
  const [artworkId, setArtworkId] = useState('');
  const [artworkChecksum, setArtworkChecksum] = useState('');
  const [measuredWidth, setMeasuredWidth] = useState('');
  const [measuredHeight, setMeasuredHeight] = useState('');
  const [scannedValue, setScannedValue] = useState('');
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [templateError, setTemplateError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState('');
  const [reprintReason, setReprintReason] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturedDate, setManufacturedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [widthMm, setWidthMm] = useState(String(defaultArtworkSize.widthMm));
  const [heightMm, setHeightMm] = useState(String(defaultArtworkSize.heightMm));
  const [step, setStep] = useState(1);
  const [sampleScanned, setSampleScanned] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [history, setHistory] = useState<PrintJob[]>([]);
  const labelRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const batch = batches.find(item => item.id === batchId);
  const spec = getBarcodeSpec(product, mode);
  const physicalWidth = Number(widthMm);
  const physicalHeight = Number(heightMm);
  const validArtworkSize = Number.isFinite(physicalWidth) && Number.isFinite(physicalHeight) && physicalWidth > 0 && physicalHeight > 0 && physicalWidth <= 1000 && physicalHeight <= 1000;
  const canExport = !!spec && (design === 'clean' || !!artwork);
  const auditRequired = user?.id !== 'local-demo';
  const requestedTemplateUrl = design === 'artwork' ? artworkTemplateUrl : `akudha://clean-label/${preset}`;
  const approvedTemplate = useMemo(() => templates.find(template => template.status === 'approved' && template.artworkUrl === requestedTemplateUrl), [requestedTemplateUrl, templates]);
  const isReprint = !!approvedTemplate && !!spec && history.some(job => job.templateId === approvedTemplate.id && job.barcodeValue === spec.value);
  const canPrint = canExport && (design === 'clean' || validArtworkSize) && (!auditRequired || !!approvedTemplate) && (copies === 1 || sampleScanned) && (!isReprint || !!reprintReason.trim()) && !printing;

  useEffect(() => {
    setMode('sku');
    setBatchId('');
    setBatchNumber('');
    setManufacturedDate('');
    setExpiryDate('');
    const productArtworkSize = getDefaultArtworkSize(product.sku);
    setWidthMm(String(productArtworkSize.widthMm));
    setHeightMm(String(productArtworkSize.heightMm));
    setArtworkError('');
    setTemplateError('');
    setPrintMessage('');
    setReprintReason('');
    setArtworkTemplateUrl('');
    setStep(1); setSampleScanned(false); setProofOpen(false); setHistory([]);
    const builtInArtwork = PRODUCT_ARTWORK[product.sku];
    if (!builtInArtwork) {
      setArtwork('');
      setArtworkName('');
      setDesign('clean');
      return;
    }
    let active = true;
    fetch(builtInArtwork.source)
      .then(response => {
        if (!response.ok) throw Error('The supplied Baobab artwork could not be loaded.');
        return response.blob();
      })
      .then(fileToDataUrl)
      .then(dataUrl => {
        if (!active) return;
        setArtwork(dataUrl);
        setArtworkTemplateUrl(builtInArtwork.source);
        setArtworkName(builtInArtwork.name);
        setDesign('artwork');
      })
      .catch(error => {
        if (!active) return;
        setArtworkError(error instanceof Error ? error.message : 'The supplied Baobab artwork could not be loaded.');
        setDesign('clean');
      });
    return () => { active = false; };
  }, [product.id, product.sku]);

  useEffect(() => {
    if (!auditRequired) { setTemplates([]); return; }
    let active = true;
    setTemplateError('');
    apiFetch(`/api/inventory/templates?productId=${encodeURIComponent(product.id)}`)
      .then(async response => {
        if (!response.ok) throw Error(await readApiError(response));
        const body = await response.json() as { data: ApprovedTemplate[] };
        if (active) setTemplates(body.data);
      })
      .catch(error => { if (active) setTemplateError(error instanceof Error ? error.message : 'Unable to load approved label templates.'); });
    return () => { active = false; };
  }, [auditRequired, product.id]);

  const loadHistory = async () => {
    if (!auditRequired) { setHistory([]); return; }
    try {
      const response = await apiFetch(`/api/inventory/print-jobs?productId=${encodeURIComponent(product.id)}`);
      if (!response.ok) throw Error(await readApiError(response));
      const body = await response.json() as { data: PrintJob[] };
      setHistory(body.data);
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Unable to load print history.');
    }
  };

  useEffect(() => { void loadHistory(); }, [auditRequired, product.id]);

  const registerApprovedTemplate = async () => {
    if (!artworkTemplateUrl || !artworkChecksum) { setTemplateError('Upload the artwork to the server first.'); return; }
    try {
      const dimensions = design === 'artwork' ? { widthMm: physicalWidth, heightMm: physicalHeight } : LABEL_PRESETS[preset];
      const maxVersion = templates.reduce((current, t) => Math.max(current, t.version), 0);
      const response = await apiFetch('/api/inventory/templates', { method: 'POST', body: JSON.stringify({ productId: product.id, name: artworkName || `Label v${maxVersion + 1}`, artworkUrl: artworkTemplateUrl, artworkChecksum, widthMm: dimensions.widthMm, heightMm: dimensions.heightMm, version: maxVersion + 1, status: 'approved' }) });
      if (!response.ok) throw Error(await readApiError(response));
      const created = (await response.json()).data as { _id: string; name: string; artworkUrl: string; artworkChecksum: string; widthMm: number; heightMm: number; version: number; status: ApprovedTemplate['status'] };
      setTemplates(previous => [{ id: String(created._id), productId: product.id, name: created.name, artworkUrl: created.artworkUrl, artworkChecksum: created.artworkChecksum, widthMm: created.widthMm, heightMm: created.heightMm, version: created.version, status: created.status }, ...previous]);
      setPrintMessage('Approved template registered. You can now print.');
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Unable to register the template.');
    }
  };

  useEffect(() => {
    if (!batch) return;
    setBatchNumber(batch.lot);
    setExpiryDate(batch.expiry);
  }, [batch]);

  const uploadArtwork = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setArtworkError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setArtworkError('Choose a PNG, JPG or WebP label image.');
      return;
    }
    if (file.size > MAX_ARTWORK_BYTES) {
      setArtworkError('Artwork must be 8 MB or smaller.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setArtwork(dataUrl);
      setArtworkTemplateUrl('');
      setArtworkName(file.name);
      setDesign('artwork');
      try {
        const res = await apiFetch('/api/inventory/artworks', { method: 'POST', body: JSON.stringify({ name: file.name, productId: product.id, dataUrl, widthMm: validArtworkSize ? physicalWidth : undefined, heightMm: validArtworkSize ? physicalHeight : undefined }) });
        if (res.ok) {
          const created = (await res.json()) as { data: { id: string; checksum: string } };
          setArtworkId(created.data.id); setArtworkChecksum(created.data.checksum); setArtworkTemplateUrl(`/api/inventory/artworks/${created.data.id}`);
        } else {
          setArtworkError('Artwork preview is local only — it could not be saved to the server.');
        }
      } catch {
        setArtworkError('Artwork preview is local only — it could not be saved to the server.');
      }
    } catch (error) {
      setArtworkError(error instanceof Error ? error.message : 'Unable to read the label artwork.');
    }
  };

  const serializeLabel = () => {
    if (!labelRef.current) throw Error('The label preview is not ready.');
    const clone = labelRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    return new XMLSerializer().serializeToString(clone);
  };

  const downloadSvg = () => {
    if (!canExport) return;
    downloadBlob(new Blob([serializeLabel()], { type: 'image/svg+xml;charset=utf-8' }), `${safeFilename(product.name)}-label.svg`);
  };

  const downloadPng = async () => {
    if (!canExport) return;
    const source = serializeLabel();
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(Error('Unable to render the PNG.'));
        image.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = design === 'artwork' ? 2000 : 1400;
      canvas.height = design === 'artwork' ? 1000 : 800;
      const context = canvas.getContext('2d');
      if (!context) throw Error('PNG export is unavailable in this browser.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('Unable to create the PNG.')), 'image/png'));
      downloadBlob(png, `${safeFilename(product.name)}-label.png`);
    } catch (error) {
      setArtworkError(error instanceof Error ? error.message : 'Unable to create the PNG.');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const openPrintDialog = () => {
    const css = design === 'artwork' ? printArtworkCss(physicalWidth, physicalHeight) : printPageCss(preset);
    const style = document.createElement('style');
    style.dataset.akudhaPrint = 'label';
    style.textContent = css;
    document.head.append(style);
    const removeStyle = () => style.remove();
    window.addEventListener('afterprint', removeStyle, { once: true });
    window.print();
    setTimeout(removeStyle, 2000);
  };

  const print = async () => {
    if (!canPrint || !spec) return;
    setTemplateError('');
    setPrintMessage('');
    if (!auditRequired) { openPrintDialog(); return; }
    if (!approvedTemplate) { setTemplateError('This design does not have an approved server template.'); return; }
    const dimensions = design === 'artwork' ? { widthMm: physicalWidth, heightMm: physicalHeight } : LABEL_PRESETS[preset];
    setPrinting(true);
    try {
      const response = await apiFetch('/api/inventory/print-jobs', { method: 'POST', body: JSON.stringify({ productId: product.id, batchId: batchId || undefined, templateId: approvedTemplate.id, barcodeValue: spec.value, widthMm: dimensions.widthMm, heightMm: dimensions.heightMm, copies, reprintReason: reprintReason.trim() || undefined, measuredWidthMm: measuredWidth ? Number(measuredWidth) : undefined, measuredHeightMm: measuredHeight ? Number(measuredHeight) : undefined, scannedValue: scannedValue.trim() || undefined }) });
      if (!response.ok) throw Error(await readApiError(response));
      const body = await response.json() as { data: { id: string; scanAccepted?: boolean; calibrationOk?: boolean } };
      setPrintMessage(`Print job ${body.data.id.slice(-6).toUpperCase()} recorded.${body.data.scanAccepted === false ? ' Scan mismatch.' : ''}${body.data.calibrationOk === false ? ' Size mismatch vs template.' : ''}`);
      await loadHistory();
      openPrintDialog();
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Unable to record the print job.');
    } finally {
      setPrinting(false);
    }
  };

  const label = design === 'artwork' && artwork
    ? <ArtworkLabel product={product} mode={mode} artwork={artwork} batchNumber={batchNumber} manufacturedDate={manufacturedDate} expiryDate={expiryDate} widthMm={validArtworkSize ? physicalWidth : undefined} heightMm={validArtworkSize ? physicalHeight : undefined} labelRef={labelRef} />
    : <BarcodeLabel product={product} batch={batch} mode={mode} preset={preset} showPrice={showPrice} showBatch={showBatch} labelRef={labelRef} />;

  const readiness = [
    ['Approved template', !auditRequired || !!approvedTemplate],
    ['Valid barcode', !!spec],
    ['Print dimensions', design === 'clean' || validArtworkSize],
    ['Sample scan', sampleScanned],
    ['Audit ready', !auditRequired || !!approvedTemplate],
  ] as const;
  const goNext = () => setStep(current => Math.min(5, current + 1));
  const goBack = () => setStep(current => Math.max(1, current - 1));

  return <section className="barcode-workbench" aria-label="Label maker">
    <div className="barcode-settings">
      <div><p className="stock-eyebrow">GUIDED LABEL JOB</p><h3>Prepare {product.name}</h3><p>Complete the five checks, inspect a proof, then record and print the job.</p></div>
      <nav className="barcode-steps" aria-label="Label setup steps">{['Template', 'Barcode', 'Size', 'Proof', 'Print'].map((name, index) => <button type="button" key={name} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'is-current' : step > index + 1 ? 'is-complete' : ''} onClick={() => setStep(index + 1)}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span>{name}</button>)}</nav>

      {step === 1 && <div className="barcode-step"><div><p className="stock-eyebrow">STEP 1 OF 5</p><h4>Product and template</h4><p>{product.name} · {product.variant}</p></div><fieldset><legend>Label design</legend>
        <label className={`barcode-choice ${design === 'artwork' ? 'is-selected' : ''} ${!artwork ? 'is-disabled' : ''}`}><input type="radio" name="label-design" checked={design === 'artwork'} disabled={!artwork} onChange={() => setDesign('artwork')} /><span><strong>Akudha wrap artwork</strong><small>{artwork ? artworkName : 'Upload individual artwork for this product'}</small></span></label>
        <label className={`barcode-choice ${design === 'clean' ? 'is-selected' : ''}`}><input type="radio" name="label-design" checked={design === 'clean'} onChange={() => setDesign('clean')} /><span><strong>Clean barcode label</strong><small>For thermal rolls or 21-up A4 sheets</small></span></label>
      </fieldset>
      <div className="barcode-upload"><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadArtwork} /><button type="button" onClick={() => fileRef.current?.click()}><ImagePlus size={15} /> {artwork ? 'Replace artwork' : 'Upload artwork'}</button>{artwork && <button type="button" aria-label="Remove uploaded artwork" onClick={() => { setArtwork(''); setArtworkTemplateUrl(''); setArtworkName(''); setDesign('clean'); }}><Trash2 size={15} /> Remove</button>}</div>
      {artworkError && <p className="stock-error" role="alert">{artworkError}</p>}</div>}

      {step === 2 && <div className="barcode-step"><div><p className="stock-eyebrow">STEP 2 OF 5</p><h4>Barcode and lot</h4><p>Choose the saved identifier and connect this label to a batch.</p></div><fieldset><legend>Barcode identifier</legend>
        <label className={`barcode-choice ${mode === 'sku' ? 'is-selected' : ''}`}><input type="radio" name="barcode-mode" checked={mode === 'sku'} onChange={() => setMode('sku')} /><span><strong>Internal SKU · Code 128</strong><small>{product.sku}</small></span></label>
        <label className={`barcode-choice ${mode === 'gtin' ? 'is-selected' : ''} ${!product.gtin ? 'is-disabled' : ''}`}><input type="radio" name="barcode-mode" checked={mode === 'gtin'} disabled={!product.gtin} onChange={() => setMode('gtin')} /><span><strong>Retail GTIN</strong><small>{product.gtin || 'Add a valid GTIN to the product first'}</small></span></label>
      </fieldset>
      {batches.length > 0 && <label>Inventory batch<select value={batchId} onChange={event => setBatchId(event.target.value)}><option value="">No batch selected</option>{batches.map(item => <option key={item.id} value={item.id}>{item.lot} · expires {item.expiry}</option>)}</select></label>}
      {design === 'artwork' && <label>Batch number<input value={batchNumber} maxLength={40} onChange={event => setBatchNumber(event.target.value)} placeholder="e.g. BAO-260925" /></label>}</div>}

      {step === 3 && <div className="barcode-step"><div><p className="stock-eyebrow">STEP 3 OF 5</p><h4>Dates and dimensions</h4><p>Confirm the physical output before printing.</p></div>{design === 'artwork' ? <><div className="stock-fields barcode-variable-fields"><label>Manufacturing date<input type="date" value={manufacturedDate} onChange={event => setManufacturedDate(event.target.value)} /></label><label>Expiry date<input type="date" value={expiryDate} onChange={event => setExpiryDate(event.target.value)} /></label></div><div className="barcode-dimensions"><label>Width · mm<input type="number" min="1" max="1000" step="0.1" value={widthMm} onChange={event => setWidthMm(event.target.value)} /></label><span>×</span><label>Height · mm<input type="number" min="1" max="1000" step="0.1" value={heightMm} onChange={event => setHeightMm(event.target.value)} /></label></div></> : <><label>Label stock<select value={preset} onChange={event => setPreset(event.target.value as LabelPreset)}>{Object.entries(LABEL_PRESETS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label><label className="barcode-check"><input type="checkbox" checked={showPrice} onChange={event => setShowPrice(event.target.checked)} /> Show selling price</label><label className="barcode-check"><input type="checkbox" checked={showBatch} disabled={!batch} onChange={event => setShowBatch(event.target.checked)} /> Show batch and expiry</label></>}</div>}

      {step === 4 && <div className="barcode-step"><div><p className="stock-eyebrow">STEP 4 OF 5</p><h4>Copies and proof</h4><p>Start with one sample. Scan it before increasing the quantity.</p></div><label>Copies<input type="number" min="1" max="100" step="1" value={copies} onChange={event => setCopies(Math.max(1, Math.min(100, Math.round(Number(event.target.value) || 1))))} /></label><label className="barcode-check"><input type="checkbox" checked={sampleScanned} onChange={event => setSampleScanned(event.target.checked)} /> I printed and successfully scanned a sample</label>{copies > 1 && !sampleScanned && <p className="stock-error">Confirm a successful sample scan before printing multiple copies.</p>}<button type="button" onClick={() => setProofOpen(true)}><Expand size={15} /> Open full-screen proof</button></div>}

      {step === 5 && <div className="barcode-step"><div><p className="stock-eyebrow">STEP 5 OF 5</p><h4>Preflight and audited print</h4><p>Resolve every required item before the production run.</p></div><ul className="barcode-readiness">{readiness.map(([name, ready]) => <li key={name} className={ready ? 'is-ready' : ''}><span>{ready ? <Check size={14} /> : '!'}</span>{name}<strong>{ready ? 'Ready' : name === 'Sample scan' ? 'Pending' : 'Required'}</strong></li>)}</ul>{isReprint && <label>Reprint reason<input value={reprintReason} maxLength={200} onChange={event => setReprintReason(event.target.value)} placeholder="e.g. damaged label or printer alignment" required /></label>}<div className="barcode-controls"><button className="stock-primary" type="button" disabled={!canPrint} onClick={() => void print()}><Printer size={15} /> {printing ? 'Recording…' : copies === 1 && !sampleScanned ? 'Print sample / save PDF' : 'Print / save PDF'}</button><button type="button" disabled={!canExport} onClick={downloadSvg}><Download size={15} /> SVG</button><button type="button" disabled={!canExport} onClick={downloadPng}><Download size={15} /> PNG</button></div>{templateError && <p className="stock-error" role="alert">{templateError}</p>}{printMessage && <p className="stock-success" role="status">{printMessage}</p>}<div className="barcode-history"><h4>Recent print jobs</h4>{history.length === 0 ? <p>No audited print jobs yet.</p> : history.slice(0, 5).map(job => <article key={job.id}><strong>{job.copies} {job.copies === 1 ? 'copy' : 'copies'} · template v{job.templateVersion}</strong><span>{new Date(job.createdAt).toLocaleString()} · {job.printedBy}</span>{job.reprintReason && <small>Reprint: {job.reprintReason}</small>}</article>)}</div></div>}

      <div className="barcode-step-actions"><button type="button" onClick={goBack} disabled={step === 1}>Back</button>{step < 5 && <button type="button" className="stock-primary" onClick={goNext}>Continue</button>}</div>
    </div>
    {step === 5 && auditRequired && <div className="barcode-print-config" aria-label="Print calibration and acceptance">
      <h5 className="font-semibold">Calibration & scanner acceptance</h5>
      <label className="block text-sm">Measured width (mm)<input aria-label="Measured width in millimetres" value={measuredWidth} onChange={event => setMeasuredWidth(event.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="mt-1 block w-full rounded-control border border-line bg-white px-3 py-2" /></label>
      <label className="block text-sm">Measured height (mm)<input aria-label="Measured height in millimetres" value={measuredHeight} onChange={event => setMeasuredHeight(event.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="mt-1 block w-full rounded-control border border-line bg-white px-3 py-2" /></label>
      <label className="block text-sm">Scanned barcode value<input aria-label="Scanned barcode value" value={scannedValue} onChange={event => setScannedValue(event.target.value)} className="mt-1 block w-full rounded-control border border-line bg-white px-3 py-2" /></label>
      {user?.role === 'super_admin' && <button type="button" onClick={() => void registerApprovedTemplate()} disabled={!artworkId} className="mt-2 rounded-control border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50">Register approved template from this artwork</button>}
      {user?.role !== 'super_admin' && <p className="text-xs text-ink-muted">A super administrator must approve the label template before printing.</p>}
    </div>}
    <div className="barcode-proof">
      <div className="barcode-proof__header"><span>PRINT PREVIEW</span><span>{design === 'artwork' ? validArtworkSize ? `${physicalWidth} × ${physicalHeight} mm` : 'SIZE REQUIRED FOR PRINT' : LABEL_PRESETS[preset].label.toUpperCase()}</span></div>
      <div className={`barcode-stage ${design === 'artwork' ? 'barcode-stage--artwork' : `barcode-stage--${preset}`}`}>{spec ? label : <p>Add a valid barcode identifier to preview this label.</p>}</div>
      <button type="button" className="barcode-proof-open" onClick={() => setProofOpen(true)}><Expand size={15} /> Inspect full-screen proof</button>
      <p className="barcode-footnote">Print at 100% scale with browser headers and footers disabled. Physical dimensions are preserved.</p>
    </div>
    {proofOpen && <div className="barcode-proof-modal" role="dialog" aria-modal="true" aria-label="Full-screen label proof"><button type="button" aria-label="Close proof" onClick={() => setProofOpen(false)}><X size={20} /></button><div className={`barcode-stage ${design === 'artwork' ? 'barcode-stage--artwork' : `barcode-stage--${preset}`}`}>{spec ? label : <p>Add a valid barcode identifier to preview this label.</p>}</div></div>}
    {createPortal(<div className={`stock-print-sheet ${design === 'artwork' ? 'stock-print-sheet--artwork' : `stock-print-sheet--${preset}`}`} aria-hidden="true">{Array.from({ length: copies }, (_, index) => design === 'artwork' && artwork ? <ArtworkLabel key={index} product={product} mode={mode} artwork={artwork} batchNumber={batchNumber} manufacturedDate={manufacturedDate} expiryDate={expiryDate} widthMm={validArtworkSize ? physicalWidth : undefined} heightMm={validArtworkSize ? physicalHeight : undefined} /> : <BarcodeLabel key={index} product={product} batch={batch} mode={mode} preset={preset} showPrice={showPrice} showBatch={showBatch} />)}</div>, document.body)}
  </section>;
}
