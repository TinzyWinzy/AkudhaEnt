import { Router, Request, Response } from 'express';
import { VendorDispatchModel } from '../models';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  if (!VendorDispatchModel.db?.readyState) {
    return res.json({ data: [], source: 'offline' });
  }
  const records = await VendorDispatchModel.find().sort({ createdAt: -1 }).lean();
  res.json({ data: records, source: 'database' });
});

router.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  if (!VendorDispatchModel.db?.readyState) {
    return res.status(503).json({
      error: 'Database unavailable. Queue this transaction offline.',
      idempotent_uuid: body.idempotent_uuid,
    });
  }

  try {
    const dispatch = new VendorDispatchModel({
      dispatchId: body.consignment_id || body.dispatchId,
      vendorId: body.vendor_id || body.vendorId,
      hubLocation: body.hub_id || body.hubLocation,
      sachetsDispatched: body.sachets_dispatched ?? body.sachetsDispatched,
      sachetsReturnedSpoiled: body.sachets_returned_spoiled ?? body.sachetsReturnedSpoiled,
      sachetsSold: body.sachets_sold ?? body.sachetsSold,
    });

    const saved = await dispatch.save();
    res.status(201).json({ data: saved });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
