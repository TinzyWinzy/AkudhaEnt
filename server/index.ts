import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/db';
import { env, validateEnv } from './config/env';
import harvestsRouter from './routes/harvests';
import batchesRouter from './routes/batches';
import consignmentsRouter from './routes/consignments';
import syncRouter from './routes/sync';
import aiRouter from './routes/ai';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/harvests', harvestsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/consignments', consignmentsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: env.USE_DATABASE ? 'connected' : 'disabled',
    mode: env.USE_DATABASE ? 'server' : 'localStorage-only',
  });
});

async function start() {
  const missing = validateEnv();
  if (missing.length > 0) {
    console.warn(`[Server] Missing env vars: ${missing.join(', ')}. Running in localStorage-only mode.`);
  }

  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`[Server] Akudha API running on http://localhost:${env.PORT}`);
    console.log(`[Server] Mode: ${env.USE_DATABASE ? 'with MongoDB' : 'localStorage-only (no DB)'}`);
  });
}

start();
