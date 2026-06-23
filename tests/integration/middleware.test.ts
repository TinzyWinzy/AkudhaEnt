import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { demoAuth, requireRole } from '../../server/middleware/auth';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(demoAuth);

  app.get('/api/test', (_req, res) => res.json({ ok: true }));

  app.get('/api/admin', requireRole('super_admin'), (_req, res) => res.json({ ok: true }));

  app.get('/api/field', requireRole('field_coordinator', 'super_admin'), (_req, res) => res.json({ ok: true }));

  return app;
}

describe('Auth Middleware', () => {
  const app = createTestApp();

  it('defaults to super_admin when no header', async () => {
    const res = await request(app).get('/api/test');
    expect(res.status).toBe(200);
  });

  it('allows super_admin on admin route', async () => {
    const res = await request(app).get('/api/admin').set('X-Akudha-Role', 'super_admin');
    expect(res.status).toBe(200);
  });

  it('rejects field_coordinator on admin route', async () => {
    const res = await request(app).get('/api/admin').set('X-Akudha-Role', 'field_coordinator');
    expect(res.status).toBe(403);
  });

  it('allows field_coordinator on field route', async () => {
    const res = await request(app).get('/api/field').set('X-Akudha-Role', 'field_coordinator');
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated when requireRole is used without header', async () => {
    const res = await request(app).get('/api/admin');
    expect(res.status).toBe(401);
  });

  it('allows operations_manager when included in roles', async () => {
    const res = await request(app).get('/api/field').set('X-Akudha-Role', 'operations_manager');
    // operations_manager is not in ['field_coordinator', 'super_admin']
    expect(res.status).toBe(403);
  });
});
