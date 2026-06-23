import { Router, Request, Response } from 'express';
import { HarvesterSourcingModel, ProcessingBatchModel, VendorDispatchModel } from '../models';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { payloads } = req.body as {
    payloads: Array<{
      uuid: string;
      type: 'HARVEST' | 'PROCESSING' | 'CONSIGNMENT';
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      payload: any;
      offline_created_at: string;
    }>;
  };

  if (!payloads || !Array.isArray(payloads)) {
    return res.status(400).json({ error: 'payloads array required' });
  }

  if (!HarvesterSourcingModel.db?.readyState) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const results: Array<{ uuid: string; status: 'synced' | 'duplicate' | 'error'; error?: string }> = [];

  for (const item of payloads) {
    try {
      if (item.type === 'HARVEST') {
        const existing = await HarvesterSourcingModel.findOne({ syncId: item.uuid });
        if (existing) {
          results.push({ uuid: item.uuid, status: 'duplicate' });
          continue;
        }
        const p = item.payload;
        await new HarvesterSourcingModel({
          harvesterId: p.harvester_id || p.harvesterId,
          name: p.harvester_name || p.name,
          region: p.region,
          phone: p.phone || '',
          weightKg: p.raw_weight_kg ?? p.weightKg,
          qualityGrade: p.quality_grade ?? p.qualityGrade,
          payoutUsd: p.payout_amount_usd ?? p.payoutUsd,
          offlineCreatedAt: p.offline_created_at || p.offlineCreatedAt,
          syncId: item.uuid,
        }).save();
        results.push({ uuid: item.uuid, status: 'synced' });
      } else if (item.type === 'PROCESSING') {
        const p = item.payload;
        await new ProcessingBatchModel({
          batchId: p.batch_id || p.batchId || `B-${Date.now()}`,
          inputRawWeightKg: p.raw_weight_kg ?? p.inputRawWeightKg,
          outputSachetCount: p.total_175ml_sachets_produced ?? p.outputSachetCount,
          processingDate: p.date_processed || p.processingDate || new Date(),
          operatorId: p.operator_id || p.operatorId || '',
        }).save();
        results.push({ uuid: item.uuid, status: 'synced' });
      } else if (item.type === 'CONSIGNMENT') {
        const p = item.payload;
        await new VendorDispatchModel({
          dispatchId: p.consignment_id || p.dispatchId || `C-${Date.now()}`,
          vendorId: p.vendor_id || p.vendorId,
          hubLocation: p.hub_id || p.hubLocation,
          sachetsDispatched: p.sachets_dispatched ?? p.sachetsDispatched,
          sachetsReturnedSpoiled: p.sachets_returned_spoiled ?? p.sachetsReturnedSpoiled,
          sachetsSold: p.sachets_sold ?? p.sachetsSold,
        }).save();
        results.push({ uuid: item.uuid, status: 'synced' });
      }
    } catch (error: any) {
      results.push({ uuid: item.uuid, status: 'error', error: error.message });
    }
  }

  res.json({ results });
});

export default router;
