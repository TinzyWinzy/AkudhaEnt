import { createHash, randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';
import type { UserRole } from '../models/User.js';

export interface SessionClaims {
  sub: string;
  organizationId: string;
  role: UserRole;
  name: string;
  staffId: string;
  email?: string;
  region?: string;
  hubId?: string;
}

const key = (value: string) => new TextEncoder().encode(value);

export async function signAccessToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime('15m')
    .sign(key(env.JWT_SECRET));
}

export async function signRefreshToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ organizationId: claims.organizationId, role: claims.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime('7d')
    .sign(key(env.REFRESH_SECRET));
}

export async function verifyAccessToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, key(env.JWT_SECRET), { algorithms: ['HS256'] });
  if (!payload.sub || typeof payload.organizationId !== 'string' || typeof payload.role !== 'string' || typeof payload.name !== 'string' || typeof payload.staffId !== 'string') throw Error('Invalid session');
  return payload as unknown as SessionClaims;
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, key(env.REFRESH_SECRET), { algorithms: ['HS256'] });
  if (!payload.sub) throw Error('Invalid refresh token');
  return { sub: payload.sub };
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

