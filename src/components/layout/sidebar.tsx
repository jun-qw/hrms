'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFAULT_MENU_HREFS, MENU_GROUPS } from '@/lib/constants/menu-items';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useT } from '@/lib/i18n/use-translation';
import { BrandLockup } from '@/components/layout/brand-mark';

/**
 * 좌측 메뉴.
 *
 * 국내 인사 제품에서 익숙한 형태를 따랐습니다 — 흰 바탕에 그룹 라벨은 작게,
 * 현재 항목은 왼쪽 색 막대가 아니라 옅은 회색 면으로 표시합니다. 막대는 화면
 * 왼쪽 끝에 세로선을 하나 더 그어 시선을 끌고, 메뉴가 늘어날수록 지저분해집니다.
 */
export function Sidebar() {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const menuPermissions = useSettingsStore((s) => s.menuPermissions);

  const { t } = useT();
  const role = session?.role ?? 'employee';
  const allowedHrefs = menuPermissions?.[role] ?? DEFAULT_MENU_HREFS;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
          <BrandLockup logoSize={22} />
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="space-y-5 p-3">
          {MENU_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => allowedHrefs.includes(item.href));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                  {t(group.label)}
                </p>
                <div className="space-y-px">
                  {visibleItems.map((item) => {
                    const isActive =
                      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13px] transition-colors',
                          isActive
                            ? 'bg-muted font-semibold text-foreground'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-[15px] w-[15px] shrink-0',
                            isActive ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        {t(item.label)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
