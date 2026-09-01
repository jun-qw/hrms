'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logoutAction } from '@/lib/auth/actions';

export function useAuth() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);

  const signOut = async () => {
    const isDbSession = !!session && !session.is_demo;
    clearSession();
    if (isDbSession) {
      // Clears the server session cookie and redirects to /login.
      await logoutAction();
      return;
    }
    router.push('/login');
  };

  return {
    user: session
      ? { id: session.user_id, email: session.user_email, name: session.user_name }
      : null,
    role: session?.role ?? null,
    employeeId: session?.employee_id ?? null,
    loading: false,
    session,
    signOut,
  };
}
