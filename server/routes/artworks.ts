import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { LabelArtworkModel, ProductModel } from '../models/index.js';

const router = Router();
const MAX_ARTWORK_BYTES = 8_000_000;
const uploadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  productId: z.string().min(1).max(100).optional(),
  dataUrl: z.string().min(16).max(20_000_000),
  widthMm: z.number().positive().max(1000).optional(),
  heightMm: z.number().positive().max(1000).optional(),
}).strict();
const statusSchema = z.object({ status: z.enum(['draft', 'approved', 'retired']) }).strict();

function decodeDataUrl(value: string) {
  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(value);
  if (!match) throw Error('Artwork must be a base64 image data URL.');
  const mime = match[1] as 'image/png' | 'image/jpeg' | 'image/webp';
  const bytes = Buffer.from(match[2], 'base64');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw Error('Only PNG, JPEG or WebP artwork is supported.');
  if (bytes.length > MAX_ARTWORK_BYTES) throw Error('Artwork must be 8 MB or smaller.');
  return { mime, bytes };
}

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!LabelArtworkModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const filter: Record<string, unknown> = { organizationId: req.user!.organizationId };
  if (typeof req.query.productId === 'string') {
    const product = await ProductModel.findOne({ organizationId: req.user!.organizationId, clientId: req.query.productId as string }).lean();
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    filter.productId = product._id;
  }
  const artworks = await LabelArtworkModel.find(filter).sort({ name: 1, version: -1 }).select('_id name productId mime checksum sizeBytes widthMm heightMm version status createdBy createdAt').lean();
  res.json({ data: artworks.map(a => ({ id: String(a._id), name: a.name, mime: a.mime, checksum: a.checksum, sizeBytes: a.sizeBytes, widthMm: a.widthMm, heightMm: a.heightMm, version: a.version, status: a.status, createdBy: a.createdBy, createdAt: a.createdAt })) });
});

router.post('/', validateBody(uploadSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!LabelArtworkModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const body = uploadSchema.parse(req.body);
  let decoded; try { decoded = decodeDataUrl(body.dataUrl); } catch (e) { res.status(400).json({ error: (e as Error).message }); return; }
  const product = body.productId ? await ProductModel.findOne({ organizationId: req.user!.organizationId, clientId: body.productId }).lean() : null;
  if (body.productId && !product) { res.status(404).json({ error: 'Product not found' }); return; }
  const checksum = createHash('sha256').update(decoded.bytes).digest('hex');
  const latestFilter = { organizationId: req.user!.organizationId, ...(product ? { productId: product._id } : {}), name: body.name };
  const latest = await LabelArtworkModel.findOne(latestFilter).sort({ version: -1 }).lean();
  const artwork = await LabelArtworkModel.create({ organizationId: req.user!.organizationId, productId: product?._id, name: body.name, mime: decoded.mime, bytes: decoded.bytes, checksum, sizeBytes: decoded.bytes.length, widthMm: body.widthMm, heightMm: body.heightMm, version: (latest?.version ?? 0) + 1, status: 'draft', createdBy: req.user!.sub });
  res.status(201).json({ data: { id: String(artwork._id), name: artwork.name, mime: artwork.mime, checksum: artwork.checksum, sizeBytes: artwork.sizeBytes, widthMm: artwork.widthMm, heightMm: artwork.heightMm, version: artwork.version, status: artwork.status } });
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!LabelArtworkModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid artwork identifier' }); return; }
  const artwork = await LabelArtworkModel.findOne({ _id: req.params.id, organizationId: req.user!.organizationId });
  if (!artwork) { res.status(404).json({ error: 'Artwork not found' }); return; }
  res.setHeader('Content-Type', artwork.mime);
  res.setHeader('Content-Length', String(artwork.bytes.length));
  res.send(artwork.bytes);
});

router.patch('/:id/status', validateBody(statusSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'super_admin') { res.status(403).json({ error: 'Only a super administrator can change artwork approval status' }); return; }
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid artwork identifier' }); return; }
  const artwork = await LabelArtworkModel.findOneAndUpdate({ _id: req.params.id, organizationId: req.user!.organizationId }, { $set: { status: req.body.status } }, { new: true })
    .select('_id name version status');
  if (!artwork) { res.status(404).json({ error: 'Artwork not found' }); return; }
  res.json({ data: { id: String(artwork._id), name: artwork.name, version: artwork.version, status: artwork.status } });
});

export default router;
