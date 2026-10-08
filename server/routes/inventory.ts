import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ensureProductLabelTemplates } from '../lib/labelTemplates.js';
import { InventoryLotModel, LabelPrintJobModel, LabelTemplateModel, ProductModel, StockMovementModel } from '../models/index.js';

const router = Router();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const productSchema = z.object({ id: z.string().min(1).max(100), name: z.string().trim().min(1).max(100), variant: z.string().trim().min(1).max(60), sku: z.string().regex(/^[A-Z0-9][A-Z0-9-]{1,31}$/), gtin: z.string().regex(/^(|\d{8}|\d{12}|\d{13}|\d{14})$/), price: z.number().min(0).max(1e9), cost: z.number().min(0).max(1e9), reorder: z.number().int().min(0).max(1e9) }).strict();
const batchSchema = z.object({ id: z.string().min(1).max(100), productId: z.string().min(1).max(100), lot: z.string().trim().min(1).max(60), received: date, expiry: date, quantity: z.number().int().min(0).max(1e9) }).strict();
const movementSchema = z.object({ id: z.string().min(1).max(100), productId: z.string().min(1).max(100), batchId: z.string().min(1).max(100), type: z.enum(['receipt', 'sale', 'waste']), quantity: z.number().int().positive().max(1e9), unitPrice: z.number().min(0).max(1e9), at: z.string().datetime(), note: z.string().max(200), transactionId: z.string().min(1).max(100) }).strict();
const syncSchema = z.object({ catalogue: z.object({ version: z.literal(1), products: z.array(productSchema).max(10000), batches: z.array(batchSchema).max(100000), movements: z.array(movementSchema).max(500000) }).strict() }).strict();
const templateSchema = z.object({
  productId: z.string().min(1).max(100), name: z.string().trim().min(1).max(120), artworkUrl: z.string().trim().min(1).max(2048),
  artworkChecksum: z.string().regex(/^[a-f0-9]{64}$/i), widthMm: z.number().positive().max(1000), heightMm: z.number().positive().max(1000),
  version: z.number().int().positive().max(100000), status: z.enum(['draft', 'approved']).default('draft'),
}).strict();
const templateStatusSchema = z.object({ status: z.enum(['draft', 'approved', 'retired']) }).strict();
const printJobSchema = z.object({
  productId: z.string().min(1).max(100), batchId: z.string().min(1).max(100).optional(), templateId: z.string().regex(/^[a-f0-9]{24}$/i),
  barcodeValue: z.string().trim().min(1).max(64), widthMm: z.number().positive().max(1000), heightMm: z.number().positive().max(1000),
  copies: z.number().int().min(1).max(100), reprintReason: z.string().trim().max(200).optional(),
  measuredWidthMm: z.number().positive().max(1000).optional(), measuredHeightMm: z.number().positive().max(1000).optional(), scannedValue: z.string().trim().max(64).optional(),
}).strict();

router.get('/snapshot', async (req: AuthenticatedRequest, res: Response) => {
  if (!ProductModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const organizationId = req.user!.organizationId;
  const [products, lots, movements] = await Promise.all([
    ProductModel.find({ organizationId, active: true }).sort({ name: 1 }).lean(),
    InventoryLotModel.find({ organizationId }).sort({ expiryDate: 1 }).lean(),
    StockMovementModel.find({ organizationId }).sort({ occurredAt: 1 }).limit(100000).lean(),
  ]);
  const productClientIds = new Map(products.map(product => [String(product._id), product.clientId]));
  const lotClientIds = new Map(lots.map(lot => [String(lot._id), lot.clientId]));
  res.json({ catalogue: {
    version: 1,
    products: products.map(product => ({ id: product.clientId, name: product.name, variant: product.variant, sku: product.sku, gtin: product.gtin ?? '', price: product.price, cost: product.cost, reorder: product.reorder })),
    batches: lots.map(lot => ({ id: lot.clientId, productId: productClientIds.get(String(lot.productId)), lot: lot.lot, received: lot.receivedDate.toISOString().slice(0, 10), expiry: lot.expiryDate.toISOString().slice(0, 10), quantity: lot.quantityOnHand })),
    movements: movements.map(movement => ({ id: movement.clientId, productId: productClientIds.get(String(movement.productId)), batchId: lotClientIds.get(String(movement.lotId)), type: movement.type, quantity: movement.quantity, unitPrice: movement.unitPrice, at: movement.occurredAt.toISOString(), note: movement.note, transactionId: movement.transactionId })),
  }, cursor: new Date().toISOString() });
});

router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  if (!LabelTemplateModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const product = typeof req.query.productId === 'string' ? await ProductModel.findOne({ organizationId: req.user!.organizationId, clientId: req.query.productId }).lean() : null;
  if (typeof req.query.productId === 'string' && !product) { res.status(404).json({ error: 'Product not found' }); return; }
  if (product) await ensureProductLabelTemplates([product], req.user!.sub);
  const filter = { organizationId: req.user!.organizationId, ...(product ? { productId: product._id } : {}) };
  const templates = await LabelTemplateModel.find(filter).sort({ productId: 1, version: -1 }).lean();
  const products = product ? [product] : await ProductModel.find({ organizationId: req.user!.organizationId, _id: { $in: templates.map(template => template.productId) } }).lean();
  const clientIds = new Map(products.map(item => [String(item._id), item.clientId]));
  res.json({ data: templates.map(template => ({ id: String(template._id), productId: clientIds.get(String(template.productId)), name: template.name, artworkUrl: template.artworkUrl, artworkChecksum: template.artworkChecksum, widthMm: template.widthMm, heightMm: template.heightMm, version: template.version, status: template.status })) });
});

router.post('/templates', validateBody(templateSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!LabelTemplateModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const body = templateSchema.parse(req.body);
  const product = await ProductModel.findOne({ organizationId: req.user!.organizationId, clientId: body.productId });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
  if (body.status === 'approved' && req.user!.role !== 'super_admin') { res.status(403).json({ error: 'Only a super administrator can approve a label template' }); return; }
  try {
    const template = await LabelTemplateModel.create({ ...body, organizationId: req.user!.organizationId, productId: product._id, createdBy: req.user!.sub });
    res.status(201).json({ data: template });
  } catch (error) {
    const issue = error as { code?: number; message?: string };
    res.status(issue.code === 11000 ? 409 : 400).json({ error: issue.code === 11000 ? 'Template version already exists' : issue.message || 'Invalid template' });
  }
});

router.patch('/templates/:id/status', validateBody(templateStatusSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'super_admin') { res.status(403).json({ error: 'Only a super administrator can change template approval status' }); return; }
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid template identifier' }); return; }
  const template = await LabelTemplateModel.findOneAndUpdate({ _id: req.params.id, organizationId: req.user!.organizationId }, { $set: { status: req.body.status } }, { new: true, runValidators: true });
  if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
  res.json({ data: template });
});

router.get('/print-jobs', async (req: AuthenticatedRequest, res: Response) => {
  if (!LabelPrintJobModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const product = typeof req.query.productId === 'string' ? await ProductModel.findOne({ organizationId: req.user!.organizationId, clientId: req.query.productId }).lean() : null;
  if (typeof req.query.productId === 'string' && !product) { res.status(404).json({ error: 'Product not found' }); return; }
  const jobs = await LabelPrintJobModel.find({ organizationId: req.user!.organizationId, ...(product ? { productId: product._id } : {}) }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ data: jobs.map(job => ({ id: String(job._id), productId: product?.clientId, templateId: String(job.templateId), templateVersion: job.templateVersion, barcodeValue: job.barcodeValue, widthMm: job.widthMm, heightMm: job.heightMm, copies: job.copies, printedBy: job.printedBy, reprintReason: job.reprintReason, createdAt: job.createdAt })) });
});

router.post('/print-jobs', validateBody(printJobSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!LabelPrintJobModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const body = printJobSchema.parse(req.body);
  const organizationId = req.user!.organizationId;
  const product = await ProductModel.findOne({ organizationId, clientId: body.productId });
  if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
  if (body.barcodeValue !== product.sku && body.barcodeValue !== product.gtin) { res.status(400).json({ error: 'Barcode does not belong to this product' }); return; }
  const template = await LabelTemplateModel.findOne({ _id: body.templateId, organizationId, productId: product._id, status: 'approved' });
  if (!template) { res.status(409).json({ error: 'Choose an approved label template before printing' }); return; }
  const lot = body.batchId ? await InventoryLotModel.findOne({ organizationId, clientId: body.batchId, productId: product._id }) : null;
  if (body.batchId && !lot) { res.status(404).json({ error: 'Inventory batch not found for this product' }); return; }
  const priorFilter = { organizationId, productId: product._id, templateId: template._id, barcodeValue: body.barcodeValue, ...(lot ? { lotId: lot._id } : { lotId: { $exists: false } }) };
  if (await LabelPrintJobModel.exists(priorFilter) && !body.reprintReason) { res.status(409).json({ error: 'Enter a reprint reason before printing this label again' }); return; }
  const scanAccepted = typeof body.scannedValue === 'string' && body.scannedValue === body.barcodeValue;
  const calibrationOk = typeof body.measuredWidthMm === 'number' && typeof body.measuredHeightMm === 'number' && Math.abs(body.measuredWidthMm - template.widthMm) <= 1 && Math.abs(body.measuredHeightMm - template.heightMm) <= 1;
  const job = await LabelPrintJobModel.create({ organizationId, productId: product._id, lotId: lot?._id, templateId: template._id, templateVersion: template.version, artworkChecksum: template.artworkChecksum, barcodeValue: body.barcodeValue, widthMm: body.widthMm, heightMm: body.heightMm, copies: body.copies, printedBy: req.user!.sub, reprintReason: body.reprintReason || undefined, measuredWidthMm: body.measuredWidthMm, measuredHeightMm: body.measuredHeightMm, scannedValue: body.scannedValue, scanAccepted, calibrationOk });
  res.status(201).json({ data: { id: String(job._id), createdAt: job.createdAt, scanAccepted, calibrationOk } });
});

router.get('/reconciliation', async (req: AuthenticatedRequest, res: Response) => {
  if (!InventoryLotModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const organizationId = req.user!.organizationId;
  const [lots, totals] = await Promise.all([
    InventoryLotModel.find({ organizationId }).select('_id clientId lot quantityOnHand').lean(),
    StockMovementModel.aggregate<{ _id: mongoose.Types.ObjectId; expected: number }>([
      { $match: { organizationId } },
      { $group: { _id: '$lotId', expected: { $sum: { $cond: [{ $eq: ['$type', 'receipt'] }, '$quantity', { $multiply: ['$quantity', -1] }] } } } },
    ]),
  ]);
  const expected = new Map(totals.map(total => [String(total._id), total.expected]));
  const discrepancies = lots.map(lot => ({ lotId: lot.clientId, lot: lot.lot, stored: lot.quantityOnHand, expected: expected.get(String(lot._id)) ?? 0 })).filter(item => item.stored !== item.expected);
  res.json({ status: discrepancies.length === 0 ? 'balanced' : 'discrepancy', checkedAt: new Date().toISOString(), lotCount: lots.length, discrepancies });
});

router.post('/sync', validateBody(syncSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!ProductModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const organizationId = req.user!.organizationId;
  const actorId = req.user!.sub;
  const { catalogue } = req.body as z.infer<typeof syncSchema>;
  const session = await mongoose.startSession();
  let applied = 0;
  let duplicates = 0;
  try {
    await session.withTransaction(async () => {
      for (const product of catalogue.products) {
        const update = {
          $set: { name: product.name, variant: product.variant, sku: product.sku, price: product.price, cost: product.cost, reorder: product.reorder, active: true, ...(product.gtin ? { gtin: product.gtin } : {}) },
          $setOnInsert: { organizationId, clientId: product.id },
          ...(product.gtin ? {} : { $unset: { gtin: '' } }),
        };
        await ProductModel.updateOne({ organizationId, clientId: product.id }, update, { upsert: true, session, runValidators: true });
      }
      const products = await ProductModel.find({ organizationId, clientId: { $in: catalogue.products.map(product => product.id) } }).session(session);
      const productByClientId = new Map(products.map(product => [product.clientId, product]));
      await ensureProductLabelTemplates(products, actorId, session);
      for (const batch of catalogue.batches) {
        const product = productByClientId.get(batch.productId);
        if (!product) throw Error(`Unknown product for lot ${batch.lot}`);
        await InventoryLotModel.updateOne({ organizationId, clientId: batch.id }, { $set: { productId: product._id, lot: batch.lot, receivedDate: new Date(`${batch.received}T00:00:00.000Z`), expiryDate: new Date(`${batch.expiry}T00:00:00.000Z`) }, $setOnInsert: { organizationId, clientId: batch.id, quantityOnHand: 0 } }, { upsert: true, session, runValidators: true });
      }
      const lots = await InventoryLotModel.find({ organizationId, clientId: { $in: catalogue.batches.map(batch => batch.id) } }).session(session);
      const lotByClientId = new Map(lots.map(lot => [lot.clientId, lot]));
      for (const movement of [...catalogue.movements].sort((a, b) => a.at.localeCompare(b.at))) {
        if (await StockMovementModel.exists({ organizationId, clientId: movement.id }).session(session)) { duplicates += 1; continue; }
        const product = productByClientId.get(movement.productId);
        const lot = lotByClientId.get(movement.batchId);
        if (!product || !lot || String(lot.productId) !== String(product._id)) throw Error(`Invalid movement relationship ${movement.id}`);
        if (movement.type === 'receipt') {
          await InventoryLotModel.updateOne({ _id: lot._id }, { $inc: { quantityOnHand: movement.quantity } }, { session, runValidators: true });
        } else {
          const updated = await InventoryLotModel.updateOne({ _id: lot._id, quantityOnHand: { $gte: movement.quantity } }, { $inc: { quantityOnHand: -movement.quantity } }, { session, runValidators: true });
          if (updated.modifiedCount !== 1) throw Error(`Insufficient stock while applying movement ${movement.id}`);
        }
        await StockMovementModel.create([{ organizationId, clientId: movement.id, transactionId: movement.transactionId, productId: product._id, lotId: lot._id, type: movement.type, quantity: movement.quantity, unitPrice: movement.unitPrice, note: movement.note, occurredAt: new Date(movement.at), actorId }], { session });
        applied += 1;
      }
    });
    res.json({ status: 'synced', applied, duplicates, cursor: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Inventory synchronization failed';
    const isConflict = message.includes('E11000') || message.includes('Insufficient stock') || message.includes('Invalid movement relationship');
    res.status(isConflict ? 409 : 400).json({ error: message });
  } finally {
    await session.endSession();
  }
});

export default router;

