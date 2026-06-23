import { Router } from 'express';
import harvestsRouter from './routes/harvests';
import batchesRouter from './routes/batches';
import consignmentsRouter from './routes/consignments';
import syncRouter from './routes/sync';
import aiRouter from './routes/ai';
import { env } from './config/env';

const apiRouter = Router();

apiRouter.use('/harvests', harvestsRouter);
apiRouter.use('/batches', batchesRouter);
apiRouter.use('/consignments', consignmentsRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/ai', aiRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: env.USE_DATABASE ? 'connected' : 'disabled',
    mode: env.USE_DATABASE ? 'server' : 'localStorage-only',
  });
});

export default apiRouter;
