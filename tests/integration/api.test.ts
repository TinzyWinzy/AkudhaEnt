import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import harvestsRouter from '../../server/routes/harvests';
import batchesRouter from '../../server/routes/batches';
import consignmentsRouter from '../../server/routes/consignments';
import syncRouter from '../../server/routes/sync';
import aiRouter from '../../server/routes/ai';
import inventoryRouter from '../../server/routes/inventory';
import apiRouter from '../../server/app';
import { demoAuth } from '../../server/middleware/auth';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(demoAuth);
  app.use('/api/harvests', harvestsRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/consignments', consignmentsRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/inventory', inventoryRouter);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  return app;
}

describe('API Integration Tests', () => {
  const app = createTestApp();

  describe('GET /api/health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/harvests', () => {
    it('returns offline fallback when no database', async () => {
      const res = await request(app).get('/api/harvests');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: [], source: 'offline' });
    });
  });

  describe('POST /api/harvests', () => {
    const validHarvest = { harvester_id: 'H-001', harvester_name: 'Test Harvester', region: 'Chimanimani', raw_weight_kg: 10, quality_grade: 'A', payout_amount_usd: 15, idempotent_uuid: 'harvest-test-1', offline_created_at: '2026-09-25T10:00:00.000Z', is_synced: false };

    it('returns 503 offline when no database', async () => {
      const res = await request(app).post('/api/harvests').set('X-Akudha-Role', 'super_admin').send(validHarvest);
      expect(res.status).toBe(503);
      expect(res.body.error).toContain('unavailable');
    });

    it('rejects a field coordinator writing outside the assigned region', async () => {
      const res = await request(app).post('/api/harvests').set('X-Akudha-Role', 'field_coordinator').set('X-Akudha-Region', 'Mudzi').send(validHarvest);
      expect(res.status).toBe(403);
    });

    it('rejects unknown fields', async () => {
      const res = await request(app).post('/api/harvests').set('X-Akudha-Role', 'super_admin').send({ ...validHarvest, injected: true });
      expect(res.status).toBe(400);
      expect(res.body.issues[0].message).toContain('Unrecognized');
    });
  });

  describe('GET /api/batches', () => {
    it('returns offline fallback when no database', async () => {
      const res = await request(app).get('/api/batches');
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('offline');
    });
  });

  describe('POST /api/batches', () => {
    it('returns 503 offline when no database', async () => {
      const res = await request(app).post('/api/batches').set('X-Akudha-Role', 'processing_admin').send({ batch_id: 'B-999', raw_weight_kg: 10, total_175ml_sachets_produced: 100, date_processed: '2026-09-25', idempotent_uuid: 'batch-test-1', offline_created_at: '2026-09-25T10:00:00.000Z', is_synced: false, yield_ratio: 10, is_anomalous: false, waste_percentage: 0 });
      expect(res.status).toBe(503);
    });
  });

  describe('GET /api/consignments', () => {
    it('returns offline fallback when no database', async () => {
      const res = await request(app).get('/api/consignments');
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('offline');
    });
  });

  describe('POST /api/consignments', () => {
    it('returns 503 offline when no database', async () => {
      const res = await request(app).post('/api/consignments').set('X-Akudha-Role', 'super_admin').send({ consignment_id: 'C-999', hub_id: 'HUB-HARARE', dispatcher_id: 'DIS-09', vendor_id: 'V-101', vendor_name: 'Test Vendor', sachets_dispatched: 10, sachets_returned_spoiled: 1, sachets_sold: 9, idempotent_uuid: 'consignment-test-1', offline_created_at: '2026-09-25T10:00:00.000Z', is_synced: false });
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/sync', () => {
    it('validates payloads array is required', async () => {
      const res = await request(app).post('/api/sync').send({});
      expect(res.status).toBe(400);
      expect(res.body.issues.some((issue: { path: string }) => issue.path === 'payloads')).toBe(true);
    });

    it('rejects an empty sync envelope', async () => {
      const res = await request(app).post('/api/sync').send({ payloads: [] });
      expect(res.status).toBe(400);
    });

    it('returns 503 offline for a valid envelope', async () => {
      const payload = { harvester_id: 'H-001', harvester_name: 'Test Harvester', region: 'Chimanimani', raw_weight_kg: 10, quality_grade: 'A', payout_amount_usd: 15, idempotent_uuid: 'harvest-sync-1', offline_created_at: '2026-09-25T10:00:00.000Z', is_synced: false };
      const res = await request(app).post('/api/sync').set('X-Akudha-Role', 'super_admin').send({ payloads: [{ uuid: payload.idempotent_uuid, type: 'HARVEST', action: 'CREATE', payload, offline_created_at: payload.offline_created_at }] });
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/ai/anomaly/detect', () => {
    it('validates required fields', async () => {
      const res = await request(app).post('/api/ai/anomaly/detect').send({});
      expect(res.status).toBe(400);
      expect(res.body.issues.some((issue: { path: string }) => issue.path === 'rawWeightKg')).toBe(true);
    });

    it('detects anomaly with valid input', async () => {
      const res = await request(app).post('/api/ai/anomaly/detect').send({ rawWeightKg: 100, sachetCount: 500 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isAnomalous');
      expect(res.body).toHaveProperty('yieldRatio');
    });
  });

  describe('POST /api/ai/anomaly/enrich', () => {
    it('returns normal range message when not anomalous', async () => {
      const res = await request(app).post('/api/ai/anomaly/enrich').send({ rawWeightKg: 50, sachetCount: 500 });
      expect(res.status).toBe(200);
      expect(res.body.enrichment).toBeNull();
    });

    it('validates required fields', async () => {
      const res = await request(app).post('/api/ai/anomaly/enrich').send({ rawWeightKg: 100 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/ai/hub/recommend', () => {
    it('validates required fields', async () => {
      const res = await request(app).post('/api/ai/hub/recommend').send({});
      expect(res.status).toBe(400);
    });

    it('returns recommendation with valid input', async () => {
      const res = await request(app).post('/api/ai/hub/recommend').send({ hubId: 'HUB-HARARE', currentSachetStock: 500 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('recommendedQuota');
    });
  });

  describe('POST /api/ai/hub/recommend-enrich', () => {
    it('validates required fields', async () => {
      const res = await request(app).post('/api/ai/hub/recommend-enrich').send({ hubId: 'HUB-HARARE' });
      expect(res.status).toBe(400);
    });
  });

  describe('Inventory API', () => {
    it('rejects malformed catalogue synchronization', async () => {
      const res = await request(app).post('/api/inventory/sync').set('X-Akudha-Role', 'super_admin').send({ catalogue: { version: 1 } });
      expect(res.status).toBe(400);
    });

    it('validates print audit payloads before database access', async () => {
      const res = await request(app).post('/api/inventory/print-jobs').send({ productId: 'AKU-BAO-100' });
      expect(res.status).toBe(400);
    });

    it('does not claim a print was recorded while the database is unavailable', async () => {
      const res = await request(app).post('/api/inventory/print-jobs').send({ productId: 'AKU-BAO-100', templateId: '507f1f77bcf86cd799439011', barcodeValue: 'AKU-BAO-100', widthMm: 200, heightMm: 100, copies: 1 });
      expect(res.status).toBe(503);
    });
  });

  describe('Production API authorization', () => {
    const secured = express();
    secured.use(express.json());
    secured.use('/api', apiRouter);

    it('blocks unauthenticated business-data reads', async () => {
      const res = await request(secured).get('/api/harvests');
      expect(res.status).toBe(401);
    });

    it('keeps health public without exposing debug state', async () => {
      const res = await request(secured).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('env');
    });

    it('accepts only a staff ID and six-digit PIN login shape', async () => {
      const legacy = await request(secured).post('/api/auth/login').send({ email: 'admin@akudha.co.zw', password: 'old-password' });
      expect(legacy.status).toBe(400);
      const shortPin = await request(secured).post('/api/auth/login').send({ staffId: 'AKU-ADMIN', pin: '12345' });
      expect(shortPin.status).toBe(400);
      const validShape = await request(secured).post('/api/auth/login').send({ staffId: 'aku-admin', pin: '123456' });
      expect(validShape.status).toBe(503);
    });
  });
});
