'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuditLog } from '@/lib/hooks/use-audit-log';
import { useAuthStore } from '@/lib/stores/auth-store';

const PAGE_LABELS: Record<string, string> = {
  '/': '대시보드',
  '/my': '마이페이지',
  '/organization': '조직도',
  '/employees': '인사정보',
  '/attendance': '근태관리',
  '/leave': '휴가관리',
  '/payroll': '급여관리',
  '/appointments': '인사발령',
  '/approval': '전자결재',
  '/workflows': '업무프로세스',
  '/settings': '설정',
  '/audit-log': '감사로그',
};

function getPageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  // Match the base path for sub-routes
  const base = '/' + pathname.split('/').filter(Boolean)[0];
  if (PAGE_LABELS[base]) return PAGE_LABELS[base];
  return pathname;
}

export function PageViewTracker() {
  const pathname = usePathname();
  const { logAction } = useAuditLog();
  const session = useAuthStore((s) => s.session);
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip login page and if not logged in
    if (pathname === '/login' || !session) return;
    // Prevent StrictMode double-fire
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const label = getPageLabel(pathname);
    logAction('page_view', pathname, null, label);
  }, [pathname, session, logAction]);

  return null;
}
