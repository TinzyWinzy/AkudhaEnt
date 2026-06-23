import { Router, Request, Response } from 'express';
import { ProcessingBatchModel } from '../models';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  if (!ProcessingBatchModel.db?.readyState) {
    return res.json({ data: [], source: 'offline' });
  }
  const batches = await ProcessingBatchModel.find().sort({ processingDate: -1 }).lean();
  res.json({ data: batches, source: 'database' });
});

router.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  if (!ProcessingBatchModel.db?.readyState) {
    return res.status(503).json({
      error: 'Database unavailable. Queue this transaction offline.',
      idempotent_uuid: body.idempotent_uuid,
    });
  }

  try {
    const batch = new ProcessingBatchModel({
      batchId: body.batch_id || body.batchId,
      inputRawWeightKg: body.raw_weight_kg ?? body.inputRawWeightKg,
      outputSachetCount: body.total_175ml_sachets_produced ?? body.outputSachetCount,
      processingDate: body.date_processed || body.processingDate || new Date(),
      operatorId: body.operator_id || body.operatorId || '',
    });

    const saved = await batch.save();
    res.status(201).json({ data: saved });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
