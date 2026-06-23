import { Router, Request, Response } from 'express';
import { HarvesterSourcingModel } from '../models';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  if (!HarvesterSourcingModel.db?.readyState) {
    return res.json({ data: [], source: 'offline' });
  }
  const records = await HarvesterSourcingModel.find().sort({ offlineCreatedAt: -1 }).lean();
  res.json({ data: records, source: 'database' });
});

router.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  if (!HarvesterSourcingModel.db?.readyState) {
    return res.status(503).json({
      error: 'Database unavailable. Queue this transaction offline.',
      idempotent_uuid: body.syncId || body.idempotent_uuid,
    });
  }

  try {
    const record = new HarvesterSourcingModel({
      harvesterId: body.harvester_id || body.harvesterId,
      name: body.harvester_name || body.name,
      region: body.region,
      phone: body.phone || '',
      weightKg: body.raw_weight_kg ?? body.weightKg,
      qualityGrade: body.quality_grade ?? body.qualityGrade,
      payoutUsd: body.payout_amount_usd ?? body.payoutUsd,
      offlineCreatedAt: body.offline_created_at || body.offlineCreatedAt || new Date(),
      syncId: body.idempotent_uuid || body.syncId,
    });

    const saved = await record.save();
    res.status(201).json({ data: saved, idempotent: true });
  } catch (error: any) {
    if (error.code === 11000 || error.message?.includes('IDEMPOTENCY CONFLICT')) {
      return res.status(409).json({ error: 'Duplicate transaction', idempotent: true });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;
