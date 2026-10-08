import mongoose from 'mongoose';
import { connectDatabase } from './db.js';
import { bootstrapAdmin } from '../routes/auth.js';
import { validateEnv } from './env.js';

let startupPromise: Promise<void> | undefined;

export function ensureBackendReady(): Promise<void> {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  startupPromise ??= (async () => {
    const missing = validateEnv();
    if (missing.length > 0) throw Error(`Missing required environment configuration: ${missing.join(', ')}`);
    await connectDatabase();
    await bootstrapAdmin();
  })().finally(() => {
    // Fluid compute may suspend an idle MongoDB pool between invocations. Clear
    // the completed promise so a later request can reconnect when necessary.
    startupPromise = undefined;
  });
  return startupPromise;
}

