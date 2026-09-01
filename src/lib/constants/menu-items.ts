import {
  LayoutDashboard,
  UserCircle,
  Network,
  Users,
  Clock,
  CalendarDays,
  Banknote,
  ArrowRightLeft,
  FileCheck,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n/types';

export interface MenuItem {
  href: string;
  /** translation key — resolve with useT() */
  label: TranslationKey;
  icon: typeof LayoutDashboard;
  /** translation key — resolve with useT() */
  description: TranslationKey;
  /** translation key (menuGroup.*) */
  group: TranslationKey;
  /**
   * Screens that exist but are not finished — they render sample content and
   * their buttons do nothing yet. Hidden unless an administrator turns them on
   * in 설정 > 메뉴권한, so a customer never meets a dead menu by default.
   */
  preview?: boolean;
}

export type MenuGroup = {
  /** translation key (menuGroup.*) */
  label: TranslationKey;
  items: MenuItem[];
};

export const ALL_MENU_ITEMS: MenuItem[] = [
  // Home
  { href: '/', label: 'menu.dashboard', icon: LayoutDashboard, description: 'menuDesc.dashboard', group: 'menuGroup.home' },
  { href: '/my', label: 'menu.myPage', icon: UserCircle, description: 'menuDesc.myPage', group: 'menuGroup.home' },
  // HR
  { href: '/organization', label: 'menu.organization', icon: Network, description: 'menuDesc.organization', group: 'menuGroup.hr' },
  { href: '/employees', label: 'menu.employees', icon: Users, description: 'menuDesc.employees', group: 'menuGroup.hr' },
  { href: '/appointments', label: 'menu.appointments', icon: ArrowRightLeft, description: 'menuDesc.appointments', group: 'menuGroup.hr' },
  // Work
  { href: '/attendance', label: 'menu.attendance', icon: Clock, description: 'menuDesc.attendance', group: 'menuGroup.work' },
  { href: '/leave', label: 'menu.leave', icon: CalendarDays, description: 'menuDesc.leave', group: 'menuGroup.work' },
  // Payroll
  { href: '/payroll', label: 'menu.payroll', icon: Banknote, description: 'menuDesc.payroll', group: 'menuGroup.payroll' },
  // Support
  { href: '/approval', label: 'menu.approval', icon: FileCheck, description: 'menuDesc.approval', group: 'menuGroup.support' },
  // System
  { href: '/audit-log', label: 'menu.auditLog', icon: ShieldAlert, description: 'menuDesc.auditLog', group: 'menuGroup.system' },
  { href: '/settings', label: 'menu.settings', icon: Settings, description: 'menuDesc.settings', group: 'menuGroup.system' },
];

/** Menus a fresh installation shows: everything except the unfinished ones. */
export const DEFAULT_MENU_HREFS: string[] = ALL_MENU_ITEMS.filter((m) => !m.preview).map(
  (m) => m.href,
);

export const PREVIEW_MENU_HREFS: string[] = ALL_MENU_ITEMS.filter((m) => m.preview).map(
  (m) => m.href,
);

const GROUP_ORDER: TranslationKey[] = [
  'menuGroup.home',
  'menuGroup.hr',
  'menuGroup.work',
  'menuGroup.payroll',
  'menuGroup.support',
  'menuGroup.system',
];

export const MENU_GROUPS: MenuGroup[] = (() => {
  const map = new Map<TranslationKey, MenuItem[]>();
  for (const item of ALL_MENU_ITEMS) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
})();
