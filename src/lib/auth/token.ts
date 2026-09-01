// Edge-safe session token helpers — no next/headers, usable in proxy/middleware.
import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@/lib/db/schema/auth';

export const SESSION_COOKIE = 'hrms_session';

export interface SessionPayload {
  userId: string;
  employeeId: string | null;
  email: string;
  name: string;
  role: UserRole;
  [key: string]: unknown;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.startsWith('change-me')) {
    throw new Error('SESSION_SECRET is not configured. Set it in .env.local.');
  }
  return new TextEncoder().encode(secret);
}

export function sessionTtlHours(): number {
  const parsed = Number(process.env.SESSION_TTL_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${sessionTtlHours()}h`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}
