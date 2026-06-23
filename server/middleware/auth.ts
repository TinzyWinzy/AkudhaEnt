import type { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    role: string;
    region?: string;
    hubId?: string;
  };
}

export function demoAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const role = req.headers['x-akudha-role'] as string;
  const region = req.headers['x-akudha-region'] as string;

  if (role) {
    req.user = { role, region: region || undefined };
  }

  next();
}

export function requireRole(...roles: string[]) {
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
