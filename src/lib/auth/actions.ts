'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword } from './password';
import { setSessionCookie, clearSessionCookie } from './session';

export interface LoginResult {
  ok: boolean;
  error?: 'invalid_credentials' | 'inactive_account' | 'server_error';
  user?: {
    id: string;
    email: string;
    name: string;
    role: (typeof users.$inferSelect)['role'];
    employeeId: string | null;
  };
}

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  try {
    const normalized = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);

    // Always run a hash comparison so response timing does not reveal
    // whether the account exists.
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const valid = await verifyPassword(password, hash);
    if (!user || !valid) {
      return { ok: false, error: 'invalid_credentials' };
    }
    if (!user.isActive) {
      return { ok: false, error: 'inactive_account' };
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await setSessionCookie({
      userId: user.id,
      employeeId: user.employeeId,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId,
      },
    };
  } catch (err) {
    console.error('loginAction failed:', err);
    return { ok: false, error: 'server_error' };
  }
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
