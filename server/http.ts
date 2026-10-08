import { randomUUID } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import apiRouter from './app.js';
import { env } from './config/env.js';
import { ensureBackendReady } from './config/startup.js';

export function createHttpApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => { const requestId = req.header('x-request-id')?.slice(0, 100) || randomUUID(); res.setHeader('x-request-id', requestId); next(); });
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
  app.use(cors((req, callback) => {
    const origin = req.header('origin');
    const selfOrigin = `${req.protocol}://${req.get('host')}`;
    callback(null, { credentials: true, origin: !origin || origin === selfOrigin || env.CORS_ORIGINS.includes(origin) });
  }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(async (_req, res, next) => {
    try { await ensureBackendReady(); next(); }
    catch (error) { res.status(503).json({ error: 'Backend initialization failed', detail: env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined }); }
  });
  app.use('/api', apiRouter);
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[HTTP]', error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

