import { Router, type Response } from 'express';
import { syncPayloadsSchema } from '../lib/schemas.js';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { HarvesterSourcingModel, ProcessingBatchModel, VendorDispatchModel } from '../models/index.js';

const router = Router();
type SyncType = 'HARVEST' | 'PROCESSING' | 'CONSIGNMENT';
const allowedTypes: Record<string, SyncType[]> = {
  field_coordinator: ['HARVEST'],
  processing_admin: ['PROCESSING'],
  distribution_manager: ['CONSIGNMENT'],
  super_admin: ['HARVEST', 'PROCESSING', 'CONSIGNMENT'],
};

router.post('/', validateBody(syncPayloadsSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { payloads } = syncPayloadsSchema.parse(req.body);
  if (!HarvesterSourcingModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const user = req.user!;
  const results: Array<{ uuid: string; status: 'synced' | 'duplicate' | 'error'; error?: string }> = [];
  for (const item of payloads) {
    try {
      if (!allowedTypes[user.role]?.includes(item.type)) { results.push({ uuid: item.uuid, status: 'error', error: `Role cannot synchronize ${item.type.toLowerCase()} records` }); continue; }
      if (item.type === 'HARVEST' && user.role === 'field_coordinator' && item.payload.region !== user.region) { results.push({ uuid: item.uuid, status: 'error', error: 'Harvest is outside the assigned region' }); continue; }
      if (item.type === 'CONSIGNMENT' && user.role === 'distribution_manager' && item.payload.hub_id !== user.hubId) { results.push({ uuid: item.uuid, status: 'error', error: 'Consignment is outside the assigned hub' }); continue; }
      const organizationId = user.organizationId;
      if (item.type === 'HARVEST') {
        if (await HarvesterSourcingModel.exists({ organizationId, syncId: item.uuid })) { results.push({ uuid: item.uuid, status: 'duplicate' }); continue; }
        const p = item.payload;
        await HarvesterSourcingModel.create({ organizationId, actorId: user.sub, harvesterId: p.harvester_id, name: p.harvester_name, region: p.region, phone: '', weightKg: p.raw_weight_kg, qualityGrade: p.quality_grade, payoutUsd: p.payout_amount_usd, offlineCreatedAt: p.offline_created_at, syncId: item.uuid });
      } else if (item.type === 'PROCESSING') {
        if (await ProcessingBatchModel.exists({ organizationId, syncId: item.uuid })) { results.push({ uuid: item.uuid, status: 'duplicate' }); continue; }
        const p = item.payload;
        await ProcessingBatchModel.create({ organizationId, actorId: user.sub, syncId: item.uuid, batchId: p.batch_id, inputRawWeightKg: p.raw_weight_kg, outputSachetCount: p.total_175ml_sachets_produced, processingDate: p.date_processed, operatorId: user.sub });
      } else {
        if (await VendorDispatchModel.exists({ organizationId, syncId: item.uuid })) { results.push({ uuid: item.uuid, status: 'duplicate' }); continue; }
        const p = item.payload;
        await VendorDispatchModel.create({ organizationId, actorId: user.sub, syncId: item.uuid, dispatchId: p.consignment_id, vendorId: p.vendor_id, hubLocation: p.hub_id, sachetsDispatched: p.sachets_dispatched, sachetsReturnedSpoiled: p.sachets_returned_spoiled, sachetsSold: p.sachets_sold });
      }
      results.push({ uuid: item.uuid, status: 'synced' });
    } catch (error) {
      const issue = error as { code?: number; message?: string };
      results.push(issue.code === 11000 ? { uuid: item.uuid, status: 'duplicate' } : { uuid: item.uuid, status: 'error', error: issue.message || 'Synchronization failed' });
    }
  }
  res.json({ results });
});

export default router;
