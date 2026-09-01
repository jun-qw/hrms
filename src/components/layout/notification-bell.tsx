'use client';

import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, FileCheck, XCircle, CalendarDays, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNotificationStore, type NotificationType } from '@/lib/stores/notification-store';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-translation';

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'approval_request':
      return <FileCheck className="h-4 w-4 text-blue-500" />;
    case 'approval_approved':
    case 'attendance_approved':
    case 'leave_approved':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'approval_rejected':
    case 'attendance_rejected':
    case 'leave_rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { t, locale } = useT();

  const timeAgo = (iso: string): string => {
    const now = new Date();
    const then = new Date(iso);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return t('notification.timeAgo.justNow');
    if (diffMin < 60) return t('notification.timeAgo.minutes', { count: diffMin });
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t('notification.timeAgo.hours', { count: diffHour });
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return t('notification.timeAgo.days', { count: diffDay });
    return then.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
  };
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const userId = session?.employee_id ?? '';

  const myNotifications = notifications
    .filter((n) => n.recipient_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 30);

  const unreadCount = myNotifications.filter((n) => !n.is_read).length;

  const handleClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) router.push(link);
  };

  if (!session) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="font-semibold text-sm">{t('notification.title')}</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t('notification.unreadBadge', { count: unreadCount })}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => markAllAsRead(userId)}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                {t('notification.markAllRead')}
              </Button>
            )}
            {myNotifications.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive"
                onClick={() => {
                  if (window.confirm(t('notification.clearAllConfirm'))) {
                    clearAll(userId);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {myNotifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {t('notification.empty')}
            </div>
          ) : (
            <div className="divide-y">
              {myNotifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors relative group',
                    !n.is_read && 'bg-blue-50/50',
                  )}
                  onClick={() => handleClick(n.id, n.link)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">{notificationIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {!n.is_read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
