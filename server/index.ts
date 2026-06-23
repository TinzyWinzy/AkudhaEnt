import express from 'express';
import cors from 'cors';
import apiRouter from './app';
import { env, validateEnv } from './config/env';
import { connectDatabase } from './config/db';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

async function start() {
  const missing = validateEnv();
  if (missing.length > 0) {
    console.warn(`[Server] Missing env vars: ${missing.join(', ')}. Running in localStorage-only mode.`);
  }

  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`[Server] Akudha API running on http://localhost:${env.PORT}/api`);
    console.log(`[Server] Mode: ${env.USE_DATABASE ? 'with MongoDB' : 'localStorage-only (no DB)'}`);
  });
}

start();
