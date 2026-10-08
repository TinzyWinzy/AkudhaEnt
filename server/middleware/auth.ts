import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type SessionClaims } from '../lib/tokens.js';
import { USER_ROLES, type UserRole } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: SessionClaims;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : req.cookies?.akudha_access;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    req.user = await verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}

export function demoAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const role = req.headers['x-akudha-role'] as string;
  const region = req.headers['x-akudha-region'] as string;

  if (role && USER_ROLES.includes(role as UserRole)) {
    req.user = { sub: 'demo-user', organizationId: 'akudha', staffId: 'LOCAL-DEMO', name: 'Demo User', role: role as UserRole, region: region || undefined };
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden: requires one of roles [${roles.join(', ')}]` });
      return;
    }
    next();
  };
}

export function requireRegion() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role === 'field_coordinator' && !req.user?.region) {
      res.status(403).json({ error: 'Field coordinator must have a region assigned' });
      return;
    }
    next();
  };
}

export function requireHub() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role === 'distribution_manager' && !req.user?.hubId) {
      res.status(403).json({ error: 'Distribution manager must have a hub assigned' });
      return;
    }
    next();
  };
}
