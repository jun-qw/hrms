'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_MENU_ITEMS, DEFAULT_MENU_HREFS } from '@/lib/constants/menu-items';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useT } from '@/lib/i18n/use-translation';
import { BrandLockup } from '@/components/layout/brand-mark';

/**
 * 좌측 메뉴.
 *
 * 5개 업무 메뉴와 설정 하나입니다. 그룹 라벨을 없앤 것은 메뉴가 여섯이면
 * 라벨이 항목보다 많아져 오히려 훑기 어려워지기 때문입니다.
 *
 * 하위 화면은 **그 메뉴 안에 있을 때만** 펼칩니다. 전부 펼쳐 두면 스무 줄이
 * 넘어 원래 문제로 돌아가고, 접어 두기만 하면 담당자가 "급여대장이 어디
 * 있는지" 찾지 못합니다.
 *
 * 국내 인사 제품에서 익숙한 형태를 따랐습니다 — 흰 바탕에 현재 항목은 왼쪽
 * 색 막대가 아니라 옅은 회색 면으로 표시합니다.
 */
export function Sidebar() {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const menuPermissions = useSettingsStore((s) => s.menuPermissions);

  const { t } = useT();
  const role = session?.role ?? 'employee';
  const allowedHrefs = menuPermissions?.[role] ?? DEFAULT_MENU_HREFS;
  const isHr = role === 'admin' || role === 'hr_manager';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
          <BrandLockup logoSize={22} />
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="space-y-0.5 p-3">
          {ALL_MENU_ITEMS.filter((item) => allowedHrefs.includes(item.href)).map((item) => {
            // 홈은 정확히 일치할 때만 켭니다. 아니면 모든 경로에서 켜집니다.
            const inSection =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            // 하위 화면이 다른 메뉴 아래 경로에 있을 수도 있습니다
            // (예: 연차대장은 /leave, 근태·휴가 메뉴는 /attendance).
            const onChild = item.children?.some((c) => pathname.startsWith(c.href)) ?? false;
            const open = inSection || onChild;
            // 대장은 인사 담당 화면이라 일반 직원에게는 목록에서도 뺍니다.
            const visibleChildren = (item.children ?? []).filter((c) => isHr || !c.hrOnly);

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13px] transition-colors',
                    pathname === item.href
                      ? 'bg-muted font-semibold text-foreground'
                      : open
                        ? 'font-semibold text-foreground hover:bg-muted/60'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-[15px] w-[15px] shrink-0',
                      open ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  {t(item.label)}
                </Link>

                {open && visibleChildren.length > 0 && (
                  <div className="mb-1.5 ml-[15px] space-y-px border-l pl-3 pt-0.5">
                    {visibleChildren.map((child) => {
                      const active = pathname === child.href || pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block rounded-md px-2 py-[5px] text-[12.5px] transition-colors',
                            active
                              ? 'bg-muted font-semibold text-foreground'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                          )}
                        >
                          {t(child.label)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
