import { Router, Request, Response } from 'express';
import { detectAnomaly, enrichAnomaly, recommendDispatch, enrichDispatchRecommendation } from '../services/ai/index.js';
import type { AnomalyInput, HubInventory } from '../services/ai/index.js';
import { z } from 'zod';
import { validateBody } from '../lib/validation.js';

const router = Router();
const anomalySchema = z.object({
  rawWeightKg: z.number().positive().max(1_000_000), sachetCount: z.number().int().nonnegative().max(1_000_000_000),
  region: z.string().trim().min(1).max(100).default('Zimbabwe'), batchId: z.string().trim().min(1).max(100).default('unspecified'),
  historicalYields: z.array(z.number().nonnegative().max(1_000_000)).max(100).default([]),
}).strict();
const hubSchema = z.object({
  hubId: z.string().trim().min(1).max(100), currentSachetStock: z.number().int().nonnegative().max(1_000_000_000),
  hubName: z.string().trim().min(1).max(120).default('Akudha Hub'), vendorCount: z.number().int().nonnegative().max(100_000).default(1),
  recentWeeklySales: z.array(z.number().nonnegative().max(1_000_000_000)).max(104).default([]),
  regionForecastTemp: z.number().min(-20).max(70).default(25), regionForecastRain: z.string().trim().min(1).max(100).default('unknown'),
}).strict();

router.post('/anomaly/detect', validateBody(anomalySchema), (req: Request, res: Response) => {
  const input = req.body as AnomalyInput;
  const result = detectAnomaly(input);
  res.json({ ...result, region: input.region, batchId: input.batchId });
});

router.post('/anomaly/enrich', validateBody(anomalySchema), async (req: Request, res: Response) => {
  const input = req.body as AnomalyInput;
  const detection = detectAnomaly(input);
  if (!detection.isAnomalous) {
    return res.json({ isAnomalous: false, enrichment: null, message: 'Batch is within normal range. No enrichment needed.' });
  }
  const enrichment = await enrichAnomaly(input, detection);
  res.json({ ...detection, enrichment, region: input.region, batchId: input.batchId });
});

router.post('/hub/recommend', validateBody(hubSchema), (req: Request, res: Response) => {
  const input = req.body as HubInventory;
  const result = recommendDispatch(input);
  res.json(result);
});

router.post('/hub/recommend-enrich', validateBody(hubSchema), async (req: Request, res: Response) => {
  const input = req.body as HubInventory;
  const recommendation = recommendDispatch(input);
  const enrichment = await enrichDispatchRecommendation(input, recommendation);
  res.json({ ...recommendation, enrichment });
});

export default router;
