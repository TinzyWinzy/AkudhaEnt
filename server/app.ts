import { Router } from 'express';
import harvestsRouter from './routes/harvests.js';
import batchesRouter from './routes/batches.js';
import consignmentsRouter from './routes/consignments.js';
import syncRouter from './routes/sync.js';
import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import inventoryRouter from './routes/inventory.js';
import usersRouter from './routes/users.js';
import opsRouter from './routes/ops.js';
import artworksRouter from './routes/artworks.js';
import { env } from './config/env.js';
import { authenticate, requireHub, requireRegion, requireRole } from './middleware/auth.js';
import mongoose from 'mongoose';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disabled',
    mode: env.USE_DATABASE ? 'server' : 'offline-development',
  });
});

apiRouter.use(authenticate);
apiRouter.use('/harvests', requireRole('field_coordinator', 'processing_admin', 'super_admin'), requireRegion(), harvestsRouter);
apiRouter.use('/batches', requireRole('processing_admin', 'super_admin'), batchesRouter);
apiRouter.use('/consignments', requireRole('distribution_manager', 'super_admin'), requireHub(), consignmentsRouter);
apiRouter.use('/sync', requireRole('field_coordinator', 'processing_admin', 'distribution_manager', 'super_admin'), syncRouter);
apiRouter.use('/inventory/artworks', requireRole('processing_admin', 'distribution_manager', 'super_admin'), artworksRouter);
apiRouter.use('/inventory', requireRole('processing_admin', 'distribution_manager', 'super_admin'), inventoryRouter);
apiRouter.use('/users', requireRole('super_admin'), usersRouter);
apiRouter.use('/ops', requireRole('processing_admin', 'distribution_manager', 'super_admin', 'field_coordinator'), opsRouter);
apiRouter.use('/ai', requireRole('processing_admin', 'distribution_manager', 'super_admin'), aiRouter);

export default apiRouter;
