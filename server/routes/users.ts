import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { validateBody } from '../lib/validation.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { USER_ROLES, UserModel } from '../models/index.js';

const router = Router();
const createUserSchema = z.object({
  staffId: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{2,23}$/),
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(2).max(100),
  pin: z.string().regex(/^\d{6}$/),
  role: z.enum(USER_ROLES),
  region: z.string().trim().min(1).max(100).optional(),
  hubId: z.string().trim().min(1).max(100).optional(),
}).strict().superRefine((value, context) => {
  if (value.role === 'field_coordinator' && !value.region) context.addIssue({ code: 'custom', path: ['region'], message: 'A field coordinator requires a region' });
  if (value.role === 'distribution_manager' && !value.hubId) context.addIssue({ code: 'custom', path: ['hubId'], message: 'A distribution manager requires a hub' });
});
const pinSchema = z.object({ pin: z.string().regex(/^\d{6}$/) }).strict();
const statusSchema = z.object({ active: z.boolean() }).strict();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!UserModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const users = await UserModel.find({ organizationId: req.user!.organizationId }).select('staffId email name role region hubId active lastLoginAt createdAt updatedAt').sort({ name: 1 }).lean();
  res.json({ data: users.map(user => ({ ...user, id: String(user._id) })) });
});

router.post('/', validateBody(createUserSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!UserModel.db?.readyState) { res.status(503).json({ error: 'Database unavailable' }); return; }
  const body = createUserSchema.parse(req.body);
  try {
    const user = await UserModel.create({ organizationId: req.user!.organizationId, staffId: body.staffId, email: body.email, name: body.name, pinHash: await bcrypt.hash(body.pin, 12), role: body.role, region: body.region, hubId: body.hubId, active: true });
    res.status(201).json({ data: { id: String(user._id), staffId: user.staffId, email: user.email, name: user.name, role: user.role, region: user.region, hubId: user.hubId, active: user.active } });
  } catch (error) {
    const issue = error as { code?: number; message?: string };
    res.status(issue.code === 11000 ? 409 : 400).json({ error: issue.code === 11000 ? 'That staff ID or email is already assigned' : issue.message || 'Unable to create user' });
  }
});

router.patch('/:id/pin', validateBody(pinSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid user identifier' }); return; }
  const pinHash = await bcrypt.hash(req.body.pin, 12);
  const user = await UserModel.findOneAndUpdate({ _id: req.params.id, organizationId: req.user!.organizationId }, { $set: { pinHash, failedPinAttempts: 0 }, $unset: { refreshTokenHash: 1, pinLockedUntil: 1 } }, { new: true });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.status(204).end();
});

router.patch('/:id/status', validateBody(statusSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid user identifier' }); return; }
  if (String(req.params.id) === req.user!.sub && !req.body.active) { res.status(400).json({ error: 'You cannot deactivate your own account' }); return; }
  const update = req.body.active ? { $set: { active: true } } : { $set: { active: false }, $unset: { refreshTokenHash: 1 } };
  const user = await UserModel.findOneAndUpdate({ _id: req.params.id, organizationId: req.user!.organizationId }, update, { new: true }).select('staffId email name role region hubId active');
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ data: user });
});

export default router;

