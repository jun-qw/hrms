'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSettingsStore } from '@/lib/stores/settings-store';

const PUBLIC_PATHS = ['/login'];

/**
 * Screens any signed-in employee may open even without the parent module's
 * menu permission, because they only ever show the caller's own records
 * (the server actions behind them scope reads and writes to the session).
 */
const SELF_SERVICE_PATHS: string[] = [];

function isSelfServicePath(pathname: string): boolean {
  return SELF_SERVICE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const menuPermissions = useSettingsStore((s) => s.menuPermissions);
  // Permissions are company configuration loaded from the database; enforcing
  // them before that arrives would bounce users off pages they may access.
  const permissionsLoaded = useSettingsStore((s) => s.hydrated);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!session && !isPublic) {
      router.replace('/login');
      return;
    }
    if (session && isPublic) {
      router.replace('/');
      return;
    }
    if (!session || isPublic || !permissionsLoaded || isSelfServicePath(pathname)) return;

    // Menu permissions are granted per top-level module.
    const allowed = menuPermissions?.[session.role] ?? [];
    const basePath = '/' + (pathname.split('/')[1] ?? '');
    if (basePath !== '/' && !allowed.includes(basePath)) {
      router.replace('/');
    }
  }, [hydrated, session, pathname, router, menuPermissions, permissionsLoaded]);

  if (!hydrated) return null;

  const isPublic = PUBLIC_PATHS.includes(pathname);
  if (!session && !isPublic) return null;

  return <>{children}</>;
}
