import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { UserModel, type IUser } from '../models/User.js';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken, type SessionClaims } from '../lib/tokens.js';
import { validateBody } from '../lib/validation.js';

const router = Router();
const loginSchema = z.object({
  staffId: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{2,23}$/),
  pin: z.string().regex(/^\d{6}$/),
}).strict();
const accessCookie = { httpOnly: true, sameSite: 'lax' as const, secure: env.NODE_ENV === 'production', path: '/api', maxAge: 15 * 60 * 1000 };
const refreshCookie = { httpOnly: true, sameSite: 'strict' as const, secure: env.NODE_ENV === 'production', path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 };

function publicUser(user: IUser) {
  return { id: String(user._id), organizationId: user.organizationId, staffId: user.staffId, email: user.email, name: user.name, role: user.role, region: user.region, hubId: user.hubId };
}

function claimsFor(user: IUser): SessionClaims {
  return { sub: String(user._id), organizationId: user.organizationId, staffId: user.staffId, email: user.email, name: user.name, role: user.role, region: user.region, hubId: user.hubId };
}

async function issueSession(res: Response, user: IUser) {
  const claims = claimsFor(user);
  const [access, refresh] = await Promise.all([signAccessToken(claims), signRefreshToken(claims)]);
  user.refreshTokenHash = hashToken(refresh);
  user.lastLoginAt = new Date();
  await user.save();
  res.cookie('akudha_access', access, accessCookie);
  res.cookie('akudha_refresh', refresh, refreshCookie);
}

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  if (!UserModel.db?.readyState) { res.status(503).json({ error: 'Authentication service unavailable' }); return; }
  const user = await UserModel.findOne({ organizationId: 'akudha', staffId: req.body.staffId, active: true }).select('+pinHash +refreshTokenHash +failedPinAttempts +pinLockedUntil');
  if (user?.pinLockedUntil && user.pinLockedUntil > new Date()) {
    res.status(429).json({ error: 'This staff account is temporarily locked. Try again later or ask an administrator to reset the PIN.' });
    return;
  }
  if (!user || !(await bcrypt.compare(req.body.pin, user.pinHash))) {
    if (user) {
      user.failedPinAttempts = (user.failedPinAttempts || 0) + 1;
      if (user.failedPinAttempts >= 5) user.pinLockedUntil = new Date(Date.now() + 15 * 60_000);
      await user.save();
    }
    res.status(401).json({ error: 'Invalid staff ID or PIN' });
    return;
  }
  user.failedPinAttempts = 0;
  user.pinLockedUntil = undefined;
  await issueSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/refresh', async (req: Request, res: Response) => {
  if (!UserModel.db?.readyState) { res.status(503).json({ error: 'Authentication service unavailable' }); return; }
  const token = req.cookies?.akudha_refresh;
  if (!token) { res.status(401).json({ error: 'Refresh token required' }); return; }
  try {
    const { sub } = await verifyRefreshToken(token);
    const user = await UserModel.findById(sub).select('+refreshTokenHash');
    if (!user || !user.active || user.refreshTokenHash !== hashToken(token)) throw Error('Invalid session');
    await issueSession(res, user);
    res.json({ user: publicUser(user) });
  } catch {
    res.clearCookie('akudha_access', accessCookie);
    res.clearCookie('akudha_refresh', refreshCookie);
    res.status(401).json({ error: 'Refresh session expired' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.akudha_refresh;
  if (token && UserModel.db?.readyState) {
    try {
      const { sub } = await verifyRefreshToken(token);
      await UserModel.updateOne({ _id: sub, refreshTokenHash: hashToken(token) }, { $unset: { refreshTokenHash: 1 } });
    } catch { /* Expired or invalid refresh tokens are still cleared. */ }
  }
  res.clearCookie('akudha_access', accessCookie);
  res.clearCookie('akudha_refresh', refreshCookie);
  res.status(204).end();
});

router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => res.json({ user: req.user }));

export async function bootstrapAdmin(): Promise<void> {
  if (!UserModel.db?.readyState || !env.BOOTSTRAP_ADMIN_STAFF_ID || !env.BOOTSTRAP_ADMIN_PIN) return;
  if (!/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(env.BOOTSTRAP_ADMIN_STAFF_ID)) throw Error('BOOTSTRAP_ADMIN_STAFF_ID is invalid.');
  if (!/^\d{6}$/.test(env.BOOTSTRAP_ADMIN_PIN)) throw Error('BOOTSTRAP_ADMIN_PIN must contain exactly 6 digits.');
  const existing = await UserModel.findOne({ organizationId: 'akudha', $or: [
    { staffId: env.BOOTSTRAP_ADMIN_STAFF_ID },
    ...(env.BOOTSTRAP_ADMIN_EMAIL ? [{ email: env.BOOTSTRAP_ADMIN_EMAIL }] : []),
  ] }).select('+pinHash');
  if (existing) {
    if (!existing.staffId || !existing.pinHash) {
      existing.staffId = env.BOOTSTRAP_ADMIN_STAFF_ID;
      existing.pinHash = await bcrypt.hash(env.BOOTSTRAP_ADMIN_PIN, 12);
      existing.failedPinAttempts = 0;
      await existing.save();
      console.log(`[Auth] Migrated bootstrap administrator to staff ID ${existing.staffId}`);
    }
  } else {
    await UserModel.create({ organizationId: 'akudha', staffId: env.BOOTSTRAP_ADMIN_STAFF_ID, email: env.BOOTSTRAP_ADMIN_EMAIL || undefined, name: 'Akudha Administrator', pinHash: await bcrypt.hash(env.BOOTSTRAP_ADMIN_PIN, 12), role: 'super_admin', active: true });
    console.log(`[Auth] Created bootstrap administrator ${env.BOOTSTRAP_ADMIN_STAFF_ID}`);
  }
  const legacyUsers = await UserModel.find({ organizationId: 'akudha', staffId: { $exists: false } }).select('_id');
  for (const legacy of legacyUsers) {
    const temporaryPin = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await UserModel.updateOne({ _id: legacy._id }, { $set: { staffId: `LEGACY-${String(legacy._id).slice(-8).toUpperCase()}`, pinHash: await bcrypt.hash(temporaryPin, 12), failedPinAttempts: 0, active: false }, $unset: { refreshTokenHash: 1, pinLockedUntil: 1 } });
  }
  await UserModel.collection.createIndex({ organizationId: 1, staffId: 1 }, { unique: true, partialFilterExpression: { staffId: { $type: 'string' } }, name: 'organizationId_1_staffId_1' });
}

export default router;

