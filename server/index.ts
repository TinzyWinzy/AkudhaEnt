import { env, validateEnv } from './config/env.js';
import { ensureBackendReady } from './config/startup.js';
import { createHttpApp } from './http.js';

const app = createHttpApp();

async function start() {
  const missing = validateEnv();
  if (missing.length > 0) {
    const message = `[Server] Missing env vars: ${missing.join(', ')}.`;
    if (env.NODE_ENV === 'production') throw Error(message);
    console.warn(message);
  }

  await ensureBackendReady();

  app.listen(env.PORT, () => {
    console.log(`[Server] Akudha API running on http://localhost:${env.PORT}/api`);
    console.log(`[Server] Mode: ${env.USE_DATABASE ? 'with MongoDB' : 'offline-development (no DB)'}`);
  });
}

start();
