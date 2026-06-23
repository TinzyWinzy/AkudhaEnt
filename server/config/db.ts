import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  if (!env.USE_DATABASE || !env.MONGODB_URI) {
    console.log('[DB] Database disabled. Running in localStorage-only mode.');
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[DB] Connected to MongoDB');
  } catch (error) {
    console.error('[DB] Connection failed. Running in localStorage-only mode:', (error as Error).message);
    env.USE_DATABASE = false;
  }
}
