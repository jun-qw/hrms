'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { UserRole } from '@/types';

export interface ServerSession {
  userId: string;
  employeeId: string | null;
  email: string;
  name: string;
  role: UserRole;
}

// Mirrors the server-verified session cookie (AUTH_MODE=db) into the client
// auth store, so the client-side guard/header stay consistent even when the
// store was reset (e.g. persist version bump) while the cookie is still valid.
export function SessionSync({ serverSession }: { serverSession: ServerSession | null }) {
  const session = useAuthStore((s) => s.session);
  const setDbSession = useAuthStore((s) => s.setDbSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (serverSession) {
      if (!session || session.user_id !== serverSession.userId) {
        setDbSession({
          id: serverSession.userId,
          email: serverSession.email,
          name: serverSession.name,
          role: serverSession.role,
          employeeId: serverSession.employeeId,
        });
      }
    } else if (session && !session.is_demo) {
      // Cookie gone (expired / logged out elsewhere) — drop the stale mirror.
      clearSession();
    }
  }, [serverSession, session, setDbSession, clearSession]);

  return null;
}
