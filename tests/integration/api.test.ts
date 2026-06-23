import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import harvestsRouter from '../../server/routes/harvests';
import batchesRouter from '../../server/routes/batches';
import consignmentsRouter from '../../server/routes/consignments';
import syncRouter from '../../server/routes/sync';
import aiRouter from '../../server/routes/ai';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/harvests', harvestsRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/consignments', consignmentsRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/ai', aiRouter);
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
    it('returns 503 offline when no database', async () => {
      const res = await request(app).post('/api/harvests').send({ syncId: 'test-uuid' });
      expect(res.status).toBe(503);
      expect(res.body.error).toContain('unavailable');
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
      const res = await request(app).post('/api/batches').send({ batch_id: 'B-999' });
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
      const res = await request(app).post('/api/consignments').send({ consignment_id: 'C-999' });
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/sync', () => {
    it('validates payloads array is required', async () => {
      const res = await request(app).post('/api/sync').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('payloads');
    });

    it('returns 503 offline when no database', async () => {
      const res = await request(app).post('/api/sync').send({ payloads: [] });
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/ai/anomaly/detect', () => {
    it('validates required fields', async () => {
      const res = await request(app).post('/api/ai/anomaly/detect').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('rawWeightKg');
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
});
