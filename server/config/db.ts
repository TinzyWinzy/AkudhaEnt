import mongoose from 'mongoose';
import { attachDatabasePool } from '@vercel/functions';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  if (!env.USE_DATABASE || !env.MONGODB_URI) {
    console.log('[DB] Database disabled. Running in offline-development mode.');
    return;
  }

  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
      autoIndex: env.NODE_ENV !== 'production',
    });
    if (process.env.VERCEL) attachDatabasePool(mongoose.connection.getClient());
    console.log(`[DB] Connected to MongoDB database ${env.MONGODB_DB}`);
  } catch (error) {
    console.error('[DB] Connection failed:', (error as Error).message);
    if (env.NODE_ENV === 'production') throw error;
    console.warn('[DB] Continuing in offline-development mode.');
    env.USE_DATABASE = false;
  }
}
