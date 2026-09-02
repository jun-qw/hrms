import {
  Home,
  Users,
  Network,
  CalendarClock,
  Banknote,
  Settings,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n/types';

/**
 * 좌측 메뉴.
 *
 * 5개 업무 메뉴와 설정 하나로 접었습니다. 인사 업무를 모르는 담당자에게 7그룹
 * 15메뉴는 어디서 무엇을 하는지 찾는 일 자체가 일이 됩니다. 대신 각 메뉴 안에서
 * 2뎁스까지만 펼치고, 그보다 아래는 해당 대장의 탭·버튼으로 들어갑니다.
 *
 * 전자결재와 감사로그는 독립 메뉴에서 뺐습니다. 결재는 헤더 알림과 각 업무
 * 화면에서 처리하는 것이 자연스럽고, 감사로그는 매일 보는 화면이 아니라
 * 설정 안에 둡니다.
 */

export interface MenuChild {
  href: string;
  /** translation key — resolve with useT() */
  label: TranslationKey;
}

export interface MenuItem {
  href: string;
  /** translation key — resolve with useT() */
  label: TranslationKey;
  icon: typeof Home;
  /** translation key — resolve with useT() */
  description: TranslationKey;
  /** translation key (menuGroup.*) — 검색·권한 화면에서 묶는 데 씁니다. */
  group: TranslationKey;
  /**
   * 이 메뉴가 열렸을 때 아래에 펼쳐지는 하위 화면.
   *
   * 부모 메뉴 자체도 화면이므로 여기에는 넣지 않습니다 — 같은 곳으로 가는
   * 항목이 둘이면 어느 쪽이 지금 위치인지 흐려집니다.
   */
  children?: MenuChild[];
  /**
   * 화면은 있지만 아직 완성되지 않은 것 — 표본 자료를 보여 주고 버튼이 동작하지
   * 않습니다. 설정 > 메뉴권한에서 관리자가 켜기 전에는 감춥니다. 고객이 기본
   * 상태에서 죽은 메뉴를 만나지 않게 하기 위해서입니다.
   */
  preview?: boolean;
}

export type MenuGroup = {
  /** translation key (menuGroup.*) */
  label: TranslationKey;
  items: MenuItem[];
};

export const ALL_MENU_ITEMS: MenuItem[] = [
  {
    href: '/',
    label: 'menu.home',
    icon: Home,
    description: 'menuDesc.home',
    group: 'menuGroup.home',
    children: [{ href: '/my', label: 'menu.myPage' }],
  },
  {
    href: '/employees',
    label: 'menu.workforce',
    icon: Users,
    description: 'menuDesc.workforce',
    group: 'menuGroup.workforce',
    children: [
      { href: '/employees/roster', label: 'menu.roster' },
      { href: '/employees/pipeline', label: 'menu.pipeline' },
      { href: '/appointments', label: 'menu.appointments' },
      { href: '/employees/retirement', label: 'menu.retirement' },
    ],
  },
  {
    href: '/organization',
    label: 'menu.organization',
    icon: Network,
    description: 'menuDesc.organization',
    group: 'menuGroup.organization',
    children: [{ href: '/employees/workplace-assignment', label: 'menu.workplaceAssignment' }],
  },
  {
    href: '/attendance',
    label: 'menu.timeAndLeave',
    icon: CalendarClock,
    description: 'menuDesc.timeAndLeave',
    group: 'menuGroup.timeAndLeave',
    children: [
      { href: '/attendance/register', label: 'menu.attendanceRegister' },
      { href: '/attendance/import', label: 'menu.attendanceImport' },
      { href: '/leave/register', label: 'menu.leaveRegister' },
      { href: '/leave', label: 'menu.leaveRequests' },
      { href: '/attendance/admin', label: 'menu.attendanceCloseout' },
    ],
  },
  {
    href: '/payroll',
    label: 'menu.payroll',
    icon: Banknote,
    description: 'menuDesc.payroll',
    group: 'menuGroup.payroll',
    children: [
      { href: '/payroll/salaries', label: 'menu.salaryBase' },
      { href: '/payroll/calculate', label: 'menu.payrollCalculate' },
      { href: '/payroll/dashboard', label: 'menu.payrollRegister' },
      { href: '/payroll/severance', label: 'menu.severance' },
      { href: '/payroll/year-end-tax', label: 'menu.yearEndTax' },
    ],
  },
  {
    href: '/settings',
    label: 'menu.settings',
    icon: Settings,
    description: 'menuDesc.settings',
    group: 'menuGroup.system',
    children: [{ href: '/audit-log', label: 'menu.auditLog' }],
  },
];

/** 설치 직후 보이는 메뉴 — 미완성인 것만 뺍니다. */
export const DEFAULT_MENU_HREFS: string[] = ALL_MENU_ITEMS.filter((m) => !m.preview).map(
  (m) => m.href,
);

export const PREVIEW_MENU_HREFS: string[] = ALL_MENU_ITEMS.filter((m) => m.preview).map(
  (m) => m.href,
);

/**
 * 하위 화면까지 펼친 목록.
 *
 * 글로벌 검색은 "급여대장"으로 찾을 수 있어야 합니다. 상위 메뉴만 넣어 두면
 * 담당자가 아는 이름으로는 아무것도 나오지 않습니다.
 */
export const MENU_SEARCH_ENTRIES: { href: string; label: TranslationKey }[] =
  ALL_MENU_ITEMS.flatMap((m) => [
    { href: m.href, label: m.label },
    ...(m.children ?? []),
  ]);

/**
 * 예전 구조에서는 그룹 안에 여러 메뉴가 있었습니다. 지금은 메뉴 하나가 곧
 * 그룹이라 사이드바에서 그룹 라벨을 쓰지 않지만, 메뉴권한 화면이 이 형태를
 * 그대로 읽으므로 남겨 둡니다.
 */
export const MENU_GROUPS: MenuGroup[] = ALL_MENU_ITEMS.map((item) => ({
  label: item.group,
  items: [item],
}));

/** 경로의 첫 조각. 권한은 이 단위로 봅니다. */
const basePath = (href: string) => '/' + (href.split('/')[1] ?? '');

/**
 * 메뉴 하나를 허용하면 같이 열리는 경로들.
 *
 * 하위 화면이 부모와 다른 경로에 있을 수 있습니다 — 연차대장은 `/leave` 인데
 * 메뉴는 근태·휴가(`/attendance`) 아래에 있습니다. 메뉴 목록만 보고 막으면
 * 사이드바에는 보이는데 누르면 홈으로 튕깁니다.
 *
 * 메뉴에 없지만 열려 있어야 하는 화면도 여기에 적습니다. 결재함과 마이페이지는
 * 독립 메뉴에서 뺐지만 홈 카드와 헤더에서 들어갑니다.
 */
const EXTRA_COVERAGE: Record<string, string[]> = {
  '/': ['/my', '/approval', '/issues'],
  '/settings': ['/audit-log', '/workflows'],
};

/** 허용된 메뉴로 실제로 열 수 있는 최상위 경로 전체. */
export function coveredBasePaths(allowedMenuHrefs: string[]): Set<string> {
  const out = new Set<string>(['/']);
  for (const item of ALL_MENU_ITEMS) {
    if (!allowedMenuHrefs.includes(item.href)) continue;
    out.add(basePath(item.href));
    for (const child of item.children ?? []) out.add(basePath(child.href));
    for (const extra of EXTRA_COVERAGE[item.href] ?? []) out.add(extra);
  }
  return out;
}
