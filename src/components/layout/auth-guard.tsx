'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { canOpenPath } from '@/lib/constants/menu-items';

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

    // 권한은 메뉴 단위로 주지만, 하위 화면이 다른 경로에 있을 수 있습니다 —
    // 연차대장은 /leave 인데 메뉴는 근태·휴가(/attendance) 아래입니다. 메뉴
    // 목록만 대조하면 사이드바에는 보이는데 누르면 홈으로 튕깁니다.
    // 권한은 화면 단위입니다. 시스템관리자는 항상 전부, 나머지는
    // 설정 > 메뉴권한에서 열어 준 화면만 봅니다.
    if (!canOpenPath(session.role, menuPermissions?.[session.role], pathname)) {
      // 홈조차 권한에 없는 역할(기본값의 일반사원)은 마이페이지로 보냅니다.
      // '/' 로 보내면 그 자리에서 또 걸려 무한히 튕깁니다.
      const fallback = canOpenPath(session.role, menuPermissions?.[session.role], '/')
        ? '/'
        : '/my';
      if (pathname !== fallback) router.replace(fallback);
    }
  }, [hydrated, session, pathname, router, menuPermissions, permissionsLoaded]);

  if (!hydrated) return null;

  const isPublic = PUBLIC_PATHS.includes(pathname);
  if (!session && !isPublic) return null;

  return <>{children}</>;
}
