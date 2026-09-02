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
  /**
   * 인사 담당만 여는 화면.
   *
   * 대장은 전 직원을 한 화면에 놓고 다루는 관리 도구입니다. 일반 직원이 열면
   * 자기 줄만 값이 차 있고 나머지 백여 줄이 비어 있는 표를 보게 됩니다 —
   * 자료가 새는 것은 아니지만 볼 이유가 없는 화면입니다. 본인 근태와 휴가는
   * 마이페이지와 근태관리 첫 화면에서 봅니다.
   */
  hrOnly?: boolean;
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
      { href: '/employees/roster', label: 'menu.roster' , hrOnly: true },
      { href: '/employees/pipeline', label: 'menu.pipeline' , hrOnly: true },
      { href: '/appointments', label: 'menu.appointments' , hrOnly: true },
      { href: '/employees/retirement', label: 'menu.retirement' , hrOnly: true },
    ],
  },
  {
    href: '/organization',
    label: 'menu.organization',
    icon: Network,
    description: 'menuDesc.organization',
    group: 'menuGroup.organization',
    children: [{ href: '/employees/workplace-assignment', label: 'menu.workplaceAssignment' , hrOnly: true }],
  },
  {
    href: '/attendance',
    label: 'menu.timeAndLeave',
    icon: CalendarClock,
    description: 'menuDesc.timeAndLeave',
    group: 'menuGroup.timeAndLeave',
    children: [
      { href: '/attendance/register', label: 'menu.attendanceRegister' , hrOnly: true },
      { href: '/attendance/import', label: 'menu.attendanceImport' , hrOnly: true },
      { href: '/leave/register', label: 'menu.leaveRegister' , hrOnly: true },
      { href: '/leave', label: 'menu.leaveRequests' },
      { href: '/attendance/admin', label: 'menu.attendanceCloseout' , hrOnly: true },
    ],
  },
  {
    href: '/payroll',
    label: 'menu.payroll',
    icon: Banknote,
    description: 'menuDesc.payroll',
    group: 'menuGroup.payroll',
    children: [
      { href: '/payroll/salaries', label: 'menu.salaryBase' , hrOnly: true },
      { href: '/payroll/calculate', label: 'menu.payrollCalculate' , hrOnly: true },
      { href: '/payroll/dashboard', label: 'menu.payrollRegister' , hrOnly: true },
      { href: '/payroll/severance', label: 'menu.severance' , hrOnly: true },
      { href: '/payroll/year-end-tax', label: 'menu.yearEndTax' , hrOnly: true },
    ],
  },
  {
    href: '/settings',
    label: 'menu.settings',
    icon: Settings,
    description: 'menuDesc.settings',
    group: 'menuGroup.system',
    children: [{ href: '/audit-log', label: 'menu.auditLog' , hrOnly: true }],
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

/** 이 경로가 인사 담당 전용인가. 긴 경로가 먼저 걸리도록 정렬해 비교합니다. */
export function isHrOnlyPath(pathname: string): boolean {
  const children = ALL_MENU_ITEMS.flatMap((m) => m.children ?? [])
    .filter((c) => c.hrOnly)
    .sort((a, b) => b.href.length - a.href.length);
  return children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
}

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

/**
 * 권한을 걸 수 있는 화면 전체.
 *
 * 권한은 메뉴가 아니라 **화면 단위**로 겁니다. 메뉴 단위로 걸면 "급여관리는
 * 주되 급여 기준액은 막는다" 같은 흔한 요구를 담지 못합니다.
 *
 * 메뉴에서 뺀 화면(결재함·전자결재)도 여기 있어야 합니다 — 메뉴에 없다고
 * 주소로 못 들어가는 것이 아니기 때문입니다.
 */
export interface PermissionScreen {
  href: string;
  label: TranslationKey | string;
  /** 묶어 보여줄 상위 메뉴 라벨 */
  group: TranslationKey;
  /**
   * 기본값에서 관리자 외 역할에 열어 줄 화면.
   *
   * 마이페이지 하나입니다 — 관리자 이외에는 마이페이지만 보는 것이 기본이고,
   * 그 밖의 화면은 설정 > 메뉴권한에서 역할별로 열어 줍니다.
   */
  defaultForEveryone?: boolean;
}

export const PERMISSION_SCREENS: PermissionScreen[] = [
  { href: '/', label: 'menu.home', group: 'menuGroup.home' },
  { href: '/my', label: 'menu.myPage', group: 'menuGroup.home', defaultForEveryone: true },
  { href: '/approval', label: '결재함', group: 'menuGroup.home' },

  { href: '/employees', label: 'menu.workforce', group: 'menuGroup.workforce' },
  { href: '/employees/roster', label: 'menu.roster', group: 'menuGroup.workforce' },
  { href: '/employees/pipeline', label: 'menu.pipeline', group: 'menuGroup.workforce' },
  { href: '/appointments', label: 'menu.appointments', group: 'menuGroup.workforce' },
  { href: '/employees/retirement', label: 'menu.retirement', group: 'menuGroup.workforce' },

  { href: '/organization', label: 'menu.organization', group: 'menuGroup.organization' },
  { href: '/employees/workplace-assignment', label: 'menu.workplaceAssignment', group: 'menuGroup.organization' },

  { href: '/attendance', label: 'menu.timeAndLeave', group: 'menuGroup.timeAndLeave' },
  { href: '/attendance/register', label: 'menu.attendanceRegister', group: 'menuGroup.timeAndLeave' },
  { href: '/attendance/import', label: 'menu.attendanceImport', group: 'menuGroup.timeAndLeave' },
  { href: '/leave/register', label: 'menu.leaveRegister', group: 'menuGroup.timeAndLeave' },
  { href: '/leave', label: 'menu.leaveRequests', group: 'menuGroup.timeAndLeave' },
  { href: '/attendance/admin', label: 'menu.attendanceCloseout', group: 'menuGroup.timeAndLeave' },

  { href: '/payroll', label: 'menu.payroll', group: 'menuGroup.payroll' },
  { href: '/payroll/salaries', label: 'menu.salaryBase', group: 'menuGroup.payroll' },
  { href: '/payroll/calculate', label: 'menu.payrollCalculate', group: 'menuGroup.payroll' },
  { href: '/payroll/dashboard', label: 'menu.payrollRegister', group: 'menuGroup.payroll' },
  { href: '/payroll/severance', label: 'menu.severance', group: 'menuGroup.payroll' },
  { href: '/payroll/year-end-tax', label: 'menu.yearEndTax', group: 'menuGroup.payroll' },

  { href: '/settings', label: 'menu.settings', group: 'menuGroup.system' },
  { href: '/audit-log', label: 'menu.auditLog', group: 'menuGroup.system' },
  { href: '/workflows', label: '프로세스 현황', group: 'menuGroup.system' },
];

/** 관리자 외 역할의 기본 권한 — 마이페이지 하나. */
export const DEFAULT_NON_ADMIN_SCREENS: string[] = PERMISSION_SCREENS.filter(
  (s) => s.defaultForEveryone,
).map((s) => s.href);

/**
 * 역할별 기본 화면.
 *
 * - 시스템관리자: 전부, 설정에서도 줄일 수 없습니다. 권한을 고칠 사람마저
 *   잠기면 아무도 풀 수 없습니다.
 * - 인사담당자: 기본은 전부지만 설정에서 조정할 수 있습니다.
 * - 부서관리자·일반사원: 마이페이지만. 필요한 화면은 설정 > 메뉴권한에서
 *   역할별로 열어 줍니다.
 */
export function defaultScreensForRole(role: string): string[] {
  if (role === 'admin' || role === 'hr_manager') {
    return PERMISSION_SCREENS.map((s) => s.href);
  }
  return DEFAULT_NON_ADMIN_SCREENS;
}

/**
 * 이 경로가 어느 화면에 속하는가 — 가장 긴 접두사가 이깁니다.
 *
 * \`/payroll/salaries\` 는 급여 기준액 화면이고, \`/payroll/payslip/123\` 처럼
 * 화면 목록에 없는 하위 경로는 가장 가까운 상위 화면(\`/payroll\`)을 따릅니다.
 */
export function screenForPath(pathname: string): PermissionScreen | null {
  let best: PermissionScreen | null = null;
  for (const screen of PERMISSION_SCREENS) {
    const hit =
      pathname === screen.href ||
      (screen.href !== '/' && pathname.startsWith(`${screen.href}/`));
    if (hit && (!best || screen.href.length > best.href.length)) best = screen;
  }
  if (!best && pathname === '/') best = PERMISSION_SCREENS[0];
  return best;
}

/** 이 역할이 이 경로를 열 수 있는가. 시스템관리자는 항상 엽니다. */
export function canOpenPath(
  role: string,
  allowed: string[] | undefined,
  pathname: string,
): boolean {
  if (role === 'admin') return true;
  const screen = screenForPath(pathname);
  if (!screen) return true; // 목록에 없는 경로(로그인 등)는 여기서 막지 않습니다.
  return (allowed ?? defaultScreensForRole(role)).includes(screen.href);
}
