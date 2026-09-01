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

export function Sidebar() {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const menuPermissions = useSettingsStore((s) => s.menuPermissions);

  const { t } = useT();
  const role = session?.role ?? 'employee';
  const allowedHrefs = menuPermissions?.[role] ?? DEFAULT_MENU_HREFS;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r bg-gradient-to-b from-background to-muted/30">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <BrandLockup logoSize={24} />
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="p-3 space-y-4">
          {MENU_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => allowedHrefs.includes(item.href));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {t(group.label)}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 hover:translate-x-0.5',
                          isActive
                            ? 'bg-primary/10 text-primary border-l-2 border-primary font-semibold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <item.icon className="h-4 w-4" />
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
