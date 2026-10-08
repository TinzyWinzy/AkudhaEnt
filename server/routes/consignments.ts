import { Router, type Response } from 'express';
import { consignmentPayloadSchema } from '../lib/schemas.js';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { VendorDispatchModel } from '../models/index.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!VendorDispatchModel.db?.readyState) { res.json({ data: [], source: 'offline' }); return; }
  const scope: { organizationId: string; hubLocation?: string } = { organizationId: req.user!.organizationId };
  if (req.user!.role === 'distribution_manager') scope.hubLocation = req.user!.hubId;
  const records = await VendorDispatchModel.find(scope).sort({ createdAt: -1 }).limit(10_000).lean();
  res.json({ data: records, source: 'database' });
});

router.post('/', validateBody(consignmentPayloadSchema), async (req: AuthenticatedRequest, res: Response) => {
  const body = consignmentPayloadSchema.parse(req.body);
  if (req.user!.role === 'distribution_manager' && body.hub_id !== req.user!.hubId) {
    res.status(403).json({ error: 'Cannot create a consignment outside the assigned hub' }); return;
  }
  if (!VendorDispatchModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable. Queue this transaction offline.', idempotent_uuid: body.idempotent_uuid }); return; }
  try {
    const saved = await VendorDispatchModel.create({
      organizationId: req.user!.organizationId, actorId: req.user!.sub,
      syncId: body.idempotent_uuid,
      dispatchId: body.consignment_id, vendorId: body.vendor_id, hubLocation: body.hub_id,
      sachetsDispatched: body.sachets_dispatched, sachetsReturnedSpoiled: body.sachets_returned_spoiled, sachetsSold: body.sachets_sold,
    });
    res.status(201).json({ data: saved });
  } catch (error) {
    const issue = error as { code?: number; message?: string };
    res.status(issue.code === 11000 ? 409 : 400).json({ error: issue.code === 11000 ? 'Duplicate consignment' : issue.message || 'Invalid consignment' });
  }
});

export default router;
