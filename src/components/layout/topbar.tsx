'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, LogOut, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_MENU_ITEMS, canOpenPath } from '@/lib/constants/menu-items';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAuth } from '@/lib/hooks/use-auth';
import { useT } from '@/lib/i18n/use-translation';
import { BrandMark } from '@/components/layout/brand-mark';
import { openCommandPalette } from '@/components/layout/command-palette';
import { NotificationBell } from '@/components/layout/notification-bell';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { avatarColor, initials } from '@/lib/utils/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * 상단 바.
 *
 * 디자인 시안을 따라 좌측 사이드바를 56px 상단 바로 바꿨습니다. 브랜드, 업무
 * 메뉴 탭, 전체 검색, 알림·도움말, 내 계정 순서입니다. 지금 있는 메뉴에
 * 하위 화면이 있으면 그 아래 한 줄(보조 메뉴)로 펼칩니다 — 전부 펼치면
 * 스무 항목이 넘어 훑기 어렵고, 접어 두면 급여대장이 어디 있는지 찾지
 * 못합니다.
 *
 * 권한 없는 화면은 목록에서 뺍니다. 눌러도 튕길 항목을 두면 고장으로
 * 읽힙니다.
 */
export function TopBar() {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const menuPermissions = useSettingsStore((s) => s.menuPermissions);
  const appName = useSettingsStore((s) => s.branding.app_name);
  const { user, role, signOut } = useAuth();
  const { t } = useT();

  const roleKey = session?.role ?? 'employee';
  const allowed = menuPermissions?.[roleKey];
  const may = (href: string) => canOpenPath(roleKey, allowed, href);

  const roleLabels: Record<string, string> = {
    admin: t('role.admin'),
    hr_manager: t('role.hr_manager'),
    dept_manager: t('role.dept_manager'),
    employee: t('role.employee'),
  };

  const sections = ALL_MENU_ITEMS.filter(
    (item) => may(item.href) || (item.children ?? []).some((c) => may(c.href)),
  ).map((item) => {
    const inSection = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
    const onChild = item.children?.some((c) => pathname.startsWith(c.href)) ?? false;
    const visibleChildren = (item.children ?? []).filter((c) => may(c.href));
    const parentAllowed = may(item.href);
    const href = parentAllowed ? item.href : (visibleChildren[0]?.href ?? item.href);
    // 상위 화면 권한이 없고 하위가 하나뿐이면 그 이름을 씁니다. "홈"이라 쓰고
    // 마이페이지로 보내면 사용자는 길을 잃습니다.
    const label =
      !parentAllowed && visibleChildren.length === 1 ? t(visibleChildren[0].label) : t(item.label);
    return { item, href, label, active: inSection || onChild, parentAllowed, visibleChildren };
  });

  const current = sections.find((s) => s.active);
  const subItems = current
    ? [
        ...(current.parentAllowed ? [{ href: current.item.href, label: t(current.item.label) }] : []),
        ...current.visibleChildren.map((c) => ({ href: c.href, label: t(c.label) })),
      ]
    : [];
  const showSub = subItems.length > 1;

  const displayName = session?.user_name || user?.email || '';

  return (
    <div className="sticky top-0 z-40">
      <header className="flex h-14 items-center gap-5 border-b border-ink-150 bg-card px-6">
        <Link href={current?.href ?? '/'} className="flex shrink-0 items-center gap-2 whitespace-nowrap" aria-label="홈">
          <BrandMark size={22} />
          <span className="font-serif text-[19px] font-semibold tracking-[-0.02em] text-ink-900">
            {appName || 'HRMS'}
          </span>
        </Link>

        <nav className="ml-1 hidden min-w-0 items-center gap-0.5 overflow-x-auto md:flex" aria-label="주 메뉴">
          {sections.map((s) => (
            <Link
              key={s.item.href}
              href={s.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors',
                s.active
                  ? 'bg-ink-100 text-ink-900'
                  : 'text-ink-500 hover:bg-paper hover:text-ink-800',
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="hidden h-8 w-[200px] items-center gap-2 xl:w-[260px] rounded-md border border-ink-150 bg-paper px-2.5 text-[13px] text-ink-500 transition-colors hover:border-ink-300 lg:flex"
          aria-label={t('common.searchPlaceholder')}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate text-left">{t('common.searchPlaceholder')}</span>
          <kbd className="rounded-[3px] border border-b-2 border-ink-150 px-1.5 font-mono text-[10.5px] text-ink-500">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="grid h-8 w-8 place-items-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-900 lg:hidden"
          aria-label={t('common.searchPlaceholder')}
        >
          <Search className="h-4 w-4" />
        </button>

        <LanguageToggle />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('open-help'))}
          className="grid h-8 w-8 place-items-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          aria-label="업무 도움말"
          title="업무 도움말"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        <NotificationBell />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-ink-100"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full font-serif text-[11px] font-semibold text-white"
                  style={{ background: avatarColor(displayName || 'me') }}
                >
                  {initials(displayName || '?')}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-[12.5px] font-semibold text-ink-900">{displayName}</span>
                  <span className="block text-[11px] text-ink-500">{role ? roleLabels[role] : ''}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5 text-[11.5px] text-ink-500">{user.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/my">
                  <User className="mr-2 h-4 w-4" />
                  {t('header.myInfo')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('header.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {showSub && (
        <nav
          className="flex h-10 items-center gap-1 overflow-x-auto border-b border-ink-150 bg-paper px-6"
          aria-label="보조 메뉴"
        >
          {subItems.map((s) => {
            const active =
              s.href === '/' ? pathname === '/' : pathname === s.href || pathname.startsWith(`${s.href}/`);
            // 상위 화면은 하위 경로에서도 켜집니다(/employees 는 /employees/roster 에서도).
            // 그래서 더 긴 하위 항목이 켜져 있으면 상위는 끕니다.
            const longerActive = subItems.some(
              (o) => o.href !== s.href && o.href.startsWith(s.href) && pathname.startsWith(o.href),
            );
            const on = active && !longerActive;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  'whitespace-nowrap rounded-md px-2.5 py-1 text-[12.5px] transition-colors',
                  on ? 'bg-ink-900 font-medium text-paper' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900',
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
