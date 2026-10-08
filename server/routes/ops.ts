import { Router, type Response } from 'express';
import { z } from 'zod';
import { InventoryLotModel, OpsQueueActionModel, ProductModel } from '../models/index.js';
import { deriveOpsItems } from '../lib/opsQueue.js';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const noteSchema = z.string().trim().max(400).optional();
const keyBody = z.object({ key: z.string().min(3).max(120), note: noteSchema }).strict();
const escalateBody = keyBody.extend({ to: z.string().trim().min(1).max(120) }).strict();

async function buildItems() {
  const org = 'akudha';
  const [products, lots] = await Promise.all([
    ProductModel.find({ organizationId: org, active: true }).lean(),
    InventoryLotModel.find({ organizationId: org }).lean(),
  ]);
  const onHand = new Map<string, number>();
  for (const lot of lots) {
    const id = String(lot.productId);
    onHand.set(id, (onHand.get(id) ?? 0) + lot.quantityOnHand);
  }
  const productRows = products.map(p => ({ id: p._id, name: p.name, reorder: p.reorder, quantityOnHand: onHand.get(String(p._id)) ?? 0 }));
  return deriveOpsItems(productRows, lots.map(l => ({ id: l._id, productId: l.productId, lot: l.lot, expiryDate: l.expiryDate, quantityOnHand: l.quantityOnHand })));
}

router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  if (!ProductModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const items = await buildItems();
  const keys = items.map(i => i.key);
  const actions = keys.length ? await OpsQueueActionModel.find({ organizationId: 'akudha', itemKey: { $in: keys } }).lean() : [];
  const byKey = new Map(actions.map(a => [a.itemKey, a]));
  res.json({ data: items.map(i => {
    const action = byKey.get(i.key);
    return { ...i, acknowledgedBy: action?.acknowledgedBy, acknowledgedAt: action?.acknowledgedAt, escalatedTo: action?.escalatedTo, escalatedAt: action?.escalatedAt, escalatedBy: action?.escalatedBy, note: action?.note ?? '' };
  }) });
});

router.post('/ack', validateBody(keyBody), async (req: AuthenticatedRequest, res: Response) => {
  if (!ProductModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const body = keyBody.parse(req.body);
  const action = await OpsQueueActionModel.findOneAndUpdate(
    { organizationId: 'akudha', itemKey: body.key },
    { $set: { acknowledgedBy: req.user!.sub, acknowledgedAt: new Date(), note: body.note ?? '' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.json({ data: action });
});

router.post('/escalate', validateBody(escalateBody), async (req: AuthenticatedRequest, res: Response) => {
  if (!ProductModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const body = escalateBody.parse(req.body);
  const action = await OpsQueueActionModel.findOneAndUpdate(
    { organizationId: 'akudha', itemKey: body.key },
    { $set: { escalatedBy: req.user!.sub, escalatedAt: new Date(), escalatedTo: body.to, note: body.note ?? '' } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.json({ data: action });
});

export default router;
