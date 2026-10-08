import { Router, type Response } from 'express';
import { processingPayloadSchema } from '../lib/schemas.js';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ProcessingBatchModel } from '../models/index.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!ProcessingBatchModel.db?.readyState) { res.json({ data: [], source: 'offline' }); return; }
  const batches = await ProcessingBatchModel.find({ organizationId: req.user!.organizationId }).sort({ processingDate: -1 }).limit(10_000).lean();
  res.json({ data: batches, source: 'database' });
});

router.post('/', validateBody(processingPayloadSchema), async (req: AuthenticatedRequest, res: Response) => {
  const body = processingPayloadSchema.parse(req.body);
  if (!ProcessingBatchModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable. Queue this transaction offline.', idempotent_uuid: body.idempotent_uuid }); return; }
  try {
    const saved = await ProcessingBatchModel.create({
      organizationId: req.user!.organizationId, actorId: req.user!.sub,
      syncId: body.idempotent_uuid,
      batchId: body.batch_id, inputRawWeightKg: body.raw_weight_kg,
      outputSachetCount: body.total_175ml_sachets_produced, processingDate: body.date_processed,
      operatorId: req.user!.sub,
    });
    res.status(201).json({ data: saved });
  } catch (error) {
    const issue = error as { code?: number; message?: string };
    res.status(issue.code === 11000 ? 409 : 400).json({ error: issue.code === 11000 ? 'Duplicate batch' : issue.message || 'Invalid processing batch' });
  }
});

export default router;
