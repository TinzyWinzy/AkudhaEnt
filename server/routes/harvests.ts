import { Router, type Response } from 'express';
import { harvestPayloadSchema } from '../lib/schemas.js';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { HarvesterSourcingModel } from '../models/index.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!HarvesterSourcingModel.db?.readyState) { res.json({ data: [], source: 'offline' }); return; }
  const scope = req.user!.role === 'field_coordinator'
    ? { organizationId: req.user!.organizationId, region: req.user!.region as 'Chimanimani' | 'Mudzi' | 'Binga' | 'Mt Darwin' | 'Chiredzi' }
    : { organizationId: req.user!.organizationId };
  const records = await HarvesterSourcingModel.find(scope).sort({ offlineCreatedAt: -1 }).limit(10_000).lean();
  res.json({ data: records, source: 'database' });
});

router.post('/', validateBody(harvestPayloadSchema), async (req: AuthenticatedRequest, res: Response) => {
  const body = harvestPayloadSchema.parse(req.body);
  if (req.user!.role === 'field_coordinator' && body.region !== req.user!.region) {
    res.status(403).json({ error: 'Cannot create a harvest outside the assigned region' }); return;
  }
  if (!HarvesterSourcingModel.db?.readyState) {
    res.status(503).json({ error: 'Database unavailable. Queue this transaction offline.', idempotent_uuid: body.idempotent_uuid }); return;
  }
  try {
    const saved = await HarvesterSourcingModel.create({
      organizationId: req.user!.organizationId, actorId: req.user!.sub,
      harvesterId: body.harvester_id, name: body.harvester_name, region: body.region, phone: '',
      weightKg: body.raw_weight_kg, qualityGrade: body.quality_grade, payoutUsd: body.payout_amount_usd,
      offlineCreatedAt: body.offline_created_at, syncId: body.idempotent_uuid,
    });
    res.status(201).json({ data: saved, idempotent: true });
  } catch (error) {
    const issue = error as { code?: number; message?: string };
    if (issue.code === 11000 || issue.message?.includes('IDEMPOTENCY CONFLICT')) { res.status(409).json({ error: 'Duplicate transaction', idempotent: true }); return; }
    res.status(400).json({ error: issue.message || 'Invalid harvest transaction' });
  }
});

export default router;
