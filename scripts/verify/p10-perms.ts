/**
 * 검증 — 화면별 권한 판정.
 *
 * 확인하는 것은 "설정이 저장된다"가 아니라 **"역할이 열 수 있는 화면이
 * 정확히 갈리는가"** 입니다. 특히 두 가지 사고를 막습니다 —
 * 시스템관리자가 잠기는 것, 그리고 일반사원이 기본값으로 급여 화면을 여는 것.
 */
import {
  PERMISSION_SCREENS, DEFAULT_NON_ADMIN_SCREENS,
  defaultScreensForRole, screenForPath, canOpenPath,
} from '../../src/lib/constants/menu-items';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

function main() {
  console.log('\n== 1. 기본값 ==');
  check('관리자 외 기본은 마이페이지 하나',
    DEFAULT_NON_ADMIN_SCREENS.length === 1 && DEFAULT_NON_ADMIN_SCREENS[0] === '/my');
  check('시스템관리자 기본은 전체',
    defaultScreensForRole('admin').length === PERMISSION_SCREENS.length);
  check('인사담당자 기본은 전체',
    defaultScreensForRole('hr_manager').length === PERMISSION_SCREENS.length);
  check('일반사원 기본은 마이페이지',
    JSON.stringify(defaultScreensForRole('employee')) === '["/my"]');

  console.log('\n== 2. 경로 → 화면 매핑 ==');
  const cases: [string, string][] = [
    ['/payroll/salaries', '/payroll/salaries'],   // 자기 자신
    ['/payroll/payslip/abc', '/payroll'],          // 목록에 없는 하위 → 상위
    ['/employees/roster', '/employees/roster'],
    ['/employees/abc-uuid', '/employees'],
    ['/leave/register', '/leave/register'],
    ['/leave', '/leave'],
    ['/my', '/my'],
    ['/', '/'],
  ];
  for (const [path, want] of cases) {
    const got = screenForPath(path)?.href;
    check(`${path} → ${want}`, got === want, got ?? 'null');
  }

  console.log('\n== 3. 역할별 판정 ==');
  check('관리자는 저장값이 비어도 전부 엶',
    canOpenPath('admin', [], '/payroll/salaries'));
  check('일반사원 기본값 — 마이페이지 엶',
    canOpenPath('employee', undefined, '/my'));
  check('일반사원 기본값 — 급여 기준액 막힘',
    !canOpenPath('employee', undefined, '/payroll/salaries'));
  check('일반사원 기본값 — 홈 막힘 (마이페이지로 보내는 근거)',
    !canOpenPath('employee', undefined, '/'));
  check('일반사원 기본값 — 인력대장 막힘',
    !canOpenPath('employee', undefined, '/employees'));
  check('화면을 열어 주면 그 화면만 열림',
    canOpenPath('employee', ['/my', '/attendance/register'], '/attendance/register') &&
    !canOpenPath('employee', ['/my', '/attendance/register'], '/attendance/import'));
  check('상위만 열어 주면 목록에 있는 하위는 별개',
    canOpenPath('employee', ['/my', '/payroll'], '/payroll/payslip/x') &&
    !canOpenPath('employee', ['/my', '/payroll'], '/payroll/salaries'));

  console.log('\n== 4. 화면 목록 자체 ==');
  const hrefs = PERMISSION_SCREENS.map((s) => s.href);
  check('href 중복 없음', new Set(hrefs).size === hrefs.length);
  check('마이페이지가 목록에 있음', hrefs.includes('/my'));
  check('메뉴에서 뺀 결재함도 목록에 있음', hrefs.includes('/approval'),
    '메뉴에 없다고 주소로 못 들어가는 것이 아닙니다');

  console.log(`\n결과: ${pass} 통과 · ${fail} 실패\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main();
