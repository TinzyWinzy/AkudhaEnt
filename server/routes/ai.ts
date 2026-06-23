import { Router, Request, Response } from 'express';
import { detectAnomaly, enrichAnomaly, recommendDispatch, enrichDispatchRecommendation } from '../services/ai';
import type { AnomalyInput, HubInventory } from '../services/ai';

const router = Router();

router.post('/anomaly/detect', (req: Request, res: Response) => {
  const input = req.body as AnomalyInput;
  if (!input.rawWeightKg || !input.sachetCount) {
    return res.status(400).json({ error: 'rawWeightKg and sachetCount are required' });
  }
  const result = detectAnomaly(input);
  res.json({ ...result, region: input.region, batchId: input.batchId });
});

router.post('/anomaly/enrich', async (req: Request, res: Response) => {
  const input = req.body as AnomalyInput;
  if (!input.rawWeightKg || !input.sachetCount) {
    return res.status(400).json({ error: 'rawWeightKg and sachetCount are required' });
  }
  const detection = detectAnomaly(input);
  if (!detection.isAnomalous) {
    return res.json({ isAnomalous: false, enrichment: null, message: 'Batch is within normal range. No enrichment needed.' });
  }
  const enrichment = await enrichAnomaly(input, detection);
  res.json({ ...detection, enrichment, region: input.region, batchId: input.batchId });
});

router.post('/hub/recommend', (req: Request, res: Response) => {
  const input = req.body as HubInventory;
  if (!input.hubId || !input.currentSachetStock) {
    return res.status(400).json({ error: 'hubId and currentSachetStock are required' });
  }
  const result = recommendDispatch(input);
  res.json(result);
});

router.post('/hub/recommend-enrich', async (req: Request, res: Response) => {
  const input = req.body as HubInventory;
  if (!input.hubId || !input.currentSachetStock) {
    return res.status(400).json({ error: 'hubId and currentSachetStock are required' });
  }
  const recommendation = recommendDispatch(input);
  const enrichment = await enrichDispatchRecommendation(input, recommendation);
  res.json({ ...recommendation, enrichment });
});

export default router;
