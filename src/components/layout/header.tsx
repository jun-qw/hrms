'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useT } from '@/lib/i18n/use-translation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Search, User } from 'lucide-react';
import { openCommandPalette } from '@/components/layout/command-palette';
import { NotificationBell } from '@/components/layout/notification-bell';
import { LanguageToggle } from '@/components/layout/language-toggle';
import Link from 'next/link';

export function Header() {
  const { user, role, signOut } = useAuth();
  const { t } = useT();

  const roleLabels: Record<string, string> = {
    admin: t('role.admin'),
    hr_manager: t('role.hr_manager'),
    dept_manager: t('role.dept_manager'),
    employee: t('role.employee'),
  };

  return (
    <header className="fixed top-0 left-60 right-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-6">
      <Button
        variant="outline"
        className="hidden sm:flex items-center gap-2 text-muted-foreground text-sm h-9 px-3"
        onClick={() => openCommandPalette()}
      >
        <Search className="h-4 w-4" />
        <span>{t('common.searchPlaceholder')}</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <div className="flex items-center gap-4">
        <LanguageToggle />
        <NotificationBell />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user.email ?? 'user')}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                    alt={user.email ?? ''}
                  />
                  <AvatarFallback className="text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {role ? roleLabels[role] : ''}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      </div>
    </header>
  );
}
